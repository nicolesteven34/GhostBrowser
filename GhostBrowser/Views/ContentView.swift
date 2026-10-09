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

    public var body: some View {
        VStack(spacing: 0) {
            // Safari-style iPad Toolbar
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

                // Home (Local Start Page)
                Button(action: {
                    currentURLString = "local://startpage"
                    inputURLText = ""
                    reloadTrigger += 1
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
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(.systemGray6))
                .cornerRadius(10)

                // Active Profile & Privacy Shield Trigger
                Button(action: {
                    showSettingsSheet.toggle()
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "applelogo")
                            .font(.system(size: 13, weight: .semibold))
                        Text(privacyProfile.selectedDevice.rawValue.components(separatedBy: " ").prefix(2).joined(separator: " "))
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

                // Instant Panic Button (Zero Disk/RAM Trace)
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

            // Thin loading progress bar
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
            .onChange(of: currentURLString) { newURL in
                if newURL == "local://startpage" {
                    inputURLText = ""
                } else {
                    inputURLText = newURL
                }
            }
        }
    }

    private func submitNavigation() {
        var query = inputURLText.trimmingCharacters(in: .whitespacesAndNewlines)
        if query.isEmpty { return }

        if query.contains("://") {
            currentURLString = query
        } else if query.contains(".") && !query.contains(" ") {
            currentURLString = "https://" + query
        } else {
            // Route through user's chosen search provider
            if let searchTarget = privacyProfile.searchEngine.searchURL(for: query) {
                currentURLString = searchTarget.absoluteString
            } else {
                // If local start page / direct only, fallback to SearXNG or Startpage
                if let fallback = SearchEngine.startpage.searchURL(for: query) {
                    currentURLString = fallback.absoluteString
                }
            }
        }

        reloadTrigger += 1
    }
}
