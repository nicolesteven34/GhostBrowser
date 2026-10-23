import Foundation
import SwiftUI
import WebKit
import CryptoKit
import UIKit

public enum SearchEngine: String, CaseIterable, Identifiable, Codable {
    case localStartPage = "Local Offline Start Page (Zero Network)"
    case searxng = "SearXNG (Decentralized Privacy Search)"
    case startpage = "Startpage (Google results without tracking)"
    case brave = "Brave Search (Independent Index)"
    case duckduckgo = "DuckDuckGo"
    case google = "Google"
    case directOnly = "Direct URL Only (Blank Home)"

    public var id: String { rawValue }

    public func searchURL(for query: String) -> URL? {
        guard let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else { return nil }
        switch self {
        case .localStartPage, .directOnly:
            return nil
        case .searxng:
            return URL(string: "https://searx.be/search?q=\(encoded)")
        case .startpage:
            return URL(string: "https://www.startpage.com/sp/search?query=\(encoded)")
        case .brave:
            return URL(string: "https://search.brave.com/search?q=\(encoded)")
        case .duckduckgo:
            return URL(string: "https://duckduckgo.com/?q=\(encoded)")
        case .google:
            return URL(string: "https://www.google.com/search?q=\(encoded)")
        }
    }
}

public enum AppleDeviceProfile: String, CaseIterable, Identifiable, Codable {
    case nativeHost = "Native Host Device (100% Physical Match)"
    case iPhone18ProMax_A20 = "iPhone 18 Pro Max (A20 Pro, iOS 27)"
    case iPhone17ProMax_A19 = "iPhone 17 Pro Max (A19 Pro, iOS 26)"
    case iPhone16ProMax_A18 = "iPhone 16 Pro Max (A18 Pro, iOS 18.1)"
    case iPhone16_A18 = "iPhone 16 (A18, iOS 18.0)"
    case iPhone15ProMax_A17 = "iPhone 15 Pro Max (A17 Pro, iOS 17.6)"
    case iPhone14_A15 = "iPhone 14 (A15, iOS 17.5)"
    case iPadProM4_13 = "iPad Pro 13\" (M4, iPadOS 18.1)"
    case iPadAirM2_11 = "iPad Air 11\" (M2, iPadOS 18.1)"
    case iPadMini6_A15 = "iPad Mini 6 (A15, iPadOS 18.0)"
    case macBookProM4Max_16 = "MacBook Pro 16\" (M4 Max, macOS 15.1)"
    case macBookAirM3_13 = "MacBook Air 13\" (M3, macOS 15.0)"
    case custom = "Custom User-Agent"

