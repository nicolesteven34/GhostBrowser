import SwiftUI

public struct ContentView: View {
    @StateObject private var privacyProfile = PrivacyProfile()
    @State private var currentURLString: String = "local://startpage"
    @State private var inputURLText: String = ""
    @State private var canGoBack: Bool = false
    @State private var canGoForward: Bool = false
    @State private var isLoading: Bool = false
    @State private var estimatedProgress: Double = 0.0
    @State private var reloadTrigger: Int = 0
    @State private var wipeTrigger: Int = 0
    @State private var showSettingsSheet: Bool = false
    @State private var showWipeAlert: Bool = false

    // Real Identity Rotation Toast Notification
    @State private var toastMessage: String? = nil
    @State private var toastWorkItem: DispatchWorkItem? = nil

    public var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 0) {
                // Safari iPad Toolbar
                HStack(spacing: 12) {
                    // Back & Forward
                    Button(action: {
                        NotificationCenter.default.post(name: NSNotification.Name("GhostWebViewGoBack"), object: nil)
                    }) {
                        Image(systemName: "chevron.backward")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .disabled(!canGoBack)

                    Button(action: {
                        NotificationCenter.default.post(name: NSNotification.Name("GhostWebViewGoForward"), object: nil)
                    }) {
                        Image(systemName: "chevron.forward")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .disabled(!canGoForward)

                    // Home
                    Button(action: {
                        currentURLString = "local://startpage"
                        inputURLText = ""
                    }) {
                        Image(systemName: "house")
                            .font(.system(size: 15, weight: .medium))
                    }

                    // Reload / Stop
                    Button(action: {
                        reloadTrigger += 1
                    }) {
                        Image(systemName: isLoading ? "xmark" : "arrow.clockwise")
                            .font(.system(size: 15, weight: .medium))
                    }

                    // Safari Search & Address Bar
                    HStack(spacing: 8) {
                        Image(systemName: "lock.shield.fill")
                            .foregroundColor(.blue)
                            .font(.system(size: 14))

                        TextField("Search or enter website name...", text: $inputURLText)
                            .font(.system(size: 14))
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .keyboardType(.webSearch)
                            .onSubmit {
                                submitNavigation()
                            }

                        if !inputURLText.isEmpty {
                            Button(action: { inputURLText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.secondary)
                                    .font(.system(size: 13))
                            }

                            Button(action: { submitNavigation() }) {
                                Image(systemName: "arrow.right.circle.fill")
                                    .foregroundColor(.blue)
                                    .font(.system(size: 16, weight: .semibold))
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(.systemGray6))
                    .cornerRadius(10)

                    // Active Apple Persona Badge & Privacy Settings
                    Button(action: {
                        showSettingsSheet.toggle()
                    }) {
                        HStack(spacing: 6) {
                            Image(systemName: "applelogo")
                                .font(.system(size: 13, weight: .semibold))
                            Text(shortPersonaName(privacyProfile.selectedDevice.rawValue))
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.blue.opacity(0.12))
                        .foregroundColor(.blue)
                        .cornerRadius(8)
                    }
                    .popover(isPresented: $showSettingsSheet) {
                        PrivacySettingsView(privacyProfile: privacyProfile)
                            .frame(minWidth: 480, minHeight: 620)
                    }

                    // Regenerate Realistic Identity (Rotates realistic Apple device, seed & cleans in-place)
                    Button(action: {
                        let newDevice = privacyProfile.regenerateRealisticIdentity()
                        showIdentityToast("✨ Generated: \(shortPersonaName(newDevice.rawValue))")
                    }) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.purple)
                            .padding(8)
                            .background(Color.purple.opacity(0.12))
                            .clipShape(Circle())
                    }

                    // Panic Button (Purge all state & return to start page)
                    Button(action: {
                        showWipeAlert = true
                    }) {
                        Image(systemName: "flame.fill")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.red)
                            .padding(8)
                            .background(Color.red.opacity(0.12))
                            .clipShape(Circle())
                    }
                    .alert("Panic Wipe Session?", isPresented: $showWipeAlert) {
                        Button("Wipe & Return Home", role: .destructive) {
                            wipeTrigger += 1
                            inputURLText = ""
                            currentURLString = "local://startpage"
                        }
                        Button("Cancel", role: .cancel) {}
                    } message: {
                        Text("Immediately purges all in-memory caches, cookies, and resets the browser to the offline start page.")
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(.systemBackground))

                // Loading Progress Bar
                if isLoading && estimatedProgress < 1.0 {
                    ProgressView(value: estimatedProgress, total: 1.0)
                        .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                        .frame(height: 2)
                } else {
                    Divider()
                }

                // WebKit Browser View
                BrowserView(
                    privacyProfile: privacyProfile,
                    currentURLString: $currentURLString,
                    canGoBack: $canGoBack,
                    canGoForward: $canGoForward,
                    isLoading: $isLoading,
                    estimatedProgress: $estimatedProgress,
                    reloadTrigger: $reloadTrigger,
                    wipeTrigger: $wipeTrigger
                )
                .edgesIgnoringSafeArea(.bottom)
            }

            // In-App Toast Banner on Identity Regeneration
            if let toast = toastMessage {
                HStack(spacing: 10) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.purple)
                        .font(.system(size: 14, weight: .bold))

                    Text(toast)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.primary)

                    Spacer()

                    Text("Clean Identity")
                        .font(.system(size: 11, weight: .bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.green.opacity(0.18))
                        .foregroundColor(.green)
                        .cornerRadius(6)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(.ultraThinMaterial)
                .cornerRadius(14)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.purple.opacity(0.3), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.15), radius: 10, x: 0, y: 5)
                .padding(.horizontal, 24)
                .padding(.top, 60)
                .transition(.move(edge: .top).combined(with: .opacity))
                .zIndex(999)
            }
        }
    }

    private func showIdentityToast(_ msg: String) {
        toastWorkItem?.cancel()
        withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
            toastMessage = msg
        }
        let work = DispatchWorkItem {
            withAnimation(.easeInOut(duration: 0.3)) {
                toastMessage = nil
            }
        }
        toastWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5, execute: work)
    }

    private func submitNavigation() {
        let trimmed = inputURLText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        // If it looks like a domain name or URL
        if trimmed.contains(".") && !trimmed.contains(" ") {
            currentURLString = trimmed
        } else {
            // It's a search term
            if let searchURL = privacyProfile.searchEngine.searchURL(for: trimmed) {
                currentURLString = searchURL.absoluteString
            } else {
                // Fallback to startpage.html query
                currentURLString = "ghost-search://" + (trimmed.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? trimmed)
            }
        }
    }

    private func shortPersonaName(_ raw: String) -> String {
        if raw.contains("iPad Pro 13") { return "iPad Pro 13\"" }
        if raw.contains("iPad Air 11") { return "iPad Air 11\"" }
        if raw.contains("iPad Mini 6") { return "iPad Mini 6" }
        if raw.contains("iPhone 15 Pro Max") { return "iPhone 15 PM" }
        if raw.contains("iPhone 14") { return "iPhone 14" }
        if raw.contains("MacBook Pro 16") { return "MacBook Pro" }
        if raw.contains("MacBook Air 13") { return "MacBook Air" }
        return "Custom"
    }
}
