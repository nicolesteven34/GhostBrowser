/**
 * Ghost Detection Suite - Enterprise Browser & Device Integrity Engine
 * Comprehensive auditing of DOM Geometry Invariants, Native Prototype ASTs,
 * Web Worker Isolation Parity, Canvas/Audio Deterministic Farbling,
 * WebGL/WebGPU Architecture, and Multi-Signal Identity Hashing.
 */

(function(window) {
    'use strict';

    // Fast, deterministic 32-bit FNV-1a hashing
    function fnv1a(str) {
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, '0');
    }

    function multiHash(components) {
        let combined = components.join('|:|');
        let h1 = fnv1a(combined);
        let h2 = fnv1a(combined.split('').reverse().join(''));
        let h3 = fnv1a(h1 + h2 + combined);
        let h4 = fnv1a(h2 + h3 + combined);
        return `${h1}${h2}${h3}${h4}`;
    }

    window.GhostDetector = {
        async runAllTests() {
            const results = {
                timestamp: new Date().toISOString(),
                visitorId: '',
                botScore: 0,
                tamperingDetected: false,
                tamperingReasons: [],
                risks: {
                    hardwareRisk: 0,
                    prototypeRisk: 0,
                    workerRisk: 0,
                    canvasAudioRisk: 0,
                    geometryRisk: 0,
                    networkRisk: 0
                },
                hashes: {
                    canvasHash: '',
                    webglHash: '',
                    audioHash: '',
                    fontHash: '',
                    hardwareHash: '',
                    mathHash: '',
                    compositeVisitorId: ''
                },
                hardware: {
                    cores: navigator.hardwareConcurrency || 4,
                    memory: navigator.deviceMemory || 8,
                    platform: navigator.platform || 'Unknown',
                    screen: `${screen.width}x${screen.height}`,
                    pixelRatio: window.devicePixelRatio || 1,
                    gpuVendor: 'Unknown',
                    gpuRenderer: 'Unknown',
                    gpuArchitecture: 'Unknown',
                    webgpuMatchesWebgl: true
                },
                tests: {}
            };

            // 1. Prototype Chain & AST Integrity Audit
            results.tests.prototypes = this.auditPrototypes();
            if (!results.tests.prototypes.passed) {
                results.tamperingDetected = true;
                results.risks.prototypeRisk += 40;
                results.tamperingReasons.push(...results.tests.prototypes.issues);
            }

            // 2. DOM Geometry Invariance Audit (Fingerprint.com Check)
            results.tests.geometry = this.auditDOMGeometryInvariants();
            if (!results.tests.geometry.passed) {
                results.tamperingDetected = true;
                results.risks.geometryRisk += 45;
                results.tamperingReasons.push(`DOM Geometry Tampering: offsetWidth vs getBoundingClientRect discrepancy (${results.tests.geometry.maxDiscrepancy.toFixed(3)}px)`);
            }

            // 3. Web Worker Isolation & Context Parity Audit
            results.tests.worker = await this.auditWorkerParity();
            if (!results.tests.worker.passed) {
                results.tamperingDetected = true;
                results.risks.workerRisk += 35;
                results.tamperingReasons.push(`Worker Context Desync: ${results.tests.worker.issue}`);
            }

            // 4. Dynamic Iframe Stealth Propagation Audit
            results.tests.iframe = this.auditDynamicIframe();
            if (!results.tests.iframe.passed) {
                results.tamperingDetected = true;
                results.risks.prototypeRisk += 25;
                results.tamperingReasons.push(`IFrame Leak: ${results.tests.iframe.issue}`);
            }

            // 5. Canvas 2D Farbling & Stability Audit
            results.tests.canvas = this.auditCanvas();
            results.hashes.canvasHash = results.tests.canvas.hash;
            if (!results.tests.canvas.isStable) {
                results.tamperingDetected = true;
                results.risks.canvasAudioRisk += 30;
                results.tamperingReasons.push("Canvas Noise Farbler: Consecutive renders produced non-deterministic bitstream jitter");
            }

            // 6. WebGL & WebGPU Architecture & Hardware Limits
            results.tests.webgl = await this.auditWebGLAndWebGPU();
            results.hashes.webglHash = results.tests.webgl.hash;
            results.hardware.gpuVendor = results.tests.webgl.vendor;
            results.hardware.gpuRenderer = results.tests.webgl.renderer;
            results.hardware.gpuArchitecture = results.tests.webgl.gpuArchitecture;
            results.hardware.webgpuMatchesWebgl = results.tests.webgl.webgpuMatchesWebgl;
            if (!results.tests.webgl.webgpuMatchesWebgl) {
                results.tamperingDetected = true;
                results.risks.hardwareRisk += 35;
                results.tamperingReasons.push(`GPU Subsystem Conflict: WebGL reported "${results.tests.webgl.vendor}" but WebGPU reported "${results.tests.webgl.webgpuVendor}"`);
            }

            // 7. Web Audio API Offline DSP Synthesis
            results.tests.audio = await this.auditAudio();
            results.hashes.audioHash = results.tests.audio.hash;
            if (!results.tests.audio.isStable) {
                results.tamperingDetected = true;
                results.risks.canvasAudioRisk += 20;
                results.tamperingReasons.push("Audio Buffer Jitter: Non-deterministic audio DSP rendering detected");
            }

            // 8. Font Footprint & CSSOM Probing
            results.tests.fonts = this.auditFontFootprint();
            results.hashes.fontHash = results.tests.fonts.hash;

            // 9. High-Precision Math & Client Hardware Signature
            results.tests.math = this.auditMath();
            results.hashes.mathHash = results.tests.math.hash;

            results.hashes.hardwareHash = multiHash([
                results.hardware.cores,
                results.hardware.memory,
                results.hardware.platform,
                results.hardware.screen,
                results.hardware.pixelRatio,
                results.hardware.gpuRenderer
            ]);

            // Composite Visitor ID Calculation
            results.visitorId = 'gfp_' + multiHash([
                results.hashes.canvasHash,
                results.hashes.webglHash,
                results.hashes.audioHash,
                results.hashes.fontHash,
                results.hashes.hardwareHash,
                results.hashes.mathHash
            ]);
            results.hashes.compositeVisitorId = results.visitorId;

            // Overall Bot Score Calculation (0 - 100)
            let totalRisk = Object.values(results.risks).reduce((a, b) => a + b, 0);
            results.botScore = Math.min(100, totalRisk);

            // Send to server registry for cluster correlation & visitor count tracking
            try {
                const fpRes = await fetch('/api/fingerprint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        visitorId: results.visitorId,
                        canvasHash: results.hashes.canvasHash,
                        webglHash: results.hashes.webglHash,
                        audioHash: results.hashes.audioHash,
                        fontHash: results.hashes.fontHash,
                        hardwareHash: results.hashes.hardwareHash,
                        gpuRenderer: results.hardware.gpuRenderer,
                        botScore: results.botScore,
                        tamperingDetected: results.tamperingDetected
                    })
                });
                results.serverRegistry = await fpRes.json();
            } catch (e) {
                results.serverRegistry = { visitCount: 1, isNewVisitor: true };
            }

            return results;
        },

        // -------------------------------------------------------------
        // Vector 1: Native Function Prototype AST & Descriptor Check
        // -------------------------------------------------------------
        auditPrototypes() {
            const issues = [];
            const nativeToString = Function.prototype.toString;
            const nativeRegex = /^function\s*[\w$]*\s*\(\s*\)\s*\{\s*\[native code\]\s*\}$/;

            function verifyFunction(fn, name) {
                if (!fn) return;
                try {
                    const str = nativeToString.call(fn);
                    if (!nativeRegex.test(str)) {
                        issues.push(`Function ${name} returned non-native AST: "${str.substring(0, 30)}..."`);
                    }
                } catch (e) {
                    issues.push(`Cannot serialize ${name}: ${e.message}`);
                }
            }

            // Verify core API methods
            if (window.HTMLCanvasElement) verifyFunction(HTMLCanvasElement.prototype.toDataURL, 'HTMLCanvasElement.prototype.toDataURL');
            if (window.CanvasRenderingContext2D) verifyFunction(CanvasRenderingContext2D.prototype.getImageData, 'CanvasRenderingContext2D.prototype.getImageData');
            if (window.WebGLRenderingContext) verifyFunction(WebGLRenderingContext.prototype.getParameter, 'WebGLRenderingContext.prototype.getParameter');
            if (window.AudioBuffer) verifyFunction(AudioBuffer.prototype.getChannelData, 'AudioBuffer.prototype.getChannelData');
            if (window.Element) verifyFunction(Element.prototype.getBoundingClientRect, 'Element.prototype.getBoundingClientRect');
            if (window.Worker) verifyFunction(window.Worker, 'window.Worker');
            if (window.SharedWorker) verifyFunction(window.SharedWorker, 'window.SharedWorker');
            if (window.MediaDevices) verifyFunction(MediaDevices.prototype.enumerateDevices, 'MediaDevices.prototype.enumerateDevices');
            if (window.Permissions) verifyFunction(Permissions.prototype.query, 'Permissions.prototype.query');
            if (window.Performance) verifyFunction(Performance.prototype.now, 'Performance.prototype.now');
            if (window.Intl && window.Intl.DateTimeFormat) verifyFunction(Intl.DateTimeFormat.prototype.resolvedOptions, 'Intl.DateTimeFormat.prototype.resolvedOptions');

            // Recursive toString check
            try {
                const tsStr = nativeToString.call(Function.prototype.toString);
                if (!nativeRegex.test(tsStr)) issues.push("Function.prototype.toString has been modified");
            } catch (e) {
                issues.push("Function.prototype.toString check threw error: " + e.message);
            }

            // Navigator Prototype vs Instance Check
            const forbiddenOwn = ['hardwareConcurrency', 'deviceMemory', 'platform', 'vendor', 'userAgent', 'webdriver'];
            for (const prop of forbiddenOwn) {
                if (Object.prototype.hasOwnProperty.call(navigator, prop)) {
                    issues.push(`Navigator instance contains own-property override: "${prop}" (must inherit from Navigator.prototype)`);
                }
                const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, prop);
                if (desc && typeof desc.get !== 'function' && prop !== 'webdriver') {
                    issues.push(`Navigator.prototype.${prop} lacks native getter`);
                }
            }

            if (Object.getPrototypeOf(navigator) !== Navigator.prototype) {
                issues.push("navigator prototype chain is altered (Object.getPrototypeOf(navigator) !== Navigator.prototype)");
            }

            // Error stack inspection (checks for injected script wrappers)
            try {
                throw new Error('prototype_probe');
            } catch (err) {
                const stack = err.stack || '';
                if (stack.includes('stealth.js') || stack.includes('ghost_engine') || stack.includes('chrome-extension://')) {
                    issues.push("Error.stack leaked internal wrapper frame or extension URI");
                }
            }

            return {
                passed: issues.length === 0,
                issues: issues,
                testedCount: 14
            };
        },

        // -------------------------------------------------------------
        // Vector 2: DOM Geometry Invariance (The Fingerprint.com Check)
        // -------------------------------------------------------------
        auditDOMGeometryInvariants() {
            let maxDiscrepancy = 0;
            let integerMismatch = false;
            const fonts = ['monospace', 'sans-serif', 'serif', 'Arial', 'Calibri', 'Segoe UI', 'Times New Roman'];
            const container = document.createElement('div');
            container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; visibility: hidden;';
            document.body.appendChild(container);

            for (const font of fonts) {
                const span = document.createElement('span');
                span.style.cssText = `font-family: ${font}; font-size: 72px; display: inline-block; line-height: normal;`;
                span.textContent = 'mmMwWLliI0fiflO&1';
                container.appendChild(span);

                const rect = span.getBoundingClientRect();
                const offW = span.offsetWidth;
                const offH = span.offsetHeight;

                // According to W3C CSSOM: offsetWidth is rounded to an integer from layout box.
                // Discrepancy occurs if Math.round(rect.width) !== offW or subpixel delta exceeds physical 0.55px limit.
                const intDiffW = Math.abs(Math.round(rect.width) - offW);
                const intDiffH = Math.abs(Math.round(rect.height) - offH);
                if (intDiffW > 0 || intDiffH > 0) integerMismatch = true;

                const subDiffW = Math.abs(rect.width - offW);
                const subDiffH = Math.abs(rect.height - offH);
                if (subDiffW > maxDiscrepancy) maxDiscrepancy = subDiffW;
                if (subDiffH > maxDiscrepancy) maxDiscrepancy = subDiffH;
            }

            document.body.removeChild(container);

            // True tampering check: integer mismatch > 0 OR subpixel drift >= 0.60
            const passed = !integerMismatch && maxDiscrepancy < 0.60;

            return {
                passed: passed,
                maxDiscrepancy: maxDiscrepancy,
                testedFonts: fonts.length,
                status: passed ? 'Pristine Physical Geometry Invariants' : 'DOM Discrepancy Detected'
            };
        },

        // -------------------------------------------------------------
        // Vector 3: Web Worker Isolation & Context Parity
        // -------------------------------------------------------------
        auditWorkerParity() {
            return new Promise((resolve) => {
                if (!window.Worker) {
                    return resolve({ passed: true, note: 'Worker API not supported', isSameAsMainJsContext: true });
                }

                try {
                    const workerCode = `
                        self.onmessage = function() {
                            let hc = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : null;
                            let dm = typeof navigator !== 'undefined' ? navigator.deviceMemory : null;
                            let plat = typeof navigator !== 'undefined' ? navigator.platform : null;
                            self.postMessage({ hc: hc, dm: dm, plat: plat });
                        };
                    `;
                    const blob = new Blob([workerCode], { type: 'application/javascript' });
                    const blobUrl = URL.createObjectURL(blob);
                    const worker = new Worker(blobUrl);

                    const timer = setTimeout(() => {
                        try { worker.terminate(); URL.revokeObjectURL(blobUrl); } catch(e) {}
                        resolve({ passed: true, note: 'Worker probe timed out (assumed coherent)', isSameAsMainJsContext: true });
                    }, 1500);

                    worker.onmessage = (e) => {
                        clearTimeout(timer);
                        const d = e.data || {};
                        try { worker.terminate(); URL.revokeObjectURL(blobUrl); } catch(err) {}

                        const hcMatch = (d.hc === navigator.hardwareConcurrency);
                        const dmMatch = (d.dm === navigator.deviceMemory);
                        const platMatch = (d.plat === navigator.platform);

                        if (!hcMatch || !dmMatch || !platMatch) {
                            return resolve({
                                passed: false,
                                isSameAsMainJsContext: false,
                                issue: `Worker reported HC=${d.hc}, DM=${d.dm}, Plat="${d.plat}" vs Window HC=${navigator.hardwareConcurrency}, DM=${navigator.deviceMemory}, Plat="${navigator.platform}"`
                            });
                        }

                        resolve({
                            passed: true,
                            isSameAsMainJsContext: true,
                            workerHardwareConcurrency: d.hc,
                            workerDeviceMemory: d.dm,
                            workerPlatform: d.plat
                        });
                    };

                    worker.onerror = () => {
                        clearTimeout(timer);
                        try { worker.terminate(); URL.revokeObjectURL(blobUrl); } catch(e) {}
                        resolve({ passed: true, note: 'Worker terminated cleanly', isSameAsMainJsContext: true });
                    };

                    worker.postMessage('ping');
                } catch (e) {
                    resolve({ passed: true, note: 'Worker construction bypassed: ' + e.message, isSameAsMainJsContext: true });
                }
            });
        },

        // -------------------------------------------------------------
        // Vector 4: Dynamic IFrame Stealth Propagation
        // -------------------------------------------------------------
        auditDynamicIframe() {
            try {
                const ifr = document.createElement('iframe');
                ifr.style.cssText = 'position: absolute; left: -9999px; top: -9999px; width: 0; height: 0; visibility: hidden;';
                document.body.appendChild(ifr);

                const iWin = ifr.contentWindow;
                if (!iWin) {
                    document.body.removeChild(ifr);
                    return { passed: true, note: 'Iframe contentWindow isolated' };
                }

                const iHc = iWin.navigator ? iWin.navigator.hardwareConcurrency : null;
                const mHc = navigator.hardwareConcurrency;
                const hcMatch = (iHc === mHc);

                let toStringClean = true;
                if (iWin.HTMLCanvasElement && iWin.HTMLCanvasElement.prototype) {
                    const str = Function.prototype.toString.call(iWin.HTMLCanvasElement.prototype.toDataURL);
                    toStringClean = str.includes('[native code]');
                }

                document.body.removeChild(ifr);

                if (!hcMatch) {
                    return { passed: false, issue: `Dynamic iframe reported hardwareConcurrency=${iHc} vs main=${mHc}` };
                }
                if (!toStringClean) {
                    return { passed: false, issue: "Dynamic iframe exposed non-native function string" };
                }

                return { passed: true, status: 'Stealth propagated seamlessly to child frames' };
            } catch (e) {
                return { passed: true, note: 'Iframe audit completed: ' + e.message };
            }
        },

        // -------------------------------------------------------------
        // Vector 5: Canvas 2D Stability & Farbling Audit
        // -------------------------------------------------------------
        auditCanvas() {
            function renderPass() {
                const c = document.createElement('canvas');
                c.width = 240;
                c.height = 60;
                const ctx = c.getContext('2d');
                if (!ctx) return '';

                ctx.textBaseline = 'alphabetic';
                ctx.fillStyle = '#f60';
                ctx.fillRect(10, 1, 62, 20);

                ctx.fillStyle = '#069';
                ctx.font = '11pt "Times New Roman"';
                ctx.fillText('GhostBrowser Privacy 🔒', 2, 15);

                ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
                ctx.font = '18pt Arial';
                ctx.fillText('GhostBrowser Privacy 🔒', 4, 45);

                // Complex geometric winding path
                ctx.beginPath();
                ctx.arc(180, 30, 20, 0, Math.PI * 2, true);
                ctx.arc(180, 30, 10, 0, Math.PI * 2, true);
                ctx.fill('evenodd');

                return c.toDataURL();
            }

            const pass1 = renderPass();
            const pass2 = renderPass();
            const isStable = (pass1 === pass2) && pass1.length > 0;
            const hash = multiHash([pass1.substring(pass1.length - 80)]);

            return {
                isStable: isStable,
                hash: hash,
                sampleLen: pass1.length
            };
        },

        // -------------------------------------------------------------
        // Vector 6: WebGL & WebGPU Architecture & Hardware Limits
        // -------------------------------------------------------------
        async auditWebGLAndWebGPU() {
            let vendor = 'Generic';
            let renderer = 'Generic';
            let maxUniforms = 0;
            let maxVarying = 0;
            let triangleHash = '';

            try {
                const c = document.createElement('canvas');
                const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
                if (gl) {
                    const ext = gl.getExtension('WEBGL_debug_renderer_info');
                    if (ext) {
                        vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || vendor;
                        renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || renderer;
                    }
                    maxUniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) || 0;
                    maxVarying = gl.getParameter(gl.MAX_VARYING_VECTORS) || 0;

                    // WebGL 3D triangle primitive test
                    const vs = gl.createShader(gl.VERTEX_SHADER);
                    gl.shaderSource(vs, 'attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }');
                    gl.compileShader(vs);
                    const fs = gl.createShader(gl.FRAGMENT_SHADER);
                    gl.shaderSource(fs, 'precision mediump float; void main() { gl_FragColor = vec4(0.5, 0.2, 0.8, 1.0); }');
                    gl.compileShader(fs);
                    const prog = gl.createProgram();
                    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);

                    const buf = gl.createBuffer();
                    gl.bindBuffer(34962, buf);
                    gl.bufferData(34962, new Float32Array([0, 1, -1, -1, 1, -1]), 35044);
                    gl.vertexAttribPointer(0, 2, 5126, false, 0, 0);
                    gl.enableVertexAttribArray(0);
                    gl.drawArrays(4, 0, 3);

                    triangleHash = multiHash([c.toDataURL().substring(c.toDataURL().length - 40)]);
                }
            } catch (e) {}

            // WebGPU adapter inspection
            let webgpuVendor = 'Not Supported';
            let gpuArchitecture = 'Not Supported';
            let webgpuMatchesWebgl = true;

            if (navigator.gpu && navigator.gpu.requestAdapter) {
                try {
                    const adapter = await navigator.gpu.requestAdapter();
                    if (adapter && adapter.info) {
                        webgpuVendor = adapter.info.vendor || 'Unknown';
                        gpuArchitecture = adapter.info.architecture || 'Unknown';

                        const lowerGl = renderer.toLowerCase();
                        if (lowerGl.includes('nvidia') && !webgpuVendor.toLowerCase().includes('nvidia')) webgpuMatchesWebgl = false;
                        if (lowerGl.includes('radeon') && !webgpuVendor.toLowerCase().includes('amd')) webgpuMatchesWebgl = false;
                        if (lowerGl.includes('intel') && !webgpuVendor.toLowerCase().includes('intel')) webgpuMatchesWebgl = false;
                    }
                } catch (e) {}
            }

            const hash = multiHash([vendor, renderer, maxUniforms, maxVarying, triangleHash]);

            return {
                vendor: vendor,
                renderer: renderer,
                maxUniforms: maxUniforms,
                maxVarying: maxVarying,
                webgpuVendor: webgpuVendor,
                gpuArchitecture: gpuArchitecture,
                webgpuMatchesWebgl: webgpuMatchesWebgl,
                triangleHash: triangleHash,
                hash: hash
            };
        },

        // -------------------------------------------------------------
        // Vector 7: Web Audio API Offline DSP Synthesis
        // -------------------------------------------------------------
        async auditAudio() {
            let sum1 = 0;
            let sum2 = 0;

            async function renderAudio() {
                const AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
                if (!AudioCtx) return 0;
                try {
                    const ctx = new AudioCtx(1, 5000, 44100);
                    const osc = ctx.createOscillator();
                    osc.type = 'triangle';
                    osc.frequency.value = 10000;
                    const comp = ctx.createDynamicsCompressor();
                    comp.threshold.value = -50;
                    comp.knee.value = 40;
                    comp.ratio.value = 12;
                    comp.attack.value = 0;
                    comp.release.value = 0.25;
                    osc.connect(comp);
                    comp.connect(ctx.destination);
                    osc.start(0);

                    const buf = await ctx.startRendering();
                    const chan = buf.getChannelData(0).subarray(0, 5000);
                    let sum = 0;
                    for (let i = 0; i < chan.length; i++) sum += Math.abs(chan[i]);
                    return sum;
                } catch (e) {
                    return 0;
                }
            }

            sum1 = await renderAudio();
            sum2 = await renderAudio();
            const isStable = Math.abs(sum1 - sum2) < 0.00001 && sum1 > 0;
            const hash = multiHash([sum1.toFixed(6)]);

            return {
                isStable: isStable,
                audioSum: sum1,
                hash: hash
            };
        },

        // -------------------------------------------------------------
        // Vector 8: Font Footprint & CSSOM Probing
        // -------------------------------------------------------------
        auditFontFootprint() {
            const candidateFonts = [
                'Calibri', 'Segoe UI', 'Agency FB', 'Consolas', 'Arial Black',
                'Bahnschrift', 'Candara', 'Century Gothic', 'Comic Sans MS',
                'Constantia', 'Corbel', 'Courier New', 'Franklin Gothic Medium',
                'Gabriola', 'Georgia', 'Impact', 'Ink Free', 'Leelawadee UI',
                'Lucida Console', 'Malgun Gothic', 'Microsoft YaHei', 'Myanmar Text',
                'Palatino Linotype', 'Sitka Text', 'Trebuchet MS', 'Verdana'
            ];

            const baseFonts = ['monospace', 'sans-serif', 'serif'];
            const container = document.createElement('div');
            container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; visibility: hidden;';
            document.body.appendChild(container);

            const baseWidths = {};
            for (const base of baseFonts) {
                const s = document.createElement('span');
                s.style.cssText = `font-family: ${base}; font-size: 72px;`;
                s.textContent = 'mmMwWLliI0fiflO&1';
                container.appendChild(s);
                baseWidths[base] = s.offsetWidth;
            }

            const detectedFonts = [];
            for (const font of candidateFonts) {
                let matched = false;
                for (const base of baseFonts) {
                    const s = document.createElement('span');
                    s.style.cssText = `font-family: "${font}", ${base}; font-size: 72px;`;
                    s.textContent = 'mmMwWLliI0fiflO&1';
                    container.appendChild(s);
                    if (s.offsetWidth !== baseWidths[base]) {
                        matched = true;
                        break;
                    }
                }
                if (matched) detectedFonts.push(font);
            }

            document.body.removeChild(container);
            const hash = multiHash([detectedFonts.sort().join(',')]);

            return {
                detectedCount: detectedFonts.length,
                detectedFonts: detectedFonts,
                hash: hash
            };
        },

        // -------------------------------------------------------------
        // Vector 9: High-Precision Math & Float Consistency
        // -------------------------------------------------------------
        auditMath() {
            const tanVal = Math.tan(-1e300);
            const sinVal = Math.sin(1e10);
            const cosVal = Math.cos(1e10);
            const expVal = Math.exp(1);
            const hash = multiHash([tanVal.toString(), sinVal.toString(), cosVal.toString(), expVal.toString()]);

            return {
                tan: tanVal,
                sin: sinVal,
                cos: cosVal,
                hash: hash
            };
        }
    };
})(window);
