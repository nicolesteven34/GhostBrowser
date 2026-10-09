/**
 * GhostBrowser Anti-Fingerprint Engine
 * Injected at document_start in all frames before any website scripts run.
 */
(function() {
    'use strict';

    // Retrieve active privacy configuration passed from Swift
    const config = window.__GHOST_CONFIG__ || {
        blockCanvas: true,
        blockAudio: true,
        maskWebGL: true,
        blockWebRTC: true,
        shieldSensors: true,
        stripReferrer: true,
        hardwareConcurrency: 4,
        deviceMemory: 8,
        webglVendor: "Apple Inc.",
        webglRenderer: "Apple GPU",
        sessionSeed: Math.random()
    };

    // Helper: Pseudo-random generator seeded per session
    function getNoise(seed, offset) {
        const x = Math.sin(seed + offset) * 10000;
        return (x - Math.floor(x)) * 0.00001;
    }

    // =========================================================================
    // 1. CANVAS FINGERPRINTING SPOOFER
    // Perturbs image data by imperceptible micro-variations to defeat hash matching
    // =========================================================================
    if (config.blockCanvas) {
        try {
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            const originalToBlob = HTMLCanvasElement.prototype.toBlob;
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

            function addNoiseToContext(ctx, width, height) {
                try {
                    const imageData = originalGetImageData.call(ctx, 0, 0, width, height);
                    const data = imageData.data;
                    const step = Math.max(1, Math.floor(data.length / 500));
                    for (let i = 0; i < data.length; i += step * 4) {
                        // Apply slight shift to 1 color channel
                        data[i] = (data[i] + 1) % 256;
                    }
                    ctx.putImageData(imageData, 0, 0);
                } catch (e) {
                    // Context might be tainted
                }
            }

            HTMLCanvasElement.prototype.toDataURL = function(...args) {
                if (this.width > 0 && this.height > 0) {
                    const ctx = this.getContext('2d');
                    if (ctx) addNoiseToContext(ctx, this.width, this.height);
                }
                return originalToDataURL.apply(this, args);
            };

            HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
                if (this.width > 0 && this.height > 0) {
                    const ctx = this.getContext('2d');
                    if (ctx) addNoiseToContext(ctx, this.width, this.height);
                }
                return originalToBlob.call(this, callback, ...args);
            };

            CanvasRenderingContext2D.prototype.getImageData = function(...args) {
                const imgData = originalGetImageData.apply(this, args);
                if (imgData && imgData.data && imgData.data.length > 0) {
                    const step = Math.max(1, Math.floor(imgData.data.length / 500));
                    for (let i = 0; i < imgData.data.length; i += step * 4) {
                        imgData.data[i] = (imgData.data[i] + 1) % 256;
                    }
                }
                return imgData;
            };
        } catch (err) {
            console.warn('[GhostBrowser] Canvas protection init failure:', err);
        }
    }

    // =========================================================================
    // 2. WEBGL HARDWARE MASKING
    // Spoofs GPU Vendor & Renderer (prevents hardware identification)
    // =========================================================================
    if (config.maskWebGL) {
        try {
            const hookWebGL = function(target) {
                if (!target || !target.prototype) return;
                const originalGetParameter = target.prototype.getParameter;
                const originalGetExtension = target.prototype.getExtension;

                target.prototype.getParameter = function(parameter) {
                    // UNMASKED_VENDOR_WEBGL = 0x9245 (37445)
                    if (parameter === 37445) {
                        return config.webglVendor;
                    }
                    // UNMASKED_RENDERER_WEBGL = 0x9246 (37446)
                    if (parameter === 37446) {
                        return config.webglRenderer;
                    }
                    return originalGetParameter.apply(this, arguments);
                };
            };

            if (window.WebGLRenderingContext) hookWebGL(window.WebGLRenderingContext);
            if (window.WebGL2RenderingContext) hookWebGL(window.WebGL2RenderingContext);
        } catch (err) {
            console.warn('[GhostBrowser] WebGL protection init failure:', err);
        }
    }

    // =========================================================================
    // 3. AUDIO CONTEXT FINGERPRINT SPOOFER
    // Perturbs frequency data so FFT-based acoustic fingerprints fail
    // =========================================================================
    if (config.blockAudio) {
        try {
            if (window.AudioBuffer) {
                const origGetChannelData = AudioBuffer.prototype.getChannelData;
                AudioBuffer.prototype.getChannelData = function(channel) {
                    const data = origGetChannelData.apply(this, arguments);
                    const noise = getNoise(config.sessionSeed, channel);
                    for (let i = 0; i < data.length; i += 100) {
                        data[i] = data[i] + noise;
                    }
                    return data;
                };
            }

            if (window.AnalyserNode) {
                const origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
                AnalyserNode.prototype.getFloatFrequencyData = function(array) {
                    origGetFloatFreq.apply(this, arguments);
                    for (let i = 0; i < array.length; i += 20) {
                        array[i] += 0.0001;
                    }
                };

                const origGetByteFreq = AnalyserNode.prototype.getByteFrequencyData;
                AnalyserNode.prototype.getByteFrequencyData = function(array) {
                    origGetByteFreq.apply(this, arguments);
                    for (let i = 0; i < array.length; i += 20) {
                        array[i] = (array[i] + 1) % 256;
                    }
                };
            }
        } catch (err) {
            console.warn('[GhostBrowser] Audio protection init failure:', err);
        }
    }

    // =========================================================================
    // 4. WEBRTC LOCAL IP LEAK SHIELD
    // Prevents websites from discovering local network & VPN-bypassing IP addresses
    // =========================================================================
    if (config.blockWebRTC) {
        try {
            const blockRTC = function() {
                throw new Error('[GhostBrowser] WebRTC is disabled to prevent IP leaks.');
            };

            window.RTCPeerConnection = blockRTC;
            window.webkitRTCPeerConnection = blockRTC;
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia = blockRTC;
            }
        } catch (err) {
            console.warn('[GhostBrowser] WebRTC protection failure:', err);
        }
    }

    // =========================================================================
    // 5. HARDWARE & NAVIGATOR PROPERTIES NORMALIZATION
    // Standardizes CPU cores and RAM to prevent cross-site clustering
    // =========================================================================
    try {
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => config.hardwareConcurrency || 4,
            configurable: true
        });

        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => config.deviceMemory || 8,
            configurable: true
        });

        // Strip Battery API (frequently used for tracking across sessions)
        if ('getBattery' in navigator) {
            Object.defineProperty(navigator, 'getBattery', {
                value: () => Promise.reject(new Error('Battery API disabled by user policy.')),
                configurable: true
            });
        }
    } catch (err) {
        console.warn('[GhostBrowser] Navigator normalization failure:', err);
    }

    // =========================================================================
    // 6. SENSOR & ORIENTATION SHIELD
    // Blocks gyroscope, accelerometer & device orientation fingerprinting
    // =========================================================================
    if (config.shieldSensors) {
        try {
            window.addEventListener('deviceorientation', function(e) {
                e.stopImmediatePropagation();
            }, true);

            window.addEventListener('devicemotion', function(e) {
                e.stopImmediatePropagation();
            }, true);
        } catch (err) {
            // Ignore
        }
    }

    // =========================================================================
    // 7. STRIP REFERRER
    // Prevents target websites from knowing what site you clicked from
    // =========================================================================
    if (config.stripReferrer) {
        try {
            Object.defineProperty(document, 'referrer', {
                get: () => '',
                configurable: true
            });
        } catch (err) {
            // Ignore
        }
    }

    // =========================================================================
    // 8. SCREEN DEPTH NORMALIZATION
    // =========================================================================
    try {
        Object.defineProperty(screen, 'colorDepth', { get: () => 24, configurable: true });
        Object.defineProperty(screen, 'pixelDepth', { get: () => 24, configurable: true });
    } catch (err) {
        // Ignore
    }

    console.info('[GhostBrowser] Stealth privacy shield active.');
})();
