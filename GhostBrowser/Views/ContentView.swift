import SwiftUI

public struct ContentView: View {
    @StateObject private var privacyProfile = PrivacyProfile()
    @State private var currentURLString: String = "https://duckduckgo.com"
    @State private var inputURLText: String = "https://duckduckgo.com"
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
            // iPad Top Navigation Toolbar
            HStack(spacing: 12) {
                // Back & Forward
                Button(action: {
                    // Handled via WKWebView back
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

                // Reload / Stop
                Button(action: {
                    reloadTrigger += 1
                }) {
                    Image(systemName: isLoading ? "xmark" : "arrow.clockwise")
                        .font(.system(size: 15, weight: .medium))
                }

                // Address & Search Bar
                HStack {
                    Image(systemName: "lock.shield.fill")
                        .foregroundColor(.green)
                        .font(.system(size: 14))

                    TextField("Search or enter website address...", text: $inputURLText)
                        .font(.system(size: 14))
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .keyboardType(.URL)
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
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(Color(.systemGray6))
                .cornerRadius(10)

                // Privacy Shield Control Button
                Button(action: {
                    showSettingsSheet.toggle()
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "shield.checkered")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.blue)
                        Text("Shield")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.12))
                    .cornerRadius(8)
                }
                .popover(isPresented: $showSettingsSheet) {
                    PrivacySettingsView(privacyProfile: privacyProfile)
                        .frame(minWidth: 460, minHeight: 580)
                }

                // Panic Button (Wipe Everything Now)
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
                    Button("Wipe & Reset", role: .destructive) {
                        wipeTrigger += 1
                        inputURLText = "https://duckduckgo.com"
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("This instantly purges all memory, caches, cookies, and resets the browser to DuckDuckGo.")
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color(.systemBackground))

            // Thin progress indicator
            if isLoading && estimatedProgress < 1.0 {
                ProgressView(value: estimatedProgress, total: 1.0)
                    .progressViewStyle(LinearProgressViewStyle(tint: .accentColor))
                    .frame(height: 2)
            } else {
                Divider()
            }

            // The Hardened Browser WebKit View
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
                inputURLText = newURL
            }
        }
    }

    private func submitNavigation() {
        var query = inputURLText.trimmingCharacters(in: .whitespacesAndNewlines)
        if query.isEmpty { return }

        if !query.contains("://") && (query.contains(".") && !query.contains(" ")) {
            query = "https://" + query
        } else if !query.contains("://") {
            // Perform privacy search via DuckDuckGo
            if let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
                query = "https://duckduckgo.com/?q=\(encoded)"
            }
        }

        currentURLString = query
        inputURLText = query
        reloadTrigger += 1
    }
}
