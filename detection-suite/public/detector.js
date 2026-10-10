/**
 * Ghost Detection Suite - Client-Side Deep Inspection Engine
 * Executes comprehensive multi-vector audits across Prototype Integrity,
 * WebRTC IP Leaks, Canvas Stability, WebGL Hardware, and Storage Quotas.
 */

window.GhostDetector = {
    async runAllTests() {
        const results = {
            prototypeTampered: false,
            prototypeTamperDetail: null,
            webrtcLeak: false,
            leakedIPs: [],
            canvasInconsistency: false,
            screenInconsistency: false,
            screenDetail: null,
            incognitoDetected: false,
            webglVendor: 'Unknown',
            webglRenderer: 'Unknown',
            clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            tests: {}
        };

        // 1. Prototype Integrity & Lie Detection
        results.tests.prototypes = this.testPrototypes();
        if (!results.tests.prototypes.passed) {
            results.prototypeTampered = true;
            results.prototypeTamperDetail = results.tests.prototypes.issues.join('; ');
        }

        // 2. Canvas Rasterization & Hash Stability
        results.tests.canvas = this.testCanvas();
        if (!results.tests.canvas.passed) {
            results.canvasInconsistency = true;
        }

        // 3. WebGL Extraction & Checks
        results.tests.webgl = this.testWebGL();
        results.webglVendor = results.tests.webgl.vendor;
        results.webglRenderer = results.tests.webgl.renderer;

        // 4. Screen & Viewport Consistency
        results.tests.screen = this.testScreen();
        if (!results.tests.screen.passed) {
            results.screenInconsistency = true;
            results.screenDetail = results.tests.screen.issues.join('; ');
        }

        // 5. Incognito / Storage Inspection
        results.tests.storage = await this.testStorage();
        if (results.tests.storage.isIncognito) {
            results.incognitoDetected = true;
        }

        // 6. WebRTC STUN Leak Test
        results.tests.webrtc = await this.testWebRTC();
        if (results.tests.webrtc.leakedIPs.length > 0) {
            results.webrtcLeak = true;
            results.leakedIPs = results.tests.webrtc.leakedIPs;
        }

        return results;
    },

    // -------------------------------------------------------------
    // Test 1: Native Prototype Integrity & Anti-Tamper Check
    // -------------------------------------------------------------
    testPrototypes() {
        const issues = [];
        const nativeToString = Function.prototype.toString;

        function checkNative(fn, expectedName) {
            if (!fn) return true;
            try {
                const str = nativeToString.call(fn);
                // Must strictly match native code format
                const regex = new RegExp(`^function\\s*${expectedName || ''}\\s*\\(\\s*\\)\\s*\\{\\s*\\[native code\\]\\s*\\}$`);
                if (!regex.test(str)) {
                    issues.push(`${expectedName || 'Function'} toString returned non-native code: "${str.substring(0, 40)}..."`);
                    return false;
                }
            } catch (e) {
                issues.push(`Failed calling native toString on ${expectedName}: ${e.message}`);
                return false;
            }
            return true;
        }

        // Audit Canvas methods
        if (window.HTMLCanvasElement) {
            checkNative(HTMLCanvasElement.prototype.toDataURL, 'toDataURL');
            checkNative(HTMLCanvasElement.prototype.toBlob, 'toBlob');
        }
        if (window.CanvasRenderingContext2D) {
            checkNative(CanvasRenderingContext2D.prototype.getImageData, 'getImageData');
        }

        // Audit WebGL methods
        if (window.WebGLRenderingContext) {
            checkNative(WebGLRenderingContext.prototype.getParameter, 'getParameter');
        }

        // Audit Audio methods
        if (window.AudioBuffer) {
            checkNative(AudioBuffer.prototype.getChannelData, 'getChannelData');
        }

        // Audit Navigator prototype (No own properties should exist on the navigator instance)
        const ownNavProps = Object.getOwnPropertyNames(navigator);
        const forbiddenOwnProps = ['platform', 'vendor', 'hardwareConcurrency', 'deviceMemory', 'userAgent'];
        const foundOwnProps = ownNavProps.filter(p => forbiddenOwnProps.includes(p));
        if (foundOwnProps.length > 0) {
            issues.push(`Navigator instance has modified own properties: [${foundOwnProps.join(', ')}] (Expected on prototype only)`);
        }

        return {
            passed: issues.length === 0,
            issues: issues
        };
    },

    // -------------------------------------------------------------
    // Test 2: Canvas Rasterization Stability
    // -------------------------------------------------------------
    testCanvas() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 240;
            canvas.height = 60;
            const ctx = canvas.getContext('2d');
            if (!ctx) return { passed: true, note: 'Canvas 2D unavailable' };

            // Render complex elements
            ctx.fillStyle = '#0A84FF';
            ctx.fillRect(10, 10, 80, 40);
            ctx.fillStyle = '#FF3B30';
            ctx.font = '16px -apple-system, sans-serif';
            ctx.fillText('GhostDetect 🔒 123', 20, 35);
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;

            // Sequential reads: In genuine browsers, outputs are 100% deterministic
            const hash1 = canvas.toDataURL();
            const hash2 = canvas.toDataURL();
            const hash3 = canvas.toDataURL();

            if (hash1 !== hash2 || hash2 !== hash3) {
                return {
                    passed: false,
                    note: 'Canvas output changed across repeated reads (Artificial Noise Jitter detected)'
                };
            }

            return {
                passed: true,
                hash: hash1.substring(0, 32) + '...',
                note: 'Canvas rasterization output is stable and deterministic'
            };
        } catch (e) {
            return { passed: true, note: 'Canvas test skipped: ' + e.message };
        }
    },

    // -------------------------------------------------------------
    // Test 3: WebGL Hardware Inspection
    // -------------------------------------------------------------
    testWebGL() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return { vendor: 'Unavailable', renderer: 'Unavailable' };

            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (ext) {
                const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
                const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
                return {
                    vendor: vendor || 'Unknown',
                    renderer: renderer || 'Unknown'
                };
            }
            return {
                vendor: gl.getParameter(gl.VENDOR) || 'Generic',
                renderer: gl.getParameter(gl.RENDERER) || 'Generic'
            };
        } catch (e) {
            return { vendor: 'Error', renderer: e.message };
        }
    },

    // -------------------------------------------------------------
    // Test 4: Screen & Viewport Consistency
    // -------------------------------------------------------------
    testScreen() {
        const issues = [];
        const width = screen.width;
        const height = screen.height;
        const availWidth = screen.availWidth;
        const availHeight = screen.availHeight;

        if (availWidth > width || availHeight > height) {
            issues.push(`Available screen size (${availWidth}x${availHeight}) exceeds total screen (${width}x${height})`);
        }

        // Touch points consistency with platform
        const touchPoints = navigator.maxTouchPoints || 0;
        const platform = navigator.platform || '';
        if (platform === 'MacIntel' && touchPoints > 0) {
            // Note: Macs with iPad apps in Catalyst can have touch, but desktop Safari on Mac has 0
        }
        if ((platform === 'iPad' || platform === 'iPhone') && touchPoints === 0) {
            issues.push(`Platform is ${platform} but reports 0 touch points`);
        }

        return {
            passed: issues.length === 0,
            screen: `${width} x ${height}`,
            avail: `${availWidth} x ${availHeight}`,
            devicePixelRatio: window.devicePixelRatio || 1,
            touchPoints: touchPoints,
            issues: issues
        };
    },

    // -------------------------------------------------------------
    // Test 5: Storage & Incognito Detection
    // -------------------------------------------------------------
    async testStorage() {
        let isIncognito = false;
        let quotaMB = 'Unknown';

        // Check Storage Estimate
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                const quota = estimate.quota || 0;
                quotaMB = (quota / (1024 * 1024)).toFixed(0) + ' MB';
                // Very small quota on Chromium usually indicates private mode
                if (quota > 0 && quota < 120 * 1024 * 1024) {
                    isIncognito = true;
                }
            } catch (e) {}
        }

        return {
            isIncognito: isIncognito,
            quota: quotaMB
        };
    },

    // -------------------------------------------------------------
    // Test 6: WebRTC STUN Interface Leak Detection
    // -------------------------------------------------------------
    testWebRTC() {
        return new Promise((resolve) => {
            const leakedIPs = [];
            const RTC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
            if (!RTC) {
                resolve({ leakedIPs: [], status: 'WebRTC API Unavailable / Disabled' });
                return;
            }

            try {
                const pc = new RTC({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });

                pc.createDataChannel('');
                pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {});

                pc.onicecandidate = (event) => {
                    if (event && event.candidate && event.candidate.candidate) {
                        const line = event.candidate.candidate;
                        const match = line.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/);
                        if (match && match[1]) {
                            const ip = match[1];
                            if (!leakedIPs.includes(ip) && !ip.startsWith('0.0.0.0')) {
                                leakedIPs.push(ip);
                            }
                        }
                    }
                };

                // Wait 1.5s for candidate gathering
                setTimeout(() => {
                    try { pc.close(); } catch (e) {}
                    resolve({
                        leakedIPs: leakedIPs,
                        status: leakedIPs.length > 0 ? 'Leaking Candidates' : 'No WebRTC Candidates Leaked'
                    });
                }, 1500);
            } catch (e) {
                resolve({ leakedIPs: [], status: 'Blocked or Errored: ' + e.message });
            }
        });
    }
};
