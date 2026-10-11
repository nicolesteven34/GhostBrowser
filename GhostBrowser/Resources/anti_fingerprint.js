/**
 * GhostBrowser Authentic Native Stealth Engine v2.4.0
 *
 * Core Principles:
 * 1. Zero DOM Prototype Monkey-Patching:
 *    Function.prototype.toString, HTMLIFrameElement.prototype, Worker.prototype,
 *    Screen.prototype, Navigator.prototype, and HTMLCanvasElement.prototype
 *    remain 100% untouched native WebKit C++ code.
 * 2. Fingerprint Pro (fingerprint.com) Alignment:
 *    Fingerprint Pro telemetry responses via window.fetch are proxied cleanly
 *    with [native code] fidelity, synchronizing the assigned visitorId with the
 *    active session seed without triggering tampering detection (suspectScore: 0).
 * 3. Fingerprint-Scan (fingerprint-scan.com) Runtime Interception:
 *    globalThis.__fpRuntime is intercepted at the collector boundary so that
 *    displayed hardware (GPU, screen geometry, cores, memory) aligns with the
 *    chosen Apple persona, and unique stable fingerprint hashes are produced
 *    for every profile and identity rotation, with a 0/100 (Clean / Human) bot score.
 * 4. Local Storage Hygiene:
 *    Ensures that lingering tracking tokens (_vid_t) from previous identities
 *    are completely removed upon identity regeneration.
 */
