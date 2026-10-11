import SwiftUI
import PhotosUI

public struct SessionToolsSheet: View {
    @ObservedObject var privacyProfile: PrivacyProfile
    @ObservedObject var profileManager: ProfileManager
    @Environment(\.dismiss) private var dismiss

    @State private var selectedTab: ToolTab = .gps
    @State private var selectedPhotoItem: PhotosPickerItem? = nil
    @State private var previewImage: UIImage? = nil
    @State private var isProcessingImage: Bool = false

    public enum ToolTab: String, CaseIterable, Identifiable {
        case gps = "GPS Location"
        case camera = "Virtual Camera"

        public var id: String { rawValue }
    }

    private struct CityPreset: Identifiable {
        let id = UUID()
        let name: String
        let flag: String
        let lat: Double
        let lng: Double
    }

    private let presets: [CityPreset] = [
        CityPreset(name: "San Francisco", flag: "🌁", lat: 37.774929, lng: -122.419416),
        CityPreset(name: "New York", flag: "🗽", lat: 40.712776, lng: -74.005974),
        CityPreset(name: "Los Angeles", flag: "🌴", lat: 34.052235, lng: -118.243683),
        CityPreset(name: "Miami", flag: "🏖️", lat: 25.761681, lng: -80.191788),
        CityPreset(name: "Chicago", flag: "🏙️", lat: 41.878113, lng: -87.629799),
        CityPreset(name: "London", flag: "🎡", lat: 51.507351, lng: -0.127758),
        CityPreset(name: "Tokyo", flag: "🗼", lat: 35.676192, lng: 139.650311),
        CityPreset(name: "Toronto", flag: "🍁", lat: 43.653225, lng: -79.383186)
    ]

    public init(privacyProfile: PrivacyProfile, profileManager: ProfileManager) {
        self.privacyProfile = privacyProfile
        self.profileManager = profileManager
    }

    public var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Segmented Tab Control
                Picker("Tool Mode", selection: $selectedTab) {
                    Label("GPS Location", systemImage: "location.fill.viewfinder").tag(ToolTab.gps)
                    Label("Virtual Camera", systemImage: "camera.viewfinder").tag(ToolTab.camera)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 8)

                ScrollView {
                    VStack(spacing: 18) {
                        if selectedTab == .gps {
                            gpsSection
                        } else {
                            cameraSection
                        }
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Session Media & Sensors")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        profileManager.saveProfileSensors(from: privacyProfile)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .onAppear {
            loadExistingPreview()
        }
    }

