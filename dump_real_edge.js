const http = require('http');
const WebSocket = require('ws');

http.get('http://localhost:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const tabs = JSON.parse(data);
        const tab = tabs.find(t => t.url.includes('fingerprint-scan.com'));
        if (!tab) { console.log('No tab found'); process.exit(1); }
        const ws = new WebSocket(tab.webSocketDebuggerUrl);
        ws.on('open', () => {
            let id = 1;
            function send(method, params = {}) {
                ws.send(JSON.stringify({ id: id++, method, params }));
            }
            // Poll for window.FINGERPRINT_SCAN
            const interval = setInterval(() => {
                ws.send(JSON.stringify({
                    id: 999,
                    method: 'Runtime.evaluate',
                    params: { expression: 'JSON.stringify(window.FINGERPRINT_SCAN || null)', returnByValue: true }
                }));
            }, 1000);
            ws.on('message', (msg) => {
                const res = JSON.parse(msg);
                if (res.id === 999 && res.result && res.result.result && res.result.result.value && res.result.result.value !== 'null') {
                    console.log('REAL_EDGE_RESULT:');
                    console.log(res.result.result.value);
                    clearInterval(interval);
                    ws.close();
                    process.exit(0);
                }
            });
        });
    });
});
