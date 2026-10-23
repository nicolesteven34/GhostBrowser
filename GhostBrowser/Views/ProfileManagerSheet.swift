import SwiftUI
import UIKit

private enum ProfileEditorTarget: Identifiable {
    case createNew
    case edit(BrowserProfile)

    var id: String {
        switch self {
        case .createNew:
            return "create_new_profile"
        case .edit(let profile):
            return "edit_profile_\(profile.id.uuidString)"
        }
    }
}

public struct ProfileManagerSheet: View {
    @ObservedObject var profileManager: ProfileManager
    @ObservedObject var privacyProfile: PrivacyProfile
    var onProfileSwitched: ((BrowserProfile) -> Void)?
    var onLaunchGhostDetect: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var searchQuery: String = ""
    @State private var editorTarget: ProfileEditorTarget? = nil
    @State private var profileToClear: BrowserProfile? = nil
    @State private var showClearAlert: Bool = false

    public init(
        profileManager: ProfileManager,
        privacyProfile: PrivacyProfile,
        onProfileSwitched: ((BrowserProfile) -> Void)? = nil,
        onLaunchGhostDetect: (() -> Void)? = nil
    ) {
        self.profileManager = profileManager
        self.privacyProfile = privacyProfile
        self.onProfileSwitched = onProfileSwitched
        self.onLaunchGhostDetect = onLaunchGhostDetect
    }