    public var id: String { rawValue }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        if let exact = AppleDeviceProfile(rawValue: raw) {
            self = exact
            return
        }
        if raw.contains("iPhone 18") { self = .iPhone18ProMax_A20 }
        else if raw.contains("iPhone 17") { self = .iPhone17ProMax_A19 }
        else if raw.contains("iPhone 16 Pro Max") { self = .iPhone16ProMax_A18 }
        else if raw.contains("iPhone 16") { self = .iPhone16_A18 }
        else if raw.contains("iPhone 15 Pro Max") { self = .iPhone15ProMax_A17 }
        else if raw.contains("iPhone 14") { self = .iPhone14_A15 }
        else if raw.contains("iPad Pro 13") { self = .iPadProM4_13 }
        else if raw.contains("iPad Air 11") { self = .iPadAirM2_11 }
        else if raw.contains("iPad Mini 6") { self = .iPadMini6_A15 }
        else if raw.contains("MacBook Pro") { self = .macBookProM4Max_16 }
        else if raw.contains("MacBook Air") { self = .macBookAirM3_13 }
        else if raw.contains("Native Host") { self = .nativeHost }
        else { self = .iPadProM4_13 }
    }

    public func userAgent(buildIndex: Int = 0) -> String {
        switch self {
        case .nativeHost, .custom:
            return ""
        case .iPhone18ProMax_A20:
            let builds = [
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0.1 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.1 Mobile/15E148 Safari/604.1"
            ]
            return builds[abs(buildIndex) % builds.count]
        case .iPhone17ProMax_A19:
            let builds = [
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0.1 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1"
            ]
            return builds[abs(buildIndex) % builds.count]
        case .iPhone16ProMax_A18:
            let builds = [
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Mobile/15E148 Safari/604.1"
            ]
            return builds[abs(buildIndex) % builds.count]
        case .iPhone16_A18:
            let builds = [
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Mobile/15E148 Safari/604.1"
            ]
            return builds[abs(buildIndex) % builds.count]
        case .iPhone15ProMax_A17:
            let builds = [
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"
            ]
            return builds[abs(buildIndex) % builds.count]
        case .iPhone14_A15:
            let builds = [
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
            ]
            return builds[abs(buildIndex) % builds.count]
        case .iPadProM4_13:
            let builds = [
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15"
            ]
            return builds[abs(buildIndex) % builds.count]
        case .iPadAirM2_11:
            let builds = [
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6.1 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
            ]
            return builds[abs(buildIndex) % builds.count]
        case .iPadMini6_A15:
            let builds = [
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5.1 Safari/605.1.15"
            ]
            return builds[abs(buildIndex) % builds.count]
        case .macBookProM4Max_16:
            let builds = [
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15"
            ]
            return builds[abs(buildIndex) % builds.count]
        case .macBookAirM3_13:
            let builds = [
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
            ]
            return builds[abs(buildIndex) % builds.count]
        }
    }

    public var userAgent: String {
        userAgent(buildIndex: 0)
    }

    public var preferredContentMode: WKWebpagePreferences.ContentMode {
        switch self {
        case .iPadProM4_13, .iPadAirM2_11, .iPadMini6_A15, .macBookProM4Max_16, .macBookAirM3_13, .custom:
            return .desktop
        case .iPhone18ProMax_A20, .iPhone17ProMax_A19, .iPhone16ProMax_A18, .iPhone16_A18, .iPhone15ProMax_A17, .iPhone14_A15:
            return .mobile
        case .nativeHost:
            return UIDevice.current.userInterfaceIdiom == .pad ? .desktop : .mobile
        }
    }

    public var platform: String {
        switch self {
        case .iPadProM4_13, .iPadAirM2_11, .iPadMini6_A15, .macBookProM4Max_16, .macBookAirM3_13, .custom:
            return "MacIntel"
        case .iPhone18ProMax_A20, .iPhone17ProMax_A19, .iPhone16ProMax_A18, .iPhone16_A18, .iPhone15ProMax_A17, .iPhone14_A15:
            return "iPhone"
        case .nativeHost:
            return UIDevice.current.userInterfaceIdiom == .pad ? "MacIntel" : "iPhone"
        }
    }

    public var maxTouchPoints: Int {
        switch self {
        case .iPadProM4_13, .iPadAirM2_11, .iPadMini6_A15, .iPhone18ProMax_A20, .iPhone17ProMax_A19, .iPhone16ProMax_A18, .iPhone16_A18, .iPhone15ProMax_A17, .iPhone14_A15, .custom, .nativeHost:
            return 5
        case .macBookProM4Max_16, .macBookAirM3_13:
            return 0
        }
    }

    public var cpuCores: Int {
        switch self {
        case .iPadProM4_13: return 10
        case .iPadAirM2_11: return 8
        case .iPadMini6_A15: return 6
        case .iPhone18ProMax_A20, .iPhone17ProMax_A19, .iPhone16ProMax_A18, .iPhone16_A18, .iPhone15ProMax_A17, .iPhone14_A15: return 6
        case .macBookProM4Max_16: return 16
        case .macBookAirM3_13: return 8
        case .custom: return 8
        case .nativeHost: return max(2, ProcessInfo.processInfo.activeProcessorCount)
        }
    }

    public var ramGB: Int {
        switch self {
        case .iPadProM4_13: return 16
        case .iPadAirM2_11: return 8
        case .iPadMini6_A15: return 4
        case .iPhone18ProMax_A20, .iPhone17ProMax_A19: return 12
        case .iPhone16ProMax_A18, .iPhone16_A18, .iPhone15ProMax_A17: return 8
        case .iPhone14_A15: return 6
        case .macBookProM4Max_16: return 36
        case .macBookAirM3_13: return 16
        case .custom: return 8
        case .nativeHost: return max(4, Int(ProcessInfo.processInfo.physicalMemory / (1024 * 1024 * 1024)))
        }
    }

    public var webglRenderer: String {
        return "Apple GPU"
    }

    public func webglRendererVariant(seed: Int) -> String {
        return "Apple GPU"
    }

    public var screenWidth: Int {
        switch self {
        case .iPadProM4_13: return 1024
        case .iPadAirM2_11: return 820
        case .iPadMini6_A15: return 744
        case .iPhone18ProMax_A20, .iPhone17ProMax_A19, .iPhone16ProMax_A18: return 440
        case .iPhone16_A18: return 393
        case .iPhone15ProMax_A17: return 430
        case .iPhone14_A15: return 390
        case .macBookProM4Max_16: return 1728
        case .macBookAirM3_13: return 1470
        case .custom: return 1024
        case .nativeHost: return Int(UIScreen.main.bounds.width)
        }
    }

    public var screenHeight: Int {
        switch self {
        case .iPadProM4_13: return 1366
        case .iPadAirM2_11: return 1180
        case .iPadMini6_A15: return 1133
        case .iPhone18ProMax_A20, .iPhone17ProMax_A19, .iPhone16ProMax_A18: return 956
        case .iPhone16_A18: return 852
        case .iPhone15ProMax_A17: return 932
        case .iPhone14_A15: return 844
        case .macBookProM4Max_16: return 1117
        case .macBookAirM3_13: return 956
        case .custom: return 1366
        case .nativeHost: return Int(UIScreen.main.bounds.height)
        }
    }

    public var devicePixelRatio: Double {
        switch self {
        case .iPhone18ProMax_A20, .iPhone17ProMax_A19, .iPhone16ProMax_A18, .iPhone16_A18, .iPhone15ProMax_A17, .iPhone14_A15:
            return 3.0
        case .iPadProM4_13, .iPadAirM2_11, .iPadMini6_A15, .macBookProM4Max_16, .macBookAirM3_13, .custom:
            return 2.0
        case .nativeHost:
            return Double(UIScreen.main.scale)
        }
    }
}

