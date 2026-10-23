import SwiftUI

public struct ContentView: View {
    @StateObject private var privacyProfile = PrivacyProfile()
    @StateObject private var profileManager = ProfileManager.shared
    @Environment(\.scenePhase) private var scenePhase

    @State private var tabs: [BrowserTab]
    @State private var activeTabID: UUID
    @State private var inputURLText: String = ""
    @State private var reloadTrigger: Int = 0
    @State private var wipeTrigger: Int = 0
    @State private var showSettingsSheet: Bool = false
    @State private var showProfileSheet: Bool = false
    @State private var showSessionToolsSheet: Bool = false
    @State private var sessionToolsInitialTab: SessionToolsSheet.ToolTab = .proxy
    @State private var showWipeAlert: Bool = false
    @State private var showHistoryDropdown: Bool = false
    @State private var showSessionNotesWindow: Bool = false
    @FocusState private var isAddressBarFocused: Bool

    // Real Identity Rotation Toast Notification
    @State private var toastMessage: String? = nil
    @State private var toastWorkItem: DispatchWorkItem? = nil

    public init() {
        let active = ProfileManager.shared.activeProfile
        let initialTabs = active.tabs.isEmpty ? [BrowserTab()] : active.tabs
        let initialTabID = initialTabs.contains(where: { $0.id == active.activeTabID }) ? active.activeTabID : initialTabs[0].id

        self._tabs = State(initialValue: initialTabs)
        self._activeTabID = State(initialValue: initialTabID)
    }

    private var activeTab: BrowserTab? {
        tabs.first(where: { $0.id == activeTabID }) ?? tabs.first
    }

    private var filteredProfileHistory: [ProfileHistoryEntry] {
        let all = profileManager.activeProfile.visitedHistory
        let q = inputURLText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty || q == (activeTab?.urlString.lowercased() ?? "") {
            return Array(all.prefix(12))
        }
        return Array(all.filter {
            $0.url.lowercased().contains(q) || $0.title.lowercased().contains(q)
        }.prefix(12))
    }

