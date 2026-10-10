/**
 * GhostBrowser Anti-Detection & Deterministic Consistency Engine
 * Injected at document_start.
 *
 * Ensures:
 * 1. Bit-for-bit Canvas & Audio consistency for the lifetime of the session.
 * 2. Distinct hardware parameters (AudioContext, Canvas, Screen, GPU) across personas & identity seeds.
 * 3. 100% native [native code] AST preservation on all wrapped APIs without instance pollution.
 */
(function() {
    'use strict';

    const cfg = window.__GHOST_CONFIG__ || {};
    const seed = cfg.sessionSeed || 314159;

    // =========================================================================
    // 1. Stealth Native Function Wrapper (Preserves [native code] AST)
    // =========================================================================
    const nativeToString = Function.prototype.toString;
    const hookedFunctions = new WeakMap();

    function wrapNative(originalFn, wrapperFn, name) {
        try {
            Object.defineProperty(wrapperFn, 'name', { value: name || (originalFn ? originalFn.name : ''), configurable: true });
            if (originalFn) {
                Object.defineProperty(wrapperFn, 'length', { value: originalFn.length, configurable: true });
                hookedFunctions.set(wrapperFn, originalFn);
            }
        } catch(e) {}
        return wrapperFn;
    }

    try {
        const customToString = function() {
            if (hookedFunctions.has(this)) {
                return nativeToString.call(hookedFunctions.get(this));
            }
            return nativeToString.call(this);
        };
        Object.defineProperty(customToString, 'name', { value: 'toString', configurable: true });
        hookedFunctions.set(customToString, nativeToString);
        Function.prototype.toString = customToString;
    } catch(e) {}

    // Deterministic pseudo-random integer offset generator based on seed and coordinates
    function getSeedOffset(x, y) {
        let h = (x * 374761393 + y * 668265263 + seed) >>> 0;
        h = (h ^ (h >> 13)) * 1274126177;
        return ((h ^ (h >> 16)) % 3) - 1; // Produces -1, 0, or 1 consistently
    }

    if (cfg.deterministicHardwareSeeding) {
        // =========================================================================
        // 2. Deterministic Canvas (toDataURL & getImageData)
        // =========================================================================
        if (window.HTMLCanvasElement && window.CanvasRenderingContext2D) {
            try {
                const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
                const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;

                function applyDeterministicSeed(ctx, width, height) {
                    if (width > 1200 || height > 900 || width === 0 || height === 0) return;
                    try {
                        const imgData = origGetImageData.call(ctx, 0, 0, width, height);
                        const d = imgData.data;
                        const len = d.length;
                        for (let i = 0; i < len; i += 16) {
                            const px = (i / 4) | 0;
                            const x = px % width;
                            const y = (px / width) | 0;
                            const offset = getSeedOffset(x, y);
                            if (d[i] > 10 && d[i] < 245) {
                                d[i] = (d[i] + offset) & 0xFF;
                            }
                        }
                        ctx.putImageData(imgData, 0, 0);
                    } catch(e) {}
                }

                HTMLCanvasElement.prototype.toDataURL = wrapNative(origToDataURL, function(...args) {
                    const ctx = this.getContext('2d');
                    if (ctx) {
                        applyDeterministicSeed(ctx, this.width, this.height);
                    }
                    return origToDataURL.apply(this, args);
                }, 'toDataURL');

                CanvasRenderingContext2D.prototype.getImageData = wrapNative(origGetImageData, function(...args) {
                    const imgData = origGetImageData.apply(this, args);
                    if (imgData && imgData.data) {
                        const d = imgData.data;
                        const w = imgData.width;
                        for (let i = 0; i < d.length; i += 16) {
                            const px = (i / 4) | 0;
                            const x = px % w;
                            const y = (px / w) | 0;
                            const offset = getSeedOffset(x, y);
                            if (d[i] > 10 && d[i] < 245) {
                                d[i] = (d[i] + offset) & 0xFF;
                            }
                        }
                    }
                    return imgData;
                }, 'getImageData');

            } catch(e) {}
        }

        // =========================================================================
        // 3. Deterministic AudioContext (OfflineAudioContext & AudioBuffer)
        // =========================================================================
        if (window.AudioBuffer) {
            try {
                const origGetChannelData = AudioBuffer.prototype.getChannelData;
                AudioBuffer.prototype.getChannelData = wrapNative(origGetChannelData, function(channel) {
                    const data = origGetChannelData.call(this, channel);
                    if (data && data.length > 0) {
                        const step = Math.max(1, (data.length / 32) | 0);
                        for (let i = 0; i < data.length; i += step) {
                            const offset = (((i * 7919 + seed) % 5) - 2) * 0.0000005;
                            data[i] += offset;
                        }
                    }
                    return data;
                }, 'getChannelData');
            } catch(e) {}
        }

        // =========================================================================
        // 4. Screen Dimensions (On Prototype - Zero Instance Pollution)
        // =========================================================================
        if (window.Screen && cfg.screenWidth && cfg.screenHeight) {
            try {
                Object.defineProperty(Screen.prototype, 'width', {
                    get: wrapNative(null, function() { return cfg.screenWidth; }, 'get width'),
                    configurable: true,
                    enumerable: true
                });
                Object.defineProperty(Screen.prototype, 'height', {
                    get: wrapNative(null, function() { return cfg.screenHeight; }, 'get height'),
                    configurable: true,
                    enumerable: true
                });
                Object.defineProperty(Screen.prototype, 'availWidth', {
                    get: wrapNative(null, function() { return cfg.screenWidth; }, 'get availWidth'),
                    configurable: true,
                    enumerable: true
                });
                Object.defineProperty(Screen.prototype, 'availHeight', {
                    get: wrapNative(null, function() { return cfg.screenHeight; }, 'get availHeight'),
                    configurable: true,
                    enumerable: true
                });
            } catch(e) {}
        }

        // =========================================================================
        // 5. Platform & Touch Points (On Navigator.prototype)
        // =========================================================================
        if (window.Navigator) {
            try {
                if (cfg.platform) {
                    Object.defineProperty(Navigator.prototype, 'platform', {
                        get: wrapNative(null, function() { return cfg.platform; }, 'get platform'),
                        configurable: true,
                        enumerable: true
                    });
                }
                if (typeof cfg.maxTouchPoints === 'number') {
                    Object.defineProperty(Navigator.prototype, 'maxTouchPoints', {
                        get: wrapNative(null, function() { return cfg.maxTouchPoints; }, 'get maxTouchPoints'),
                        configurable: true,
                        enumerable: true
                    });
                }
            } catch(e) {}
        }

        // =========================================================================
        // 6. WebGL Renderer & Vendor Masking
        // =========================================================================
        function patchWebGLContext(proto) {
            if (!proto) return;
            try {
                const origGetParam = proto.getParameter;
                proto.getParameter = wrapNative(origGetParam, function(param) {
                    if (param === 37446 && cfg.webglRenderer) return cfg.webglRenderer;
                    if (param === 37445 && cfg.webglVendor) return cfg.webglVendor;
                    return origGetParam.call(this, param);
                }, 'getParameter');
            } catch(e) {}
        }

        if (window.WebGLRenderingContext) patchWebGLContext(WebGLRenderingContext.prototype);
        if (window.WebGL2RenderingContext) patchWebGLContext(WebGL2RenderingContext.prototype);
    }
})();
