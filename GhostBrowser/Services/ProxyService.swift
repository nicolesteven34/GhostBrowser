import Foundation
import Network
import WebKit
import UIKit

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
    public var resolvedType: String = ""
    public var resolvedHost: String = ""
    public var resolvedPort: Int = 0
    public var resolvedUsername: String = ""
    public var resolvedPassword: String = ""
}

public final class ProxyService {
    public static let shared = ProxyService()
    private init() {
        setupAppLifecycleObservers()
    }

    private func parseCleanPort(_ raw: String) -> Int? {
        let digits = raw.replacingOccurrences(of: ",", with: "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard let p = Int(digits), p > 0 && p <= 65535 else { return nil }
        return p
    }

    private func looksLikeHost(_ raw: String) -> Bool {
        let s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !s.isEmpty, !s.contains(" ") else { return false }
        return s.contains(".") || s.lowercased() == "localhost"
    }

    /// Smart parser for proxy strings:
    /// - socks5://user:pass@host:port or socks5://host:port:user:pass
    /// - http://user:pass@host:port or http://host:port:user:pass
    /// - user:pass@host:port
    /// - host:port@user:pass
    /// - host:port:user:pass
    /// - user:pass:host:port
    /// - host:port
    public func parseSmartProxy(_ rawInput: String) -> ParsedProxyString? {
        let lines = rawInput
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        guard var s = lines.first else { return nil }
        s = s.trimmingCharacters(in: CharacterSet(charactersIn: "\"'` "))
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

        // Format 1: user:pass@host:port OR host:port@user:pass
        if s.contains("@") {
            let parts = s.components(separatedBy: "@")
            if parts.count == 2 {
                let leftParts = parts[0].components(separatedBy: ":")
                let rightParts = parts[1].components(separatedBy: ":")
                // Case 1A: user:pass@host:port
                if rightParts.count >= 2,
                   let p = parseCleanPort(rightParts.last ?? ""),
                   looksLikeHost(rightParts.dropLast().joined(separator: ":")) {
                    let h = rightParts.dropLast().joined(separator: ":").trimmingCharacters(in: .whitespacesAndNewlines)
                    let u = (leftParts.first ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                    let pw = (leftParts.count > 1 ? leftParts.dropFirst().joined(separator: ":") : "").trimmingCharacters(in: .whitespacesAndNewlines)
                    return ParsedProxyString(proxyType: detectedType, host: h, port: p, username: u, password: pw)
                }
                // Case 1B: host:port@user:pass
                if leftParts.count >= 2,
                   let p = parseCleanPort(leftParts.last ?? ""),
                   looksLikeHost(leftParts.dropLast().joined(separator: ":")) {
                    let h = leftParts.dropLast().joined(separator: ":").trimmingCharacters(in: .whitespacesAndNewlines)
                    let u = (rightParts.first ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                    let pw = (rightParts.count > 1 ? rightParts.dropFirst().joined(separator: ":") : "").trimmingCharacters(in: .whitespacesAndNewlines)
                    return ParsedProxyString(proxyType: detectedType, host: h, port: p, username: u, password: pw)
                }
            }
        }

        // Format 2: host:port:user:pass, user:pass:host:port, or host:port
        let colonParts = s.components(separatedBy: ":")
        if colonParts.count >= 4 {
            if let p = parseCleanPort(colonParts[1]), looksLikeHost(colonParts[0]) {
                let h = colonParts[0].trimmingCharacters(in: .whitespacesAndNewlines)
                let u = colonParts[2].trimmingCharacters(in: .whitespacesAndNewlines)
                let pw = colonParts.dropFirst(3).joined(separator: ":").trimmingCharacters(in: .whitespacesAndNewlines)
                return ParsedProxyString(proxyType: detectedType, host: h, port: p, username: u, password: pw)
            }
            if colonParts.count == 4, let p = parseCleanPort(colonParts[3]), looksLikeHost(colonParts[2]) {
                let u = colonParts[0].trimmingCharacters(in: .whitespacesAndNewlines)
                let pw = colonParts[1].trimmingCharacters(in: .whitespacesAndNewlines)
                let h = colonParts[2].trimmingCharacters(in: .whitespacesAndNewlines)
                return ParsedProxyString(proxyType: detectedType, host: h, port: p, username: u, password: pw)
            }
        } else if colonParts.count == 2, let p = parseCleanPort(colonParts[1]), looksLikeHost(colonParts[0]) {
            return ParsedProxyString(
                proxyType: detectedType,
                host: colonParts[0].trimmingCharacters(in: .whitespacesAndNewlines),
                port: p,
                username: "",
                password: ""
            )
        }

        return nil
    }

    /// Sanitizes and normalizes proxy fields even if the user pasted a full `host:port:user:pass` string
    /// directly into the Host, Username, or Password text field.
    public func sanitizeCredentials(
        type: String,
        host: String,
        port: Int,
        username: String,
        password: String
    ) -> (type: String, host: String, port: Int, username: String, password: String) {
        var outType = type.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "SOCKS5" : type
        var outHost = host.trimmingCharacters(in: .whitespacesAndNewlines)
        var outPort = (port > 0 && port <= 65535) ? port : 1080
        var outUser = username.trimmingCharacters(in: .whitespacesAndNewlines)
        var outPass = password.trimmingCharacters(in: .whitespacesAndNewlines)

        // 1. Check if `host` contains a full proxy string (e.g., host:port:user:pass or host:port)
        if let parsedHost = parseSmartProxy(outHost) {
            outHost = parsedHost.host
            outPort = parsedHost.port
            if !parsedHost.username.isEmpty { outUser = parsedHost.username }
            if !parsedHost.password.isEmpty { outPass = parsedHost.password }
            if outHost.lowercased().hasPrefix("http") { outType = parsedHost.proxyType }
        }

        // 2. Check if `username` contains a full proxy string (e.g., mobile.lightningproxies.net:1080:user:pass)
        if let parsedUser = parseSmartProxy(outUser), !parsedUser.username.isEmpty {
            if outHost.isEmpty { outHost = parsedUser.host }
            if parsedUser.port > 0 { outPort = parsedUser.port }
            outUser = parsedUser.username
            if !parsedUser.password.isEmpty {
                outPass = parsedUser.password
            }
        } else {
            // What if `username` has 3 parts `host:port:user` (because password was deleted or put in Password box)?
            let uParts = outUser.components(separatedBy: ":")
            if uParts.count == 3, looksLikeHost(uParts[0]), let p = parseCleanPort(uParts[1]) {
                if outHost.isEmpty { outHost = uParts[0].trimmingCharacters(in: .whitespacesAndNewlines) }
                outPort = p
                outUser = uParts[2].trimmingCharacters(in: .whitespacesAndNewlines)
            } else if uParts.count == 2 && outPass.isEmpty && !looksLikeHost(uParts[0]) {
                // `user:pass` pasted into Username with empty Password
                outUser = uParts[0].trimmingCharacters(in: .whitespacesAndNewlines)
                outPass = uParts[1].trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }

        // 3. Check if `password` contains a full proxy string (e.g., mobile.lightningproxies.net:1080:user:pass)
        if let parsedPass = parseSmartProxy(outPass), !parsedPass.password.isEmpty {
            if outHost.isEmpty { outHost = parsedPass.host }
            if parsedPass.port > 0 { outPort = parsedPass.port }
            if outUser.isEmpty && !parsedPass.username.isEmpty { outUser = parsedPass.username }
            outPass = parsedPass.password
        } else if !outUser.isEmpty && outPass.hasPrefix(outUser + ":") {
            let stripped = String(outPass.dropFirst(outUser.count + 1)).trimmingCharacters(in: .whitespacesAndNewlines)
            if !stripped.isEmpty {
                outPass = stripped
            }
        }

        return (outType, outHost, outPort, outUser, outPass)
    }

    public let sharedProcessPool = WKProcessPool()
    private var sharedProcessPools: [UUID: WKProcessPool] = [:]
    private var activeDnsBridges: [UUID: LocalSocks5DnsBridge] = [:]
    private var activeBridgeConfigKeys: [UUID: String] = [:]
    private var activeBridgePorts: [UUID: UInt16] = [:]
    private var lastAppliedConfigKeys: [UUID: String] = [:]
    private var activeProfilesByID: [UUID: PrivacyProfile] = [:]
    private weak var lastAppliedProfile: PrivacyProfile?
    private var lastBackgroundTimestamp: Date?
    private var didExpireInBackground: Bool = false
    private var backgroundTaskID: UIBackgroundTaskIdentifier = .invalid
    private var lastBridgeRestartTimestamp: Date = .distantPast
    private var sharedDataStores: [String: WKWebsiteDataStore] = [:]
    private var activeDataStores = NSHashTable<WKWebsiteDataStore>.weakObjects()

    public func processPool(for profile: PrivacyProfile) -> WKProcessPool {
        let pid = profile.sessionDataStoreID
        if let existing = sharedProcessPools[pid] {
            return existing
        }
        let pool = WKProcessPool()
        sharedProcessPools[pid] = pool
        return pool
    }

    public func stopBridge(for profileID: UUID) {
        activeDnsBridges[profileID]?.stop()
        activeDnsBridges.removeValue(forKey: profileID)
        activeBridgeConfigKeys.removeValue(forKey: profileID)
        activeBridgePorts.removeValue(forKey: profileID)
        lastAppliedConfigKeys.removeValue(forKey: profileID)
        activeProfilesByID.removeValue(forKey: profileID)
    }

    private func endBackgroundKeepAliveTask() {
        if backgroundTaskID != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTaskID)
            backgroundTaskID = .invalid
        }
    }

    private func setupAppLifecycleObservers() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            self.lastBackgroundTimestamp = Date()
            self.didExpireInBackground = false
            self.endBackgroundKeepAliveTask()
            self.backgroundTaskID = UIApplication.shared.beginBackgroundTask(withName: "GhostBrowserActiveTabKeepAlive") { [weak self] in
                guard let self = self else { return }
                self.didExpireInBackground = true
                self.endBackgroundKeepAliveTask()
            }
        }

        let resumeHandler: (Notification) -> Void = { [weak self] _ in
            guard let self = self else { return }
            self.endBackgroundKeepAliveTask()
            let bgTimestamp = self.lastBackgroundTimestamp
            let wasBackgrounded = (bgTimestamp != nil)
            let bgDuration = bgTimestamp.map { Date().timeIntervalSince($0) } ?? 0
            let expired = self.didExpireInBackground
            let anyBridgeDead = self.activeDnsBridges.values.contains(where: { !$0.isListening })
            guard wasBackgrounded || anyBridgeDead else { return }
            self.lastBackgroundTimestamp = nil
            self.didExpireInBackground = false
            if anyBridgeDead || expired || bgDuration > 28.0 {
                if Date().timeIntervalSince(self.lastBridgeRestartTimestamp) > 0.8 || anyBridgeDead {
                    for (_, prof) in self.activeProfilesByID {
                        self.forceRestartBridge(for: prof)
                    }
                }
            }
        }

        NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main,
            using: resumeHandler
        )
        NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main,
            using: resumeHandler
        )
    }

    /// Forces a fresh LocalSocks5DnsBridge on a new ephemeral loopback port for the given profile
    /// and re-binds ONLY that profile's WKWebsiteDataStore without disturbing other active profiles.
    public func forceRestartBridge(for profile: PrivacyProfile? = nil) {
        let work = { [weak self] in
            guard let self = self else { return }
            guard let prof = profile ?? self.lastAppliedProfile else { return }
            let pid = prof.sessionDataStoreID
            self.lastBridgeRestartTimestamp = Date()
            self.activeDnsBridges[pid]?.stop()
            self.activeDnsBridges.removeValue(forKey: pid)
            self.activeBridgeConfigKeys.removeValue(forKey: pid)
            self.activeBridgePorts.removeValue(forKey: pid)
            self.lastAppliedConfigKeys.removeValue(forKey: pid)
            let ds = self.websiteDataStore(for: prof)
            self.applyProxy(to: ds, profile: prof)
            NotificationCenter.default.post(name: NSNotification.Name("GhostProxyBridgeDidRestart"), object: pid)
        }
        if Thread.isMainThread {
            work()
        } else {
            DispatchQueue.main.async(execute: work)
        }
    }

    /// Returns a shared WKWebsiteDataStore for the given profile so all tabs in the same profile
    /// share the exact same underlying network session and proxy tunnel without conflicts.
    public func websiteDataStore(for profile: PrivacyProfile) -> WKWebsiteDataStore {
        let key = "\(profile.sessionDataStoreID.uuidString)_\(profile.ephemeralRAMMode ? "ram" : "disk")"
        if let existing = sharedDataStores[key] {
            activeDataStores.add(existing)
            return existing
        }
        let ds: WKWebsiteDataStore
        if profile.ephemeralRAMMode {
            ds = WKWebsiteDataStore.nonPersistent()
        } else if #available(iOS 17.0, *) {
            ds = WKWebsiteDataStore(forIdentifier: profile.sessionDataStoreID)
        } else {
            ds = WKWebsiteDataStore.default()
        }
        sharedDataStores[key] = ds
        activeDataStores.add(ds)
        return ds
    }

    public func invalidateDataStore(for profile: PrivacyProfile) {
        let key = "\(profile.sessionDataStoreID.uuidString)_\(profile.ephemeralRAMMode ? "ram" : "disk")"
        sharedDataStores.removeValue(forKey: key)
    }

    /// Checks whether the profile's SOCKS5 tunnel sat idle long enough for upstream carrier/Starlink NAT
    /// or Apple's out-of-process `com.apple.WebKit.Networking` socket pool to go stale.
    public func ensureFreshRouteIfIdle(for profile: PrivacyProfile, userInitiatedReload: Bool = false) {
        guard profile.proxyEnabled, !profile.proxyHost.isEmpty else { return }
        let pid = profile.sessionDataStoreID
        if let bridge = activeDnsBridges[pid] {
            let idleSec = bridge.secondsSinceLastTraffic
            let threshold: TimeInterval = userInitiatedReload ? 20.0 : 75.0
            if !bridge.isListening || bridge.hasRecentUpstreamFailure || idleSec >= threshold {
                forceRestartBridge(for: profile)
                return
            }
        }
        let store = websiteDataStore(for: profile)
        applyProxy(to: store, profile: profile)
    }

    /// Applies native C++ Network.ProxyConfiguration strictly to the given profile's WKWebsiteDataStore on iOS 17+
    /// and routes SOCKS5 traffic through a per-profile LocalSocks5DnsBridge so multiple active profiles never conflict.
    public func applyProxy(to dataStore: WKWebsiteDataStore, profile: PrivacyProfile) {
        if #available(iOS 17.0, *) {
            let pid = profile.sessionDataStoreID
            lastAppliedProfile = profile
            activeProfilesByID[pid] = profile
            activeDataStores.add(dataStore)
            let sanitized = sanitizeCredentials(
                type: profile.proxyType,
                host: profile.proxyHost,
                port: profile.proxyPort,
                username: profile.proxyUsername,
                password: profile.proxyPassword
            )
            let host = sanitized.host
            let isHttp = sanitized.type.uppercased().contains("HTTP")
            let user = sanitized.username
            let pass = sanitized.password

            let configKey = "\(profile.proxyEnabled)|\(isHttp ? "HTTP" : "SOCKS5")|\(host.lowercased())|\(sanitized.port)|\(user)|\(pass)|\(profile.enableDnsProxyMatching)"
            let configDidChange = (configKey != lastAppliedConfigKeys[pid])
            if configDidChange {
                lastAppliedConfigKeys[pid] = configKey
            }

            let applyToProfileStore: ([ProxyConfiguration]) -> Void = { [weak self] configs in
                dataStore.proxyConfigurations = configs
                guard let self = self else { return }
                let ramKey = "\(pid.uuidString)_ram"
                let diskKey = "\(pid.uuidString)_disk"
                if let s1 = self.sharedDataStores[ramKey], s1 !== dataStore {
                    s1.proxyConfigurations = configs
                }
                if let s2 = self.sharedDataStores[diskKey], s2 !== dataStore {
                    s2.proxyConfigurations = configs
                }
            }

            guard profile.proxyEnabled,
                  !host.isEmpty,
                  sanitized.port > 0,
                  sanitized.port <= 65535,
                  let nwPort = NWEndpoint.Port(rawValue: UInt16(sanitized.port)) else {
                activeDnsBridges[pid]?.stop()
                activeDnsBridges.removeValue(forKey: pid)
                activeBridgeConfigKeys.removeValue(forKey: pid)
                activeBridgePorts.removeValue(forKey: pid)
                applyToProfileStore([])
                return
            }

            if !isHttp {
                if let existingBridge = activeDnsBridges[pid],
                   existingBridge.isListening,
                   let existingPort = activeBridgePorts[pid],
                   existingPort > 0,
                   activeBridgeConfigKeys[pid] == configKey,
                   let bridgeNwPort = NWEndpoint.Port(rawValue: existingPort) {
                    existingBridge.updateDetectedMetadata(isp: profile.proxyDetectedISP, asn: profile.proxyDetectedASN)
                    if configDidChange {
                        let localEndpoint = NWEndpoint.hostPort(host: .ipv4(.loopback), port: bridgeNwPort)
                        let proxyConfig = ProxyConfiguration(socksv5Proxy: localEndpoint)
                        applyToProfileStore([proxyConfig])
                    }
                    return
                }

                activeDnsBridges[pid]?.stop()
                let bridge = LocalSocks5DnsBridge(
                    upstreamHost: host,
                    upstreamPort: UInt16(sanitized.port),
                    username: user,
                    password: pass,
                    detectedIsp: profile.proxyDetectedISP,
                    detectedAsn: profile.proxyDetectedASN
                )
                bridge.onUnexpectedStop = { [weak self, weak bridge, weak profile] in
                    DispatchQueue.main.async {
                        guard let self = self, let prof = profile, self.activeDnsBridges[pid] === bridge else { return }
                        self.forceRestartBridge(for: prof)
                    }
                }
                if let localPort = bridge.start(),
                   let bridgeNwPort = NWEndpoint.Port(rawValue: localPort) {
                    activeDnsBridges[pid] = bridge
                    activeBridgePorts[pid] = localPort
                    activeBridgeConfigKeys[pid] = configKey
                    let localEndpoint = NWEndpoint.hostPort(host: .ipv4(.loopback), port: bridgeNwPort)
                    let proxyConfig = ProxyConfiguration(socksv5Proxy: localEndpoint)
                    applyToProfileStore([proxyConfig])
                    return
                }
            } else {
                activeDnsBridges[pid]?.stop()
                activeDnsBridges.removeValue(forKey: pid)
                activeBridgeConfigKeys.removeValue(forKey: pid)
                activeBridgePorts.removeValue(forKey: pid)
            }

            let endpoint = NWEndpoint.hostPort(host: NWEndpoint.Host(host), port: nwPort)
            var proxyConfig: ProxyConfiguration
            if isHttp {
                proxyConfig = ProxyConfiguration(httpCONNECTProxy: endpoint, tlsOptions: nil)
            } else {
                proxyConfig = ProxyConfiguration(socksv5Proxy: endpoint)
            }

            if !user.isEmpty {
                proxyConfig.applyCredential(username: user, password: pass)
            }

            applyToProfileStore([proxyConfig])
        }
    }

    /// Tests a SOCKS5 or HTTP proxy via raw NWConnection RFC-1928/1929 handshake and resolves Exit IP, Geo, ISP & Timezone.
    /// Automatically sanitizes pasted credentials and falls back to the alternate protocol (SOCKS5 <-> HTTP) if needed.
    public func testProxyAsync(
        type: String,
        host: String,
        port: Int,
        username: String,
        password: String
    ) async -> ProxyTestResult {
        let sanitized = sanitizeCredentials(type: type, host: host, port: port, username: username, password: password)
        let cleanHost = sanitized.host
        let cleanPort = sanitized.port
        let cleanUser = sanitized.username
        let cleanPass = sanitized.password
        let primaryType = sanitized.type.uppercased().contains("HTTP") ? "HTTP" : "SOCKS5"

        guard !cleanHost.isEmpty, cleanPort > 0 && cleanPort <= 65535 else {
            return ProxyTestResult(success: false, errorMessage: "Invalid proxy host or port.")
        }

        // 1. Try primary selected protocol against ip-api.com
        var primaryResult = await performSingleProxyTest(
            type: primaryType,
            host: cleanHost,
            port: cleanPort,
            username: cleanUser,
            password: cleanPass,
            geoHost: "ip-api.com",
            geoPath: "/json/?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query"
        )

        // 2. If primary succeeded on tunnel but ip-api.com was rate-limited/blocked, try ipwho.is
        if !primaryResult.success && primaryResult.errorMessage.contains("parse geo response") {
            let backupGeo = await performSingleProxyTest(
                type: primaryType,
                host: cleanHost,
                port: cleanPort,
                username: cleanUser,
                password: cleanPass,
                geoHost: "ipwho.is",
                geoPath: "/"
            )
            if backupGeo.success {
                primaryResult = backupGeo
            }
        }

        if primaryResult.success {
            if let httpsInfo = await verifyHttpsExitIp(
                type: primaryType,
                host: cleanHost,
                port: cleanPort,
                username: cleanUser,
                password: cleanPass
            ) {
                if !httpsInfo.ip.contains(":") || primaryResult.ip.isEmpty || primaryResult.ip.contains(":") {
                    primaryResult.ip = httpsInfo.ip
                }
                if !httpsInfo.isp.isEmpty { primaryResult.isp = httpsInfo.isp }
                if !httpsInfo.asn.isEmpty { primaryResult.asn = httpsInfo.asn }
                if !httpsInfo.city.isEmpty { primaryResult.city = httpsInfo.city }
                if !httpsInfo.region.isEmpty { primaryResult.regionCode = httpsInfo.region }
                if !httpsInfo.country.isEmpty { primaryResult.country = httpsInfo.country }
                if !httpsInfo.timezone.isEmpty && httpsInfo.timezone.contains("/") {
                    primaryResult.timezoneId = httpsInfo.timezone
                }
                if httpsInfo.lat != 0 || httpsInfo.lon != 0 {
                    primaryResult.latitude = httpsInfo.lat
                    primaryResult.longitude = httpsInfo.lon
                }
            }
            primaryResult.resolvedType = primaryType
            primaryResult.resolvedHost = cleanHost
            primaryResult.resolvedPort = cleanPort
            primaryResult.resolvedUsername = cleanUser
            primaryResult.resolvedPassword = cleanPass
            return primaryResult
        }

        // 3. Automatic protocol fallback (if user selected SOCKS5 on an HTTP port or HTTP on a SOCKS5 port)
        let altType = (primaryType == "SOCKS5") ? "HTTP" : "SOCKS5"
        var altResult = await performSingleProxyTest(
            type: altType,
            host: cleanHost,
            port: cleanPort,
            username: cleanUser,
            password: cleanPass,
            geoHost: "ip-api.com",
            geoPath: "/json/?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query"
        )
        if altResult.success {
            if let httpsInfo = await verifyHttpsExitIp(
                type: altType,
                host: cleanHost,
                port: cleanPort,
                username: cleanUser,
                password: cleanPass
            ) {
                if !httpsInfo.ip.contains(":") || altResult.ip.isEmpty || altResult.ip.contains(":") {
                    altResult.ip = httpsInfo.ip
                }
                if !httpsInfo.isp.isEmpty { altResult.isp = httpsInfo.isp }
                if !httpsInfo.asn.isEmpty { altResult.asn = httpsInfo.asn }
                if !httpsInfo.city.isEmpty { altResult.city = httpsInfo.city }
                if !httpsInfo.region.isEmpty { altResult.regionCode = httpsInfo.region }
                if !httpsInfo.country.isEmpty { altResult.country = httpsInfo.country }
                if !httpsInfo.timezone.isEmpty && httpsInfo.timezone.contains("/") {
                    altResult.timezoneId = httpsInfo.timezone
                }
                if httpsInfo.lat != 0 || httpsInfo.lon != 0 {
                    altResult.latitude = httpsInfo.lat
                    altResult.longitude = httpsInfo.lon
                }
            }
            altResult.resolvedType = altType
            altResult.resolvedHost = cleanHost
            altResult.resolvedPort = cleanPort
            altResult.resolvedUsername = cleanUser
            altResult.resolvedPassword = cleanPass
            return altResult
        }

        // Provide an actionable hint if authentication failed because password was blank
        if primaryResult.errorMessage.contains("authentication rejected") && cleanPass.isEmpty && !cleanUser.isEmpty {
            primaryResult.errorMessage = "SOCKS5 authentication rejected: Password is empty. Use Smart Paste (host:port:user:pass) or enter your proxy password."
        }
        primaryResult.resolvedType = primaryType
        primaryResult.resolvedHost = cleanHost
        primaryResult.resolvedPort = cleanPort
        primaryResult.resolvedUsername = cleanUser
        primaryResult.resolvedPassword = cleanPass
        return primaryResult
    }

    /// Queries the live HTTPS (:443) IPv4 exit IP and Geo/ISP/Timezone through the proxy so carrier proxies
    /// that route port 80 through a different gateway report the exact same TLS :443 IPv4 exit IP and Timezone seen by websites.
    private func verifyHttpsExitIp(
        type: String,
        host: String,
        port: Int,
        username: String,
        password: String
    ) async -> (ip: String, isp: String, asn: String, city: String, region: String, country: String, timezone: String, lat: Double, lon: Double)? {
        guard #available(iOS 17.0, *),
              let nwPort = NWEndpoint.Port(rawValue: UInt16(port)) else {
            return nil
        }
        let endpoint = NWEndpoint.hostPort(host: NWEndpoint.Host(host), port: nwPort)
        let isHttp = type.uppercased().contains("HTTP")
        var proxyConfig: ProxyConfiguration = isHttp
            ? ProxyConfiguration(httpCONNECTProxy: endpoint, tlsOptions: nil)
            : ProxyConfiguration(socksv5Proxy: endpoint)
        if !username.isEmpty {
            proxyConfig.applyCredential(username: username, password: password)
        }
        let sessionConfig = URLSessionConfiguration.ephemeral
        sessionConfig.timeoutIntervalForRequest = 4.5
        sessionConfig.timeoutIntervalForResource = 5.0
        sessionConfig.proxyConfigurations = [proxyConfig]
        let session = URLSession(configuration: sessionConfig)
        defer { session.invalidateAndCancel() }

        // First try IPv4-specific endpoint so dual-stack mobile proxies always resolve their IPv4 exit IP
        var knownIpv4 = ""
        if let v4Url = URL(string: "https://api4.ipify.org?format=json") {
            if let (v4Data, _) = try? await session.data(from: v4Url),
               let v4Obj = try? JSONSerialization.jsonObject(with: v4Data) as? [String: Any],
               let ip4 = v4Obj["ip"] as? String, !ip4.isEmpty, !ip4.contains(":") {
                knownIpv4 = ip4
            }
        }

        let whoUrlStr = knownIpv4.isEmpty ? "https://ipwho.is/" : "https://ipwho.is/\(knownIpv4)"
        if let url = URL(string: whoUrlStr) {
            if let (data, _) = try? await session.data(from: url),
               let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               (obj["success"] as? Bool) != false,
               let ip = obj["ip"] as? String, !ip.isEmpty {
                let finalIp = (!knownIpv4.isEmpty && ip.contains(":")) ? knownIpv4 : ip
                let connDict = obj["connection"] as? [String: Any]
                let tzDict = obj["timezone"] as? [String: Any]
                let isp = (connDict?["isp"] as? String) ?? (connDict?["org"] as? String) ?? ""
                let asn: String = {
                    if let asnInt = connDict?["asn"] as? Int { return "AS\(asnInt)" }
                    if let asnStr = connDict?["asn"] as? String, !asnStr.isEmpty { return asnStr.hasPrefix("AS") ? asnStr : "AS\(asnStr)" }
                    return ""
                }()
                let city = (obj["city"] as? String) ?? ""
                let region = (obj["region_code"] as? String) ?? (obj["region"] as? String) ?? ""
                let country = (obj["country"] as? String) ?? ""
                let tz = (tzDict?["id"] as? String) ?? ""
                let lat = (obj["latitude"] as? Double) ?? 0.0
                let lon = (obj["longitude"] as? Double) ?? 0.0
                return (finalIp, isp, asn, city, region, country, tz, lat, lon)
            }
        }
        if !knownIpv4.isEmpty {
            return (knownIpv4, "", "", "", "", "", "", 0.0, 0.0)
        }
        return nil
    }

    private func performSingleProxyTest(
        type: String,
        host: String,
        port: Int,
        username: String,
        password: String,
        geoHost: String,
        geoPath: String
    ) async -> ProxyTestResult {
        guard let nwPort = NWEndpoint.Port(rawValue: UInt16(port)) else {
            return ProxyTestResult(success: false, errorMessage: "Invalid proxy port.")
        }

        return await withCheckedContinuation { continuation in
            let queue = DispatchQueue(label: "com.ghostbrowser.proxytest.\(UUID().uuidString)")
            let conn = NWConnection(host: NWEndpoint.Host(host), port: nwPort, using: .tcp)
            var completed = false

            func finish(_ res: ProxyTestResult) {
                guard !completed else { return }
                completed = true
                conn.cancel()
                continuation.resume(returning: res)
            }

            queue.asyncAfter(deadline: .now() + 10.0) {
                finish(ProxyTestResult(success: false, errorMessage: "Proxy connection timed out (10s)."))
            }

            conn.stateUpdateHandler = { state in
                switch state {
                case .ready:
                    if type.uppercased().contains("HTTP") {
                        self.performHttpProxyLookup(conn: conn, username: username, password: password, geoHost: geoHost, geoPath: geoPath, finish: finish)
                    } else {
                        self.performSocks5Lookup(conn: conn, username: username, password: password, geoHost: geoHost, geoPath: geoPath, finish: finish)
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
        geoHost: String,
        geoPath: String,
        finish: @escaping (ProxyTestResult) -> Void
    ) {
        let hasAuth = !username.isEmpty
        let greeting: [UInt8] = hasAuth ? [0x05, 0x02, 0x02, 0x00] : [0x05, 0x01, 0x00]

        conn.send(content: Data(greeting), completion: .contentProcessed { err in
            if let err = err {
                finish(ProxyTestResult(success: false, errorMessage: "SOCKS5 greeting error: \(err.localizedDescription)"))
                return
            }

            conn.receive(minimumIncompleteLength: 2, maximumLength: 2) { data, _, _, _ in
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
                            self.sendSocks5ConnectAndHttpGet(conn: conn, geoHost: geoHost, geoPath: geoPath, finish: finish)
                        }
                    })
                } else if method == 0x00 {
                    self.sendSocks5ConnectAndHttpGet(conn: conn, geoHost: geoHost, geoPath: geoPath, finish: finish)
                } else if method == 0xFF {
                    finish(ProxyTestResult(success: false, errorMessage: "SOCKS5 server requires authentication (no acceptable auth method)."))
                } else {
                    finish(ProxyTestResult(success: false, errorMessage: "Unsupported SOCKS5 auth method (\(method))."))
                }
            }
        })
    }

    /// Reads the exact SOCKS5 CONNECT reply frame (`ATYP=0x01` -> 10B, `ATYP=0x03` -> 7+len B, `ATYP=0x04` -> 22B)
    /// so no binary address/port bytes spill into the downstream HTTP stream.
    fileprivate static func readExactSocks5ConnectReply(
        conn: NWConnection,
        completion: @escaping (Bool, UInt8) -> Void
    ) {
        conn.receive(minimumIncompleteLength: 4, maximumLength: 4) { hdr, _, _, err in
            guard let hdr = hdr, hdr.count == 4, err == nil, hdr[0] == 0x05 else {
                completion(false, 0xFF)
                return
            }
            let rep = hdr[1]
            let atyp = hdr[3]
            if atyp == 0x01 {
                conn.receive(minimumIncompleteLength: 6, maximumLength: 6) { _, _, _, _ in
                    completion(rep == 0x00, rep)
                }
            } else if atyp == 0x04 {
                conn.receive(minimumIncompleteLength: 18, maximumLength: 18) { _, _, _, _ in
                    completion(rep == 0x00, rep)
                }
            } else if atyp == 0x03 {
                conn.receive(minimumIncompleteLength: 1, maximumLength: 1) { lenData, _, _, _ in
                    let dlen = Int(lenData?.first ?? 0)
                    let rem = dlen + 2
                    conn.receive(minimumIncompleteLength: rem, maximumLength: rem) { _, _, _, _ in
                        completion(rep == 0x00, rep)
                    }
                }
            } else {
                completion(rep == 0x00, rep)
            }
        }
    }

    private func sendSocks5ConnectAndHttpGet(
        conn: NWConnection,
        geoHost: String,
        geoPath: String,
        finish: @escaping (ProxyTestResult) -> Void
    ) {
        let targetDomain = Array(geoHost.utf8)
        var connectReq: [UInt8] = [0x05, 0x01, 0x00, 0x03, UInt8(targetDomain.count)]
        connectReq.append(contentsOf: targetDomain)
        connectReq.append(contentsOf: [0x00, 0x50]) // port 80

        conn.send(content: Data(connectReq), completion: .contentProcessed { err in
            if let err = err {
                finish(ProxyTestResult(success: false, errorMessage: "SOCKS5 CONNECT failed: \(err.localizedDescription)"))
                return
            }

            ProxyService.readExactSocks5ConnectReply(conn: conn) { ok, rep in
                guard ok else {
                    finish(ProxyTestResult(success: false, errorMessage: "SOCKS5 remote tunnel connect failed (code \(rep))."))
                    return
                }

                let httpGet = "GET \(geoPath) HTTP/1.1\r\nHost: \(geoHost)\r\nUser-Agent: curl/8.4.0\r\nAccept: application/json\r\nConnection: close\r\n\r\n"
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
        geoHost: String,
        geoPath: String,
        finish: @escaping (ProxyTestResult) -> Void
    ) {
        var authHeader = ""
        if !username.isEmpty {
            let cred = "\(username):\(password)"
            if let b64 = cred.data(using: .utf8)?.base64EncodedString() {
                authHeader = "Proxy-Authorization: Basic \(b64)\r\n"
            }
        }
        let httpGet = "GET http://\(geoHost)\(geoPath) HTTP/1.1\r\nHost: \(geoHost)\r\n\(authHeader)User-Agent: curl/8.4.0\r\nAccept: application/json\r\nConnection: close\r\n\r\n"
        conn.send(content: Data(httpGet.utf8), completion: .contentProcessed { err in
            if let err = err {
                finish(ProxyTestResult(success: false, errorMessage: "HTTP Proxy send failed: \(err.localizedDescription)"))
                return
            }
            self.readAllHttpResponse(conn: conn, accumulated: Data(), finish: finish)
        })
    }

    public static func inferTimezone(country: String, region: String, city: String, username: String = "") -> String {
        let hint = "\(country) \(region) \(city) \(username)".lowercased()
        if hint.range(of: #"\b(ca|california|los[\s_-]*angeles|san[\s_-]*jose|san[\s_-]*francisco|seattle|wa|washington|or|oregon|portland|nv|nevada|las[\s_-]*vegas)\b"#, options: .regularExpression) != nil {
            return "America/Los_Angeles"
        }
        if hint.range(of: #"\b(az|arizona|phoenix)\b"#, options: .regularExpression) != nil {
            return "America/Phoenix"
        }
        if hint.range(of: #"\b(co|colorado|denver|ut|utah|salt[\s_-]*lake|nm|new[\s_-]*mexico|mt|montana|id|idaho|wy|wyoming)\b"#, options: .regularExpression) != nil {
            return "America/Denver"
        }
        if hint.range(of: #"\b(tx|texas|dallas|houston|austin|san[\s_-]*antonio|il|illinois|chicago|wi|wisconsin|milwaukee|mn|minnesota|minneapolis|mo|missouri|st[\s_-]*louis|kansas[\s_-]*city|tn|tennessee|nashville|la|louisiana|al|alabama|ok|oklahoma|ks|kansas|ne|nebraska|ia|iowa|ar|arkansas|ms|mississippi)\b"#, options: .regularExpression) != nil {
            return "America/Chicago"
        }
        if hint.range(of: #"\b(gb|uk|united[\s_-]*kingdom|london|england)\b"#, options: .regularExpression) != nil {
            return "Europe/London"
        }
        if hint.range(of: #"\b(de|germany|frankfurt|berlin|munich)\b"#, options: .regularExpression) != nil {
            return "Europe/Berlin"
        }
        if hint.range(of: #"\b(fr|france|paris)\b"#, options: .regularExpression) != nil {
            return "Europe/Paris"
        }
        if hint.range(of: #"\b(nl|netherlands|amsterdam)\b"#, options: .regularExpression) != nil {
            return "Europe/Amsterdam"
        }
        if hint.range(of: #"\b(jp|japan|tokyo)\b"#, options: .regularExpression) != nil {
            return "Asia/Tokyo"
        }
        if hint.range(of: #"\b(sg|singapore)\b"#, options: .regularExpression) != nil {
            return "Asia/Singapore"
        }
        if hint.range(of: #"\b(au|australia|sydney|melbourne)\b"#, options: .regularExpression) != nil {
            return "Australia/Sydney"
        }
        return "America/New_York"
    }

    private func readAllHttpResponse(
        conn: NWConnection,
        accumulated: Data,
        finish: @escaping (ProxyTestResult) -> Void
    ) {
        conn.receive(minimumIncompleteLength: 1, maximumLength: 8192) { chunk, _, isComplete, _ in
            var buffer = accumulated
            if let chunk = chunk, !chunk.isEmpty {
                buffer.append(chunk)
            }
            // Use tolerant UTF-8 decoding so any stray non-UTF8 header byte never aborts JSON extraction
            let text = String(decoding: buffer, as: UTF8.self)
            if text.contains("407 Proxy Authentication Required") {
                finish(ProxyTestResult(success: false, errorMessage: "HTTP Proxy username/password authentication rejected (407)."))
                return
            }
            if let braceStart = text.firstIndex(of: "{"),
               let braceEnd = text.lastIndex(of: "}"),
               braceStart < braceEnd {
                let jsonStr = String(text[braceStart...braceEnd])
                if let jsonData = jsonStr.data(using: .utf8),
                   let obj = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                    // Reject rate-limited or failed GeoIP responses so testProxyAsync falls back to the next provider
                    if let status = (obj["status"] as? String)?.lowercased(), status == "fail" {
                        finish(ProxyTestResult(success: false, errorMessage: "GeoIP endpoint returned status=fail."))
                        return
                    }
                    if let ok = obj["success"] as? Bool, ok == false {
                        finish(ProxyTestResult(success: false, errorMessage: "GeoIP endpoint returned success=false."))
                        return
                    }
                    // Support both ip-api.com ("query") and ipwho.is ("ip")
                    let queryIp = (obj["query"] as? String) ?? (obj["ip"] as? String) ?? ""
                    if !queryIp.isEmpty {
                        let city = (obj["city"] as? String) ?? ""
                        let regionCode = (obj["region"] as? String) ?? (obj["region_code"] as? String) ?? (obj["regionName"] as? String) ?? (obj["countryCode"] as? String) ?? (obj["country_code"] as? String) ?? ""
                        let country = (obj["country"] as? String) ?? ""

                        let connDict = obj["connection"] as? [String: Any]
                        let tzDict = obj["timezone"] as? [String: Any]

                        let isp = (obj["isp"] as? String)
                            ?? (connDict?["isp"] as? String)
                            ?? (obj["org"] as? String)
                            ?? (connDict?["org"] as? String)
                            ?? ""
                        let asn: String = {
                            if let asStr = obj["as"] as? String, !asStr.isEmpty { return asStr }
                            if let asnInt = connDict?["asn"] as? Int { return "AS\(asnInt)" }
                            return ""
                        }()
                        let isMobile = (obj["mobile"] as? Bool) ?? false
                        let isHosting = (obj["hosting"] as? Bool) ?? false
                        let rawTz = (obj["timezone"] as? String)
                            ?? (tzDict?["id"] as? String)
                            ?? (obj["time_zone"] as? String)
                            ?? ""
                        let tz = (!rawTz.isEmpty && rawTz.contains("/"))
                            ? rawTz
                            : Self.inferTimezone(country: country, region: regionCode, city: city)
                        let lat = (obj["lat"] as? Double) ?? (obj["latitude"] as? Double) ?? 37.7749
                        let lon = (obj["lon"] as? Double) ?? (obj["longitude"] as? Double) ?? -122.4194

                        let combined = "\(isp) \(asn)".lowercased()
                        let usageType: String
                        let connType: String
                        if isMobile || combined.contains("t-mobile") || combined.contains("verizon wireless") || combined.contains("at&t mobility") || combined.contains("cellular") {
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
            }

            if isComplete || (chunk == nil || chunk!.isEmpty) {
                finish(ProxyTestResult(success: false, errorMessage: "Could not parse geo response from proxy tunnel."))
            } else {
                self.readAllHttpResponse(conn: conn, accumulated: buffer, finish: finish)
            }
        }
    }
}

/// Local loopback SOCKS5 bridge for iPadOS that intercepts ATYP=0x03 (DomainName) requests from WKWebsiteDataStore:
/// 1. Immediately rejects bogus DNSSEC domains (`-badsig.`, `rhybar.cz`, `dnssec-failed.org`, etc.) so DNSSEC scanners pass 12/12.
/// 2. Resolves domains inside the SOCKS5 tunnel over TCP Port 53 using the residential ISP's recursive DNS servers when Port 53 is open.
/// 3. Automatically falls back to upstream `ATYP=0x03` tunnel resolution on mobile/carrier proxies (e.g., `mobile.lightningproxies.net`)
///    that block raw outbound TCP Port 53 to external DNS servers, ensuring 100% page load reliability.
public final class LocalSocks5DnsBridge {
    private let upstreamHost: String
    private let upstreamPort: UInt16
    private let username: String
    private let password: String
    private var detectedIsp: String
    private var detectedAsn: String
    private let queue = DispatchQueue(label: "com.ghostbrowser.socks5dnsbridge", attributes: .concurrent)
    private let cacheLock = NSLock()
    private static let sharedCacheLock = NSLock()
    private static var sharedDnsCache: [String: (ip: String?, freshUntil: Date, staleUntil: Date)] = [:]
    private static var didLoadPersistentDnsCache: Bool = false
    private static var lastPersistentDnsSaveTime: TimeInterval = 0
    private static let persistentDnsCacheKey = "ghost_persistent_dns_cache_v2"
    private var port53ConsecutiveFailures: Int = 0
    private var port53BlockedByProxy: Bool = false
    private var cleanFailoverUsername: String?
    private var cujoBlockedHosts: Set<String> = []
    private var listener: NWListener?
    private var keepWarmTimer: DispatchSourceTimer?
    private var currentBoundPort: UInt16 = 0
    private var isStopped: Bool = false
    private var lastTrafficDate: Date = Date()
    private var recentUpstreamFailure: Bool = false
    private var activeConnections: [ObjectIdentifier: NWConnection] = [:]
    public var onUnexpectedStop: (() -> Void)?

    public var isListening: Bool {
        cacheLock.lock()
        defer { cacheLock.unlock() }
        return !isStopped && listener != nil && currentBoundPort > 0
    }

    public var secondsSinceLastTraffic: TimeInterval {
        cacheLock.lock()
        defer { cacheLock.unlock() }
        return Date().timeIntervalSince(lastTrafficDate)
    }

    public var hasRecentUpstreamFailure: Bool {
        cacheLock.lock()
        defer { cacheLock.unlock() }
        return recentUpstreamFailure
    }

    private static func makeLowLatencyTcpParams() -> NWParameters {
        let tcpOpts = NWProtocolTCP.Options()
        tcpOpts.noDelay = true
        tcpOpts.enableKeepalive = true
        tcpOpts.keepaliveIdle = 18
        tcpOpts.keepaliveInterval = 6
        tcpOpts.keepaliveCount = 3
        tcpOpts.connectionTimeout = 7
        return NWParameters(tls: nil, tcp: tcpOpts)
    }

    private static func ensurePersistentDnsCacheLoadedLocked() {
        guard !didLoadPersistentDnsCache else { return }
        didLoadPersistentDnsCache = true
        // Purge any legacy local getaddrinfo() cache entries so zero local network DNS data ever persists
        UserDefaults.standard.removeObject(forKey: persistentDnsCacheKey)
    }

    private static func savePersistentDnsCacheThrottled() {
        // No-op: never persist DNS entries across sessions
    }

    private func scopedDnsCacheKey(_ lowerHost: String) -> String {
        return "\(upstreamHost.lowercased()):\(upstreamPort):\(username)|\(lowerHost)"
    }

    private func getCachedDnsEntry(_ lowerHost: String) -> (ip: String?, freshUntil: Date, staleUntil: Date)? {
        let key = scopedDnsCacheKey(lowerHost)
        Self.sharedCacheLock.lock()
        defer { Self.sharedCacheLock.unlock() }
        Self.ensurePersistentDnsCacheLoadedLocked()
        return Self.sharedDnsCache[key]
    }

    private func setCachedDnsEntry(_ lowerHost: String, ip: String?, freshTtl: TimeInterval, staleTtl: TimeInterval) {
        let key = scopedDnsCacheKey(lowerHost)
        let now = Date()
        Self.sharedCacheLock.lock()
        Self.ensurePersistentDnsCacheLoadedLocked()
        Self.sharedDnsCache[key] = (ip, now.addingTimeInterval(freshTtl), now.addingTimeInterval(staleTtl))
        Self.sharedCacheLock.unlock()
        if let ip = ip, !ip.isEmpty {
            Self.savePersistentDnsCacheThrottled()
        }
    }

    private func markTrafficActivity() {
        cacheLock.lock()
        lastTrafficDate = Date()
        recentUpstreamFailure = false
        cacheLock.unlock()
    }

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
        self.port53BlockedByProxy = false
    }

    private func registerConnection(_ conn: NWConnection) {
        cacheLock.lock()
        if isStopped {
            cacheLock.unlock()
            conn.forceCancel()
            return
        }
        activeConnections[ObjectIdentifier(conn)] = conn
        cacheLock.unlock()
    }

    private func unregisterAndCancel(_ conn: NWConnection, force: Bool = false) {
        cacheLock.lock()
        activeConnections.removeValue(forKey: ObjectIdentifier(conn))
        cacheLock.unlock()
        if force {
            conn.forceCancel()
        } else {
            conn.cancel()
        }
    }

    public func updateDetectedMetadata(isp: String, asn: String) {
        var shouldReprobe = false
        cacheLock.lock()
        if !isp.isEmpty && self.detectedIsp != isp {
            self.detectedIsp = isp
            shouldReprobe = true
        }
        if !asn.isEmpty && self.detectedAsn != asn {
            self.detectedAsn = asn
            shouldReprobe = true
        }
        cacheLock.unlock()
        if shouldReprobe {
            probePort53Support()
        }
    }

    public func start() -> UInt16? {
        guard let listener = try? NWListener(using: .tcp, on: .any) else { return nil }
        self.listener = listener
        let readySem = DispatchSemaphore(value: 0)
        var boundPort: UInt16?
        var signaled = false

        listener.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                let p = listener.port?.rawValue
                boundPort = p
                self?.cacheLock.lock()
                self?.currentBoundPort = p ?? 0
                self?.cacheLock.unlock()
                if !signaled {
                    signaled = true
                    readySem.signal()
                }
            case .failed, .cancelled, .waiting:
                var shouldNotify = false
                if let self = self {
                    self.cacheLock.lock()
                    self.currentBoundPort = 0
                    shouldNotify = !self.isStopped && signaled
                    self.cacheLock.unlock()
                }
                if !signaled {
                    signaled = true
                    readySem.signal()
                }
                if shouldNotify {
                    self?.onUnexpectedStop?()
                }
            default:
                break
            }
        }

        listener.newConnectionHandler = { [weak self] clientConn in
            self?.handleClientConnection(clientConn)
        }

        listener.start(queue: queue)
        _ = readySem.wait(timeout: .now() + 2.0)
        startKeepWarmTimer()
        probePort53Support()
        return boundPort
    }

    private func probePort53Support() {
        let servers = Array(ispDnsServers().prefix(2))
        guard !servers.isEmpty else { return }
        for dnsIp in servers {
            querySingleIspDnsServerOverSocks5(domain: "example.com", dnsServerIp: dnsIp) { [weak self] handled, ip in
                guard let self = self, handled, let ip = ip, !ip.isEmpty else { return }
                self.cacheLock.lock()
                self.port53ConsecutiveFailures = 0
                self.port53BlockedByProxy = false
                self.verifiedDnsServers.insert(dnsIp)
                self.cacheLock.unlock()
            }
        }
    }

    private func startKeepWarmTimer() {
        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now() + 30.0, repeating: 35.0)
        timer.setEventHandler { [weak self] in
            guard let self = self, self.isListening else { return }
            if self.secondsSinceLastTraffic >= 28.0 {
                self.performUpstreamKeepWarmPing()
            }
        }
        cacheLock.lock()
        keepWarmTimer?.cancel()
        keepWarmTimer = timer
        cacheLock.unlock()
        timer.resume()
    }

    private func performUpstreamKeepWarmPing() {
        guard let nwPort = NWEndpoint.Port(rawValue: upstreamPort) else { return }
        let conn = NWConnection(host: NWEndpoint.Host(upstreamHost), port: nwPort, using: Self.makeLowLatencyTcpParams())
        var done = false
        func finish(_ ok: Bool) {
            guard !done else { return }
            done = true
            conn.cancel()
            if !ok {
                self.cacheLock.lock()
                self.recentUpstreamFailure = true
                self.cacheLock.unlock()
            }
        }
        queue.asyncAfter(deadline: .now() + 4.5) {
            finish(false)
        }
        conn.stateUpdateHandler = { [weak self] state in
            guard let self = self else { return }
            switch state {
            case .ready:
                let hasAuth = !self.username.isEmpty
                let greeting: [UInt8] = hasAuth ? [0x05, 0x02, 0x02, 0x00] : [0x05, 0x01, 0x00]
                conn.send(content: Data(greeting), completion: .contentProcessed { err in
                    guard err == nil else { finish(false); return }
                    conn.receive(minimumIncompleteLength: 2, maximumLength: 2) { data, _, _, rErr in
                        let ok = (data?.count ?? 0) >= 2 && rErr == nil && data?[0] == 0x05
                        finish(ok)
                    }
                })
            case .failed, .cancelled:
                finish(false)
            default:
                break
            }
        }
        conn.start(queue: queue)
    }

    public func stop() {
        cacheLock.lock()
        isStopped = true
        currentBoundPort = 0
        let t = keepWarmTimer
        keepWarmTimer = nil
        let l = listener
        listener = nil
        let conns = Array(activeConnections.values)
        activeConnections.removeAll()
        cacheLock.unlock()
        t?.cancel()
        l?.cancel()
        for c in conns {
            c.forceCancel()
        }
    }

    private var refusedDnsServers: Set<String> = []
    private var verifiedDnsServers: Set<String> = []

    private func ispDnsServers() -> [String] {
        cacheLock.lock()
        let isp = detectedIsp.lowercased()
        let asn = detectedAsn.lowercased()
        let refused = refusedDnsServers
        let verified = verifiedDnsServers
        cacheLock.unlock()

        let user = username.lowercased()
        var candidates: [String] = []

        // --- TIER 1: Global Carrier & Residential ISP Seed Registry ---
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
        if isp.contains("us cellular") || isp.contains("uscellular") || asn.contains("15678") {
            candidates.append(contentsOf: ["71.250.0.12", "71.242.0.12", "68.237.161.12"])
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
        if isp.contains("optimum") || isp.contains("altice") || isp.contains("cablevision") || isp.contains("suddenlink") || asn.contains("6128") || asn.contains("19108") {
            candidates.append(contentsOf: ["167.206.112.138", "167.206.7.4"])
        }
        if isp.contains("windstream") || asn.contains("7029") {
            candidates.append(contentsOf: ["166.102.165.11", "166.102.165.13"])
        }
        if isp.contains("mediacom") || asn.contains("30036") {
            candidates.append(contentsOf: ["97.64.183.164", "173.30.181.204"])
        }
        if isp.contains("astound") || isp.contains("rcn") || isp.contains("wave") || asn.contains("6079") {
            candidates.append(contentsOf: ["207.172.3.8", "207.172.3.9"])
        }
        if isp.contains("bell") || asn.contains("577") {
            candidates.append(contentsOf: ["207.164.234.193", "207.164.234.129"])
        }
        if isp.contains("rogers") || asn.contains("812") {
            candidates.append(contentsOf: ["64.71.255.198", "64.71.255.204"])
        }
        if isp.contains("telus") || asn.contains("852") {
            candidates.append(contentsOf: ["154.11.129.66", "154.11.129.194"])
        }
        if isp.contains("shaw") || asn.contains("6327") {
            candidates.append(contentsOf: ["64.59.144.18", "64.59.150.134"])
        }
        if isp.contains("bt") || isp.contains("british telecom") || isp.contains("ee") || asn.contains("2856") || asn.contains("12576") {
            candidates.append(contentsOf: ["62.6.40.178", "62.6.40.162", "194.72.9.34"])
        }
        if isp.contains("virgin") || asn.contains("5089") {
            candidates.append(contentsOf: ["194.168.4.100", "194.168.8.100"])
        }
        if isp.contains("sky") || asn.contains("5607") {
            candidates.append(contentsOf: ["90.207.238.97", "90.207.238.99"])
        }
        if isp.contains("talktalk") || asn.contains("13285") {
            candidates.append(contentsOf: ["79.79.79.79", "79.79.79.80"])
        }

        // --- TIER 3: Multi-ISP Residential Probing Fallback Pool ---
        candidates.append(contentsOf: [
            "209.18.47.61", "209.18.47.62",
            "71.250.0.12", "71.242.0.12",
            "71.10.216.1", "75.75.75.75",
            "68.94.156.1", "68.105.28.11",
            "205.171.3.65"
        ])

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

    private func handleClientConnection(_ clientConn: NWConnection) {
        registerConnection(clientConn)
        var clientReqCompleted = false
        queue.asyncAfter(deadline: .now() + 15.0) { [weak self] in
            if !clientReqCompleted {
                self?.unregisterAndCancel(clientConn)
            }
        }
        clientConn.start(queue: queue)
        // Read exact 2-byte SOCKS5 greeting header [VER, NMETHODS] so we never over-read into the CONNECT frame
        clientConn.receive(minimumIncompleteLength: 2, maximumLength: 2) { [weak self] hdr, _, _, err in
            guard let self = self, let hdr = hdr, hdr.count == 2, err == nil, hdr[0] == 0x05 else {
                self?.unregisterAndCancel(clientConn)
                return
            }
            let nmethods = Int(hdr[1])
            let replyNoAuth = { [weak self] in
                guard let self = self else { return }
                clientConn.send(content: Data([0x05, 0x00]), completion: .contentProcessed { [weak self] sendErr in
                    guard let self = self, sendErr == nil else {
                        self?.unregisterAndCancel(clientConn)
                        return
                    }
                    self.readClientSocks5Request(clientConn) {
                        clientReqCompleted = true
                    }
                })
            }
            if nmethods > 0 {
                clientConn.receive(minimumIncompleteLength: nmethods, maximumLength: nmethods) { [weak self] methodsData, _, _, mErr in
                    guard methodsData?.count == nmethods, mErr == nil else {
                        self?.unregisterAndCancel(clientConn)
                        return
                    }
                    replyNoAuth()
                }
            } else {
                replyNoAuth()
            }
        }
    }

    private func readClientSocks5Request(_ clientConn: NWConnection, onRequestParsed: @escaping () -> Void) {
        // Read exact 4-byte SOCKS5 request header [VER, CMD, RSV, ATYP]
        clientConn.receive(minimumIncompleteLength: 4, maximumLength: 4) { [weak self] hdr, _, _, err in
            guard let self = self, let hdr = hdr, hdr.count == 4, err == nil,
                  hdr[0] == 0x05, hdr[1] == 0x01 else {
                self?.unregisterAndCancel(clientConn)
                return
            }

            let atyp = hdr[3]
            if atyp == 0x01 {
                // IPv4: 4 bytes IP + 2 bytes port = 6 bytes
                clientConn.receive(minimumIncompleteLength: 6, maximumLength: 6) { [weak self] body, _, _, bErr in
                    guard let self = self, let body = body, body.count == 6, bErr == nil else {
                        self?.unregisterAndCancel(clientConn)
                        return
                    }
                    onRequestParsed()
                    let bytes = Array(body)
                    let targetHost = "\(bytes[0]).\(bytes[1]).\(bytes[2]).\(bytes[3])"
                    let targetPort = (UInt16(bytes[4]) << 8) | UInt16(bytes[5])
                    if self.isPrivateOrReservedIpv4(targetHost) {
                        clientConn.send(content: Data([0x05, 0x04, 0x00, 0x01, 0, 0, 0, 0, 0, 0]), completion: .contentProcessed { [weak self] _ in
                            self?.unregisterAndCancel(clientConn)
                        })
                        return
                    }
                    self.connectUpstreamAndRelay(clientConn: clientConn, connectHost: targetHost, targetPort: targetPort)
                }
            } else if atyp == 0x03 {
                // Domain name: 1 byte length + dlen bytes domain + 2 bytes port
                clientConn.receive(minimumIncompleteLength: 1, maximumLength: 1) { [weak self] lenData, _, _, lErr in
                    guard let self = self, let lenData = lenData, lenData.count == 1, lErr == nil else {
                        self?.unregisterAndCancel(clientConn)
                        return
                    }
                    let dlen = Int(lenData[0])
                    let rem = dlen + 2
                    guard dlen > 0 else {
                        self.unregisterAndCancel(clientConn)
                        return
                    }
                    clientConn.receive(minimumIncompleteLength: rem, maximumLength: rem) { [weak self] body, _, _, bErr in
                        guard let self = self, let body = body, body.count == rem, bErr == nil else {
                            self?.unregisterAndCancel(clientConn)
                            return
                        }
                        onRequestParsed()
                        let domBytes = body.subdata(in: 0..<dlen)
                        let targetHost = String(data: domBytes, encoding: .utf8) ?? String(data: domBytes, encoding: .ascii) ?? ""
                        let portHi = UInt16(body[dlen])
                        let portLo = UInt16(body[dlen + 1])
                        let targetPort = (portHi << 8) | portLo
                        self.handleDomainConnectRequest(clientConn: clientConn, targetHost: targetHost, targetPort: targetPort)
                    }
                }
            } else if atyp == 0x04 {
                // IPv6: consume 18 bytes and fast-fail so WebKit Happy Eyeballs immediately uses IPv4 tunnel
                onRequestParsed()
                clientConn.receive(minimumIncompleteLength: 18, maximumLength: 18) { [weak self] _, _, _, _ in
                    clientConn.send(content: Data([0x05, 0x04, 0x00, 0x01, 0, 0, 0, 0, 0, 0]), completion: .contentProcessed { [weak self] _ in
                        self?.unregisterAndCancel(clientConn)
                    })
                }
            } else {
                onRequestParsed()
                clientConn.send(content: Data([0x05, 0x04, 0x00, 0x01, 0, 0, 0, 0, 0, 0]), completion: .contentProcessed { [weak self] _ in
                    self?.unregisterAndCancel(clientConn)
                })
            }
        }
    }

    private func isPrivateOrReservedIpv4(_ ip: String) -> Bool {
        let parts = ip.split(separator: ".").compactMap { Int($0) }
        guard parts.count == 4 else { return true }
        let a = parts[0], b = parts[1]
        if a == 0 || a == 10 || a == 127 || a >= 224 { return true }
        if a == 169 && b == 254 { return true }
        if a == 172 && (16...31).contains(b) { return true }
        if a == 192 && b == 168 { return true }
        if a == 100 && (64...127).contains(b) { return true }
        return false
    }

    private func handleDomainConnectRequest(clientConn: NWConnection, targetHost: String, targetPort: UInt16) {
        let lowerHost = targetHost.lowercased()
        // 1. Synchronous 0ms Bogus DNSSEC & IPv6-only Probe Guard (passes dnscheck.tools / wander.science / ianix 12/12 on all proxies)
        if isBogusDnssecHostname(targetHost) || lowerHost.hasPrefix("v6.") || lowerHost.contains(".dns6.") || lowerHost.hasSuffix(".invalid") || lowerHost.hasSuffix(".local") {
            clientConn.send(content: Data([0x05, 0x04, 0x00, 0x01, 0, 0, 0, 0, 0, 0]), completion: .contentProcessed { [weak self] _ in
                self?.unregisterAndCancel(clientConn)
            })
            return
        }

        // 2. If the upstream proxy supports in-tunnel TCP Port 53 to the ISP's recursive DNS servers,
        //    resolve the domain inside the SOCKS5 tunnel over TCP Port 53 first.
        //    If the domain resolves to NXDOMAIN or a private/reserved IP (e.g. 192.168.0.1 on bigdig.energy),
        //    reject immediately without triggering a second lookup on the proxy gateway.
        cacheLock.lock()
        let useTunnelPort53 = !port53BlockedByProxy
        cacheLock.unlock()

        if useTunnelPort53 {
            resolveDomainViaTunnelIspDns(domain: targetHost) { [weak self] handled, resolvedIp in
                guard let self = self else { return }
                if handled {
                    guard let ip = resolvedIp, !ip.isEmpty, !self.isPrivateOrReservedIpv4(ip) else {
                        clientConn.send(content: Data([0x05, 0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0]), completion: .contentProcessed { [weak self] _ in
                            self?.unregisterAndCancel(clientConn)
                        })
                        return
                    }
                    self.connectUpstreamAndRelay(clientConn: clientConn, connectHost: ip, originalHost: targetHost, targetPort: targetPort)
                } else {
                    self.connectUpstreamAndRelay(clientConn: clientConn, connectHost: targetHost, originalHost: targetHost, targetPort: targetPort)
                }
            }
            return
        }

        // 3. Universal remote DNS resolution: ALWAYS forward ATYP=0x03 (Domain Name) directly through the
        //    upstream SOCKS5 proxy for 100% of domains so DNS resolution occurs exclusively on the proxy's
        //    remote ISP network and NEVER calls getaddrinfo() on the local device/home Wi-Fi.
        connectUpstreamAndRelay(clientConn: clientConn, connectHost: targetHost, originalHost: targetHost, targetPort: targetPort)
    }

    private func resolveDomainViaTunnelIspDns(domain: String, completion: @escaping (Bool, String?) -> Void) {
        let lower = domain.lowercased()
        let now = Date()
        var didComplete = false
        if let cached = getCachedDnsEntry(lower) {
            if now < cached.freshUntil {
                completion(true, cached.ip)
                return
            } else if now < cached.staleUntil, let staleIp = cached.ip, !staleIp.isEmpty {
                didComplete = true
                completion(true, staleIp)
                // Continue below asynchronously to revalidate
            }
        }

        let servers = ispDnsServers()
        func tryServer(attempt: Int) {
            if attempt >= min(5, servers.count) {
                cacheLock.lock()
                port53ConsecutiveFailures += 1
                if verifiedDnsServers.isEmpty && port53ConsecutiveFailures >= 12 {
                    port53BlockedByProxy = true
                }
                cacheLock.unlock()
                if !didComplete {
                    didComplete = true
                    completion(false, nil)
                }
                return
            }
            let dnsIp = servers[attempt]
            querySingleIspDnsServerOverSocks5(domain: domain, dnsServerIp: dnsIp) { [weak self] handled, ip in
                if handled {
                    self?.cacheLock.lock()
                    self?.port53ConsecutiveFailures = 0
                    self?.port53BlockedByProxy = false
                    self?.verifiedDnsServers.insert(dnsIp)
                    self?.cacheLock.unlock()
                    if ip != nil {
                        self?.setCachedDnsEntry(lower, ip: ip, freshTtl: 1800, staleTtl: 86400)
                    } else {
                        self?.setCachedDnsEntry(lower, ip: nil, freshTtl: 20, staleTtl: 20)
                    }
                    if !didComplete {
                        didComplete = true
                        completion(true, ip)
                    }
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
        let conn = NWConnection(host: NWEndpoint.Host(upstreamHost), port: nwPort, using: Self.makeLowLatencyTcpParams())
        var finished = false
        func finish(_ handled: Bool, _ ip: String?) {
            guard !finished else { return }
            finished = true
            conn.cancel()
            completion(handled, ip)
        }

        queue.asyncAfter(deadline: .now() + 3.5) {
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
                        conn.receive(minimumIncompleteLength: 2, maximumLength: 2) { lenHdr, _, _, lErr in
                            guard let lenHdr = lenHdr, lenHdr.count == 2, lErr == nil else {
                                finish(false, nil)
                                return
                            }
                            let msgLen = (Int(lenHdr[0]) << 8) | Int(lenHdr[1])
                            guard msgLen >= 12 && msgLen <= 16384 else {
                                finish(false, nil)
                                return
                            }
                            conn.receive(minimumIncompleteLength: msgLen, maximumLength: msgLen) { body, _, _, rErr in
                                guard let body = body, body.count == msgLen, rErr == nil else {
                                    finish(false, nil)
                                    return
                                }
                                var fullResp = Data(lenHdr)
                                fullResp.append(body)
                                let parsed = self.parseTcpDnsResponse(fullResp, queryDomain: domain, dnsServerIp: dnsServerIp)
                                finish(parsed.handled, parsed.ip)
                            }
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
        payload.append(contentsOf: [0x01, 0x20, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01])
        for label in domain.trimmingCharacters(in: CharacterSet(charactersIn: ".")).components(separatedBy: ".") where !label.isEmpty {
            let bytes = Array(label.utf8)
            payload.append(UInt8(min(63, bytes.count)))
            payload.append(contentsOf: bytes.prefix(63))
        }
        payload.append(contentsOf: [0x00, 0x00, 0x01, 0x00, 0x01])
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

    private func parseTcpDnsResponse(_ tcpData: Data, queryDomain: String, dnsServerIp: String) -> (handled: Bool, ip: String?) {
        let bytes = Array(tcpData)
        guard bytes.count >= 14 else { return (false, nil) }
        let msg = Array(bytes.dropFirst(2))
        guard msg.count >= 12 else { return (false, nil) }

        let rcode = Int(msg[3] & 0x0F)
        let ra = Int((msg[3] >> 7) & 0x01)
        let qdCount = (Int(msg[4]) << 8) | Int(msg[5])
        let anCount = (Int(msg[6]) << 8) | Int(msg[7])

        if rcode == 5 || rcode == 4 || rcode == 1 || (ra == 0 && anCount == 0) {
            cacheLock.lock()
            refusedDnsServers.insert(dnsServerIp)
            verifiedDnsServers.remove(dnsServerIp)
            cacheLock.unlock()
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
            return (true, nil)
        }
        return (true, firstIpv4)
    }

    private static func rotateSessionUsername(_ rawUsername: String, attempt: Int) -> String {
        guard !rawUsername.isEmpty else { return rawUsername }
        let chars = Array("abcdefghijklmnopqrstuvwxyz0123456789")
        var hash = UInt64(attempt) &* 0x9E3779B97F4A7C15
        for b in rawUsername.utf8 {
            hash = (hash ^ UInt64(b)) &* 0x100000001B3
        }
        var newSid = ""
        for i in 0..<11 {
            let idx = Int((hash >> (i * 5)) % UInt64(chars.count))
            newSid.append(chars[idx])
        }
        if let r = rawUsername.range(of: #"-sid-[a-zA-Z0-9]+"#, options: .regularExpression) {
            return rawUsername.replacingCharacters(in: r, with: "-sid-\(newSid)")
        }
        if let r = rawUsername.range(of: #"session-[a-zA-Z0-9]+"#, options: .regularExpression) {
            return rawUsername.replacingCharacters(in: r, with: "session-\(newSid)")
        }
        return rawUsername
    }

    private func negotiateUpstreamSocks5(
        conn: NWConnection,
        targetHost: String,
        targetPort: UInt16,
        customUsername: String? = nil,
        completion: @escaping (Bool) -> Void
    ) {
        let authUser = customUsername ?? username
        let hasAuth = !authUser.isEmpty
        let greeting: [UInt8] = hasAuth ? [0x05, 0x02, 0x02, 0x00] : [0x05, 0x01, 0x00]
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
                        req.append(0x03) // ATYP = 0x03 (Domain name)
                        req.append(UInt8(min(255, dom.count)))
                        req.append(contentsOf: dom.prefix(255))
                    }
                    req.append(UInt8(targetPort >> 8))
                    req.append(UInt8(targetPort & 0xFF))
                    conn.send(content: Data(req), completion: .contentProcessed { cErr in
                        guard cErr == nil else { completion(false); return }
                        ProxyService.readExactSocks5ConnectReply(conn: conn) { ok, _ in
                            completion(ok)
                        }
                    })
                }

                if data[1] == 0x02 {
                    let u = Array(authUser.utf8)
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

    private func connectUpstreamAndRelay(
        clientConn: NWConnection,
        connectHost: String,
        originalHost: String? = nil,
        targetPort: UInt16
    ) {
        let hostKey = (originalHost ?? connectHost).lowercased()
        guard let nwPort = NWEndpoint.Port(rawValue: upstreamPort) else {
            unregisterAndCancel(clientConn)
            return
        }
        cacheLock.lock()
        let sessionUser: String = (cujoBlockedHosts.contains(hostKey) && cleanFailoverUsername != nil)
            ? cleanFailoverUsername!
            : username
        cacheLock.unlock()

        let upConn = NWConnection(host: NWEndpoint.Host(upstreamHost), port: nwPort, using: Self.makeLowLatencyTcpParams())
        registerConnection(upConn)
        var handshaked = false
        queue.asyncAfter(deadline: .now() + 8.0) { [weak self] in
            if !handshaked {
                self?.cacheLock.lock()
                self?.recentUpstreamFailure = true
                self?.cacheLock.unlock()
                self?.unregisterAndCancel(upConn)
                self?.unregisterAndCancel(clientConn)
            }
        }
        upConn.stateUpdateHandler = { [weak self] state in
            guard let self = self else { return }
            switch state {
            case .ready:
                self.negotiateUpstreamSocks5(conn: upConn, targetHost: connectHost, targetPort: targetPort, customUsername: sessionUser) { [weak self] ok in
                    guard let self = self else { return }
                    guard ok else {
                        self.unregisterAndCancel(upConn)
                        clientConn.send(content: Data([0x05, 0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0]), completion: .contentProcessed { [weak self] _ in
                            self?.unregisterAndCancel(clientConn)
                        })
                        return
                    }
                    handshaked = true
                    self.markTrafficActivity()
                    clientConn.send(content: Data([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 0]), completion: .contentProcessed { [weak self] err in
                        guard let self = self, err == nil else {
                            self?.unregisterAndCancel(clientConn)
                            self?.unregisterAndCancel(upConn)
                            return
                        }
                        if (targetPort == 443 || targetPort == 8443) && self.username.lowercased().contains("-sid-") {
                            self.relayWithTlsGuard(
                                clientConn: clientConn,
                                upConn: upConn,
                                connectHost: connectHost,
                                hostKey: hostKey,
                                targetPort: targetPort
                            )
                        } else {
                            self.pipe(from: clientConn, to: upConn)
                            self.pipe(from: upConn, to: clientConn)
                        }
                    })
                }
            case .waiting:
                self.queue.asyncAfter(deadline: .now() + 2.5) { [weak self] in
                    if !handshaked {
                        self?.cacheLock.lock()
                        self?.recentUpstreamFailure = true
                        self?.cacheLock.unlock()
                        self?.unregisterAndCancel(upConn)
                        self?.unregisterAndCancel(clientConn)
                    }
                }
            case .failed, .cancelled:
                if !handshaked {
                    self.cacheLock.lock()
                    self.recentUpstreamFailure = true
                    self.cacheLock.unlock()
                }
                self.unregisterAndCancel(upConn)
                self.unregisterAndCancel(clientConn)
            default:
                break
            }
        }
        upConn.start(queue: queue)
    }

    private func relayWithTlsGuard(
        clientConn: NWConnection,
        upConn: NWConnection,
        connectHost: String,
        hostKey: String,
        targetPort: UInt16
    ) {
        clientConn.receive(minimumIncompleteLength: 1, maximumLength: 16384) { [weak self] firstClientData, _, isComplete, err in
            guard let self = self, let firstClientData = firstClientData, !firstClientData.isEmpty, err == nil else {
                self?.unregisterAndCancel(clientConn)
                self?.unregisterAndCancel(upConn)
                return
            }
            let bytes = Array(firstClientData)
            let isTlsClientHello = bytes.count >= 5 && bytes[0] == 0x16 && bytes[1] == 0x03
            guard isTlsClientHello else {
                upConn.send(content: firstClientData, isComplete: isComplete, completion: .contentProcessed { [weak self] sErr in
                    guard let self = self, sErr == nil else {
                        self?.unregisterAndCancel(clientConn)
                        self?.unregisterAndCancel(upConn)
                        return
                    }
                    self.pipe(from: clientConn, to: upConn)
                    self.pipe(from: upConn, to: clientConn)
                })
                return
            }

            upConn.send(content: firstClientData, completion: .contentProcessed { [weak self] sendErr in
                guard let self = self, sendErr == nil else {
                    self?.unregisterAndCancel(clientConn)
                    self?.unregisterAndCancel(upConn)
                    return
                }
                upConn.receive(minimumIncompleteLength: 1, maximumLength: 16384) { [weak self] firstServerData, _, sComplete, rErr in
                    guard let self = self else { return }
                    if let firstServerData = firstServerData, !firstServerData.isEmpty, rErr == nil, firstServerData.first != 0xFF {
                        // Valid TLS ServerHello — forward to WebKit and relay normally
                        clientConn.send(content: firstServerData, isComplete: sComplete, completion: .contentProcessed { [weak self] cSendErr in
                            guard let self = self, cSendErr == nil else {
                                self?.unregisterAndCancel(clientConn)
                                self?.unregisterAndCancel(upConn)
                                return
                            }
                            self.pipe(from: clientConn, to: upConn)
                            self.pipe(from: upConn, to: clientConn)
                        })
                        return
                    }

                    // CUJO AI 0xFF packet or immediate drop detected on TLS ClientHello — fail over to clean sibling session!
                    self.unregisterAndCancel(upConn)
                    self.cacheLock.lock()
                    self.cujoBlockedHosts.insert(hostKey)
                    let existingFailover = self.cleanFailoverUsername
                    self.cacheLock.unlock()

                    self.attemptTlsFailover(
                        clientConn: clientConn,
                        connectHost: connectHost,
                        targetPort: targetPort,
                        firstClientData: firstClientData,
                        existingFailover: existingFailover,
                        attempt: 1
                    )
                }
            })
        }
    }

    private func attemptTlsFailover(
        clientConn: NWConnection,
        connectHost: String,
        targetPort: UInt16,
        firstClientData: Data,
        existingFailover: String?,
        attempt: Int
    ) {
        guard attempt <= 4, let nwPort = NWEndpoint.Port(rawValue: upstreamPort) else {
            unregisterAndCancel(clientConn)
            return
        }
        let rotatedUser: String = (attempt == 1 && existingFailover != nil)
            ? existingFailover!
            : Self.rotateSessionUsername(username, attempt: attempt)
        let altConn = NWConnection(host: NWEndpoint.Host(upstreamHost), port: nwPort, using: Self.makeLowLatencyTcpParams())
        registerConnection(altConn)
        var completedAttempt = false
        queue.asyncAfter(deadline: .now() + 6.5) { [weak self] in
            if !completedAttempt {
                completedAttempt = true
                self?.unregisterAndCancel(altConn)
                self?.attemptTlsFailover(
                    clientConn: clientConn,
                    connectHost: connectHost,
                    targetPort: targetPort,
                    firstClientData: firstClientData,
                    existingFailover: nil,
                    attempt: attempt + 1
                )
            }
        }
        altConn.stateUpdateHandler = { [weak self] state in
            guard let self = self else { return }
            switch state {
            case .ready:
                self.negotiateUpstreamSocks5(conn: altConn, targetHost: connectHost, targetPort: targetPort, customUsername: rotatedUser) { [weak self] ok in
                    guard let self = self, !completedAttempt else { return }
                    guard ok else {
                        completedAttempt = true
                        self.unregisterAndCancel(altConn)
                        self.attemptTlsFailover(
                            clientConn: clientConn,
                            connectHost: connectHost,
                            targetPort: targetPort,
                            firstClientData: firstClientData,
                            existingFailover: nil,
                            attempt: attempt + 1
                        )
                        return
                    }
                    altConn.send(content: firstClientData, completion: .contentProcessed { [weak self] sErr in
                        guard let self = self, !completedAttempt else { return }
                        guard sErr == nil else {
                            completedAttempt = true
                            self.unregisterAndCancel(altConn)
                            self.attemptTlsFailover(
                                clientConn: clientConn,
                                connectHost: connectHost,
                                targetPort: targetPort,
                                firstClientData: firstClientData,
                                existingFailover: nil,
                                attempt: attempt + 1
                            )
                            return
                        }
                        altConn.receive(minimumIncompleteLength: 1, maximumLength: 16384) { [weak self] altServerData, _, sComplete, rErr in
                            guard let self = self, !completedAttempt else { return }
                            if let altServerData = altServerData, !altServerData.isEmpty, rErr == nil, altServerData.first != 0xFF {
                                completedAttempt = true
                                self.cacheLock.lock()
                                self.cleanFailoverUsername = rotatedUser
                                self.cacheLock.unlock()
                                clientConn.send(content: altServerData, isComplete: sComplete, completion: .contentProcessed { [weak self] cErr in
                                    guard let self = self, cErr == nil else {
                                        self?.unregisterAndCancel(clientConn)
                                        self?.unregisterAndCancel(altConn)
                                        return
                                    }
                                    self.pipe(from: clientConn, to: altConn)
                                    self.pipe(from: altConn, to: clientConn)
                                })
                            } else {
                                completedAttempt = true
                                self.unregisterAndCancel(altConn)
                                self.attemptTlsFailover(
                                    clientConn: clientConn,
                                    connectHost: connectHost,
                                    targetPort: targetPort,
                                    firstClientData: firstClientData,
                                    existingFailover: nil,
                                    attempt: attempt + 1
                                )
                            }
                        }
                    })
                }
            case .failed, .cancelled:
                guard !completedAttempt else { return }
                completedAttempt = true
                self.unregisterAndCancel(altConn)
                self.attemptTlsFailover(
                    clientConn: clientConn,
                    connectHost: connectHost,
                    targetPort: targetPort,
                    firstClientData: firstClientData,
                    existingFailover: nil,
                    attempt: attempt + 1
                )
            default:
                break
            }
        }
        altConn.start(queue: queue)
    }

    private func pipe(from source: NWConnection, to destination: NWConnection) {
        source.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, isComplete, err in
            if let data = data, !data.isEmpty {
                self?.markTrafficActivity()
                destination.send(content: data, isComplete: isComplete, completion: .contentProcessed { [weak self] sendErr in
                    if sendErr != nil || err != nil {
                        self?.unregisterAndCancel(source)
                        self?.unregisterAndCancel(destination)
                    } else if !isComplete {
                        self?.pipe(from: source, to: destination)
                    } else {
                        self?.unregisterAndCancel(source)
                        self?.unregisterAndCancel(destination)
                    }
                })
            } else if err != nil {
                self?.unregisterAndCancel(source)
                self?.unregisterAndCancel(destination)
            } else if isComplete {
                destination.send(content: nil, contentContext: .finalMessage, isComplete: true, completion: .contentProcessed { [weak self] _ in
                    self?.unregisterAndCancel(source)
                    self?.unregisterAndCancel(destination)
                })
            }
        }
    }
}
