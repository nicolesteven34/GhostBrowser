const http = require('http');
const { spawn } = require('child_process');

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9227',
    '--user-data-dir=D:\\temp-edge-dump-2',
    '--headless=new',
    'https://fingerprint-scan.com/'
]);

setTimeout(() => {
    http.get('http://localhost:9227/json', (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            const tabs = JSON.parse(d);
            const tab = tabs.find(t => t.url.includes('fingerprint-scan')) || tabs[0];
            const ws = new WebSocket(tab.webSocketDebuggerUrl);
            ws.onopen = () => {
                const expr = `(async () => {
                    for (let i = 0; i < 30; i++) {
                        if (document.body && document.body.innerText.includes('BROWSER FEATURES')) {
                            // Extract signals from the page DOM or table
                            const rows = Array.from(document.querySelectorAll('tr, div')).filter(el => {
                                const t = el.innerText || '';
                                return t.includes('Browser features') || t.includes('Plugins') || t.includes('AI') || t.includes('Math fingerprint');
                            });
                            
                            // Also let's inspect window.__fpRuntime
                            let runtimeSignals = null;
                            if (window.__fpRuntime) {
                                try {
                                    const fp = await window.__fpRuntime.collectFingerprint();
                                    runtimeSignals = {
                                        browserFeatures: fp.signals.browserFeatures,
                                        plugins: fp.signals.plugins,
                                        mimeTypes: fp.signals.mimeTypes,
                                        ai: fp.signals.ai,
                                        mathFingerprint: fp.signals.mathFingerprint
                                    };
                                } catch(e) {
                                    runtimeSignals = { err: e.message };
                                }
                            }
                            return { runtimeSignals };
                        }
                        await new Promise(r => setTimeout(r, 500));
                    }
                    return { timeout: true };
                })()`;
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
                ws.onmessage = e => {
                    console.log('REAL_EDGE_SIGNALS:', JSON.stringify(JSON.parse(e.data).result.result.value, null, 2));
                    ws.close();
                    edge.kill();
                    process.exit(0);
                };
            };
        });
    });
}, 4000);