public class PrivacyProfile: ObservableObject {
    @Published public var selectedDevice: AppleDeviceProfile = .iPadProM4_13
    @Published public var customUserAgent: String = ""
    @Published public var searchEngine: SearchEngine = .localStartPage

    // Core Anti-Detection Stealth Setting
    @Published public var stealthAntiDetectionMode: Bool = true

    // Persona Isolation & Consistency
    @Published public var autoPurgeOnProfileSwitch: Bool = true
    @Published public var deterministicHardwareSeeding: Bool = true
    @Published public var sessionSeed: Int = Int.random(in: 100000...999999)
    @Published public var buildIndex: Int = Int.random(in: 0...4)
    @Published public var sessionDataStoreID: UUID = UUID()

    // Defense Switches
    @Published public var blockCommercialTrackers: Bool = true
    @Published public var ephemeralRAMMode: Bool = false
    @Published public var blockCanvasFingerprint: Bool = false
    @Published public var blockAudioFingerprint: Bool = false
    @Published public var maskWebGLRenderer: Bool = false
    @Published public var blockWebRTCIPLeak: Bool = false
    @Published public var stripReferrers: Bool = false
    @Published public var shieldSensors: Bool = false

    // Mock Location (GPS)
    @Published public var mockLocationEnabled: Bool = false
    @Published public var mockLatitude: Double = 37.7749
    @Published public var mockLongitude: Double = -122.4194
    @Published public var mockLocationName: String = "San Francisco, CA"

    // Virtual Camera Stream
    @Published public var virtualCameraEnabled: Bool = false
    @Published public var virtualCameraImageBase64: String = ""
    @Published public var virtualCameraPanX: Double = 0.0
    @Published public var virtualCameraPanY: Double = 0.0
    @Published public var virtualCameraZoom: Double = 1.0

    // SOCKS5 / HTTP Network Proxy Configuration
    @Published public var proxyEnabled: Bool = false
    @Published public var proxyType: String = "SOCKS5"
    @Published public var proxyHost: String = ""
    @Published public var proxyPort: Int = 1080
    @Published public var proxyUsername: String = ""
    @Published public var proxyPassword: String = ""
    @Published public var proxyDetectedIP: String = ""
    @Published public var proxyDetectedCity: String = ""
    @Published public var proxyDetectedRegion: String = ""
    @Published public var proxyDetectedCountry: String = ""
    @Published public var proxyDetectedISP: String = ""
    @Published public var proxyDetectedASN: String = ""
    @Published public var proxyDetectedTimezone: String = ""
    @Published public var proxyUsageType: String = "Residential"
    @Published public var proxyConnectionType: String = "Cable/Fiber"
    @Published public var enableDnsProxyMatching: Bool = true
    @Published public var enableIpChangeKillSwitch: Bool = true

