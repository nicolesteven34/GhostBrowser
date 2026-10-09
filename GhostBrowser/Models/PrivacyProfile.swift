import Foundation
import SwiftUI

public enum UserAgentPreset: String, CaseIterable, Identifiable {
    case defaultIPad = "iPadOS Safari (Default)"
    case desktopMac = "macOS Safari (Desktop)"
    case chromeWindows = "Chrome 122 (Windows 11)"
    case firefoxLinux = "Firefox 124 (Linux x86_64)"
    case custom = "Custom User-Agent"

    public var id: String { rawValue }

    public var stringValue: String {
        switch self {
        case .defaultIPad:
            return "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
        case .desktopMac:
            return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
        case .chromeWindows:
            return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        case .firefoxLinux:
            return "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0"
        case .custom:
            return ""
        }
    }
}

public enum GPUPreset: String, CaseIterable, Identifiable {
    case appleM2 = "Apple M2 (Apple Inc.)"
    case intelIris = "Intel Iris Xe Graphics (Intel Inc.)"
    case nvidiaRTX = "NVIDIA GeForce RTX 3060 (NVIDIA Corporation)"
    case generic = "Generic Unmasked Renderer"

    public var id: String { rawValue }

    public var vendor: String {
        switch self {
        case .appleM2: return "Apple Inc."
        case .intelIris: return "Intel Inc."
        case .nvidiaRTX: return "NVIDIA Corporation"
        case .generic: return "Google Inc. (Apple)"
        }
    }

    public var renderer: String {
        switch self {
        case .appleM2: return "Apple M2"
        case .intelIris: return "Intel(R) Iris(R) Xe Graphics"
        case .nvidiaRTX: return "NVIDIA GeForce RTX 3060/PCIe/SSE2"
        case .generic: return "ANGLE (Apple, Apple M1, OpenGL 4.1)"
        }
    }
}

public class PrivacyProfile: ObservableObject {
    @Published public var blockTrackers: Bool = true
    @Published public var blockCanvas: Bool = true
    @Published public var blockAudio: Bool = true
    @Published public var maskWebGL: Bool = true
    @Published public var blockWebRTC: Bool = true
    @Published public var stripReferrer: Bool = true
    @Published public var shieldSensors: Bool = true
    @Published public var ephemeralMode: Bool = true
    
    @Published public var selectedUserAgent: UserAgentPreset = .desktopMac
    @Published public var customUserAgentText: String = ""
    @Published public var selectedGPU: GPUPreset = .intelIris
    @Published public var cpuCores: Int = 8
    @Published public var memoryGB: Int = 16

    public init() {}

    public var effectiveUserAgent: String {
        if selectedUserAgent == .custom && !customUserAgentText.isEmpty {
            return customUserAgentText
        }
        return selectedUserAgent.stringValue
    }

    /// Serializes configuration into a JavaScript payload injected into every frame
    public func generateJSConfig() -> String {
        let seed = Double.random(in: 0.1...0.99)
        let vendor = selectedGPU.vendor.replacingOccurrences(of: "\"", with: "\\\"")
        let renderer = selectedGPU.renderer.replacingOccurrences(of: "\"", with: "\\\"")

        return """
        window.__GHOST_CONFIG__ = {
            blockCanvas: \(blockCanvas),
            blockAudio: \(blockAudio),
            maskWebGL: \(maskWebGL),
            blockWebRTC: \(blockWebRTC),
            shieldSensors: \(shieldSensors),
            stripReferrer: \(stripReferrer),
            hardwareConcurrency: \(cpuCores),
            deviceMemory: \(memoryGB),
            webglVendor: "\(vendor)",
            webglRenderer: "\(renderer)",
            sessionSeed: \(seed)
        };
        """
    }
}