    private var filteredProfiles: [BrowserProfile] {
        let q = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return profileManager.profiles }
        return profileManager.profiles.filter { p in
            p.name.lowercased().contains(q) ||
            p.deviceProfile.rawValue.lowercased().contains(q) ||
            p.proxyDetectedIP.lowercased().contains(q) ||
            p.proxyDetectedISP.lowercased().contains(q) ||
            p.proxyDetectedCity.lowercased().contains(q) ||
            p.proxyHost.lowercased().contains(q)
        }
    }

    public var body: some View {
        NavigationStack {
            List {
                // MARK: - Top Create Profile Banner
                Section {
                    Button(action: {
                        editorTarget = .createNew
                    }) {
                        HStack(spacing: 12) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 44, height: 44)
                                .background(
                                    LinearGradient(
                                        colors: [Color.blue, Color.purple],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 11))

                            VStack(alignment: .leading, spacing: 3) {
                                Text("Create New Isolated Profile")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.primary)
                                Text("Configure Device Persona, Hardware Seed & SOCKS5 / HTTP Proxy")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.borderless)
                }

                // MARK: - Active Session Monitor Card
                Section(header: Text("Active Session Monitor & Persona")) {
                    let active = profileManager.activeProfile
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 14) {
                            Image(systemName: active.icon)
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(width: 48, height: 48)
                                .background(Color(hex: active.themeColorHex))
                                .clipShape(RoundedRectangle(cornerRadius: 12))

                            VStack(alignment: .leading, spacing: 3) {
                                HStack {
                                    Text(active.name)
                                        .font(.headline)
                                        .fontWeight(.bold)
                                    Spacer()
                                    Text("ACTIVE SESSION")
                                        .font(.system(size: 10, weight: .bold))
                                        .padding(.horizontal, 7)
                                        .padding(.vertical, 3)
                                        .background(Color.green.opacity(0.18))
                                        .foregroundColor(.green)
                                        .cornerRadius(6)
                                }

                                Text(active.deviceProfile.rawValue)
                                    .font(.caption)
                                    .foregroundColor(.secondary)

                                HStack(spacing: 6) {
                                    Text("\(active.deviceProfile.cpuCores) Cores • \(active.deviceProfile.ramGB)GB RAM • \(active.deviceProfile.webglRendererVariant(seed: active.sessionSeed))")
                                        .font(.system(size: 10, design: .monospaced))
                                        .foregroundColor(.secondary)
                                }
                            }
                        }

                        // Session Monitor Egress Indicator (IP • ISP • Type • City, State)
                        HStack(spacing: 8) {
                            Image(systemName: active.proxyEnabled ? "lock.shield.fill" : "globe.americas.fill")
                                .foregroundColor(active.proxyEnabled ? .green : .secondary)
                                .font(.system(size: 13, weight: .semibold))
                            Text(active.sessionMonitorIndicatorText)
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .foregroundColor(active.proxyEnabled ? .green : .secondary)
                                .lineLimit(2)
                            Spacer()
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(active.proxyEnabled ? Color.green.opacity(0.10) : Color(.systemGray6))
                        .cornerRadius(8)

                        // WebRTC mDNS & Seed Telemetry (No comma in seed)
                        HStack(spacing: 8) {
                            Text("Seed #\(String(active.sessionSeed))")
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundColor(.secondary)
                            Text("•")
                                .font(.system(size: 8))
                                .foregroundColor(.secondary)
                            Text("mDNS: \(String(active.mDnsHostname.prefix(18)))….local")
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("10.00 GB Storage")
                                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                .foregroundColor(.blue)
                        }

                        // Quick Actions for Active Profile (All .buttonStyle(.borderless) to prevent List tap collision)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                Button(action: {
                                    editorTarget = .edit(active)
                                }) {
                                    HStack(spacing: 5) {
                                        Image(systemName: "network.badge.shield.half.filled")
                                            .font(.system(size: 12, weight: .bold))
                                        Text(active.proxyEnabled ? "Edit Proxy / Profile" : "Add SOCKS5 / HTTP Proxy")
                                            .font(.system(size: 12, weight: .bold))
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 7)
                                    .background(active.proxyEnabled ? Color.green : Color.blue)
                                    .foregroundColor(.white)
                                    .cornerRadius(8)
                                }
                                .buttonStyle(.borderless)

                                Button(action: {
                                    profileManager.rotateProfileSeed(id: active.id, privacyProfile: privacyProfile)
                                }) {
                                    HStack(spacing: 5) {
                                        Image(systemName: "arrow.triangle.2.circlepath")
                                            .font(.system(size: 12, weight: .semibold))
                                        Text("New Seed")
                                            .font(.system(size: 12, weight: .semibold))
                                    }
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 7)
                                    .background(Color(hex: active.themeColorHex).opacity(0.16))
                                    .foregroundColor(Color(hex: active.themeColorHex))
                                    .cornerRadius(8)
                                }
                                .buttonStyle(.borderless)

                                Button(action: {
                                    profileManager.regenerateProfileDevice(id: active.id, privacyProfile: privacyProfile)
                                }) {
                                    HStack(spacing: 5) {
                                        Image(systemName: "sparkles")
                                            .font(.system(size: 12, weight: .semibold))
                                        Text("Switch Device")
                                            .font(.system(size: 12, weight: .semibold))
                                    }
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 7)
                                    .background(Color.purple.opacity(0.16))
                                    .foregroundColor(.purple)
                                    .cornerRadius(8)
                                }
                                .buttonStyle(.borderless)

                                if let onLaunchGhostDetect = onLaunchGhostDetect {
                                    Button(action: {
                                        dismiss()
                                        onLaunchGhostDetect()
                                    }) {
                                        HStack(spacing: 5) {
                                            Image(systemName: "checkmark.shield.fill")
                                                .font(.system(size: 12, weight: .semibold))
                                            Text("Launch FlagMeter")
                                                .font(.system(size: 12, weight: .semibold))
                                        }
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 7)
                                        .background(Color.teal.opacity(0.16))
                                        .foregroundColor(.teal)
                                        .cornerRadius(8)
                                    }
                                    .buttonStyle(.borderless)
                                }
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }

                // MARK: - All Profiles List
                Section(header: Text("All Isolated Profiles (\(filteredProfiles.count))")) {
                    ForEach(filteredProfiles) { profile in
                        let isActive = (profile.id == profileManager.activeProfileID)

                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 12) {
                                Image(systemName: profile.icon)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.white)
                                    .frame(width: 38, height: 38)
                                    .background(Color(hex: profile.themeColorHex))
                                    .clipShape(RoundedRectangle(cornerRadius: 10))

                                VStack(alignment: .leading, spacing: 2) {
                                    HStack(spacing: 6) {
                                        Text(profile.name)
                                            .font(.system(size: 15, weight: .bold))
                                            .foregroundColor(.primary)

                                        if isActive {
                                            Text("ACTIVE")
                                                .font(.system(size: 9, weight: .bold))
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background(Color.green.opacity(0.18))
                                                .foregroundColor(.green)
                                                .cornerRadius(4)
                                        }
                                    }

                                    Text("\(shortDevice(profile.deviceProfile.rawValue)) • \(profile.deviceProfile.cpuCores)C/\(profile.deviceProfile.ramGB)GB • \(profile.tabs.count) tab\(profile.tabs.count == 1 ? "" : "s")")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }

                                Spacer()

                                // Launch / Switch Button
                                Button(action: {
                                    if !isActive {
                                        onProfileSwitched?(profile)
                                    }
                                    dismiss()
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: isActive ? "safari.fill" : "play.fill")
                                            .font(.system(size: 11, weight: .bold))
                                        Text(isActive ? "Open" : "Launch")
                                            .font(.system(size: 12, weight: .bold))
                                    }
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(isActive ? Color.green.opacity(0.16) : Color.blue)
                                    .foregroundColor(isActive ? .green : .white)
                                    .cornerRadius(8)
                                }
                                .buttonStyle(.borderless)
                            }

                            // Egress IP + ISP + Type + State Indicator Pill on Every Profile Card
                            HStack(spacing: 6) {
                                Image(systemName: profile.proxyEnabled ? "lock.shield.fill" : "network")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(profile.proxyEnabled ? .green : .secondary)

                                Text(profile.sessionMonitorIndicatorText)
                                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                                    .foregroundColor(profile.proxyEnabled ? .green : .secondary)
                                    .lineLimit(1)

                                Spacer()

                                Button(action: {
                                    editorTarget = .edit(profile)
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "slider.horizontal.3")
                                            .font(.system(size: 10, weight: .bold))
                                        Text(profile.proxyEnabled ? "Proxy / Edit" : "Add Proxy")
                                            .font(.system(size: 11, weight: .semibold))
                                    }
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(Color(.systemGray5))
                                    .foregroundColor(.primary)
                                    .cornerRadius(6)
                                }
                                .buttonStyle(.borderless)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(profile.proxyEnabled ? Color.green.opacity(0.08) : Color(.systemGray6))
                            .cornerRadius(7)
                        }
                        .padding(.vertical, 4)
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            if profileManager.profiles.count > 1 {
                                Button(role: .destructive) {
                                    profileManager.deleteProfile(id: profile.id, privacyProfile: privacyProfile)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }

                            Button {
                                profileToClear = profile
                                showClearAlert = true
                            } label: {
                                Label("Clear Data", systemImage: "eraser.line.dashed")
                            }
                            .tint(.orange)

                            Button {
                                _ = profileManager.cloneProfile(id: profile.id)
                            } label: {
                                Label("Clone", systemImage: "doc.on.doc")
                            }
                            .tint(.purple)

                            Button {
                                editorTarget = .edit(profile)
                            } label: {
                                Label("Edit & Proxy", systemImage: "pencil")
                            }
                            .tint(.blue)
                        }
                    }
                }
            }
            .searchable(text: $searchQuery, prompt: "Search profiles, IP, ISP, city, or device...")
            .navigationTitle("FlagMeter Browser Profiles")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: {
                        editorTarget = .createNew
                    }) {
                        Label("New Profile", systemImage: "plus.circle.fill")
                            .fontWeight(.semibold)
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .sheet(item: $editorTarget) { target in
                switch target {
                case .createNew:
                    ProfileEditorSheet(
                        profileManager: profileManager,
                        privacyProfile: privacyProfile,
                        existingProfile: nil,
                        onSaved: { savedProfile, wasCreated in
                            editorTarget = nil
                            if wasCreated {
                                onProfileSwitched?(savedProfile)
                                dismiss()
                            }
                        }
                    )
                    .id(target.id)
                case .edit(let existing):
                    // Always pull latest version of profile from profileManager
                    let latest = profileManager.profiles.first(where: { $0.id == existing.id }) ?? existing
                    ProfileEditorSheet(
                        profileManager: profileManager,
                        privacyProfile: privacyProfile,
                        existingProfile: latest,
                        onSaved: { _, _ in
                            editorTarget = nil
                        }
                    )
                    .id(target.id)
                }
            }
            .alert("Clear Profile Data?", isPresented: $showClearAlert, presenting: profileToClear) { profile in
                Button("Clear Cookies & Cache", role: .destructive) {
                    profileManager.clearProfileData(id: profile.id)
                }
                Button("Cancel", role: .cancel) {}
            } message: { profile in
                Text("This will immediately delete all saved cookies, IndexedDB, history, and local cache for '\(profile.name)'.")
            }
        }
    }

    private func shortDevice(_ raw: String) -> String {
        if raw.contains("Native Host") { return "Native Host" }
        if raw.contains("iPhone 18 Pro Max") { return "iPhone 18 PM" }
        if raw.contains("iPhone 17 Pro Max") { return "iPhone 17 PM" }
        if raw.contains("iPad Pro 13") { return "iPad Pro 13\"" }
        if raw.contains("iPad Air 11") { return "iPad Air 11\"" }
        if raw.contains("iPad Mini 6") { return "iPad Mini 6" }
        if raw.contains("iPhone 16 Pro Max") { return "iPhone 16 PM" }
        if raw.contains("iPhone 16") { return "iPhone 16" }
        if raw.contains("iPhone 15 Pro Max") { return "iPhone 15 PM" }
        if raw.contains("iPhone 14") { return "iPhone 14" }
        if raw.contains("MacBook Pro 16") { return "MacBook Pro" }
        if raw.contains("MacBook Air 13") { return "MacBook Air" }
        return "Apple Device"
    }
}

