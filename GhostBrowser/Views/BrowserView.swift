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

        // 1. RAM-only Ephemeral Mode (Zero disk persistence)
        if privacyProfile.ephemeralRAMMode {
            configuration.websiteDataStore = WKWebsiteDataStore.nonPersistent()
        } else {
            configuration.websiteDataStore = WKWebsiteDataStore.default()
        }

        let userContentController = WKUserContentController()

        // 2. Inject Active Privacy Profile & Apple Device Signature
        let configScript = WKUserScript(
            source: privacyProfile.generateJSConfig(),
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        userContentController.addUserScript(configScript)

        // 3. Inject Stealth Anti-Fingerprinting Engine
        if let scriptPath = Bundle.main.path(forResource: "anti_fingerprint", ofType: "js"),
           let scriptSource = try? String(contentsOfFile: scriptPath, encoding: .utf8) {
            let antiFpScript = WKUserScript(
                source: scriptSource,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: false
            )
            userContentController.addUserScript(antiFpScript)
        }

        // 4. Apply Native Block Rules
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

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.customUserAgent = privacyProfile.effectiveUserAgent
        webView.allowsBackForwardNavigationGestures = true

        context.coordinator.setupObservers(for: webView)
        context.coordinator.webView = webView

        // Load local offline Start Page by default
        context.coordinator.loadLocalStartPage(in: webView)

        return webView
    }

    public func updateUIView(_ webView: WKWebView, context: Context) {
        // Synchronize User-Agent
        if webView.customUserAgent != privacyProfile.effectiveUserAgent {
            webView.customUserAgent = privacyProfile.effectiveUserAgent
        }

        // Handle navigation to newly submitted URL
        if currentURLString.isEmpty || currentURLString == "local://startpage" {
            // Already on start page or empty
        } else if let targetURL = URL(string: currentURLString),
                  let current = webView.url?.absoluteString,
                  current != currentURLString,
                  !webView.isLoading {
            webView.load(URLRequest(url: targetURL))
        }

        // Handle reload trigger
        if context.coordinator.lastReloadTrigger != reloadTrigger {
            context.coordinator.lastReloadTrigger = reloadTrigger
            if currentURLString == "local://startpage" {
                context.coordinator.loadLocalStartPage(in: webView)
            } else {
                webView.reload()
            }
        }

        // Handle session wipe trigger
        if context.coordinator.lastWipeTrigger != wipeTrigger {
            context.coordinator.lastWipeTrigger = wipeTrigger
            context.coordinator.nukeSession(webView: webView)
        }
    }

    public class Coordinator: NSObject, WKNavigationDelegate {
        var parent: BrowserView
        weak var webView: WKWebView?
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

        public func loadLocalStartPage(in webView: WKWebView) {
            if let startURL = Bundle.main.url(forResource: "startpage", withExtension: "html"),
               let html = try? String(contentsOf: startURL, encoding: .utf8) {
                webView.loadHTMLString(html, baseURL: Bundle.main.bundleURL)
                parent.currentURLString = "local://startpage"
            }
        }

        public func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            // Intercept internal ghost-search query from start page
            if url.scheme == "ghost-search" {
                let query = url.host ?? url.path.replacingOccurrences(of: "/", with: "")
                if let decoded = query.removingPercentEncoding,
                   let searchURL = parent.privacyProfile.searchEngine.searchURL(for: decoded) {
                    decisionHandler(.cancel)
                    DispatchQueue.main.async {
                        self.parent.currentURLString = searchURL.absoluteString
                        webView.load(URLRequest(url: searchURL))
                    }
                    return
                }
            }

            decisionHandler(.allow)
        }

        public func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.isLoading = true
            if let url = webView.url?.absoluteString {
                if !url.contains("startpage.html") {
                    parent.currentURLString = url
                }
            }
        }

        public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
            if let url = webView.url?.absoluteString {
                if !url.contains("startpage.html") {
                    parent.currentURLString = url
                }
            }
        }

        public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
        }

        public func nukeSession(webView: WKWebView) {
            let dataStore = webView.configuration.websiteDataStore
            let types = WKWebsiteDataStore.allWebsiteDataTypes()
            dataStore.removeData(ofTypes: types, modifiedSince: Date.distantPast) { [weak self] in
                DispatchQueue.main.async {
                    guard let self = self else { return }
                    self.loadLocalStartPage(in: webView)
                }
            }
        }
    }
}
