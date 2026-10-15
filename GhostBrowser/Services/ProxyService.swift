import Foundation
import Network
import WebKit

public struct ParsedProxyString {
    public var proxyType: String
    public var host: String
    public var port: Int
    public var username: String
    public var password: String
}

public struct ProxyTestResult {
    public var success: Bool
    public var ip: String = ""
    public var city: String = ""
    public var country: String = ""
    public var isp: String = ""
    public var timezoneId: String = ""
    public var latitude: Double = 0.0
    public var longitude: Double = 0.0
    public var errorMessage: String = ""
}

public final class ProxyService {
    public static let shared = ProxyService()
    private init() {}

    /// Smart parser for proxy strings:
    /// - socks5://user:pass@host:port
    /// - http://user:pass@host:port
    /// - user:pass@host:port
    /// - host:port:user:pass
    /// - host:port
    public func parseSmartProxy(_ rawInput: String) -> ParsedProxyString? {
        var s = rawInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !s.isEmpty else { return nil }

        var detectedType = "SOCKS5"
        let lower = s.lowercased()
        if lower.hasPrefix("socks5://") || lower.hasPrefix("socks5h://") || lower.hasPrefix("socks://") {
            detectedType = "SOCKS5"
            if let range = s.range(of: "://") {
                s = String(s[range.upperBound...])
            }
        } else if lower.hasPrefix("http://") || lower.hasPrefix("https://") {
            detectedType = "HTTP"
            if let range = s.range(of: "://") {
                s = String(s[range.upperBound...])
            }
        }

        // Format 1: user:pass@host:port
        if s.contains("@") {
            let parts = s.components(separatedBy: "@")
            if parts.count == 2 {
                let authParts = parts[0].components(separatedBy: ":")
                let hostParts = parts[1].components(separatedBy: ":")
                if hostParts.count >= 2, let p = Int(hostParts.last ?? ""), p > 0 && p <= 65535 {
                    let h = hostParts.dropLast().joined(separator: ":")
                    let u = authParts.first ?? ""
                    let pw = authParts.count > 1 ? authParts.dropFirst().joined(separator: ":") : ""
                    return ParsedProxyString(proxyType: detectedType, host: h, port: p, username: u, password: pw)
                }
            }
        }

        // Format 2: host:port:user:pass or host:port
        let colonParts = s.components(separatedBy: ":")
        if colonParts.count >= 4, let p = Int(colonParts[1]), p > 0 && p <= 65535 {
            let h = colonParts[0]
            let u = colonParts[2]
            let pw = colonParts.dropFirst(3).joined(separator: ":")
            return ParsedProxyString(proxyType: detectedType, host: h, port: p, username: u, password: pw)
        } else if colonParts.count == 2, let p = Int(colonParts[1]), p > 0 && p <= 65535 {
            return ParsedProxyString(proxyType: detectedType, host: colonParts[0], port: p, username: "", password: "")
        }

        return nil
    }