    public var compactProxyBadge: String {
        guard proxyEnabled else { return "Direct Egress" }
        let proto = proxyType.uppercased() == "HTTP" ? "HTTP" : "Socks5"
        let usage = proxyUsageType.isEmpty ? "Residential" : proxyUsageType
        let conn = proxyConnectionType.isEmpty ? "Cable/Fiber" : proxyConnectionType
        let locState = !proxyDetectedRegion.isEmpty ? proxyDetectedRegion : proxyDetectedCountry
        let loc = !proxyDetectedCity.isEmpty
            ? "\(proxyDetectedCity)\(!locState.isEmpty ? ", \(locState)" : "")"
            : locState
        if !proxyDetectedIP.isEmpty {
            let ispPart = !proxyDetectedISP.isEmpty ? " • \(proxyDetectedISP)" : ""
            return loc.isEmpty
                ? "\(proxyDetectedIP)\(ispPart) • \(usage) (\(conn))"
                : "\(proxyDetectedIP)\(ispPart) • \(usage) (\(conn)) • \(loc)"
        }
        return loc.isEmpty ? "\(proto): \(usage) (\(conn))" : "\(proto): \(usage) (\(conn)) • \(loc)"
    }

    public var sessionMonitorIndicatorText: String {
        guard proxyEnabled else { return "Direct Egress (Host Network)" }
        let proto = proxyType.uppercased().contains("HTTP") ? "HTTP" : "SOCKS5"
        let usage = proxyUsageType.isEmpty ? "Residential" : proxyUsageType
        let conn = proxyConnectionType.isEmpty ? "Cable/Fiber" : proxyConnectionType
        let locState = !proxyDetectedRegion.isEmpty ? proxyDetectedRegion : proxyDetectedCountry
        let loc = !proxyDetectedCity.isEmpty
            ? "\(proxyDetectedCity)\(!locState.isEmpty ? ", \(locState)" : "")"
            : locState
        if !proxyDetectedIP.isEmpty {
            let ispPart = !proxyDetectedISP.isEmpty ? " • \(proxyDetectedISP)" : ""
            return loc.isEmpty
                ? "\(proxyDetectedIP)\(ispPart) • \(usage) (\(conn))"
                : "\(proxyDetectedIP)\(ispPart) • \(usage) (\(conn)) • \(loc)"
        }
        if !proxyHost.isEmpty {
            return "\(proto) \(proxyHost):\(proxyPort) • \(usage) (\(conn))"
        }
        return "\(proto) Proxy Active"
    }

    public init() {
        let active = ProfileManager.shared.activeProfile
        self.selectedDevice = active.deviceProfile
        self.customUserAgent = active.customUserAgent
        self.searchEngine = active.searchEngine
        self.sessionSeed = active.sessionSeed
        self.buildIndex = active.buildIndex
        self.sessionDataStoreID = active.id
        self.mockLocationEnabled = active.mockLocationEnabled
        self.mockLatitude = active.mockLatitude
        self.mockLongitude = active.mockLongitude
        self.mockLocationName = active.mockLocationName
        self.virtualCameraEnabled = active.virtualCameraEnabled
        self.virtualCameraImageBase64 = active.virtualCameraImageBase64
        self.virtualCameraPanX = active.virtualCameraPanX
        self.virtualCameraPanY = active.virtualCameraPanY
        self.virtualCameraZoom = active.virtualCameraZoom
        self.proxyEnabled = active.proxyEnabled
        self.proxyType = active.proxyType
        self.proxyHost = active.proxyHost
        self.proxyPort = active.proxyPort
        self.proxyUsername = active.proxyUsername
        self.proxyPassword = active.proxyPassword
        self.proxyDetectedIP = active.proxyDetectedIP
        self.proxyDetectedCity = active.proxyDetectedCity
        self.proxyDetectedRegion = active.proxyDetectedRegion
        self.proxyDetectedCountry = active.proxyDetectedCountry
        self.proxyDetectedISP = active.proxyDetectedISP
        self.proxyDetectedASN = active.proxyDetectedASN
        self.proxyDetectedTimezone = active.proxyDetectedTimezone
        self.proxyUsageType = active.proxyUsageType
        self.proxyConnectionType = active.proxyConnectionType
        self.enableDnsProxyMatching = active.enableDnsProxyMatching
        self.enableIpChangeKillSwitch = active.enableIpChangeKillSwitch
    }

