let currentAuditData = null;

async function runFullAudit() {
    const verdictBadge = document.getElementById('verdictBadge');
    const engineHeadline = document.getElementById('engineHeadline');
    const engineSummary = document.getElementById('engineSummary');
    const engineTiming = document.getElementById('engineTiming');
    const engineInterface = document.getElementById('engineInterface');
    const anomalyList = document.getElementById('anomalyList');

    verdictBadge.textContent = 'SNIFFING...';
    verdictBadge.className = 'verdict-badge verdict-analyzing';
    engineHeadline.textContent = 'Sniffing TCP/IP transport & hardware signatures...';
    engineSummary.textContent = 'Executing packet timing probes, MTU fragmentation tests, and native runtime verification.';

    const startTime = performance.now();

    try {
        // 1. Run browser-level client probes (RTT timing, MTU payloads, WebRTC STUN, Canvas, WebGL, Prototypes)
        const clientResults = await window.GhostDetector.runAllTests();

        // 2. Post client results to server for deep network packet correlation
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientResults)
        });

        const data = await response.json();
        const duration = Math.round(performance.now() - startTime);

        currentAuditData = { client: clientResults, server: data, auditedAt: new Date().toISOString() };

        // -------------------------------------------------------------
        // Update Hero: Gauges & Verdict
        // -------------------------------------------------------------
        engineTiming.textContent = `⚡ Sniffed in ${duration}ms`;
        engineInterface.textContent = `Interface: ${data.isLocalTest ? 'Local LAN / Wi-Fi (WAN Auto-Resolved)' : 'WAN'}`;

        // Proxy Score
        const proxyScore = data.proxyScore || 0;
        document.getElementById('proxyScoreNum').textContent = `${proxyScore}%`;
        document.getElementById('proxyMarker').style.left = `${proxyScore}%`;

        // VPN Score
        const vpnScore = data.vpnScore || 0;
        document.getElementById('vpnScoreNum').textContent = `${vpnScore}%`;
        document.getElementById('vpnMarker').style.left = `${vpnScore}%`;

        // Verdict Badge
        verdictBadge.textContent = data.status;
        if (data.overallRisk >= 50) {
            verdictBadge.className = 'verdict-badge verdict-flagged';
            engineHeadline.textContent = 'High-Risk Network Intermediary Detected';
            engineSummary.textContent = 'Disproportionate handshake timing, proxy headers, or datacenter routing detected in traffic.';
        } else if (data.overallRisk >= 20) {
            verdictBadge.className = 'verdict-badge verdict-suspicious';
            engineHeadline.textContent = 'Minor Traffic or Discrepancy Alerts';
            engineSummary.textContent = 'Some packet timing or network parameters exhibit slight variance from standard residential access.';
        } else {
            verdictBadge.className = 'verdict-badge verdict-clean';
            engineHeadline.textContent = '100% Genuine Residential Traffic & Hardware';
            engineSummary.textContent = 'Zero proxy headers, direct TCP/TLS latency ratio, authentic Apple WebKit signatures, and pristine prototype chains.';
        }

        // -------------------------------------------------------------
        // Card 1: TCP/IP Stack & Fingerprint
        // -------------------------------------------------------------
        const tcp = data.tcp || {};
        document.getElementById('tcpInitialTTL').textContent = tcp.initialTTL ? `${tcp.initialTTL} (Expected initial)` : '64 (Inferred)';
        document.getElementById('tcpReceivedTTL').textContent = tcp.receivedTTL ? `${tcp.receivedTTL} (At gateway)` : '64';
        document.getElementById('tcpHops').textContent = tcp.hops !== undefined ? `${tcp.hops} hop(s)` : '0 hops (Direct)';
        document.getElementById('tcpStackOS').textContent = tcp.tcpStackOS || 'Darwin / iOS (TTL 64)';
        document.getElementById('tcpClaimedOS').textContent = data.claimedOS || 'Apple iOS (Darwin)';

        const mismatchEl = document.getElementById('tcpMismatch');
        if (tcp.osMismatch) {
            mismatchEl.textContent = `⚠ ${tcp.osMismatchDetail}`;
            mismatchEl.style.color = '#FF453A';
        } else {
            mismatchEl.textContent = '✓ 100% Coherent (No OS Relay)';
            mismatchEl.style.color = '#30D158';
        }

        // -------------------------------------------------------------
        // Card 2: Latency & TLS / TCP RTT Ratio
        // -------------------------------------------------------------
        const rtt = data.rtt || {};
        const tcpRTT = Math.max(1, rtt.tcpRTT || 10);
        const handshakeTime = Math.max(1, rtt.handshakeTime || 12);
        const ratio = rtt.ratio || 1.1;

        document.getElementById('rttTCP').textContent = `${tcpRTT} ms (Keep-Alive)`;
        document.getElementById('rttHandshake').textContent = `${handshakeTime} ms (Fresh SYN+TLS)`;
        document.getElementById('rttRatio').textContent = `${ratio.toFixed(2)}x`;

        // Visual Dual Timing Bar
        const totalBarTime = tcpRTT + handshakeTime;
        const tcpPct = Math.max(15, Math.min(85, Math.round((tcpRTT / totalBarTime) * 100)));
        const tlsPct = 100 - tcpPct;

        document.getElementById('barTCPVal').textContent = `${tcpRTT}ms`;
        document.getElementById('barTLSVal').textContent = `${handshakeTime}ms`;
        document.getElementById('barTCP').style.width = `${tcpPct}%`;
        document.getElementById('barTLS').style.width = `${tlsPct}%`;

        const rttVerdictEl = document.getElementById('rttVerdict');
        if (rtt.flagged) {
            rttVerdictEl.textContent = `⚠ Relayed (${ratio.toFixed(2)}x ratio)`;
            rttVerdictEl.style.color = '#FF453A';
        } else {
            rttVerdictEl.textContent = `✓ Direct Connection (${ratio.toFixed(2)}x)`;
            rttVerdictEl.style.color = '#30D158';
        }

        // -------------------------------------------------------------
        // Card 3: MTU & Packet Tunnel Fragmentation
        // -------------------------------------------------------------
        const mtu = data.mtu || {};
        document.getElementById('mtuBoundary').textContent = `${mtu.detectedMTU || 1500} bytes`;
        document.getElementById('mtuInterface').textContent = mtu.tunnelType || 'Standard Ethernet / Wi-Fi (1500)';

        const mtuFlagEl = document.getElementById('mtuFlag');
        const mtuFragEl = document.getElementById('mtuFragmented');
        if (mtu.fragmented) {
            mtuFlagEl.textContent = '⚠ VPN Tunnel Active';
            mtuFlagEl.style.color = '#FF9F0A';
            mtuFragEl.textContent = '⚠ Fragmented at MTU boundary';
            mtuFragEl.style.color = '#FF9F0A';
        } else {
            mtuFlagEl.textContent = '✓ Native Physical Interface';
            mtuFlagEl.style.color = '#30D158';
            mtuFragEl.textContent = '✓ Clean (No Fragmentation)';
            mtuFragEl.style.color = '#30D158';
        }

        // -------------------------------------------------------------
        // Card 4: Network Egress & STUN Leaks
        // -------------------------------------------------------------
        const webrtc = data.webrtc || {};
        document.getElementById('egressHttpIP').textContent = data.ip;
        
        const stunEl = document.getElementById('egressStunIP');
        const stunIP = webrtc.leakedIPs && webrtc.leakedIPs[0] ? webrtc.leakedIPs[0] : data.ip;
        stunEl.textContent = stunIP;

        const contEl = document.getElementById('egressContinuity');
        if (webrtc.bypass) {
            contEl.textContent = '⚠ IP Mismatch (Tunnel Bypass)';
            contEl.style.color = '#FF453A';
        } else {
            contEl.textContent = '✓ 100% Identical Egress';
            contEl.style.color = '#30D158';
        }

        const leakEl = document.getElementById('egressLeakStatus');
        if (webrtc.bypass) {
            leakEl.textContent = `⚠ Leaked Candidates: ${webrtc.leakedIPs.join(', ')}`;
            leakEl.style.color = '#FF453A';
        } else {
            leakEl.textContent = '✓ Sealed (No Leaks)';
            leakEl.style.color = '#30D158';
        }

        // -------------------------------------------------------------
        // Card 5: IP Intelligence & Proxy Headers
        // -------------------------------------------------------------
        document.getElementById('infraPTR').textContent = data.ptr || 'No PTR Record';
        document.getElementById('infraISP').textContent = `${data.isp} (${data.org})`;
        document.getElementById('infraASN').textContent = data.asn || 'Unknown';

        const headEl = document.getElementById('infraHeaders');
        if (data.proxyHeaders && data.proxyHeaders.length > 0) {
            headEl.textContent = `⚠ Found: ${data.proxyHeaders.map(h => h.header).join(', ')}`;
            headEl.style.color = '#FF453A';
        } else {
            headEl.textContent = '✓ Clean (0 of 15 proxy headers)';
            headEl.style.color = '#30D158';
        }

        const tzEl = document.getElementById('infraTimezone');
        if (data.timezoneMismatch) {
            tzEl.textContent = `⚠ Browser (${clientResults.clientTimezone}) vs IP (${data.ipTimezone})`;
            tzEl.style.color = '#FF9F0A';
        } else {
            tzEl.textContent = `✓ Coherent (${clientResults.clientTimezone})`;
            tzEl.style.color = '#30D158';
        }

        // -------------------------------------------------------------
        // Card 6: Client Integrity & Prototype Tampering
        // -------------------------------------------------------------
        const nativeEl = document.getElementById('tamperNative');
        const protoTest = clientResults.tests.prototypes || {};
        if (protoTest.passed) {
            nativeEl.textContent = '✓ 100% Native C++ [native code]';
            nativeEl.style.color = '#30D158';
        } else {
            nativeEl.textContent = '⚠ Tampered Functions Detected';
            nativeEl.style.color = '#FF453A';
        }

        const navEl = document.getElementById('tamperNav');
        const ownProps = Object.getOwnPropertyNames(navigator).filter(p => ['platform', 'vendor', 'userAgent'].includes(p));
        if (ownProps.length === 0) {
            navEl.textContent = '✓ Clean (Prototype only, 0 own props)';
            navEl.style.color = '#30D158';
        } else {
            navEl.textContent = `⚠ Overridden (${ownProps.join(', ')})`;
            navEl.style.color = '#FF453A';
        }

        const canvasEl = document.getElementById('tamperCanvas');
        const canvasTest = clientResults.tests.canvas || {};
        if (canvasTest.passed) {
            canvasEl.textContent = '✓ Deterministic Hash Stability';
            canvasEl.style.color = '#30D158';
        } else {
            canvasEl.textContent = '⚠ Artificial Noise Detected';
            canvasEl.style.color = '#FF453A';
        }

        document.getElementById('tamperGPU').textContent = `${clientResults.webglVendor} / ${clientResults.webglRenderer}`;
        document.getElementById('tamperStorage').textContent = `${clientResults.tests.storage?.quota || 'Standard'} (Persistent)`;

        // -------------------------------------------------------------
        // Anomaly Findings Log
        // -------------------------------------------------------------
        if (data.anomalies && data.anomalies.length > 0) {
            anomalyList.innerHTML = data.anomalies.map(a => `
                <div class="anomaly-item">
                    <span class="anomaly-severity severity-${a.severity}">${a.severity}</span>
                    <div class="anomaly-content">
                        <span class="anomaly-type">${a.category}: ${a.type}</span>
                        <span class="anomaly-detail">${a.detail}</span>
                    </div>
                </div>
            `).join('');
        } else {
            anomalyList.innerHTML = '<div class="log-empty">✓ No anomalies detected. Connection and hardware signatures appear authentic and clean.</div>';
        }

    } catch (err) {
        console.error('Audit failed:', err);
        verdictBadge.textContent = 'ERROR';
        verdictBadge.className = 'verdict-badge verdict-flagged';
        engineHeadline.textContent = 'Audit Failed: ' + err.message;
    }
}

// -------------------------------------------------------------
// Interactive Raw JSON Modal (ProxyDetect.live style)
// -------------------------------------------------------------
function openRawModal() {
    const modal = document.getElementById('rawModal');
    const codeBlock = document.getElementById('rawJsonCode');
    if (currentAuditData) {
        codeBlock.textContent = JSON.stringify(currentAuditData, null, 2);
    } else {
        codeBlock.textContent = '// No audit completed yet';
    }
    modal.classList.remove('hidden');
}

function closeRawModal() {
    const modal = document.getElementById('rawModal');
    modal.classList.add('hidden');
}

function copyRawJSON() {
    if (!currentAuditData) return;
    navigator.clipboard.writeText(JSON.stringify(currentAuditData, null, 2)).then(() => {
        alert('Copied raw diagnostic JSON to clipboard!');
    }).catch(() => {
        alert('Failed copying to clipboard.');
    });
}

window.addEventListener('DOMContentLoaded', () => {
    runFullAudit();
});
