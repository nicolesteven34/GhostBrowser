import Foundation

public struct BrowserTab: Identifiable, Equatable {
    public let id: UUID
    public var urlString: String
    public var title: String
    public var canGoBack: Bool
    public var canGoForward: Bool
    public var isLoading: Bool
    public var estimatedProgress: Double

    public init(
        id: UUID = UUID(),
        urlString: String = "local://startpage",
        title: String = "Start Page",
        canGoBack: Bool = false,
        canGoForward: Bool = false,
        isLoading: Bool = false,
        estimatedProgress: Double = 0.0
    ) {
        self.id = id
        self.urlString = urlString
        self.title = title
        self.canGoBack = canGoBack
        self.canGoForward = canGoForward
        self.isLoading = isLoading
        self.estimatedProgress = estimatedProgress
    }

    public static func == (lhs: BrowserTab, rhs: BrowserTab) -> Bool {
        lhs.id == rhs.id &&
        lhs.urlString == rhs.urlString &&
        lhs.title == rhs.title &&
        lhs.canGoBack == rhs.canGoBack &&
        lhs.canGoForward == rhs.canGoForward &&
        lhs.isLoading == rhs.isLoading &&
        lhs.estimatedProgress == rhs.estimatedProgress
    }
}
