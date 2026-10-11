import SwiftUI

public struct ContentView: View {
    @StateObject private var privacyProfile = PrivacyProfile()
    @StateObject private var profileManager = ProfileManager.shared

    @State private var tabs: [BrowserTab]
    @State private var activeTabID: UUID
    @State private var inputURLText: String = ""
    @State private var reloadTrigger: Int = 0
    @State private var wipeTrigger: Int = 0
    @State private var showSettingsSheet: Bool = false
    @State private var showProfileSheet: Bool = false
    @State private var showSessionToolsSheet: Bool = false
    @State private var showWipeAlert: Bool = false

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
                        .opacity(tab.id == activeTabID ? 1.0 : 0.0)
                        .allowsHitTesting(tab.id == activeTabID)
                    }
                }
                .edgesIgnoringSafeArea(.bottom)
            }

            // In-App Toast Banner on Identity / Profile Changes
            if let toast = toastMessage {
                identityToastView(toast: toast)
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

            if tabs.isEmpty {
                let initial = BrowserTab()
                tabs = [initial]
                activeTabID = initial.id
            } else if !tabs.contains(where: { $0.id == activeTabID }) {
                activeTabID = tabs[0].id
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("GhostOpenNewTab"))) { notif in
            if let urlStr = notif.object as? String, !urlStr.isEmpty {
                addNewTab(urlString: urlStr)
            }
        }
    }

    // MARK: - Top Safari iPad Toolbar
    private var topToolbar: some View {
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

            // Safari Search & Address Bar
            HStack(spacing: 8) {
                Image(systemName: "lock.shield.fill")
                    .foregroundColor(Color(hex: profileManager.activeProfile.themeColorHex))
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
                            .foregroundColor(Color(hex: profileManager.activeProfile.themeColorHex))
                            .font(.system(size: 16, weight: .semibold))
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(.systemGray6))
            .cornerRadius(10)

            // Profile Switcher Pill
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

                    Text("•")
                        .foregroundColor(.secondary)
                        .font(.system(size: 9))

                    Text(shortPersonaName(privacyProfile.selectedDevice.rawValue))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.secondary)
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
                    }
                )
            }

            // Media & Sensors HUD (Virtual Camera & Mock GPS)
            Button(action: {
                showSessionToolsSheet = true
            }) {
                HStack(spacing: 4) {
                    Image(systemName: (privacyProfile.mockLocationEnabled || privacyProfile.virtualCameraEnabled) ? "camera.viewfinder" : "location.viewfinder")
                        .font(.system(size: 14, weight: .semibold))
                    if privacyProfile.mockLocationEnabled || privacyProfile.virtualCameraEnabled {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 6, height: 6)
                    }
                }
                .foregroundColor((privacyProfile.mockLocationEnabled || privacyProfile.virtualCameraEnabled) ? Color(hex: profileManager.activeProfile.themeColorHex) : .secondary)
                .padding(8)
                .background((privacyProfile.mockLocationEnabled || privacyProfile.virtualCameraEnabled) ? Color(hex: profileManager.activeProfile.themeColorHex).opacity(0.15) : Color(.systemGray6))
                .clipShape(Circle())
            }
            .sheet(isPresented: $showSessionToolsSheet) {
                SessionToolsSheet(privacyProfile: privacyProfile, profileManager: profileManager)
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

            // Quick New Identity (Rotate Seed for Active Profile)
            Button(action: {
                profileManager.rotateProfileSeed(id: profileManager.activeProfileID, privacyProfile: privacyProfile)
                showIdentityToast("🔄 New Identity (Same Device) • ID: \(String(privacyProfile.visitorID.prefix(8)))...")
            }) {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Color(hex: profileManager.activeProfile.themeColorHex))
                    .padding(8)
                    .background(Color(hex: profileManager.activeProfile.themeColorHex).opacity(0.12))
                    .clipShape(Circle())
            }

            // Regenerate Realistic Device for Active Profile
            Button(action: {
                let newDevice = profileManager.regenerateProfileDevice(id: profileManager.activeProfileID, privacyProfile: privacyProfile)
                showIdentityToast("✨ \(shortPersonaName(newDevice.rawValue)) • ID: \(String(privacyProfile.visitorID.prefix(8)))...")
            }) {
                Image(systemName: "sparkles")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.purple)
                    .padding(8)
                    .background(Color.purple.opacity(0.12))
                    .clipShape(Circle())
            }

            // Quick New Tab Button
            Button(action: {
                addNewTab()
            }) {
                Image(systemName: "plus")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.primary)
                    .padding(8)
                    .background(Color(.systemGray5))
                    .clipShape(Circle())
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
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color(.systemBackground))
    }

    // MARK: - Safari Horizontal Tab Bar
    private var safariTabBar: some View {
        HStack(spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(tabs) { tab in
                        tabItemView(for: tab)
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
            }

            // Tab Bar Plus Button
            Button(action: {
                addNewTab()
            }) {
                Image(systemName: "plus")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.secondary)
                    .frame(width: 30, height: 28)
                    .background(Color(.systemGray5).opacity(0.7))
                    .cornerRadius(7)
            }
            .padding(.trailing, 10)
        }
        .background(Color(.systemGray6).opacity(0.75))
    }

    // MARK: - Individual Tab Capsule View
    @ViewBuilder
    private func tabItemView(for tab: BrowserTab) -> some View {
        let isActive = (tab.id == activeTabID)
        let themeColor = Color(hex: profileManager.activeProfile.themeColorHex)

        HStack(spacing: 8) {
            // Tab Status Icon / Loading Spinner / Favicon
            if tab.isLoading {
                ProgressView()
                    .scaleEffect(0.65)
                    .frame(width: 14, height: 14)
            } else if tab.urlString == "local://startpage" {
                Image(systemName: "shield.lefthalf.filled")
                    .font(.system(size: 12))
                    .foregroundColor(isActive ? themeColor : .secondary)
            } else if let favURL = tab.faviconURL {
                AsyncImage(url: favURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 14, height: 14)
                            .cornerRadius(3)
                    default:
                        Image(systemName: "globe")
                            .font(.system(size: 12))
                            .foregroundColor(isActive ? themeColor : .secondary)
                    }
                }
                .frame(width: 14, height: 14)
            } else {
                Image(systemName: "globe")
                    .font(.system(size: 12))
                    .foregroundColor(isActive ? themeColor : .secondary)
            }

            // Truncated Tab Title
            Text(tabDisplayTitle(tab))
                .font(.system(size: 12, weight: isActive ? .semibold : .regular))
                .foregroundColor(isActive ? .primary : .secondary)
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(maxWidth: 160, alignment: .leading)

            // Close Tab Button
            Button(action: {
                withAnimation(.easeInOut(duration: 0.18)) {
                    closeTab(id: tab.id)
                }
            }) {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(isActive ? .primary.opacity(0.7) : .secondary.opacity(0.7))
                    .frame(width: 18, height: 18)
                    .background(Color.secondary.opacity(0.12))
                    .clipShape(Circle())
            }
            .buttonStyle(BorderlessButtonStyle())
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isActive ? Color(.systemBackground) : Color(.systemGray5).opacity(0.5))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(isActive ? themeColor.opacity(0.35) : Color.clear, lineWidth: 1)
        )
        .shadow(color: isActive ? Color.black.opacity(0.06) : Color.clear, radius: 2, x: 0, y: 1)
        .contentShape(Rectangle())
        .onTapGesture {
            selectTab(id: tab.id)
        }
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
            tabs[index].urlString = target
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