    public func rotateIdentitySeed() {
        let oldStore = sessionDataStoreID
        sessionSeed = Int.random(in: 100000...999999)
        buildIndex = (buildIndex + 1) % 5
        sessionDataStoreID = UUID()
        if #available(iOS 17.0, *) {
            WKWebsiteDataStore.remove(forIdentifier: oldStore) { _ in }
        }
        URLCache.shared.removeAllCachedResponses()
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies {
                HTTPCookieStorage.shared.deleteCookie(cookie)
            }
        }
    }

    @discardableResult
    public func regenerateRealisticIdentity() -> AppleDeviceProfile {
        let oldStore = sessionDataStoreID
        let realisticPool: [AppleDeviceProfile] = [
            .iPhone18ProMax_A20,
            .iPhone17ProMax_A19,
            .iPhone16ProMax_A18,
            .iPhone16_A18,
            .iPadProM4_13,
            .iPadAirM2_11,
            .macBookProM4Max_16,
            .macBookAirM3_13,
            .iPhone15ProMax_A17,
            .iPadMini6_A15
        ]
        let candidates = realisticPool.filter { $0 != selectedDevice }
        let chosen = candidates.randomElement() ?? .iPhone18ProMax_A20
        self.selectedDevice = chosen
        self.sessionSeed = Int.random(in: 100000...999999)
        self.buildIndex = Int.random(in: 0...4)
        self.sessionDataStoreID = UUID()
        if #available(iOS 17.0, *) {
            WKWebsiteDataStore.remove(forIdentifier: oldStore) { _ in }
        }
        URLCache.shared.removeAllCachedResponses()
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies {
                HTTPCookieStorage.shared.deleteCookie(cookie)
            }
        }
        return chosen
    }

    public var effectiveUserAgent: String {
        if selectedDevice == .nativeHost {
            return ""
        }
        if selectedDevice == .custom && !customUserAgent.isEmpty {
            return customUserAgent
        }
        return selectedDevice.userAgent(buildIndex: buildIndex)
    }

    public var effectivePlatform: String { selectedDevice.platform }
    public var effectiveTouchPoints: Int { selectedDevice.maxTouchPoints }
    public var effectiveCores: Int { selectedDevice.cpuCores }
    public var effectiveRAM: Int { selectedDevice.ramGB }
    public var effectiveRenderer: String { selectedDevice.webglRendererVariant(seed: sessionSeed) }
    public var effectiveScreenWidth: Int { selectedDevice.screenWidth }
    public var effectiveScreenHeight: Int { selectedDevice.screenHeight }
    public var effectiveDevicePixelRatio: Double { selectedDevice.devicePixelRatio }

    public var visitorID: String {
        let entropy = "UA=\(effectiveUserAgent)|PLAT=\(effectivePlatform)|SCR=\(effectiveScreenWidth)x\(effectiveScreenHeight)@\(effectiveDevicePixelRatio)|TOUCH=\(effectiveTouchPoints)|CORES=\(effectiveCores)|RAM=\(effectiveRAM)|GPU=\(effectiveRenderer)|SEED=\(sessionSeed)"
        let hash = SHA256.hash(data: Data(entropy.utf8))
        let alphabet = Array("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
        let hashBytes = Array(hash)
        var result = ""
        for i in 0..<20 {
            let byteVal = Int(hashBytes[i % hashBytes.count]) ^ Int(hashBytes[(i * 7 + 3) % hashBytes.count])
            result.append(alphabet[byteVal % alphabet.count])
        }
        return result
    }

    public var formattedVisitorID: String {
        let vid = visitorID
        guard vid.count == 20 else { return vid }
        var parts: [String] = []
        for i in stride(from: 0, to: 20, by: 4) {
            let start = vid.index(vid.startIndex, offsetBy: i)
            let end = vid.index(start, offsetBy: 4)
            parts.append(String(vid[start..<end]))
        }
        return parts.joined(separator: "-")
    }

    public var effectiveProxyTimezone: String {
        guard proxyEnabled else { return "" }
        let trimmed = proxyDetectedTimezone.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty && trimmed.contains("/") {
            return trimmed
        }
        return ProxyService.inferTimezone(
            country: proxyDetectedCountry,
            region: proxyDetectedRegion,
            city: proxyDetectedCity,
            username: proxyUsername
        )
    }

    public func generateJSConfig() -> String {
        let escapedVirtualImg = virtualCameraImageBase64
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "")

        let escapedProxyIp = proxyEnabled ? proxyDetectedIP.replacingOccurrences(of: "\"", with: "") : ""
        let escapedProxyCity = proxyEnabled ? proxyDetectedCity.replacingOccurrences(of: "\"", with: "") : ""
        let escapedProxyRegion = proxyEnabled ? proxyDetectedRegion.replacingOccurrences(of: "\"", with: "") : ""
        let escapedProxyCountry = proxyEnabled ? proxyDetectedCountry.replacingOccurrences(of: "\"", with: "") : ""
        let escapedProxyIsp = proxyEnabled ? proxyDetectedISP.replacingOccurrences(of: "\"", with: "") : ""
        let escapedProxyAsn = proxyEnabled ? proxyDetectedASN.replacingOccurrences(of: "\"", with: "") : ""
        let escapedTimezone = proxyEnabled ? effectiveProxyTimezone.replacingOccurrences(of: "\"", with: "") : ""
        let escapedUsageType = proxyUsageType.replacingOccurrences(of: "\"", with: "")
        let escapedConnType = proxyConnectionType.replacingOccurrences(of: "\"", with: "")

        return """
        window.__GHOST_VISITOR_ID__ = "\(visitorID)";
        window.__GHOST_CONFIG__ = {
            visitorId: "\(visitorID)",
            stealthMode: \(stealthAntiDetectionMode),
            deterministicHardwareSeeding: \(deterministicHardwareSeeding),
            sessionSeed: \(sessionSeed),
            blockCanvas: \(stealthAntiDetectionMode ? false : blockCanvasFingerprint),
            blockAudio: \(stealthAntiDetectionMode ? false : blockAudioFingerprint),
            maskWebGL: \(stealthAntiDetectionMode ? false : maskWebGLRenderer),
            blockWebRTC: \(stealthAntiDetectionMode ? false : blockWebRTCIPLeak),
            stripReferrer: \(stealthAntiDetectionMode ? false : stripReferrers),
            shieldSensors: \(stealthAntiDetectionMode ? false : shieldSensors),
            platform: "\(effectivePlatform)",
            maxTouchPoints: \(effectiveTouchPoints),
            hardwareConcurrency: \(effectiveCores),
            deviceMemory: \(min(8, effectiveRAM)),
            colorDepth: 30,
            webglVendor: "Apple Inc.",
            webglRenderer: "\(effectiveRenderer)",
            screenWidth: \(effectiveScreenWidth),
            screenHeight: \(effectiveScreenHeight),
            devicePixelRatio: \(effectiveDevicePixelRatio),
            mockLocationEnabled: \(mockLocationEnabled || (proxyEnabled && !escapedProxyIp.isEmpty)),
            mockLatitude: \(mockLatitude),
            mockLongitude: \(mockLongitude),
            virtualCameraEnabled: \(virtualCameraEnabled),
            virtualCameraImage: "\(escapedVirtualImg)",
            virtualCameraPanX: \(virtualCameraPanX),
            virtualCameraPanY: \(virtualCameraPanY),
            virtualCameraZoom: \(virtualCameraZoom),
            proxyEnabled: \(proxyEnabled),
            proxyType: "\(proxyType)",
            proxyIp: "\(escapedProxyIp)",
            proxyCity: "\(escapedProxyCity)",
            proxyRegion: "\(escapedProxyRegion)",
            proxyCountry: "\(escapedProxyCountry)",
            proxyIsp: "\(escapedProxyIsp)",
            proxyAsn: "\(escapedProxyAsn)",
            proxyUsageType: "\(escapedUsageType)",
            proxyConnectionType: "\(escapedConnType)",
            enableDnsProxyMatching: \(enableDnsProxyMatching),
            enableIpKillSwitch: \(enableIpChangeKillSwitch),
            timezone: "\(escapedTimezone)"
        };
        """
    }
}
