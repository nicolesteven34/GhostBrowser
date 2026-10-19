const http = require('http');
const { spawn } = require('child_process');

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
                // Let's run fingerprint-scan collector on real edge
                const expr = `(async () => {
                    // Let's fetch and run the exact collectors
                    return {
                        ai: typeof window.ai !== 'undefined' ? true : false,
                        chromeKeys: Object.keys(window.chrome || {}),
                        defaultExt: typeof chrome?.runtime?.id !== 'undefined'
                    };
                })()`;
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
                ws.onmessage = e => {
                    console.log('REAL_EDGE_EXP:', JSON.stringify(JSON.parse(e.data).result.result.value, null, 2));
                    ws.close();
                    edge.kill();
                    process.exit(0);
                };
            };
        });
    });
}, 3000);
