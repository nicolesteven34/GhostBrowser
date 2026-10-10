const express = require('express');
const cors = require('cors');
const dns = require('dns').promises;
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.text({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Known proxy / VPN header signatures
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
    'forwarded-for',
    'proxy-connection',
    'x-bluecoat-via',
    'x-cache'
];

function isPrivateIP(ip) {
    if (!ip) return true;
    return (
        ip === '127.0.0.1' ||
        ip === '::1' ||
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        ip.startsWith('172.16.') || ip.startsWith('172.17.') ||
        ip.startsWith('172.18.') || ip.startsWith('172.19.') ||
        ip.startsWith('172.20.') || ip.startsWith('172.21.') ||
        ip.startsWith('172.22.') || ip.startsWith('172.23.') ||
        ip.startsWith('172.24.') || ip.startsWith('172.25.') ||
        ip.startsWith('172.26.') || ip.startsWith('172.27.') ||
        ip.startsWith('172.28.') || ip.startsWith('172.29.') ||
        ip.startsWith('172.30.') || ip.startsWith('172.31.')
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
        const url = `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,lat,lon,timezone,isp,org,as,query,hosting,proxy`;
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
        return { ptr: 'Localhost / Private Network', isHosting: false };
    }
    try {
        const hostnames = await dns.reverse(ip);
        if (hostnames && hostnames.length > 0) {
            const ptr = hostnames[0].toLowerCase();
            const hostingKeywords = [
                'vpn', 'proxy', 'tor', 'host', 'vps', 'cloud', 'server', 'datacenter',
                'compute', 'linode', 'digitalocean', 'ovh', 'aws', 'amazon', 'azure',
                'm247', 'packetexchange', 'hetzner', 'leaseweb', 'fastly', 'cloudflare'
            ];
            const isHosting = hostingKeywords.some(keyword => ptr.includes(keyword));
            return { ptr: hostnames[0], isHosting };
        }
    } catch (e) {}
    return { ptr: 'No PTR record found', isHosting: false };
}

// Active ICMP / TTL measurement for client IP
function measureClientTTL(clientIP) {
    return new Promise((resolve) => {
        if (!clientIP) {
            return resolve({ initialTTL: null, receivedTTL: null, hops: null, reachable: false });
        }
        let targetIP = clientIP;
        if (targetIP === '::1' || targetIP.startsWith('::ffff:')) {
            targetIP = targetIP.replace('::ffff:', '');
            if (targetIP === '::1') targetIP = '127.0.0.1';
        }
        const isWin = process.platform === 'win32';
        const cmd = isWin ? `ping -n 1 -w 800 ${targetIP}` : `ping -c 1 -W 1 ${targetIP}`;
        exec(cmd, { timeout: 1200 }, (err, stdout) => {
            if (err || !stdout) {
                return resolve({ initialTTL: null, receivedTTL: null, hops: null, reachable: false });
            }
            const match = stdout.match(/TTL=(\d+)/i);
            if (match && match[1]) {
                const ttl = parseInt(match[1], 10);
                let initialTTL = 64;
                if (ttl > 64 && ttl <= 128) initialTTL = 128;
                else if (ttl > 128) initialTTL = 255;
                const hops = Math.max(0, initialTTL - ttl);
                return resolve({ initialTTL, receivedTTL: ttl, hops, reachable: true });
            }
            resolve({ initialTTL: null, receivedTTL: null, hops: null, reachable: false });
        });
    });
}

// -------------------------------------------------------------
// Endpoint 1: RTT Precision Probe (Keep-Alive TCP latency)
// -------------------------------------------------------------
app.get('/api/probe-rtt', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('X-Server-Timestamp', Date.now().toString());
    res.send('PONG');
});

// -------------------------------------------------------------
// Endpoint 2: Force Fresh Connection Probe (Connection: close)
// Measures TCP handshake + TLS connection overhead
// -------------------------------------------------------------
app.get('/api/probe-handshake', (req, res) => {
    res.setHeader('Connection', 'close');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('X-Server-Timestamp', Date.now().toString());
    res.send('HANDSHAKE');
});

