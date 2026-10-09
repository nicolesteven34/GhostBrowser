import Foundation
import WebKit

public class ContentBlockerManager {
    public static let shared = ContentBlockerManager()
    private let ruleListIdentifier = "GhostBrowserBlockerRules"
    private var cachedRuleList: WKContentRuleList?

    private init() {}

    /// Compiles blockrules.json into a high-performance native WebKit rule list
    public func loadContentBlockerRules(completion: @escaping (WKContentRuleList?) -> Void) {
        if let cached = cachedRuleList {
            completion(cached)
            return
        }

        guard let path = Bundle.main.path(forResource: "blockrules", ofType: "json"),
              let jsonString = try? String(contentsOfFile: path, encoding: .utf8) else {
            print("[ContentBlocker] Error: Could not locate blockrules.json")
            completion(nil)
            return
        }

        WKContentRuleListStore.default().compileContentRuleList(
            forIdentifier: ruleListIdentifier,
            encodedContentRuleList: jsonString
        ) { [weak self] (ruleList, error) in
            if let error = error {
                print("[ContentBlocker] Compilation failed: \(error.localizedDescription)")
                completion(nil)
            } else {
                self?.cachedRuleList = ruleList
                print("[ContentBlocker] Rule list successfully compiled.")
                completion(ruleList)
            }
        }
    }
}
