import Foundation
import SwiftUI

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
    public var proxyDetectedCountry: String
    public var proxyDetectedISP: String
    public var proxyDetectedTimezone: String

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
        proxyDetectedCountry: String = "",
        proxyDetectedISP: String = "",
        proxyDetectedTimezone: String = ""
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
        self.proxyDetectedCountry = proxyDetectedCountry
        self.proxyDetectedISP = proxyDetectedISP
        self.proxyDetectedTimezone = proxyDetectedTimezone
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        icon = try container.decode(String.self, forKey: .icon)
        themeColorHex = try container.decode(String.self, forKey: .themeColorHex)
        deviceProfile = try container.decode(AppleDeviceProfile.self, forKey: .deviceProfile)
        sessionSeed = try container.decode(Int.self, forKey: .sessionSeed)
        buildIndex = try container.decodeIfPresent(Int.self, forKey: .buildIndex) ?? 0
        customUserAgent = try container.decodeIfPresent(String.self, forKey: .customUserAgent) ?? ""
        searchEngine = try container.decodeIfPresent(SearchEngine.self, forKey: .searchEngine) ?? .localStartPage
        tabs = try container.decodeIfPresent([BrowserTab].self, forKey: .tabs) ?? [BrowserTab()]
        activeTabID = try container.decodeIfPresent(UUID.self, forKey: .activeTabID) ?? (tabs.first?.id ?? UUID())
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
        proxyDetectedCountry = try container.decodeIfPresent(String.self, forKey: .proxyDetectedCountry) ?? ""
        proxyDetectedISP = try container.decodeIfPresent(String.self, forKey: .proxyDetectedISP) ?? ""
        proxyDetectedTimezone = try container.decodeIfPresent(String.self, forKey: .proxyDetectedTimezone) ?? ""
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