// MARK: - Full Create / Edit Profile & Proxy Studio Sheet
public struct ProfileEditorSheet: View {
    @ObservedObject var profileManager: ProfileManager
    @ObservedObject var privacyProfile: PrivacyProfile
    let existingProfile: BrowserProfile?
    var onSaved: (BrowserProfile, Bool) -> Void

    @Environment(\.dismiss) private var dismiss

    // Identity Fields
    @State private var name: String
    @State private var icon: String
    @State private var themeColorHex: String
    @State private var deviceProfile: AppleDeviceProfile
    @State private var sessionSeed: Int

    // Proxy Fields (Port stored as both plain String without comma and Int)
    @State private var proxyEnabled: Bool
    @State private var proxyType: String
    @State private var proxyHost: String
    @State private var proxyPort: Int
    @State private var proxyPortText: String
    @State private var proxyUsername: String
    @State private var proxyPassword: String
    @State private var showPlainPassword: Bool = false
    @State private var proxyDetectedIP: String
    @State private var proxyDetectedCity: String
    @State private var proxyDetectedRegion: String
    @State private var proxyDetectedCountry: String
    @State private var proxyDetectedISP: String
    @State private var proxyDetectedASN: String
    @State private var proxyDetectedTimezone: String
    @State private var proxyUsageType: String
    @State private var proxyConnectionType: String
    @State private var enableDnsProxyMatching: Bool
    @State private var enableIpChangeKillSwitch: Bool