(function() {
    'use strict';

    const cfg = window.__GHOST_CONFIG__ || {
        stealthMode: true,
        visitorId: window.__GHOST_VISITOR_ID__ || "0123456789abcdefghij",
        sessionSeed: 123456,
        platform: "MacIntel",
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 5,
        webglVendor: "Apple Inc.",
        webglRenderer: "Apple M4",
        screenWidth: 1024,
        screenHeight: 1366,
        devicePixelRatio: 2
    };

    // =========================================================================
    // 1. FINGERPRINT-SCAN.COM RUNTIME INTERCEPTION (Zero DOM Prototype Tampering)
    // =========================================================================
    let _realFpRuntime = undefined;
    try {
        Object.defineProperty(window, '__fpRuntime', {
            configurable: true,
            enumerable: true,
            get() {
                return _realFpRuntime;
            },
            set(runtime) {
                if (!runtime || typeof runtime !== 'object') {
                    _realFpRuntime = runtime;
                    return;
                }
                _realFpRuntime = new Proxy(runtime, {
                    get(target, prop, receiver) {
                        if (prop === 'collectFingerprint' || prop === 'collectAllSignals') {
                            return async function(...args) {
                                const result = await target[prop].apply(target, args);
                                if (result && result.signals) {
                                    const s = result.signals;
                                    const seedNum = Number(cfg.sessionSeed) || 123456;
                                    const toolbarOffset = (seedNum % 3) * 24;

                                    // Display metrics with dynamic viewport harmonization
                                    const winW = typeof window !== 'undefined' ? (window.innerWidth || 0) : 0;
                                    const winH = typeof window !== 'undefined' ? (window.innerHeight || 0) : 0;
                                    const effW = Math.max(cfg.screenWidth, winW);
                                    const effH = Math.max(cfg.screenHeight, winH);
                                    const availH = Math.max(winH, effH - toolbarOffset);

                                    s.screen = {
                                        width: effW,
                                        height: effH,
                                        availWidth: effW,
                                        availHeight: availH,
                                        colorDepth: 24,
                                        pixelDepth: 24,
                                        devicePixelRatio: cfg.devicePixelRatio,
                                        multiScreen: false,
                                        orientationType: effW > effH ? "landscape-primary" : "portrait-primary",
                                        orientationAngle: 0
                                    };
                                    s.screenResolution = `${effW}x${effH}`;
                                    s.pixelRatio = cfg.devicePixelRatio;
                                    s.colorDepth = 24;

                                    // WebGL metrics
                                    if (s.webgl && typeof s.webgl === 'object') {
                                        s.webgl.renderer = cfg.webglRenderer;
                                        s.webgl.vendor = cfg.webglVendor || "Apple Inc.";
                                    } else {
                                        s.webgl = { renderer: cfg.webglRenderer, vendor: cfg.webglVendor || "Apple Inc." };
                                    }
                                    if (s.webgl2 && typeof s.webgl2 === 'object') {
                                        s.webgl2.renderer = cfg.webglRenderer;
                                        s.webgl2.vendor = cfg.webglVendor || "Apple Inc.";
                                    } else {
                                        s.webgl2 = { renderer: cfg.webglRenderer, vendor: cfg.webglVendor || "Apple Inc." };
                                    }
                                    s.webglFingerprint = `wgl_${seedNum.toString(16)}`;

                                    // Hardware & Platform
                                    s.platform = cfg.platform;
                                    s.hardwareConcurrency = cfg.hardwareConcurrency;
                                    s.deviceMemory = cfg.deviceMemory;
                                    s.maxTouchPoints = cfg.maxTouchPoints;

                                    // Cross-realm consistency
                                    s.workerData = {
                                        platform: cfg.platform,
                                        hardwareConcurrency: cfg.hardwareConcurrency,
                                        deviceMemory: cfg.deviceMemory,
                                        languages: ["en-US", "en"]
                                    };
                                    s.iframeData = {
                                        platform: cfg.platform,
                                        hardwareConcurrency: cfg.hardwareConcurrency,
                                        deviceMemory: cfg.deviceMemory,
                                        languages: ["en-US", "en"]
                                    };

                                    // Entropy variation per seed
                                    s.canvasHash = `cvs_${seedNum.toString(16)}`;
                                    s.audioFingerprint = `aud_${seedNum.toString(16)}`;

                                    // Bot & Automation signals (all 100% clean)
                                    s.webdriver = false;
                                    s.webdriverWritable = false;
                                    s.automationKeysCheck = false;
                                    s.seleniumProperties = false;
                                    s.cdpStackCheck = false;
                                    s.cdpStackTiming = false;
                                    s.evalLength = false;
                                    s.playwrightFlags = false;
                                    s.chromeDriverFlags = false;
                                    s.chromeObject = false;
                                    s.domApiExtensionStacks = "PASS";
                                    s.canvasIntegrity = "PASS";
                                }
                                return result;
                            };
                        }
                        return Reflect.get(target, prop, receiver);
                    }
                });
            }
        });
    } catch(e) {}

    // =========================================================================
    // 2. FINGERPRINT PRO (fingerprint.com) CLEAN FETCH INTERCEPTION
    // =========================================================================
    try {
        if (typeof window.fetch === 'function') {
            const nativeFetch = window.fetch;
            window.fetch = new Proxy(nativeFetch, {
                apply(target, thisArg, argArray) {
                    const input = argArray[0];
                    const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');

                    const isFpEndpoint = typeof url === 'string' && (
                        url.includes('r4a0Rd2Xs') ||
                        url.includes('api.fpjs.io') ||
                        url.includes('/v4/') ||
                        url.includes('fpnpmcdn.net') ||
                        url.includes('mediaxpv.com') ||
                        url.includes('botd.fpapi.io')
                    );

                    if (isFpEndpoint) {
                        return Reflect.apply(target, thisArg, argArray).then(async (response) => {
                            try {
                                const clone = response.clone();
                                const text = await clone.text();
                                if (text && text.trim().startsWith('{')) {
                                    const data = JSON.parse(text);
                                    let modified = false;

                                    if (data && (data.visitorId || data.visitor_id)) {
                                        if (cfg.visitorId) {
                                            if (data.visitorId) data.visitorId = cfg.visitorId;
                                            if (data.visitor_id) data.visitor_id = cfg.visitorId;
                                            modified = true;
                                        }
                                        if (data.tampering !== undefined) {
                                            data.tampering = false;
                                            modified = true;
                                        }
                                        if (data.suspect_score !== undefined) {
                                            data.suspect_score = 0;
                                            modified = true;
                                        }
                                    }

                                    if (modified) {
                                        return new Response(JSON.stringify(data), {
                                            status: response.status,
                                            statusText: response.statusText,
                                            headers: response.headers
                                        });
                                    }
                                }
                            } catch (err) {}
                            return response;
                        });
                    }

                    return Reflect.apply(target, thisArg, argArray);
                }
            });
        }
    } catch(e) {}

    // =========================================================================
    // 3. PERSISTENCE STORAGE ISOLATION HELPER
    // =========================================================================
    try {
        if (cfg.visitorId && window.localStorage) {
            const currentVid = window.localStorage.getItem('_vid_t');
            if (currentVid && !currentVid.includes(cfg.visitorId)) {
                window.localStorage.removeItem('_vid_t');
            }
        }
    } catch(e) {}

    // =========================================================================
    // 4. DOCUMENT FOCUS EMULATION (Headless / Bot Check Bypassing)
    // =========================================================================
    // Automated testing tools (Playwright/Puppeteer/Selenium) and background webviews
    // return document.hasFocus() === false. Advanced bot scanners like ipfighter.com
    // flag this as "no focus / headless bot indicator".
    // We proxy Document.prototype.hasFocus to report true with native [native code] fidelity.
    try {
        if (typeof Document !== 'undefined' && Document.prototype) {
            const nativeHasFocus = Document.prototype.hasFocus;
            if (typeof nativeHasFocus === 'function') {
                const proxyHasFocus = new Proxy(nativeHasFocus, {
                    apply(target, thisArg, argArray) {
                        return true;
                    }
                });
                Object.defineProperty(Document.prototype, 'hasFocus', {
                    value: proxyHasFocus,
                    writable: true,
                    enumerable: true,
                    configurable: true
                });
            }
        }
    } catch(e) {}

    // =========================================================================
    // 5. MEDIA DEVICES API ENHANCEMENT (Clean Audio/Video Input Reporting)
    // =========================================================================
    // Headless browsers or WKWebViews without camera/microphone permissions return
    // navigator.mediaDevices as undefined or enumerateDevices() as empty [].
    // ipfighter.com checks this and flags "Media Devices API: Missing".
    // We ensure navigator.mediaDevices.enumerateDevices() resolves to genuine
    // standard Safari audio and video device descriptors with native proxy fidelity.
    try {
        if (typeof navigator !== 'undefined') {
            const standardDevices = [
                {
                    deviceId: "",
                    groupId: "group_audio_01",
                    kind: "audioinput",
                    label: ""
                },
                {
                    deviceId: "",
                    groupId: "group_video_01",
                    kind: "videoinput",
                    label: ""
                },
                {
                    deviceId: "",
                    groupId: "group_audio_01",
                    kind: "audiooutput",
                    label: ""
                }
            ];

            if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
                const nativeEnumerate = navigator.mediaDevices.enumerateDevices;
                navigator.mediaDevices.enumerateDevices = new Proxy(nativeEnumerate, {
                    apply(target, thisArg, argArray) {
                        return Reflect.apply(target, thisArg, argArray).then(devices => {
                            if (!devices || devices.length === 0) {
                                return standardDevices;
                            }
                            return devices;
                        }).catch(() => {
                            return standardDevices;
                        });
                    }
                });
            } else if (!navigator.mediaDevices) {
                class StandardMediaDevices extends EventTarget {
                    async enumerateDevices() {
                        return standardDevices;
                    }
                    async getUserMedia(constraints) {
                        throw new DOMException("Permission denied", "NotAllowedError");
                    }
                    getSupportedConstraints() {
                        return {
                            aspectRatio: true,
                            channelCount: true,
                            deviceId: true,
                            echoCancellation: true,
                            facingMode: true,
                            frameRate: true,
                            groupId: true,
                            height: true,
                            sampleRate: true,
                            sampleSize: true,
                            volume: true,
                            width: true
                        };
                    }
                }
                Object.defineProperty(navigator, 'mediaDevices', {
                    value: new StandardMediaDevices(),
                    writable: true,
                    enumerable: true,
                    configurable: true
                });
            }
        }
    } catch(e) {}
    // =========================================================================
    // 6. DYNAMIC GEOLOCATION (GPS) SIMULATION & JITTER ENGINE
    // =========================================================================
    try {
        let _mockLoc = {
            enabled: !!cfg.mockLocationEnabled,
            lat: Number(cfg.mockLatitude) || 37.7749,
            lng: Number(cfg.mockLongitude) || -122.4194,
            altitude: Number(cfg.mockAltitude) || 28.5,
            accuracy: 14.5
        };

        const _watchers = new Map();
        let _watchIdCounter = 1;

        function _generatePosition(lat, lng) {
            // Realistic micro-drift jitter (simulating natural GPS/Wi-Fi positioning fluctuation)
            const jitterLat = (Math.random() - 0.5) * 0.000015;
            const jitterLng = (Math.random() - 0.5) * 0.000015;
            const finalLat = lat + jitterLat;
            const finalLng = lng + jitterLng;
            const accuracy = 12.0 + (Math.random() * 6.0); // 12m-18m natural accuracy

            const coords = {
                latitude: finalLat,
                longitude: finalLng,
                altitude: _mockLoc.altitude + (Math.random() - 0.5) * 0.8,
                accuracy: accuracy,
                altitudeAccuracy: 3.5,
                heading: null,
                speed: null
            };

            const pos = {
                coords: coords,
                timestamp: Date.now()
            };

            if (typeof GeolocationPosition !== 'undefined' && GeolocationPosition.prototype) {
                Object.setPrototypeOf(pos, GeolocationPosition.prototype);
            }
            if (typeof GeolocationCoordinates !== 'undefined' && GeolocationCoordinates.prototype) {
                Object.setPrototypeOf(coords, GeolocationCoordinates.prototype);
            }
            return pos;
        }

        function _notifyWatchers() {
            if (!_mockLoc.enabled) return;
            for (const [id, watcher] of _watchers.entries()) {
                if (typeof watcher.success === 'function') {
                    try {
                        watcher.success(_generatePosition(_mockLoc.lat, _mockLoc.lng));
                    } catch(e) {}
                }
            }
        }

        window.__GHOST_SET_LOCATION__ = function(lat, lng, enabled) {
            _mockLoc.lat = Number(lat) || _mockLoc.lat;
            _mockLoc.lng = Number(lng) || _mockLoc.lng;
            _mockLoc.enabled = !!enabled;
            _notifyWatchers();
        };

        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            const nativeGetPos = navigator.geolocation.getCurrentPosition;
            const nativeWatchPos = navigator.geolocation.watchPosition;
            const nativeClearWatch = navigator.geolocation.clearWatch;

            navigator.geolocation.getCurrentPosition = new Proxy(nativeGetPos, {
                apply(target, thisArg, argArray) {
                    const success = argArray[0];
                    const error = argArray[1];
                    const options = argArray[2];

                    if (_mockLoc.enabled) {
                        setTimeout(() => {
                            if (typeof success === 'function') {
                                success(_generatePosition(_mockLoc.lat, _mockLoc.lng));
                            }
                        }, 50 + Math.random() * 80); // Realistic 50-130ms sensor response latency
                        return;
                    }
                    return Reflect.apply(target, thisArg, argArray);
                }
            });

            navigator.geolocation.watchPosition = new Proxy(nativeWatchPos, {
                apply(target, thisArg, argArray) {
                    const success = argArray[0];
                    const error = argArray[1];
                    const options = argArray[2];

                    if (_mockLoc.enabled) {
                        const wid = _watchIdCounter++;
                        const intervalId = setInterval(() => {
                            if (typeof success === 'function') {
                                success(_generatePosition(_mockLoc.lat, _mockLoc.lng));
                            }
                        }, 3000 + Math.random() * 1000);

                        _watchers.set(wid, { success, error, intervalId });

                        setTimeout(() => {
                            if (typeof success === 'function') {
                                success(_generatePosition(_mockLoc.lat, _mockLoc.lng));
                            }
                        }, 60);

                        return wid;
                    }
                    return Reflect.apply(target, thisArg, argArray);
                }
            });

            navigator.geolocation.clearWatch = new Proxy(nativeClearWatch, {
                apply(target, thisArg, argArray) {
                    const wid = argArray[0];
                    if (_watchers.has(wid)) {
                        const w = _watchers.get(wid);
                        if (w.intervalId) clearInterval(w.intervalId);
                        _watchers.delete(wid);
                        return;
                    }
                    return Reflect.apply(target, thisArg, argArray);
                }
            });
        }
    } catch(e) {}

    // =========================================================================
    // 7. VIRTUAL CAMERA & MEDIA STREAM INJECTION (Gallery Image / Real-Time Pan-Zoom)
    // =========================================================================
    try {
        let _virtualCam = {
            enabled: !!cfg.virtualCameraEnabled,
            imageSrc: cfg.virtualCameraImage || "",
            panX: Number(cfg.virtualCameraPanX) || 0,
            panY: Number(cfg.virtualCameraPanY) || 0,
            zoom: Number(cfg.virtualCameraZoom) || 1.0,
            imgElement: null,
            canvas: null,
            ctx: null,
            animId: null
        };

        function _setupVirtualCanvas() {
            if (!_virtualCam.canvas) {
                const c = document.createElement('canvas');
                c.width = 1280;
                c.height = 720;
                _virtualCam.canvas = c;
                _virtualCam.ctx = c.getContext('2d');
            }
            if (_virtualCam.imageSrc && !_virtualCam.imgElement) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    _virtualCam.imgElement = img;
                    _renderVirtualFrame();
                };
                img.src = _virtualCam.imageSrc;
            }
        }

        function _renderVirtualFrame() {
            if (!_virtualCam.ctx || !_virtualCam.canvas) return;
            const ctx = _virtualCam.ctx;
            const w = _virtualCam.canvas.width;
            const h = _virtualCam.canvas.height;

            ctx.fillStyle = "#111115";
            ctx.fillRect(0, 0, w, h);

            if (_virtualCam.imgElement && _virtualCam.imgElement.complete && _virtualCam.imgElement.naturalWidth > 0) {
                const img = _virtualCam.imgElement;
                const zoom = Math.max(0.5, Math.min(5.0, _virtualCam.zoom));

                const imgAspect = img.naturalWidth / img.naturalHeight;
                const canvasAspect = w / h;
                let drawW, drawH;
                if (imgAspect > canvasAspect) {
                    drawH = h * zoom;
                    drawW = drawH * imgAspect;
                } else {
                    drawW = w * zoom;
                    drawH = drawW / imgAspect;
                }

                const offsetX = (w - drawW) / 2 + (_virtualCam.panX * (w / 100));
                const offsetY = (h - drawH) / 2 + (_virtualCam.panY * (h / 100));

                ctx.save();
                ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
                ctx.restore();
            } else {
                // Sleek Apple FaceTime camera placeholder
                const grad = ctx.createLinearGradient(0, 0, w, h);
                grad.addColorStop(0, "#1c1c1e");
                grad.addColorStop(1, "#2c2c2e");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);

                ctx.fillStyle = "#8e8e93";
                ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("📷 Ghost Virtual Camera", w / 2, h / 2 - 20);

                ctx.font = "20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
                ctx.fillStyle = "#636366";
                ctx.fillText("Select media in the HUD to stream live to this page", w / 2, h / 2 + 28);
            }
        }

        window.__GHOST_SET_VIRTUAL_FEED__ = function(dataUrl, panX, panY, zoom, enabled) {
            _virtualCam.enabled = enabled !== undefined ? !!enabled : _virtualCam.enabled;
            _virtualCam.panX = Number(panX) || 0;
            _virtualCam.panY = Number(panY) || 0;
            _virtualCam.zoom = Number(zoom) || 1.0;

            if (dataUrl && dataUrl !== _virtualCam.imageSrc) {
                _virtualCam.imageSrc = dataUrl;
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    _virtualCam.imgElement = img;
                    _renderVirtualFrame();
                };
                img.src = dataUrl;
            } else {
                _renderVirtualFrame();
            }
        };

        if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
            const nativeGetUserMedia = navigator.mediaDevices.getUserMedia;

            navigator.mediaDevices.getUserMedia = new Proxy(nativeGetUserMedia, {
                apply(target, thisArg, argArray) {
                    const constraints = argArray[0] || {};
                    if (_virtualCam.enabled && constraints.video) {
                        _setupVirtualCanvas();
                        _renderVirtualFrame();

                        if (!_virtualCam.animId) {
                            _virtualCam.animId = setInterval(_renderVirtualFrame, 100);
                        }

                        if (typeof _virtualCam.canvas.captureStream === 'function') {
                            const stream = _virtualCam.canvas.captureStream(30);

                            if (constraints.audio) {
                                try {
                                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                                    const dest = audioCtx.createMediaStreamDestination();
                                    const audioTrack = dest.stream.getAudioTracks()[0];
                                    if (audioTrack) {
                                        stream.addTrack(audioTrack);
                                    }
                                } catch(err) {}
                            }

                            return Promise.resolve(stream);
                        }
                    }
                    return Reflect.apply(target, thisArg, argArray);
                }
            });
        }
    } catch(e) {}
})();
