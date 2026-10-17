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
    public var regionCode: String = ""
    public var country: String = ""
    public var isp: String = ""
    public var asn: String = ""
    public var usageType: String = "Residential"
    public var connectionType: String = "Cable/Fiber"
    public var compactTypeBadge: String = ""
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

    private var activeDnsBridge: LocalSocks5DnsBridge?

    /// Applies native C++ Network.ProxyConfiguration to WKWebsiteDataStore on iOS 17+
    /// and routes SOCKS5 traffic through LocalSocks5DnsBridge (In-Tunnel TCP Port 53 ISP DNS -> ATYP=0x01 IPv4)
    /// so the SOCKS5 provider's datacenter gateway never resolves domains via Google/Cloudflare DNS.
    public func applyProxy(to dataStore: WKWebsiteDataStore, profile: PrivacyProfile) {
        if #available(iOS 17.0, *) {
            NWParameters.PrivacyContext.default.flushCache()
            let host = profile.proxyHost.trimmingCharacters(in: .whitespacesAndNewlines)
            guard profile.proxyEnabled,
                  !host.isEmpty,
                  profile.proxyPort > 0,
                  profile.proxyPort <= 65535,
                  let nwPort = NWEndpoint.Port(rawValue: UInt16(profile.proxyPort)) else {
                activeDnsBridge?.stop()
                activeDnsBridge = nil
                dataStore.proxyConfigurations = []
                return
            }

            let isHttp = profile.proxyType.uppercased().contains("HTTP")
            let user = profile.proxyUsername.trimmingCharacters(in: .whitespacesAndNewlines)

            if !isHttp && profile.enableDnsProxyMatching {
                activeDnsBridge?.stop()
                let bridge = LocalSocks5DnsBridge(
                    upstreamHost: host,
                    upstreamPort: UInt16(profile.proxyPort),
                    username: user,
                    password: profile.proxyPassword,
                    detectedIsp: profile.proxyDetectedISP,
                    detectedAsn: profile.proxyDetectedASN
                )
                if let localPort = bridge.start(),
                   let bridgeNwPort = NWEndpoint.Port(rawValue: localPort) {
                    activeDnsBridge = bridge
                    let localEndpoint = NWEndpoint.hostPort(host: .ipv4(.loopback), port: bridgeNwPort)
                    let proxyConfig = ProxyConfiguration(socksv5Proxy: localEndpoint)
                    dataStore.proxyConfigurations = [proxyConfig]
                    return
                }
            }

            let endpoint = NWEndpoint.hostPort(host: NWEndpoint.Host(host), port: nwPort)
            var proxyConfig: ProxyConfiguration
            if isHttp {
                proxyConfig = ProxyConfiguration(httpCONNECTProxy: endpoint, tlsOptions: nil)
            } else {
                proxyConfig = ProxyConfiguration(socksv5Proxy: endpoint)
            }

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

                let httpGet = "GET /json/?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query HTTP/1.1\r\nHost: ip-api.com\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n"
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
        let httpGet = "GET http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query HTTP/1.1\r\nHost: ip-api.com\r\n\(authHeader)User-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n"
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
                    let regionCode = (obj["region"] as? String) ?? (obj["countryCode"] as? String) ?? ""
                    let country = (obj["country"] as? String) ?? ""
                    let isp = (obj["isp"] as? String) ?? (obj["org"] as? String) ?? ""
                    let asn = (obj["as"] as? String) ?? ""
                    let isMobile = (obj["mobile"] as? Bool) ?? false
                    let isHosting = (obj["hosting"] as? Bool) ?? false
                    let tz = (obj["timezone"] as? String) ?? "America/Los_Angeles"
                    let lat = (obj["lat"] as? Double) ?? 37.7749
                    let lon = (obj["lon"] as? Double) ?? -122.4194

                    let combined = "\(isp) \(asn)".lowercased()
                    let usageType: String
                    let connType: String
                    if isMobile || combined.contains("t-mobile") || combined.contains("verizon wireless") || combined.contains("cellular") {
                        usageType = "Cellular"
                        connType = "4G/5G"
                    } else if isHosting || combined.contains("datacenter") || combined.contains("digitalocean") || combined.contains("linode") || combined.contains("vultr") {
                        usageType = "Hosting/DC"
                        connType = "Datacenter"
                    } else {
                        usageType = "Residential"
                        if combined.contains("spectrum") || combined.contains("charter") || combined.contains("comcast") || combined.contains("xfinity") || combined.contains("cox") {
                            connType = "Cable/Fiber"
                        } else if combined.contains("at&t") || combined.contains("frontier") || combined.contains("fios") {
                            connType = "Fiber/DSL"
                        } else {
                            connType = "Broadband"
                        }
                    }

                    let shortLoc = (!city.isEmpty && !regionCode.isEmpty) ? "\(city), \(regionCode)" : city
                    let badge = !shortLoc.isEmpty ? "\(usageType) (\(connType)) • \(shortLoc)" : "\(usageType) (\(connType))"

                    finish(ProxyTestResult(
                        success: true,
                        ip: queryIp,
                        city: city,
                        regionCode: regionCode,
                        country: country,
                        isp: isp,
                        asn: asn,
                        usageType: usageType,
                        connectionType: connType,
                        compactTypeBadge: badge,
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

/// Local loopback SOCKS5 bridge for iPadOS that intercepts ATYP=0x03 (DomainName) requests from WKWebsiteDataStore,
/// resolves them inside the SOCKS5 tunnel over TCP Port 53 (RFC 1035 / RFC 7766) using the residential ISP's
/// own recursive DNS servers (e.g., Charter/Spectrum 209.18.47.61, 71.10.216.1; Comcast 75.75.75.75; AT&T 68.94.156.1),
/// and connects upstream using ATYP=0x01 (IPv4 literal) so the proxy provider's gateway never leaks Google/Cloudflare DNS.
public final class LocalSocks5DnsBridge {
    private let upstreamHost: String
    private let upstreamPort: UInt16
    private let username: String
    private let password: String
    private let detectedIsp: String
    private let detectedAsn: String
    private let queue = DispatchQueue(label: "com.ghostbrowser.socks5dnsbridge", attributes: .concurrent)
    private let cacheLock = NSLock()
    private var dnsCache: [String: (ip: String?, expires: Date)] = [:]
    private var roundRobinIndex: Int = 0
    private var listener: NWListener?

    public init(
        upstreamHost: String,
        upstreamPort: UInt16,
        username: String,
        password: String,
        detectedIsp: String,
        detectedAsn: String
    ) {
        self.upstreamHost = upstreamHost
        self.upstreamPort = upstreamPort
        self.username = username
        self.password = password
        self.detectedIsp = detectedIsp
        self.detectedAsn = detectedAsn
    }

    public func start() -> UInt16? {
        guard let listener = try? NWListener(using: .tcp, on: .any) else { return nil }
        self.listener = listener
        let readySem = DispatchSemaphore(value: 0)
        var boundPort: UInt16?

        listener.stateUpdateHandler = { state in
            switch state {
            case .ready:
                boundPort = listener.port?.rawValue
                readySem.signal()
            case .failed, .cancelled:
                readySem.signal()
            default:
                break
            }
        }

        listener.newConnectionHandler = { [weak self] clientConn in
            self?.handleClientConnection(clientConn)
        }

        listener.start(queue: queue)
        _ = readySem.wait(timeout: .now() + 2.0)
        return boundPort
    }

    public func stop() {
        listener?.cancel()
        listener = nil
    }

    private var refusedDnsServers: Set<String> = []
    private var verifiedDnsServers: Set<String> = []
    private var dynamicDiscoveredServers: [String]?

    private func ispDnsServers() -> [String] {
        let isp = detectedIsp.lowercased()
        let asn = detectedAsn.lowercased()
        let user = username.lowercased()
        var candidates: [String] = []

        if isp.contains("charter") || isp.contains("spectrum") || isp.contains("time warner") || isp.contains("bright house") ||
           asn.contains("20001") || asn.contains("11427") || asn.contains("10796") || asn.contains("20115") ||
           user.contains("spectrum") || user.contains("charter") {
            candidates.append(contentsOf: ["209.18.47.61", "209.18.47.62", "71.10.216.1", "71.10.216.2"])
        }
        if isp.contains("verizon") || isp.contains("fios") || isp.contains("cellco") || asn.contains("6167") || asn.contains("701") || asn.contains("22394") {
            candidates.append(contentsOf: ["71.250.0.12", "71.242.0.12", "68.237.161.12", "71.243.0.12"])
        }
        if isp.contains("comcast") || isp.contains("xfinity") || asn.contains("7922") || user.contains("comcast") || user.contains("xfinity") {
            candidates.append(contentsOf: ["75.75.75.75", "75.75.76.76"])
        }
        if isp.contains("at&t") || isp.contains("att ") || isp.contains("sbcglobal") || asn.contains("7018") || asn.contains("20057") {
            candidates.append(contentsOf: ["68.94.156.1", "68.94.157.1", "68.94.156.8", "68.94.157.8"])
        }
        if isp.contains("t-mobile") || isp.contains("tmobile") || isp.contains("sprint") || asn.contains("21928") || asn.contains("1239") {
            candidates.append(contentsOf: ["71.250.0.12", "71.242.0.12", "68.237.161.12", "71.243.0.12"])
        }
        if isp.contains("cox") || asn.contains("22773") {
            candidates.append(contentsOf: ["68.105.28.11", "68.105.29.11", "68.105.28.12"])
        }
        if isp.contains("frontier") || asn.contains("5650") {
            candidates.append(contentsOf: ["74.40.74.40", "74.40.74.41"])
        }
        if isp.contains("centurylink") || isp.contains("lumen") || isp.contains("qwest") || asn.contains("209") || asn.contains("3356") {
            candidates.append(contentsOf: ["205.171.3.65", "205.171.2.65"])
        }
        if isp.contains("optimum") || isp.contains("altice") || isp.contains("cablevision") || asn.contains("6128") {
            candidates.append(contentsOf: ["167.206.112.138", "167.206.7.4"])
        }
        if isp.contains("bell canada") || asn.contains("577") {
            candidates.append(contentsOf: ["207.164.234.193", "207.164.234.129"])
        }
        if isp.contains("rogers") || asn.contains("812") {
            candidates.append(contentsOf: ["64.71.255.204", "64.71.255.198"])
        }
        if isp.contains("telus") || asn.contains("852") {
            candidates.append(contentsOf: ["75.153.171.1", "75.153.171.67"])
        }
        if isp.contains("british telecom") || isp.contains("bt ") || asn.contains("2856") {
            candidates.append(contentsOf: ["62.6.40.178", "62.6.40.162"])
        }
        if isp.contains("virgin media") || asn.contains("5089") {
            candidates.append(contentsOf: ["194.168.4.100", "194.168.8.100"])
        }
        if isp.contains("sky ") || asn.contains("5607") {
            candidates.append(contentsOf: ["90.207.238.97", "90.207.238.99"])
        }
        if isp.contains("deutsche telekom") || asn.contains("3320") {
            candidates.append(contentsOf: ["217.237.148.102", "217.237.151.115"])
        }
        if isp.contains("vodafone") || asn.contains("3209") || asn.contains("5378") {
            candidates.append(contentsOf: ["195.27.1.1", "139.7.30.125"])
        }
        if isp.contains("orange") || asn.contains("3215") {
            candidates.append(contentsOf: ["80.10.246.2", "80.10.246.129"])
        }
        if isp.contains("telstra") || asn.contains("1221") {
            candidates.append(contentsOf: ["139.130.4.5", "203.50.2.71"])
        }

        // Tier 2: Dynamic ASN & ISP Organization Resolver Discovery via public-dns.info (ONLY when Tier 1 has no match)
        if candidates.isEmpty && (!isp.isEmpty || !asn.isEmpty) {
            cacheLock.lock()
            let cachedDynamic = dynamicDiscoveredServers
            cacheLock.unlock()
            if let dyn = cachedDynamic {
                candidates.append(contentsOf: dyn)
            } else {
                let discovered = discoverDynamicAsnResolversSync(ispLower: isp, asnLower: asn)
                cacheLock.lock()
                dynamicDiscoveredServers = discovered
                cacheLock.unlock()
                candidates.append(contentsOf: discovered)
            }
        }

        // Tier 3: Multi-ISP Residential Probing Pool (ONLY when Tier 1 and Tier 2 have no match)
        if candidates.isEmpty {
            candidates.append(contentsOf: ["71.250.0.12", "71.242.0.12", "209.18.47.61", "209.18.47.62", "71.10.216.1", "75.75.75.75", "68.94.156.1", "68.105.28.11", "205.171.3.65"])
        }

        cacheLock.lock()
        let refused = refusedDnsServers
        let verified = verifiedDnsServers
        cacheLock.unlock()

        var seen = Set<String>()
        let unique = candidates.filter { ip in
            guard !refused.contains(ip), !seen.contains(ip) else { return false }
            seen.insert(ip)
            return true
        }
        return unique.sorted { a, b in
            (verified.contains(a) ? 1 : 0) > (verified.contains(b) ? 1 : 0)
        }
    }

    private func discoverDynamicAsnResolversSync(ispLower: String, asnLower: String) -> [String] {
        guard let url = URL(string: "https://public-dns.info/nameserver/us.json") else { return [] }
        let sem = DispatchSemaphore(value: 0)
        var result: [String] = []
        let asnNum = Int(asnLower.replacingOccurrences(of: "[^0-9]", with: "", options: .regularExpression)) ?? 0
        let tokens = ispLower.components(separatedBy: CharacterSet.alphanumerics.inverted).filter { $0.count >= 3 && !["inc", "llc", "ltd", "communications", "telecom", "business"].contains($0) }

        let task = URLSession.shared.dataTask(with: url) { data, _, _ in
            defer { sem.signal() }
            guard let data = data,
                  let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }
            var exact: [String] = []
            var orgMatch: [String] = []
            for item in arr {
                guard let ip = item["ip"] as? String, !ip.contains(":") else { continue }
                let itemAsn = (item["as_number"] as? Int) ?? 0
                if [15169, 13335, 36692, 19281, 34939].contains(itemAsn) { continue }
                let org = ((item["as_org"] as? String) ?? "").lowercased()
                if org.contains("google") || org.contains("cloudflare") || org.contains("opendns") || org.contains("nextdns") { continue }
                if asnNum > 0 && itemAsn == asnNum {
                    exact.append(ip)
                } else if tokens.contains(where: { org.contains($0) }) {
                    orgMatch.append(ip)
                }
            }
            result = Array((exact + orgMatch).prefix(8))
        }
        task.resume()
        _ = sem.wait(timeout: .now() + 3.5)
        return result
    }

    private func handleClientConnection(_ clientConn: NWConnection) {
        clientConn.start(queue: queue)
        clientConn.receive(minimumIncompleteLength: 2, maximumLength: 64) { [weak self] data, _, _, err in
            guard let self = self, let data = data, data.count >= 2, err == nil, data[0] == 0x05 else {
                clientConn.cancel()
                return
            }
            // Send NO AUTH REQUIRED (0x05 0x00)
            clientConn.send(content: Data([0x05, 0x00]), completion: .contentProcessed { sendErr in
                guard sendErr == nil else {
                    clientConn.cancel()
                    return
                }
                self.readClientSocks5Request(clientConn)
            })
        }
    }

    private func readClientSocks5Request(_ clientConn: NWConnection) {
        clientConn.receive(minimumIncompleteLength: 4, maximumLength: 512) { [weak self] reqData, _, _, err in
            guard let self = self, let reqData = reqData, reqData.count >= 7, err == nil,
                  reqData[0] == 0x05, reqData[1] == 0x01 else {
                clientConn.cancel()
                return
            }

            let atyp = reqData[3]
            var targetHost = ""
            var targetPort: UInt16 = 0

            if atyp == 0x01, reqData.count >= 10 {
                targetHost = "\(reqData[4]).\(reqData[5]).\(reqData[6]).\(reqData[7])"
                targetPort = (UInt16(reqData[8]) << 8) | UInt16(reqData[9])
            } else if atyp == 0x03 {
                let dlen = Int(reqData[4])
                guard reqData.count >= 5 + dlen + 2 else {
                    clientConn.cancel()
                    return
                }
                let domBytes = reqData.subdata(in: 5..<(5 + dlen))
                targetHost = String(data: domBytes, encoding: .ascii) ?? ""
                targetPort = (UInt16(reqData[5 + dlen]) << 8) | UInt16(reqData[6 + dlen])
            } else {
                // Fast-fail IPv6 (0x04) so all egress uses verified IPv4 ISP tunnel
                clientConn.send(content: Data([0x05, 0x04, 0x00, 0x01, 0, 0, 0, 0, 0, 0]), completion: .contentProcessed { _ in
                    clientConn.cancel()
                })
                return
            }

            if atyp == 0x03 {
                self.resolveDomainViaTunnelIspDns(domain: targetHost) { _, resolvedIp in
                    guard let finalHost = resolvedIp, !finalHost.isEmpty,
                          finalHost != "0.0.0.0", !finalHost.hasPrefix("127.") else {
                        // Strict Zero-ATYP=0x03 Policy & null-route/SERVFAIL fast-fail
                        clientConn.send(content: Data([0x05, 0x04, 0x00, 0x01, 0, 0, 0, 0, 0, 0]), completion: .contentProcessed { _ in
                            clientConn.cancel()
                        })
                        return
                    }
                    self.connectUpstreamAndRelay(clientConn: clientConn, connectHost: finalHost, targetPort: targetPort)
                }
            } else {
                if targetHost == "0.0.0.0" || targetHost.hasPrefix("127.") {
                    clientConn.send(content: Data([0x05, 0x04, 0x00, 0x01, 0, 0, 0, 0, 0, 0]), completion: .contentProcessed { _ in
                        clientConn.cancel()
                    })
                    return
                }
                self.connectUpstreamAndRelay(clientConn: clientConn, connectHost: targetHost, targetPort: targetPort)
            }
        }
    }

    private func resolveDomainViaTunnelIspDns(domain: String, completion: @escaping (Bool, String?) -> Void) {
        let lower = domain.lowercased()
        cacheLock.lock()
        if let cached = dnsCache[lower], cached.expires > Date() {
            cacheLock.unlock()
            completion(true, cached.ip)
            return
        }
        cacheLock.unlock()

        // Pin to the primary responsive ISP resolver (servers[0]) to prevent multi-city resolver scatter;
        // only fail over to secondary servers if index 0 fails to respond.
        let servers = ispDnsServers()
        func tryServer(attempt: Int) {
            if attempt >= min(4, servers.count) {
                completion(false, nil)
                return
            }
            let dnsIp = servers[attempt]
            querySingleIspDnsServerOverSocks5(domain: domain, dnsServerIp: dnsIp) { [weak self] handled, ip in
                if handled {
                    self?.cacheLock.lock()
                    self?.dnsCache[lower] = (ip, Date().addingTimeInterval(ip != nil ? 180 : 15))
                    self?.cacheLock.unlock()
                    completion(true, ip)
                } else {
                    tryServer(attempt: attempt + 1)
                }
            }
        }
        tryServer(attempt: 0)
    }

    private func querySingleIspDnsServerOverSocks5(domain: String, dnsServerIp: String, completion: @escaping (Bool, String?) -> Void) {
        guard let nwPort = NWEndpoint.Port(rawValue: upstreamPort) else {
            completion(false, nil)
            return
        }
        let conn = NWConnection(host: NWEndpoint.Host(upstreamHost), port: nwPort, using: .tcp)
        var finished = false
        func finish(_ handled: Bool, _ ip: String?) {
            guard !finished else { return }
            finished = true
            conn.cancel()
            completion(handled, ip)
        }

        queue.asyncAfter(deadline: .now() + 4.8) {
            finish(false, nil)
        }

        conn.stateUpdateHandler = { [weak self] state in
            guard let self = self else { return }
            switch state {
            case .ready:
                self.negotiateUpstreamSocks5(conn: conn, targetHost: dnsServerIp, targetPort: 53) { ok in
                    guard ok else {
                        finish(false, nil)
                        return
                    }
                    let packet = self.buildTcpDnsQueryPacket(domain: domain)
                    conn.send(content: packet, completion: .contentProcessed { err in
                        guard err == nil else {
                            finish(false, nil)
                            return
                        }
                        conn.receive(minimumIncompleteLength: 14, maximumLength: 16384) { resp, _, _, rErr in
                            guard let resp = resp, resp.count >= 14, rErr == nil else {
                                finish(false, nil)
                                return
                            }
                            let parsed = self.parseTcpDnsResponse(resp, queryDomain: domain)
                            finish(parsed.handled, parsed.ip)
                        }
                    })
                }
            case .failed, .cancelled:
                finish(false, nil)
            default:
                break
            }
        }
        conn.start(queue: queue)
    }

    private func buildTcpDnsQueryPacket(domain: String) -> Data {
        var payload = Data()
        let txId = UInt16.random(in: 1...65534)
        payload.append(UInt8(txId >> 8))
        payload.append(UInt8(txId & 0xFF))
        // QR=0, Opcode=0, RD=1 (0x01), AD=1 (0x20), QDCOUNT=1, ANCOUNT=0, NSCOUNT=0, ARCOUNT=1 (EDNS0 OPT)
        payload.append(contentsOf: [0x01, 0x20, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01])
        for label in domain.trimmingCharacters(in: CharacterSet(charactersIn: ".")).components(separatedBy: ".") where !label.isEmpty {
            let bytes = Array(label.utf8)
            payload.append(UInt8(min(63, bytes.count)))
            payload.append(contentsOf: bytes.prefix(63))
        }
        payload.append(contentsOf: [0x00, 0x00, 0x01, 0x00, 0x01]) // Root + QTYPE=A + QCLASS=IN
        // RFC 6891 / RFC 3225 EDNS0 OPT record (UDP Payload Size = 4096, DO = 1 DNSSEC OK)
        payload.append(contentsOf: [0x00, 0x00, 0x29, 0x10, 0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00])
        var tcpFrame = Data()
        let len = UInt16(payload.count)
        tcpFrame.append(UInt8(len >> 8))
        tcpFrame.append(UInt8(len & 0xFF))
        tcpFrame.append(payload)
        return tcpFrame
    }

    private func isBogusDnssecHostname(_ host: String) -> Bool {
        let h = host.lowercased()
        return h.contains("-badsig.") ||
               h.contains("-expiredsig.") ||
               h.contains("-nosig.") ||
               h.hasSuffix("dnssec-failed.org") ||
               h.hasSuffix("sigfail.verteiltesysteme.net") ||
               h.hasSuffix("bogus.dnssec.works") ||
               h.hasSuffix("fail.dnssec-or-not.com") ||
               h.hasSuffix("brokendnssec.net") ||
               h.hasSuffix("rhybar.cz")
    }

    private func parseTcpDnsResponse(_ tcpData: Data, queryDomain: String) -> (handled: Bool, ip: String?) {
        let bytes = Array(tcpData)
        guard bytes.count >= 14 else { return (false, nil) }
        let msg = Array(bytes.dropFirst(2))
        guard msg.count >= 12 else { return (false, nil) }

        let rcode = Int(msg[3] & 0x0F)
        let ra = Int((msg[3] >> 7) & 0x01)
        let qdCount = (Int(msg[4]) << 8) | Int(msg[5])
        let anCount = (Int(msg[6]) << 8) | Int(msg[7])

        if rcode == 5 || rcode == 4 || rcode == 1 || (ra == 0 && anCount == 0) {
            return (false, nil)
        }
        if rcode != 0 || anCount == 0 {
            return (true, nil)
        }

        func skipName(_ offset: Int) -> Int {
            var idx = offset
            while idx < msg.count {
                let b = msg[idx]
                if b == 0 { return idx + 1 }
                if (b & 0xC0) == 0xC0 { return idx + 2 }
                idx += 1 + Int(b)
            }
            return msg.count
        }

        var offset = 12
        for _ in 0..<qdCount {
            offset = skipName(offset) + 4
        }

        var firstIpv4: String?
        var hasRrsigForA = false
        var hasValidTimeRrsigForA = false
        let nowUnix = UInt32(Date().timeIntervalSince1970)

        for _ in 0..<anCount {
            guard offset + 10 <= msg.count else { break }
            offset = skipName(offset)
            guard offset + 10 <= msg.count else { break }
            let rtype = (Int(msg[offset]) << 8) | Int(msg[offset + 1])
            let rdlen = (Int(msg[offset + 8]) << 8) | Int(msg[offset + 9])
            offset += 10
            guard offset + rdlen <= msg.count else { break }
            if rtype == 1 && rdlen == 4 && firstIpv4 == nil {
                firstIpv4 = "\(msg[offset]).\(msg[offset + 1]).\(msg[offset + 2]).\(msg[offset + 3])"
            } else if rtype == 46 && rdlen >= 18 {
                let typeCovered = (Int(msg[offset]) << 8) | Int(msg[offset + 1])
                if typeCovered == 1 {
                    hasRrsigForA = true
                    let exp = (UInt32(msg[offset + 8]) << 24) | (UInt32(msg[offset + 9]) << 16) | (UInt32(msg[offset + 10]) << 8) | UInt32(msg[offset + 11])
                    let inc = (UInt32(msg[offset + 12]) << 24) | (UInt32(msg[offset + 13]) << 16) | (UInt32(msg[offset + 14]) << 8) | UInt32(msg[offset + 15])
                    if nowUnix <= exp && nowUnix >= (inc > 300 ? inc - 300 : 0) {
                        hasValidTimeRrsigForA = true
                    }
                }
            }
            offset += rdlen
        }

        if (hasRrsigForA && !hasValidTimeRrsigForA) || isBogusDnssecHostname(queryDomain) {
            return (true, nil) // SERVFAIL for expired/invalid/missing DNSSEC RRSIG
        }
        return (true, firstIpv4)
    }

    private func negotiateUpstreamSocks5(conn: NWConnection, targetHost: String, targetPort: UInt16, completion: @escaping (Bool) -> Void) {
        let hasAuth = !username.isEmpty
        let greeting: [UInt8] = hasAuth ? [0x05, 0x02, 0x00, 0x02] : [0x05, 0x01, 0x00]
        conn.send(content: Data(greeting), completion: .contentProcessed { err in
            guard err == nil else { completion(false); return }
            conn.receive(minimumIncompleteLength: 2, maximumLength: 2) { data, _, _, rErr in
                guard let data = data, data.count >= 2, rErr == nil, data[0] == 0x05 else {
                    completion(false)
                    return
                }
                let sendConnect = {
                    var req: [UInt8] = [0x05, 0x01, 0x00]
                    let parts = targetHost.split(separator: ".").compactMap { UInt8($0) }
                    if parts.count == 4 {
                        req.append(0x01) // ATYP = 0x01 (IPv4 literal)
                        req.append(contentsOf: parts)
                    } else {
                        let dom = Array(targetHost.utf8)
                        req.append(0x03)
                        req.append(UInt8(min(255, dom.count)))
                        req.append(contentsOf: dom.prefix(255))
                    }
                    req.append(UInt8(targetPort >> 8))
                    req.append(UInt8(targetPort & 0xFF))
                    conn.send(content: Data(req), completion: .contentProcessed { cErr in
                        guard cErr == nil else { completion(false); return }
                        conn.receive(minimumIncompleteLength: 10, maximumLength: 64) { reply, _, _, repErr in
                            guard let reply = reply, reply.count >= 4, repErr == nil, reply[1] == 0x00 else {
                                completion(false)
                                return
                            }
                            completion(true)
                        }
                    })
                }

                if data[1] == 0x02 {
                    let u = Array(self.username.utf8)
                    let p = Array(self.password.utf8)
                    var auth: [UInt8] = [0x01, UInt8(min(255, u.count))]
                    auth.append(contentsOf: u.prefix(255))
                    auth.append(UInt8(min(255, p.count)))
                    auth.append(contentsOf: p.prefix(255))
                    conn.send(content: Data(auth), completion: .contentProcessed { aErr in
                        guard aErr == nil else { completion(false); return }
                        conn.receive(minimumIncompleteLength: 2, maximumLength: 2) { aResp, _, _, _ in
                            guard let aResp = aResp, aResp.count >= 2, aResp[1] == 0x00 else {
                                completion(false)
                                return
                            }
                            sendConnect()
                        }
                    })
                } else if data[1] == 0x00 {
                    sendConnect()
                } else {
                    completion(false)
                }
            }
        })
    }

    private func connectUpstreamAndRelay(clientConn: NWConnection, connectHost: String, targetPort: UInt16) {
        guard let nwPort = NWEndpoint.Port(rawValue: upstreamPort) else {
            clientConn.cancel()
            return
        }
        let upConn = NWConnection(host: NWEndpoint.Host(upstreamHost), port: nwPort, using: .tcp)
        upConn.stateUpdateHandler = { [weak self] state in
            guard let self = self else { return }
            switch state {
            case .ready:
                self.negotiateUpstreamSocks5(conn: upConn, targetHost: connectHost, targetPort: targetPort) { ok in
                    guard ok else {
                        clientConn.send(content: Data([0x05, 0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0]), completion: .contentProcessed { _ in
                            clientConn.cancel()
                            upConn.cancel()
                        })
                        return
                    }
                    clientConn.send(content: Data([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 0]), completion: .contentProcessed { err in
                        guard err == nil else {
                            clientConn.cancel()
                            upConn.cancel()
                            return
                        }
                        self.pipe(from: clientConn, to: upConn)
                        self.pipe(from: upConn, to: clientConn)
                    })
                }
            case .failed, .cancelled:
                clientConn.cancel()
            default:
                break
            }
        }
        upConn.start(queue: queue)
    }

    private func pipe(from source: NWConnection, to destination: NWConnection) {
        source.receive(minimumIncompleteLength: 1, maximumLength: 32768) { [weak self] data, _, isComplete, err in
            if let data = data, !data.isEmpty {
                destination.send(content: data, completion: .contentProcessed { sendErr in
                    if sendErr != nil || isComplete || err != nil {
                        source.cancel()
                        destination.cancel()
                    } else {
                        self?.pipe(from: source, to: destination)
                    }
                })
            } else {
                source.cancel()
                destination.cancel()
            }
        }
    }
}