    // Mock Location Synced with Proxy
    @State private var mockLocationEnabled: Bool
    @State private var mockLatitude: Double
    @State private var mockLongitude: Double
    @State private var mockLocationName: String

    // Live Proxy Verification State
    @State private var isTestingProxy: Bool = false
    @State private var proxyTestStatus: String = ""
    @State private var proxyTestError: Bool = false
    @State private var isApplyingSmartPaste: Bool = false

    private var isCreatingNew: Bool {
        existingProfile == nil
    }

    public init(
        profileManager: ProfileManager,
        privacyProfile: PrivacyProfile,
        existingProfile: BrowserProfile?,
        onSaved: @escaping (BrowserProfile, Bool) -> Void
    ) {
        self.profileManager = profileManager
        self.privacyProfile = privacyProfile
        self.existingProfile = existingProfile
        self.onSaved = onSaved

        if let existing = existingProfile {
            // Auto-sanitize credentials in case a full proxy string was previously pasted into Username/Host/Password
            let sanitized = ProxyService.shared.sanitizeCredentials(
                type: existing.proxyType,
                host: existing.proxyHost,
                port: existing.proxyPort,
                username: existing.proxyUsername,
                password: existing.proxyPassword
            )
            _name = State(initialValue: existing.name)
            _icon = State(initialValue: existing.icon)
            _themeColorHex = State(initialValue: existing.themeColorHex)
            _deviceProfile = State(initialValue: existing.deviceProfile)
            _sessionSeed = State(initialValue: existing.sessionSeed)
            _proxyEnabled = State(initialValue: existing.proxyEnabled)
            _proxyType = State(initialValue: sanitized.type)
            _proxyHost = State(initialValue: sanitized.host)
            _proxyPort = State(initialValue: sanitized.port)
            _proxyPortText = State(initialValue: String(sanitized.port))
            _proxyUsername = State(initialValue: sanitized.username)
            _proxyPassword = State(initialValue: sanitized.password)
            _proxyDetectedIP = State(initialValue: existing.proxyDetectedIP)
            _proxyDetectedCity = State(initialValue: existing.proxyDetectedCity)
            _proxyDetectedRegion = State(initialValue: existing.proxyDetectedRegion)
            _proxyDetectedCountry = State(initialValue: existing.proxyDetectedCountry)
            _proxyDetectedISP = State(initialValue: existing.proxyDetectedISP)
            _proxyDetectedASN = State(initialValue: existing.proxyDetectedASN)
            _proxyDetectedTimezone = State(initialValue: existing.proxyDetectedTimezone)
            _proxyUsageType = State(initialValue: existing.proxyUsageType)
            _proxyConnectionType = State(initialValue: existing.proxyConnectionType)
            _enableDnsProxyMatching = State(initialValue: existing.enableDnsProxyMatching)
            _enableIpChangeKillSwitch = State(initialValue: existing.enableIpChangeKillSwitch)
            _mockLocationEnabled = State(initialValue: existing.mockLocationEnabled)
            _mockLatitude = State(initialValue: existing.mockLatitude)
            _mockLongitude = State(initialValue: existing.mockLongitude)
            _mockLocationName = State(initialValue: existing.mockLocationName)
        } else {
            _name = State(initialValue: "Profile \(profileManager.profiles.count + 1)")
            _icon = State(initialValue: BrowserProfile.availableIcons.randomElement() ?? "briefcase.fill")
            _themeColorHex = State(initialValue: BrowserProfile.availableColors.randomElement() ?? "#0A84FF")
            _deviceProfile = State(initialValue: profileManager.nextRecommendedDeviceProfile())
            _sessionSeed = State(initialValue: Int.random(in: 100000...999999))
            _proxyEnabled = State(initialValue: false)
            _proxyType = State(initialValue: "SOCKS5")
            _proxyHost = State(initialValue: "")
            _proxyPort = State(initialValue: 1080)
            _proxyPortText = State(initialValue: "1080")
            _proxyUsername = State(initialValue: "")
            _proxyPassword = State(initialValue: "")
            _proxyDetectedIP = State(initialValue: "")
            _proxyDetectedCity = State(initialValue: "")
            _proxyDetectedRegion = State(initialValue: "")
            _proxyDetectedCountry = State(initialValue: "")
            _proxyDetectedISP = State(initialValue: "")
            _proxyDetectedASN = State(initialValue: "")
            _proxyDetectedTimezone = State(initialValue: "")
            _proxyUsageType = State(initialValue: "Residential")
            _proxyConnectionType = State(initialValue: "Cable/Fiber")
            _enableDnsProxyMatching = State(initialValue: true)
            _enableIpChangeKillSwitch = State(initialValue: true)
            _mockLocationEnabled = State(initialValue: false)
            _mockLatitude = State(initialValue: 37.7749)
            _mockLongitude = State(initialValue: -122.4194)
            _mockLocationName = State(initialValue: "San Francisco, CA")
        }
    }

