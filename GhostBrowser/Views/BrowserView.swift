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

        // 1. Storage isolation
        if privacyProfile.ephemeralMode {
            configuration.websiteDataStore = WKWebsiteDataStore.nonPersistent()
        } else {
            configuration.websiteDataStore = WKWebsiteDataStore.default()
        }

        // 2. Setup User Content Controller
        let userContentController = WKUserContentController()

        // Inject Privacy Configuration
        let configScriptSource = privacyProfile.generateJSConfig()
        let configScript = WKUserScript(
            source: configScriptSource,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        userContentController.addUserScript(configScript)

        // Inject Anti-Fingerprinting Engine
        if let scriptPath = Bundle.main.path(forResource: "anti_fingerprint", ofType: "js"),
           let scriptSource = try? String(contentsOfFile: scriptPath, encoding: .utf8) {
            let antiFpScript = WKUserScript(
                source: scriptSource,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: false
            )
            userContentController.addUserScript(antiFpScript)
        }

        // Apply Declarative Content Blocker Rules
        if privacyProfile.blockTrackers {
            ContentBlockerManager.shared.loadContentBlockerRules { ruleList in
                if let ruleList = ruleList {
                    userContentController.add(ruleList)
                }
            }
        }

        configuration.userContentController = userContentController

        // Media playback privacy
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = .all

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.customUserAgent = privacyProfile.effectiveUserAgent
        webView.allowsBackForwardNavigationGestures = true

        // Observers for progress and back/forward state
        context.coordinator.setupObservers(for: webView)

        // Initial default URL
        if let url = URL(string: "https://duckduckgo.com") {
            webView.load(URLRequest(url: url))
        }

        context.coordinator.webView = webView
        return webView
    }

    public func updateUIView(_ webView: WKWebView, context: Context) {
        // Handle User-Agent updates
        if webView.customUserAgent != privacyProfile.effectiveUserAgent {
            webView.customUserAgent = privacyProfile.effectiveUserAgent
        }

        // Handle navigation to newly submitted URL
        if let targetURL = URL(string: currentURLString),
           let current = webView.url?.absoluteString,
           current != currentURLString,
           !webView.isLoading {
            webView.load(URLRequest(url: targetURL))
        }

        // Check reload trigger
        if context.coordinator.lastReloadTrigger != reloadTrigger {
            context.coordinator.lastReloadTrigger = reloadTrigger
            if let targetURL = URL(string: currentURLString), webView.url?.absoluteString != currentURLString {
                webView.load(URLRequest(url: targetURL))
            } else {
                webView.reload()
            }
        }

        // Check wipe trigger (Hard privacy reset)
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

        public func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.isLoading = true
            if let url = webView.url?.absoluteString {
                parent.currentURLString = url
            }
        }

        public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
            if let url = webView.url?.absoluteString {
                parent.currentURLString = url
            }
        }

        public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
        }

        public func nukeSession(webView: WKWebView) {
            let dataStore = webView.configuration.websiteDataStore
            let types = WKWebsiteDataStore.allWebsiteDataTypes()
            dataStore.removeData(ofTypes: types, modifiedSince: Date.distantPast) {
                DispatchQueue.main.async {
                    if let home = URL(string: "https://duckduckgo.com") {
                        webView.load(URLRequest(url: home))
                    }
                }
            }
        }
    }
}
