# GhostBrowser for iPadOS

A native, zero-telemetry, tracker-free iPad web browser built with Swift, SwiftUI, and WebKit. Engineered specifically to defeat commercial user-profiling, canvas/WebGL fingerprinting, and corporate telemetry scripts.

---

## Key Anti-Fingerprinting Defenses

| Protection Vector | Mechanism |
| :--- | :--- |
| **Canvas Fingerprinting** | Imperceptible micro-noise injected into `toDataURL`, `toBlob`, and `getImageData` to scramble hash fingerprints across sessions. |
| **WebGL GPU Masking** | Hooks `WEBGL_debug_renderer_info` to disguise the Apple Silicon GPU as Intel Iris Xe, NVIDIA RTX, or generic renderers. |
| **AudioContext Fingerprinting** | Applies micro-jitter to FFT frequency and buffer data in `AnalyserNode` and `AudioBuffer`. |
| **WebRTC Local IP Leak Shield** | Neutralizes `RTCPeerConnection` to prevent local LAN & VPN-bypass IP harvesting. |
| **Hardware Signature Spoofing** | Configurable CPU cores (`navigator.hardwareConcurrency`) and RAM (`navigator.deviceMemory`). |
| **Commercial Ad & Tracker Blocker** | Native compiled `WKContentRuleListStore` rules that block Google Analytics, Meta Pixel, TikTok, Criteo, Taboola, and 3rd-party tracking cookies. |
| **Referrer Stripping** | Forces empty `document.referrer` to prevent downstream sites from profiling navigation chains. |
| **Sensor & Gyroscope Shield** | Silences `deviceorientation` and `devicemotion` APIs often used for behavioral profiling. |
| **Ephemeral RAM-Only Mode** | Uses `WKWebsiteDataStore.nonPersistent()` so zero cache, cookies, or history touch the iPad flash storage. |
| **Instant Panic Button** | Single tap nukes all active DOM storage, cookies, and memory and reloads a clean DuckDuckGo session. |

---

## How to Build the `.ipa` & Install on your iPad from Windows

Because iPadOS apps require macOS and Xcode to compile, this repository includes an automated GitHub Actions pipeline that builds the `.ipa` on Apple Silicon runners for free.

### Step 1: Push this Code to a Free GitHub Repository

1. Create a new repository on [GitHub](https://github.com/new) (can be Private).
2. Run these commands in your Windows terminal inside `C:\Users\Home\Desktop\app`:

```powershell
git add .
git commit -m "Initial commit of GhostBrowser"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

---

### Step 2: Download Your Compiled `.ipa` File

1. On your GitHub repository page, click the **Actions** tab.
2. You will see the **Build GhostBrowser IPA** workflow running automatically.
3. Once completed (~2 minutes), click on the completed run.
4. Under the **Artifacts** section at the bottom, click **GhostBrowser-IPA** to download `GhostBrowser.ipa`.

---

### Step 3: Install onto your iPad using Sideloadly (Windows)

1. Download and install **[Sideloadly](https://sideloadly.io/)** on your Windows PC (ensure iTunes or iCloud for Windows is installed so Windows recognizes your iPad).
2. Connect your iPad to your PC using its USB cable and tap **Trust This Computer** on the iPad screen.
3. Open Sideloadly:
   - Your iPad will appear in the **Device** dropdown.
   - Drag and drop `GhostBrowser.ipa` into the IPA box.
   - Enter your personal **Apple ID** email (used strictly by Apple's servers to sign the app for personal use).
4. Click **Start**. Sideloadly will sign and install GhostBrowser onto your iPad.
5. On your iPad:
   - Go to **Settings > General > VPN & Device Management**.
   - Tap your Apple ID and select **Trust**.
6. Open **GhostBrowser** and enjoy private, zero-tracking browsing!