    public var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 0) {
                // 1. Top Safari iPad Toolbar with Profile Pill
                topToolbar

                // 2. Loading Progress Bar
                if let active = activeTab, active.isLoading && active.estimatedProgress < 1.0 {
                    ProgressView(value: active.estimatedProgress, total: 1.0)
                        .progressViewStyle(LinearProgressViewStyle(tint: Color(hex: profileManager.activeProfile.themeColorHex)))
                        .frame(height: 2)
                } else {
                    Divider()
                }

                // 3. Safari Multi-Tab Bar with Live Favicons
                safariTabBar

                Divider()

                // 4. Multi-Tab WebKit Canvas (Zero-reload state preservation per profile)
                ZStack {
                    Color(UIColor.systemBackground)
                        .zIndex(5)
                        .allowsHitTesting(false)

                    ForEach(tabs) { tab in
                        BrowserView(
                            privacyProfile: privacyProfile,
                            tabID: tab.id,
                            currentURLString: bindingForURL(tab.id),
                            pageTitle: bindingForTitle(tab.id),
                            canGoBack: bindingForBack(tab.id),
                            canGoForward: bindingForForward(tab.id),
                            isLoading: bindingForLoading(tab.id),
                            estimatedProgress: bindingForProgress(tab.id),
                            reloadTrigger: $reloadTrigger,
                            wipeTrigger: $wipeTrigger
                        )
                        .id("\(tab.id)-\(privacyProfile.sessionDataStoreID)")
                        .opacity(tab.id == activeTabID ? 1.0 : 0.02)
                        .zIndex(tab.id == activeTabID ? 10 : 0)
                        .allowsHitTesting(tab.id == activeTabID)
                    }
                }
                .edgesIgnoringSafeArea(.bottom)
            }

            // Per-Profile Omnibox History & Autocomplete Dropdown
            if showHistoryDropdown && !filteredProfileHistory.isEmpty {
                omniboxHistoryDropdownView
            }

            // Native Floating Session Notes / Scratchpad Window (100% outside WebKit/DOM)
            if showSessionNotesWindow {
                SessionNotesOverlayView(
                    profileID: profileManager.activeProfile.id,
                    profileName: profileManager.activeProfile.name,
                    themeColorHex: profileManager.activeProfile.themeColorHex,
                    currentURL: activeTab?.urlString ?? "",
                    isPresented: $showSessionNotesWindow
                )
                .padding(.top, 96)
                .zIndex(997)
                .transition(.scale(scale: 0.95).combined(with: .opacity))
            }

            // In-App Toast Banner on Identity / Profile Changes
            if let toast = toastMessage {
                identityToastView(toast: toast)
            }
        }
        .onChange(of: isAddressBarFocused) { focused in
            withAnimation(.easeInOut(duration: 0.15)) {
                showHistoryDropdown = focused
            }
        }
        .onAppear {
            let active = profileManager.activeProfile
            privacyProfile.selectedDevice = active.deviceProfile
            privacyProfile.sessionSeed = active.sessionSeed
            privacyProfile.buildIndex = active.buildIndex
            privacyProfile.sessionDataStoreID = active.id
            privacyProfile.searchEngine = active.searchEngine
            privacyProfile.customUserAgent = active.customUserAgent
            privacyProfile.mockLocationEnabled = active.mockLocationEnabled
            privacyProfile.mockLatitude = active.mockLatitude
            privacyProfile.mockLongitude = active.mockLongitude
            privacyProfile.mockLocationName = active.mockLocationName
            privacyProfile.virtualCameraEnabled = active.virtualCameraEnabled
            privacyProfile.virtualCameraImageBase64 = active.virtualCameraImageBase64
            privacyProfile.virtualCameraPanX = active.virtualCameraPanX
            privacyProfile.virtualCameraPanY = active.virtualCameraPanY
            privacyProfile.virtualCameraZoom = active.virtualCameraZoom
            privacyProfile.proxyEnabled = active.proxyEnabled
            privacyProfile.proxyType = active.proxyType
            privacyProfile.proxyHost = active.proxyHost
            privacyProfile.proxyPort = active.proxyPort
            privacyProfile.proxyUsername = active.proxyUsername
            privacyProfile.proxyPassword = active.proxyPassword
            privacyProfile.proxyDetectedIP = active.proxyDetectedIP
            privacyProfile.proxyDetectedCity = active.proxyDetectedCity
            privacyProfile.proxyDetectedRegion = active.proxyDetectedRegion
            privacyProfile.proxyDetectedCountry = active.proxyDetectedCountry
            privacyProfile.proxyDetectedISP = active.proxyDetectedISP
            privacyProfile.proxyDetectedASN = active.proxyDetectedASN
            privacyProfile.proxyDetectedTimezone = active.proxyDetectedTimezone
            privacyProfile.proxyUsageType = active.proxyUsageType
            privacyProfile.proxyConnectionType = active.proxyConnectionType
            privacyProfile.enableDnsProxyMatching = active.enableDnsProxyMatching
            privacyProfile.enableIpChangeKillSwitch = active.enableIpChangeKillSwitch

            if tabs.isEmpty {
                let initial = BrowserTab()
                tabs = [initial]
                activeTabID = initial.id
            } else if !tabs.contains(where: { $0.id == activeTabID }) {
                activeTabID = tabs[0].id
            }
        }
        .onChange(of: scenePhase) { newPhase in
            if newPhase == .background || newPhase == .inactive {
                profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("GhostOpenNewTab"))) { notif in
            if let urlStr = notif.object as? String, !urlStr.isEmpty {
                addNewTab(urlString: urlStr)
            }
        }
    }

    // MARK: - Green-Lit HTTPS URL Display Helper
    @ViewBuilder
    private func styledURLOverlayText(for url: String) -> some View {
        let lower = url.lowercased()
        if lower.hasPrefix("https://") {
            let scheme = String(url.prefix(8))
            let rest = String(url.dropFirst(8))
            HStack(spacing: 0) {
                Text(scheme)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(red: 0.19, green: 0.82, blue: 0.35))
                    .shadow(color: Color(red: 0.19, green: 0.82, blue: 0.35).opacity(0.45), radius: 3, x: 0, y: 0)
                Text(rest)
                    .font(.system(size: 14))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                    .truncationMode(.tail)
            }
        } else if lower.hasPrefix("ghost://") {
            let scheme = String(url.prefix(8))
            let rest = String(url.dropFirst(8))
            HStack(spacing: 0) {
                Text(scheme)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(red: 0.19, green: 0.82, blue: 0.35))
                    .shadow(color: Color(red: 0.19, green: 0.82, blue: 0.35).opacity(0.45), radius: 3, x: 0, y: 0)
                Text(rest)
                    .font(.system(size: 14))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                    .truncationMode(.tail)
            }
        } else if lower.hasPrefix("http://") {
            let scheme = String(url.prefix(7))
            let rest = String(url.dropFirst(7))
            HStack(spacing: 0) {
                Text(scheme)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.orange)
                Text(rest)
                    .font(.system(size: 14))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                    .truncationMode(.tail)
            }
        } else {
            Text(url)
                .font(.system(size: 14))
                .foregroundColor(.primary)
                .lineLimit(1)
                .truncationMode(.tail)
        }
    }

    // MARK: - Top Safari iPad Toolbar (2-Row Layout: Row 1 = Nav & URL Bar, Row 2 = SOCKS5 Pill & Controls)
    private var topToolbar: some View {
        VStack(spacing: 8) {
            // ROW 1: Back, Forward, Home, Refresh & Full-Width URL Bar (with Green-Lit https://)
            HStack(spacing: 10) {
                // Back & Forward
                Button(action: {
                    NotificationCenter.default.post(name: NSNotification.Name("GhostWebViewGoBack_\(activeTabID)"), object: nil)
                }) {
                    Image(systemName: "chevron.backward")
                        .font(.system(size: 16, weight: .semibold))
                }
                .disabled(activeTab?.canGoBack != true)

                Button(action: {
                    NotificationCenter.default.post(name: NSNotification.Name("GhostWebViewGoForward_\(activeTabID)"), object: nil)
                }) {
                    Image(systemName: "chevron.forward")
                        .font(.system(size: 16, weight: .semibold))
                }
                .disabled(activeTab?.canGoForward != true)

                // Home (Navigate active tab to local start page)
                Button(action: {
                    if let index = tabs.firstIndex(where: { $0.id == activeTabID }) {
                        tabs[index].urlString = "local://startpage"
                        tabs[index].title = "Start Page"
                        inputURLText = ""
                        showHistoryDropdown = false
                        profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)
                    }
                }) {
                    Image(systemName: "house")
                        .font(.system(size: 15, weight: .medium))
                }

                // Reload / Stop for active tab
                Button(action: {
                    NotificationCenter.default.post(name: NSNotification.Name("GhostWebViewReload_\(activeTabID)"), object: nil)
                }) {
                    Image(systemName: (activeTab?.isLoading ?? false) ? "xmark" : "arrow.clockwise")
                        .font(.system(size: 15, weight: .medium))
                }

                // Safari Search & Address Bar with Green-Lit https:// & Per-Profile History Dropdown Trigger
                let lowerURL = inputURLText.lowercased()
                let isEncryptedHTTPS = lowerURL.hasPrefix("https://") || lowerURL.hasPrefix("ghost://")
                let isUnencryptedHTTP = lowerURL.hasPrefix("http://")

                HStack(spacing: 8) {
                    Image(systemName: isEncryptedHTTPS ? "lock.fill" : (isUnencryptedHTTP ? "lock.open.fill" : "lock.shield.fill"))
                        .foregroundColor(
                            isEncryptedHTTPS
                                ? Color(red: 0.19, green: 0.82, blue: 0.35)
                                : (isUnencryptedHTTP ? .orange : Color(hex: profileManager.activeProfile.themeColorHex))
                        )
                        .shadow(color: isEncryptedHTTPS ? Color(red: 0.19, green: 0.82, blue: 0.35).opacity(0.45) : .clear, radius: 3, x: 0, y: 0)
                        .font(.system(size: 14, weight: .semibold))

                    ZStack(alignment: .leading) {
                        TextField("Search or enter website name...", text: $inputURLText)
                            .font(.system(size: 14))
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .keyboardType(.webSearch)
                            .focused($isAddressBarFocused)
                            .opacity((!isAddressBarFocused && !inputURLText.isEmpty) ? 0.015 : 1.0)
                            .onTapGesture {
                                withAnimation(.easeInOut(duration: 0.15)) {
                                    showHistoryDropdown = true
                                }
                            }
                            .onSubmit {
                                isAddressBarFocused = false
                                showHistoryDropdown = false
                                submitNavigation()
                            }

                        if !isAddressBarFocused && !inputURLText.isEmpty {
                            styledURLOverlayText(for: inputURLText)
                                .allowsHitTesting(false)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    if !profileManager.activeProfile.visitedHistory.isEmpty {
                        Button(action: {
                            withAnimation(.easeInOut(duration: 0.15)) {
                                showHistoryDropdown.toggle()
                            }
                        }) {
                            Image(systemName: showHistoryDropdown ? "chevron.up.circle.fill" : "clock.arrow.circlepath")
                                .foregroundColor(.secondary)
                                .font(.system(size: 13))
                        }
                    }

                    if !inputURLText.isEmpty {
                        Button(action: { inputURLText = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.secondary)
                                .font(.system(size: 13))
                        }

                        Button(action: {
                            isAddressBarFocused = false
                            showHistoryDropdown = false
                            submitNavigation()
                        }) {
                            Image(systemName: "arrow.right.circle.fill")
                                .foregroundColor(Color(hex: profileManager.activeProfile.themeColorHex))
                                .font(.system(size: 16, weight: .semibold))
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
                .background(Color(.systemGray6))
                .cornerRadius(10)
            }

            // ROW 2: Profile & SOCKS5 Status Pill + Session Controls
            HStack(spacing: 10) {
                // Profile Switcher & Session Monitor Indicator Pill (shows IP • ISP • Type • State when Proxy Active)
                Button(action: {
                    showProfileSheet = true
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: profileManager.activeProfile.icon)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color(hex: profileManager.activeProfile.themeColorHex))

                        Text(profileManager.activeProfile.name)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.primary)
                            .lineLimit(1)

                        Text("•")
                            .foregroundColor(.secondary)
                            .font(.system(size: 9))

                        if privacyProfile.proxyEnabled {
                            Image(systemName: "lock.shield.fill")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.green)
                        }

                        Text(privacyProfile.proxyEnabled ? privacyProfile.compactProxyBadge : shortPersonaName(privacyProfile.selectedDevice.rawValue))
                            .font(.system(size: 11, weight: .semibold, design: privacyProfile.proxyEnabled ? .monospaced : .default))
                            .foregroundColor(privacyProfile.proxyEnabled ? .green : .secondary)
                            .lineLimit(1)
                            .truncationMode(.tail)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color(hex: profileManager.activeProfile.themeColorHex).opacity(0.12))
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(hex: profileManager.activeProfile.themeColorHex).opacity(0.35), lineWidth: 1)
                    )
                }
                .sheet(isPresented: $showProfileSheet) {
                    ProfileManagerSheet(
                        profileManager: profileManager,
                        privacyProfile: privacyProfile,
                        onProfileSwitched: { newProfile in
                            switchActiveProfile(newProfile)
                        },
                        onLaunchGhostDetect: {
                            if let index = tabs.firstIndex(where: { $0.id == activeTabID }) {
                                tabs[index].urlString = "https://flagmeter.com"
                                tabs[index].title = "FlagMeter — GhostDetect Lab"
                                inputURLText = "https://flagmeter.com"
                                profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)
                            }
                        }
                    )
                }

                Spacer(minLength: 4)

                // FlagMeter / GhostDetect Unified Integrity Suite Quick-Launch Button
                Button(action: {
                    if let index = tabs.firstIndex(where: { $0.id == activeTabID }) {
                        tabs[index].urlString = "https://flagmeter.com"
                        tabs[index].title = "FlagMeter — GhostDetect Lab"
                        inputURLText = "https://flagmeter.com"
                        profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)
                    }
                }) {
                    Image(systemName: "waveform.path.ecg")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.cyan)
                        .padding(8)
                        .background(Color.cyan.opacity(0.14))
                        .clipShape(Circle())
                }

                // Native Session Notes / Scratchpad Window Button (100% Native UI, Invisible to DOM)
                Button(action: {
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.82)) {
                        showSessionNotesWindow.toggle()
                    }
                }) {
                    Image(systemName: "note.text")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(showSessionNotesWindow ? .black : .yellow)
                        .padding(8)
                        .background(showSessionNotesWindow ? Color.yellow : Color.yellow.opacity(0.15))
                        .clipShape(Circle())
                }

                // Proxy, Media & Sensors HUD (SOCKS5 Proxy, Virtual Camera, Mock GPS & Evergreen Engine Updates)
                Button(action: {
                    sessionToolsInitialTab = .proxy
                    showSessionToolsSheet = true
                }) {
                    let isHudActive = privacyProfile.proxyEnabled || privacyProfile.mockLocationEnabled || privacyProfile.virtualCameraEnabled
                    HStack(spacing: 4) {
                        Image(systemName: privacyProfile.proxyEnabled ? "network.badge.shield.half.filled" : (privacyProfile.virtualCameraEnabled ? "camera.viewfinder" : "location.viewfinder"))
                            .font(.system(size: 14, weight: .semibold))
                        if isHudActive {
                            Circle()
                                .fill(Color.green)
                                .frame(width: 6, height: 6)
                        }
                    }
                    .foregroundColor(isHudActive ? Color(hex: profileManager.activeProfile.themeColorHex) : .secondary)
                    .padding(8)
                    .background(isHudActive ? Color(hex: profileManager.activeProfile.themeColorHex).opacity(0.15) : Color(.systemGray6))
                    .clipShape(Circle())
                }
                .sheet(isPresented: $showSessionToolsSheet) {
                    SessionToolsSheet(privacyProfile: privacyProfile, profileManager: profileManager, initialTab: sessionToolsInitialTab)
                }

                // Evergreen Engine & Stealth Update Center Quick-Launch Button
                Button(action: {
                    sessionToolsInitialTab = .updates
                    showSessionToolsSheet = true
                }) {
                    Image(systemName: "checkmark.shield.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.green)
                        .padding(8)
                        .background(Color.green.opacity(0.12))
                        .clipShape(Circle())
                }

                // Privacy & Signature Settings
                Button(action: {
                    showSettingsSheet.toggle()
                }) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.secondary)
                        .padding(8)
                        .background(Color(.systemGray6))
                        .clipShape(Circle())
                }
                .popover(isPresented: $showSettingsSheet) {
                    PrivacySettingsView(privacyProfile: privacyProfile)
                        .frame(minWidth: 480, minHeight: 620)
                }

                // Panic Button (Purge all state & reset tabs to start page)
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
                        profileManager.clearProfileData(id: profileManager.activeProfileID)
                        profileManager.rotateProfileSeed(id: profileManager.activeProfileID, privacyProfile: privacyProfile)
                        let freshTab = BrowserTab()
                        tabs = [freshTab]
                        activeTabID = freshTab.id
                        inputURLText = ""
                        profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)
                        wipeTrigger += 1
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("Immediately purges all cookies, in-memory caches, closes all tabs, and resets '\(profileManager.activeProfile.name)' to a clean start page.")
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
    }

    // MARK: - Safari Horizontal Tab Bar (High-Sensitivity Touch Targets for iPadOS/iOS)
    private var safariTabBar: some View {
        HStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(tabs) { tab in
                            tabItemView(for: tab)
                                .id(tab.id)
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                }
                .onChange(of: activeTabID) { newID in
                    withAnimation(.easeInOut(duration: 0.22)) {
                        proxy.scrollTo(newID, anchor: .trailing)
                    }
                }
                .onChange(of: tabs.count) { _ in
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                        withAnimation(.easeInOut(duration: 0.22)) {
                            proxy.scrollTo(activeTabID, anchor: .trailing)
                        }
                    }
                }
            }

            // Tab Bar Plus Button (Full 38x38pt High-Sensitivity Touch Target)
            Button(action: {
                addNewTab()
            }) {
                Image(systemName: "plus")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.primary)
                    .frame(width: 34, height: 34)
                    .background(Color(.systemGray5).opacity(0.85))
                    .cornerRadius(8)
                    .frame(width: 42, height: 40)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .padding(.trailing, 6)
        }
        .frame(minHeight: 46)
        .background(Color(.systemGray6).opacity(0.75))
    }

    // MARK: - Individual Tab Capsule View (Split Sibling Buttons for Zero Gesture Conflict & 38x38pt Close Target)
    @ViewBuilder
    private func tabItemView(for tab: BrowserTab) -> some View {
        let isActive = (tab.id == activeTabID)
        let themeColor = Color(hex: profileManager.activeProfile.themeColorHex)

        HStack(spacing: 0) {
            // 1. Main Tab Selection Button (Full-Pill Touch Area)
            Button(action: {
                selectTab(id: tab.id)
            }) {
                HStack(spacing: 8) {
                    // Tab Status Icon / Loading Spinner / Favicon
                    if tab.isLoading {
                        ProgressView()
                            .scaleEffect(0.65)
                            .frame(width: 15, height: 15)
                    } else if tab.urlString == "local://startpage" {
                        Image(systemName: "shield.lefthalf.filled")
                            .font(.system(size: 13))
                            .foregroundColor(isActive ? themeColor : .secondary)
                    } else if let favURL = tab.faviconURL {
                        AsyncImage(url: favURL) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(width: 15, height: 15)
                                    .cornerRadius(3)
                            default:
                                Image(systemName: "globe")
                                    .font(.system(size: 13))
                                    .foregroundColor(isActive ? themeColor : .secondary)
                            }
                        }
                        .frame(width: 15, height: 15)
                    } else {
                        Image(systemName: "globe")
                            .font(.system(size: 13))
                            .foregroundColor(isActive ? themeColor : .secondary)
                    }

                    // Truncated Tab Title
                    Text(tabDisplayTitle(tab))
                        .font(.system(size: 13, weight: isActive ? .semibold : .medium))
                        .foregroundColor(isActive ? .primary : .secondary)
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .frame(minWidth: 72, maxWidth: 165, alignment: .leading)
                }
                .padding(.leading, 12)
                .padding(.trailing, 6)
                .frame(height: 38)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            // 2. Dedicated Close Tab Button (38x38pt Hit-Test Target with 22x22pt Visual Circle)
            Button(action: {
                withAnimation(.easeInOut(duration: 0.18)) {
                    closeTab(id: tab.id)
                }
            }) {
                ZStack {
                    Circle()
                        .fill(isActive ? Color.secondary.opacity(0.18) : Color.secondary.opacity(0.12))
                        .frame(width: 22, height: 22)

                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(isActive ? .primary.opacity(0.85) : .secondary.opacity(0.85))
                }
                .frame(width: 38, height: 38)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .background(
            RoundedRectangle(cornerRadius: 9)
                .fill(isActive ? Color(.systemBackground) : Color(.systemGray5).opacity(0.55))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 9)
                .stroke(isActive ? themeColor.opacity(0.45) : Color.secondary.opacity(0.15), lineWidth: 1)
        )
        .shadow(color: isActive ? Color.black.opacity(0.08) : Color.clear, radius: 2, x: 0, y: 1)
    }

    // MARK: - Per-Profile Omnibox History & Autocomplete Dropdown
    private var omniboxHistoryDropdownView: some View {
        VStack(spacing: 0) {
            // Header Bar
            HStack {
                Image(systemName: "clock.arrow.circlepath")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color(hex: profileManager.activeProfile.themeColorHex))
                Text("RECENT VISITED SITES (\(profileManager.activeProfile.name.uppercased()))")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.secondary)
                Spacer()
                Button(action: {
                    profileManager.clearProfileHistory()
                    showHistoryDropdown = false
                }) {
                    Text("Clear Profile History")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.red)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(Color(.systemGray6))

            Divider()

            ScrollView {
                VStack(spacing: 0) {
                    ForEach(filteredProfileHistory) { item in
                        Button(action: {
                            inputURLText = item.url
                            isAddressBarFocused = false
                            showHistoryDropdown = false
                            submitNavigation()
                        }) {
                            HStack(spacing: 10) {
                                Image(systemName: "globe")
                                    .font(.system(size: 13))
                                    .foregroundColor(Color(hex: profileManager.activeProfile.themeColorHex))
                                    .frame(width: 22, height: 22)
                                    .background(Color(hex: profileManager.activeProfile.themeColorHex).opacity(0.12))
                                    .cornerRadius(5)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.title)
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(.primary)
                                        .lineLimit(1)
                                    Text(item.url)
                                        .font(.system(size: 11, design: .monospaced))
                                        .foregroundColor(.secondary)
                                        .lineLimit(1)
                                }

                                Spacer()

                                Text("\(item.visitCount)x")
                                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color(.systemGray5))
                                    .foregroundColor(.secondary)
                                    .cornerRadius(4)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        Divider()
                    }
                }
            }
            .frame(maxHeight: 280)
        }
        .background(.regularMaterial)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: profileManager.activeProfile.themeColorHex).opacity(0.35), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.18), radius: 12, x: 0, y: 6)
        .padding(.leading, 130)
        .padding(.trailing, 14)
        .padding(.top, 52)
        .zIndex(998)
    }

    // MARK: - Identity Toast Banner
    private func identityToastView(toast: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "sparkles")
                .foregroundColor(Color(hex: profileManager.activeProfile.themeColorHex))
                .font(.system(size: 14, weight: .bold))

            Text(toast)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.primary)

            Spacer()

            Text("Isolated")
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
                .stroke(Color(hex: profileManager.activeProfile.themeColorHex).opacity(0.35), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.15), radius: 10, x: 0, y: 5)
        .padding(.horizontal, 24)
        .padding(.top, 60)
        .transition(.move(edge: .top).combined(with: .opacity))
        .zIndex(999)
    }

    // MARK: - Profile Switching
    private func switchActiveProfile(_ newProfile: BrowserProfile) {
        // 1. Save current tabs to old profile
        profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)

        // 2. Switch profile in manager and update privacyProfile
        profileManager.switchProfile(to: newProfile.id, privacyProfile: privacyProfile)

        // 3. Load new profile's tabs
        let loadedTabs = newProfile.tabs.isEmpty ? [BrowserTab()] : newProfile.tabs
        tabs = loadedTabs
        activeTabID = loadedTabs.contains(where: { $0.id == newProfile.activeTabID }) ? newProfile.activeTabID : loadedTabs[0].id

        let active = tabs.first(where: { $0.id == activeTabID })
        inputURLText = active?.urlString == "local://startpage" ? "" : (active?.urlString ?? "")

        showIdentityToast("Switched to '\(newProfile.name)' • \(shortPersonaName(newProfile.deviceProfile.rawValue))")
    }

    // MARK: - Tab Management Methods
    private func tabDisplayTitle(_ tab: BrowserTab) -> String {
        if !tab.title.isEmpty && tab.title != "local://startpage" {
            return tab.title
        }
        if tab.urlString == "local://startpage" || tab.urlString.isEmpty {
            return "Start Page"
        }
        if let url = URL(string: tab.urlString), let host = url.host, !host.isEmpty {
            return host
        }
        return tab.urlString
    }

    private func selectTab(id: UUID) {
        guard let selected = tabs.first(where: { $0.id == id }) else { return }
        activeTabID = id
        if selected.urlString == "local://startpage" {
            inputURLText = ""
        } else {
            inputURLText = selected.urlString
        }
        profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)
    }

    private func addNewTab(urlString: String = "local://startpage") {
        let isStart = urlString == "local://startpage" || urlString.isEmpty
        let newTab = BrowserTab(
            id: UUID(),
            urlString: isStart ? "local://startpage" : urlString,
            title: isStart ? "Start Page" : (URL(string: urlString)?.host ?? "New Tab")
        )
        withAnimation(.easeInOut(duration: 0.2)) {
            tabs.append(newTab)
            activeTabID = newTab.id
            if isStart {
                inputURLText = ""
            } else {
                inputURLText = urlString
            }
        }
        profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)
    }

    private func closeTab(id: UUID) {
        guard let index = tabs.firstIndex(where: { $0.id == id }) else { return }

        if tabs.count <= 1 {
            let freshTab = BrowserTab()
            tabs = [freshTab]
            activeTabID = freshTab.id
            inputURLText = ""
            profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)
            return
        }

        let isClosingActive = (id == activeTabID)
        tabs.remove(at: index)

        if isClosingActive {
            let newIndex = max(0, min(index, tabs.count - 1))
            let nextTab = tabs[newIndex]
            activeTabID = nextTab.id
            inputURLText = nextTab.urlString == "local://startpage" ? "" : nextTab.urlString
        }
        profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)
    }

    // MARK: - Dynamic Tab Bindings
    private func bindingForURL(_ id: UUID) -> Binding<String> {
        Binding(
            get: {
                tabs.first(where: { $0.id == id })?.urlString ?? "local://startpage"
            },
            set: { newValue in
                if let index = tabs.firstIndex(where: { $0.id == id }) {
                    tabs[index].urlString = newValue
                    if id == activeTabID {
                        if newValue == "local://startpage" {
                            inputURLText = ""
                        } else {
                            inputURLText = newValue
                        }
                    }
                    profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)
                }
            }
        )
    }

    private func bindingForTitle(_ id: UUID) -> Binding<String> {
        Binding(
            get: {
                tabs.first(where: { $0.id == id })?.title ?? "Start Page"
            },
            set: { newValue in
                if let index = tabs.firstIndex(where: { $0.id == id }) {
                    tabs[index].title = newValue
                    profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)
                }
            }
        )
    }

    private func bindingForBack(_ id: UUID) -> Binding<Bool> {
        Binding(
            get: {
                tabs.first(where: { $0.id == id })?.canGoBack ?? false
            },
            set: { newValue in
                if let index = tabs.firstIndex(where: { $0.id == id }) {
                    tabs[index].canGoBack = newValue
                }
            }
        )
    }

    private func bindingForForward(_ id: UUID) -> Binding<Bool> {
        Binding(
            get: {
                tabs.first(where: { $0.id == id })?.canGoForward ?? false
            },
            set: { newValue in
                if let index = tabs.firstIndex(where: { $0.id == id }) {
                    tabs[index].canGoForward = newValue
                }
            }
        )
    }

    private func bindingForLoading(_ id: UUID) -> Binding<Bool> {
        Binding(
            get: {
                tabs.first(where: { $0.id == id })?.isLoading ?? false
            },
            set: { newValue in
                if let index = tabs.firstIndex(where: { $0.id == id }) {
                    tabs[index].isLoading = newValue
                }
            }
        )
    }

    private func bindingForProgress(_ id: UUID) -> Binding<Double> {
        Binding(
            get: {
                tabs.first(where: { $0.id == id })?.estimatedProgress ?? 0.0
            },
            set: { newValue in
                if let index = tabs.firstIndex(where: { $0.id == id }) {
                    tabs[index].estimatedProgress = newValue
                }
            }
        )
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

        let target: String
        if trimmed.contains(".") && !trimmed.contains(" ") {
            target = trimmed
        } else {
            if let searchURL = privacyProfile.searchEngine.searchURL(for: trimmed) {
                target = searchURL.absoluteString
            } else {
                target = "ghost-search://" + (trimmed.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? trimmed)
            }
        }

        if let index = tabs.firstIndex(where: { $0.id == activeTabID }) {
            let prev = tabs[index].urlString
            tabs[index].urlString = target
            if prev == target || prev == "https://\(target)" || prev == "https://\(target)/" {
                reloadTrigger += 1
            }
            profileManager.saveCurrentTabs(tabs: tabs, activeTabID: activeTabID)
        }
    }

    private func shortPersonaName(_ raw: String) -> String {
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
        return "Custom"
    }
}
