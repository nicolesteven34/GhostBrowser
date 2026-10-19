const http = require('http');
const { spawn } = require('child_process');

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9230',
    '--user-data-dir=D:\\temp-edge-dump-4',
    '--headless=new',
    'about:blank'
]);

setTimeout(() => {
    http.get('http://localhost:9230/json', (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            const tabs = JSON.parse(d);
            const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
            ws.onopen = () => {
                const expr = `(() => {
                    const obj = {
                        summarizerAvailability: 'unavailable',
                        summarizerLanguageAvailability: 'unavailable'
                    };
                    const hasSumm = 'Summarizer' in window;
                    const hasAi = 'ai' in window;
                    return { hasSumm, hasAi, obj };
                })()`;
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
                ws.onmessage = e => {
                    console.log('REAL_EDGE_ABOUT_BLANK:', JSON.stringify(JSON.parse(e.data).result.result.value, null, 2));
                    ws.close();
                    edge.kill();
                    process.exit(0);
                };
            };
        });
    });
}, 2500);