    public var body: some View {
        NavigationStack {
            Form {
                // MARK: - 1. Profile Name & Device Persona
                Section(header: Text("1. Profile Identity & Hardware Persona")) {
                    HStack {
                        Text("Profile Name")
                            .foregroundColor(.secondary)
                        Spacer()
                        TextField("e.g., US Residential #1", text: $name)
                            .multilineTextAlignment(.trailing)
                            .fontWeight(.semibold)
                    }

                    Picker("Device Persona", selection: $deviceProfile) {
                        ForEach(AppleDeviceProfile.allCases) { dev in
                            Text(dev.rawValue).tag(dev)
                        }
                    }

                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Hardware Signature Preview")
                                .font(.caption)
                                .fontWeight(.semibold)
                            Text("\(deviceProfile.cpuCores) Cores • \(deviceProfile.ramGB) GB RAM • \(deviceProfile.webglRendererVariant(seed: sessionSeed)) • \(String(deviceProfile.screenWidth))×\(String(deviceProfile.screenHeight))")
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundColor(.secondary)
                            Text("Storage Quota: 10.00 GB • APIs: PaymentRequest + WebShare • Seed #\(String(sessionSeed))")
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundColor(.blue)
                        }
                        Spacer()
                        Button(action: {
                            sessionSeed = Int.random(in: 100000...999999)
                        }) {
                            Image(systemName: "dice.fill")
                                .font(.system(size: 16))
                                .foregroundColor(.purple)
                        }
                        .buttonStyle(.borderless)
                    }
                }

                // MARK: - 2. Inline SOCKS5 / HTTP Proxy Configuration
                Section(header: Text("2. SOCKS5 / HTTP Proxy & ISP Egress")) {
                    Toggle(isOn: $proxyEnabled) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Route Profile via SOCKS5 / HTTP Proxy")
                                .fontWeight(.semibold)
                            Text("Isolates TCP, HTTP/3 QUIC, WebRTC UDP srflx/relay & ISP DNS per profile")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }

                    // One-Tap Smart Paste Button
                    Button(action: {
                        if let clip = UIPasteboard.general.string,
                           applyParsedProxyString(clip, autoVerify: true) {
                            // Handled by applyParsedProxyString
                        } else {
                            proxyTestError = true
                            proxyTestStatus = "Clipboard doesn't match host:port:user:pass or user:pass@host:port"
                        }
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "doc.on.clipboard.fill")
                            Text("Smart Paste Proxy (host:port:user:pass)")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.borderless)
                    .tint(.blue)

                    Picker("Proxy Protocol", selection: $proxyType) {
                        Text("SOCKS5").tag("SOCKS5")
                        Text("HTTP / CONNECT").tag("HTTP")
                    }
                    .pickerStyle(.segmented)

                    // Host / IP Row (auto-splits if user pastes full proxy string here)
                    HStack {
                        Text("Host / IP")
                            .frame(width: 85, alignment: .leading)
                            .foregroundColor(.secondary)
                        TextField("mobile.lightningproxies.net", text: $proxyHost)
                            .font(.system(.body, design: .monospaced))
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .onChange(of: proxyHost) { newVal in
                                guard !isApplyingSmartPaste else { return }
                                if newVal.contains(":"), applyParsedProxyString(newVal, autoVerify: false) {
                                    return
                                }
                                if !newVal.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                    proxyEnabled = true
                                }
                            }
                        if !proxyHost.isEmpty {
                            Button(action: { proxyHost = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.secondary)
                            }
                            .buttonStyle(.borderless)
                        }
                    }

                    // Port Row (Plain String binding — NEVER inserts a comma like 1,080!)
                    HStack {
                        Text("Port")
                            .frame(width: 85, alignment: .leading)
                            .foregroundColor(.secondary)
                        TextField("1080", text: $proxyPortText)
                            .font(.system(.body, design: .monospaced))
                            .keyboardType(.numbersAndPunctuation)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .onChange(of: proxyPortText) { newVal in
                                guard !isApplyingSmartPaste else { return }
                                if newVal.contains(":"), applyParsedProxyString(newVal, autoVerify: false) {
                                    return
                                }
                                let digits = newVal.filter { $0.isNumber }
                                if digits != newVal {
                                    proxyPortText = digits
                                }
                                if let p = Int(digits), p > 0 && p <= 65535 {
                                    proxyPort = p
                                }
                            }
                    }

