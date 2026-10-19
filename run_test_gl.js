const http = require('http');
const { spawn } = require('child_process');

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9224',
    '--user-data-dir=D:\\temp-edge-gl3',
    '--headless=new',
    'about:blank'
]);

setTimeout(() => {
    http.get('http://localhost:9224/json', (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            const tabs = JSON.parse(d);
            const WebSocket = require('c:/Users/Home/AppData/Roaming/npm/node_modules/ws');
            const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
            ws.on('open', () => {
                const expr = `(() => {
                    const cGl = document.createElement('canvas');
                    cGl.width = 120; cGl.height = 120;
                    const gl = cGl.getContext('webgl', { preserveDrawingBuffer: true });
                    if (!gl) return { error: 'no gl' };
                    gl.viewport(0, 0, 120, 120);
                    const vs = gl.createShader(gl.VERTEX_SHADER);
                    gl.shaderSource(vs, 'attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }');
                    gl.compileShader(vs);
                    const fs = gl.createShader(gl.FRAGMENT_SHADER);
                    gl.shaderSource(fs, 'precision mediump float; uniform float u; void main() { gl_FragColor = vec4(u * 0.2, u * 0.4, 0.8, 1.0); }');
                    gl.compileShader(fs);
                    const prog = gl.createProgram();
                    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
                    gl.bindAttribLocation(prog, 0, 'a');
                    gl.linkProgram(prog); gl.useProgram(prog);
                    const uLoc = gl.getUniformLocation(prog, 'u');
                    const buf = gl.createBuffer();
                    gl.bindBuffer(34962, buf);
                    gl.bufferData(34962, new Float32Array([0, 1, -1, -1, 1, -1]), 35044);
                    gl.vertexAttribPointer(0, 2, 5126, false, 0, 0);
                    gl.enableVertexAttribArray(0);
                    gl.clearColor(0.2, 0.4, 0.6, 1.0);
                    gl.clear(16384);
                    gl.uniform1f(uLoc, 3.65);
                    gl.drawArrays(4, 0, 3);
                    const data = cGl.toDataURL();
                    return {
                        len: data.length,
                        tail: data.slice(-50),
                        hasDrawing: data.length > 500
                    };
                })()`;
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
                ws.on('message', m => {
                    console.log('RESULT:', JSON.parse(m).result.result.value);
                    ws.close();
                    edge.kill();
                    process.exit(0);
                });
            });
        });
    });
}, 3000);
