const http = require('http');
const { spawn } = require('child_process');
// Use built-in WebSocket in Node 24

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9225',
    '--user-data-dir=D:\\temp-edge-dump',
    '--headless=new',
    'about:blank'
]);

setTimeout(() => {
    http.get('http://localhost:9225/json', (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            const tabs = JSON.parse(d);
            const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
            ws.onopen = () => {
                const expr = `(() => {
                    return {
                        chromeKeys: Object.getOwnPropertyNames(window.chrome || {}),
                        hasWebview: typeof window.chrome?.webview,
                        hasApp: typeof window.chrome?.app,
                        hasCsi: typeof window.chrome?.csi,
                        hasLoadTimes: typeof window.chrome?.loadTimes,
                        webdriver: navigator.webdriver,
                        hasPaymentRequest: typeof window.PaymentRequest,
                        hasPaymentRequestUpdateEvent: typeof window.PaymentRequestUpdateEvent,
                        hardwareConcurrency: navigator.hardwareConcurrency,
                        deviceMemory: navigator.deviceMemory,
                        platform: navigator.platform
                    };
                })()`;
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
                ws.onmessage = e => {
                    console.log('REAL_EDGE_INSPECT:', JSON.stringify(JSON.parse(e.data).result.result.value, null, 2));
                    ws.close();
                    edge.kill();
                    process.exit(0);
                };
            };
        });
    });
}, 3000);
