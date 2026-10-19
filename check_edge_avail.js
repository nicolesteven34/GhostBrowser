const http = require('http');
const { spawn } = require('child_process');

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9233',
    '--user-data-dir=D:\\temp-edge-dump-summ',
    '--headless=new',
    'about:blank'
]);

setTimeout(() => {
    http.get('http://localhost:9233/json', (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            const tabs = JSON.parse(d);
            const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
            ws.onopen = () => {
                const expr = `(async () => {
                    let r1, r2;
                    try { r1 = await window.Summarizer.availability(); } catch(e) { r1 = 'ERR:' + e.message; }
                    try { r2 = await window.Summarizer.availability({ expectedInputLanguages: ['en-US'] }); } catch(e) { r2 = 'ERR:' + e.message; }
                    return { r1, r2 };
                })()`;
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
                ws.onmessage = e => {
                    console.log('REAL_EDGE_AVAIL_RESULT:', JSON.stringify(JSON.parse(e.data).result.result.value, null, 2));
                    ws.close();
                    edge.kill();
                    process.exit(0);
                };
            };
        });
    });
}, 2500);
