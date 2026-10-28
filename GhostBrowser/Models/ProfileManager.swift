import Foundation
import SwiftUI
import WebKit
import Combine

public class ProfileManager: ObservableObject {
    public static let shared = ProfileManager()

    private let userDefaultsKey = "ghost_browser_saved_profiles_v1"
    private let activeIDKey = "ghost_browser_active_profile_id"

    @Published public var profiles: [BrowserProfile] = []
    @Published public var activeProfileID: UUID

    private var privacyProfileCache: [UUID: PrivacyProfile] = [:]
    private var privacyCancellables: [UUID: AnyCancellable] = [:]

    public init() {
        if let data = UserDefaults.standard.data(forKey: userDefaultsKey),
           let decoded = try? JSONDecoder().decode([BrowserProfile].self, from: data),
           !decoded.isEmpty {
            var sanitizedProfiles = decoded
            var didRepair = false
            for idx in sanitizedProfiles.indices {
                let p = sanitizedProfiles[idx]
                let clean = ProxyService.shared.sanitizeCredentials(
                    type: p.proxyType,
                    host: p.proxyHost,
                    port: p.proxyPort,
                    username: p.proxyUsername,
                    password: p.proxyPassword
                )
                if clean.host != p.proxyHost || clean.port != p.proxyPort || clean.username != p.proxyUsername || clean.password != p.proxyPassword {
                    sanitizedProfiles[idx].proxyType = clean.type
                    sanitizedProfiles[idx].proxyHost = clean.host
                    sanitizedProfiles[idx].proxyPort = clean.port
                    sanitizedProfiles[idx].proxyUsername = clean.username
                    sanitizedProfiles[idx].proxyPassword = clean.password
                    didRepair = true
                }
            }
            self.profiles = sanitizedProfiles
            if let savedActiveStr = UserDefaults.standard.string(forKey: activeIDKey),
               let savedActiveUUID = UUID(uuidString: savedActiveStr),
               sanitizedProfiles.contains(where: { $0.id == savedActiveUUID }) {
                self.activeProfileID = savedActiveUUID
            } else {
                self.activeProfileID = sanitizedProfiles[0].id
            }
            if didRepair {
                self.saveProfiles()
            }
        } else {
            let defaultProfile = BrowserProfile(
                id: UUID(),
                name: "Personal",
                icon: "person.crop.circle.fill",
                themeColorHex: "#0A84FF",
                deviceProfile: .nativeHost
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

    public var activePrivacyProfile: PrivacyProfile {
        privacyProfile(for: activeProfileID)
    }

    public func privacyProfile(for id: UUID) -> PrivacyProfile {
        if let existing = privacyProfileCache[id] {
            return existing
        }
        let target = profiles.first(where: { $0.id == id }) ?? activeProfile
        let created = PrivacyProfile(from: target)
        privacyProfileCache[id] = created
        privacyCancellables[id] = created.objectWillChange.sink { [weak self] _ in
            DispatchQueue.main.async {
                self?.objectWillChange.send()
            }
        }
        return created
    }

    public func profileName(for id: UUID) -> String {
        profiles.first(where: { $0.id == id })?.name ?? activeProfile.name
    }

    public func saveProfiles() {
        if let encoded = try? JSONEncoder().encode(profiles) {
            UserDefaults.standard.set(encoded, forKey: userDefaultsKey)
        }
        UserDefaults.standard.set(activeProfileID.uuidString, forKey: activeIDKey)
    }

    private func uniqueRandomSeed() -> Int {
        let usedSeeds = Set(profiles.map { $0.sessionSeed })
        for _ in 0..<50 {
            let candidate = Int.random(in: 100000...999999)
            if !usedSeeds.contains(candidate) {
                return candidate
            }
        }
        return Int.random(in: 100000...999999)
    }

    public func nextRecommendedDeviceProfile() -> AppleDeviceProfile {
        return .nativeHost
    }

    @discardableResult
    public func createProfile(
        name: String,
        icon: String = "briefcase.fill",
        themeColorHex: String = "#BF5AF2",
        deviceProfile: AppleDeviceProfile? = nil,
        sessionSeed: Int? = nil,
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
            sessionSeed: sessionSeed ?? uniqueRandomSeed(),
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
        _ = privacyProfile(for: newProfile.id)
        saveProfiles()
        return newProfile
    }

    public func updateProfile(_ updated: BrowserProfile, privacyProfile: PrivacyProfile? = nil) {
        guard let index = profiles.firstIndex(where: { $0.id == updated.id }) else { return }
        profiles[index] = updated
        saveProfiles()

        let dedicated = self.privacyProfile(for: updated.id)
        syncPrivacyProfile(dedicated, from: updated)

        if updated.id == activeProfileID, let privacyProfile = privacyProfile, privacyProfile !== dedicated, privacyProfile.sessionDataStoreID == updated.id {
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
            sessionSeed: uniqueRandomSeed(),
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
        _ = privacyProfile(for: cloned.id)
        saveProfiles()
        return cloned
    }

    private func syncPrivacyProfile(_ privacyProfile: PrivacyProfile, from target: BrowserProfile) {
        privacyProfile.apply(from: target)
    }

    public func switchProfile(to id: UUID, privacyProfile: PrivacyProfile? = nil) {
        guard let target = profiles.first(where: { $0.id == id }) else { return }
        if activeProfileID != id, let prevDedicated = privacyProfileCache[activeProfileID] {
            saveProfileSensors(from: prevDedicated)
        }
        activeProfileID = id
        if let idx = profiles.firstIndex(where: { $0.id == id }) {
            profiles[idx].lastUsedAt = Date()
        }
        let hadExistingCache = (privacyProfileCache[id] != nil)
        let dedicated = self.privacyProfile(for: id)
        if !hadExistingCache {
            syncPrivacyProfile(dedicated, from: target)
        }
        saveProfiles()

        if let privacyProfile = privacyProfile, privacyProfile !== dedicated, privacyProfile.sessionDataStoreID == id {
            syncPrivacyProfile(privacyProfile, from: profiles.first(where: { $0.id == id }) ?? target)
        }
    }

    public func saveProfileSensors(from privacyProfile: PrivacyProfile) {
        let targetID = privacyProfile.sessionDataStoreID
        let index = profiles.firstIndex(where: { $0.id == targetID }) ?? profiles.firstIndex(where: { $0.id == activeProfileID })
        guard let idx = index else { return }
        profiles[idx].selectedDeviceSynced(from: privacyProfile)
        profiles[idx].mockLocationEnabled = privacyProfile.mockLocationEnabled
        profiles[idx].mockLatitude = privacyProfile.mockLatitude
        profiles[idx].mockLongitude = privacyProfile.mockLongitude
        profiles[idx].mockLocationName = privacyProfile.mockLocationName
        profiles[idx].virtualCameraEnabled = privacyProfile.virtualCameraEnabled
        profiles[idx].virtualCameraImageBase64 = privacyProfile.virtualCameraImageBase64
        profiles[idx].virtualCameraPanX = privacyProfile.virtualCameraPanX
        profiles[idx].virtualCameraPanY = privacyProfile.virtualCameraPanY
        profiles[idx].virtualCameraZoom = privacyProfile.virtualCameraZoom
        profiles[idx].proxyEnabled = privacyProfile.proxyEnabled
        profiles[idx].proxyType = privacyProfile.proxyType
        profiles[idx].proxyHost = privacyProfile.proxyHost
        profiles[idx].proxyPort = privacyProfile.proxyPort
        profiles[idx].proxyUsername = privacyProfile.proxyUsername
        profiles[idx].proxyPassword = privacyProfile.proxyPassword
        profiles[idx].proxyDetectedIP = privacyProfile.proxyDetectedIP
        profiles[idx].proxyDetectedCity = privacyProfile.proxyDetectedCity
        profiles[idx].proxyDetectedRegion = privacyProfile.proxyDetectedRegion
        profiles[idx].proxyDetectedCountry = privacyProfile.proxyDetectedCountry
        profiles[idx].proxyDetectedISP = privacyProfile.proxyDetectedISP
        profiles[idx].proxyDetectedASN = privacyProfile.proxyDetectedASN
        profiles[idx].proxyDetectedTimezone = privacyProfile.proxyDetectedTimezone
        profiles[idx].proxyUsageType = privacyProfile.proxyUsageType
        profiles[idx].proxyConnectionType = privacyProfile.proxyConnectionType
        profiles[idx].enableDnsProxyMatching = privacyProfile.enableDnsProxyMatching
        profiles[idx].enableIpChangeKillSwitch = privacyProfile.enableIpChangeKillSwitch
        saveProfiles()

        if let cached = privacyProfileCache[profiles[idx].id], cached !== privacyProfile {
            syncPrivacyProfile(cached, from: profiles[idx])
        }
    }

    public func saveCurrentTabs(tabs: [BrowserTab], activeTabID: UUID) {
        saveTabs(for: activeProfileID, tabs: tabs, activeTabID: activeTabID)
    }

    public func saveTabs(for profileID: UUID, tabs: [BrowserTab], activeTabID: UUID) {
        guard let index = profiles.firstIndex(where: { $0.id == profileID }) else { return }
        profiles[index].tabs = tabs.isEmpty ? [BrowserTab()] : tabs
        profiles[index].activeTabID = activeTabID
        saveProfiles()
    }

    public func recordHistoryVisit(url: String, title: String, forProfileID: UUID? = nil) {
        let targetID = forProfileID ?? activeProfileID
        let cleanURL = url.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanURL.isEmpty,
              !cleanURL.hasPrefix("local://"),
              !cleanURL.hasPrefix("ghost://"),
              !cleanURL.contains("startpage.html"),
              cleanURL != "about:blank",
              let index = profiles.firstIndex(where: { $0.id == targetID }) else {
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
        profiles[index].sessionSeed = uniqueRandomSeed()
        profiles[index].buildIndex = (profiles[index].buildIndex + 1) % 5
        saveProfiles()

        let dedicated = self.privacyProfile(for: id)
        dedicated.sessionSeed = profiles[index].sessionSeed
        dedicated.buildIndex = profiles[index].buildIndex

        if id == activeProfileID, let privacyProfile = privacyProfile, privacyProfile !== dedicated {
            privacyProfile.sessionSeed = profiles[index].sessionSeed
            privacyProfile.buildIndex = profiles[index].buildIndex
        }
    }

    @discardableResult
    public func regenerateProfileDevice(id: UUID, privacyProfile: PrivacyProfile? = nil) -> AppleDeviceProfile {
        guard let index = profiles.firstIndex(where: { $0.id == id }) else { return .iPadProM4_13 }
        let current = profiles[index].deviceProfile
        let pool: [AppleDeviceProfile] = [
            .iPadProM4_13,
            .iPadProM4_11,
            .iPadAirM3_11,
            .iPadAirM2_11,
            .iPad11_A16,
            .iPad10_A14,
            .iPadMini7_A17Pro,
            .iPhone18ProMax_A20,
            .iPhone17ProMax_A19,
            .iPhone16ProMax_A18,
            .iPhone16Pro_A18,
            .iPhone16_A18,
            .iPhone15ProMax_A17,
            .macBookProM4Max_16,
            .macBookProM4Pro_14,
            .macBookAirM3_13,
            .iPadMini6_A15
        ]
        let candidate = pool.filter { $0 != current }.randomElement() ?? .iPadProM4_11
        profiles[index].deviceProfile = candidate
        profiles[index].sessionSeed = uniqueRandomSeed()
        profiles[index].buildIndex = Int.random(in: 0...4)
        saveProfiles()

        let dedicated = self.privacyProfile(for: id)
        dedicated.selectedDevice = candidate
        dedicated.sessionSeed = profiles[index].sessionSeed
        dedicated.buildIndex = profiles[index].buildIndex

        if id == activeProfileID, let privacyProfile = privacyProfile, privacyProfile !== dedicated {
            privacyProfile.selectedDevice = candidate
            privacyProfile.sessionSeed = profiles[index].sessionSeed
            privacyProfile.buildIndex = profiles[index].buildIndex
        }
        return candidate
    }

    private var restoredCookieProfileIDs: Set<UUID> = []

    private static func isEphemeralOrChallengeCookie(_ name: String) -> Bool {
        let lower = name.lowercased()
        return lower == "bl_sid" || lower == "bl_js" || lower == "ak_bmsc" || lower == "bm_sv" || lower == "bm_sz" || lower == "__cf_bm"
    }

    public func clearProfileData(id: UUID) {
        restoredCookieProfileIDs.remove(id)
        UserDefaults.standard.removeObject(forKey: "ghost_vault_cookies_\(id.uuidString)")
        clearProfileHistory(id: id)
        let dedicated = privacyProfile(for: id)
        let store = ProxyService.shared.websiteDataStore(for: dedicated)
        store.httpCookieStore.getAllCookies { cookies in
            for cookie in cookies {
                store.httpCookieStore.delete(cookie)
            }
        }
        store.removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), modifiedSince: .distantPast) {}
        if #available(iOS 17.0, *) {
            WKWebsiteDataStore.remove(forIdentifier: id) { _ in }
        }
    }

    public func backupCookies(for profileID: UUID, from cookieStore: WKHTTPCookieStore) {
        cookieStore.getAllCookies { cookies in
            var serializedList: [[String: Any]] = []
            for c in cookies {
                // Never back up ephemeral session cookies (expiresDate == nil) or per-pageview anti-bot challenge cookies
                guard let exp = c.expiresDate, !Self.isEphemeralOrChallengeCookie(c.name) else {
                    continue
                }
                var dict: [String: Any] = [:]
                dict["name"] = c.name
                dict["value"] = c.value
                dict["domain"] = c.domain
                dict["path"] = c.path
                dict["isSecure"] = c.isSecure
                dict["isHTTPOnly"] = c.isHTTPOnly
                dict["expires"] = exp.timeIntervalSince1970
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
        // Only run once per profile session so secondary tabs do not mutate the shared cookie jar mid-session
        if restoredCookieProfileIDs.contains(profileID) {
            return
        }
        restoredCookieProfileIDs.insert(profileID)

        cookieStore.getAllCookies { existingCookies in
            var existingKeys = Set<String>()
            var grouped: [String: [HTTPCookie]] = [:]
            for c in existingCookies {
                let normHost = c.domain.trimmingCharacters(in: CharacterSet(charactersIn: ".")).lowercased()
                let key = "\(c.name.lowercased())||\(normHost)||\(c.path)"
                grouped[key, default: []].append(c)
                if c.name.caseInsensitiveCompare("bl_sid") == .orderedSame && c.domain.hasPrefix(".") {
                    cookieStore.delete(c, completionHandler: nil)
                }
            }
            for (key, items) in grouped {
                if items.count > 1, items.contains(where: { !$0.domain.hasPrefix(".") }) {
                    for dup in items where dup.domain.hasPrefix(".") {
                        cookieStore.delete(dup, completionHandler: nil)
                    }
                }
                existingKeys.insert(key)
            }

            guard let data = UserDefaults.standard.data(forKey: "ghost_vault_cookies_\(profileID.uuidString)"),
                  let rawList = try? JSONSerialization.jsonObject(with: data, options: []) as? [[String: Any]] else {
                return
            }
            let now = Date()
            for dict in rawList {
                guard let name = dict["name"] as? String,
                      !Self.isEphemeralOrChallengeCookie(name),
                      let value = dict["value"] as? String,
                      let domain = dict["domain"] as? String,
                      let path = dict["path"] as? String,
                      let expiresSec = dict["expires"] as? Double else {
                    continue
                }
                let expDate = Date(timeIntervalSince1970: expiresSec)
                if expDate <= now {
                    continue
                }
                let normHost = domain.trimmingCharacters(in: CharacterSet(charactersIn: ".")).lowercased()
                let normKey = "\(name.lowercased())||\(normHost)||\(path)"
                if existingKeys.contains(normKey) {
                    continue
                }
                var props: [HTTPCookiePropertyKey: Any] = [
                    .name: name,
                    .value: value,
                    .domain: domain,
                    .path: path,
                    .expires: expDate
                ]
                if let isSecure = dict["isSecure"] as? Bool, isSecure {
                    props[.secure] = "TRUE"
                }
                if let sameSiteRaw = dict["sameSite"] as? String {
                    props[.sameSitePolicy] = sameSiteRaw
                }
                if let cookie = HTTPCookie(properties: props) {
                    cookieStore.setCookie(cookie)
                    existingKeys.insert(normKey)
                }
            }
        }
    }

    public func deleteProfile(id: UUID, privacyProfile: PrivacyProfile? = nil) {
        guard profiles.count > 1 else { return }
        guard let index = profiles.firstIndex(where: { $0.id == id }) else { return }

        for tab in profiles[index].tabs {
            BrowserView.releaseWebView(for: tab.id)
        }
        ProxyService.shared.stopBridge(for: id)
        clearProfileData(id: id)
        privacyCancellables.removeValue(forKey: id)
        privacyProfileCache.removeValue(forKey: id)

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
