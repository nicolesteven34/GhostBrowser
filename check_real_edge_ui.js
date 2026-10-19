const http = require('http');
const { spawn } = require('child_process');

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9229',
    '--user-data-dir=D:\\temp-edge-dump-3',
    '--headless=new',
    'https://fingerprint-scan.com/'
]);

setTimeout(() => {
    http.get('http://localhost:9229/json', (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            const tabs = JSON.parse(d);
            const tab = tabs.find(t => t.url.includes('fingerprint-scan')) || tabs[0];
            const ws = new WebSocket(tab.webSocketDebuggerUrl);
            ws.onopen = () => {
                const expr = `(async () => {
                    // Let's get the exact text inside the cards on fingerprint-scan.com!
                    const cards = Array.from(document.querySelectorAll('*')).filter(el => {
                        const t = el.innerText || '';
                        return t.includes('BROWSER FEATURES');
                    });
                    
                    // Search for 31b7bdf4a5dba25a in document.body
                    const hasUserHash = document.body.innerText.includes('31b7bdf4a5dba25a');
                    const hasGhostHash = document.body.innerText.includes('d51826882dce5b8e');
                    
                    return {
                        hasUserHash,
                        hasGhostHash,
                        aiInWindow: typeof window.ai,
                        modelGeneric: typeof window.model,
                        cardsText: cards.slice(0, 5).map(c => c.innerText)
                    };
                })()`;
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
                ws.onmessage = e => {
                    console.log('REAL_EDGE_CHECK:', JSON.stringify(JSON.parse(e.data).result.result.value, null, 2));
                    ws.close();
                    edge.kill();
                    process.exit(0);
                };
            };
        });
    });
}, 4000);
