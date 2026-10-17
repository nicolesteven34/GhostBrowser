import Foundation
import SwiftUI

public struct ProfileHistoryEntry: Identifiable, Codable, Equatable {
    public let id: UUID
    public var url: String
    public var title: String
    public var visitCount: Int
    public var lastVisitedAt: Date

    public init(
        id: UUID = UUID(),
        url: String,
        title: String,
        visitCount: Int = 1,
        lastVisitedAt: Date = Date()
    ) {
        self.id = id
        self.url = url
        self.title = title
        self.visitCount = visitCount
        self.lastVisitedAt = lastVisitedAt
    }
}

public struct BrowserProfile: Identifiable, Codable, Equatable {
    public let id: UUID
    public var name: String
    public var icon: String
    public var themeColorHex: String
    public var deviceProfile: AppleDeviceProfile
    public var sessionSeed: Int
    public var buildIndex: Int
    public var customUserAgent: String
    public var searchEngine: SearchEngine
    public var tabs: [BrowserTab]
    public var activeTabID: UUID
    public var visitedHistory: [ProfileHistoryEntry]
    public var createdAt: Date
    public var lastUsedAt: Date

    // Mock Location (GPS)
    public var mockLocationEnabled: Bool
    public var mockLatitude: Double
    public var mockLongitude: Double
    public var mockLocationName: String

    // Virtual Camera Stream
    public var virtualCameraEnabled: Bool
    public var virtualCameraImageBase64: String
    public var virtualCameraPanX: Double
    public var virtualCameraPanY: Double
    public var virtualCameraZoom: Double

    // SOCKS5 / HTTP Network Proxy Configuration
    public var proxyEnabled: Bool
    public var proxyType: String
    public var proxyHost: String
    public var proxyPort: Int
    public var proxyUsername: String
    public var proxyPassword: String
    public var proxyDetectedIP: String
    public var proxyDetectedCity: String
    public var proxyDetectedRegion: String
    public var proxyDetectedCountry: String
    public var proxyDetectedISP: String
    public var proxyDetectedASN: String
    public var proxyDetectedTimezone: String
    public var proxyUsageType: String
    public var proxyConnectionType: String
    public var enableDnsProxyMatching: Bool
    public var enableIpChangeKillSwitch: Bool

    /// Deterministic per-profile RFC 4122 v4 mDNS hostname (<uuid>.local)
    public var mDnsHostname: String {
        func fmix32(_ h: UInt32) -> UInt32 {
            var x = h
            x ^= x >> 16
            x = x &* 0x85ebca6b
            x ^= x >> 13
            x = x &* 0xc2b2ae35
            x ^= x >> 16
            return x
        }
        let seedU = UInt32(truncatingIfNeeded: abs(sessionSeed))
        let p0 = fmix32(seedU &+ 911)
        let p1 = fmix32(seedU &+ 912)
        let p2 = fmix32(seedU &+ 913)
        let p3 = fmix32(seedU &+ 914)
        let hex0 = String(format: "%08x", p0)
        let hex1 = String(format: "%08x", p1)
        let hex2 = String(format: "%08x", p2)
        let hex3 = String(format: "%08x", p3)
        let s1 = String(hex1.prefix(4))
        let s2 = String(hex1.suffix(4).dropFirst())
        let v3 = String(["8", "9", "a", "b"][Int(p2 & 3)])
        let s3 = String(hex2.prefix(4).dropFirst())
        let s4 = String(hex2.suffix(4))
        return "\(hex0)-\(s1)-4\(s2)-\(v3)\(s3)-\(s4)\(hex3).local"
    }

    /// Cosmetic Session Monitor Indicator with ISP next to IP:
    /// "🔒 <IP> • <ISP> • <UsageType> (<ConnType>) • <City>, <State>"
    public var sessionMonitorIndicatorText: String {
        guard proxyEnabled else {
            return "Direct Egress (Host Network)"
        }
        let proto = proxyType.uppercased().contains("HTTP") ? "HTTP" : "SOCKS5"
        let usage = proxyUsageType.isEmpty ? "Residential" : proxyUsageType
        let conn = proxyConnectionType.isEmpty ? "Cable/Fiber" : proxyConnectionType
        let locState = !proxyDetectedRegion.isEmpty ? proxyDetectedRegion : proxyDetectedCountry
        let locPart = !proxyDetectedCity.isEmpty
            ? "\(proxyDetectedCity)\(!locState.isEmpty ? ", \(locState)" : "")"
            : locState

        if !proxyDetectedIP.isEmpty {
            let ispPart = !proxyDetectedISP.isEmpty ? " • \(proxyDetectedISP)" : ""
            let tail = !locPart.isEmpty ? " • \(usage) (\(conn)) • \(locPart)" : " • \(usage) (\(conn))"
            return "\(proxyDetectedIP)\(ispPart)\(tail)"
        }
        if !proxyHost.isEmpty {
            return "\(proto) \(proxyHost):\(proxyPort) • \(usage) (\(conn))"
        }
        return "\(proto) Proxy Configured"
    }

