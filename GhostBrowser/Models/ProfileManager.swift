import Foundation
import SwiftUI
import WebKit

public class ProfileManager: ObservableObject {
    public static let shared = ProfileManager()

    private let userDefaultsKey = "ghost_browser_saved_profiles_v1"
    private let activeIDKey = "ghost_browser_active_profile_id"

    @Published public var profiles: [BrowserProfile] = []
    @Published public var activeProfileID: UUID

    public init() {
        if let data = UserDefaults.standard.data(forKey: userDefaultsKey),
           let decoded = try? JSONDecoder().decode([BrowserProfile].self, from: data),
           !decoded.isEmpty {
            self.profiles = decoded
            if let savedActiveStr = UserDefaults.standard.string(forKey: activeIDKey),
               let savedActiveUUID = UUID(uuidString: savedActiveStr),
               decoded.contains(where: { $0.id == savedActiveUUID }) {
                self.activeProfileID = savedActiveUUID
            } else {
                self.activeProfileID = decoded[0].id
            }
        } else {
            let defaultProfile = BrowserProfile(
                id: UUID(),
                name: "Personal",
                icon: "person.crop.circle.fill",
                themeColorHex: "#0A84FF",
                deviceProfile: .iPadProM4_13
            )
            self.profiles = [defaultProfile]
            self.activeProfileID = defaultProfile.id
            self.saveProfiles()
            UserDefaults.standard.set(defaultProfile.id.uuidString, forKey: activeIDKey)
        }
    }

    public var activeProfile: BrowserProfile {
        profiles.first(where: { $0.id == activeProfileID }) ?? profiles.first ?? BrowserProfile()
    }

    public func saveProfiles() {
        if let encoded = try? JSONEncoder().encode(profiles) {
            UserDefaults.standard.set(encoded, forKey: userDefaultsKey)
        }
        UserDefaults.standard.set(activeProfileID.uuidString, forKey: activeIDKey)
    }

    public func nextRecommendedDeviceProfile() -> AppleDeviceProfile {
        let realisticPool: [AppleDeviceProfile] = [
            .iPadProM4_13,
            .iPhone18ProMax_A20,
            .iPhone17ProMax_A19,
            .iPhone16ProMax_A18,
            .iPadAirM2_11,
            .macBookProM4Max_16,
            .iPhone16_A18,
            .macBookAirM3_13,
            .iPhone15ProMax_A17,
            .iPadMini6_A15
        ]
        let usedDevices = Set(profiles.map { $0.deviceProfile })
        if let unused = realisticPool.first(where: { !usedDevices.contains($0) }) {
            return unused
        }
        return realisticPool[profiles.count % realisticPool.count]
    }

    @discardableResult
    public func createProfile(
        name: String,
        icon: String = "briefcase.fill",
        themeColorHex: String = "#BF5AF2",
        deviceProfile: AppleDeviceProfile? = nil,
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
        enableIpChangeKillSwitch: Bool = true,
        mockLocationEnabled: Bool = false,
        mockLatitude: Double = 37.7749,
        mockLongitude: Double = -122.4194,
        mockLocationName: String = "San Francisco, CA"
    ) -> BrowserProfile {
        let chosenDevice = deviceProfile ?? nextRecommendedDeviceProfile()
        let freshTab = BrowserTab()
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let newProfile = BrowserProfile(
            id: UUID(),
            name: cleanName.isEmpty ? "Profile \(profiles.count + 1)" : cleanName,
            icon: icon,
            themeColorHex: themeColorHex,
            deviceProfile: chosenDevice,
            sessionSeed: Int.random(in: 100000...999999),
            buildIndex: Int.random(in: 0...4),
            tabs: [freshTab],
            activeTabID: freshTab.id,
            mockLocationEnabled: mockLocationEnabled,
            mockLatitude: mockLatitude,
            mockLongitude: mockLongitude,
            mockLocationName: mockLocationName,
            proxyEnabled: proxyEnabled,
            proxyType: proxyType,
            proxyHost: proxyHost.trimmingCharacters(in: .whitespacesAndNewlines),
            proxyPort: proxyPort,
            proxyUsername: proxyUsername.trimmingCharacters(in: .whitespacesAndNewlines),
            proxyPassword: proxyPassword,
            proxyDetectedIP: proxyDetectedIP,
            proxyDetectedCity: proxyDetectedCity,
            proxyDetectedRegion: proxyDetectedRegion,
            proxyDetectedCountry: proxyDetectedCountry,
            proxyDetectedISP: proxyDetectedISP,
            proxyDetectedASN: proxyDetectedASN,
            proxyDetectedTimezone: proxyDetectedTimezone,
            proxyUsageType: proxyUsageType,
            proxyConnectionType: proxyConnectionType,
            enableDnsProxyMatching: enableDnsProxyMatching,
            enableIpChangeKillSwitch: enableIpChangeKillSwitch
        )
        profiles.append(newProfile)
        saveProfiles()
        return newProfile
    }

