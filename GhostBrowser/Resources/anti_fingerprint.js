/**
 * GhostBrowser Anti-Detection & Deterministic Consistency Engine
 * Injected at document_start.
 *
 * Ensures:
 * 1. 100% Bit-for-bit Canvas & Audio consistency (hash1 === hash2) across multiple calls.
 * 2. Distinct hardware parameters across personas and identity seeds.
 * 3. WeakMap/WeakSet-backed native function preservation (zero instance pollution).
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

    // Deterministic pseudo-random integer offset based on seed and coordinates
    function getSeedOffset(x, y) {
        let h = (x * 374761393 + y * 668265263 + seed) >>> 0;
        h = (h ^ (h >> 13)) * 1274126177;
        return ((h ^ (h >> 16)) % 3) - 1; // Produces -1, 0, or 1 consistently
    }

    if (cfg.deterministicHardwareSeeding) {
        // =========================================================================
        // 2. Deterministic Canvas (toDataURL & getImageData with Single-Seed Guard)
        // =========================================================================
        if (window.HTMLCanvasElement && window.CanvasRenderingContext2D) {
            try {
                const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
                const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
                const origPutImageData = CanvasRenderingContext2D.prototype.putImageData;
                const seededCanvases = new WeakSet();

                function applyDeterministicCanvasSeed(canvas, ctx, width, height) {
                    if (!canvas || seededCanvases.has(canvas)) return;
                    seededCanvases.add(canvas); // GUARD: Seed once so hash1 === hash2 always

                    if (width > 1200 || height > 900 || width === 0 || height === 0) return;
                    try {
                        const imgData = origGetImageData.call(ctx, 0, 0, width, height);
                        const d = imgData.data;
                        for (let i = 0; i < d.length; i += 16) {
                            const px = (i / 4) | 0;
                            const x = px % width;
                            const y = (px / width) | 0;
                            const offset = getSeedOffset(x, y);
                            if (d[i] > 10 && d[i] < 245) {
                                d[i] = (d[i] + offset) & 0xFF;
                            }
                        }
                        origPutImageData.call(ctx, imgData, 0, 0);
                    } catch(e) {}
                }

                HTMLCanvasElement.prototype.toDataURL = wrapNative(origToDataURL, function(...args) {
                    const ctx = this.getContext('2d');
                    if (ctx) {
                        applyDeterministicCanvasSeed(this, ctx, this.width, this.height);
                    }
                    return origToDataURL.apply(this, args);
                }, 'toDataURL');

                CanvasRenderingContext2D.prototype.getImageData = wrapNative(origGetImageData, function(sx, sy, sw, sh) {
                    const canvas = this.canvas;
                    if (canvas && !seededCanvases.has(canvas)) {
                        applyDeterministicCanvasSeed(canvas, this, canvas.width, canvas.height);
                    }
                    return origGetImageData.call(this, sx, sy, sw, sh);
                }, 'getImageData');

            } catch(e) {}
        }

        // =========================================================================
        // 3. Deterministic AudioContext (Single-Seed Guard)
        // =========================================================================
        if (window.AudioBuffer) {
            try {
                const origGetChannelData = AudioBuffer.prototype.getChannelData;
                const seededAudioBuffers = new WeakSet();

                AudioBuffer.prototype.getChannelData = wrapNative(origGetChannelData, function(channel) {
                    const data = origGetChannelData.call(this, channel);
                    if (data && data.length > 0 && !seededAudioBuffers.has(this)) {
                        seededAudioBuffers.add(this); // GUARD: Seed once so audio buffer stays bit-consistent
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
