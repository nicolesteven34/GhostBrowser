$proc = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--remote-debugging-port=9223", "--user-data-dir=D:\temp-edge-gl", "--headless=new", "about:blank" -PassThru
Start-Sleep -Seconds 3
try {
    $tabs = Invoke-RestMethod -Uri "http://localhost:9223/json"
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $ct = New-Object System.Threading.CancellationToken
    $ws.ConnectAsync([uri]$tabs[0].webSocketDebuggerUrl, $ct).Wait()
    $req = '{"id":1,"method":"Runtime.evaluate","params":{"expression":' + ([System.Text.Json.JsonSerializer]::Serialize(@'
const cGl = document.createElement('canvas');
cGl.width = 120; cGl.height = 120;
document.body.appendChild(cGl);
const gl = cGl.getContext('webgl', { preserveDrawingBuffer: true });
if (!gl) { console.log('NO_GL'); } else {
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
    console.log('DATA_URL_LEN:', cGl.toDataURL().length);
    console.log('DATA_URL_TAIL:', cGl.toDataURL().slice(-60));
}
'@)) + ',"returnByValue":true}}'
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($req)
    $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
    $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait()
    $buffer = New-Object byte[] 65536
    $recvSegment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
    $res = $ws.ReceiveAsync($recvSegment, $ct).Result
    $json = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $res.Count)
    Write-Output $json
} finally {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "D:\temp-edge-gl" -ErrorAction SilentlyContinue
}
