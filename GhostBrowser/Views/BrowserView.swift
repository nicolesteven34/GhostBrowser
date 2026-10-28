import SwiftUI
import WebKit

public struct BrowserView: UIViewRepresentable {
    @ObservedObject var privacyProfile: PrivacyProfile
    var tabID: UUID
    @Binding var currentURLString: String
    @Binding var pageTitle: String
    @Binding var canGoBack: Bool
    @Binding var canGoForward: Bool
    @Binding var isLoading: Bool
    @Binding var estimatedProgress: Double
    @Binding var reloadTrigger: Int
    @Binding var wipeTrigger: Int

    public init(
        privacyProfile: PrivacyProfile,
        tabID: UUID,
        currentURLString: Binding<String>,
        pageTitle: Binding<String>,
        canGoBack: Binding<Bool>,
        canGoForward: Binding<Bool>,
        isLoading: Binding<Bool>,
        estimatedProgress: Binding<Double>,
        reloadTrigger: Binding<Int>,
        wipeTrigger: Binding<Int>
    ) {
        self.privacyProfile = privacyProfile
        self.tabID = tabID
        self._currentURLString = currentURLString
        self._pageTitle = pageTitle
        self._canGoBack = canGoBack
        self._canGoForward = canGoForward
        self._isLoading = isLoading
        self._estimatedProgress = estimatedProgress
        self._reloadTrigger = reloadTrigger
        self._wipeTrigger = wipeTrigger
    }

    private static var liveWebViews: [UUID: WKWebView] = [:]
    private static var liveCoordinators: [UUID: Coordinator] = [:]

    public static func releaseWebView(for tabID: UUID) {
        liveWebViews.removeValue(forKey: tabID)
        liveCoordinators.removeValue(forKey: tabID)
    }

    public static func normalizeURL(_ raw: String?) -> String {
        guard var s = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else { return "" }
        if s == "local://startpage" { return s }
        if !s.contains("://") { s = "https://" + s }
        while s.count > 8 && s.hasSuffix("/") {
            s.removeLast()
        }
        return s.lowercased()
    }

    public static func urlsAreEquivalent(_ a: String?, _ b: String?) -> Bool {
        let na = normalizeURL(a)
        let nb = normalizeURL(b)
        return !na.isEmpty && na == nb
    }

    public func makeCoordinator() -> Coordinator {
        if let existing = Self.liveCoordinators[tabID] {
            existing.parent = self
            return existing
        }
        let coord = Coordinator(self)
        Self.liveCoordinators[tabID] = coord
        return coord
    }

