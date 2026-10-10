import Foundation
import SwiftUI
import WebKit

public enum SearchEngine: String, CaseIterable, Identifiable {
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

public enum AppleDeviceProfile: String, CaseIterable, Identifiable {
    case iPadProM4_13 = "iPad Pro 13\" (M4, iPadOS 17.5)"
    case iPadAirM2_11 = "iPad Air 11\" (M2, iPadOS 17.4)"
    case iPadMini6_A15 = "iPad Mini 6 (A15, iPadOS 17.2)"
    case iPhone15ProMax_A17 = "iPhone 15 Pro Max (A17 Pro, iOS 17.5)"
    case iPhone14_A15 = "iPhone 14 (A15, iOS 16.6)"
    case macBookProM3Max_16 = "MacBook Pro 16\" (M3 Max, macOS 14.5)"
    case macBookAirM2_13 = "MacBook Air 13\" (M2, macOS 13.6)"
    case custom = "Custom User-Agent"

    public var id: String { rawValue }

    public var userAgent: String {
        switch self {
        case .iPadProM4_13:
            return "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
        case .iPadAirM2_11:
            return "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
        case .iPadMini6_A15:
            return "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1"
        case .iPhone15ProMax_A17:
            return "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
        case .iPhone14_A15:
            return "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
        case .macBookProM3Max_16:
            return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
        case .macBookAirM2_13:
            return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15"
        case .custom:
            return ""
        }
    }

    public var preferredContentMode: WKWebpagePreferences.ContentMode {
        switch self {
        case .iPadProM4_13, .macBookProM3Max_16, .macBookAirM2_13:
            return .desktop
        case .iPhone15ProMax_A17, .iPhone14_A15, .iPadMini6_A15:
            return .mobile
        case .iPadAirM2_11, .custom:
            return .recommended
        }
    }

    public var platform: String {
        switch self {
        case .iPadProM4_13, .iPadAirM2_11, .iPadMini6_A15:
            return "iPad"
        case .iPhone15ProMax_A17, .iPhone14_A15:
            return "iPhone"
        case .macBookProM3Max_16, .macBookAirM2_13:
            return "MacIntel"
        case .custom:
            return "iPad"
        }
    }

    public var maxTouchPoints: Int {
        switch self {
        case .iPadProM4_13: return 10
        case .iPadAirM2_11, .iPadMini6_A15: return 5
        case .iPhone15ProMax_A17, .iPhone14_A15: return 5
        case .macBookProM3Max_16, .macBookAirM2_13: return 0
        case .custom: return 5
        }
    }

    public var cpuCores: Int {
        switch self {
        case .iPadProM4_13: return 10
        case .iPadAirM2_11: return 8
        case .iPadMini6_A15: return 6
        case .iPhone15ProMax_A17: return 6
        case .iPhone14_A15: return 6
        case .macBookProM3Max_16: return 16
        case .macBookAirM2_13: return 8
        case .custom: return 8
        }
    }

    public var ramGB: Int {
        switch self {
        case .iPadProM4_13: return 16
        case .iPadAirM2_11: return 8
        case .iPadMini6_A15: return 4
        case .iPhone15ProMax_A17: return 8
        case .iPhone14_A15: return 6
        case .macBookProM3Max_16: return 36
        case .macBookAirM2_13: return 8
        case .custom: return 8
        }
    }

    public var webglRenderer: String {
        switch self {
        case .iPadProM4_13: return "Apple M4"
        case .iPadAirM2_11: return "Apple M2"
        case .iPadMini6_A15: return "Apple A15 GPU"
        case .iPhone15ProMax_A17: return "Apple A17 Pro GPU"
        case .iPhone14_A15: return "Apple A15 GPU"
        case .macBookProM3Max_16: return "Apple M3 Max"
        case .macBookAirM2_13: return "Apple M2"
        case .custom: return "Apple GPU"
        }
    }

    public var screenWidth: Int {
        switch self {
        case .iPadProM4_13: return 1024
        case .iPadAirM2_11: return 820
        case .iPadMini6_A15: return 744
        case .iPhone15ProMax_A17: return 430
        case .iPhone14_A15: return 390
        case .macBookProM3Max_16: return 1728
        case .macBookAirM2_13: return 1470
        case .custom: return 1024
        }
    }

    public var screenHeight: Int {
        switch self {
        case .iPadProM4_13: return 1366
        case .iPadAirM2_11: return 1180
        case .iPadMini6_A15: return 1133
        case .iPhone15ProMax_A17: return 932
        case .iPhone14_A15: return 844
        case .macBookProM3Max_16: return 1117
        case .macBookAirM2_13: return 956
        case .custom: return 1366
        }
    }

    public var devicePixelRatio: Double {
        switch self {
        case .iPhone15ProMax_A17, .iPhone14_A15:
            return 3.0
        case .iPadProM4_13, .iPadAirM2_11, .iPadMini6_A15:
            return 2.0
        case .macBookProM3Max_16, .macBookAirM2_13:
            return 2.0
        case .custom:
            return 2.0
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

    // Defense Switches
    @Published public var blockCommercialTrackers: Bool = true
    @Published public var ephemeralRAMMode: Bool = false
    @Published public var blockCanvasFingerprint: Bool = false
    @Published public var blockAudioFingerprint: Bool = false
    @Published public var maskWebGLRenderer: Bool = false
    @Published public var blockWebRTCIPLeak: Bool = false
    @Published public var stripReferrers: Bool = false
    @Published public var shieldSensors: Bool = false

    public init() {}

    public func rotateIdentitySeed() {
        sessionSeed = Int.random(in: 100000...999999)
    }

    @discardableResult
    public func regenerateRealisticIdentity() -> AppleDeviceProfile {
        let realisticPool: [AppleDeviceProfile] = [
            .iPhone15ProMax_A17,
            .iPadAirM2_11,
            .macBookProM3Max_16,
            .iPadProM4_13,
            .iPhone14_A15,
            .macBookAirM2_13,
            .iPadMini6_A15
        ]
        let candidates = realisticPool.filter { $0 != selectedDevice }
        let chosen = candidates.randomElement() ?? .iPhone15ProMax_A17
        self.selectedDevice = chosen
        self.sessionSeed = Int.random(in: 100000...999999)
        return chosen
    }

    public var effectiveUserAgent: String {
        if selectedDevice == .custom && !customUserAgent.isEmpty {
            return customUserAgent
        }
        return selectedDevice.userAgent
    }

    public var effectivePlatform: String { selectedDevice.platform }
    public var effectiveTouchPoints: Int { selectedDevice.maxTouchPoints }
    public var effectiveCores: Int { selectedDevice.cpuCores }
    public var effectiveRAM: Int { selectedDevice.ramGB }
    public var effectiveRenderer: String { selectedDevice.webglRenderer }
    public var effectiveScreenWidth: Int { selectedDevice.screenWidth }
    public var effectiveScreenHeight: Int { selectedDevice.screenHeight }
    public var effectiveDevicePixelRatio: Double { selectedDevice.devicePixelRatio }

    public func generateJSConfig() -> String {
        return """
        window.__GHOST_CONFIG__ = {
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
            deviceMemory: \(effectiveRAM),
            webglVendor: "Apple Inc.",
            webglRenderer: "\(effectiveRenderer)",
            screenWidth: \(effectiveScreenWidth),
            screenHeight: \(effectiveScreenHeight),
            devicePixelRatio: \(effectiveDevicePixelRatio)
        };
        """
    }
}
