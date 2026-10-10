# GhostDetect &bull; Deep Fingerprint & Proxy Anomaly Detection Suite

A standalone, production-grade cybersecurity diagnostic suite designed to test browsers and connections for:
- **Proxy & VPN Detection**: Inspects HTTP proxy headers, reverse DNS (PTR) hosting keywords, and timezone discrepancies.
- **WebRTC STUN Candidate Leaks**: Discovers local LAN IPs and real WAN IP bypasses.
- **JavaScript Prototype Tampering**: Detects monkey-patched native functions (`Function.prototype.toString.call(...)`), modified descriptors, and prototype lies.
- **Canvas Determinism**: Detects artificial noise jitter vs genuine GPU rasterization.
- **Hardware Coherence**: Validates WebGL Vendor/Renderer, touch point coherence, and screen viewport boundaries.
- **Incognito / Private Mode Detection**: Tests storage quotas and OPFS restrictions.

---

## Quick Start (Run Locally on your Windows PC)

1. Open a terminal inside `C:\Users\Home\Desktop\app\detection-suite`:
```bash
npm install
node server.js
```
2. Open your browser:
   - On this PC: `http://localhost:3000`
   - On your iPad (connected to same Wi-Fi): `http://<YOUR_WINDOWS_PC_LAN_IP>:3000`

---

## Deploy to a Cloud VPS (e.g. DigitalOcean, Hetzner, AWS, Linode)

### Method 1: Using Docker (Recommended)
1. Copy the `detection-suite` folder to your VPS.
2. Inside the folder on your VPS, run:
```bash
docker compose up -d --build
```
3. Allow port 3000 on your VPS firewall:
```bash
sudo ufw allow 3000/tcp
```
4. Visit `http://<YOUR_VPS_PUBLIC_IP>:3000` from GhostBrowser on your iPad!

### Method 2: Using Node.js directly
1. Install Node.js on your VPS (`sudo apt install nodejs npm`).
2. Inside the `detection-suite` folder, run:
```bash
npm install
npm install -g pm2
pm2 start server.js --name "ghost-detect"
sudo ufw allow 3000/tcp
```
3. Open `http://<YOUR_VPS_PUBLIC_IP>:3000` on your iPad.
