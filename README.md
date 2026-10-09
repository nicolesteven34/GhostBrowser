# GhostBrowser for iPadOS & iOS

A native, zero-telemetry, tracker-free web browser built with Swift, SwiftUI, and WebKit. Engineered specifically to defeat commercial user-profiling, canvas/WebGL fingerprinting, and corporate telemetry scripts while masquerading as authentic Apple hardware.

---

## What's New in v1.1.0

* **Zero Forced Search Engines / Offline Start Page**: No hardcoded DuckDuckGo or corporate defaults. Starts on an offline, beautiful native Safari start page loaded locally from the app bundle.
* **Configurable Search Providers**: Easily switch between Local Offline, SearXNG (decentralized), Startpage (private Google index), Brave Search, DuckDuckGo, Google, or Direct URL only.
* **Authentic Apple Hardware Personas**: Realistic, out-of-the-box fingerprint presets with synchronized User-Agents, CPU core counts, RAM sizes, touch points, screen viewports, and WebGL GPU renderers:
  - **iPad Pro 13"** (Apple M4, 16GB RAM, 10 CPU cores, 10 touch points, iPadOS 17.5)
  - **iPad Air 11"** (Apple M2, 8GB RAM, 8 CPU cores, 5 touch points, iPadOS 17.4)
  - **iPad Mini 6** (Apple A15 Bionic, 4GB RAM, 6 CPU cores, 5 touch points, iPadOS 17.2)
  - **iPhone 15 Pro Max** (Apple A17 Pro, 8GB RAM, 6 CPU cores, 5 touch points, iOS 17.5)
  - **iPhone 14** (Apple A15 Bionic, 6GB RAM, 6 CPU cores, 5 touch points, iOS 16.6)
  - **MacBook Pro 16"** (Apple M3 Max, 36GB RAM, 16 CPU cores, 0 touch points, macOS 14.5 Sonoma)
  - **MacBook Air 13"** (Apple M2, 8GB RAM, 8 CPU cores, 0 touch points, macOS 13.6 Ventura)
* **Custom Obsidian & Electric-Blue App Icon**: Precision-crafted titanium Safari compass with an electric-blue privacy shield.
* **Native Prototype Hardening**: Scrambles fingerprint probes while ensuring all JS property overrides appear native to anti-tamper tests.

---

## Anti-Fingerprinting Defenses

| Protection Vector | Mechanism |
| :--- | :--- |
| **Canvas Fingerprinting** | Imperceptible micro-noise injected into `toDataURL`, `toBlob`, and `getImageData` to scramble hash fingerprints across sessions. |
| **WebGL GPU Masking** | Emulates exact Apple Silicon GPU models (`Apple M4`, `Apple M3 Max`, `Apple M2`, `Apple A17 Pro`). |
| **AudioContext Fingerprinting** | Applies micro-jitter to FFT frequency and buffer data in `AnalyserNode` and `AudioBuffer`. |
| **WebRTC Local IP Leak Shield** | Neutralizes `RTCPeerConnection` to prevent local LAN & VPN-bypass IP harvesting. |
| **Touch Points & Viewport Consistency** | Synchronizes `maxTouchPoints` (0 for Mac, 5 for iPhone, 10 for iPad) and physical screen resolutions to prevent desktop/mobile mismatch detection. |
| **Commercial Ad & Tracker Blocker** | Native compiled `WKContentRuleListStore` rules that block Google Analytics, Meta Pixel, TikTok, Criteo, Taboola, and 3rd-party tracking cookies. |
| **Referrer Stripping** | Forces empty `document.referrer` to prevent downstream sites from profiling navigation chains. |
| **Sensor & Gyroscope Shield** | Silences `deviceorientation` and `devicemotion` APIs often used for behavioral profiling. |
| **Ephemeral RAM-Only Mode** | Uses `WKWebsiteDataStore.nonPersistent()` so zero cache, cookies, or history touch the iPad flash storage. |
| **Instant Panic Button** | Single tap instantly nukes all DOM storage, cookies, and memory and reloads the local offline start page. |

---

## How to Install onto your iPad from Windows

1. **Download [Sideloadly](https://sideloadly.io/)** (free for Windows).
2. **Connect your iPad** to your PC via USB and tap **Trust This Computer**.
3. **Download `GhostBrowser.ipa`** (from this repository's Releases or local folder).
4. Drag and drop `GhostBrowser.ipa` into Sideloadly, enter your Apple ID, and click **Start**.
5. On your iPad: Go to **Settings > General > VPN & Device Management**, tap your Apple ID and select **Trust**.
6. Launch **GhostBrowser** from your iPad home screen!
