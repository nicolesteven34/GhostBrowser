import SwiftUI

/// Native SwiftUI Floating Notes / Scratchpad Window
/// Rendered 100% in the native iOS/iPadOS host layer outside WKWebView.
struct SessionNotesOverlayView: View {
    let profileID: UUID
    let profileName: String
    var themeColorHex: String = "#00D4FF"
    let currentURL: String
    @Binding var isPresented: Bool

    @State private var noteText: String = ""
    @State private var fontZoom: CGFloat = 15.0
    @State private var useMonospace: Bool = false
    @State private var isExpanded: Bool = false

    // Floating position & interactive resize state
    @State private var panelOffset: CGSize = .zero
    @State private var dragDelta: CGSize = .zero
    @State private var panelWidth: CGFloat = 430
    @State private var panelHeight: CGFloat = 460
    @State private var resizeDelta: CGSize = .zero
    @State private var copiedBanner: Bool = false

    private var storageKey: String {
        "ghost_session_notes_v2_\(profileID.uuidString)"
    }

    var body: some View {
        VStack(spacing: 0) {
            headerAndFormattingToolbar
            Divider().background(Color.white.opacity(0.12))
            editorArea
            Divider().background(Color.white.opacity(0.12))
            footerBar
        }
        .frame(
            width: max(310, min(780, (isExpanded ? 620 : panelWidth) + resizeDelta.width)),
            height: max(260, min(720, (isExpanded ? 540 : panelHeight) + resizeDelta.height))
        )
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(red: 0.07, green: 0.08, blue: 0.11).opacity(0.97))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(
                    LinearGradient(
                        colors: [Color.cyan.opacity(0.55), Color.blue.opacity(0.35), Color.white.opacity(0.12)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1.2
                )
        )
        .shadow(color: Color.black.opacity(0.55), radius: 24, x: 0, y: 12)
        .offset(
            x: panelOffset.width + dragDelta.width,
            y: panelOffset.height + dragDelta.height
        )
        .onAppear {
            loadNotes()
        }
        .onChange(of: profileID) { _ in
            loadNotes()
        }
    }