                    // Username Row (auto-splits if user pastes host:port:user:pass or host:port:user here)
                    HStack {
                        Text("Username")
                            .frame(width: 85, alignment: .leading)
                            .foregroundColor(.secondary)
                        TextField("Optional username", text: $proxyUsername)
                            .font(.system(.body, design: .monospaced))
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .onChange(of: proxyUsername) { newVal in
                                guard !isApplyingSmartPaste else { return }
                                if newVal.contains(":") {
                                    if applyParsedProxyString(newVal, autoVerify: false) {
                                        return
                                    }
                                    // Also check 3-part `host:port:user` or 2-part `user:pass`
                                    let sanitized = ProxyService.shared.sanitizeCredentials(
                                        type: proxyType,
                                        host: proxyHost,
                                        port: proxyPort,
                                        username: newVal,
                                        password: proxyPassword
                                    )
                                    if sanitized.username != newVal {
                                        isApplyingSmartPaste = true
                                        proxyHost = sanitized.host
                                        proxyPort = sanitized.port
                                        proxyPortText = String(sanitized.port)
                                        proxyUsername = sanitized.username
                                        if !sanitized.password.isEmpty {
                                            proxyPassword = sanitized.password
                                        }
                                        proxyEnabled = true
                                        isApplyingSmartPaste = false
                                    }
                                }
                            }
                        if !proxyUsername.isEmpty {
                            Button(action: { proxyUsername = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.secondary)
                            }
                            .buttonStyle(.borderless)
                        }
                    }

                    // Password Row with Show/Hide Eye Toggle + Auto-Split if full string pasted
                    HStack {
                        Text("Password")
                            .frame(width: 85, alignment: .leading)
                            .foregroundColor(.secondary)
                        Group {
                            if showPlainPassword {
                                TextField("Optional password", text: $proxyPassword)
                                    .font(.system(.body, design: .monospaced))
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            } else {
                                SecureField("Optional password", text: $proxyPassword)
                                    .font(.system(.body, design: .monospaced))
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            }
                        }
                        .onChange(of: proxyPassword) { newVal in
                            guard !isApplyingSmartPaste else { return }
                            if newVal.contains(":"), let parsed = ProxyService.shared.parseSmartProxy(newVal), !parsed.password.isEmpty {
                                isApplyingSmartPaste = true
                                if proxyHost.isEmpty { proxyHost = parsed.host }
                                proxyPort = parsed.port
                                proxyPortText = String(parsed.port)
                                if proxyUsername.isEmpty { proxyUsername = parsed.username }
                                proxyPassword = parsed.password
                                proxyEnabled = true
                                isApplyingSmartPaste = false
                            }
                        }
                        if !proxyPassword.isEmpty {
                            Button(action: { proxyPassword = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.secondary)
                            }
                            .buttonStyle(.borderless)
                        }
                        Button(action: { showPlainPassword.toggle() }) {
                            Image(systemName: showPlainPassword ? "eye.slash.fill" : "eye.fill")
                                .foregroundColor(.secondary)
                        }
                        .buttonStyle(.borderless)
                    }

                    Toggle("DNS Proxy Matching & DNSSEC Chain", isOn: $enableDnsProxyMatching)
                        .font(.subheadline)
                    Toggle("Pre-Transmission IP Change Kill-Switch", isOn: $enableIpChangeKillSwitch)
                        .font(.subheadline)

