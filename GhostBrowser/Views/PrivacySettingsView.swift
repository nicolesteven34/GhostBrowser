import SwiftUI

public struct PrivacySettingsView: View {
    @ObservedObject var privacyProfile: PrivacyProfile
    @Environment(\.dismiss) private var dismiss

    public var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Anti-Detection & Trust Shield")) {
                    Toggle(isOn: $privacyProfile.stealthAntiDetectionMode) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Stealth Anti-Detection Mode")
                                    .fontWeight(.medium)
                                Text("Passes Fingerprint.com with 0 Suspect Score. Prevents Bot, Tampering, and Incognito flags by using native WebKit C++ engine isolation.")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "checkmark.shield.fill").foregroundColor(.green)
                        }
                    }

                    Toggle(isOn: $privacyProfile.deterministicHardwareSeeding) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Deterministic Hardware Seeding")
                                    .fontWeight(.medium)
                                Text("Ensures Canvas & Audio hashes remain 100% bit-consistent throughout the session (passing consistency tests) while varying across personas.")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "cpu").foregroundColor(.blue)
                        }
                    }

                    Toggle(isOn: $privacyProfile.autoPurgeOnProfileSwitch) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Auto-Purge Storage on Persona Switch")
                                    .fontWeight(.medium)
                                Text("Automatically wipes cookies, IndexedDB, and cache when changing profiles so sites cannot link your new persona to previous visits.")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "trash.circle.fill").foregroundColor(.orange)
                        }
                    }
                }

                Section(header: Text("Device Persona & Hardware Signature")) {
                    Picker("Active Device Profile", selection: $privacyProfile.selectedDevice) {
                        ForEach(AppleDeviceProfile.allCases) { device in
                            Text(device.rawValue).tag(device)
                        }
                    }

                    if privacyProfile.selectedDevice == .custom {
                        TextField("Custom User-Agent string...", text: $privacyProfile.customUserAgent)
                            .font(.system(.caption, design: .monospaced))
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Active Signature Specs:")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        HStack {
                            Text("Platform:").fontWeight(.medium)
                            Text(privacyProfile.effectivePlatform)
                            Spacer()
                            Text("Touch Points:").fontWeight(.medium)
                            Text("\(privacyProfile.effectiveTouchPoints)")
                        }
                        .font(.footnote)

                        HStack {
                            Text("CPU Cores:").fontWeight(.medium)
                            Text("\(privacyProfile.effectiveCores)")
                            Spacer()
                            Text("RAM:").fontWeight(.medium)
                            Text("\(privacyProfile.effectiveRAM) GB")
                        }
                        .font(.footnote)

                        HStack {
                            Text("GPU Model:").fontWeight(.medium)
                            Text(privacyProfile.effectiveRenderer)
                        }
                        .font(.footnote)
                    }
                    .padding(.vertical, 4)

                    Button(action: {
                        privacyProfile.rotateIdentitySeed()
                    }) {
                        Label("Rotate Hardware Identity Seed", systemImage: "sparkles")
                            .font(.footnote)
                            .foregroundColor(.blue)
                    }
                }

                Section(header: Text("Search Provider")) {
                    Picker("Search Engine", selection: $privacyProfile.searchEngine) {
                        ForEach(SearchEngine.allCases) { engine in
                            Text(engine.rawValue).tag(engine)
                        }
                    }
                }

                Section(header: Text("Trackers & Network Blocking")) {
                    Toggle(isOn: $privacyProfile.blockCommercialTrackers) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("Block Commercial Trackers & Ads")
                                Text("Native C++ engine-level rules block Google, Meta, TikTok, Criteo")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "shield.fill").foregroundColor(.blue)
                        }
                    }

                    Toggle(isOn: $privacyProfile.ephemeralRAMMode) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("Incognito / Ephemeral RAM Mode")
                                Text("Note: Enabling this flags 'Incognito Detected' on fingerprint scanners.")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "eye.slash.fill").foregroundColor(.orange)
                        }
                    }
                }

                if !privacyProfile.stealthAntiDetectionMode {
                    Section(header: Text("Aggressive Prototype Scramblers (Triggers Tamper Flags)")) {
                        Toggle("Scramble Canvas Pixels", isOn: $privacyProfile.blockCanvasFingerprint)
                        Toggle("Scramble Audio FFT", isOn: $privacyProfile.blockAudioFingerprint)
                        Toggle("Mask WebGL Renderer", isOn: $privacyProfile.maskWebGLRenderer)
                        Toggle("Shield WebRTC", isOn: $privacyProfile.blockWebRTCIPLeak)
                        Toggle("Strip Referrers", isOn: $privacyProfile.stripReferrers)
                    }
                }
            }
            .navigationTitle("Browser Persona & Privacy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}