    public func makeUIView(context: Context) -> WKWebView {
        if let existingWebView = Self.liveWebViews[tabID] {
            context.coordinator.parent = self
            context.coordinator.webView = existingWebView
            return existingWebView
        }

        let configuration = WKWebViewConfiguration()
        configuration.processPool = ProxyService.shared.processPool(for: privacyProfile)

        // 1. Data Store: Shared profile data store across all tabs in the same profile
        let dataStore = ProxyService.shared.websiteDataStore(for: privacyProfile)
        configuration.websiteDataStore = dataStore

        // Apply Native C++ Network Proxy (SOCKS5 / HTTP) strictly to this profile's WKWebsiteDataStore
        ProxyService.shared.applyProxy(to: dataStore, profile: privacyProfile)

        if !privacyProfile.ephemeralRAMMode {
            ProfileManager.shared.restoreCookies(for: privacyProfile.sessionDataStoreID, into: dataStore.httpCookieStore)
        }

        let userContentController = WKUserContentController()

        // 2. Do NOT register any WKScriptMessageHandler (such as "ghostNav") on WKUserContentController,
        // because WebKit C++ unconditionally injects non-configurable window.webkit.messageHandlers
        // whenever >= 1 message handler is registered, which exposes WKWebView on browserinsight.net/webview-check.
        // Local startpage navigation uses decidePolicyFor navigationAction (ghost://, ghost-search://, ghost-action://).

        // 3. Inject configuration & anti-fingerprint script
        let configScript = WKUserScript(
            source: privacyProfile.generateJSConfig(),
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        userContentController.addUserScript(configScript)

        if let scriptPath = Bundle.main.path(forResource: "anti_fingerprint", ofType: "js"),
           let scriptSource = try? String(contentsOfFile: scriptPath, encoding: .utf8) {
            let antiFpScript = WKUserScript(
                source: scriptSource,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: false
            )
            userContentController.addUserScript(antiFpScript)
        }

        // 4. Apply Native C++ Content Blocker Rules (Invisible to JavaScript)
        if privacyProfile.blockCommercialTrackers {
            ContentBlockerManager.shared.loadContentBlockerRules { ruleList in
                if let ruleList = ruleList {
                    userContentController.add(ruleList)
                }
            }
        }

        configuration.userContentController = userContentController
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = .all
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.defaultWebpagePreferences.preferredContentMode = privacyProfile.selectedDevice.preferredContentMode

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.customUserAgent = privacyProfile.effectiveUserAgent.isEmpty ? nil : privacyProfile.effectiveUserAgent
        webView.allowsBackForwardNavigationGestures = true

        Self.liveWebViews[tabID] = webView

        context.coordinator.setupObservers(for: webView)
        context.coordinator.webView = webView
        context.coordinator.lastProfileDevice = privacyProfile.selectedDevice
        context.coordinator.lastUserAgent = privacyProfile.effectiveUserAgent
        context.coordinator.lastSessionSeed = privacyProfile.sessionSeed
        context.coordinator.lastReloadTrigger = reloadTrigger
        context.coordinator.lastWipeTrigger = wipeTrigger
        context.coordinator.lastProxyEnabled = privacyProfile.proxyEnabled
        context.coordinator.lastProxyType = privacyProfile.proxyType
        context.coordinator.lastProxyHost = privacyProfile.proxyHost
        context.coordinator.lastProxyPort = privacyProfile.proxyPort
        context.coordinator.lastProxyUsername = privacyProfile.proxyUsername
        context.coordinator.lastProxyPassword = privacyProfile.proxyPassword
        context.coordinator.lastProxyDetectedIP = privacyProfile.proxyDetectedIP
        context.coordinator.lastProxyDetectedISP = privacyProfile.proxyDetectedISP
        context.coordinator.lastProxyTimezone = privacyProfile.effectiveProxyTimezone
        context.coordinator.lastEnableDnsProxyMatching = privacyProfile.enableDnsProxyMatching

        // Auto-resolve proxy exit IP & timezone if enabled and not yet resolved
        if privacyProfile.proxyEnabled && (privacyProfile.proxyDetectedIP.isEmpty || privacyProfile.proxyDetectedTimezone.isEmpty) && !privacyProfile.proxyHost.isEmpty {
            let pType = privacyProfile.proxyType
            let pHost = privacyProfile.proxyHost
            let pPort = privacyProfile.proxyPort
            let pUser = privacyProfile.proxyUsername
            let pPass = privacyProfile.proxyPassword
            Task {
                let res = await ProxyService.shared.testProxyAsync(type: pType, host: pHost, port: pPort, username: pUser, password: pPass)
                if res.success {
                    await MainActor.run {
                        privacyProfile.proxyDetectedIP = res.ip
                        privacyProfile.proxyDetectedCity = res.city
                        privacyProfile.proxyDetectedRegion = res.regionCode
                        privacyProfile.proxyDetectedCountry = res.country
                        privacyProfile.proxyDetectedISP = res.isp
                        privacyProfile.proxyDetectedASN = res.asn
                        privacyProfile.proxyDetectedTimezone = res.timezoneId
                        privacyProfile.proxyUsageType = res.usageType
                        privacyProfile.proxyConnectionType = res.connectionType
                        privacyProfile.mockLocationEnabled = true
                        privacyProfile.mockLatitude = res.latitude
                        privacyProfile.mockLongitude = res.longitude
                        privacyProfile.mockLocationName = "\(res.city), \(res.country)"
                        ProfileManager.shared.saveProfileSensors(from: privacyProfile)
                    }
                }
            }
        }

        // Load initial content
        if currentURLString == "local://startpage" || currentURLString.isEmpty {
            context.coordinator.loadLocalStartPage()
        } else {
            context.coordinator.loadURL(currentURLString)
        }

        return webView
    }

    public func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.parent = self

        // Detect device profile, user agent, session seed, or proxy tunnel vs metadata changes
        let profileChanged = context.coordinator.lastProfileDevice != privacyProfile.selectedDevice
        let uaChanged = context.coordinator.lastUserAgent != privacyProfile.effectiveUserAgent
        let seedChanged = context.coordinator.lastSessionSeed != privacyProfile.sessionSeed
        let tzChanged = context.coordinator.lastProxyTimezone != privacyProfile.effectiveProxyTimezone
        let tunnelChanged = context.coordinator.lastProxyEnabled != privacyProfile.proxyEnabled
            || context.coordinator.lastProxyType != privacyProfile.proxyType
            || context.coordinator.lastProxyHost != privacyProfile.proxyHost
            || context.coordinator.lastProxyPort != privacyProfile.proxyPort
            || context.coordinator.lastProxyUsername != privacyProfile.proxyUsername
            || context.coordinator.lastProxyPassword != privacyProfile.proxyPassword
            || context.coordinator.lastEnableDnsProxyMatching != privacyProfile.enableDnsProxyMatching
        let metaChanged = context.coordinator.lastProxyDetectedIP != privacyProfile.proxyDetectedIP
            || context.coordinator.lastProxyDetectedISP != privacyProfile.proxyDetectedISP
            || tzChanged

        if profileChanged || uaChanged || seedChanged || tunnelChanged || metaChanged {
            context.coordinator.lastProfileDevice = privacyProfile.selectedDevice
            context.coordinator.lastUserAgent = privacyProfile.effectiveUserAgent
            context.coordinator.lastSessionSeed = privacyProfile.sessionSeed
            context.coordinator.lastProxyEnabled = privacyProfile.proxyEnabled
            context.coordinator.lastProxyType = privacyProfile.proxyType
            context.coordinator.lastProxyHost = privacyProfile.proxyHost
            context.coordinator.lastProxyPort = privacyProfile.proxyPort
            context.coordinator.lastProxyUsername = privacyProfile.proxyUsername
            context.coordinator.lastProxyPassword = privacyProfile.proxyPassword
            context.coordinator.lastProxyDetectedIP = privacyProfile.proxyDetectedIP
            context.coordinator.lastProxyDetectedISP = privacyProfile.proxyDetectedISP
            context.coordinator.lastProxyTimezone = privacyProfile.effectiveProxyTimezone
            context.coordinator.lastEnableDnsProxyMatching = privacyProfile.enableDnsProxyMatching

            if tunnelChanged {
                ProxyService.shared.applyProxy(to: webView.configuration.websiteDataStore, profile: privacyProfile)
            }
            context.coordinator.reconfigurePrivacy(for: webView)
            if (profileChanged || uaChanged || seedChanged) && webView.url != nil {
                webView.reload()
            }

            let ipEsc = privacyProfile.proxyEnabled ? privacyProfile.proxyDetectedIP.replacingOccurrences(of: "'", with: "") : ""
            let tzEsc = privacyProfile.proxyEnabled ? privacyProfile.effectiveProxyTimezone.replacingOccurrences(of: "'", with: "") : ""
            let ispEsc = privacyProfile.proxyEnabled ? privacyProfile.proxyDetectedISP.replacingOccurrences(of: "'", with: "") : ""
            let cityEsc = privacyProfile.proxyEnabled ? privacyProfile.proxyDetectedCity.replacingOccurrences(of: "'", with: "") : ""
            let regEsc = privacyProfile.proxyEnabled ? privacyProfile.proxyDetectedRegion.replacingOccurrences(of: "'", with: "") : ""
            let ctryEsc = privacyProfile.proxyEnabled ? privacyProfile.proxyDetectedCountry.replacingOccurrences(of: "'", with: "") : ""
            let jsProxy = "try { window.dispatchEvent(new CustomEvent('__g_bridge__', { detail: { t: 'proxy', ip: '\(ipEsc)', tz: '\(tzEsc)', lat: \(privacyProfile.mockLatitude), lon: \(privacyProfile.mockLongitude), en: \(privacyProfile.proxyEnabled), isp: '\(ispEsc)', city: '\(cityEsc)', reg: '\(regEsc)', ctry: '\(ctryEsc)' } })); } catch(e) {}"
            webView.evaluateJavaScript(jsProxy) { _, _ in }

            if tunnelChanged && privacyProfile.proxyEnabled && (privacyProfile.proxyDetectedIP.isEmpty || privacyProfile.proxyDetectedTimezone.isEmpty) && !privacyProfile.proxyHost.isEmpty {
                let pType = privacyProfile.proxyType
                let pHost = privacyProfile.proxyHost
                let pPort = privacyProfile.proxyPort
                let pUser = privacyProfile.proxyUsername
                let pPass = privacyProfile.proxyPassword
                Task {
                    let res = await ProxyService.shared.testProxyAsync(type: pType, host: pHost, port: pPort, username: pUser, password: pPass)
                    if res.success {
                        await MainActor.run {
                            privacyProfile.proxyDetectedIP = res.ip
                            privacyProfile.proxyDetectedCity = res.city
                            privacyProfile.proxyDetectedRegion = res.regionCode
                            privacyProfile.proxyDetectedCountry = res.country
                            privacyProfile.proxyDetectedISP = res.isp
                            privacyProfile.proxyDetectedASN = res.asn
                            privacyProfile.proxyDetectedTimezone = res.timezoneId
                            privacyProfile.proxyUsageType = res.usageType
                            privacyProfile.proxyConnectionType = res.connectionType
                            privacyProfile.mockLocationEnabled = true
                            privacyProfile.mockLatitude = res.latitude
                            privacyProfile.mockLongitude = res.longitude
                            privacyProfile.mockLocationName = "\(res.city), \(res.country)"
                            ProfileManager.shared.saveProfileSensors(from: privacyProfile)
                        }
                    }
                }
            }
        }

        // Dynamic mock location update (real-time, zero reload)
        let locationChanged = context.coordinator.lastMockLocationEnabled != privacyProfile.mockLocationEnabled
            || context.coordinator.lastMockLatitude != privacyProfile.mockLatitude
            || context.coordinator.lastMockLongitude != privacyProfile.mockLongitude

        if locationChanged {
            context.coordinator.lastMockLocationEnabled = privacyProfile.mockLocationEnabled
            context.coordinator.lastMockLatitude = privacyProfile.mockLatitude
            context.coordinator.lastMockLongitude = privacyProfile.mockLongitude

            let js = "try { window.dispatchEvent(new CustomEvent('__g_bridge__', { detail: { t: 'loc', lat: \(privacyProfile.mockLatitude), lon: \(privacyProfile.mockLongitude), en: \(privacyProfile.mockLocationEnabled) } })); } catch(e) {}"
            webView.evaluateJavaScript(js) { _, _ in }
        }

        // Dynamic virtual camera stream update (real-time pan/zoom/image, zero reload)
        let virtualCamChanged = context.coordinator.lastVirtualCameraEnabled != privacyProfile.virtualCameraEnabled
            || context.coordinator.lastVirtualCameraImage != privacyProfile.virtualCameraImageBase64
            || context.coordinator.lastVirtualCameraPanX != privacyProfile.virtualCameraPanX
            || context.coordinator.lastVirtualCameraPanY != privacyProfile.virtualCameraPanY
            || context.coordinator.lastVirtualCameraZoom != privacyProfile.virtualCameraZoom

        if virtualCamChanged {
            context.coordinator.lastVirtualCameraEnabled = privacyProfile.virtualCameraEnabled
            context.coordinator.lastVirtualCameraImage = privacyProfile.virtualCameraImageBase64
            context.coordinator.lastVirtualCameraPanX = privacyProfile.virtualCameraPanX
            context.coordinator.lastVirtualCameraPanY = privacyProfile.virtualCameraPanY
            context.coordinator.lastVirtualCameraZoom = privacyProfile.virtualCameraZoom

            let escaped = privacyProfile.virtualCameraImageBase64
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "'", with: "\\'")
                .replacingOccurrences(of: "\n", with: "")

            let js = "try { window.dispatchEvent(new CustomEvent('__g_bridge__', { detail: { t: 'cam', b64: '\(escaped)', px: \(privacyProfile.virtualCameraPanX), py: \(privacyProfile.virtualCameraPanY), zm: \(privacyProfile.virtualCameraZoom), en: \(privacyProfile.virtualCameraEnabled) } })); } catch(e) {}"
            webView.evaluateJavaScript(js) { _, _ in }
        }