    public func updateProfile(_ updated: BrowserProfile, privacyProfile: PrivacyProfile? = nil) {
        guard let index = profiles.firstIndex(where: { $0.id == updated.id }) else { return }
        profiles[index] = updated
        saveProfiles()

        if updated.id == activeProfileID, let privacyProfile = privacyProfile {
            syncPrivacyProfile(privacyProfile, from: updated)
        }
    }

    @discardableResult
    public func cloneProfile(id: UUID) -> BrowserProfile? {
        guard let source = profiles.first(where: { $0.id == id }) else { return nil }
        let freshTab = BrowserTab()
        let cloned = BrowserProfile(
            id: UUID(),
            name: "\(source.name) (Clone)",
            icon: source.icon,
            themeColorHex: source.themeColorHex,
            deviceProfile: source.deviceProfile,
            sessionSeed: Int.random(in: 100000...999999),
            buildIndex: (source.buildIndex + 1) % 5,
            customUserAgent: source.customUserAgent,
            searchEngine: source.searchEngine,
            tabs: [freshTab],
            activeTabID: freshTab.id,
            mockLocationEnabled: source.mockLocationEnabled,
            mockLatitude: source.mockLatitude,
            mockLongitude: source.mockLongitude,
            mockLocationName: source.mockLocationName,
            virtualCameraEnabled: source.virtualCameraEnabled,
            virtualCameraImageBase64: source.virtualCameraImageBase64,
            virtualCameraPanX: source.virtualCameraPanX,
            virtualCameraPanY: source.virtualCameraPanY,
            virtualCameraZoom: source.virtualCameraZoom,
            proxyEnabled: source.proxyEnabled,
            proxyType: source.proxyType,
            proxyHost: source.proxyHost,
            proxyPort: source.proxyPort,
            proxyUsername: source.proxyUsername,
            proxyPassword: source.proxyPassword,
            proxyDetectedIP: source.proxyDetectedIP,
            proxyDetectedCity: source.proxyDetectedCity,
            proxyDetectedRegion: source.proxyDetectedRegion,
            proxyDetectedCountry: source.proxyDetectedCountry,
            proxyDetectedISP: source.proxyDetectedISP,
            proxyDetectedASN: source.proxyDetectedASN,
            proxyDetectedTimezone: source.proxyDetectedTimezone,
            proxyUsageType: source.proxyUsageType,
            proxyConnectionType: source.proxyConnectionType,
            enableDnsProxyMatching: source.enableDnsProxyMatching,
            enableIpChangeKillSwitch: source.enableIpChangeKillSwitch
        )
        profiles.append(cloned)
        saveProfiles()
        return cloned
    }

