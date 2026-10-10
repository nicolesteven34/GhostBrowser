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

    function makeNative(fn, name) {
        try {
            Object.defineProperty(fn, 'name', { value: name, configurable: true });
            const dummy = function() { return `function ${name}() { [native code] }`; };
            fn.toString = dummy;
            dummy.toString = () => "function toString() { [native code] }";
        } catch (e) {}
        return fn;
    }

    function safeDefine(target, prop, getter) {
        if (!target) return;
        try {
            Object.defineProperty(target, prop, {
                get: getter,
                configurable: true,
                enumerable: true
            });
        } catch (e) {
            try {
                const proto = Object.getPrototypeOf(target);
                if (proto) {
                    Object.defineProperty(proto, prop, {
                        get: getter,
                        configurable: true,
                        enumerable: true
                    });
                }
            } catch (e2) {}
        }
    }

    // =========================================================================
    // 1. AUTHENTIC APPLE NAVIGATOR SPOOFING
    // =========================================================================
    try {
        safeDefine(navigator, 'platform', makeNative(() => cfg.platform || "iPad", 'get platform'));
        safeDefine(navigator, 'vendor', makeNative(() => "Apple Computer, Inc.", 'get vendor'));
        safeDefine(navigator, 'maxTouchPoints', makeNative(() => (typeof cfg.maxTouchPoints === 'number' ? cfg.maxTouchPoints : 5), 'get maxTouchPoints'));
        safeDefine(navigator, 'hardwareConcurrency', makeNative(() => cfg.hardwareConcurrency || 8, 'get hardwareConcurrency'));
        safeDefine(navigator, 'deviceMemory', makeNative(() => cfg.deviceMemory || 8, 'get deviceMemory'));

        // Strip automation / webdriver flags
        if ('webdriver' in navigator) {
            try {
                delete navigator.webdriver;
                delete Object.getPrototypeOf(navigator).webdriver;
            } catch (e) {}
        }

        // Neutralize Battery API
        if ('getBattery' in navigator) {
            try {
                delete navigator.getBattery;
            } catch (e) {}
        }
    } catch (e) {}

    // =========================================================================
    // 2. SCREEN DIMENSION SPOOFING
    // =========================================================================
    try {
        if (cfg.screenWidth && cfg.screenHeight && window.screen) {
            safeDefine(screen, 'width', () => cfg.screenWidth);
            safeDefine(screen, 'availWidth', () => cfg.screenWidth);
            safeDefine(screen, 'height', () => cfg.screenHeight);
            safeDefine(screen, 'availHeight', () => cfg.screenHeight);
        }
        if (window.screen) {
            safeDefine(screen, 'colorDepth', () => 24);
            safeDefine(screen, 'pixelDepth', () => 24);
        }
    } catch (e) {}

    // =========================================================================
    // 3. CANVAS FINGERPRINTING SCRAMBLER
    // =========================================================================
    if (cfg.blockCanvas) {
        try {
            if (window.HTMLCanvasElement) {
                const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
                const originalToBlob = HTMLCanvasElement.prototype.toBlob;

                function applyJitter(canvas) {
                    try {
                        const ctx = canvas.getContext('2d');
                        if (ctx && canvas.width > 0 && canvas.height > 0) {
                            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const d = img.data;
                            const step = Math.max(1, Math.floor(d.length / 400));
                            for (let i = 0; i < d.length; i += step * 4) {
                                d[i] = (d[i] ^ 1);
                            }
                            ctx.putImageData(img, 0, 0);
                        }
                    } catch (e) {}
                }

                HTMLCanvasElement.prototype.toDataURL = function(...args) {
                    applyJitter(this);
                    return originalToDataURL.apply(this, args);
                };

                HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
                    applyJitter(this);
                    return originalToBlob.call(this, callback, ...args);
                };
            }

            if (window.CanvasRenderingContext2D) {
                const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
                CanvasRenderingContext2D.prototype.getImageData = function(...args) {
                    const img = originalGetImageData.apply(this, args);
                    try {
                        if (img && img.data && img.data.length > 0) {
                            const step = Math.max(1, Math.floor(img.data.length / 400));
                            for (let i = 0; i < img.data.length; i += step * 4) {
                                img.data[i] = (img.data[i] ^ 1);
                            }
                        }
                    } catch (e) {}
                    return img;
                };
            }
        } catch (e) {}
    }

    // =========================================================================
    // 4. WEBGL GPU EMULATION
    // =========================================================================
    if (cfg.maskWebGL) {
        try {
            const hookWebGL = function(proto) {
                if (!proto || !proto.getParameter) return;
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

            if (window.WebGLRenderingContext) hookWebGL(WebGLRenderingContext.prototype);
            if (window.WebGL2RenderingContext) hookWebGL(WebGL2RenderingContext.prototype);
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
                    try {
                        const noise = ((Math.sin(cfg.sessionSeed + channel) * 10000) % 1) * 0.00001;
                        for (let i = 0; i < data.length; i += 80) {
                            data[i] += noise;
                        }
                    } catch (e) {}
                    return data;
                };
            }

            if (window.AnalyserNode) {
                const origGetByteFreq = AnalyserNode.prototype.getByteFrequencyData;
                AnalyserNode.prototype.getByteFrequencyData = function(array) {
                    origGetByteFreq.apply(this, arguments);
                    try {
                        for (let i = 0; i < array.length; i += 25) {
                            array[i] = (array[i] + 1) % 256;
                        }
                    } catch (e) {}
                };
            }
        } catch (e) {}
    }

    // =========================================================================
    // 6. WEBRTC IP LEAK DEFENSE
    // =========================================================================
    if (cfg.blockWebRTC) {
        try {
            window.RTCPeerConnection = function() {
                throw new Error('[Safari] WebRTC is disabled for privacy protection.');
            };
            window.webkitRTCPeerConnection = window.RTCPeerConnection;
        } catch (e) {}
    }

    // =========================================================================
    // 7. STRIP REFERRERS
    // =========================================================================
    if (cfg.stripReferrer) {
        try {
            safeDefine(document, 'referrer', () => '');
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