    // MARK: - Compact Draggable Header & Formatting Toolbar
    private var headerAndFormattingToolbar: some View {
        VStack(spacing: 6) {
            HStack(spacing: 8) {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.secondary)
                    .padding(.leading, 2)

                Button(action: copyAllNotes) {
                    HStack(spacing: 4) {
                        Image(systemName: copiedBanner ? "checkmark" : "doc.on.doc")
                            .font(.system(size: 11, weight: .semibold))
                        Text(copiedBanner ? "Copied" : "Copy")
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundColor(copiedBanner ? .green : .white.opacity(0.85))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.white.opacity(0.08))
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)

                Button(action: {
                    noteText = ""
                    saveNotes(noteText)
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "trash")
                            .font(.system(size: 11, weight: .semibold))
                        Text("Clear")
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundColor(.red.opacity(0.85))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.white.opacity(0.08))
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)

                Button(action: { useMonospace.toggle() }) {
                    Text(useMonospace ? "Mono" : "Sans")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(useMonospace ? .cyan : .white.opacity(0.85))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(6)
                }
                .buttonStyle(.plain)

                Spacer()

                // Zoom Controls (A- / 100% / A+)
                HStack(spacing: 2) {
                    Button(action: { fontZoom = max(11, fontZoom - 1.5) }) {
                        Text("A-")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white.opacity(0.85))
                            .frame(width: 26, height: 24)
                    }
                    .buttonStyle(.plain)

                    Button(action: { fontZoom = 15.0 }) {
                        Text("\(Int((fontZoom / 15.0) * 100))%")
                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                            .foregroundColor(.cyan)
                            .frame(width: 38, height: 24)
                    }
                    .buttonStyle(.plain)

                    Button(action: { fontZoom = min(28, fontZoom + 1.5) }) {
                        Text("A+")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white.opacity(0.85))
                            .frame(width: 26, height: 24)
                    }
                    .buttonStyle(.plain)
                }
                .background(Color.white.opacity(0.07))
                .cornerRadius(6)

                Button(action: {
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.82)) {
                        isExpanded.toggle()
                    }
                }) {
                    Image(systemName: isExpanded ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white.opacity(0.85))
                        .frame(width: 28, height: 26)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(6)
                }
                .buttonStyle(.plain)

                Button(action: {
                    saveNotes(noteText)
                    isPresented = false
                }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white.opacity(0.85))
                        .frame(width: 28, height: 26)
                        .background(Color.red.opacity(0.28))
                        .cornerRadius(6)
                }
                .buttonStyle(.plain)
            }

            // Formatting Row
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    formatChip(title: "H1", icon: nil) { insertBlockPrefix("# ") }
                    formatChip(title: "H2", icon: nil) { insertBlockPrefix("## ") }
                    formatChip(title: "List", icon: "list.bullet") { insertBlockPrefix("• ") }
                    formatChip(title: "Task", icon: "checkmark.square") { insertBlockPrefix("☐ ") }
                    formatChip(title: "Bold", icon: "bold") { insertInlineSnippet("**bold**") }
                    formatChip(title: "Line", icon: "minus") { insertBlockPrefix("\n────────────────────────\n") }
                    formatChip(title: "Time", icon: "clock") { insertTimestamp() }
                    formatChip(title: "URL", icon: "link") {
                        if !currentURL.isEmpty {
                            insertInlineSnippet("\(currentURL) ")
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.04))
        .contentShape(Rectangle())
        .gesture(
            DragGesture()
                .onChanged { value in
                    dragDelta = value.translation
                }
                .onEnded { value in
                    panelOffset.width += value.translation.width
                    panelOffset.height += value.translation.height
                    dragDelta = .zero
                }
        )
    }

    private func formatChip(title: String, icon: String?, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 11, weight: .semibold))
                }
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
            }
            .foregroundColor(.white.opacity(0.88))
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color.white.opacity(0.08))
            .cornerRadius(6)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Zoomable Editor Area
    private var editorArea: some View {
        TextEditor(text: Binding(
            get: { noteText },
            set: { newValue in
                noteText = newValue
                saveNotes(newValue)
            }
        ))
        .font(.system(size: fontZoom, weight: .regular, design: useMonospace ? .monospaced : .default))
        .foregroundColor(.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .scrollContentBackground(.hidden)
        .background(Color(red: 0.05, green: 0.06, blue: 0.09))
    }

    // MARK: - Footer with Word Count & Interactive Corner Resize Handle
    private var footerBar: some View {
        HStack(spacing: 8) {
            let words = noteText.split { $0.isWhitespace || $0.isNewline }.count
            Text("\(words) words • \(noteText.count) chars • ✓ Saved")
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundColor(.secondary)

            Spacer()

            Image(systemName: "arrow.up.left.and.arrow.down.right.circle.fill")
                .font(.system(size: 15))
                .foregroundColor(.cyan.opacity(0.8))
                .frame(width: 26, height: 24)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            if !isExpanded {
                                resizeDelta = value.translation
                            }
                        }
                        .onEnded { value in
                            if !isExpanded {
                                panelWidth = max(310, min(780, panelWidth + value.translation.width))
                                panelHeight = max(260, min(720, panelHeight + value.translation.height))
                                resizeDelta = .zero
                            }
                        }
                )
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 5)
        .background(Color.white.opacity(0.03))
    }

    // MARK: - Persistence & Formatting Helpers
    private func loadNotes() {
        var raw = UserDefaults.standard.string(forKey: storageKey) ?? ""
        while raw.hasPrefix("\n") || raw.hasPrefix("\r") {
            raw.removeFirst()
        }
        noteText = raw
    }

    private func saveNotes(_ value: String) {
        UserDefaults.standard.set(value, forKey: storageKey)
    }

    private func insertBlockPrefix(_ prefix: String) {
        if noteText.isEmpty || noteText.hasSuffix("\n") {
            noteText += prefix
        } else {
            noteText += "\n" + prefix
        }
        saveNotes(noteText)
    }

    private func insertInlineSnippet(_ snippet: String) {
        noteText += snippet
        saveNotes(noteText)
    }

    private func insertTimestamp() {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        let stamp = "[\(formatter.string(from: Date()))] "
        insertBlockPrefix(stamp)
    }

    private func copyAllNotes() {
        UIPasteboard.general.string = noteText
        copiedBanner = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            copiedBanner = false
        }
    }
}
