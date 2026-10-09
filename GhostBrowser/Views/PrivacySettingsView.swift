import SwiftUI

public struct PrivacySettingsView: View {
    @ObservedObject var privacyProfile: PrivacyProfile
    @Environment(\.dismiss) private var dismiss

    public var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Defenses & Hardening")) {
                    Toggle(isOn: $privacyProfile.blockTrackers) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("Block Commercial Trackers & Ads")
                                Text("Strips Google, Meta, TikTok, Criteo & commercial analytics")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "shield.fill").foregroundColor(.blue)
                        }
                    }

                    Toggle(isOn: $privacyProfile.blockCanvas) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("Canvas Fingerprint Masking")
                                Text("Perturbs HTML5 canvas pixel rendering with per-session noise")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "paintbrush.fill").foregroundColor(.purple)
                        }
                    }

                    Toggle(isOn: $privacyProfile.maskWebGL) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("WebGL GPU Spoofing")
                                Text("Masks underlying Apple GPU vendor and renderer signatures")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "cpu.fill").foregroundColor(.orange)
                        }
                    }

                    Toggle(isOn: $privacyProfile.blockAudio) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("AudioContext Noise Jitter")
                                Text("Defeats acoustic oscillator and FFT frequency fingerprinting")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "waveform").foregroundColor(.green)
                        }
                    }

                    Toggle(isOn: $privacyProfile.blockWebRTC) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("WebRTC Leak Shield")
                                Text("Blocks local and VPN bypass IP discovery")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "network.badge.shield.half.filled").foregroundColor(.red)
                        }
                    }

                    Toggle(isOn: $privacyProfile.stripReferrer) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("Strip HTTP Referrers")
                                Text("Prevents destination sites from knowing prior visited URLs")
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
                                Text("Blocks accelerometer and device orientation APIs")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "gyroscope").foregroundColor(.indigo)
                        }
                    }

                    Toggle(isOn: $privacyProfile.ephemeralMode) {
                        Label {
                            VStack(alignment: .leading) {
                                Text("Ephemeral Storage (Zero Disk Cache)")
                                Text("RAM-only storage; nothing is written to iPad flash storage")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "memorychip.fill").foregroundColor(.yellow)
                        }
                    }
                }

                Section(header: Text("Identity & User-Agent Spoofing")) {
                    Picker("User-Agent Preset", selection: $privacyProfile.selectedUserAgent) {
                        ForEach(UserAgentPreset.allCases) { preset in
                            Text(preset.rawValue).tag(preset)
                        }
                    }

                    if privacyProfile.selectedUserAgent == .custom {
                        TextField("Enter custom User-Agent string...", text: $privacyProfile.customUserAgentText)
                            .font(.system(.subheadline, design: .monospaced))
                    }
                }

                Section(header: Text("Hardware Signature Spoofing")) {
                    Picker("Virtual GPU Renderer", selection: $privacyProfile.selectedGPU) {
                        ForEach(GPUPreset.allCases) { gpu in
                            Text(gpu.rawValue).tag(gpu)
                        }
                    }

                    Stepper("CPU Cores: \(privacyProfile.cpuCores)", value: $privacyProfile.cpuCores, in: 2...32, step: 2)
                    Stepper("RAM Reported: \(privacyProfile.memoryGB) GB", value: $privacyProfile.memoryGB, in: 2...64, step: 2)
                }

                Section {
                    Button(role: .cancel) {
                        dismiss()
                    } label: {
                        HStack {
                            Spacer()
                            Text("Apply & Close")
                                .fontWeight(.semibold)
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Privacy & Fingerprint Controls")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}
