import SwiftUI

public struct ProfileManagerSheet: View {
    @ObservedObject var profileManager: ProfileManager
    @ObservedObject var privacyProfile: PrivacyProfile
    var onProfileSwitched: ((BrowserProfile) -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var showCreateSheet = false
    @State private var newProfileName = ""
    @State private var selectedIcon = "briefcase.fill"
    @State private var selectedColorHex = "#BF5AF2"
    @State private var selectedDevice: AppleDeviceProfile = .iPadProM4_13
    @State private var profileToClear: BrowserProfile? = nil
    @State private var showClearAlert = false

    public var body: some View {
        NavigationStack {
            List {
                // MARK: - Active Profile Highlight Card
                Section(header: Text("Active Profile & Persona")) {
                    let active = profileManager.activeProfile
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
                                Text("ACTIVE")
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

                            HStack(spacing: 8) {
                                Text("Seed #\(active.sessionSeed)")
                                    .font(.system(size: 10, design: .monospaced))
                                    .foregroundColor(.secondary)
                                Text("•")
                                    .font(.system(size: 8))
                                    .foregroundColor(.secondary)
                                Text("\(active.tabs.count) Open Tab\(active.tabs.count == 1 ? "" : "s")")
                                    .font(.system(size: 10))
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding(.vertical, 6)

                    // Quick Actions for active profile
                    HStack(spacing: 12) {
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

                        Spacer()
                    }
                }

                // MARK: - All Profiles List
                Section(header: Text("All Saved Profiles")) {
                    ForEach(profileManager.profiles) { profile in
                        let isActive = (profile.id == profileManager.activeProfileID)

                        HStack(spacing: 12) {
                            Image(systemName: profile.icon)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(width: 34, height: 34)
                                .background(Color(hex: profile.themeColorHex))
                                .clipShape(Circle())

                            VStack(alignment: .leading, spacing: 2) {
                                HStack {
                                    Text(profile.name)
                                        .font(.system(size: 15, weight: isActive ? .bold : .medium))
                                        .foregroundColor(isActive ? .primary : .secondary)

                                    if isActive {
                                        Text("●")
                                            .font(.system(size: 8))
                                            .foregroundColor(.green)
                                    }
                                }

                                Text("\(shortDevice(profile.deviceProfile.rawValue)) • \(profile.tabs.count) tab\(profile.tabs.count == 1 ? "" : "s")")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            if isActive {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.blue)
                                    .font(.system(size: 13, weight: .bold))
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            if !isActive {
                                onProfileSwitched?(profile)
                                dismiss()
                            }
                        }
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
                        }
                    }
                }

                // MARK: - Add New Profile Row
                Section {
                    Button(action: {
                        newProfileName = "Profile \(profileManager.profiles.count + 1)"
                        selectedColorHex = BrowserProfile.availableColors.randomElement() ?? "#0A84FF"
                        selectedIcon = BrowserProfile.availableIcons.randomElement() ?? "briefcase.fill"
                        showCreateSheet = true
                    }) {
                        Label("Create New Profile...", systemImage: "plus.circle.fill")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.blue)
                    }
                }
            }
            .navigationTitle("Browser Profiles")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            // MARK: - Create Profile Modal
            .sheet(isPresented: $showCreateSheet) {
                NavigationStack {
                    Form {
                        Section(header: Text("Profile Identity")) {
                            TextField("Profile Name", text: $newProfileName)

                            Picker("Device Persona", selection: $selectedDevice) {
                                ForEach(AppleDeviceProfile.allCases) { dev in
                                    Text(dev.rawValue).tag(dev)
                                }
                            }
                        }

                        Section(header: Text("Color & Theme")) {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(BrowserProfile.availableColors, id: \.self) { hex in
                                        Circle()
                                            .fill(Color(hex: hex))
                                            .frame(width: 32, height: 32)
                                            .overlay(
                                                Circle()
                                                    .stroke(Color.white, lineWidth: selectedColorHex == hex ? 3 : 0)
                                            )
                                            .shadow(color: selectedColorHex == hex ? Color.black.opacity(0.2) : .clear, radius: 4)
                                            .onTapGesture {
                                                selectedColorHex = hex
                                            }
                                    }
                                }
                                .padding(.vertical, 4)
                            }
                        }

                        Section(header: Text("Profile Icon")) {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(BrowserProfile.availableIcons, id: \.self) { icon in
                                        Image(systemName: icon)
                                            .font(.system(size: 18))
                                            .foregroundColor(selectedIcon == icon ? .white : .secondary)
                                            .frame(width: 36, height: 36)
                                            .background(selectedIcon == icon ? Color(hex: selectedColorHex) : Color(.systemGray5))
                                            .clipShape(Circle())
                                            .onTapGesture {
                                                selectedIcon = icon
                                            }
                                    }
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }
                    .navigationTitle("New Profile")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") { showCreateSheet = false }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Create") {
                                let created = profileManager.createProfile(
                                    name: newProfileName,
                                    icon: selectedIcon,
                                    themeColorHex: selectedColorHex,
                                    deviceProfile: selectedDevice
                                )
                                showCreateSheet = false
                                onProfileSwitched?(created)
                                dismiss()
                            }
                            .disabled(newProfileName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        }
                    }
                }
                .presentationDetents([.medium, .large])
            }
            .alert("Clear Profile Data?", isPresented: $showClearAlert, presenting: profileToClear) { profile in
                Button("Clear Cookies & Cache", role: .destructive) {
                    profileManager.clearProfileData(id: profile.id)
                }
                Button("Cancel", role: .cancel) {}
            } message: { profile in
                Text("This will immediately delete all saved cookies, IndexedDB, and local cache for '\(profile.name)'.")
            }
        }
    }

    private func shortDevice(_ raw: String) -> String {
        if raw.contains("iPad Pro 13") { return "iPad Pro 13\"" }
        if raw.contains("iPad Air 11") { return "iPad Air 11\"" }
        if raw.contains("iPad Mini 6") { return "iPad Mini 6" }
        if raw.contains("iPhone 15 Pro Max") { return "iPhone 15 PM" }
        if raw.contains("iPhone 14") { return "iPhone 14" }
        if raw.contains("MacBook Pro 16") { return "MacBook Pro" }
        if raw.contains("MacBook Air 13") { return "MacBook Air" }
        return "Apple Device"
    }
}
