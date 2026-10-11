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

    @discardableResult
    public func createProfile(
        name: String,
        icon: String = "briefcase.fill",
        themeColorHex: String = "#BF5AF2",
        deviceProfile: AppleDeviceProfile? = nil
    ) -> BrowserProfile {
        let realisticPool: [AppleDeviceProfile] = [
            .iPadProM4_13,
            .iPadAirM2_11,
            .macBookProM3Max_16,
            .iPhone15ProMax_A17,
            .macBookAirM2_13,
            .iPadMini6_A15
        ]
        let chosenDevice = deviceProfile ?? (realisticPool.randomElement() ?? .iPadProM4_13)
        let freshTab = BrowserTab()
        let newProfile = BrowserProfile(
            id: UUID(),
            name: name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "New Profile" : name,
            icon: icon,
            themeColorHex: themeColorHex,
            deviceProfile: chosenDevice,
            sessionSeed: Int.random(in: 100000...999999),
            buildIndex: Int.random(in: 0...4),
            tabs: [freshTab],
            activeTabID: freshTab.id
        )
        profiles.append(newProfile)
        saveProfiles()
        return newProfile
    }

    public func switchProfile(to id: UUID, privacyProfile: PrivacyProfile? = nil) {
        guard let target = profiles.first(where: { $0.id == id }) else { return }
        activeProfileID = id
        if let idx = profiles.firstIndex(where: { $0.id == id }) {
            profiles[idx].lastUsedAt = Date()
        }
        saveProfiles()

        if let privacyProfile = privacyProfile {
            privacyProfile.selectedDevice = target.deviceProfile
            privacyProfile.sessionSeed = target.sessionSeed
            privacyProfile.buildIndex = target.buildIndex
            privacyProfile.sessionDataStoreID = target.id
            privacyProfile.searchEngine = target.searchEngine
            privacyProfile.customUserAgent = target.customUserAgent
        }
    }

    public func saveCurrentTabs(tabs: [BrowserTab], activeTabID: UUID) {
        guard let index = profiles.firstIndex(where: { $0.id == activeProfileID }) else { return }
        profiles[index].tabs = tabs.isEmpty ? [BrowserTab()] : tabs
        profiles[index].activeTabID = activeTabID
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
            .iPadProM4_13,
            .iPadAirM2_11,
            .macBookProM3Max_16,
            .iPhone15ProMax_A17,
            .macBookAirM2_13,
            .iPhone14_A15,
            .iPadMini6_A15
        ]
        let candidate = pool.filter { $0 != current }.randomElement() ?? .iPhone15ProMax_A17
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
                privacyProfile.selectedDevice = next.deviceProfile
                privacyProfile.sessionSeed = next.sessionSeed
                privacyProfile.buildIndex = next.buildIndex
                privacyProfile.sessionDataStoreID = next.id
                privacyProfile.searchEngine = next.searchEngine
                privacyProfile.customUserAgent = next.customUserAgent
            }
        }
        saveProfiles()
    }
}