    private func syncPrivacyProfile(_ privacyProfile: PrivacyProfile, from target: BrowserProfile) {
        privacyProfile.selectedDevice = target.deviceProfile
        privacyProfile.sessionSeed = target.sessionSeed
        privacyProfile.buildIndex = target.buildIndex
        privacyProfile.sessionDataStoreID = target.id
        privacyProfile.searchEngine = target.searchEngine
        privacyProfile.customUserAgent = target.customUserAgent
        privacyProfile.mockLocationEnabled = target.mockLocationEnabled
        privacyProfile.mockLatitude = target.mockLatitude
        privacyProfile.mockLongitude = target.mockLongitude
        privacyProfile.mockLocationName = target.mockLocationName
        privacyProfile.virtualCameraEnabled = target.virtualCameraEnabled
        privacyProfile.virtualCameraImageBase64 = target.virtualCameraImageBase64
        privacyProfile.virtualCameraPanX = target.virtualCameraPanX
        privacyProfile.virtualCameraPanY = target.virtualCameraPanY
        privacyProfile.virtualCameraZoom = target.virtualCameraZoom
        privacyProfile.proxyEnabled = target.proxyEnabled
        privacyProfile.proxyType = target.proxyType
        privacyProfile.proxyHost = target.proxyHost
        privacyProfile.proxyPort = target.proxyPort
        privacyProfile.proxyUsername = target.proxyUsername
        privacyProfile.proxyPassword = target.proxyPassword
        privacyProfile.proxyDetectedIP = target.proxyDetectedIP
        privacyProfile.proxyDetectedCity = target.proxyDetectedCity
        privacyProfile.proxyDetectedRegion = target.proxyDetectedRegion
        privacyProfile.proxyDetectedCountry = target.proxyDetectedCountry
        privacyProfile.proxyDetectedISP = target.proxyDetectedISP
        privacyProfile.proxyDetectedASN = target.proxyDetectedASN
        privacyProfile.proxyDetectedTimezone = target.proxyDetectedTimezone
        privacyProfile.proxyUsageType = target.proxyUsageType
        privacyProfile.proxyConnectionType = target.proxyConnectionType
        privacyProfile.enableDnsProxyMatching = target.enableDnsProxyMatching
        privacyProfile.enableIpChangeKillSwitch = target.enableIpChangeKillSwitch
    }

    public func switchProfile(to id: UUID, privacyProfile: PrivacyProfile? = nil) {
        guard let target = profiles.first(where: { $0.id == id }) else { return }
        activeProfileID = id
        if let idx = profiles.firstIndex(where: { $0.id == id }) {
            profiles[idx].lastUsedAt = Date()
        }
        saveProfiles()

        if let privacyProfile = privacyProfile {
            syncPrivacyProfile(privacyProfile, from: target)
        }
    }

    public func saveProfileSensors(from privacyProfile: PrivacyProfile) {
        guard let index = profiles.firstIndex(where: { $0.id == activeProfileID }) else { return }
        profiles[index].selectedDeviceSynced(from: privacyProfile)
        profiles[index].mockLocationEnabled = privacyProfile.mockLocationEnabled
        profiles[index].mockLatitude = privacyProfile.mockLatitude
        profiles[index].mockLongitude = privacyProfile.mockLongitude
        profiles[index].mockLocationName = privacyProfile.mockLocationName
        profiles[index].virtualCameraEnabled = privacyProfile.virtualCameraEnabled
        profiles[index].virtualCameraImageBase64 = privacyProfile.virtualCameraImageBase64
        profiles[index].virtualCameraPanX = privacyProfile.virtualCameraPanX
        profiles[index].virtualCameraPanY = privacyProfile.virtualCameraPanY
        profiles[index].virtualCameraZoom = privacyProfile.virtualCameraZoom
        profiles[index].proxyEnabled = privacyProfile.proxyEnabled
        profiles[index].proxyType = privacyProfile.proxyType
        profiles[index].proxyHost = privacyProfile.proxyHost
        profiles[index].proxyPort = privacyProfile.proxyPort
        profiles[index].proxyUsername = privacyProfile.proxyUsername
        profiles[index].proxyPassword = privacyProfile.proxyPassword
        profiles[index].proxyDetectedIP = privacyProfile.proxyDetectedIP
        profiles[index].proxyDetectedCity = privacyProfile.proxyDetectedCity
        profiles[index].proxyDetectedRegion = privacyProfile.proxyDetectedRegion
        profiles[index].proxyDetectedCountry = privacyProfile.proxyDetectedCountry
        profiles[index].proxyDetectedISP = privacyProfile.proxyDetectedISP
        profiles[index].proxyDetectedASN = privacyProfile.proxyDetectedASN
        profiles[index].proxyDetectedTimezone = privacyProfile.proxyDetectedTimezone
        profiles[index].proxyUsageType = privacyProfile.proxyUsageType
        profiles[index].proxyConnectionType = privacyProfile.proxyConnectionType
        profiles[index].enableDnsProxyMatching = privacyProfile.enableDnsProxyMatching
        profiles[index].enableIpChangeKillSwitch = privacyProfile.enableIpChangeKillSwitch
        saveProfiles()
    }