    /// Applies native C++ Network.ProxyConfiguration to WKWebsiteDataStore on iOS 17+
    public func applyProxy(to dataStore: WKWebsiteDataStore, profile: PrivacyProfile) {
        if #available(iOS 17.0, *) {
            let host = profile.proxyHost.trimmingCharacters(in: .whitespacesAndNewlines)
            guard profile.proxyEnabled,
                  !host.isEmpty,
                  profile.proxyPort > 0,
                  profile.proxyPort <= 65535,
                  let nwPort = NWEndpoint.Port(rawValue: UInt16(profile.proxyPort)) else {
                dataStore.proxyConfigurations = []
                return
            }

            let endpoint = NWEndpoint.hostPort(host: NWEndpoint.Host(host), port: nwPort)
            var proxyConfig: ProxyConfiguration
            if profile.proxyType.uppercased().contains("HTTP") {
                proxyConfig = ProxyConfiguration(httpCONNECTProxy: endpoint, tlsOptions: nil)
            } else {
                proxyConfig = ProxyConfiguration(socksv5Proxy: endpoint)
            }

            let user = profile.proxyUsername.trimmingCharacters(in: .whitespacesAndNewlines)
            if !user.isEmpty {
                proxyConfig.applyCredential(username: user, password: profile.proxyPassword)
            }

            dataStore.proxyConfigurations = [proxyConfig]
        }
    }

    /// Tests a SOCKS5 or HTTP proxy via raw NWConnection RFC-1928/1929 handshake and resolves Exit IP, Geo, ISP & Timezone
    public func testProxyAsync(
        type: String,
        host: String,
        port: Int,
        username: String,
        password: String
    ) async -> ProxyTestResult {
        let cleanHost = host.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanHost.isEmpty, port > 0 && port <= 65535, let nwPort = NWEndpoint.Port(rawValue: UInt16(port)) else {
            return ProxyTestResult(success: false, errorMessage: "Invalid proxy host or port.")
        }

        return await withCheckedContinuation { continuation in
            let queue = DispatchQueue(label: "com.ghostbrowser.proxytest.\(UUID().uuidString)")
            let conn = NWConnection(host: NWEndpoint.Host(cleanHost), port: nwPort, using: .tcp)
            var completed = false

            func finish(_ res: ProxyTestResult) {
                guard !completed else { return }
                completed = true
                conn.cancel()
                continuation.resume(returning: res)
            }

            queue.asyncAfter(deadline: .now() + 12.0) {
                finish(ProxyTestResult(success: false, errorMessage: "Proxy connection timed out (12s)."))
            }

            conn.stateUpdateHandler = { state in
                switch state {
                case .ready:
                    if type.uppercased().contains("HTTP") {
                        self.performHttpProxyLookup(conn: conn, username: username, password: password, finish: finish)
                    } else {
                        self.performSocks5Lookup(conn: conn, username: username, password: password, finish: finish)
                    }
                case .failed(let err):
                    finish(ProxyTestResult(success: false, errorMessage: "Connection failed: \(err.localizedDescription)"))
                default:
                    break
                }
            }

            conn.start(queue: queue)
        }
    }

    private func performSocks5Lookup(
        conn: NWConnection,
        username: String,
        password: String,
        finish: @escaping (ProxyTestResult) -> Void
    ) {
        let hasAuth = !username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let greeting: [UInt8] = hasAuth ? [0x05, 0x02, 0x00, 0x02] : [0x05, 0x01, 0x00]

        conn.send(content: Data(greeting), completion: .contentProcessed { err in
            if let err = err {
                finish(ProxyTestResult(success: false, errorMessage: "SOCKS5 greeting error: \(err.localizedDescription)"))
                return
            }

            conn.receive(minimumIncompleteLength: 2, maximumLength: 2) { data, _, _, err in
                guard let data = data, data.count >= 2, data[0] == 0x05 else {
                    finish(ProxyTestResult(success: false, errorMessage: "Invalid SOCKS5 server response."))
                    return
                }

                let method = data[1]
                if method == 0x02 {
                    let uBytes = Array(username.utf8)
                    let pBytes = Array(password.utf8)
                    var authReq: [UInt8] = [0x01, UInt8(min(255, uBytes.count))]
                    authReq.append(contentsOf: uBytes.prefix(255))
                    authReq.append(UInt8(min(255, pBytes.count)))
                    authReq.append(contentsOf: pBytes.prefix(255))

                    conn.send(content: Data(authReq), completion: .contentProcessed { err in
                        if let err = err {
                            finish(ProxyTestResult(success: false, errorMessage: "SOCKS5 auth send failed: \(err.localizedDescription)"))
                            return
                        }
                        conn.receive(minimumIncompleteLength: 2, maximumLength: 2) { authData, _, _, _ in
                            guard let authData = authData, authData.count >= 2, authData[1] == 0x00 else {
                                finish(ProxyTestResult(success: false, errorMessage: "SOCKS5 username/password authentication rejected."))
                                return
                            }
                            self.sendSocks5ConnectAndHttpGet(conn: conn, finish: finish)
                        }
                    })
                } else if method == 0x00 {
                    self.sendSocks5ConnectAndHttpGet(conn: conn, finish: finish)
                } else {
                    finish(ProxyTestResult(success: false, errorMessage: "Unsupported SOCKS5 auth method (\(method))."))
                }
            }
        })
    }

    private func sendSocks5ConnectAndHttpGet(
        conn: NWConnection,
        finish: @escaping (ProxyTestResult) -> Void
    ) {
        let targetDomain = Array("ip-api.com".utf8)
        var connectReq: [UInt8] = [0x05, 0x01, 0x00, 0x03, UInt8(targetDomain.count)]
        connectReq.append(contentsOf: targetDomain)
        connectReq.append(contentsOf: [0x00, 0x50]) // port 80

        conn.send(content: Data(connectReq), completion: .contentProcessed { err in
            if let err = err {
                finish(ProxyTestResult(success: false, errorMessage: "SOCKS5 CONNECT failed: \(err.localizedDescription)"))
                return
            }

            conn.receive(minimumIncompleteLength: 4, maximumLength: 64) { reply, _, _, _ in
                guard let reply = reply, reply.count >= 4, reply[1] == 0x00 else {
                    finish(ProxyTestResult(success: false, errorMessage: "SOCKS5 remote tunnel connect failed."))
                    return
                }

                let httpGet = "GET /json/?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone,isp,org,as,query HTTP/1.1\r\nHost: ip-api.com\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n"
                conn.send(content: Data(httpGet.utf8), completion: .contentProcessed { _ in
                    self.readAllHttpResponse(conn: conn, accumulated: Data(), finish: finish)
                })
            }
        })
    }

    private func performHttpProxyLookup(
        conn: NWConnection,
        username: String,
        password: String,
        finish: @escaping (ProxyTestResult) -> Void
    ) {
        var authHeader = ""
        if !username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let cred = "\(username):\(password)"
            if let b64 = cred.data(using: .utf8)?.base64EncodedString() {
                authHeader = "Proxy-Authorization: Basic \(b64)\r\n"
            }
        }
        let httpGet = "GET http://ip-api.com/json/?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone,isp,org,as,query HTTP/1.1\r\nHost: ip-api.com\r\n\(authHeader)User-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n"
        conn.send(content: Data(httpGet.utf8), completion: .contentProcessed { err in
            if let err = err {
                finish(ProxyTestResult(success: false, errorMessage: "HTTP Proxy send failed: \(err.localizedDescription)"))
                return
            }
            self.readAllHttpResponse(conn: conn, accumulated: Data(), finish: finish)
        })
    }

    private func readAllHttpResponse(
        conn: NWConnection,
        accumulated: Data,
        finish: @escaping (ProxyTestResult) -> Void
    ) {
        conn.receive(minimumIncompleteLength: 1, maximumLength: 4096) { chunk, _, isComplete, _ in
            var buffer = accumulated
            if let chunk = chunk, !chunk.isEmpty {
                buffer.append(chunk)
            }
            if let text = String(data: buffer, encoding: .utf8),
               let braceStart = text.firstIndex(of: "{"),
               let braceEnd = text.lastIndex(of: "}") {
                let jsonStr = String(text[braceStart...braceEnd])
                if let jsonData = jsonStr.data(using: .utf8),
                   let obj = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                   let queryIp = obj["query"] as? String, !queryIp.isEmpty {
                    let city = (obj["city"] as? String) ?? ""
                    let country = (obj["country"] as? String) ?? ""
                    let isp = (obj["isp"] as? String) ?? (obj["org"] as? String) ?? ""
                    let tz = (obj["timezone"] as? String) ?? "America/Los_Angeles"
                    let lat = (obj["lat"] as? Double) ?? 37.7749
                    let lon = (obj["lon"] as? Double) ?? -122.4194

                    finish(ProxyTestResult(
                        success: true,
                        ip: queryIp,
                        city: city,
                        country: country,
                        isp: isp,
                        timezoneId: tz,
                        latitude: lat,
                        longitude: lon
                    ))
                    return
                }
            }

            if isComplete || (chunk == nil || chunk!.isEmpty) {
                finish(ProxyTestResult(success: false, errorMessage: "Could not parse geo response from proxy tunnel."))
            } else {
                self.readAllHttpResponse(conn: conn, accumulated: buffer, finish: finish)
            }
        }
    }
}