    // MARK: - GPS Section
    private var gpsSection: some View {
        VStack(spacing: 16) {
            // Master Toggle Card
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Mock GPS Location")
                        .font(.headline)
                    Text("Intercepts HTML5 Geolocation API with realistic micro-jitter & latency")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Toggle("", isOn: $privacyProfile.mockLocationEnabled)
                    .labelsHidden()
                    .onChange(of: privacyProfile.mockLocationEnabled) { _ in
                        profileManager.saveProfileSensors(from: privacyProfile)
                    }
            }
            .padding(14)
            .background(Color(.systemGray6))
            .cornerRadius(12)

            // Preset Locations Carousel
            VStack(alignment: .leading, spacing: 8) {
                Text("Quick City Presets")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(presets) { preset in
                            Button(action: {
                                privacyProfile.mockLocationEnabled = true
                                privacyProfile.mockLatitude = preset.lat
                                privacyProfile.mockLongitude = preset.lng
                                privacyProfile.mockLocationName = preset.name
                                profileManager.saveProfileSensors(from: privacyProfile)
                            }) {
                                HStack(spacing: 6) {
                                    Text(preset.flag)
                                    Text(preset.name)
                                        .font(.system(size: 13, weight: .medium))
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(
                                    (abs(privacyProfile.mockLatitude - preset.lat) < 0.001 &&
                                     abs(privacyProfile.mockLongitude - preset.lng) < 0.001 &&
                                     privacyProfile.mockLocationEnabled)
                                    ? Color.blue.opacity(0.18)
                                    : Color(.systemGray6)
                                )
                                .foregroundColor(
                                    (abs(privacyProfile.mockLatitude - preset.lat) < 0.001 &&
                                     abs(privacyProfile.mockLongitude - preset.lng) < 0.001 &&
                                     privacyProfile.mockLocationEnabled)
                                    ? .blue
                                    : .primary
                                )
                                .cornerRadius(8)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(
                                            (abs(privacyProfile.mockLatitude - preset.lat) < 0.001 &&
                                             abs(privacyProfile.mockLongitude - preset.lng) < 0.001 &&
                                             privacyProfile.mockLocationEnabled)
                                            ? Color.blue.opacity(0.4)
                                            : Color.clear,
                                            lineWidth: 1
                                        )
                                )
                            }
                        }
                    }
                }
            }

            // Custom Coordinates Inputs
            VStack(alignment: .leading, spacing: 10) {
                Text("Live Coordinates (Zero Page Reload)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)

                VStack(spacing: 10) {
                    HStack {
                        Text("Latitude:")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.secondary)
                            .frame(width: 80, alignment: .leading)
                        TextField("37.774929", value: $privacyProfile.mockLatitude, format: .number.precision(.fractionLength(6)))
                            .textFieldStyle(.roundedBorder)
                            .font(.system(.body, design: .monospaced))
                            .keyboardType(.numbersAndPunctuation)
                            .onChange(of: privacyProfile.mockLatitude) { _ in
                                profileManager.saveProfileSensors(from: privacyProfile)
                            }
                    }

                    HStack {
                        Text("Longitude:")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.secondary)
                            .frame(width: 80, alignment: .leading)
                        TextField("-122.419416", value: $privacyProfile.mockLongitude, format: .number.precision(.fractionLength(6)))
                            .textFieldStyle(.roundedBorder)
                            .font(.system(.body, design: .monospaced))
                            .keyboardType(.numbersAndPunctuation)
                            .onChange(of: privacyProfile.mockLongitude) { _ in
                                profileManager.saveProfileSensors(from: privacyProfile)
                            }
                    }
                }
                .padding(14)
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }

            // Fidelity Specs Card
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Image(systemName: privacyProfile.mockLocationEnabled ? "checkmark.circle.fill" : "circle.dashed")
                        .foregroundColor(privacyProfile.mockLocationEnabled ? .green : .secondary)
                    Text(privacyProfile.mockLocationEnabled ? "Active Broadcast to Current Tab" : "Real Device GPS In Use")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(privacyProfile.mockLocationEnabled ? .green : .secondary)
                    Spacer()
                    Text("~14.5m Accuracy")
                        .font(.system(size: 10, weight: .bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.12))
                        .foregroundColor(.blue)
                        .cornerRadius(4)
                }

                Text("Simulates authentic Wi-Fi + Assisted GPS positioning with ±0.000015° micro-drift on watchPosition callbacks so target anti-fraud scripts detect natural human movement.")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
            .padding(12)
            .background(Color(.systemGray6).opacity(0.6))
            .cornerRadius(10)
        }
    }

    // MARK: - Camera Section
    private var cameraSection: some View {
        VStack(spacing: 16) {
            // Master Toggle Card
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Virtual Camera Stream")
                        .font(.headline)
                    Text("Streams custom photo or video directly into WebRTC getUserMedia")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Toggle("", isOn: $privacyProfile.virtualCameraEnabled)
                    .labelsHidden()
                    .onChange(of: privacyProfile.virtualCameraEnabled) { _ in
                        profileManager.saveProfileSensors(from: privacyProfile)
                    }
            }
            .padding(14)
            .background(Color(.systemGray6))
            .cornerRadius(12)

            // Gallery Upload Button
            PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                HStack(spacing: 8) {
                    if isProcessingImage {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle())
                    } else {
                        Image(systemName: "photo.badge.plus")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    Text(privacyProfile.virtualCameraImageBase64.isEmpty ? "Select Photo from Photo Library" : "Change Photo from Library")
                        .font(.system(size: 15, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            .onChange(of: selectedPhotoItem) { newItem in
                handlePhotoSelection(newItem)
            }

            // Interactive Viewfinder Preview Box
            VStack(spacing: 8) {
                HStack {
                    Text("Live WebRTC Viewfinder")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                    Spacer()
                    if privacyProfile.virtualCameraEnabled {
                        HStack(spacing: 4) {
                            Circle().fill(Color.green).frame(width: 7, height: 7)
                            Text("STREAMING (1280x720)")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.green)
                        }
                    }
                }

                ZStack {
                    Color.black

                    if let img = previewImage {
                        Image(uiImage: img)
                            .resizable()
                            .scaledToFit()
                            .scaleEffect(privacyProfile.virtualCameraZoom)
                            .offset(
                                x: CGFloat(privacyProfile.virtualCameraPanX * 2.5),
                                y: CGFloat(privacyProfile.virtualCameraPanY * 1.5)
                            )
                            .gesture(
                                DragGesture()
                                    .onChanged { val in
                                        privacyProfile.virtualCameraPanX = Double(val.translation.width / 3.0)
                                        privacyProfile.virtualCameraPanY = Double(val.translation.height / 3.0)
                                    }
                                    .onEnded { _ in
                                        profileManager.saveProfileSensors(from: privacyProfile)
                                    }
                            )
                    } else {
                        VStack(spacing: 8) {
                            Image(systemName: "camera.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.gray)
                            Text("FaceTime Placeholder Active")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.gray)
                            Text("Upload a photo above to stream a custom frame")
                                .font(.system(size: 11))
                                .foregroundColor(.gray.opacity(0.8))
                        }
                    }

                    // Viewfinder Crosshairs & Frame
                    VStack {
                        HStack {
                            Text("REC [●]")
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundColor(privacyProfile.virtualCameraEnabled ? .red : .gray)
                            Spacer()
                            Text("30 FPS")
                                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .padding(8)
                        Spacer()
                        Image(systemName: "plus")
                            .font(.system(size: 14))
                            .foregroundColor(.white.opacity(0.35))
                        Spacer()
                    }
                }
                .frame(height: 190)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
                .clipped()

                Text("💡 Tip: Drag directly inside the viewfinder or use the sliders below to move the frame in real time.")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }

            // Real-Time Framing Controls
            VStack(spacing: 12) {
                // Pan Horizontal (X)
                VStack(spacing: 4) {
                    HStack {
                        Text("Pan Horizontal (X)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("\(Int(privacyProfile.virtualCameraPanX))%")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.primary)
                    }
                    Slider(value: $privacyProfile.virtualCameraPanX, in: -100...100, step: 1)
                        .onChange(of: privacyProfile.virtualCameraPanX) { _ in
                            profileManager.saveProfileSensors(from: privacyProfile)
                        }
                }

                // Pan Vertical (Y)
                VStack(spacing: 4) {
                    HStack {
                        Text("Pan Vertical (Y)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("\(Int(privacyProfile.virtualCameraPanY))%")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.primary)
                    }
                    Slider(value: $privacyProfile.virtualCameraPanY, in: -100...100, step: 1)
                        .onChange(of: privacyProfile.virtualCameraPanY) { _ in
                            profileManager.saveProfileSensors(from: privacyProfile)
                        }
                }

                // Zoom Level
                VStack(spacing: 4) {
                    HStack {
                        Text("Zoom Scale")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(String(format: "%.1fx", privacyProfile.virtualCameraZoom))
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.primary)
                    }
                    Slider(value: $privacyProfile.virtualCameraZoom, in: 0.5...3.0, step: 0.1)
                        .onChange(of: privacyProfile.virtualCameraZoom) { _ in
                            profileManager.saveProfileSensors(from: privacyProfile)
                        }
                }

                // Center / Reset Button
                Button(action: {
                    privacyProfile.virtualCameraPanX = 0
                    privacyProfile.virtualCameraPanY = 0
                    privacyProfile.virtualCameraZoom = 1.0
                    profileManager.saveProfileSensors(from: privacyProfile)
                }) {
                    Label("Center & Reset Framing", systemImage: "arrow.counterclockwise")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.blue)
                        .padding(.vertical, 6)
                }
            }
            .padding(14)
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }

    // MARK: - Helpers
    private func loadExistingPreview() {
        if !privacyProfile.virtualCameraImageBase64.isEmpty {
            let base64Clean = privacyProfile.virtualCameraImageBase64.replacingOccurrences(of: "data:image/jpeg;base64,", with: "")
                .replacingOccurrences(of: "data:image/png;base64,", with: "")
            if let data = Data(base64Encoded: base64Clean), let img = UIImage(data: data) {
                self.previewImage = img
            }
        }
    }

    private func handlePhotoSelection(_ item: PhotosPickerItem?) {
        guard let item = item else { return }
        isProcessingImage = true

        Task {
            if let data = try? await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                // Downscale to max 1280 width/height to ensure high-performance 60fps canvas transfer
                let maxDim: CGFloat = 1280
                var targetSize = image.size
                if targetSize.width > maxDim || targetSize.height > maxDim {
                    let ratio = min(maxDim / targetSize.width, maxDim / targetSize.height)
                    targetSize = CGSize(width: targetSize.width * ratio, height: targetSize.height * ratio)
                }

                UIGraphicsBeginImageContextWithOptions(targetSize, false, 1.0)
                image.draw(in: CGRect(origin: .zero, size: targetSize))
                let resized = UIGraphicsGetImageFromCurrentImageContext()
                UIGraphicsEndImageContext()

                let finalImg = resized ?? image
                if let jpegData = finalImg.jpegData(compressionQuality: 0.75) {
                    let base64 = "data:image/jpeg;base64," + jpegData.base64EncodedString()
                    await MainActor.run {
                        self.previewImage = finalImg
                        self.privacyProfile.virtualCameraImageBase64 = base64
                        self.privacyProfile.virtualCameraEnabled = true
                        self.isProcessingImage = false
                        self.profileManager.saveProfileSensors(from: self.privacyProfile)
                    }
                }
            } else {
                await MainActor.run {
                    self.isProcessingImage = false
                }
            }
        }
    }
}
