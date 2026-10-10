const express = require('express');
const cors = require('cors');
const dns = require('dns').promises;
const path = require('path');

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

function isPrivateIP(ip) {
    return (
        ip === '127.0.0.1' ||
        ip === '::1' ||
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        ip.startsWith('172.16.') ||
        ip.startsWith('172.17.') ||
        ip.startsWith('172.18.') ||
        ip.startsWith('172.19.') ||
        ip.startsWith('172.20.') ||
        ip.startsWith('172.21.') ||
        ip.startsWith('172.22.') ||
        ip.startsWith('172.23.') ||
        ip.startsWith('172.24.') ||
        ip.startsWith('172.25.') ||
        ip.startsWith('172.26.') ||
        ip.startsWith('172.27.') ||
        ip.startsWith('172.28.') ||
        ip.startsWith('172.29.') ||
        ip.startsWith('172.30.') ||
        ip.startsWith('172.31.')
    );
}

function getRawClientIP(req) {
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

async function fetchExternalWANIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        return data.ip || null;
    } catch (e) {
        return null;
    }
}

async function getIPIntelligence(ip) {
    try {
        const url = `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,timezone,isp,org,as,query,hosting,proxy`;
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        const data = await res.json();
        if (data.status === 'success') {
            return data;
        }
    } catch (e) {}
    return null;
}

async function getReverseDNS(ip) {
    if (isPrivateIP(ip)) {
        return { ptr: 'Private / Localhost Network', isHosting: false };
    }
    try {
        const hostnames = await dns.reverse(ip);
        if (hostnames && hostnames.length > 0) {
            const ptr = hostnames[0].toLowerCase();
            const hostingKeywords = ['vpn', 'proxy', 'tor', 'host', 'vps', 'cloud', 'server', 'datacenter', 'compute', 'linode', 'digitalocean', 'ovh', 'aws', 'amazon', 'azure', 'm247'];
            const isHosting = hostingKeywords.some(keyword => ptr.includes(keyword));
            return { ptr: hostnames[0], isHosting };
        }
    } catch (e) {}
    return { ptr: 'No PTR record found', isHosting: false };
}

app.post('/api/analyze', async (req, res) => {
    let clientIP = getRawClientIP(req);
    let isLocalTest = false;

    // If client connects via localhost / private network, resolve true internet WAN IP
    if (isPrivateIP(clientIP)) {
        isLocalTest = true;
        const wanIP = await fetchExternalWANIP();
        if (wanIP) {
            clientIP = wanIP;
        }
    }

    const userAgent = req.headers['user-agent'] || 'Unknown';
    const clientPayload = req.body || {};

    // 1. IP Intelligence (ISP, ASN, Country, City, Hosting, Proxy)
    const ipInfo = await getIPIntelligence(clientIP);

    // 2. Reverse DNS (PTR)
    const rDNS = await getReverseDNS(clientIP);

    // 3. Inspect HTTP Headers for Proxies
    const detectedProxyHeaders = [];
    for (const h of PROXY_HEADERS) {
        if (req.headers[h]) {
            detectedProxyHeaders.push({ header: h, value: req.headers[h] });
        }
    }

    // 4. Header Casing & Order check (Safari vs Chromium vs Proxies)
    const rawHeaders = req.rawHeaders || [];
    const headerKeys = [];
    for (let i = 0; i < rawHeaders.length; i += 2) {
        headerKeys.push(rawHeaders[i]);
    }
    const hasSecChUa = headerKeys.some(h => h.toLowerCase().startsWith('sec-ch-ua'));
    const isSafariUA = userAgent.includes('Safari') && !userAgent.includes('Chrome');
    const headerDiscrepancy = isSafariUA && hasSecChUa;

    // 5. Timezone Correlation Check
    let timezoneMismatch = false;
    let tzDetail = '';
    if (ipInfo && ipInfo.timezone && clientPayload.clientTimezone) {
        if (ipInfo.timezone !== clientPayload.clientTimezone) {
            timezoneMismatch = true;
            tzDetail = `Browser reports "${clientPayload.clientTimezone}" but IP is registered in "${ipInfo.timezone}"`;
        }
    }

    // 6. WebRTC Leak Correlation
    let webrtcBypass = false;
    if (clientPayload.leakedIPs && clientPayload.leakedIPs.length > 0) {
        for (const leaked of clientPayload.leakedIPs) {
            if (!isPrivateIP(leaked) && leaked !== clientIP) {
                webrtcBypass = true;
            }
        }
    }

    // 7. Calculate Comprehensive Anomaly Score
    let riskScore = 0;
    const anomalies = [];

    if (detectedProxyHeaders.length > 0) {
        riskScore += 25;
        anomalies.push({
            category: 'Network',
            type: 'Proxy Headers Detected',
            detail: `Found proxy headers: ${detectedProxyHeaders.map(p => p.header).join(', ')}`,
            severity: 'Medium'
        });
    }

    if (ipInfo && ipInfo.hosting) {
        riskScore += 30;
        anomalies.push({
            category: 'Network',
            type: 'Datacenter / Hosting IP',
            detail: `IP belongs to a hosting provider or VPS infrastructure (${ipInfo.isp || ipInfo.org})`,
            severity: 'High'
        });
    } else if (rDNS.isHosting) {
        riskScore += 25;
        anomalies.push({
            category: 'Network',
            type: 'Hosting Reverse DNS',
            detail: `PTR hostname (${rDNS.ptr}) matches hosting or VPN infrastructure`,
            severity: 'Medium'
        });
    }

    if (timezoneMismatch) {
        riskScore += 20;
        anomalies.push({
            category: 'Network',
            type: 'Timezone Discrepancy (VPN / Proxy Flag)',
            detail: tzDetail,
            severity: 'Medium'
        });
    }

    if (webrtcBypass) {
        riskScore += 35;
        anomalies.push({
            category: 'Network',
            type: 'WebRTC VPN Bypass Leak',
            detail: `WebRTC exposed a different public IP (${clientPayload.leakedIPs.join(', ')}) than HTTP request (${clientIP})`,
            severity: 'Critical'
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

    if (clientPayload.prototypeTampered) {
        riskScore += 40;
        anomalies.push({
            category: 'Device Integrity',
            type: 'JavaScript Prototype Tampering',
            detail: clientPayload.prototypeTamperDetail || 'Native functions or prototype properties have been monkey-patched',
            severity: 'Critical'
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
        isLocalTest: isLocalTest,
        ptr: rDNS.ptr,
        isp: ipInfo ? ipInfo.isp : 'Unknown',
        org: ipInfo ? ipInfo.org : 'Unknown',
        asn: ipInfo ? ipInfo.as : 'Unknown',
        location: ipInfo ? `${ipInfo.city}, ${ipInfo.regionName}, ${ipInfo.country}` : 'Unknown',
        ipTimezone: ipInfo ? ipInfo.timezone : 'Unknown',
        timezoneMismatch: timezoneMismatch,
        userAgent: userAgent,
        proxyHeaders: detectedProxyHeaders,
        riskScore: riskScore,
        status: status,
        statusColor: statusColor,
        anomalies: anomalies,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Ghost Detection Suite] Active on port ${PORT}`);
    console.log(`- Local interface: http://localhost:${PORT}`);
    console.log(`- LAN / VPS interface: http://0.0.0.0:${PORT}`);
});
