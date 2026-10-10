const express = require('express');
const cors = require('cors');
const dns = require('dns').promises;
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Known proxy / VPN header names
const PROXY_HEADERS = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'forwarded',
    'via',
    'x-proxy-id',
    'cf-connecting-ip',
    'true-client-ip',
    'x-cluster-client-ip',
    'fastly-client-ip',
    'x-forwarded',
    'forwarded-for'
];

// Helper: Extract real client IP
function getClientIP(req) {
    const headerIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.headers['cf-connecting-ip'];
    if (headerIP) {
        return headerIP.split(',')[0].trim();
    }
    const sock = req.socket.remoteAddress || '';
    if (sock.startsWith('::ffff:')) {
        return sock.replace('::ffff:', '');
    }
    return sock || '127.0.0.1';
}

// Helper: Reverse DNS lookup to detect hosting / VPN hostnames
async function getReverseDNS(ip) {
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return { ptr: 'localhost / private network', isHosting: false };
    }
    try {
        const hostnames = await dns.reverse(ip);
        if (hostnames && hostnames.length > 0) {
            const ptr = hostnames[0].toLowerCase();
            const hostingKeywords = ['vpn', 'proxy', 'tor', 'host', 'vps', 'cloud', 'server', 'datacenter', 'compute', 'linode', 'digitalocean', 'ovh', 'aws', 'amazon', 'azure'];
            const isHosting = hostingKeywords.some(keyword => ptr.includes(keyword));
            return { ptr: hostnames[0], isHosting };
        }
    } catch (e) {
        // Reverse DNS lookup failed or no PTR
    }
    return { ptr: 'No PTR record found', isHosting: false };
}

// Endpoint: Analyze network, headers, and client-submitted anomaly payload
app.post('/api/analyze', async (req, res) => {
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const clientPayload = req.body || {};

    // 1. Inspect HTTP Headers for Proxy Intermediaries
    const detectedProxyHeaders = [];
    for (const h of PROXY_HEADERS) {
        if (req.headers[h]) {
            detectedProxyHeaders.push({ header: h, value: req.headers[h] });
        }
    }

    // 2. Perform Reverse DNS check
    const rDNS = await getReverseDNS(clientIP);

    // 3. Header Casing & Order check (Safari vs Chromium vs Proxies)
    const rawHeaders = req.rawHeaders || [];
    const headerKeys = [];
    for (let i = 0; i < rawHeaders.length; i += 2) {
        headerKeys.push(rawHeaders[i]);
    }

    const hasSecChUa = headerKeys.some(h => h.toLowerCase().startsWith('sec-ch-ua'));
    const isSafariUA = userAgent.includes('Safari') && !userAgent.includes('Chrome');
    const headerDiscrepancy = isSafariUA && hasSecChUa; // Safari does not send sec-ch-ua headers

    // 4. Calculate Comprehensive Risk / Anomaly Score (0 = Clean, 100 = Critical Anomaly)
    let riskScore = 0;
    const anomalies = [];

    // Proxy / Network Flags
    if (detectedProxyHeaders.length > 0) {
        riskScore += 25;
        anomalies.push({
            category: 'Network',
            type: 'Proxy Headers Detected',
            detail: `Found proxy headers: ${detectedProxyHeaders.map(p => p.header).join(', ')}`,
            severity: 'Medium'
        });
    }

    if (rDNS.isHosting) {
        riskScore += 30;
        anomalies.push({
            category: 'Network',
            type: 'Data Center / Hosting IP',
            detail: `Reverse DNS (${rDNS.ptr}) matches hosting or VPN infrastructure`,
            severity: 'High'
        });
    }

    if (headerDiscrepancy) {
        riskScore += 35;
        anomalies.push({
            category: 'HTTP Layer',
            type: 'Header / User-Agent Contradiction',
            detail: 'User-Agent claims Safari, but Chromium-specific Sec-CH-UA headers were sent',
            severity: 'High'
        });
    }

    // Client-side reported anomalies (Prototype Tampering, WebRTC Leaks, Canvas, Screen)
    if (clientPayload.prototypeTampered) {
        riskScore += 40;
        anomalies.push({
            category: 'Device Integrity',
            type: 'JavaScript Prototype Tampering',
            detail: clientPayload.prototypeTamperDetail || 'Native functions or prototype properties have been monkey-patched',
            severity: 'Critical'
        });
    }

    if (clientPayload.webrtcLeak) {
        riskScore += 20;
        anomalies.push({
            category: 'Network',
            type: 'WebRTC IP / Interface Leak',
            detail: `WebRTC exposed private/public candidates: ${clientPayload.leakedIPs?.join(', ')}`,
            severity: 'Medium'
        });
    }

    if (clientPayload.screenInconsistency) {
        riskScore += 25;
        anomalies.push({
            category: 'Device Integrity',
            type: 'Screen / Viewport Inconsistency',
            detail: clientPayload.screenDetail || 'Reported screen resolution contradicts viewport or device aspect ratio',
            severity: 'Medium'
        });
    }

    if (clientPayload.incognitoDetected) {
        riskScore += 15;
        anomalies.push({
            category: 'Session',
            type: 'Incognito / Private Storage Mode',
            detail: 'Storage quota or file system APIs reflect private browsing restrictions',
            severity: 'Low'
        });
    }

    if (clientPayload.canvasInconsistency) {
        riskScore += 25;
        anomalies.push({
            category: 'Hardware',
            type: 'Canvas Hash Instability',
            detail: 'Canvas rasterization output is unstable or artificially jittered',
            severity: 'Medium'
        });
    }

    riskScore = Math.min(100, riskScore);

    let status = 'TRUSTED';
    let statusColor = '#30D158'; // Green
    if (riskScore >= 50) {
        status = 'FLAGGED / HIGH RISK';
        statusColor = '#FF453A'; // Red
    } else if (riskScore >= 20) {
        status = 'SUSPICIOUS / ANOMALY';
        statusColor = '#FF9F0A'; // Orange
    }

    res.json({
        ip: clientIP,
        ptr: rDNS.ptr,
        userAgent: userAgent,
        proxyHeaders: detectedProxyHeaders,
        riskScore: riskScore,
        status: status,
        statusColor: statusColor,
        anomalies: anomalies,
        timestamp: new Date().toISOString()
    });
});

// Quick connection info endpoint
app.get('/api/ping', (req, res) => {
    res.json({
        ip: getClientIP(req),
        headers: req.headers,
        timestamp: Date.now()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Ghost Detection Suite] Server active on port ${PORT}`);
    console.log(`Access locally at: http://localhost:${PORT}`);
    console.log(`Access from iPad on LAN / VPS at: http://<YOUR_IP>:${PORT}`);
});
