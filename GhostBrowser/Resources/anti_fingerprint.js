/**
 * GhostBrowser Stealth Engine
 * Injected at document_start in all frames before any website scripts run.
 * Emulates authentic Apple hardware signatures and neutralizes fingerprinting vectors.
 */
(function() {
    'use strict';

    const cfg = window.__GHOST_CONFIG__ || {
        userAgent: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        platform: "iPad",
        maxTouchPoints: 10,
        hardwareConcurrency: 10,
        deviceMemory: 16,
        webglVendor: "Apple Inc.",
        webglRenderer: "Apple M4",
        screenWidth: 1024,
        screenHeight: 1366,
        blockCanvas: true,
        blockAudio: true,
        maskWebGL: true,
        blockWebRTC: true,
        stripReferrer: true,
        shieldSensors: true,
        sessionSeed: Math.random()
    };

    // Helper: Make functions appear native to anti-spoofing tests
    const nativeToString = Function.prototype.toString;
    function makeNative(fn, name) {
        Object.defineProperty(fn, 'name', { value: name, configurable: true });
        const dummy = function() { return `function ${name}() { [native code] }`; };
        fn.toString = dummy;
        dummy.toString = () => "function toString() { [native code] }";
        return fn;
    }

    // =========================================================================
    // 1. AUTHENTIC APPLE NAVIGATOR SPOOFING
    // =========================================================================
    try {
        const navProto = Object.getPrototypeOf(navigator);

        // Platform
        Object.defineProperty(navigator, 'platform', {
            get: makeNative(() => cfg.platform, 'get platform'),
            configurable: true,
            enumerable: true
        });

        // Vendor (Always Apple Computer, Inc. on authentic Apple devices)
        Object.defineProperty(navigator, 'vendor', {
            get: makeNative(() => "Apple Computer, Inc.", 'get vendor'),
            configurable: true,
            enumerable: true
        });

        // Touch points (Realistic: 10 for iPad, 5 for iPhone, 0 for Mac)
        Object.defineProperty(navigator, 'maxTouchPoints', {
            get: makeNative(() => cfg.maxTouchPoints, 'get maxTouchPoints'),
            configurable: true,
            enumerable: true
        });

        // CPU Cores & RAM
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: makeNative(() => cfg.hardwareConcurrency, 'get hardwareConcurrency'),
            configurable: true,
            enumerable: true
        });

        Object.defineProperty(navigator, 'deviceMemory', {
            get: makeNative(() => cfg.deviceMemory, 'get deviceMemory'),
            configurable: true,
            enumerable: true
        });

        // Ensure automation/webdriver flags are completely absent
        if ('webdriver' in navigator) {
            delete Object.getPrototypeOf(navigator).webdriver;
        }

        // Neutralize Battery API
        if ('getBattery' in navigator) {
            delete navigator.getBattery;
        }
    } catch (e) {
        // Fallback
    }

    // =========================================================================
    // 2. SCREEN DIMENSION SPOOFING
    // Matches the selected Apple device's physical viewport
    // =========================================================================
    try {
        if (cfg.screenWidth && cfg.screenHeight) {
            Object.defineProperty(screen, 'width', { get: () => cfg.screenWidth, configurable: true });
            Object.defineProperty(screen, 'availWidth', { get: () => cfg.screenWidth, configurable: true });
            Object.defineProperty(screen, 'height', { get: () => cfg.screenHeight, configurable: true });
            Object.defineProperty(screen, 'availHeight', { get: () => cfg.screenHeight, configurable: true });
        }
        Object.defineProperty(screen, 'colorDepth', { get: () => 24, configurable: true });
        Object.defineProperty(screen, 'pixelDepth', { get: () => 24, configurable: true });
    } catch (e) {
        // Ignore
    }

    // =========================================================================
    // 3. CANVAS FINGERPRINTING SCRAMBLER
    // Adds imperceptible micro-variations so hash generation cannot track you
    // =========================================================================
    if (cfg.blockCanvas) {
        try {
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            const originalToBlob = HTMLCanvasElement.prototype.toBlob;
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

            function applyMicroJitter(ctx, width, height) {
                try {
                    const img = originalGetImageData.call(ctx, 0, 0, width, height);
                    const d = img.data;
                    const step = Math.max(1, Math.floor(d.length / 400));
                    for (let i = 0; i < d.length; i += step * 4) {
                        d[i] = (d[i] ^ 1);
                    }
                    ctx.putImageData(img, 0, 0);
                } catch (err) {}
            }

            HTMLCanvasElement.prototype.toDataURL = function(...args) {
                if (this.width > 0 && this.height > 0) {
                    const ctx = this.getContext('2d');
                    if (ctx) applyMicroJitter(ctx, this.width, this.height);
                }
                return originalToDataURL.apply(this, args);
            };

            HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
                if (this.width > 0 && this.height > 0) {
                    const ctx = this.getContext('2d');
                    if (ctx) applyMicroJitter(ctx, this.width, this.height);
                }
                return originalToBlob.call(this, callback, ...args);
            };

            CanvasRenderingContext2D.prototype.getImageData = function(...args) {
                const img = originalGetImageData.apply(this, args);
                if (img && img.data && img.data.length > 0) {
                    const step = Math.max(1, Math.floor(img.data.length / 400));
                    for (let i = 0; i < img.data.length; i += step * 4) {
                        img.data[i] = (img.data[i] ^ 1);
                    }
                }
                return img;
            };
        } catch (e) {}
    }

    // =========================================================================
    // 4. WEBGL GPU EMULATION
    // Returns authentic Apple Silicon GPU signatures
    // =========================================================================
    if (cfg.maskWebGL) {
        try {
            const hookWebGL = function(proto) {
                if (!proto) return;
                const origGetParameter = proto.getParameter;
                proto.getParameter = function(parameter) {
                    // UNMASKED_VENDOR_WEBGL (0x9245)
                    if (parameter === 37445) {
                        return cfg.webglVendor || "Apple Inc.";
                    }
                    // UNMASKED_RENDERER_WEBGL (0x9246)
                    if (parameter === 37446) {
                        return cfg.webglRenderer || "Apple GPU";
                    }
                    return origGetParameter.apply(this, arguments);
                };
                makeNative(proto.getParameter, 'getParameter');
            };

            if (window.WebGLRenderingContext) hookWebGL(window.WebGLRenderingContext.prototype);
            if (window.WebGL2RenderingContext) hookWebGL(window.WebGL2RenderingContext.prototype);
        } catch (e) {}
    }

    // =========================================================================
    // 5. AUDIOCONTEXT ACOUSTIC FINGERPRINT JITTER
    // =========================================================================
    if (cfg.blockAudio) {
        try {
            if (window.AudioBuffer) {
                const origGetChannelData = AudioBuffer.prototype.getChannelData;
                AudioBuffer.prototype.getChannelData = function(channel) {
                    const data = origGetChannelData.apply(this, arguments);
                    const noise = ((Math.sin(cfg.sessionSeed + channel) * 10000) % 1) * 0.00001;
                    for (let i = 0; i < data.length; i += 80) {
                        data[i] += noise;
                    }
                    return data;
                };
            }

            if (window.AnalyserNode) {
                const origGetByteFreq = AnalyserNode.prototype.getByteFrequencyData;
                AnalyserNode.prototype.getByteFrequencyData = function(array) {
                    origGetByteFreq.apply(this, arguments);
                    for (let i = 0; i < array.length; i += 25) {
                        array[i] = (array[i] + 1) % 256;
                    }
                };
            }
        } catch (e) {}
    }

    // =========================================================================
    // 6. WEBRTC IP LEAK DEFENSE
    // Eliminates local IP and VPN bypass disclosures
    // =========================================================================
    if (cfg.blockWebRTC) {
        try {
            window.RTCPeerConnection = function() {
                throw new Error('[Safari] WebRTC is disabled for privacy protection.');
            };
            window.webkitRTCPeerConnection = window.RTCPeerConnection;
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia = function() {
                    return Promise.reject(new Error('[Safari] Permission denied by privacy policy.'));
                };
            }
        } catch (e) {}
    }

    // =========================================================================
    // 7. STRIP REFERRERS
    // =========================================================================
    if (cfg.stripReferrer) {
        try {
            Object.defineProperty(document, 'referrer', {
                get: () => '',
                configurable: true
            });
        } catch (e) {}
    }

    // =========================================================================
    // 8. SHIELD SENSORS
    // =========================================================================
    if (cfg.shieldSensors) {
        try {
            window.addEventListener('deviceorientation', e => e.stopImmediatePropagation(), true);
            window.addEventListener('devicemotion', e => e.stopImmediatePropagation(), true);
        } catch (e) {}
    }
})();
