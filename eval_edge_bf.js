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
                    const testFn = (fn) => { try { return fn(); } catch { return false; } };
                    const bf = {
                        chrome: testFn(() => 'chrome' in window),
                        brave: testFn(() => 'brave' in navigator),
                        applePaySupport: testFn(() => 'ApplePaySetup' in window),
                        opera: testFn(() => typeof window.opr !== 'undefined' || typeof window.opera === 'string'),
                        serial: testFn(() => typeof navigator.serial !== 'undefined'),
                        attachShadow: testFn(() => typeof Element !== 'undefined' && !!Element.prototype.attachShadow),
                        caches: testFn(() => !!window.caches),
                        webAssembly: testFn(() => !!window.WebAssembly && !!window.WebAssembly.validate),
                        buffer: testFn(() => 'Buffer' in window),
                        showModalDialog: testFn(() => 'showModalDialog' in window),
                        safari: testFn(() => 'safari' in window),
                        webkitPrefixedFunction: testFn(() => 'webkitCancelAnimationFrame' in window),
                        mozPrefixedFunction: testFn(() => 'mozInnerScreenX' in window),
                        usb: testFn(() => typeof window.USB === 'function'),
                        browserCapture: testFn(() => typeof window.BrowserCaptureMediaStreamTrack === 'function'),
                        paymentRequestUpdateEvent: testFn(() => typeof window.PaymentRequestUpdateEvent === 'function'),
                        pressureObserver: testFn(() => typeof window.PressureObserver === 'function'),
                        audioSession: testFn(() => 'audioSession' in navigator),
                        selectAudioOutput: testFn(() => typeof navigator.mediaDevices !== 'undefined' && typeof navigator.mediaDevices.selectAudioOutput === 'function'),
                        barcodeDetector: testFn(() => 'BarcodeDetector' in window),
                        battery: testFn(() => 'getBattery' in navigator),
                        devicePosture: testFn(() => 'DevicePosture' in window),
                        documentPictureInPicture: testFn(() => 'documentPictureInPicture' in window),
                        eyeDropper: testFn(() => 'EyeDropper' in window),
                        editContext: testFn(() => 'EditContext' in window),
                        fencedFrame: testFn(() => 'FencedFrameConfig' in window),
                        sanitizer: testFn(() => 'Sanitizer' in window),
                        otpCredential: testFn(() => 'OTPCredential' in window),
                        sumPrecise: testFn(() => 'sumPrecise' in Math)
                    };
                    const bitmask = Object.values(bf).map(v => v ? '1' : '0').join('');
                    return { bf, bitmask };
                })()`;
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
                ws.onmessage = e => {
                    console.log('REAL_EDGE_BF:', JSON.stringify(JSON.parse(e.data).result.result.value, null, 2));
                    ws.close();
                    edge.kill();
                    process.exit(0);
                };
            };
        });
    });
}, 3000);