        // Handle URL change from user navigation (compare normalized URLs so trailing slash never reloads)
        if !Self.urlsAreEquivalent(currentURLString, context.coordinator.currentLoadedURL) &&
           !Self.urlsAreEquivalent(currentURLString, webView.url?.absoluteString) &&
           !currentURLString.isEmpty {
            context.coordinator.loadURL(currentURLString)
        }

        // Handle explicit reload trigger
        if context.coordinator.lastReloadTrigger != reloadTrigger && reloadTrigger > 0 {
            context.coordinator.lastReloadTrigger = reloadTrigger
            context.coordinator.reloadCurrentPage()
        }

        // Handle panic wipe trigger
        if context.coordinator.lastWipeTrigger != wipeTrigger && wipeTrigger > 0 {
            context.coordinator.lastWipeTrigger = wipeTrigger
            context.coordinator.nukeSession(reloadCurrent: false)
        }
    }

    public class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        var parent: BrowserView
        weak var webView: WKWebView?
        var currentLoadedURL: String? = nil
        var lastProfileDevice: AppleDeviceProfile?
        var lastUserAgent: String?
        var lastSessionSeed: Int = 0
        var lastReloadTrigger: Int = 0
        var lastWipeTrigger: Int = 0

        var lastProxyEnabled: Bool?
        var lastProxyType: String?
        var lastProxyHost: String?
        var lastProxyPort: Int?
        var lastProxyUsername: String?
        var lastProxyPassword: String?
        var lastProxyDetectedIP: String?
        var lastProxyDetectedISP: String?
        var lastProxyTimezone: String?
        var lastEnableDnsProxyMatching: Bool?

        var lastMockLocationEnabled: Bool?
        var lastMockLatitude: Double?
        var lastMockLongitude: Double?
        var lastVirtualCameraEnabled: Bool?
        var lastVirtualCameraImage: String?
        var lastVirtualCameraPanX: Double?
        var lastVirtualCameraPanY: Double?
        var lastVirtualCameraZoom: Double?

        private var progressObservation: NSKeyValueObservation?
        private var backObservation: NSKeyValueObservation?
        private var forwardObservation: NSKeyValueObservation?
        private var titleObservation: NSKeyValueObservation?
        private var notificationTokens: [NSObjectProtocol] = []
        var lastNavigationFailed: Bool = false
        var lastAutoRetryDate: Date = .distantPast
        var wasLoadingOnBackground: Bool = false

        init(_ parent: BrowserView) {
            self.parent = parent
        }

        deinit {
            for token in notificationTokens {
                NotificationCenter.default.removeObserver(token)
            }
            progressObservation?.invalidate()
            backObservation?.invalidate()
            forwardObservation?.invalidate()
            titleObservation?.invalidate()
        }

        func setupObservers(for webView: WKWebView) {
            progressObservation = webView.observe(\.estimatedProgress, options: .new) { [weak self] view, _ in
                DispatchQueue.main.async {
                    self?.parent.estimatedProgress = view.estimatedProgress
                }
            }

            backObservation = webView.observe(\.canGoBack, options: .new) { [weak self] view, _ in
                DispatchQueue.main.async {
                    self?.parent.canGoBack = view.canGoBack
                }
            }

            forwardObservation = webView.observe(\.canGoForward, options: .new) { [weak self] view, _ in
                DispatchQueue.main.async {
                    self?.parent.canGoForward = view.canGoForward
                }
            }

            titleObservation = webView.observe(\.title, options: .new) { [weak self] view, _ in
                DispatchQueue.main.async {
                    if let title = view.title, !title.isEmpty {
                        self?.parent.pageTitle = title
                    } else if self?.parent.currentURLString == "local://startpage" {
                        self?.parent.pageTitle = "Start Page"
                    }
                }
            }

            let tabID = parent.tabID
            let backToken = NotificationCenter.default.addObserver(
                forName: NSNotification.Name("GhostWebViewGoBack_\(tabID)"),
                object: nil,
                queue: .main
            ) { [weak self] _ in
                self?.webView?.goBack()
            }
            notificationTokens.append(backToken)

            let forwardToken = NotificationCenter.default.addObserver(
                forName: NSNotification.Name("GhostWebViewGoForward_\(tabID)"),
                object: nil,
                queue: .main
            ) { [weak self] _ in
                self?.webView?.goForward()
            }
            notificationTokens.append(forwardToken)

            let reloadToken = NotificationCenter.default.addObserver(
                forName: NSNotification.Name("GhostWebViewReload_\(tabID)"),
                object: nil,
                queue: .main
            ) { [weak self] _ in
                self?.reloadCurrentPage(userInitiated: true)
            }
            notificationTokens.append(reloadToken)

            let wipeToken = NotificationCenter.default.addObserver(
                forName: NSNotification.Name("GhostWebViewWipe_\(tabID)"),
                object: nil,
                queue: .main
            ) { [weak self] _ in
                self?.nukeSession(reloadCurrent: false)
            }
            notificationTokens.append(wipeToken)
            
            let killSwitchToken = NotificationCenter.default.addObserver(
                forName: NSNotification.Name("GhostTriggerIpKillSwitch"),
                object: nil,
                queue: .main
            ) { [weak self] notif in
                guard let self = self, let wv = self.webView else { return }
                let tripped = (notif.object as? Bool) ?? true
                if tripped {
                    wv.stopLoading()
                }
                let js = "try { window.dispatchEvent(new CustomEvent('__g_bridge__', { detail: { t: 'kill', tripped: \(tripped) } })); } catch(e) {}"
                wv.evaluateJavaScript(js, completionHandler: nil)
            }
            notificationTokens.append(killSwitchToken)

            let bgToken = NotificationCenter.default.addObserver(
                forName: UIApplication.didEnterBackgroundNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                guard let self = self, let wv = self.webView else { return }
                self.wasLoadingOnBackground = wv.isLoading
                if !self.parent.privacyProfile.ephemeralRAMMode {
                    ProfileManager.shared.backupCookies(for: self.parent.privacyProfile.sessionDataStoreID, from: wv.configuration.websiteDataStore.httpCookieStore)
                }
            }
            notificationTokens.append(bgToken)

            let fgToken = NotificationCenter.default.addObserver(
                forName: UIApplication.willEnterForegroundNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                guard let self = self, let wv = self.webView else { return }
                let shouldReload = self.wasLoadingOnBackground || self.lastNavigationFailed || (wv.url == nil && self.currentLoadedURL != nil && self.currentLoadedURL != "local://startpage")
                self.wasLoadingOnBackground = false
                if shouldReload {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                        self?.reloadCurrentPage(userInitiated: false)
                    }
                }
            }
            notificationTokens.append(fgToken)
        }

        public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "ghostNav", let target = message.body as? String {
                DispatchQueue.main.async {
                    if target == "ghost-action://regenerate" {
                        self.parent.privacyProfile.regenerateRealisticIdentity()
                    } else if target == "ghost-action://rotateseed" {
                        self.parent.privacyProfile.rotateIdentitySeed()
                    } else if target == "flagmeter://detect" || target == "ghost://detect" || target == "local://detect" || target == "ghost://integrity" {
                        self.loadURL("https://flagmeter.com")
                    } else {
                        self.loadURL(target)
                    }
                }
            }
        }

        public func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            // Only user-tapped links with target="_blank" open a new tab seamlessly
            if navigationAction.navigationType == .linkActivated,
               let url = navigationAction.request.url,
               !url.absoluteString.isEmpty,
               url.scheme == "http" || url.scheme == "https" {
                NotificationCenter.default.post(name: NSNotification.Name("GhostOpenNewTab"), object: url.absoluteString)
            }
            // For script popups, iframe probes, or window.open('about:blank') calls,
            // return nil without mutating or blanking out the current webView.
            return nil
        }

        @available(iOS 15.0, *)
        public func webView(
            _ webView: WKWebView,
            requestMediaCapturePermissionFor origin: WKSecurityOrigin,
            initiatedByFrame frame: WKFrameInfo,
            type: WKMediaCaptureType,
            decisionHandler: @escaping (WKPermissionDecision) -> Void
        ) {
            decisionHandler(.grant)
        }

        public func loadLocalStartPage() {
            guard let webView = self.webView else { return }
            if let startURL = Bundle.main.url(forResource: "startpage", withExtension: "html"),
               var html = try? String(contentsOf: startURL, encoding: .utf8) {

                html = html.replacingOccurrences(of: "{{DEVICE_NAME}}", with: parent.privacyProfile.selectedDevice.rawValue)
                html = html.replacingOccurrences(of: "{{GPU_MODEL}}", with: parent.privacyProfile.effectiveRenderer)
                html = html.replacingOccurrences(of: "{{CPU_CORES}}", with: "\(parent.privacyProfile.effectiveCores) Cores")
                html = html.replacingOccurrences(of: "{{RAM_GB}}", with: "\(parent.privacyProfile.effectiveRAM) GB RAM")
                html = html.replacingOccurrences(of: "{{TOUCH_POINTS}}", with: "\(parent.privacyProfile.effectiveTouchPoints)")
                html = html.replacingOccurrences(of: "{{PLATFORM}}", with: parent.privacyProfile.effectivePlatform)
                html = html.replacingOccurrences(of: "{{VISITOR_ID}}", with: parent.privacyProfile.visitorID)
                html = html.replacingOccurrences(of: "{{FORMATTED_VISITOR_ID}}", with: parent.privacyProfile.formattedVisitorID)
                html = html.replacingOccurrences(of: "{{SCREEN_RES}}", with: "\(parent.privacyProfile.effectiveScreenWidth)×\(parent.privacyProfile.effectiveScreenHeight)")
                html = html.replacingOccurrences(of: "{{DPR}}", with: String(format: "%.1f", parent.privacyProfile.effectiveDevicePixelRatio))
                html = html.replacingOccurrences(of: "{{SEED}}", with: "\(parent.privacyProfile.sessionSeed)")
                html = html.replacingOccurrences(of: "{{PROFILE_NAME}}", with: ProfileManager.shared.profileName(for: parent.privacyProfile.sessionDataStoreID).uppercased())

                self.currentLoadedURL = "local://startpage"
                self.parent.pageTitle = "Start Page"
                if self.parent.currentURLString != "local://startpage" {
                    DispatchQueue.main.async {
                        self.parent.currentURLString = "local://startpage"
                    }
                }
                webView.loadHTMLString(html, baseURL: nil)
            }
        }

        public func loadURL(_ urlString: String, forceReload: Bool = false) {
            guard let webView = self.webView else { return }

            if urlString == "local://startpage" || urlString.isEmpty {
                loadLocalStartPage()
                return
            }

            if urlString == "flagmeter://detect" || urlString == "ghost://detect" || urlString == "local://detect" || urlString == "ghost://integrity" || urlString.contains("detect.ghost") {
                loadURL("https://flagmeter.com", forceReload: forceReload)
                return
            }

            ProxyService.shared.ensureFreshRouteIfIdle(for: parent.privacyProfile, userInitiatedReload: forceReload)

            if urlString.hasPrefix("ghost-action://") {
                if urlString.contains("regenerate") {
                    parent.privacyProfile.regenerateRealisticIdentity()
                } else if urlString.contains("rotateseed") {
                    parent.privacyProfile.rotateIdentitySeed()
                }
                return
            }

            var finalString = urlString
            if finalString.hasPrefix("ghost-search://") {
                let query = finalString.replacingOccurrences(of: "ghost-search://", with: "")
                if let decoded = query.removingPercentEncoding {
                    if let searchURL = parent.privacyProfile.searchEngine.searchURL(for: decoded) {
                        finalString = searchURL.absoluteString
                    } else if let fallback = SearchEngine.startpage.searchURL(for: decoded) {
                        finalString = fallback.absoluteString
                    }
                }
            }

            if !finalString.contains("://") {
                finalString = "https://" + finalString
            }

            guard let url = URL(string: finalString) else { return }

            self.currentLoadedURL = url.absoluteString
            if self.parent.currentURLString != url.absoluteString {
                DispatchQueue.main.async {
                    self.parent.currentURLString = url.absoluteString
                }
            }

            let cachePolicy: URLRequest.CachePolicy = forceReload ? .reloadIgnoringLocalAndRemoteCacheData : .useProtocolCachePolicy
            let request = URLRequest(url: url, cachePolicy: cachePolicy, timeoutInterval: 30)
            webView.load(request)
        }

        public func reconfigurePrivacy(for webView: WKWebView) {
            // Update native C++ User Agent & Preferred Content Mode
            webView.customUserAgent = parent.privacyProfile.effectiveUserAgent.isEmpty ? nil : parent.privacyProfile.effectiveUserAgent
            webView.configuration.defaultWebpagePreferences.preferredContentMode = parent.privacyProfile.selectedDevice.preferredContentMode

            let ucc = webView.configuration.userContentController
            ucc.removeAllUserScripts()

            let configScript = WKUserScript(
                source: parent.privacyProfile.generateJSConfig(),
                injectionTime: .atDocumentStart,
                forMainFrameOnly: false
            )
            ucc.addUserScript(configScript)

            if let scriptPath = Bundle.main.path(forResource: "anti_fingerprint", ofType: "js"),
               let scriptSource = try? String(contentsOfFile: scriptPath, encoding: .utf8) {
                let antiFpScript = WKUserScript(
                    source: scriptSource,
                    injectionTime: .atDocumentStart,
                    forMainFrameOnly: false
                )
                ucc.addUserScript(antiFpScript)
            }

            if parent.privacyProfile.blockCommercialTrackers {
                ContentBlockerManager.shared.loadContentBlockerRules { ruleList in
                    if let ruleList = ruleList {
                        ucc.add(ruleList)
                    }
                }
            }

            // Refresh start page with newly chosen persona
            if currentLoadedURL == "local://startpage" {
                loadLocalStartPage()
            }
        }

        public func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, preferences: WKWebpagePreferences, decisionHandler: @escaping (WKNavigationActionPolicy, WKWebpagePreferences) -> Void) {
            preferences.preferredContentMode = parent.privacyProfile.selectedDevice.preferredContentMode

            guard let url = navigationAction.request.url else {
                decisionHandler(.allow, preferences)
                return
            }

            if url.scheme == "ghost" || url.scheme == "local" {
                decisionHandler(.cancel, preferences)
                let fullUrl = url.absoluteString
                DispatchQueue.main.async {
                    if fullUrl.contains("detect") || fullUrl.contains("integrity") {
                        self.loadURL("https://flagmeter.com")
                    } else {
                        self.loadLocalStartPage()
                    }
                }
                return
            }

            if url.scheme == "ghost-search" {
                decisionHandler(.cancel, preferences)
                let query = url.host ?? url.path.replacingOccurrences(of: "/", with: "")
                if let decoded = query.removingPercentEncoding {
                    if let searchTarget = parent.privacyProfile.searchEngine.searchURL(for: decoded) {
                        DispatchQueue.main.async {
                            self.loadURL(searchTarget.absoluteString)
                        }
                    } else if let fallback = SearchEngine.startpage.searchURL(for: decoded) {
                        DispatchQueue.main.async {
                            self.loadURL(fallback.absoluteString)
                        }
                    }
                }
                return
            }

            if url.scheme == "ghost-action" {
                decisionHandler(.cancel, preferences)
                if url.host == "regenerate" || url.path.contains("regenerate") {
                    DispatchQueue.main.async {
                        self.parent.privacyProfile.regenerateRealisticIdentity()
                    }
                } else if url.host == "rotateseed" || url.path.contains("rotateseed") {
                    DispatchQueue.main.async {
                        self.parent.privacyProfile.rotateIdentitySeed()
                    }
                }
                return
            }

            if url.scheme == "http" || url.scheme == "https" || url.scheme == "about" || url.scheme == "file" {
                // Prevent background script probes from navigating the active page to about:blank
                if url.absoluteString == "about:blank" && navigationAction.targetFrame?.isMainFrame == true && currentLoadedURL != nil && currentLoadedURL != "local://startpage" {
                    decisionHandler(.cancel, preferences)
                    return
                }
                if navigationAction.targetFrame?.isMainFrame == true && currentLoadedURL == "local://startpage" && (url.scheme == "http" || url.scheme == "https") {
                    self.currentLoadedURL = url.absoluteString
                    DispatchQueue.main.async {
                        self.parent.currentURLString = url.absoluteString
                    }
                }
                decisionHandler(.allow, preferences)
                return
            }

            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel, preferences)
                return
            }

            decisionHandler(.allow, preferences)
        }

        public func reloadCurrentPage(userInitiated: Bool = false) {
            guard let webView = self.webView else { return }

            if userInitiated {
                if webView.isLoading {
                    webView.stopLoading()
                }
                if lastNavigationFailed {
                    lastNavigationFailed = false
                    ProxyService.shared.forceRestartBridge(for: parent.privacyProfile)
                } else {
                    ProxyService.shared.ensureFreshRouteIfIdle(for: parent.privacyProfile, userInitiatedReload: true)
                }
            } else {
                ProxyService.shared.ensureFreshRouteIfIdle(for: parent.privacyProfile, userInitiatedReload: false)
            }

            let target = (currentLoadedURL?.isEmpty == false ? currentLoadedURL : parent.currentURLString) ?? ""
            if target == "local://startpage" || target.isEmpty {
                loadLocalStartPage()
                return
            }
            if target == "ghost://detect" || target == "local://detect" || target == "ghost://integrity" ||
               (target.hasPrefix("file://") && (target.contains("DetectionSuite") || target.hasSuffix("/index.html"))) {
                loadURL("https://flagmeter.com", forceReload: true)
                return
            }
            if !userInitiated,
               let liveUrl = webView.url?.absoluteString,
               !liveUrl.isEmpty,
               liveUrl != "about:blank",
               !liveUrl.contains("startpage.html") {
                if webView.reload() == nil {
                    loadURL(target, forceReload: true)
                }
            } else {
                loadURL(target, forceReload: true)
            }
        }

        public func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.isLoading = true
            if let url = webView.url?.absoluteString {
                if url.hasPrefix("file://") && (url.contains("DetectionSuite") || url.hasSuffix("/index.html")) {
                    currentLoadedURL = "flagmeter://detect"
                    if parent.currentURLString != "flagmeter://detect" {
                        parent.currentURLString = "flagmeter://detect"
                    }
                    parent.pageTitle = "FlagMeter Pro"
                    return
                }
                if !url.contains("startpage.html") && url != "about:blank" {
                    currentLoadedURL = url
                    parent.currentURLString = url
                }
            }
            if let host = webView.url?.host, !host.isEmpty {
                parent.pageTitle = host
            }
        }

        public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
            lastNavigationFailed = false
            if let url = webView.url?.absoluteString {
                if url.hasPrefix("file://") && (url.contains("DetectionSuite") || url.hasSuffix("/index.html")) {
                    currentLoadedURL = "ghost://detect"
                    if parent.currentURLString != "ghost://detect" {
                        parent.currentURLString = "ghost://detect"
                    }
                } else if !url.contains("startpage.html") && url != "about:blank" {
                    currentLoadedURL = url
                    parent.currentURLString = url
                    if !parent.privacyProfile.ephemeralRAMMode {
                        ProfileManager.shared.recordHistoryVisit(url: url, title: webView.title ?? "", forProfileID: parent.privacyProfile.sessionDataStoreID)
                    }
                }
            }
            if let title = webView.title, !title.isEmpty {
                parent.pageTitle = title
            }
            if !parent.privacyProfile.ephemeralRAMMode {
                ProfileManager.shared.backupCookies(for: parent.privacyProfile.sessionDataStoreID, from: webView.configuration.websiteDataStore.httpCookieStore)
            }
            if parent.privacyProfile.proxyEnabled {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak self, weak webView] in
                    guard let self = self, let wv = webView else { return }
                    self.syncLiveVerifiedProxyIp(from: wv)
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.4) { [weak self, weak webView] in
                    guard let self = self, let wv = webView else { return }
                    self.syncLiveVerifiedProxyIp(from: wv)
                }
            }
            DispatchQueue.main.async {
                if webView.alpha > 0.5 && webView.window != nil {
                    webView.becomeFirstResponder()
                }
            }
        }

        private func syncLiveVerifiedProxyIp(from webView: WKWebView) {
            guard parent.privacyProfile.proxyEnabled else { return }
            let js = "(function(){ try { const s = window[Symbol.for('__ghost_live_ip__')]; return s ? JSON.stringify(s) : ''; } catch(e){ return ''; } })()"
            webView.evaluateJavaScript(js) { [weak self] result, _ in
                guard let self = self,
                      let jsonStr = result as? String,
                      !jsonStr.isEmpty,
                      let data = jsonStr.data(using: .utf8),
                      let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let liveIp = obj["ip"] as? String,
                      !liveIp.isEmpty else { return }
                DispatchQueue.main.async {
                    guard self.parent.privacyProfile.proxyEnabled else { return }
                    var didUpdate = false
                    let currentHasIpv4 = !self.parent.privacyProfile.proxyDetectedIP.isEmpty && !self.parent.privacyProfile.proxyDetectedIP.contains(":")
                    if (!liveIp.contains(":") || !currentHasIpv4) && self.parent.privacyProfile.proxyDetectedIP != liveIp {
                        self.parent.privacyProfile.proxyDetectedIP = liveIp
                        didUpdate = true
                    }
                    if let isp = obj["isp"] as? String, !isp.isEmpty, self.parent.privacyProfile.proxyDetectedISP != isp {
                        self.parent.privacyProfile.proxyDetectedISP = isp
                        didUpdate = true
                    }
                    if let city = obj["city"] as? String, !city.isEmpty, self.parent.privacyProfile.proxyDetectedCity != city {
                        self.parent.privacyProfile.proxyDetectedCity = city
                        didUpdate = true
                    }
                    if let reg = obj["region"] as? String, !reg.isEmpty, self.parent.privacyProfile.proxyDetectedRegion != reg {
                        self.parent.privacyProfile.proxyDetectedRegion = reg
                        didUpdate = true
                    }
                    if let country = obj["country"] as? String, !country.isEmpty, self.parent.privacyProfile.proxyDetectedCountry != country {
                        self.parent.privacyProfile.proxyDetectedCountry = country
                        didUpdate = true
                    }
                    if let tz = obj["timezone"] as? String, tz.contains("/"), self.parent.privacyProfile.proxyDetectedTimezone != tz {
                        self.parent.privacyProfile.proxyDetectedTimezone = tz
                        didUpdate = true
                    }
                    if didUpdate {
                        ProfileManager.shared.saveProfileSensors(from: self.parent.privacyProfile)
                    }
                }
            }
        }

        public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
            let nsErr = error as NSError
            if nsErr.domain == NSURLErrorDomain && nsErr.code == NSURLErrorCancelled {
                return
            }
            lastNavigationFailed = true
            print("[BrowserView] Provisional navigation failed (\(nsErr.domain) \(nsErr.code)): \(error.localizedDescription)")

            // Auto-heal once if a stale post-background socket or bridge port caused the navigation failure
            if Date().timeIntervalSince(lastAutoRetryDate) > 6.0 {
                lastAutoRetryDate = Date()
                ProxyService.shared.forceRestartBridge(for: parent.privacyProfile)
                let retryTarget = (currentLoadedURL?.isEmpty == false ? currentLoadedURL : parent.currentURLString) ?? ""
                if !retryTarget.isEmpty && retryTarget != "local://startpage" {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                        self?.loadURL(retryTarget, forceReload: true)
                    }
                }
            }
        }

        public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
            let nsErr = error as NSError
            if nsErr.domain == NSURLErrorDomain && nsErr.code == NSURLErrorCancelled {
                return
            }
            lastNavigationFailed = true
            print("[BrowserView] Navigation failed (\(nsErr.domain) \(nsErr.code)): \(error.localizedDescription)")
        }

        public func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            parent.isLoading = false
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
                self?.reloadCurrentPage()
            }
        }

        public func nukeSession(reloadCurrent: Bool = false) {
            guard let webView = self.webView else { return }
            let dataStore = webView.configuration.websiteDataStore
            let types = WKWebsiteDataStore.allWebsiteDataTypes()

            let currentURL: String? = {
                if let loaded = self.currentLoadedURL, !loaded.isEmpty, loaded != "local://startpage" {
                    return loaded
                }
                if let webUrl = webView.url?.absoluteString, !webUrl.isEmpty, !webUrl.contains("startpage.html") && webUrl != "about:blank" {
                    return webUrl
                }
                return nil
            }()

            // Purge WKHTTPCookieStore for this profile only
            dataStore.httpCookieStore.getAllCookies { cookies in
                for cookie in cookies {
                    dataStore.httpCookieStore.delete(cookie)
                }
            }

            // Purge WebKit website data store
            dataStore.removeData(ofTypes: types, modifiedSince: Date.distantPast) { [weak self] in
                DispatchQueue.main.async {
                    if reloadCurrent, let url = currentURL {
                        self?.loadURL(url, forceReload: true)
                    } else {
                        self?.loadLocalStartPage()
                    }
                }
            }
        }
    }
}