    public func saveCurrentTabs(tabs: [BrowserTab], activeTabID: UUID) {
        guard let index = profiles.firstIndex(where: { $0.id == activeProfileID }) else { return }
        profiles[index].tabs = tabs.isEmpty ? [BrowserTab()] : tabs
        profiles[index].activeTabID = activeTabID
        saveProfiles()
    }

    public func recordHistoryVisit(url: String, title: String) {
        let cleanURL = url.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanURL.isEmpty,
              !cleanURL.hasPrefix("local://"),
              !cleanURL.hasPrefix("ghost://"),
              !cleanURL.contains("startpage.html"),
              cleanURL != "about:blank",
              let index = profiles.firstIndex(where: { $0.id == activeProfileID }) else {
            return
        }
        let displayTitle = title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? (URL(string: cleanURL)?.host ?? cleanURL)
            : title
        if let existingIdx = profiles[index].visitedHistory.firstIndex(where: { $0.url.caseInsensitiveCompare(cleanURL) == .orderedSame }) {
            var entry = profiles[index].visitedHistory.remove(at: existingIdx)
            entry.visitCount += 1
            entry.title = displayTitle
            entry.lastVisitedAt = Date()
            profiles[index].visitedHistory.insert(entry, at: 0)
        } else {
            let entry = ProfileHistoryEntry(url: cleanURL, title: displayTitle, visitCount: 1, lastVisitedAt: Date())
            profiles[index].visitedHistory.insert(entry, at: 0)
        }
        if profiles[index].visitedHistory.count > 100 {
            profiles[index].visitedHistory = Array(profiles[index].visitedHistory.prefix(100))
        }
        saveProfiles()
    }

    public func clearProfileHistory(id: UUID? = nil) {
        let targetID = id ?? activeProfileID
        guard let index = profiles.firstIndex(where: { $0.id == targetID }) else { return }
        profiles[index].visitedHistory.removeAll()
        saveProfiles()
    }

    public func rotateProfileSeed(id: UUID, privacyProfile: PrivacyProfile? = nil) {
        guard let index = profiles.firstIndex(where: { $0.id == id }) else { return }
        profiles[index].sessionSeed = Int.random(in: 100000...999999)
        profiles[index].buildIndex = (profiles[index].buildIndex + 1) % 5
        saveProfiles()

        if id == activeProfileID, let privacyProfile = privacyProfile {
            privacyProfile.sessionSeed = profiles[index].sessionSeed
            privacyProfile.buildIndex = profiles[index].buildIndex
        }
    }

