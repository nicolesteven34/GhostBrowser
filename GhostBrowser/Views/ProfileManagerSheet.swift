import SwiftUI
import UIKit

public struct ProfileManagerSheet: View {
    @ObservedObject var profileManager: ProfileManager
    @ObservedObject var privacyProfile: PrivacyProfile
    var onProfileSwitched: ((BrowserProfile) -> Void)?
    var onLaunchGhostDetect: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var searchQuery: String = ""
    @State private var showEditorSheet: Bool = false
    @State private var editingProfile: BrowserProfile? = nil
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
                        editingProfile = nil
                        showEditorSheet = true
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
                    }
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

                        // WebRTC mDNS & Seed Telemetry
                        HStack(spacing: 8) {
                            Text("Seed #\(active.sessionSeed)")
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

                        // Quick Actions for Active Profile
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                Button(action: {
                                    editingProfile = active
                                    showEditorSheet = true
                                }) {
                                    Label(active.proxyEnabled ? "Edit Proxy / Profile" : "Add SOCKS5 / HTTP Proxy", systemImage: "network.badge.shield.half.filled")
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(active.proxyEnabled ? .green : .blue)

                                Button(action: {
                                    profileManager.rotateProfileSeed(id: active.id, privacyProfile: privacyProfile)
                                }) {
                                    Label("New Seed", systemImage: "arrow.triangle.2.circlepath")
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                }
                                .buttonStyle(.bordered)
                                .tint(Color(hex: active.themeColorHex))

                                Button(action: {
                                    profileManager.regenerateProfileDevice(id: active.id, privacyProfile: privacyProfile)
                                }) {
                                    Label("Switch Device", systemImage: "sparkles")
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                }
                                .buttonStyle(.bordered)
                                .tint(.purple)

                                if let onLaunchGhostDetect = onLaunchGhostDetect {
                                    Button(action: {
                                        dismiss()
                                        onLaunchGhostDetect()
                                    }) {
                                        Label("GhostDetect Lab", systemImage: "checkmark.shield.fill")
                                            .font(.caption)
                                            .fontWeight(.semibold)
                                    }
                                    .buttonStyle(.bordered)
                                    .tint(.teal)
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
                                .buttonStyle(.plain)
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
                                    editingProfile = profile
                                    showEditorSheet = true
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "slider.horizontal.3")
                                            .font(.system(size: 10, weight: .bold))
                                        Text(profile.proxyEnabled ? "Proxy / Edit" : "Add Proxy")
                                            .font(.system(size: 11, weight: .semibold))
                                    }
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color(.systemGray5))
                                    .foregroundColor(.primary)
                                    .cornerRadius(6)
                                }
                                .buttonStyle(.plain)
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
                                editingProfile = profile
                                showEditorSheet = true
                            } label: {
                                Label("Edit & Proxy", systemImage: "pencil")
                            }
                            .tint(.blue)
                        }
                    }
                }
            }
            .searchable(text: $searchQuery, prompt: "Search profiles, IP, ISP, city, or device...")
            .navigationTitle("Antidetect Browser Profiles")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: {
                        editingProfile = nil
                        showEditorSheet = true
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
            .sheet(isPresented: $showEditorSheet) {
                ProfileEditorSheet(
                    profileManager: profileManager,
                    privacyProfile: privacyProfile,
                    existingProfile: editingProfile,
                    onSaved: { savedProfile, wasCreated in
                        showEditorSheet = false
                        if wasCreated {
                            onProfileSwitched?(savedProfile)
                            dismiss()
                        }
                    }
                )
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
    var existingProfile: BrowserProfile?
    var onSaved: (BrowserProfile, Bool) -> Void

    @Environment(\.dismiss) private var dismiss

    // Identity Fields
    @State private var name: String = ""
    @State private var icon: String = "briefcase.fill"
    @State private var themeColorHex: String = "#0A84FF"
    @State private var deviceProfile: AppleDeviceProfile = .iPadProM4_13
    @State private var sessionSeed: Int = Int.random(in: 100000...999999)

    // Proxy Fields
    @State private var proxyEnabled: Bool = false
    @State private var proxyType: String = "SOCKS5"
    @State private var proxyHost: String = ""
    @State private var proxyPort: Int = 1080
    @State private var proxyUsername: String = ""
    @State private var proxyPassword: String = ""
    @State private var proxyDetectedIP: String = ""
    @State private var proxyDetectedCity: String = ""
    @State private var proxyDetectedRegion: String = ""
    @State private var proxyDetectedCountry: String = ""
    @State private var proxyDetectedISP: String = ""
    @State private var proxyDetectedASN: String = ""
    @State private var proxyDetectedTimezone: String = ""
    @State private var proxyUsageType: String = "Residential"
    @State private var proxyConnectionType: String = "Cable/Fiber"
    @State private var enableDnsProxyMatching: Bool = true
    @State private var enableIpChangeKillSwitch: Bool = true

    // Mock Location Synced with Proxy
    @State private var mockLocationEnabled: Bool = false
    @State private var mockLatitude: Double = 37.7749
    @State private var mockLongitude: Double = -122.4194
    @State private var mockLocationName: String = "San Francisco, CA"

    // Live Proxy Verification State
    @State private var isTestingProxy: Bool = false
    @State private var proxyTestStatus: String = ""
    @State private var proxyTestError: Bool = false

    private var isCreatingNew: Bool {
        existingProfile == nil
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
                            Text("\(deviceProfile.cpuCores) Cores • \(deviceProfile.ramGB) GB RAM • \(deviceProfile.webglRendererVariant(seed: sessionSeed)) • \(deviceProfile.screenWidth)×\(deviceProfile.screenHeight)")
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundColor(.secondary)
                            Text("Storage Quota: 10.00 GB • APIs: PaymentRequest + WebShare • Seed #\(sessionSeed)")
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
                           let parsed = ProxyService.shared.parseSmartProxy(clip) {
                            proxyType = parsed.proxyType
                            proxyHost = parsed.host
                            proxyPort = parsed.port
                            proxyUsername = parsed.username
                            proxyPassword = parsed.password
                            proxyEnabled = true
                            verifyProxyConnection()
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
                    .tint(.blue)

                    Picker("Proxy Protocol", selection: $proxyType) {
                        Text("SOCKS5").tag("SOCKS5")
                        Text("HTTP / CONNECT").tag("HTTP")
                    }
                    .pickerStyle(.segmented)

                    HStack {
                        Text("Host / IP")
                            .frame(width: 85, alignment: .leading)
                            .foregroundColor(.secondary)
                        TextField("resident.proxy-gateway.net", text: $proxyHost)
                            .font(.system(.body, design: .monospaced))
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .onChange(of: proxyHost) { newVal in
                                if !newVal.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                    proxyEnabled = true
                                }
                            }
                    }

                    HStack {
                        Text("Port")
                            .frame(width: 85, alignment: .leading)
                            .foregroundColor(.secondary)
                        TextField("1080", value: $proxyPort, format: .number)
                            .font(.system(.body, design: .monospaced))
                            .keyboardType(.numberPad)
                    }

                    HStack {
                        Text("Username")
                            .frame(width: 85, alignment: .leading)
                            .foregroundColor(.secondary)
                        TextField("Optional username", text: $proxyUsername)
                            .font(.system(.body, design: .monospaced))
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                    }

                    HStack {
                        Text("Password")
                            .frame(width: 85, alignment: .leading)
                            .foregroundColor(.secondary)
                        SecureField("Optional password", text: $proxyPassword)
                            .font(.system(.body, design: .monospaced))
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
            .onAppear {
                if let existing = existingProfile {
                    name = existing.name
                    icon = existing.icon
                    themeColorHex = existing.themeColorHex
                    deviceProfile = existing.deviceProfile
                    sessionSeed = existing.sessionSeed
                    proxyEnabled = existing.proxyEnabled
                    proxyType = existing.proxyType
                    proxyHost = existing.proxyHost
                    proxyPort = existing.proxyPort
                    proxyUsername = existing.proxyUsername
                    proxyPassword = existing.proxyPassword
                    proxyDetectedIP = existing.proxyDetectedIP
                    proxyDetectedCity = existing.proxyDetectedCity
                    proxyDetectedRegion = existing.proxyDetectedRegion
                    proxyDetectedCountry = existing.proxyDetectedCountry
                    proxyDetectedISP = existing.proxyDetectedISP
                    proxyDetectedASN = existing.proxyDetectedASN
                    proxyDetectedTimezone = existing.proxyDetectedTimezone
                    proxyUsageType = existing.proxyUsageType
                    proxyConnectionType = existing.proxyConnectionType
                    enableDnsProxyMatching = existing.enableDnsProxyMatching
                    enableIpChangeKillSwitch = existing.enableIpChangeKillSwitch
                    mockLocationEnabled = existing.mockLocationEnabled
                    mockLatitude = existing.mockLatitude
                    mockLongitude = existing.mockLongitude
                    mockLocationName = existing.mockLocationName
                } else {
                    name = "Profile \(profileManager.profiles.count + 1)"
                    icon = BrowserProfile.availableIcons.randomElement() ?? "briefcase.fill"
                    themeColorHex = BrowserProfile.availableColors.randomElement() ?? "#0A84FF"
                    deviceProfile = profileManager.nextRecommendedDeviceProfile()
                    sessionSeed = Int.random(in: 100000...999999)
                }
            }
        }
    }

    private func verifyProxyConnection() {
        let cleanHost = proxyHost.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanHost.isEmpty else { return }
        isTestingProxy = true
        proxyTestStatus = ""
        proxyTestError = false

        let pType = proxyType
        let pPort = proxyPort
        let pUser = proxyUsername
        let pPass = proxyPassword

        Task {
            let res = await ProxyService.shared.testProxyAsync(
                type: pType,
                host: cleanHost,
                port: pPort,
                username: pUser,
                password: pPass
            )
            await MainActor.run {
                isTestingProxy = false
                if res.success {
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
        let hasHost = !proxyHost.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let effectiveProxyEnabled = proxyEnabled && hasHost

        if var updated = existingProfile {
            updated.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
            updated.icon = icon
            updated.themeColorHex = themeColorHex
            updated.deviceProfile = deviceProfile
            updated.sessionSeed = sessionSeed
            updated.proxyEnabled = effectiveProxyEnabled
            updated.proxyType = proxyType
            updated.proxyHost = proxyHost.trimmingCharacters(in: .whitespacesAndNewlines)
            updated.proxyPort = proxyPort
            updated.proxyUsername = proxyUsername.trimmingCharacters(in: .whitespacesAndNewlines)
            updated.proxyPassword = proxyPassword
            updated.proxyDetectedIP = proxyDetectedIP
            updated.proxyDetectedCity = proxyDetectedCity
            updated.proxyDetectedRegion = proxyDetectedRegion
            updated.proxyDetectedCountry = proxyDetectedCountry
            updated.proxyDetectedISP = proxyDetectedISP
            updated.proxyDetectedASN = proxyDetectedASN
            updated.proxyDetectedTimezone = proxyDetectedTimezone
            updated.proxyUsageType = proxyUsageType
            updated.proxyConnectionType = proxyConnectionType
            updated.enableDnsProxyMatching = enableDnsProxyMatching
            updated.enableIpChangeKillSwitch = enableIpChangeKillSwitch
            updated.mockLocationEnabled = mockLocationEnabled
            updated.mockLatitude = mockLatitude
            updated.mockLongitude = mockLongitude
            updated.mockLocationName = mockLocationName

            profileManager.updateProfile(updated, privacyProfile: privacyProfile)
            onSaved(updated, false)
        } else {
            let created = profileManager.createProfile(
                name: name,
                icon: icon,
                themeColorHex: themeColorHex,
                deviceProfile: deviceProfile,
                proxyEnabled: effectiveProxyEnabled,
                proxyType: proxyType,
                proxyHost: proxyHost,
                proxyPort: proxyPort,
                proxyUsername: proxyUsername,
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
                enableIpChangeKillSwitch: enableIpChangeKillSwitch,
                mockLocationEnabled: mockLocationEnabled,
                mockLatitude: mockLatitude,
                mockLongitude: mockLongitude,
                mockLocationName: mockLocationName
            )
            onSaved(created, true)
        }
    }
}
