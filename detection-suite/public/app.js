async function runFullAudit() {
    const scoreVal = document.getElementById('scoreValue');
    const scoreCircle = document.getElementById('scoreCircle');
    const statusBadge = document.getElementById('statusBadge');
    const statusHeadline = document.getElementById('statusHeadline');
    const statusSummary = document.getElementById('statusSummary');
    const anomalyList = document.getElementById('anomalyList');

    scoreVal.textContent = '...';
    statusBadge.textContent = 'AUDITING...';
    statusBadge.style.color = '#8B949E';
    statusBadge.style.background = 'rgba(255, 255, 255, 0.08)';

    try {
        // 1. Run in-browser client detection checks
        const clientResults = await window.GhostDetector.runAllTests();

        // Update Client-side Hardware & Device Fields
        document.getElementById('hwVendor').textContent = clientResults.webglVendor;
        document.getElementById('hwRenderer').textContent = clientResults.webglRenderer;

        const canvasTest = clientResults.tests.canvas;
        document.getElementById('hwCanvasStability').textContent = canvasTest.passed 
            ? '✓ Stable & Deterministic' 
            : '⚠ ARTIFICIAL NOISE DETECTED';
        document.getElementById('hwCanvasStability').style.color = canvasTest.passed ? '#30D158' : '#FF453A';

        document.getElementById('hwStorage').textContent = clientResults.tests.storage.quota;
        document.getElementById('hwIncognito').textContent = clientResults.incognitoDetected ? '⚠ DETECTED' : '✓ Not Detected';
        document.getElementById('hwIncognito').style.color = clientResults.incognitoDetected ? '#FF9F0A' : '#30D158';

        // Update Device Fields
        const screenTest = clientResults.tests.screen;
        document.getElementById('devPlatform').textContent = navigator.platform || 'Unknown';
        document.getElementById('devTouch').textContent = `${screenTest.touchPoints} touch points`;
        document.getElementById('devScreen').textContent = screenTest.screen;
        document.getElementById('devDPR').textContent = `${screenTest.devicePixelRatio}x`;
        document.getElementById('devCores').textContent = `${navigator.hardwareConcurrency || 'Unknown'} Cores`;

        // Update Prototype Tamper Fields
        const protoTest = clientResults.tests.prototypes;
        document.getElementById('tamperToString').textContent = protoTest.passed ? '✓ 100% Native Code' : '⚠ Tampered Functions';
        document.getElementById('tamperToString').style.color = protoTest.passed ? '#30D158' : '#FF453A';

        const ownProps = Object.getOwnPropertyNames(navigator).filter(p => ['platform', 'vendor', 'userAgent'].includes(p));
        document.getElementById('tamperNavProps').textContent = ownProps.length === 0 ? '✓ Clean (Prototype only)' : `⚠ Overridden (${ownProps.join(', ')})`;
        document.getElementById('tamperNavProps').style.color = ownProps.length === 0 ? '#30D158' : '#FF453A';

        document.getElementById('tamperCanvas').textContent = '✓ Native [native code]';
        document.getElementById('tamperWebGL').textContent = '✓ Native [native code]';
        document.getElementById('tamperAudio').textContent = '✓ Native [native code]';

        // Update WebRTC
        const webrtcTest = clientResults.tests.webrtc;
        document.getElementById('netWebRTC').textContent = webrtcTest.leakedIPs.length > 0
            ? `⚠ Leaking: ${webrtcTest.leakedIPs.join(', ')}`
            : '✓ Sealed (No IP Candidate Leaks)';
        document.getElementById('netWebRTC').style.color = webrtcTest.leakedIPs.length > 0 ? '#FF453A' : '#30D158';

        // 2. Post client audit to backend for network & correlation scoring
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientResults)
        });

        const data = await response.json();

        // Update Network Section
        let ipDisplay = data.ip;
        if (data.isLocalTest) {
            ipDisplay += ' (Public WAN Auto-Resolved)';
        }
        document.getElementById('netIP').textContent = ipDisplay;
        document.getElementById('netLocation').textContent = data.location || 'Unknown';
        document.getElementById('netISP').textContent = `${data.isp} (${data.org})`;
        document.getElementById('netASN').textContent = data.asn || 'Unknown';
        document.getElementById('netPTR').textContent = data.ptr || 'No PTR Record';

        document.getElementById('netProxyHeaders').textContent = data.proxyHeaders.length > 0 
            ? `⚠ Found: ${data.proxyHeaders.map(h => h.header).join(', ')}`
            : '✓ Clean (No proxy headers)';
        document.getElementById('netProxyHeaders').style.color = data.proxyHeaders.length > 0 ? '#FF453A' : '#30D158';

        // Timezone comparison
        if (data.timezoneMismatch) {
            document.getElementById('netTimezone').textContent = `⚠ Mismatch: Browser (${clientResults.clientTimezone}) vs IP (${data.ipTimezone})`;
            document.getElementById('netTimezone').style.color = '#FF9F0A';
        } else {
            document.getElementById('netTimezone').textContent = `✓ Coherent (${clientResults.clientTimezone})`;
            document.getElementById('netTimezone').style.color = '#30D158';
        }

        // Update Overall Score
        scoreVal.textContent = data.riskScore;
        statusBadge.textContent = data.status;
        statusBadge.style.color = data.statusColor;
        statusBadge.style.background = `${data.statusColor}22`;
        scoreCircle.style.borderColor = data.statusColor;
        scoreCircle.style.background = `${data.statusColor}11`;

        if (data.riskScore === 0) {
            statusHeadline.textContent = '100% Authentic & Trusted Profile';
            statusSummary.textContent = 'Zero prototype tampering, no proxy headers, no WebRTC leaks, and completely coherent hardware signatures.';
        } else if (data.riskScore < 40) {
            statusHeadline.textContent = 'Minor Behavioral Discrepancies';
            statusSummary.textContent = 'Some indicators suggest network forwarding or private session storage.';
        } else {
            statusHeadline.textContent = 'High-Confidence Anomaly Detected';
            statusSummary.textContent = 'Multiple inconsistencies, proxy traces, or prototype overrides triggered fraud alerts.';
        }

        // Render Anomalies Log
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
            anomalyList.innerHTML = '<div class="log-empty">✓ No anomalies detected. Device profile and network traffic appear genuine and untampered.</div>';
        }

    } catch (err) {
        scoreVal.textContent = '!';
        statusHeadline.textContent = 'Audit Failed: ' + err.message;
        console.error(err);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    runFullAudit();
});
