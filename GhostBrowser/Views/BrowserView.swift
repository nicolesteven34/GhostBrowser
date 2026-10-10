import SwiftUI
import WebKit

public struct BrowserView: UIViewRepresentable {
    @ObservedObject var privacyProfile: PrivacyProfile
    @Binding var currentURLString: String
    @Binding var canGoBack: Bool
    @Binding var canGoForward: Bool
    @Binding var isLoading: Bool
    @Binding var estimatedProgress: Double
    @Binding var reloadTrigger: Int
    @Binding var wipeTrigger: Int

    public init(
        privacyProfile: PrivacyProfile,
        currentURLString: Binding<String>,
        canGoBack: Binding<Bool>,
        canGoForward: Binding<Bool>,
        isLoading: Binding<Bool>,
        estimatedProgress: Binding<Double>,
        reloadTrigger: Binding<Int>,
        wipeTrigger: Binding<Int>
    ) {
        self.privacyProfile = privacyProfile
        self._currentURLString = currentURLString
        self._canGoBack = canGoBack
        self._canGoForward = canGoForward
        self._isLoading = isLoading
        self._estimatedProgress = estimatedProgress
        self._reloadTrigger = reloadTrigger
        self._wipeTrigger = wipeTrigger
    }

    public func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    public func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()

        // 1. Data Store: Default (persistent) prevents "Incognito Detected"
        if privacyProfile.ephemeralRAMMode {
            configuration.websiteDataStore = WKWebsiteDataStore.nonPersistent()
        } else {
            configuration.websiteDataStore = WKWebsiteDataStore.default()
        }

        let userContentController = WKUserContentController()

        // 2. Register native script message handler for local start page
        userContentController.add(context.coordinator, name: "ghostNav")

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
        webView.customUserAgent = privacyProfile.effectiveUserAgent
        webView.allowsBackForwardNavigationGestures = true

        context.coordinator.setupObservers(for: webView)
        context.coordinator.webView = webView
        context.coordinator.lastProfileDevice = privacyProfile.selectedDevice
        context.coordinator.lastUserAgent = privacyProfile.effectiveUserAgent
        context.coordinator.lastSessionSeed = privacyProfile.sessionSeed

        // Load local start page initially
        context.coordinator.loadLocalStartPage()

        return webView
    }

    public func updateUIView(_ webView: WKWebView, context: Context) {
        // Detect device profile, user agent, or session seed changes
        if context.coordinator.lastProfileDevice != privacyProfile.selectedDevice ||
           context.coordinator.lastUserAgent != privacyProfile.effectiveUserAgent ||
           context.coordinator.lastSessionSeed != privacyProfile.sessionSeed {
            context.coordinator.lastProfileDevice = privacyProfile.selectedDevice
            context.coordinator.lastUserAgent = privacyProfile.effectiveUserAgent
            context.coordinator.lastSessionSeed = privacyProfile.sessionSeed

            context.coordinator.reconfigurePrivacy(for: webView)

            if privacyProfile.autoPurgeOnProfileSwitch {
                context.coordinator.nukeSession(reloadCurrent: true)
            }
        }

        // Handle URL change from user navigation
        if currentURLString != context.coordinator.currentLoadedURL && !currentURLString.isEmpty {
            context.coordinator.loadURL(currentURLString)
        }

        // Handle explicit reload trigger
        if context.coordinator.lastReloadTrigger != reloadTrigger {
            context.coordinator.lastReloadTrigger = reloadTrigger
            if context.coordinator.currentLoadedURL == "local://startpage" {
                context.coordinator.loadLocalStartPage()
            } else {
                webView.reload()
            }
        }

        // Handle panic wipe trigger
        if context.coordinator.lastWipeTrigger != wipeTrigger {
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

        private var progressObservation: NSKeyValueObservation?
        private var backObservation: NSKeyValueObservation?
        private var forwardObservation: NSKeyValueObservation?

        init(_ parent: BrowserView) {
            self.parent = parent
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

            NotificationCenter.default.addObserver(forName: NSNotification.Name("GhostWebViewGoBack"), object: nil, queue: .main) { [weak self] _ in
                self?.webView?.goBack()
            }
            NotificationCenter.default.addObserver(forName: NSNotification.Name("GhostWebViewGoForward"), object: nil, queue: .main) { [weak self] _ in
                self?.webView?.goForward()
            }
        }

        public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "ghostNav", let target = message.body as? String {
                DispatchQueue.main.async {
                    if target == "ghost-action://regenerate" {
                        self.parent.privacyProfile.regenerateRealisticIdentity()
                    } else {
                        self.loadURL(target)
                    }
                }
            }
        }

        public func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if navigationAction.targetFrame == nil {
                webView.load(navigationAction.request)
            }
            return nil
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

                self.currentLoadedURL = "local://startpage"
                DispatchQueue.main.async {
                    self.parent.currentURLString = "local://startpage"
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
            DispatchQueue.main.async {
                self.parent.currentURLString = url.absoluteString
            }

            let cachePolicy: URLRequest.CachePolicy = forceReload ? .reloadIgnoringLocalAndRemoteCacheData : .useProtocolCachePolicy
            let request = URLRequest(url: url, cachePolicy: cachePolicy, timeoutInterval: 30)
            webView.load(request)
        }

        public func reconfigurePrivacy(for webView: WKWebView) {
            // Update native C++ User Agent & Preferred Content Mode
            webView.customUserAgent = parent.privacyProfile.effectiveUserAgent
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

        public func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.isLoading = true
            if let url = webView.url?.absoluteString {
                if !url.contains("startpage.html") && url != "about:blank" {
                    currentLoadedURL = url
                    parent.currentURLString = url
                }
            }
        }

        public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
            if let url = webView.url?.absoluteString {
                if !url.contains("startpage.html") && url != "about:blank" {
                    currentLoadedURL = url
                    parent.currentURLString = url
                }
            }
        }

        public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
            print("[BrowserView] Provisional navigation failed: \(error.localizedDescription)")
        }

        public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
            print("[BrowserView] Navigation failed: \(error.localizedDescription)")
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

            // Purge system URLCache and HTTPCookieStorage
            URLCache.shared.removeAllCachedResponses()
            if let cookies = HTTPCookieStorage.shared.cookies {
                for cookie in cookies {
                    HTTPCookieStorage.shared.deleteCookie(cookie)
                }
            }

            // Purge WKHTTPCookieStore
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
