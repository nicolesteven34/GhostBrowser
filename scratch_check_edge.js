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
                            const all = Array.from(document.querySelectorAll('*'));
                            const item = all.find(e => e.innerText && e.innerText.includes('BROWSER FEATURES') && e.children.length === 2);
                            return {
                                text: item ? item.innerText : 'not found',
                                bodySnippet: document.body.innerText.slice(0, 1500)
                            };
                        }
                        await new Promise(r => setTimeout(r, 500));
                    }
                    return { timeout: true };
                })()`;
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
                ws.onmessage = e => {
                    console.log('REAL_EDGE_SCAN_PAGE:', JSON.stringify(JSON.parse(e.data).result.result.value, null, 2));
                    ws.close();
                    edge.kill();
                    process.exit(0);
                };
            };
        });
    });
}, 4000);
