const http = require('http');
const { spawn } = require('child_process');

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9232',
    '--user-data-dir=D:\\temp-edge-dump-proto',
    '--headless=new',
    'about:blank'
]);

setTimeout(() => {
    http.get('http://localhost:9232/json', (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            const tabs = JSON.parse(d);
            const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
            ws.onopen = () => {
                const expr = `(() => {
                    const descPRUE = Object.getOwnPropertyDescriptor(window, 'PaymentRequestUpdateEvent');
                    const descSumm = Object.getOwnPropertyDescriptor(window, 'Summarizer');
                    
                    const summProto = window.Summarizer ? Object.getOwnPropertyDescriptors(window.Summarizer) : null;
                    const prueProto = window.PaymentRequestUpdateEvent ? Object.getOwnPropertyDescriptors(window.PaymentRequestUpdateEvent) : null;
                    
                    return {
                        descPRUE: { enumerable: descPRUE?.enumerable, writable: descPRUE?.writable, configurable: descPRUE?.configurable },
                        descSumm: { enumerable: descSumm?.enumerable, writable: descSumm?.writable, configurable: descSumm?.configurable },
                        prueProtoKeys: prueProto ? Object.keys(prueProto) : null,
                        summProtoKeys: summProto ? Object.keys(summProto) : null,
                        prueSuper: Object.getPrototypeOf(window.PaymentRequestUpdateEvent)?.name,
                        summSuper: Object.getPrototypeOf(window.Summarizer)?.name
                    };
                })()`;
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
                ws.onmessage = e => {
                    console.log('REAL_EDGE_PROTOS:', JSON.stringify(JSON.parse(e.data).result.result.value, null, 2));
                    ws.close();
                    edge.kill();
                    process.exit(0);
                };
            };
        });
    });
}, 2500);