    @discardableResult
    public func regenerateProfileDevice(id: UUID, privacyProfile: PrivacyProfile? = nil) -> AppleDeviceProfile {
        guard let index = profiles.firstIndex(where: { $0.id == id }) else { return .iPadProM4_13 }
        let current = profiles[index].deviceProfile
        let pool: [AppleDeviceProfile] = [
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
        let candidate = pool.filter { $0 != current }.randomElement() ?? .iPhone18ProMax_A20
        profiles[index].deviceProfile = candidate
        profiles[index].sessionSeed = Int.random(in: 100000...999999)
        profiles[index].buildIndex = Int.random(in: 0...4)
        saveProfiles()

        if id == activeProfileID, let privacyProfile = privacyProfile {
            privacyProfile.selectedDevice = candidate
            privacyProfile.sessionSeed = profiles[index].sessionSeed
            privacyProfile.buildIndex = profiles[index].buildIndex
        }
        return candidate
    }

    public func clearProfileData(id: UUID) {
        UserDefaults.standard.removeObject(forKey: "ghost_vault_cookies_\(id.uuidString)")
        clearProfileHistory(id: id)
        if #available(iOS 17.0, *) {
            WKWebsiteDataStore.remove(forIdentifier: id) { _ in }
        }
        URLCache.shared.removeAllCachedResponses()
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies {
                HTTPCookieStorage.shared.deleteCookie(cookie)
            }
        }
    }

    public func backupCookies(for profileID: UUID, from cookieStore: WKHTTPCookieStore) {
        cookieStore.getAllCookies { cookies in
            var serializedList: [[String: Any]] = []
            for c in cookies {
                var dict: [String: Any] = [:]
                dict["name"] = c.name
                dict["value"] = c.value
                dict["domain"] = c.domain
                dict["path"] = c.path
                dict["isSecure"] = c.isSecure
                dict["isHTTPOnly"] = c.isHTTPOnly
                if let exp = c.expiresDate {
                    dict["expires"] = exp.timeIntervalSince1970
                }
                if let sameSite = c.sameSitePolicy {
                    dict["sameSite"] = sameSite.rawValue
                }
                serializedList.append(dict)
            }
            if let data = try? JSONSerialization.data(withJSONObject: serializedList, options: []) {
                UserDefaults.standard.set(data, forKey: "ghost_vault_cookies_\(profileID.uuidString)")
            }
        }
    }

    public func restoreCookies(for profileID: UUID, into cookieStore: WKHTTPCookieStore) {
        guard let data = UserDefaults.standard.data(forKey: "ghost_vault_cookies_\(profileID.uuidString)"),
              let rawList = try? JSONSerialization.jsonObject(with: data, options: []) as? [[String: Any]] else {
            return
        }
        for dict in rawList {
            guard let name = dict["name"] as? String,
                  let value = dict["value"] as? String,
                  let domain = dict["domain"] as? String,
                  let path = dict["path"] as? String else {
                continue
            }
            var props: [HTTPCookiePropertyKey: Any] = [
                .name: name,
                .value: value,
                .domain: domain,
                .path: path
            ]
            if let isSecure = dict["isSecure"] as? Bool, isSecure {
                props[.secure] = "TRUE"
            }
            if let expiresSec = dict["expires"] as? Double {
                props[.expires] = Date(timeIntervalSince1970: expiresSec)
            }
            if let sameSiteRaw = dict["sameSite"] as? String {
                props[.sameSitePolicy] = sameSiteRaw
            }
            if let cookie = HTTPCookie(properties: props) {
                cookieStore.setCookie(cookie)
            }
        }
    }

    public func deleteProfile(id: UUID, privacyProfile: PrivacyProfile? = nil) {
        guard profiles.count > 1 else { return }
        guard let index = profiles.firstIndex(where: { $0.id == id }) else { return }

        clearProfileData(id: id)
        let isDeletingActive = (id == activeProfileID)
        profiles.remove(at: index)

        if isDeletingActive {
            let next = profiles[0]
            activeProfileID = next.id
            if let privacyProfile = privacyProfile {
                syncPrivacyProfile(privacyProfile, from: next)
            }
        }
        saveProfiles()
    }
}

private extension BrowserProfile {
    mutating func selectedDeviceSynced(from privacyProfile: PrivacyProfile) {
        self.deviceProfile = privacyProfile.selectedDevice
        self.sessionSeed = privacyProfile.sessionSeed
        self.buildIndex = privacyProfile.buildIndex
        self.customUserAgent = privacyProfile.customUserAgent
        self.searchEngine = privacyProfile.searchEngine
    }
}
