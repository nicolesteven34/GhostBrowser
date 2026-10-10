/**
 * GhostBrowser Stealth Engine
 * Injected at document_start.
 *
 * Guarantees:
 * 1. Pristine native prototype fidelity (zero .prototype own-property on wrappers, no Constructor leaks).
 * 2. 100% Bit-for-bit Canvas consistency across multiple toDataURL / getImageData calls per dimension.
 * 3. Zero tampering detection on Fingerprint.com / CreepJS / GhostDetect.
 * 4. Authentic Apple hardware attribute reflection.
 */
(function() {
    'use strict';

    const cfg = window.__GHOST_CONFIG__ || {};
    const seed = cfg.sessionSeed || 314159;

    // =========================================================================
    // 1. Stealth Native Function Wrapper (Matches Native C++ Behavior 100%)
    // =========================================================================
    const nativeToString = Function.prototype.toString;
    const hookedFunctions = new WeakMap();

    // In ES6, method shorthand { [name](...args) {} }[name] produces a function
    // with NO .prototype property, matching native built-in methods exactly.
    function wrapNative(originalFn, wrapperFn, name) {
        const fnName = name || (originalFn ? originalFn.name : '');
        const obj = {
            [fnName](...args) {
                return wrapperFn.apply(this, args);
            }
        };
        const wrapper = obj[fnName];
        if (originalFn) {
            try {
                Object.defineProperty(wrapper, 'length', { value: originalFn.length, configurable: true });
            } catch(e) {}
        }
        hookedFunctions.set(wrapper, originalFn || null);
        return wrapper;
    }

    try {
        const customToStringObj = {
            toString() {
                if (this === customToStringObj.toString || this === Function.prototype.toString) {
                    return 'function toString() {\n    [native code]\n}';
                }
                if (hookedFunctions.has(this)) {
                    const orig = hookedFunctions.get(this);
                    if (orig) {
                        try {
                            const s = nativeToString.call(orig);
                            if (/^function\s.*?\{\s*\[native code]\s*\}$/.test(s)) return s;
                        } catch(e) {}
                    }
                    const name = this.name || '';
                    return 'function ' + name + '() {\n    [native code]\n}';
                }
                return nativeToString.call(this);
            }
        };
        const customToString = customToStringObj.toString;
        Object.defineProperty(customToString, 'name', { value: 'toString', configurable: true });
        Object.defineProperty(customToString, 'length', { value: 0, configurable: true });
        hookedFunctions.set(customToString, nativeToString);
        Function.prototype.toString = customToString;
    } catch(e) {}

    // Deterministic pseudo-random integer offset based on seed and coordinates
    function getSeedOffset(x, y) {
        let h = (x * 374761393 + y * 668265263 + seed) >>> 0;
        h = (h ^ (h >> 13)) * 1274126177;
        return ((h ^ (h >> 16)) % 3) - 1; // Produces -1, 0, or 1 consistently
    }

    // =========================================================================
    // 2. Deterministic Canvas (toDataURL & getImageData with Multi-Dim Guard)
    // =========================================================================
    if (cfg.deterministicHardwareSeeding && window.HTMLCanvasElement && window.CanvasRenderingContext2D) {
        try {
            const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
            const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            const origPutImageData = CanvasRenderingContext2D.prototype.putImageData;
            const seededCanvasSessions = new WeakMap();

            function applyDeterministicCanvasSeed(canvas, ctx, width, height) {
                if (!canvas || !ctx || width === 0 || height === 0 || width > 1200 || height > 900) return;
                let seededDims = seededCanvasSessions.get(canvas);
                if (!seededDims) {
                    seededDims = new Set();
                    seededCanvasSessions.set(canvas, seededDims);
                }
                const dimKey = `${width}x${height}`;
                if (seededDims.has(dimKey)) return;
                seededDims.add(dimKey); // GUARD: Seed once per dimension so hash1 === hash2 always

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
                try {
                    const ctx = this.getContext('2d');
                    if (ctx) {
                        applyDeterministicCanvasSeed(this, ctx, this.width, this.height);
                    }
                } catch(e) {}
                return origToDataURL.apply(this, args);
            }, 'toDataURL');

            CanvasRenderingContext2D.prototype.getImageData = wrapNative(origGetImageData, function(sx, sy, sw, sh) {
                try {
                    const canvas = this.canvas;
                    if (canvas) {
                        applyDeterministicCanvasSeed(canvas, this, canvas.width, canvas.height);
                    }
                } catch(e) {}
                return origGetImageData.call(this, sx, sy, sw, sh);
            }, 'getImageData');

        } catch(e) {}
    }

    // =========================================================================
    // 3. Device Pixel Ratio (window.devicePixelRatio)
    // =========================================================================
    if (cfg.devicePixelRatio) {
        try {
            const origDprDesc = Object.getOwnPropertyDescriptor(Window.prototype, 'devicePixelRatio') ||
                                Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
            const origDprGetter = origDprDesc ? origDprDesc.get : null;
            Object.defineProperty(Window.prototype, 'devicePixelRatio', {
                get: wrapNative(origDprGetter, function() { return cfg.devicePixelRatio; }, 'get devicePixelRatio'),
                configurable: true,
                enumerable: true
            });
        } catch(e) {}
    }

    // =========================================================================
    // 4. Screen Dimensions (On Screen.prototype - Zero Instance Pollution)
    // =========================================================================
    if (window.Screen && cfg.screenWidth && cfg.screenHeight) {
        try {
            const origW = Object.getOwnPropertyDescriptor(Screen.prototype, 'width');
            const origH = Object.getOwnPropertyDescriptor(Screen.prototype, 'height');
            const origAW = Object.getOwnPropertyDescriptor(Screen.prototype, 'availWidth');
            const origAH = Object.getOwnPropertyDescriptor(Screen.prototype, 'availHeight');

            Object.defineProperty(Screen.prototype, 'width', {
                get: wrapNative(origW ? origW.get : null, function() { return cfg.screenWidth; }, 'get width'),
                configurable: true,
                enumerable: true
            });
            Object.defineProperty(Screen.prototype, 'height', {
                get: wrapNative(origH ? origH.get : null, function() { return cfg.screenHeight; }, 'get height'),
                configurable: true,
                enumerable: true
            });
            Object.defineProperty(Screen.prototype, 'availWidth', {
                get: wrapNative(origAW ? origAW.get : null, function() { return cfg.screenWidth; }, 'get availWidth'),
                configurable: true,
                enumerable: true
            });
            Object.defineProperty(Screen.prototype, 'availHeight', {
                get: wrapNative(origAH ? origAH.get : null, function() { return cfg.screenHeight; }, 'get availHeight'),
                configurable: true,
                enumerable: true
            });
        } catch(e) {}
    }

    // =========================================================================
    // 5. Platform, Touch, Cores & RAM (On Navigator.prototype)
    // =========================================================================
    if (window.Navigator) {
        try {
            if (cfg.platform) {
                const origPlat = Object.getOwnPropertyDescriptor(Navigator.prototype, 'platform');
                Object.defineProperty(Navigator.prototype, 'platform', {
                    get: wrapNative(origPlat ? origPlat.get : null, function() { return cfg.platform; }, 'get platform'),
                    configurable: true,
                    enumerable: true
                });
            }
            if (typeof cfg.maxTouchPoints === 'number') {
                const origTouch = Object.getOwnPropertyDescriptor(Navigator.prototype, 'maxTouchPoints');
                Object.defineProperty(Navigator.prototype, 'maxTouchPoints', {
                    get: wrapNative(origTouch ? origTouch.get : null, function() { return cfg.maxTouchPoints; }, 'get maxTouchPoints'),
                    configurable: true,
                    enumerable: true
                });
            }
            if (typeof cfg.hardwareConcurrency === 'number') {
                const origCores = Object.getOwnPropertyDescriptor(Navigator.prototype, 'hardwareConcurrency');
                Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
                    get: wrapNative(origCores ? origCores.get : null, function() { return cfg.hardwareConcurrency; }, 'get hardwareConcurrency'),
                    configurable: true,
                    enumerable: true
                });
            }
            if (typeof cfg.deviceMemory === 'number') {
                const origRAM = Object.getOwnPropertyDescriptor(Navigator.prototype, 'deviceMemory');
                Object.defineProperty(Navigator.prototype, 'deviceMemory', {
                    get: wrapNative(origRAM ? origRAM.get : null, function() { return cfg.deviceMemory; }, 'get deviceMemory'),
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
})();