// -------------------------------------------------------------
// Endpoint 3: MTU Packet Buffer Probe
// -------------------------------------------------------------
app.post('/api/probe-mtu', (req, res) => {
    const size = typeof req.body === 'string' ? req.body.length : 0;
    res.setHeader('Cache-Control', 'no-store');
    res.json({ receivedBytes: size, serverTimestamp: Date.now() });
});

// -------------------------------------------------------------
// Endpoint 4: Deep Comprehensive Analysis Pipeline
// -------------------------------------------------------------
app.post('/api/analyze', async (req, res) => {
    const rawClientIP = getRawClientIP(req);
    let auditIP = rawClientIP;
    let isLocalTest = false;

    if (isPrivateIP(rawClientIP)) {
        isLocalTest = true;
        const wanIP = await fetchExternalWANIP();
        if (wanIP) {
            auditIP = wanIP;
        }
    }

    const userAgent = req.headers['user-agent'] || 'Unknown';
    const clientPayload = req.body || {};

    // 1. IP Intelligence (ISP, ASN, Location, Hosting, Proxy)
    const ipInfo = await getIPIntelligence(auditIP);

    // 2. Reverse DNS
    const rDNS = await getReverseDNS(auditIP);

    // 3. Measure Client TTL & Hop Count
    const ttlData = await measureClientTTL(rawClientIP);

    // 4. TCP/IP Stack & Inferred OS
    let claimedOS = 'Unknown';
    if (/iPad|iPhone/i.test(userAgent)) {
        claimedOS = 'Apple iOS (Darwin)';
    } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
        claimedOS = 'Apple macOS (Darwin)';
    } else if (/Windows NT/i.test(userAgent)) {
        claimedOS = 'Microsoft Windows';
    } else if (/Android/i.test(userAgent)) {
        claimedOS = 'Android Linux';
    } else if (/Linux/i.test(userAgent)) {
        claimedOS = 'Linux';
    }

    let tcpStackOS = 'Darwin / iOS / Linux (TTL 64)';
    let osMismatch = false;
    let osMismatchDetail = 'TCP/IP packet stack matches User-Agent identity';

    if (ttlData.reachable && ttlData.initialTTL) {
        if (ttlData.initialTTL === 128) {
            tcpStackOS = 'Microsoft Windows (TTL 128)';
            if (claimedOS.includes('Apple') || claimedOS.includes('Android')) {
                osMismatch = true;
                osMismatchDetail = `User-Agent claims "${claimedOS}" but TCP SYN/ICMP TTL arrived with Windows stack (TTL 128)`;
            }
        } else if (ttlData.initialTTL === 64) {
            tcpStackOS = 'Apple Darwin / Linux (TTL 64)';
            if (claimedOS === 'Microsoft Windows') {
                osMismatch = true;
                osMismatchDetail = `User-Agent claims Windows but TCP arrived with Darwin/Linux stack (TTL 64)`;
            }
        }
    } else {
        // Fallback when ping is blocked over WAN
        tcpStackOS = claimedOS.includes('Apple') ? 'Apple Darwin / iOS (Inferred)' : `${claimedOS} Stack`;
    }

    // 5. Inspect HTTP Headers for Proxies
    const detectedProxyHeaders = [];
    const isCloudflareTunnel = Boolean(req.headers['cf-ray'] || req.headers['cf-connecting-ip']);
    for (const h of PROXY_HEADERS) {
        if (req.headers[h]) {
            // When server is hosted behind Cloudflare Tunnel, cf-connecting-ip and a single-IP x-forwarded-for
            // are added by the hosting tunnel, not by a client proxy.
            if (isCloudflareTunnel) {
                if (h === 'cf-connecting-ip') continue;
                if (h === 'x-forwarded-for' && !req.headers['x-forwarded-for'].includes(',')) continue;
            }
            detectedProxyHeaders.push({ header: h, value: req.headers[h] });
        }
    }

    // 6. Header Casing & Protocol Anomalies
    const rawHeaders = req.rawHeaders || [];
    const headerKeys = [];
    for (let i = 0; i < rawHeaders.length; i += 2) {
        headerKeys.push(rawHeaders[i]);
    }
    const hasSecChUa = headerKeys.some(h => h.toLowerCase().startsWith('sec-ch-ua'));
    const isSafariUA = userAgent.includes('Safari') && !userAgent.includes('Chrome');
    const headerDiscrepancy = isSafariUA && hasSecChUa;

    // 7. Timezone Correlation
    let timezoneMismatch = false;
    let tzDetail = 'Browser and IP geolocation timezones are coherent';
    if (ipInfo && ipInfo.timezone && clientPayload.clientTimezone) {
        if (ipInfo.timezone !== clientPayload.clientTimezone) {
            timezoneMismatch = true;
            tzDetail = `Browser reported timezone "${clientPayload.clientTimezone}" but IP is registered in "${ipInfo.timezone}"`;
        }
    }

    // 8. WebRTC STUN Leak vs HTTP IP Analysis
    let webrtcBypass = false;
    let webrtcDetail = 'No IP candidate leaks detected';
    if (clientPayload.leakedIPs && clientPayload.leakedIPs.length > 0) {
        const nonPrivateLeaks = clientPayload.leakedIPs.filter(ip => !isPrivateIP(ip));
        if (nonPrivateLeaks.length > 0) {
            const mismatched = nonPrivateLeaks.filter(ip => ip !== auditIP);
            if (mismatched.length > 0) {
                webrtcBypass = true;
                webrtcDetail = `WebRTC STUN revealed WAN IP (${mismatched.join(', ')}) differing from HTTP IP (${auditIP})`;
            } else {
                webrtcDetail = `WebRTC STUN matches HTTP IP (${auditIP})`;
            }
        }
    }

    // 9. TLS / TCP RTT Ratio Analysis
    const rttData = clientPayload.rttData || {};
    const rttRatio = rttData.ratio || 1.1;
    const tcpRTT = rttData.tcpRTT || 12;
    const handshakeTime = rttData.handshakeTime || 14;
    let rttProxyFlag = false;
    let rttDetail = `Ratio: ${rttRatio.toFixed(2)}x (Normal direct connection)`;

    if (rttRatio >= 3.5 && handshakeTime > 80) {
        rttProxyFlag = true;
        rttDetail = `Ratio: ${rttRatio.toFixed(2)}x (TCP completed in ${tcpRTT}ms, but handshake took ${handshakeTime}ms — indicates proxy relay)`;
    }

    // 10. MTU & Tunnel Interface Analysis
    const mtuData = clientPayload.mtuData || {};
    const detectedMTU = mtuData.detectedMTU || 1500;
    const tunnelType = mtuData.tunnelType || 'Standard Ethernet / Wi-Fi (1500)';
    const tunnelFlag = mtuData.fragmentationDetected || false;

    // -------------------------------------------------------------
    // Calculate Proxy Score & VPN Score (0 to 100)
    // -------------------------------------------------------------
    let proxyScore = 0;
    let vpnScore = 0;
    const anomalies = [];

    if (detectedProxyHeaders.length > 0) {
        proxyScore += 45;
        anomalies.push({
            category: 'Proxy & Headers',
            type: 'Proxy Intermediary Headers',
            detail: `Found headers: ${detectedProxyHeaders.map(p => p.header).join(', ')}`,
            severity: 'High'
        });
    }

    if (osMismatch) {
        proxyScore += 40;
        vpnScore += 30;
        anomalies.push({
            category: 'TCP/IP Fingerprint',
            type: 'TCP Stack OS Discrepancy',
            detail: osMismatchDetail,
            severity: 'Critical'
        });
    }

    if (rttProxyFlag) {
        proxyScore += 35;
        anomalies.push({
            category: 'Network Latency',
            type: 'TLS / TCP RTT Disparity',
            detail: rttDetail,
            severity: 'High'
        });
    }

    if (rDNS.isHosting) {
        vpnScore += 40;
        proxyScore += 25;
        anomalies.push({
            category: 'IP Infrastructure',
            type: 'Datacenter / Hosting PTR',
            detail: `Reverse DNS (${rDNS.ptr}) matches known hosting or VPN infrastructure`,
            severity: 'High'
        });
    }

    if (ipInfo && ipInfo.hosting) {
        vpnScore += 45;
        proxyScore += 30;
        anomalies.push({
            category: 'IP Infrastructure',
            type: 'Datacenter ASN',
            detail: `IP belongs to a hosting/VPS network (${ipInfo.isp || ipInfo.org})`,
            severity: 'High'
        });
    }

    if (webrtcBypass) {
        vpnScore += 50;
        anomalies.push({
            category: 'WebRTC Leak',
            type: 'WebRTC VPN Bypass Discovered',
            detail: webrtcDetail,
            severity: 'Critical'
        });
    }

    if (timezoneMismatch) {
        vpnScore += 25;
        proxyScore += 20;
        anomalies.push({
            category: 'Correlation',
            type: 'Timezone Mismatch',
            detail: tzDetail,
            severity: 'Medium'
        });
    }

    if (tunnelFlag) {
        vpnScore += 35;
        anomalies.push({
            category: 'Packet Layer',
            type: 'Tunnel MTU Fragmentation',
            detail: tunnelType,
            severity: 'Medium'
        });
    }

    if (headerDiscrepancy) {
        proxyScore += 30;
        anomalies.push({
            category: 'HTTP Layer',
            type: 'Client Hints Contradiction',
            detail: 'User-Agent claims Safari, but sent Chromium-specific Sec-CH-UA headers',
            severity: 'High'
        });
    }

    if (clientPayload.prototypeTampered) {
        proxyScore += 35;
        anomalies.push({
            category: 'Browser Integrity',
            type: 'JavaScript Prototype Tampering',
            detail: clientPayload.prototypeTamperDetail || 'Native functions or prototype properties have been modified',
            severity: 'Critical'
        });
    }

    proxyScore = Math.min(100, proxyScore);
    vpnScore = Math.min(100, vpnScore);
    const overallRisk = Math.max(proxyScore, vpnScore);

    let status = 'RESIDENTIAL / NO PROXY OR VPN DETECTED';
    let statusColor = '#30D158'; // Green
    if (overallRisk >= 50) {
        status = 'FLAGGED: PROXY OR VPN DETECTED';
        statusColor = '#FF453A'; // Red
    } else if (overallRisk >= 20) {
        status = 'SUSPICIOUS / NETWORK ANOMALIES';
        statusColor = '#FF9F0A'; // Orange
    }

    res.json({
        ip: auditIP,
        rawClientIP: rawClientIP,
        isLocalTest: isLocalTest,
        ptr: rDNS.ptr,
        isp: ipInfo ? ipInfo.isp : 'Unknown ISP',
        org: ipInfo ? ipInfo.org : 'Unknown Org',
        asn: ipInfo ? ipInfo.as : 'Unknown ASN',
        location: ipInfo ? `${ipInfo.city}, ${ipInfo.regionName}, ${ipInfo.country}` : 'Unknown Location',
        ipTimezone: ipInfo ? ipInfo.timezone : 'Unknown',
        timezoneMismatch: timezoneMismatch,
        userAgent: userAgent,
        claimedOS: claimedOS,
        proxyHeaders: detectedProxyHeaders,
        proxyScore: proxyScore,
        vpnScore: vpnScore,
        overallRisk: overallRisk,
        status: status,
        statusColor: statusColor,
        // Deep TCP/IP & Timing Sniffing Metrics
        tcp: {
            initialTTL: ttlData.initialTTL || 64,
            receivedTTL: ttlData.receivedTTL || 64,
            hops: ttlData.hops !== null ? ttlData.hops : 1,
            tcpStackOS: tcpStackOS,
            osMismatch: osMismatch,
            osMismatchDetail: osMismatchDetail
        },
        rtt: {
            tcpRTT: tcpRTT,
            handshakeTime: handshakeTime,
            ratio: rttRatio,
            detail: rttDetail,
            flagged: rttProxyFlag
        },
        mtu: {
            detectedMTU: detectedMTU,
            tunnelType: tunnelType,
            fragmented: tunnelFlag
        },
        webrtc: {
            leakedIPs: clientPayload.leakedIPs || [],
            detail: webrtcDetail,
            bypass: webrtcBypass
        },
        anomalies: anomalies,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Ghost Detection Suite] Active on port ${PORT}`);
    console.log(`- Local interface: http://localhost:${PORT}`);
    console.log(`- LAN / VPS interface: http://0.0.0.0:${PORT}`);
});
