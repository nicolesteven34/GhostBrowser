import SwiftUI

public struct PrivacySettingsView: View {
    @ObservedObject var privacyProfile: PrivacyProfile
    @Environment(\.dismiss) private var dismiss

    public var body: some View {
        NavigationStack {
            Form {
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
                }

                Section(header: Text("Search Provider")) {
                    Picker("Search Engine", selection: $privacyProfile.searchEngine) {
                        ForEach(SearchEngine.allCases) { engine in
                            Text(engine.rawValue).tag(engine)
                        }
                    }
                }

                Section(header: Text("Hardened Defenses")) {
                    Toggle(isOn: $privacyProfile.blockCommercialTrackers) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("Block Commercial Trackers & Ads")
                                Text("Native WebKit rules block Google, Meta, TikTok, Criteo")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "shield.fill").foregroundColor(.blue)
                        }
                    }

                    Toggle(isOn: $privacyProfile.blockCanvasFingerprint) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("Canvas Fingerprint Scrambling")
                                Text("Perturbs canvas pixels with per-session micro-variations")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "paintpalette.fill").foregroundColor(.purple)
                        }
                    }

                    Toggle(isOn: $privacyProfile.maskWebGLRenderer) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("WebGL GPU Emulation")
                                Text("Enforces selected Apple Silicon GPU signatures")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "cpu.fill").foregroundColor(.orange)
                        }
                    }

                    Toggle(isOn: $privacyProfile.blockAudioFingerprint) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("AudioContext Noise Jitter")
                                Text("Scrambles oscillator & acoustic FFT tracking hashes")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "waveform").foregroundColor(.green)
                        }
                    }

                    Toggle(isOn: $privacyProfile.blockWebRTCIPLeak) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("WebRTC IP Leak Shield")
                                Text("Blocks LAN & VPN-bypass IP queries")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "network.badge.shield.half.filled").foregroundColor(.red)
                        }
                    }

                    Toggle(isOn: $privacyProfile.stripReferrers) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("Strip HTTP Referrers")
                                Text("Prevents sites from tracking your navigation origin")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "link.badge.plus").foregroundColor(.teal)
                        }
                    }

                    Toggle(isOn: $privacyProfile.shieldSensors) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("Sensor & Gyroscope Shield")
                                Text("Silences device motion and orientation sensors")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "gyroscope").foregroundColor(.indigo)
                        }
                    }

                    Toggle(isOn: $privacyProfile.ephemeralRAMMode) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("RAM-Only Ephemeral Mode")
                                Text("Zero disk cache or cookies stored on iPad flash memory")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "memorychip.fill").foregroundColor(.yellow)
                        }
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