                    // Verify Proxy Button
                    Button(action: {
                        verifyProxyConnection()
                    }) {
                        HStack(spacing: 8) {
                            if isTestingProxy {
                                ProgressView()
                            } else {
                                Image(systemName: "checkmark.shield.fill")
                                    .foregroundColor(.green)
                            }
                            Text(isTestingProxy ? "Testing Tunnel & Resolving ISP / Geo..." : "Verify Proxy & Auto-Sync ISP / Geo / Timezone")
                                .fontWeight(.bold)
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.borderless)
                    .disabled(isTestingProxy || proxyHost.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    if !proxyTestStatus.isEmpty {
                        Text(proxyTestStatus)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(proxyTestError ? .red : .green)
                    }

                    // Verified Egress Telemetry Card (Showing IP + ISP + Type + State)
                    if !proxyDetectedIP.isEmpty {
                        VStack(alignment: .leading, spacing: 5) {
                            HStack {
                                Image(systemName: "checkmark.seal.fill")
                                    .foregroundColor(.green)
                                Text("\(proxyDetectedIP)\(!proxyDetectedISP.isEmpty ? " • \(proxyDetectedISP)" : "")")
                                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                                    .foregroundColor(.green)
                                Spacer()
                            }
                            Text("\(proxyUsageType) (\(proxyConnectionType)) • \(proxyDetectedCity)\(!proxyDetectedRegion.isEmpty ? ", \(proxyDetectedRegion)" : "") \(proxyDetectedCountry) • TZ: \(proxyDetectedTimezone)")
                                .font(.caption)
                                .foregroundColor(.primary)
                            if !proxyDetectedASN.isEmpty {
                                Text("ASN: \(proxyDetectedASN) • GPS Auto-Synced (\(String(format: "%.4f", mockLatitude)), \(String(format: "%.4f", mockLongitude)))")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }

                // MARK: - 3. Color & Icon Customization
                Section(header: Text("3. Badge Color & Icon")) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(BrowserProfile.availableColors, id: \.self) { hex in
                                Circle()
                                    .fill(Color(hex: hex))
                                    .frame(width: 32, height: 32)
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white, lineWidth: themeColorHex == hex ? 3 : 0)
                                    )
                                    .shadow(color: themeColorHex == hex ? Color.black.opacity(0.25) : .clear, radius: 4)
                                    .onTapGesture {
                                        themeColorHex = hex
                                    }
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(BrowserProfile.availableIcons, id: \.self) { ic in
                                Image(systemName: ic)
                                    .font(.system(size: 18))
                                    .foregroundColor(icon == ic ? .white : .secondary)
                                    .frame(width: 36, height: 36)
                                    .background(icon == ic ? Color(hex: themeColorHex) : Color(.systemGray5))
                                    .clipShape(Circle())
                                    .onTapGesture {
                                        icon = ic
                                    }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle(isCreatingNew ? "Create Profile & Proxy" : "Edit Profile & Proxy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isCreatingNew ? "Create & Launch" : "Save Changes") {
                        saveProfileAction()
                    }
                    .fontWeight(.bold)
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    @discardableResult
    private func applyParsedProxyString(_ raw: String, autoVerify: Bool) -> Bool {
        guard let parsed = ProxyService.shared.parseSmartProxy(raw) else { return false }
        isApplyingSmartPaste = true
        proxyType = parsed.proxyType
        proxyHost = parsed.host
        proxyPort = parsed.port
        proxyPortText = String(parsed.port)
        if !parsed.username.isEmpty {
            proxyUsername = parsed.username
        }
        if !parsed.password.isEmpty {
            proxyPassword = parsed.password
        }
        proxyEnabled = true
        proxyTestError = false
        proxyTestStatus = "✓ Parsed \(parsed.host):\(String(parsed.port))\(parsed.username.isEmpty ? "" : " (Auth ready)")"
        isApplyingSmartPaste = false
        if autoVerify {
            verifyProxyConnection()
        }
        return true
    }

    private func verifyProxyConnection() {
        let sanitized = ProxyService.shared.sanitizeCredentials(
            type: proxyType,
            host: proxyHost,
            port: Int(proxyPortText.filter { $0.isNumber }) ?? proxyPort,
            username: proxyUsername,
            password: proxyPassword
        )
        guard !sanitized.host.isEmpty else { return }

        isApplyingSmartPaste = true
        proxyType = sanitized.type
        proxyHost = sanitized.host
        proxyPort = sanitized.port
        proxyPortText = String(sanitized.port)
        proxyUsername = sanitized.username
        proxyPassword = sanitized.password
        isApplyingSmartPaste = false

        isTestingProxy = true
        proxyTestStatus = ""
        proxyTestError = false

        Task {
            let res = await ProxyService.shared.testProxyAsync(
                type: sanitized.type,
                host: sanitized.host,
                port: sanitized.port,
                username: sanitized.username,
                password: sanitized.password
            )
            await MainActor.run {
                isTestingProxy = false
                if res.success {
                    isApplyingSmartPaste = true
                    if !res.resolvedType.isEmpty { proxyType = res.resolvedType }
                    if !res.resolvedHost.isEmpty { proxyHost = res.resolvedHost }
                    if res.resolvedPort > 0 {
                        proxyPort = res.resolvedPort
                        proxyPortText = String(res.resolvedPort)
                    }
                    proxyUsername = res.resolvedUsername
                    proxyPassword = res.resolvedPassword
                    isApplyingSmartPaste = false

                    proxyEnabled = true
                    proxyDetectedIP = res.ip
                    proxyDetectedCity = res.city
                    proxyDetectedRegion = res.regionCode
                    proxyDetectedCountry = res.country
                    proxyDetectedISP = res.isp
                    proxyDetectedASN = res.asn
                    proxyDetectedTimezone = res.timezoneId
                    proxyUsageType = res.usageType
                    proxyConnectionType = res.connectionType
                    mockLocationEnabled = true
                    mockLatitude = res.latitude
                    mockLongitude = res.longitude
                    mockLocationName = "\(res.city), \(res.country)"
                    proxyTestError = false
                    proxyTestStatus = "✓ Verified \(res.ip) • \(res.isp) • \(res.compactTypeBadge)"
                } else {
                    proxyTestError = true
                    proxyTestStatus = "✗ \(res.errorMessage)"
                }
            }
        }
    }

    private func saveProfileAction() {
        let sanitized = ProxyService.shared.sanitizeCredentials(
            type: proxyType,
            host: proxyHost,
            port: Int(proxyPortText.filter { $0.isNumber }) ?? proxyPort,
            username: proxyUsername,
            password: proxyPassword
        )
        let hasHost = !sanitized.host.isEmpty
        let effectiveProxyEnabled = proxyEnabled && hasHost

        // If host/port changed compared to existing profile, clear stale detected IP so it re-verifies cleanly
        var detIP = proxyDetectedIP
        var detISP = proxyDetectedISP
        var detCity = proxyDetectedCity
        var detRegion = proxyDetectedRegion
        var detCountry = proxyDetectedCountry
        var detASN = proxyDetectedASN
        var detTZ = proxyDetectedTimezone
        if let existing = existingProfile,
           existing.proxyHost != sanitized.host || existing.proxyPort != sanitized.port || existing.proxyUsername != sanitized.username {
            if !proxyTestStatus.hasPrefix("✓ Verified") {
                detIP = ""
                detISP = ""
            }
        }

        let targetProfile: BrowserProfile
        let wasCreated: Bool

        if var updated = existingProfile {
            updated.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
            updated.icon = icon
            updated.themeColorHex = themeColorHex
            updated.deviceProfile = deviceProfile
            updated.sessionSeed = sessionSeed
            updated.proxyEnabled = effectiveProxyEnabled
            updated.proxyType = sanitized.type
            updated.proxyHost = sanitized.host
            updated.proxyPort = sanitized.port
            updated.proxyUsername = sanitized.username
            updated.proxyPassword = sanitized.password
            updated.proxyDetectedIP = detIP
            updated.proxyDetectedCity = detCity
            updated.proxyDetectedRegion = detRegion
            updated.proxyDetectedCountry = detCountry
            updated.proxyDetectedISP = detISP
            updated.proxyDetectedASN = detASN
            updated.proxyDetectedTimezone = detTZ
            updated.proxyUsageType = proxyUsageType
            updated.proxyConnectionType = proxyConnectionType
            updated.enableDnsProxyMatching = enableDnsProxyMatching
            updated.enableIpChangeKillSwitch = enableIpChangeKillSwitch
            updated.mockLocationEnabled = mockLocationEnabled
            updated.mockLatitude = mockLatitude
            updated.mockLongitude = mockLongitude
            updated.mockLocationName = mockLocationName

            profileManager.updateProfile(updated, privacyProfile: privacyProfile)
            targetProfile = updated
            wasCreated = false
        } else {
            let created = profileManager.createProfile(
                name: name,
                icon: icon,
                themeColorHex: themeColorHex,
                deviceProfile: deviceProfile,
                proxyEnabled: effectiveProxyEnabled,
                proxyType: sanitized.type,
                proxyHost: sanitized.host,
                proxyPort: sanitized.port,
                proxyUsername: sanitized.username,
                proxyPassword: sanitized.password,
                proxyDetectedIP: detIP,
                proxyDetectedCity: detCity,
                proxyDetectedRegion: detRegion,
                proxyDetectedCountry: detCountry,
                proxyDetectedISP: detISP,
                proxyDetectedASN: detASN,
                proxyDetectedTimezone: detTZ,
                proxyUsageType: proxyUsageType,
                proxyConnectionType: proxyConnectionType,
                enableDnsProxyMatching: enableDnsProxyMatching,
                enableIpChangeKillSwitch: enableIpChangeKillSwitch,
                mockLocationEnabled: mockLocationEnabled,
                mockLatitude: mockLatitude,
                mockLongitude: mockLongitude,
                mockLocationName: mockLocationName
            )
            targetProfile = created
            wasCreated = true
        }

        // If proxy is enabled and IP/ISP haven't been verified yet, auto-resolve in the background and update the profile & live session!
        if effectiveProxyEnabled && detIP.isEmpty {
            let pid = targetProfile.id
            Task {
                let res = await ProxyService.shared.testProxyAsync(
                    type: sanitized.type,
                    host: sanitized.host,
                    port: sanitized.port,
                    username: sanitized.username,
                    password: sanitized.password
                )
                if res.success {
                    await MainActor.run {
                        if var latest = profileManager.profiles.first(where: { $0.id == pid }) {
                            if !res.resolvedType.isEmpty { latest.proxyType = res.resolvedType }
                            latest.proxyDetectedIP = res.ip
                            latest.proxyDetectedCity = res.city
                            latest.proxyDetectedRegion = res.regionCode
                            latest.proxyDetectedCountry = res.country
                            latest.proxyDetectedISP = res.isp
                            latest.proxyDetectedASN = res.asn
                            latest.proxyDetectedTimezone = res.timezoneId
                            latest.proxyUsageType = res.usageType
                            latest.proxyConnectionType = res.connectionType
                            latest.mockLocationEnabled = true
                            latest.mockLatitude = res.latitude
                            latest.mockLongitude = res.longitude
                            latest.mockLocationName = "\(res.city), \(res.country)"
                            profileManager.updateProfile(latest, privacyProfile: privacyProfile)
                        }
                    }
                }
            }
        }

        onSaved(targetProfile, wasCreated)
    }
}