    public init(
        id: UUID = UUID(),
        name: String = "Default Profile",
        icon: String = "person.crop.circle.fill",
        themeColorHex: String = "#0A84FF",
        deviceProfile: AppleDeviceProfile = .iPadProM4_13,
        sessionSeed: Int = Int.random(in: 100000...999999),
        buildIndex: Int = Int.random(in: 0...4),
        customUserAgent: String = "",
        searchEngine: SearchEngine = .localStartPage,
        tabs: [BrowserTab] = [BrowserTab()],
        activeTabID: UUID? = nil,
        visitedHistory: [ProfileHistoryEntry] = [],
        createdAt: Date = Date(),
        lastUsedAt: Date = Date(),
        mockLocationEnabled: Bool = false,
        mockLatitude: Double = 37.7749,
        mockLongitude: Double = -122.4194,
        mockLocationName: String = "San Francisco, CA",
        virtualCameraEnabled: Bool = false,
        virtualCameraImageBase64: String = "",
        virtualCameraPanX: Double = 0.0,
        virtualCameraPanY: Double = 0.0,
        virtualCameraZoom: Double = 1.0,
        proxyEnabled: Bool = false,
        proxyType: String = "SOCKS5",
        proxyHost: String = "",
        proxyPort: Int = 1080,
        proxyUsername: String = "",
        proxyPassword: String = "",
        proxyDetectedIP: String = "",
        proxyDetectedCity: String = "",
        proxyDetectedRegion: String = "",
        proxyDetectedCountry: String = "",
        proxyDetectedISP: String = "",
        proxyDetectedASN: String = "",
        proxyDetectedTimezone: String = "",
        proxyUsageType: String = "Residential",
        proxyConnectionType: String = "Cable/Fiber",
        enableDnsProxyMatching: Bool = true,
        enableIpChangeKillSwitch: Bool = true
    ) {
        self.id = id
        self.name = name
        self.icon = icon
        self.themeColorHex = themeColorHex
        self.deviceProfile = deviceProfile
        self.sessionSeed = sessionSeed
        self.buildIndex = buildIndex
        self.customUserAgent = customUserAgent
        self.searchEngine = searchEngine
        self.tabs = tabs.isEmpty ? [BrowserTab()] : tabs
        self.activeTabID = activeTabID ?? self.tabs[0].id
        self.visitedHistory = visitedHistory
        self.createdAt = createdAt
        self.lastUsedAt = lastUsedAt
        self.mockLocationEnabled = mockLocationEnabled
        self.mockLatitude = mockLatitude
        self.mockLongitude = mockLongitude
        self.mockLocationName = mockLocationName
        self.virtualCameraEnabled = virtualCameraEnabled
        self.virtualCameraImageBase64 = virtualCameraImageBase64
        self.virtualCameraPanX = virtualCameraPanX
        self.virtualCameraPanY = virtualCameraPanY
        self.virtualCameraZoom = virtualCameraZoom
        self.proxyEnabled = proxyEnabled
        self.proxyType = proxyType
        self.proxyHost = proxyHost
        self.proxyPort = proxyPort
        self.proxyUsername = proxyUsername
        self.proxyPassword = proxyPassword
        self.proxyDetectedIP = proxyDetectedIP
        self.proxyDetectedCity = proxyDetectedCity
        self.proxyDetectedRegion = proxyDetectedRegion
        self.proxyDetectedCountry = proxyDetectedCountry
        self.proxyDetectedISP = proxyDetectedISP
        self.proxyDetectedASN = proxyDetectedASN
        self.proxyDetectedTimezone = proxyDetectedTimezone
        self.proxyUsageType = proxyUsageType
        self.proxyConnectionType = proxyConnectionType
        self.enableDnsProxyMatching = enableDnsProxyMatching
        self.enableIpChangeKillSwitch = enableIpChangeKillSwitch
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        icon = try container.decodeIfPresent(String.self, forKey: .icon) ?? "person.crop.circle.fill"
        themeColorHex = try container.decodeIfPresent(String.self, forKey: .themeColorHex) ?? "#0A84FF"
        deviceProfile = try container.decodeIfPresent(AppleDeviceProfile.self, forKey: .deviceProfile) ?? .iPadProM4_13
        sessionSeed = try container.decodeIfPresent(Int.self, forKey: .sessionSeed) ?? Int.random(in: 100000...999999)
        buildIndex = try container.decodeIfPresent(Int.self, forKey: .buildIndex) ?? 0
        customUserAgent = try container.decodeIfPresent(String.self, forKey: .customUserAgent) ?? ""
        searchEngine = try container.decodeIfPresent(SearchEngine.self, forKey: .searchEngine) ?? .localStartPage
        let decodedTabs = try container.decodeIfPresent([BrowserTab].self, forKey: .tabs) ?? [BrowserTab()]
        tabs = decodedTabs.isEmpty ? [BrowserTab()] : decodedTabs
        activeTabID = try container.decodeIfPresent(UUID.self, forKey: .activeTabID) ?? tabs[0].id
        visitedHistory = try container.decodeIfPresent([ProfileHistoryEntry].self, forKey: .visitedHistory) ?? []
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt) ?? Date()
        lastUsedAt = try container.decodeIfPresent(Date.self, forKey: .lastUsedAt) ?? Date()
        mockLocationEnabled = try container.decodeIfPresent(Bool.self, forKey: .mockLocationEnabled) ?? false
        mockLatitude = try container.decodeIfPresent(Double.self, forKey: .mockLatitude) ?? 37.7749
        mockLongitude = try container.decodeIfPresent(Double.self, forKey: .mockLongitude) ?? -122.4194
        mockLocationName = try container.decodeIfPresent(String.self, forKey: .mockLocationName) ?? "San Francisco, CA"
        virtualCameraEnabled = try container.decodeIfPresent(Bool.self, forKey: .virtualCameraEnabled) ?? false
        virtualCameraImageBase64 = try container.decodeIfPresent(String.self, forKey: .virtualCameraImageBase64) ?? ""
        virtualCameraPanX = try container.decodeIfPresent(Double.self, forKey: .virtualCameraPanX) ?? 0.0
        virtualCameraPanY = try container.decodeIfPresent(Double.self, forKey: .virtualCameraPanY) ?? 0.0
        virtualCameraZoom = try container.decodeIfPresent(Double.self, forKey: .virtualCameraZoom) ?? 1.0
        proxyEnabled = try container.decodeIfPresent(Bool.self, forKey: .proxyEnabled) ?? false
        proxyType = try container.decodeIfPresent(String.self, forKey: .proxyType) ?? "SOCKS5"
        proxyHost = try container.decodeIfPresent(String.self, forKey: .proxyHost) ?? ""
        proxyPort = try container.decodeIfPresent(Int.self, forKey: .proxyPort) ?? 1080
        proxyUsername = try container.decodeIfPresent(String.self, forKey: .proxyUsername) ?? ""
        proxyPassword = try container.decodeIfPresent(String.self, forKey: .proxyPassword) ?? ""
        proxyDetectedIP = try container.decodeIfPresent(String.self, forKey: .proxyDetectedIP) ?? ""
        proxyDetectedCity = try container.decodeIfPresent(String.self, forKey: .proxyDetectedCity) ?? ""
        proxyDetectedRegion = try container.decodeIfPresent(String.self, forKey: .proxyDetectedRegion) ?? ""
        proxyDetectedCountry = try container.decodeIfPresent(String.self, forKey: .proxyDetectedCountry) ?? ""
        proxyDetectedISP = try container.decodeIfPresent(String.self, forKey: .proxyDetectedISP) ?? ""
        proxyDetectedASN = try container.decodeIfPresent(String.self, forKey: .proxyDetectedASN) ?? ""
        proxyDetectedTimezone = try container.decodeIfPresent(String.self, forKey: .proxyDetectedTimezone) ?? ""
        proxyUsageType = try container.decodeIfPresent(String.self, forKey: .proxyUsageType) ?? "Residential"
        proxyConnectionType = try container.decodeIfPresent(String.self, forKey: .proxyConnectionType) ?? "Cable/Fiber"
        enableDnsProxyMatching = try container.decodeIfPresent(Bool.self, forKey: .enableDnsProxyMatching) ?? true
        enableIpChangeKillSwitch = try container.decodeIfPresent(Bool.self, forKey: .enableIpChangeKillSwitch) ?? true
    }

    public static let availableIcons = [
        "person.crop.circle.fill",
        "briefcase.fill",
        "shield.checkerboard",
        "globe.americas.fill",
        "cart.fill",
        "lock.shield.fill",
        "sparkles",
        "terminal.fill",
        "macbook.and.iphone",
        "airplane.circle.fill"
    ]

    public static let availableColors = [
        "#0A84FF", // Apple Blue
        "#BF5AF2", // Apple Purple
        "#30D158", // Apple Green
        "#FF9F0A", // Apple Orange
        "#FF375F", // Apple Pink
        "#5E5CE6", // Apple Indigo
        "#64D2FF", // Apple Cyan
        "#FF453A"  // Apple Red
    ]
}

public extension Color {
    init(hex: String) {
        let cleanHex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: cleanHex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch cleanHex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 10, 132, 255)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
