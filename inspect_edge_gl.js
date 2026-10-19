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
                const expr = `(() => {
                    const canvas = document.createElement('canvas');
                    const gl = canvas.getContext('webgl');
                    if (!gl) return { error: 'no gl' };
                    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
                    return {
                        vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'no dbg',
                        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'no dbg',
                        glVendor: gl.getParameter(gl.VENDOR),
                        glRenderer: gl.getParameter(gl.RENDERER)
                    };
                })()`;
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
                ws.onmessage = e => {
                    console.log('REAL_EDGE_GL:', JSON.stringify(JSON.parse(e.data).result.result.value, null, 2));
                    ws.close();
                    edge.kill();
                    process.exit(0);
                };
            };
        });
    });
}, 3000);
