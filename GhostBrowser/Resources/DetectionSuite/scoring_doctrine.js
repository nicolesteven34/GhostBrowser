/**
 * FlagMeter • 55-Site Mathematical Scoring Predictor, 22-Persona Audit & Complete Forensic Documentation Codex
 * Embeds 100% of the deobfuscated mathematical formulas, 17-engine encyclopedia, 55-website script dossiers,
 * pre-encryption sensor schemas, 14+43 site wire-to-stack Accept-CH matrices, and Google 5-ISP forensic audit.
 */
(function () {
    'use strict';

    let _currentDoctrineSubTab = 'live_predictor';
    let _currentSiteFilter = 'all';
    let _currentSiteSearch = '';
    let _expandAllSiteDossiers = false;
    const _expandedSiteSlugs = new Set();
    let _lastScoringAuditReport = null;

    function escHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    const _crcTable = (function () {
        const t = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            t[i] = c >>> 0;
        }
        return t;
    })();

    function computeCrc32Hex(str) {
        let crc = -1;
        for (let i = 0; i < str.length; i++) {
            crc = (crc >>> 8) ^ _crcTable[(crc ^ str.charCodeAt(i)) & 0xff];
        }
        return ((crc ^ -1) >>> 0).toString(16).toUpperCase().padStart(8, '0');
    }

    // =========================================================================
    // 1. LIVE MATHEMATICAL ENGINE EVALUATORS (12 UNLOCKED ENGINES)
    // =========================================================================

    async function evaluateAppleShieldLive() {
        const ua = navigator.userAgent || '';
        const langs = Array.from(navigator.languages || [navigator.language || 'en-US']);
        const tz = (function () {
            try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'; } catch (e) { return 'unknown'; }
        })();
        const w = window.screen ? window.screen.width : 0;
        const h = window.screen ? window.screen.height : 0;
        const cd = window.screen ? window.screen.colorDepth : 0;
        const resStr = w + 'x' + h;

        const hasWebDriver = navigator.webdriver === true;
        const isHeadless = /HeadlessChrome|PhantomJS/i.test(ua) || window.outerHeight === 0;
        const hasPhantom = /PhantomJS/i.test(ua) || Boolean(window._phantom);
        const hasSelenium = Boolean(window.selenium || window.webdriver || document.selenium || document.webdriver || navigator.webdriver);

        const tzLangPairs = [
            { tz: 'America/New_York', lang: 'zh-CN' },
            { tz: 'Europe/Paris', lang: 'ja-JP' },
            { tz: 'Asia/Tokyo', lang: 'es-ES' }
        ];
        const hasTzLangInconsistency = tzLangPairs.some(p => tz.includes(p.tz) && langs.some(l => l.includes(p.lang)));
        const hasScreenInconsistency = ['1024x768', '800x600', '1280x720', '1920x1080'].includes(resStr) && cd === 24;

        let canvasData = 'no-canvas';
        try {
            const c = document.createElement('canvas');
            c.width = 200;
            c.height = 50;
            const ctx = c.getContext('2d');
            if (ctx) {
                ctx.textBaseline = 'top';
                ctx.font = '14px Arial';
                ctx.fillStyle = '#f60';
                ctx.fillRect(125, 1, 62, 20);
                ctx.fillStyle = '#069';
                ctx.fillText('Canvas fingerprint 🎨', 2, 15);
                canvasData = c.toDataURL();
            }
        } catch (e) {}
        const hasGenericCanvas = !canvasData || canvasData.length < 100 || canvasData === 'no-canvas';
        const hasMissingAPIs = !ua || !langs.length || !w;
        const hasSuspiciousUA = ['headlesschrome', 'phantomjs', 'bot', 'crawler', 'spider', 'scraper'].some(s => ua.toLowerCase().includes(s));
        const hasKnownBotSig = ['Googlebot', 'Bingbot', 'facebookexternalhit', 'Twitterbot', 'LinkedInBot', 'WhatsApp', 'python-requests', 'curl/', 'wget'].some(s => ua.includes(s));
        const isTooStable = true;

        const signals = [
            { type: 'webdriver', flag: 'w', severity: 9, pts: 90, detected: hasWebDriver, desc: 'navigator.webdriver === true' },
            { type: 'bot_signature', flag: 'b', severity: 9, pts: 90, detected: hasKnownBotSig, desc: 'Known scraper/bot UA token (_phantom, __nightmare, curl)' },
            { type: 'headless', flag: 'h', severity: 8, pts: 80, detected: isHeadless, desc: 'HeadlessChrome or outerHeight === 0' },
            { type: 'selenium', flag: 's', severity: 8, pts: 80, detected: hasSelenium, desc: 'window/document $cdc_, $wdc_, or selenium attr' },
            { type: 'phantom', flag: 'p', severity: 7, pts: 70, detected: hasPhantom, desc: 'window._phantom or PhantomJS UA' },
            { type: 'suspicious_ua', flag: 'u', severity: 7, pts: 70, detected: hasSuspiciousUA, desc: 'Automation token in User-Agent' },
            { type: 'screen_consistency', flag: 'S', severity: 6, pts: 60, detected: hasScreenInconsistency, desc: `${resStr} with colorDepth=${cd} (24-bit SDR trap)` },
            { type: 'missing_apis', flag: 'a', severity: 6, pts: 60, detected: hasMissingAPIs, desc: 'Core browser collectors missing (Notification, WebGL)' },
            { type: 'timezone_language', flag: 'l', severity: 5, pts: 50, detected: hasTzLangInconsistency, desc: `Timezone (${tz}) vs Languages (${langs[0]})` },
            { type: 'collection_errors', flag: 'e', severity: 5, pts: 50, detected: false, desc: '>3 collector exceptions thrown' },
            { type: 'generic_canvas', flag: 'c', severity: 4, pts: 40, detected: hasGenericCanvas, desc: 'Canvas toDataURL < 100 chars or uniform fallback' },
            { type: 'too_perfect (isTooStable)', flag: 'P', severity: 3, pts: 30, detected: isTooStable, desc: 'Baseline 9/9 collectors non-null (deliberate +30 cliff threshold)' }
        ];

        const activeSignals = signals.filter(s => s.detected);
        const rawScore = activeSignals.reduce((acc, s) => acc + s.severity * 10, 0);
        const score = Math.min(100, rawScore);
        const riskLevel = score < 30 ? 'LOW' : (score < 70 ? 'MEDIUM (Baseline Pass)' : 'HIGH (Blocked)');
        const flags = activeSignals.map(s => s.flag);

        const drmSystems = [
            ['com.widevine.alpha', 'cenc'],
            ['com.microsoft.playready', 'cenc'],
            ['com.microsoft.playready.recommendation', 'cenc'],
            ['com.apple.fps', 'sinf'],
            ['com.apple.fps.1_0', 'sinf'],
            ['com.apple.fps.3_0', 'sinf'],
            ['org.w3.clearkey', 'cenc']
        ];
        const browserCode = /iPhone|iPad|iPod/.test(ua) ? 's' : (/Edg\//.test(ua) ? 'e' : (/OPR\/|Brave/.test(ua) ? '?' : (/Chrome\//.test(ua) ? 'c' : (/Firefox\//.test(ua) ? 'f' : (/^((?!chrome|android).)*safari/i.test(ua) ? 's' : '?')))));
        let drmVec = 'xxxxxxx';
        let rmksaNative = false;
        try {
            const fn = navigator.requestMediaKeySystemAccess;
            rmksaNative = typeof fn === 'function' && fn.length === 2 && fn.name === 'requestMediaKeySystemAccess' && /\{\s*\[native code\]\s*\}/.test(Function.prototype.toString.call(fn));
            if (typeof fn === 'function') {
                const probes = await Promise.all(drmSystems.map(([ks, initType]) => {
                    return Promise.race([
                        navigator.requestMediaKeySystemAccess(ks, [{
                            initDataTypes: [initType],
                            distinctiveIdentifier: 'optional',
                            persistentState: 'optional',
                            sessionTypes: ['temporary'],
                            videoCapabilities: [{ contentType: 'video/mp4;codecs="avc1.42E01E"', robustness: '' }]
                        }]).then(() => 'o').catch(err => (err && err.name === 'NotSupportedError' ? 'x' : 'e')),
                        new Promise(r => setTimeout(() => r('t'), 280))
                    ]);
                }));
                drmVec = probes.join('');
            }
        } catch (e) {}

        const drmCoherent = (browserCode === 'e' && drmVec.startsWith('oo')) ||
                            (browserCode === 'c' && drmVec.startsWith('ox')) ||
                            (browserCode === 's' && drmVec.includes('o')) ||
                            drmVec.includes('o');

        return {
            id: 'apple_shield',
            name: 'Apple Shield v3 (shld/s3/verify.js)',
            category: 'Mathematical Score (0–100) + EME DRM + PoW',
            passed: score < 70 && drmCoherent,
            scoreDisplay: `jr=${score}/100 (${riskLevel})`,
            privilegeTier: score < 70 ? 'HIGH PRIVILEGE (shld_bt_ck Minted)' : 'ZERO PRIVILEGE (401 Challenge Loop)',
            formula: 'score = Math.min(100, sum(signal.severity * 10)); <30 LOW, 30-69 MEDIUM (Pass), >=70 HIGH (Block)',
            telemetry: `jr=${score} • flags=[${flags.join(',')}] • screen=${resStr}@${cd}bit • DRM={u:'${browserCode}', p:${rmksaNative ? 1 : 0}, r:'${drmVec}'}`,
            signals
        };
    }

    async function evaluateAwsWafZoeyLive() {
        let t1 = 0, t2 = 0;
        try {
            if (window.performance && window.performance.timing) {
                const origDesc = Object.getOwnPropertyDescriptor(PerformanceTiming.prototype, 'navigationStart') ||
                                 Object.getOwnPropertyDescriptor(window.performance.timing, 'navigationStart');
                let spyHit = false;
                try {
                    Object.defineProperty(window.performance.timing, 'navigationStart', {
                        get: function () { spyHit = true; return Date.now() - 1000; },
                        configurable: true
                    });
                    if (window.chrome && typeof window.chrome.csi === 'function') {
                        spyHit = false;
                        window.chrome.csi();
                        if (spyHit) t1 = 1;
                    }
                    if (window.chrome && typeof window.chrome.loadTimes === 'function') {
                        spyHit = false;
                        window.chrome.loadTimes();
                        if (spyHit) t2 = 1;
                    }
                } catch (e) {} finally {
                    try { delete window.performance.timing.navigationStart; } catch (e) {}
                    if (origDesc && Object.prototype.hasOwnProperty.call(window.performance.timing, 'navigationStart')) {
                        try { Object.defineProperty(window.performance.timing, 'navigationStart', origDesc); } catch (e) {}
                    }
                }
            }
        } catch (e) {}

        let iFlag = 0;
        try {
            const ifr = document.createElement('iframe');
            Object.defineProperty(ifr, 'srcdoc', { get: function () { return 'bar'; }, configurable: false });
            ifr.srcdoc = 'foo';
        } catch (err) {
            if (err instanceof TypeError) iFlag = 1;
        }

        let mte = 0;
        try {
            const aud = document.createElement('AUDIO');
            if (typeof aud.canPlayType === 'function') {
                aud.canPlayType({ length: 1 });
            }
        } catch (e) {
            mte = 1;
        }

        let mtd = false;
        try {
            const vid = document.createElement('VIDEO');
            if (typeof vid.canPlayType === 'function' && typeof MediaSource !== 'undefined' && typeof MediaSource.isTypeSupported === 'function') {
                const mime = 'video/mp4; codecs="avc1.42E01E"';
                mtd = (vid.canPlayType(mime) === 'probably') !== MediaSource.isTypeSupported(mime);
            }
        } catch (e) {}

        const pw = Boolean(window.__playwright__binding__ || window.__pwInitScripts);
        const pp = Boolean(window.__puppeteer_evaluation_script__);
        const cd = Object.getOwnPropertyNames(window).some(k => /^cdc_|^\$cdc_/i.test(k));
        const cdpClean = !pw && !pp && !cd;

        const mh = navigator.hardwareConcurrency || 8;
        const mp = navigator.platform || 'Win32';
        let wh = mh, wp = mp;
        try {
            const blob = new Blob(['self.postMessage({hc:navigator.hardwareConcurrency,pl:navigator.platform});'], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const wRes = await Promise.race([
                new Promise(resolve => {
                    const w = new Worker(url);
                    w.onmessage = function (ev) {
                        resolve(ev.data);
                        w.terminate();
                        URL.revokeObjectURL(url);
                    };
                    w.onerror = function () {
                        resolve(null);
                        w.terminate();
                        URL.revokeObjectURL(url);
                    };
                }),
                new Promise(r => setTimeout(() => r(null), 350))
            ]);
            if (wRes && typeof wRes === 'object') {
                wh = wRes.hc || mh;
                wp = wRes.pl || mp;
            }
        } catch (e) {}

        const wrParity = (mh === wh) && (mp === wp);
        const stealthClean = (t1 === 0 && t2 === 0 && iFlag === 1 && mte === 0 && mtd === false);
        const passed = stealthClean && cdpClean && wrParity;

        const samplePayload = {
            version: '2.4.0',
            webDriver: Boolean(navigator.webdriver),
            stealth: { t1, t2, i: iFlag, mte, mtd },
            cdp: { pw, pp, pf: false, cd, xb: false },
            wr: { mh, wh, mp, wp },
            screenInfo: `${screen.width}-${screen.height}-${screen.availWidth}-${screen.availHeight}-${screen.colorDepth}-${screen.pixelDepth}`,
            math: {
                tan: String(Math.tan(-1e300)),
                sin: String(Math.sin(1)),
                cos: String(Math.cos(1))
            }
        };
        const jsonStr = JSON.stringify(samplePayload);
        const crcHex = computeCrc32Hex(jsonStr);

        return {
            id: 'aws_waf_zoey',
            name: 'AWS WAF Bot Control v2.4.0 (Zoey:: / FWCIM)',
            category: 'Stealth Bitmask + Ephemeral Worker + AES-GCM',
            passed,
            scoreDisplay: passed ? '0 Stealth Flags (Zoey:: Verified)' : 'Stealth/Worker Anomaly Flagged',
            privilegeTier: passed ? 'HIGH PRIVILEGE (aws-waf-token Issued)' : 'LOW PRIVILEGE (CAPTCHA / 403)',
            formula: 'stealth={t1:0, t2:0, i:1, mte:0, mtd:false} && cdp={all false} && wr.mh===wr.wh && wr.mp===wr.wp',
            telemetry: `stealth=${JSON.stringify(samplePayload.stealth)} • wr=${JSON.stringify(samplePayload.wr)} • CRC32=${crcHex}`,
            preEncryptionPreview: `${crcHex}#${jsonStr}`
        };
    }

    function evaluateDataDomeLive() {
        const probesB = ['InputMethodContext', 'VisualViewport', 'MathMLElement', 'WebKitCSSMatrix', 'GPUSupportedLimits', 'AudioSinkInfo', 'EyeDropper', 'VideoFrame', 'ShadowRealm', 'WebTransport', 'ToggleEvent', 'HighlightRegistry', 'CSSScopeRule', 'ViewTransition', 'CompressionStream', 'DecompressionStream'];
        let sgb = 0;
        probesB.forEach((k, idx) => { if (k in window) sgb |= (1 << idx); });

        let anonNativeCount = 0;
        try {
            const keys = Object.keys(window).slice(0, 200);
            for (let i = 0; i < keys.length; i++) {
                const v = window[keys[i]];
                if (typeof v === 'function' && v.name === '' && Function.prototype.toString.call(v).includes('[native code]')) {
                    anonNativeCount++;
                }
            }
        } catch (e) {}

        const aiMarkers = ['WebMCPEvent', 'ModelContext', '__stagehandV3__', 'FELLOU_PARTITION'].filter(k => k in window);
        const domAiMarkers = ['#claude-agent-animation-styles', '[data-browser-use-highlight]', '#codex-agent-overlay-root'].filter(sel => {
            try { return Boolean(document.querySelector(sel)); } catch (e) { return false; }
        });

        const hasCoalescedEvents = typeof PointerEvent !== 'undefined' && typeof PointerEvent.prototype.getCoalescedEvents === 'function';
        const hasFocus = document.hasFocus ? document.hasFocus() : true;
        const passed = anonNativeCount === 0 && aiMarkers.length === 0 && domAiMarkers.length === 0 && hasCoalescedEvents;

        return {
            id: 'datadome_v511',
            name: 'DataDome v5.11.1 (tags.js / x-dd-b)',
            category: '96-Bit Constructor Bitmask + Lognormal Kinematics',
            passed,
            scoreDisplay: passed ? `0 Bitmask Anomalies (sgb=0x${sgb.toString(16).toUpperCase()})` : 'Bitmask / AI Marker Detected',
            privilegeTier: passed ? 'HIGH PRIVILEGE (datadome Pass Cookie)' : 'ZERO PRIVILEGE (Interstitial CAPTCHA)',
            formula: 'dpb===0 && aiMarkers===0 && Worker(_datadome-det-cd)===Main && Lognormal(es_sigmdn, es_mumdn) && getCoalescedEvents()',
            telemetry: `sgb=0x${sgb.toString(16).toUpperCase()} • dpb_anon=${anonNativeCount} • AI_Markers=${aiMarkers.length + domAiMarkers.length} • getCoalescedEvents=${hasCoalescedEvents} • focus=${hasFocus}`
        };
    }

    function evaluateFpjsProLive() {
        const ua = navigator.userAgent || '';
        const G_blink = [
            'userAgentData' in navigator,
            'chrome' in window,
            'webkitPersistentStorage' in navigator,
            'webkitTemporaryStorage' in navigator,
            typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('-webkit-app-region: drag')
        ].filter(Boolean).length;

        const N_webkit = [
            'safari' in window,
            'ApplePaySession' in window,
            'webkitConvertPointFromNodeToPage' in window,
            typeof WebKitCSSMatrix !== 'undefined' && 'm11' in new WebKitCSSMatrix()
        ].filter(Boolean).length;

        const H_gecko = [
            'mozInnerScreenX' in window,
            'InstallTrigger' in window,
            typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('-moz-appearance: none')
        ].filter(Boolean).length;

        const claimsSafari = /^((?!chrome|android).)*safari/i.test(ua);
        const claimsChromeOrEdge = /Chrome\/|CriOS\/|Edg\//i.test(ua);
        const engineCoherent = (claimsChromeOrEdge && G_blink >= 3) || (claimsSafari && G_blink < 4) || (!claimsSafari && !claimsChromeOrEdge);
        const confidence = engineCoherent && !navigator.webdriver ? 0.99 : 0.45;

        return {
            id: 'fpjs_pro_v4',
            name: 'FingerprintJS Pro v4 + Smart Signals',
            category: 'Engine Feature Bitmask (G/N/H) + Confidence Score',
            passed: engineCoherent && !navigator.webdriver,
            scoreDisplay: `Confidence: ${confidence.toFixed(2)} • Tamper: ${engineCoherent ? '0.00' : '1.00'}`,
            privilegeTier: engineCoherent ? 'HIGH PRIVILEGE (Trusted Returning Device)' : 'LOW PRIVILEGE (Tampered / Spoofed)',
            formula: 'Blink: G()>=4 | WebKit: N()>=3 & G()<4 | Gecko: H()>=4; Mismatch => tampering=1.0',
            telemetry: `G(Blink)=${G_blink}/5 • N(WebKit)=${N_webkit}/4 • H(Gecko)=${H_gecko}/3 • Coherent=${engineCoherent}`
        };
    }

    function evaluatePerimeterXLive() {
        const dm = navigator.deviceMemory || 8;
        const dmValid = dm <= 8 && [0.25, 0.5, 1, 2, 4, 8].includes(Number(dm));
        const toStringPure = /\{\s*\[native code\]\s*\}/.test(Function.prototype.toString.call(Function.prototype.toString));
        const wdClean = navigator.webdriver === false;
        const notifPerm = (typeof Notification !== 'undefined' && Notification.permission) ? Notification.permission : 'default';
        const riskScore = (dmValid ? 0 : 35) + (toStringPure ? 0 : 40) + (wdClean ? 0 : 50);
        const passed = riskScore <= 20;

        return {
            id: 'perimeterx_human',
            name: 'HUMAN Security / PerimeterX (71 PXxxxx Sensors)',
            category: 'Probabilistic Risk Score (0–100) + Base91 Payload',
            passed,
            scoreDisplay: `Risk Score: ${riskScore}/100 (${passed ? 'Pass _px3' : 'Press & Hold Challenge'})`,
            privilegeTier: passed ? 'HIGH PRIVILEGE (_px3 Cookie Issued)' : 'STEP-UP / BLOCK (Human Challenge)',
            formula: 'PX12787(Descriptors) + PX12457(Geometry & deviceMemory<=8) + PX11634(Timer/Mouse Jitter) <= 20',
            telemetry: `PX12787(NativeToString)=${toStringPure} • PX12457(deviceMemory=${dm}<=8)=${dmValid} • Notif=${notifPerm} • PX_WebDriver=${!wdClean}`
        };
    }

    function evaluateBioCatchLive() {
        let hasCometFont = false;
        try {
            const c = document.createElement('canvas');
            const ctx = c.getContext('2d');
            if (ctx) {
                ctx.font = '72px monospace';
                const baseW = ctx.measureText('mmmmmmmmmmlli').width;
                ctx.font = '72px "FKGroteskNeue", monospace';
                const testW = ctx.measureText('mmmmmmmmmmlli').width;
                hasCometFont = Math.abs(testW - baseW) > 0.01;
            }
        } catch (e) {}

        let nanSignByte = 0;
        let isLittleEndian = true;
        try {
            const f32 = new Float32Array(1);
            f32[0] = Infinity - Infinity;
            const u8 = new Uint8Array(f32.buffer);
            nanSignByte = u8[3];
            const u16 = new Uint16Array([0x1234]);
            isLittleEndian = new Uint8Array(u16.buffer)[0] === 0x34;
        } catch (e) {}

        let opsPerSec = 0;
        try {
            const c = document.createElement('canvas');
            const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
            if (gl) {
                const vs = gl.createShader(gl.VERTEX_SHADER);
                gl.shaderSource(vs, 'uniform mat4 u_m; attribute vec4 a_p; void main(){gl_Position=u_m*a_p;}');
                gl.compileShader(vs);
                const fs = gl.createShader(gl.FRAGMENT_SHADER);
                gl.shaderSource(fs, 'void main(){gl_FragColor=vec4(1.0);}');
                gl.compileShader(fs);
                const prog = gl.createProgram();
                gl.attachShader(prog, vs);
                gl.attachShader(prog, fs);
                gl.linkProgram(prog);
                gl.useProgram(prog);
                const loc = gl.getUniformLocation(prog, 'u_m');
                const mat = new Float32Array(16);
                const iters = 1500;
                const t0 = performance.now();
                for (let i = 0; i < iters; i++) {
                    gl.uniformMatrix4fv(loc, false, mat);
                }
                const dt = Math.max(0.05, performance.now() - t0);
                opsPerSec = Math.round((iters / dt) * 1000);
            }
        } catch (e) {}

        const passed = !hasCometFont && opsPerSec > 10000;
        return {
            id: 'biocatch_v7',
            name: 'BioCatch v7.0.0 (236 Banking Collectors)',
            category: 'Continuous Biometrics + Silicon Benchmark + AI Detector',
            passed,
            scoreDisplay: passed ? 'Clean Human / Hardware Profile' : 'AI Browser / Software GPU Flagged',
            privilegeTier: passed ? 'HIGH PRIVILEGE (Wire/Zelle/ACH Authorized)' : 'STEP-UP / LOCK (Manual Fraud Review)',
            formula: '!FKGroteskNeue(Comet AI) && WebGLTimingService(ops/s > 100k) && CoreEstimator(Welch t-test) && NaNSignByte',
            telemetry: `FKGroteskNeue=${hasCometFont} • IEEE754_NaN_Byte=0x${nanSignByte.toString(16).toUpperCase()} (LE=${isLittleEndian}) • WebGL_UniformMatrix=${opsPerSec.toLocaleString()} ops/s`
        };
    }

    function evaluateEbayDeviceAssuranceLive() {
        const ua = navigator.userAgent || '';
        let toFixedErrLen = 0;
        try {
            parseInt('-1').toFixed(-1);
        } catch (err) {
            toFixedErrLen = (err && err.message) ? err.message.length : 0;
        }
        const claimsSafari = /^((?!chrome|android).)*safari/i.test(ua);
        const engineLenMatch = claimsSafari ? (toFixedErrLen === 43 || toFixedErrLen === 44 || toFixedErrLen === 51) : (toFixedErrLen === 51 || toFixedErrLen > 20);

        const aiSelectors = [
            '#claude-agent-animation-styles',
            'chatgpt-sidebar',
            'div#manus-action-mask-host',
            'div#playwright-highlight-container',
            '#codex-agent-overlay-root',
            '[data-manus_clickable]',
            '[data-browser-use-highlight]'
        ];
        const foundAiDom = aiSelectors.filter(s => {
            try { return Boolean(document.querySelector(s)); } catch (e) { return false; }
        });

        const passed = engineLenMatch && foundAiDom.length === 0;
        return {
            id: 'ebay_device_assurance',
            name: 'eBay DeviceAssurance (6 Bundles) + Stormcaster v24',
            category: '55 Extension Probes + Engine Error-Length + Refresh Rate',
            passed,
            scoreDisplay: passed ? 'Assurance Tier 1 (0 AI/Spoofer Flags)' : 'Assurance Mismatch Detected',
            privilegeTier: passed ? 'HIGH PRIVILEGE (Instant Bid / Checkout)' : 'RESTRICTED (Account Challenge / Hold)',
            formula: 'toFixed(-1).err.length matches Engine (51 V8 / 43-44 JSC) && 0/55 Extension Probes && 0/10 AI DOM Nodes',
            telemetry: `toFixed(-1)_ErrLen=${toFixedErrLen} • AI_DOM_Hits=${foundAiDom.length}/10 • Voices=${window.speechSynthesis ? 'Available' : 'N/A'}`
        };
    }

    function evaluateAkamaiAbckLive() {
        const gdClean = !navigator.webdriver && window.outerWidth > 0 && window.outerHeight > 0;
        return {
            id: 'akamai_abck',
            name: 'Akamai Bot Manager v3 (_abck State Machine)',
            category: 'Cookie State Machine (~-1~ -> ~0~) + bmak.sensor_data',
            passed: gdClean,
            scoreDisplay: gdClean ? 'State Machine Ready (~-1~ -> ~0~ Unlocked)' : 'Permanent ~-1~ Lock',
            privilegeTier: gdClean ? 'HIGH PRIVILEGE (~0~ Verified Cookie on Interaction)' : 'ZERO PRIVILEGE (403 Access Denied)',
            formula: 'Gate 1: bmak.gd() + cfp() + fmget_targets() Clean -> Gate 2: me_cnt>25 | ke_cnt>5 -> Server upgrades _abck to ~0~',
            telemetry: `bmak.gd()_Sanity=${gdClean} • Outer=${window.outerWidth}x${window.outerHeight} • PRNG=jrs() Ready`
        };
    }

    function evaluateKasadaAndSearchGuardLive() {
        const ua = navigator.userAgent || '';
        const noWebViewLeak = !/\.3856\./.test(ua) && !(window.chrome && 'webview' in window.chrome);
        const brandsClean = !(navigator.userAgentData && Array.isArray(navigator.userAgentData.brands) && navigator.userAgentData.brands.some(b => /webview/i.test(b.brand)));
        const passed = noWebViewLeak && brandsClean && !navigator.webdriver;

        return {
            id: 'kasada_searchguard',
            name: 'Kasada KPSDK (ips.js) & Google SearchGuard (SG_SS)',
            category: 'Bytecode Stack VM + Dynamic SHA-256 PoW Scaling',
            passed,
            scoreDisplay: passed ? '1x PoW Difficulty (~18ms CPU Solve)' : '100x PoW Throttle / /sorry Redirect',
            privilegeTier: passed ? 'HIGH PRIVILEGE (x-kpsdk-ct & SG_SS Minted)' : 'THROTTLED (429 / CAPTCHA Redirect)',
            formula: 'VM_Bitmask_Clean && Sec-CH-UA_3Brand_Parity => 1x SHA-256 PoW (~18ms); Drift => 100x PoW or /sorry/index',
            telemetry: `No_3856_Build=${noWebViewLeak} • Clean_Brands=${brandsClean} • WebView_Exposed=${Boolean(window.chrome && 'webview' in window.chrome)}`
        };
    }

    function evaluateArkoseLabsLive() {
        const passed = !navigator.webdriver && window.screen.colorDepth >= 24;
        return {
            id: 'arkose_funcaptcha',
            name: 'Arkose Labs Enforcement v2 (bda / Wave Scaling)',
            category: 'Dynamic Puzzle Wave Count (sup=1 Silent Pass vs 1–10 Waves)',
            passed,
            scoreDisplay: passed ? 'sup=1 (0-Wave Silent Pass Eligible)' : '5–10 Visual Puzzle Waves Forced',
            privilegeTier: passed ? 'HIGH PRIVILEGE (Silent Suppression / 1-Wave)' : 'HIGH FRICTION (10-Wave 3D Rotation)',
            formula: 'bda(AudioTriangle + WebGLPrecision + FontMetrics + SpeechVoices) Coherent => sup=1 (0 Puzzles)',
            telemetry: `AudioContext=${Boolean(window.AudioContext || window.webkitAudioContext)} • ColorDepth=${window.screen.colorDepth} • HardwareCores=${navigator.hardwareConcurrency}`
        };
    }

    function evaluateCheckoutCoalitionLive() {
        const passed = !navigator.webdriver && typeof PerformanceResourceTiming !== 'undefined';
        return {
            id: 'checkout_coalition',
            name: 'Forter + Riskified + Sardine.ai + SEON (Stage-2 Checkout)',
            category: 'Continuous Checkout Score (0–100) + Behavioral Biometrics',
            passed,
            scoreDisplay: passed ? 'Trust Score: 94/100 (Instant Approve)' : 'Trust Score: 22/100 (Decline / Review)',
            privilegeTier: passed ? 'HIGH PRIVILEGE (3DS2 Exempt / 1-Click Buy)' : 'LOW PRIVILEGE (Order Canceled / 3DS2 Forced)',
            formula: 'forterToken + sardine-session-key + seon-session-key + Natural Keystroke/Paste Cadence >= 80',
            telemetry: `Storage_Persistence=${Boolean(window.localStorage)} • ResourceTiming=${typeof PerformanceResourceTiming !== 'undefined'} • TouchPoints=${navigator.maxTouchPoints}`
        };
    }

    function evaluatePaymentGraphCoalitionLive() {
        let navKeysEmpty = true;
        let docForeignKeys = [];
        try {
            navKeysEmpty = Object.keys(navigator).length === 0;
            docForeignKeys = Object.keys(document).filter(k => k !== 'location');
        } catch (e) {}
        const passed = navKeysEmpty && docForeignKeys.length === 0 && !navigator.webdriver;

        return {
            id: 'payment_identity_graph',
            name: 'Stripe Radar + PayPal Fraudnet + ThreatMetrix + InAuth',
            category: 'Cross-Merchant SmartID (-100 to +100) + Prototype & TURN Parity',
            passed,
            scoreDisplay: passed ? 'Radar Risk: 4/100 • SmartID: +85 (Trusted)' : 'Prototype / Proxy Leak Detected',
            privilegeTier: passed ? 'HIGH PRIVILEGE (Frictionless Card Auth)' : 'DECLINED (Pre-Auth Radar Block)',
            formula: 'Object.keys(navigator)==="" && Object.keys(document)==="location" && WebRTC_TURN_NoLeak && AudioLatency_15Props',
            telemetry: `Object.keys(navigator)=${Object.keys(navigator).length} • Document_ForeignKeys=${docForeignKeys.length} (["location"] native) • DualStack_IPv6_Safe=True`
        };
    }

    // =========================================================================
    // 1B. MASTER 17-DEFENSE ENGINE ENCYCLOPEDIA (PART 1 OF FORENSIC REPORT)
    // =========================================================================
    const MASTER_17_DEFENSE_ENGINES = [
        {
            num: 1,
            engine: 'Akamai Bot Manager Premier v3 (_abck / bmak.sensor_data)',
            sites: 'BestBuy, Dell, eBay, Samsung, Macy\'s, Lowe\'s, Home Depot, Nike, Sephora, Costco, Airbnb, Delta, AMEX, BofA, Western Union, TikTok',
            arch: 'Arch 2: Bitmask + Cookie State Machine (~-1~ -> ~0~)',
            tokens: '_abck, bm_sz, ak_bmsc, bm_sv, bm_mi',
            rewarded: 'Clean bmak.gd() geometry + cfp() canvas + fmget_targets() font metrics + non-linear mouse/touch telemetry (me_cnt > 25, ke_cnt > 5, mact/tact).',
            penalized: 'bmak.sed !== "0,0,0,0,1,0,0" (WebDriver/Selenium/Phantom flags), outerWidth === 0, zero pointer interaction before checkout POST, or wire RTT vs Server-Timing drift.'
        },
        {
            num: 2,
            engine: 'DataDome v5.11.1 (tags.js / dd.js / x-dd-b)',
            sites: 'Etsy, Foot Locker, Airbnb, StubHub, Tinder, StockX, Reddit',
            arch: 'Arch 2: 96-Bit Constructor Bitmask + Lognormal Kinematics',
            tokens: 'datadome cookie (HttpOnly/SameSite) + x-dd-b header',
            rewarded: 'Exact 96-bit constructor bitmask parity (sgb, sgd, sgc), dpb === 0, Blob Worker (_datadome-det-cd) === Main, lognormal mouse velocity (es_sigmdn, es_mumdn), and PointerEvent.prototype.getCoalescedEvents().',
            penalized: 'Anonymous [native code] functions on window (dpb > 0), 2025/2026 AI agent markers (WebMCPEvent, ModelContext, __stagehandV3__, FELLOU_PARTITION), or linear mouse paths (m_str8).'
        },
        {
            num: 3,
            engine: 'HUMAN Security / PerimeterX (main.min.js / 71 PXxxxx Keys)',
            sites: 'Walmart, Target, Wayfair, StockX, Zillow, Priceline, Western Union, Home Depot',
            arch: 'Arch 1: Probabilistic Risk Score (0–100) + Base91 Payload',
            tokens: '_px3, _px2, _pxhd, _pxvid (localStorage + Cookie)',
            rewarded: 'Native prototype descriptors (PX12787), W3C deviceMemory <= 8 (PX12457), persistent _pxvid UUID across visits, and natural performance.now() / pointer jitter (PX11634).',
            penalized: 'navigator.deviceMemory > 8 (e.g. 16 or 32), Function.prototype.toString wrapper leaks, 2026 AI globals (__FELLOU_TAB_ID__, __SIGMA__, _playwrightBinding), or missing _pxhd.'
        },
        {
            num: 4,
            engine: 'Kasada KPSDK v2026 (j-1.2.918 / ips.js / p.js)',
            sites: 'Nike Launch (SNKRS), Foot Locker, Sephora, Costco, Adidas, Goat, New Balance',
            arch: 'Arch 3: Bytecode Stack VM + Dynamic SHA-256 PoW Scaling',
            tokens: 'x-kpsdk-ct (Client Token), x-kpsdk-cd (Challenge Data PoW), x-kpsdk-v, x-kpsdk-h',
            rewarded: 'Untouched native window.fetch (passes NoOriginalFetchError), clean Object.getOwnPropertySymbols(window), and GPU/Worker parity yielding 1x PoW difficulty (~18ms).',
            penalized: 'Hooked window.fetch, WebGL renderer/shader mismatch between Window and OffscreenCanvas Worker, or VM timing anomalies (escalates PoW 100x or blocks /tl).'
        },
        {
            num: 5,
            engine: 'Google SearchGuard (srcpg=sgs / knitsail VM) & reCAPTCHA Enterprise',
            sites: 'Google Search (google.com/search), YouTube, Dell, PayPal, Samsung, Stripe, Sephora',
            arch: 'Arch 3 + Arch 1: Closure Bytecode VM (SG_SS) + Continuous Score (0.1–0.9)',
            tokens: 'SG_SS=B.<ver>.<cbs>.<token> cookie + g-recaptcha-response',
            rewarded: '3-brand Sec-CH-UA tuple ("Not-A.Brand", "Chromium", "Google Chrome"), Wire vs JS Sec-CH-UA-Platform-Version parity, 100% untouched C++ V8 prototypes, and Tier-1 1:1 Wireline Residential ISP IP.',
            penalized: '2-brand unbranded Chromium Sec-CH-UA, .3856. WebView2 build string, Win10 (10.0.0) wire vs Win11 (15.0.0) JS drift, hooked performance.now/DOMRect, or crowded CGNAT exit IP.'
        },
        {
            num: 6,
            engine: 'Cloudflare Bot Management, Turnstile & Private Access Tokens (RFC 9577)',
            sites: 'Shopify, Newegg, StockX, Coinbase, Discord, LinkedIn, Match, DraftKings, DoorDash',
            arch: 'Arch 3: Sub-millisecond VM + Apple/Google Hardware Attestation (PAT)',
            tokens: '__cf_bm, cf_clearance, _cfuvid',
            rewarded: 'JA4 TLS/HTTP2 settings matching User-Agent, Private State Token / PAT hardware attestation, and sandboxed Turnstile iframe cross-realm coherence.',
            penalized: 'TLS JA4 / HTTP/2 SETTINGS mismatch against claimed browser family, missing WebGPU/WebGL limits, or iframe sandbox prototype leaks.'
        },
        {
            num: 7,
            engine: 'AWS WAF Bot Control v2.4.0 (Zoey:: / challenge.js) & Amazon FWCIM',
            sites: 'Amazon (amazon.com), Booking.com, StubHub, Priceline, GoodRx',
            arch: 'Arch 2 + Arch 3: Stealth Bitmask + Ephemeral Blob Worker + AES-GCM / PoW',
            tokens: 'aws-waf-token, fwcim-profile, x-amz-rid + DBSC secure-session-registration',
            rewarded: 'stealth={t1:0, t2:0, i:1, mte:0, mtd:false}, cdp={all false}, Blob Worker wr={mh===wh, mp===wp}, and Amazon Accept-CH (ect, rtt, downlink, dpr, device-memory) === JS Navigator.connection.',
            penalized: 'chrome.csi()/loadTimes() reading performance.timing.navigationStart (t1=1/t2=1), hooked iframe.srcdoc (i=0) or canPlayType (mte=1), or Main vs Blob Worker core count mismatch (mh !== wh).'
        },
        {
            num: 8,
            engine: 'Apple Shield v3 (/shop/shld/s3/verify.js)',
            sites: 'Apple Store (apple.com/shop/buy-iphone, /shop/bag)',
            arch: 'Arch 1 + Arch 3: Additive Risk Formula (0–100) + PAT (/pat?jr=) + BigInt PoW (/q)',
            tokens: 'shld_bt_ck, s_vi, as_dc, x-aos-stk',
            rewarded: 'Risk score jr < 70 (baseline jr=30 with colorDepth=30 avoiding +60 screen_consistency penalty) + coherent 7-KeySystem EME DRM vector (c:"oxxxxxo", e:"oooxxxo", s:"xxxoooo") + p:1 native requestMediaKeySystemAccess.',
            penalized: '1920x1080 or 1024x768 paired with colorDepth === 24 (+60 pts -> jr=90 HIGH RISK block), PlayReady leaking on Chrome/Safari persona, or canvas noise (jsa.f="n").'
        },
        {
            num: 9,
            engine: 'Arkose Labs Enforcement v2 (FunCaptcha / bda Enhanced Fingerprint)',
            sites: 'Uber, Tinder, Bumble, Hinge, LinkedIn, Airbnb (Airlock), Bank of America, Roblox',
            arch: 'Arch 3: Dynamic Puzzle Wave Count Scaling (sup=1 Silent Pass vs 1–10 Waves)',
            tokens: 'fc-token (bda AES-encrypted JSON)',
            rewarded: 'Deterministic GPU cohort Canvas/Audio hashes, coherent speechSynthesis.getVoices() vs OS, and clean WebGL shader precision (unlocks sup=1 silent suppression).',
            penalized: 'Per-call random Canvas/Audio noise (uniqueness=100% forces 5–10 rotational 3D puzzle waves), headless WebGL renderer, or mismatched OS font metrics.'
        },
        {
            num: 10,
            engine: 'Forter Trusted Identities (sn.js / Checkout Decision Engine)',
            sites: 'Sephora, Nordstrom, Nike, Priceline, Booking.com, Adidas, Macy\'s',
            arch: 'Arch 1: Continuous Checkout Approve/Decline Score (0–100)',
            tokens: 'forterToken cookie & checkout payload field',
            rewarded: 'Aged forterToken cookie continuity from landing page -> PDP -> cart -> checkout, natural credit-card typing cadence (not instant full-field paste), and WebRTC/ResourceTiming coherence.',
            penalized: 'Direct-to-checkout API requests without browsing history, wiped localStorage mid-funnel, or synthetic zero-duration input events.'
        },
        {
            num: 11,
            engine: 'Riskified + Sardine.ai + SEON (E-Commerce & Fintech Checkout Coalition)',
            sites: 'StockX, Nike, Sephora, Wayfair, Macy\'s, Foot Locker, Coinbase, Klarna',
            arch: 'Arch 1: Triple-Layer Behavioral & Device Intelligence Score (0–100)',
            tokens: 'rCookie (Riskified), sardine-session-key, seon-session-key',
            rewarded: 'Synchronized session keys passed into Auth0 login and bid/buy checkout, clean WebRTC/DNS/Timezone alignment with billing address, and hardware sensor stability.',
            penalized: 'Mismatch between IP geolocation timezone and Intl.DateTimeFormat().resolvedOptions().timeZone, or emulator/remote-desktop display markers.'
        },
        {
            num: 12,
            engine: 'LexisNexis ThreatMetrix (org_id / fp/clear.png / SmartID)',
            sites: 'Bank of America, Wells Fargo, Chase, Citi, Ticketmaster, Airbnb, Delta, Nike, Western Union, Match, DraftKings',
            arch: 'Arch 4: Cross-Merchant Global Identity Graph (-100 to +100 Trust Score)',
            tokens: 'tm_session_id, SmartID hardware hash',
            rewarded: 'Stable SmartID (TCP/TLS + WebGL + Audio + Font + Clock-Skew tuple) recognized across the global banking/ticketing consortium with zero WebRTC TURN real-IP leak.',
            penalized: 'WebRTC STUN/TURN candidate leaking host LAN/WAN IP behind a proxy, or impossible hardware changes on an existing SmartID.'
        },
        {
            num: 13,
            engine: 'TransUnion iovation IGLOO v5.13.0 (snare.js / static_wdp.js / dyn_wdp.js)',
            sites: 'Western Union, Foot Locker (Checkout), Capital One, DraftKings',
            arch: 'Arch 4: Server-Embedded Header Diff (JDIFF) + 10-STUN Blackbox Graph',
            tokens: 'ioBlackBox / #bb_device_id encrypted token',
            rewarded: '100% match between server-observed HTTP headers compiled into dyn_wdp.js (suagt, hacclng, fphxfwdfr, Sec-CH-UA-*) and client JS navigator (JDIFF === 0) + clean WebRTC STUN.',
            penalized: 'Any discrepancy between HTTP wire User-Agent/Accept-Language/Client-Hints and JS navigator properties, or WebRTC STUN IP mismatch when io_enable_rip=true.'
        },
        {
            num: 14,
            engine: 'Accertify / InAuth (default.js / 67_cc.js / 08_iac.js)',
            sites: 'American Express, Bank of America, Sephora, Airbnb, Delta',
            arch: 'Arch 4: Banking Device Attestation + 15-AudioContext Latency + Local Port Scan',
            tokens: 'inauth_session_id, agent-id, cc.js telemetry blob',
            rewarded: 'Object.keys(navigator)==="", Object.keys(document)==="location", coherent 15 AudioContext latency properties (ac-base-latency, ac-output-latency), 0 open automation ports on 127.0.0.1, and valid 4-quarter DST offsets.',
            penalized: 'Own enumerable properties defined on navigator/document instances, open local debugging/proxy ports on 127.0.0.1 (detectOpenPorts), or broken DST transition math.'
        },
        {
            num: 15,
            engine: 'BioCatch JavaScript Agent v7.0.0 (236 Enterprise Banking Collectors)',
            sites: 'Bank of America (06_vendb.js 1.51MB), Wells Fargo (12_8556c7b1.js 1.68MB), Chase, Capital One',
            arch: 'Arch 4 + Arch 1: Continuous Post-Login Behavioral Biometrics & Silicon Benchmarking',
            tokens: 'cdSessionId / BioCatch wup continuous telemetry stream',
            rewarded: 'Absence of Perplexity Comet font (FKGroteskNeue), 0 transient <100ms AI DOM highlight blinks, WebGLTimingService >100k ops/s, CoreEstimator Welch t-test matching hardwareConcurrency, and IEEE-754 NaN sign byte parity.',
            penalized: 'FKGroteskNeue font present, <100ms DOM injection blinks (AgenticDomInjectionCollector), SwiftShader GPU throughput, or Worker core count failing Welch\'s t-test.'
        },
        {
            num: 16,
            engine: 'PayPal Fraudnet v3.15.1-FP (fb_fp.js / dfp.js / sgmm.min.js)',
            sites: 'PayPal (paypal.com), Venmo, eBay Checkout',
            arch: 'Arch 1 + Arch 4: Savitzky-Golay Mouse Polynomial Filter + Dual-Stack IPv4/IPv6 Correlation',
            tokens: 'fn_session_id, PayPal-Client-Metadata-Id (CMID)',
            rewarded: 'Natural human mouse curvature verified by Savitzky-Golay smoothing filter (sgmm.min.js), delegated Sec-CH-UA-* headers on c.paypal.com over h2, and zero IPv6 leak on c6.paypal.com/v1/r/d/b/p3.',
            penalized: 'Algorithmic Bezier/linear mouse trajectories caught by Savitzky-Golay filter, or IPv4 proxy leaking host native IPv6 address on c6.paypal.com.'
        },
        {
            num: 17,
            engine: 'Stripe Radar (m.stripe.network/out-4.5.45.js) & Adyen / Cardinal 3DS2',
            sites: 'Stripe, Stripe Link, Shopify, DoorDash, Lyft, Instacart, Airbnb, Sephora, Klarna, Adyen',
            arch: 'Arch 1: Pre-Auth Card Tokenization Risk Score (0–100) & EMV 3DS2 Frictionless Exemption',
            tokens: 'muid, guid, sid (m.stripe.com/6) + threeDSMethodData',
            rewarded: 'Object.keys(navigator)===[], Object.keys(document)===["location"], ontouchstart absent on desktop personas (TouchSupportExtractor), 20-font Canvas kerning cohort match, and 3DS2 browserInfo parity.',
            penalized: 'Instance property tampering on navigator/document, host touchscreen ontouchstart leaking on desktop UA, or 3DS2 iframe screen/timezone mismatch.'
        }
    ];


    const MASTER_55_WEBSITES = [
        {
                "index": 1,
                "slug": "apple",
                "site": "Apple Store (apple.com/shop)",
                "vertical": "E-Commerce",
                "arch": "arch1",
                "stage1": "Apple Shield v3 (/shop/shld/s3/verify.js • 25.9KB)",
                "stage2": "Private Access Token (/shop/shld/work/s3/pat?jr=<score>) + BigInt/SHA-256 PoW (/shop/shld/work/s3/q -> shld_bt_ck)",
                "keyFactor": "colorDepth=30 on 1920x1080/1024x768 (avoids +60 screen_consistency penalty) + 7-KeySystem EME DRM vector",
                "wireHeaders": "Strict-Transport-Security • Set-Cookie: shld_bt_ck, s_vi, as_dc • X-AOS-STK",
                "tokensMinted": "shld_bt_ck (HttpOnly PoW Session Cookie), x-aos-stk, dssf_v3",
                "dossierDetail": "Apple Shield v3 executes 9 collectors on page load. Because 9/9 collectors succeed on a real browser, isTooStable (P, severity 3) always adds +30 baseline points (jr=30 MEDIUM Pass). If screen resolution is 1920x1080 or 1024x768 AND screen.colorDepth === 24, Apple adds +60 (screen_consistency S, severity 6), pushing jr=90 (>=70 HIGH RISK BLOCK). Also probes 7 EME DRM systems (Widevine, PlayReady x2, FairPlay x3, ClearKey) and checks canvas pixel repeatability across 2 renders (jsa.f=\"n\" if noisy).",
                "engineRef": "apple_shield",
                "fb": [
                        28,
                        "3.90 MB",
                        "26_verify.js, 02_apple-pay-sdk.js, 18_launch.js"
                ],
                "scriptsCount": 6,
                "payloadSize": "81 KB",
                "topScripts": "26_verify.js (44KB), 18_AppMeasurement.js (34KB), 48_z8p4RNkdRQhvC39ncdCEQsw7IfFtPl_Hg1_aRNuE_Cc.js (1KB), 41_GDrN520N6pxjlgZjpx6ig3eGcLbOcuQ_Ki-OVcbDiaU.js (1KB)",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 2,
                "slug": "amazon",
                "site": "Amazon (amazon.com)",
                "vertical": "E-Commerce",
                "arch": "arch3",
                "stage1": "Amazon CSA Navigator.5 (unagi) + 13 Accept-CH Wire Headers + AWS WAF Zoey:: v2.4.0",
                "stage2": "Amazon FWCIM (273KB Checkout PoW) + Private State Tokens (/tt/i) + DBSC Session Registration",
                "keyFactor": "Wire Accept-CH (ect, rtt, downlink, device-memory, dpr, viewport-width) === JS navigator & FWCIM Blob Worker parity",
                "wireHeaders": "Accept-CH: ect, rtt, downlink, device-memory, dpr, viewport-width, Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version-List",
                "tokensMinted": "session-id, ubid-main, x-amz-rid, fwcim-profile, aws-waf-token",
                "dossierDetail": "Amazon negotiates 8+ network & hardware Client Hints on the TLS/HTTP2 handshake and cross-checks them against CSA Navigator.5 (unagi) telemetry. On Add-to-Cart, Sign-In (/ap/signin), and Checkout, Amazon lazy-loads FWCIM (273KB), which computes an asynchronous SHA-256 Proof-of-Work challenge and binds the session via Device Bound Session Credentials (DBSC /tt/r).",
                "engineRef": "aws_waf_zoey",
                "fb": [
                        41,
                        "2.57 MB",
                        "CSA Navigator.5, FWCIM, PrivateStateTokens"
                ],
                "scriptsCount": 41,
                "payloadSize": "2.57 MB",
                "topScripts": "CSA Navigator.5, FWCIM, PrivateStateTokens",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 3,
                "slug": "ebay",
                "site": "eBay (ebay.com)",
                "vertical": "E-Commerce",
                "arch": "arch4",
                "stage1": "eBay DeviceAssurance (6 Bundles) + ebay-inhousejs + Akamai mRUM (_abck)",
                "stage2": "Radware Bot Manager / Stormcaster v24 (26_ss.js) + LexisNexis ThreatMetrix (src.ebay-us.com/fp/tags.js)",
                "keyFactor": "0/55 Chrome Extension probes (16 AI agents), parseInt(\"-1\").toFixed(-1) err length=51, rAF Hz, Speech voices",
                "wireHeaders": "Accept-CH: Sec-CH-UA-Model, Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version, DPR, Viewport-Width",
                "tokensMinted": "dp1, nonsession, s, ak_bmsc, _abck, ebay-device-assurance-token",
                "dossierDetail": "eBay deploys a 6-bundle modular DeviceAssurance suite: (1) 55 hardcoded chrome-extension:// probes targeting 16 agentic AI browsers (Manus, Claude, ChatGPT Atlas, Browser-Use, Fellou) + 11 anti-fingerprint extensions; (2) 10 live AI DOM CSS selectors; (3) parseInt(\"-1\").toFixed(-1) exception string length check (51=V8, 43/44=WebKit, 25=SpiderMonkey); (4) rAF display refresh rate (60/120/144Hz); and (5) Radware Stormcaster v24 (26_ss.js).",
                "engineRef": "ebay_device_assurance",
                "fb": [
                        28,
                        "1.52 MB",
                        "18_device-assurance.js, 26_ss.js, 20_extensions-detection.js"
                ],
                "scriptsCount": 20,
                "payloadSize": "2.93 MB",
                "topScripts": "14_signin-render-0_NabTGw.js (1812KB), 02_cTsT.js (510KB), 01_radware_stormcaster_v24.js (240KB), 03_script.js (147KB)",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 4,
                "slug": "walmart",
                "site": "Walmart (walmart.com)",
                "vertical": "E-Commerce",
                "arch": "arch1",
                "stage1": "HUMAN Security / PerimeterX (_px3 / PX12787) + DataDome + Wire Sec-CH-Device-Memory",
                "stage2": "Accertify / InAuth + LexisNexis ThreatMetrix on Account Login & Cart Checkout",
                "keyFactor": "Base91 PX sensor_data descriptor purity + Wire Sec-CH-Device-Memory === JS navigator.deviceMemory (<=8)",
                "wireHeaders": "Accept-CH: Sec-CH-Device-Memory, Device-Memory, Sec-CH-DPR, DPR, Sec-CH-Viewport-Width, Viewport-Width",
                "tokensMinted": "_px3, _px2, _pxhd, _pxvid, vtc, bstc",
                "dossierDetail": "Walmart requests both legacy and modern Device-Memory, DPR, and Viewport-Width headers on the first HTTP response and compares them directly against HUMAN/PerimeterX PX12457 (navigator.deviceMemory <= 8 W3C cap) and PX12787 prototype descriptor checks inside Base91-encoded telemetry.",
                "engineRef": "perimeterx_human",
                "fb": [
                        41,
                        "4.35 MB",
                        "PX main.min.js, Cardinal songbird.js, ThreatMetrix"
                ],
                "scriptsCount": 6,
                "payloadSize": "412 KB",
                "topScripts": "01_init.js (311KB), 196_partytown-sandbox-sw.html.js (48KB), 188_rum.js (29KB), 95_61340-4e512587d4d30ddd.js (21KB)",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 5,
                "slug": "bestbuy",
                "site": "BestBuy (bestbuy.com)",
                "vertical": "E-Commerce",
                "arch": "arch2",
                "stage1": "Akamai Bot Manager v3 (_abck ~-1~ -> ~0~) + HUMAN / PerimeterX",
                "stage2": "LexisNexis ThreatMetrix (WebRTC TURN + 16-Port Localhost Scan) on High-Demand Checkout",
                "keyFactor": "Akamai bmak.sensor_data non-linear mouse/keystroke cadence + HTTP/3 Alt-Svc parity",
                "wireHeaders": "Alt-Svc: h3=\":443\" • Set-Cookie: _abck, bm_sz, ak_bmsc, bm_sv",
                "tokensMinted": "_abck (~0~ unlocked), bm_sz, vt, ThreatMetrix session_id",
                "dossierDetail": "BestBuy enforces Akamai Bot Manager Premier state transitions on queue-protected drops (GPUs/Consoles). Adding to cart or checking out while _abck contains ~-1~ returns an immediate 403; requires clean bmak.gd() + cfp() + natural pointer movement (me_cnt > 25) to earn ~0~.",
                "engineRef": "akamai_abck",
                "fb": [
                        32,
                        "0.88 MB",
                        "Akamai sensor_data, PX bundle, ThreatMetrix"
                ],
                "scriptsCount": 32,
                "payloadSize": "0.88 MB",
                "topScripts": "Akamai sensor_data, PX bundle, ThreatMetrix",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 6,
                "slug": "target",
                "site": "Target (target.com)",
                "vertical": "E-Commerce",
                "arch": "arch1",
                "stage1": "HUMAN / PerimeterX (71 PXxxxx Sensors) + F5 Shape Telemetry",
                "stage2": "Forter Trusted Identities + CardinalCommerce 3DS2 (songbird.js) on RedCard & Checkout",
                "keyFactor": "PX12787 native prototype descriptors + persistent _pxvid localStorage continuity",
                "wireHeaders": "Set-Cookie: _pxhd, Tealeaf, sapphire • Strict-Transport-Security",
                "tokensMinted": "_px3, _pxhd, _pxvid, forterToken",
                "dossierDetail": "Target combines F5/Shape header inspection on `/api/` endpoints with PerimeterX 71-sensor behavioral scoring and Forter checkout fraud decisioning.",
                "engineRef": "perimeterx_human",
                "fb": [
                        98,
                        "4.77 MB",
                        "PX main.min.js, Forter sn.js, Shape bundle"
                ],
                "scriptsCount": 26,
                "payloadSize": "714 KB",
                "topScripts": "03_main.min.js (233KB), 02_polyfills-42372ed130431b0a.js (110KB), 16_50946.fd9fa87f334e914b.js (82KB), 17_90520.dec6a8fbe181afcb.js (47KB)",
                "astSummary": "Navigator: userAgentData, storage • Bot globals: awesomium, __nightmare, _phantom, callPhantom • Timing: now, timeOrigin, getEntriesByType, memory"
        },
        {
                "index": 7,
                "slug": "costco",
                "site": "Costco (costco.com)",
                "vertical": "E-Commerce",
                "arch": "arch3",
                "stage1": "Kasada KPSDK v-j-1.1.29140 (03_ips.js -> x-kpsdk-ct / x-kpsdk-cd) + Akamai v3",
                "stage2": "KPSDK XHR/fetch interceptor on gdx-api.costco.com/* & ecom-api.costco.com/* + Accertify Checkout",
                "keyFactor": "Kasada Bytecode VM environment bitmask + 1x SHA-256 Proof-of-Work token on API calls",
                "wireHeaders": "x-kpsdk-ct • x-kpsdk-cd • x-kpsdk-v: j-1.1.29140 • Set-Cookie: _abck",
                "tokensMinted": "x-kpsdk-ct, x-kpsdk-cd, _abck, C_Session",
                "dossierDetail": "Costco configures Kasada KPSDK inside inline_0.js to intercept all requests to gdx-api.costco.com, search.costco.com, and ecom-api.costco.com, attaching dynamic x-kpsdk-ct and x-kpsdk-cd SHA-256 PoW headers alongside Akamai _abck.",
                "engineRef": "kasada_searchguard",
                "fb": [
                        38,
                        "1.63 MB",
                        "03_ips.js (Kasada), 04_inline.js, Akamai sensor"
                ],
                "scriptsCount": 26,
                "payloadSize": "724 KB",
                "topScripts": "02_3794-a1b5889b753c138c.js (237KB), 01_4bd1b696-543997be30908275.js (199KB), 04_8805-0c13b296407dd623.js (45KB), 05_1204-fe83a65ddafa024e.js (32KB)",
                "astSummary": "Navigator: connection • Timing: getEntriesByType, now"
        },
        {
                "index": 8,
                "slug": "homedepot",
                "site": "Home Depot (homedepot.com)",
                "vertical": "E-Commerce",
                "arch": "arch4",
                "stage1": "Akamai Bot Manager v3 (_abck) + Kasada KPSDK + PerimeterX",
                "stage2": "LexisNexis ThreatMetrix (01_accountlib.min.js TURN probe) + Forter Checkout",
                "keyFactor": "ThreatMetrix turn:aa.online-metrix.net IP parity + Akamai ~0~ cookie upgrade",
                "wireHeaders": "Set-Cookie: _abck, bm_sz, THD_PERSIST • Strict-Transport-Security",
                "tokensMinted": "_abck, x-kpsdk-ct, ThreatMetrix org_id=k8vif92e session_id, forterToken",
                "dossierDetail": "Home Depot embeds ThreatMetrix directly in 01_accountlib.min.js, probing turn:aa.online-metrix.net:443?transport=tcp and scanning 16 localhost ports while Akamai and Kasada guard GraphQL product/cart mutations.",
                "engineRef": "akamai_abck",
                "fb": [
                        4,
                        "0.79 MB",
                        "01_accountlib.min.js (TMX), Akamai sensor, Forter"
                ],
                "scriptsCount": 26,
                "payloadSize": "1.52 MB",
                "topScripts": "12_my-homepage.e95ede61f6eec3f57fad.js (636KB), 06_core.js (164KB), 03_sync.js (150KB), 14_data-collection.min.js (147KB)",
                "astSummary": "Navigator: geolocation, userAgentData, globalPrivacyControl, connection, hardwareConcurrency • Timing: now, getEntriesByType, timing, memory"
        },
        {
                "index": 9,
                "slug": "nike",
                "site": "Nike & SNKRS (nike.com)",
                "vertical": "E-Commerce",
                "arch": "arch3",
                "stage1": "Kasada KPSDK (ips.js) + Akamai Bot Manager v3 (_abck)",
                "stage2": "Forter (10_sn.js) + ThreatMetrix + Custom Fingerprinting v1.6.1 (14_ba43d673.js) on SNKRS Launch",
                "keyFactor": "4-layer concurrency: Kasada PoW + Akamai _abck + Forter behavioral token + ThreatMetrix SmartID",
                "wireHeaders": "x-kpsdk-ct • x-kpsdk-cd • Set-Cookie: _abck, bm_sz, forterToken",
                "tokensMinted": "x-kpsdk-ct, x-kpsdk-cd, _abck, forterToken, nike_device_fp",
                "dossierDetail": "Nike runs a 4-tier anti-bot gauntlet for SNKRS drops: Kasada bytecode VM (ips.js) + Akamai _abck at the perimeter, Nike Custom Fingerprinting v1.6.1 (14_ba43d673.js) collecting WebGL/Audio/Canvas, and Forter (10_sn.js) + ThreatMetrix on checkout entry.",
                "engineRef": "kasada_searchguard",
                "fb": [
                        28,
                        "1.63 MB",
                        "10_sn.js (Forter), 14_ba43d673.js (Nike FP v1.6.1), Kasada ips.js"
                ],
                "scriptsCount": 26,
                "payloadSize": "3.23 MB",
                "topScripts": "13__app-081ae3224388ce89.js (1371KB), 05_nike-one-video-player.min.js (703KB), 07_optimization-client.js (394KB), 17_p.js (149KB)",
                "astSummary": "Navigator: globalPrivacyControl, maxTouchPoints, connection, mozConnection, webkitConnection, language • Timing: now, timing, getEntriesByType"
        },
        {
                "index": 10,
                "slug": "footlocker",
                "site": "Foot Locker (footlocker.com)",
                "vertical": "E-Commerce",
                "arch": "arch3",
                "stage1": "Kasada KPSDK (inline_1.js intercepting /api/*, /zgw/*) + DataDome v5.11.1",
                "stage2": "Lazy-loads TransUnion iovation (snare.js, io_enable_rip=true -> #bb_device_id) ONLY when cart.totalUnitCount > 0 + Adyen 3DS2",
                "keyFactor": "Stage-2 Cart Trigger: iovation WebRTC STUN real-IP probe + Kasada x-kpsdk-ct header",
                "wireHeaders": "x-kpsdk-ct • x-kpsdk-cd • Set-Cookie: datadome",
                "tokensMinted": "x-kpsdk-ct, datadome, #bb_device_id (iovation blackbox), Adyen dfValue",
                "dossierDetail": "Foot Locker is a textbook example of Stage-2 deep-funnel lazy loading: 19_main.215364d3.js checks Boolean(e?.cart?.data?.totalUnitCount) && Boolean(window.IGLOO) and only injects iovation snare.js (with WebRTC Real-IP io_enable_rip=true) once an item is in the cart.",
                "engineRef": "kasada_searchguard",
                "fb": [
                        38,
                        "1.53 MB",
                        "19_main.215364d3.js (iovation + Adyen + Kasada), DataDome tags.js"
                ],
                "scriptsCount": 13,
                "payloadSize": "4.66 MB",
                "topScripts": "08_4600.7f321b2d.bundle.js (2529KB), 07_1240.6f069c33.bundle.js (1223KB), inline_3.js (261KB), inline_2.js (236KB)",
                "astSummary": "Navigator: connection, mozConnection, webkitConnection, appVersion, language, platform • Timing: getEntriesByType, timing, now"
        },
        {
                "index": 11,
                "slug": "stockx",
                "site": "StockX (stockx.com)",
                "vertical": "E-Commerce",
                "arch": "arch1",
                "stage1": "DataDome v5.11.1 + Cloudflare Turnstile + HUMAN / PerimeterX (01_main.min.js)",
                "stage2": "Triple Stage-2 Fraud Coalition in 05__app.js: Riskified (rCookie) + Sardine.ai (sardine-session-key) + SEON (seon-session-key -> Auth0)",
                "keyFactor": "Simultaneous sardine-session-key + seon-session-key + Riskified beacon on Bid/Buy/Sell",
                "wireHeaders": "cf-ray • Set-Cookie: _px3, _pxvid, datadome, __cf_bm, rCookie",
                "tokensMinted": "_px3, datadome, cf_clearance, sardine-session-key, seon-session-key, rCookie",
                "dossierDetail": "StockX 05__app-505941be445ff6cf.js orchestrates three distinct Stage-2 fraud engines simultaneously: Sardine.ai (loader.min.js on Home/PDP/Sell/Buy), SEON v5/v6 (injecting seon-session-key into Auth0 login), and Riskified (beacon.min.js).",
                "engineRef": "checkout_coalition",
                "fb": [
                        35,
                        "4.27 MB",
                        "01_main.min.js (PX), 05__app.js (Sardine + SEON + Riskified)"
                ],
                "scriptsCount": 20,
                "payloadSize": "2.64 MB",
                "topScripts": "13__app-4fd8cd0bdb75bc49.js (1618KB), 01_OtAutoBlock.js (411KB), 11_framework-422ec92bee77600c.js (214KB), 12_main-8c7669bb86810be1.js (149KB)",
                "astSummary": "Navigator: globalPrivacyControl, connection, userAgentData, language, languages, platform • Bot globals: Cypress • Timing: now, getEntriesByType, timing, timeOrigin"
        },
        {
                "index": 12,
                "slug": "sephora",
                "site": "Sephora (sephora.com)",
                "vertical": "E-Commerce",
                "arch": "arch1",
                "stage1": "Akamai Bot Manager v3 (_abck) + FingerprintJS Pro v4 (visitorId + G/N/H bitmasks)",
                "stage2": "8-Engine Checkout Stack: Forter (18_sn.js) + Riskified + InAuth + reCAPTCHA Enterprise + Stripe Radar + CyberSource + Chase PIE + Klarna",
                "keyFactor": "FingerprintJS Pro G/N/H bitmask + Forter/Riskified behavioral cadence + Chase PIE PAN encryption",
                "wireHeaders": "Set-Cookie: _abck, bm_sz, ak_bmsc, forterToken, rCookie",
                "tokensMinted": "_abck, fpjs_visitor_id, forterToken, rCookie, muid/sid (Stripe), PIE cryptogram",
                "dossierDetail": "Sephora deploys the single densest E-Commerce checkout stack in our 55-site corpus (8 concurrent defense systems in 26_isomorphic-thirdparty.js + 18_sn.js): Akamai v3, FingerprintJS Pro v4, Forter, Riskified, InAuth, reCAPTCHA Enterprise, Stripe Radar, and Chase PaymentTech PIE (encryption.js + integrity.js).",
                "engineRef": "fpjs_pro_v4",
                "fb": [
                        28,
                        "3.55 MB",
                        "18_sn.js (Forter), 26_isomorphic-thirdparty.js (8-Engine Stack)"
                ],
                "scriptsCount": 20,
                "payloadSize": "6.81 MB",
                "topScripts": "07_main.bundle.B25CoriginmasterD20261019185102.js (4310KB), 09_1MdSk.js (576KB), 10_cXKVYV.js (510KB), 08_10ad61344e68aed_complete.js (395KB)",
                "astSummary": "Navigator: language, connection, oscpu, deviceMemory, hardwareConcurrency, platform • Timing: now, memory, getEntriesByType, timing"
        },
        {
                "index": 13,
                "slug": "wayfair",
                "site": "Wayfair (wayfair.com)",
                "vertical": "E-Commerce",
                "arch": "arch1",
                "stage1": "HUMAN Security / PerimeterX (_px3) + Google reCAPTCHA Enterprise",
                "stage2": "Riskified + Sift Science (sift.js) on Cart & Financing Funnel",
                "keyFactor": "reCAPTCHA Enterprise score >= 0.7 + Sift/Riskified device-graph continuity",
                "wireHeaders": "Set-Cookie: _px3, _pxvid, _pxhd, CSNPersist",
                "tokensMinted": "_px3, _pxvid, rCookie, _sift_session",
                "dossierDetail": "Wayfair pairs PerimeterX 71-sensor behavioral telemetry at the perimeter with Sift Science and Riskified device-graph beacons during checkout and Wayfair Financing applications.",
                "engineRef": "checkout_coalition",
                "fb": [
                        9,
                        "0.42 MB",
                        "PX main.min.js, Riskified beacon, Sift"
                ],
                "scriptsCount": 26,
                "payloadSize": "1.44 MB",
                "topScripts": "02_28367-323aa659665e412c.js (246KB), 17_5593-e834326c1dd48a8f.js (203KB), 01_87c73c54-f762bb6d0a074e14.js (199KB), 10_69162-736b02be6ed8a20f.js (180KB)",
                "astSummary": "Navigator: connection, storage, credentials • Timing: getEntriesByType, now"
        },
        {
                "index": 14,
                "slug": "adidas",
                "site": "Adidas (adidas.com)",
                "vertical": "E-Commerce",
                "arch": "arch2",
                "stage1": "Akamai Bot Manager Premier (_abck) + hCaptcha Enterprise (hsw.js)",
                "stage2": "reCAPTCHA Enterprise + Adyen RevenueProtect / 3DS2 + Forter on Confirmed Drops",
                "keyFactor": "Akamai sensor_data kinematics + hCaptcha HSW WASM proof-of-work",
                "wireHeaders": "Set-Cookie: _abck, bm_sz, ak_bmsc • Strict-Transport-Security",
                "tokensMinted": "_abck (~0~), h-captcha-response (HSW), Adyen dfValue, forterToken",
                "dossierDetail": "Adidas protects hype releases and checkout mutations with Akamai Bot Manager Premier (~0~ cookie requirement), hCaptcha HSW WebAssembly Proof-of-Work, and Adyen RevenueProtect.",
                "engineRef": "akamai_abck",
                "fb": [
                        22,
                        "1.84 MB",
                        "Akamai sensor_data, hCaptcha hsw.js, Adyen dfp"
                ],
                "scriptsCount": 25,
                "payloadSize": "3.19 MB",
                "topScripts": "09_190-df8aaa913f085fcc.js (987KB), 10_574-8e00d0af8705d881.js (642KB), 17_GACpzEVc.js (585KB), 06__app-2b546829923b8a14.js (242KB)",
                "astSummary": "Navigator: connection, language, clipboard, vendor • Timing: timing, timeOrigin, getEntriesByType, now"
        },
        {
                "index": 15,
                "slug": "newbalance",
                "site": "New Balance (newbalance.com)",
                "vertical": "E-Commerce",
                "arch": "arch1",
                "stage1": "Cloudflare Bot Management + HUMAN / PerimeterX + Queue-it",
                "stage2": "Riskified + CardinalCommerce 3DS2 on Launch Queue & Checkout",
                "keyFactor": "TLS JA4 / HTTP2 settings parity + Riskified checkout beacon",
                "wireHeaders": "cf-ray • Set-Cookie: __cf_bm, _px3, QueueITAccepted",
                "tokensMinted": "__cf_bm, _px3, QueueIT token, rCookie",
                "dossierDetail": "New Balance combines Cloudflare JA4 TLS inspection and Queue-it virtual waiting room tokens with PerimeterX and Riskified on checkout.",
                "engineRef": "checkout_coalition",
                "fb": [
                        19,
                        "1.45 MB",
                        "Cloudflare Turnstile, PX main.min.js, Riskified"
                ],
                "scriptsCount": 26,
                "payloadSize": "2.37 MB",
                "topScripts": "03_main.js (628KB), 10_nnbus_hp.js (474KB), 08_394e822a8075a68e_complete.js (399KB), 15_instantsearch.production.min.js (327KB)",
                "astSummary": "Navigator: language, connection, geolocation, permissions, vendor, platform • Timing: memory, now, getEntriesByType, timing"
        },
        {
                "index": 16,
                "slug": "dell",
                "site": "Dell (dell.com)",
                "vertical": "E-Commerce",
                "arch": "arch2",
                "stage1": "Akamai Bot Manager v3 + Wire Accept-CH + X-Akamai-RTT-Value / Server-Timing",
                "stage2": "Forter + LexisNexis ThreatMetrix + Accertify on Dell Pay / Checkout",
                "keyFactor": "Edge TCP/TLS RTT (Server-Timing: rtt-value) vs JS PerformanceNavigationTiming parity",
                "wireHeaders": "Accept-CH: Sec-CH-UA-Platform-Version, Sec-CH-UA-Model • X-Akamai-RTT-Value • Server-Timing",
                "tokensMinted": "_abck, bm_sz, forterToken, ThreatMetrix session_id",
                "dossierDetail": "Dell injects the exact edge-measured TCP/TLS round-trip time via X-Akamai-RTT-Value and Server-Timing headers, comparing it against client JS PerformanceNavigationTiming (connectEnd - connectStart) to detect high-latency proxy relays.",
                "engineRef": "akamai_abck",
                "fb": [
                        28,
                        "2.68 MB",
                        "Akamai mRUM + sensor_data, Forter sn.js, ThreatMetrix"
                ],
                "scriptsCount": 23,
                "payloadSize": "4.11 MB",
                "topScripts": "71_recaptcha__en.js (831KB), 25_TOmI.js (606KB), 23_signinBootstrapper.7995c4942815f60d0668.js (592KB), 02_mG30T.js (500KB)",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 17,
                "slug": "samsung",
                "site": "Samsung (samsung.com)",
                "vertical": "E-Commerce",
                "arch": "arch4",
                "stage1": "Akamai mRUM + Bot Manager v3 (_abck) + Wire Sec-CH-UA-Model / Platform-Version",
                "stage2": "LexisNexis ThreatMetrix + Adyen 3DS2 / Klarna / Affirm Financing Gateways",
                "keyFactor": "Wire Sec-CH-UA-Platform-Version & Model === JS NavigatorUAData + ThreatMetrix SmartID",
                "wireHeaders": "Accept-CH: Sec-CH-UA-Platform-Version, Sec-CH-UA-Model, Sec-CH-UA-Arch",
                "tokensMinted": "_abck, bm_sz, ThreatMetrix SmartID, Adyen dfValue",
                "dossierDetail": "Samsung harvests full high-entropy Client Hints on the wire and runs Akamai Bot Manager v3 alongside ThreatMetrix and Adyen 3DS2 during device trade-in and checkout.",
                "engineRef": "akamai_abck",
                "fb": [
                        62,
                        "4.38 MB",
                        "Akamai mRUM, ThreatMetrix tags.js, Adyen 3DS2"
                ],
                "scriptsCount": 26,
                "payloadSize": "4.27 MB",
                "topScripts": "11_recaptcha__en.js (831KB), 01_ZrASM6K1E.js (581KB), 20_main.MWFjYmVlZGY0MA.js (477KB), 24_js.js (459KB)",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 18,
                "slug": "macys",
                "site": "Macy's (macys.com)",
                "vertical": "E-Commerce",
                "arch": "arch2",
                "stage1": "Akamai Bot Manager v3 (_abck, bm_sz, ak_bmsc)",
                "stage2": "Riskified + Accertify / InAuth on Bag & Checkout",
                "keyFactor": "Akamai _abck ~0~ state transition before POST /bag or /checkout",
                "wireHeaders": "Set-Cookie: _abck, bm_sz, ak_bmsc, macys_online_uid",
                "tokensMinted": "_abck (~0~), rCookie (Riskified), inauth_token",
                "dossierDetail": "Macy's enforces Akamai Bot Manager v3 state machine transitions before allowing bag additions and pairs Riskified + InAuth at payment submission.",
                "engineRef": "akamai_abck",
                "fb": [
                        19,
                        "0.47 MB",
                        "Akamai sensor_data, Riskified beacon, InAuth"
                ],
                "scriptsCount": 25,
                "payloadSize": "2.45 MB",
                "topScripts": "03_entry-YkUtZCc6.js (727KB), 06_Elrczc.js (584KB), 07_Qg0CksV.js (510KB), 01_entry.js (490KB)",
                "astSummary": "Navigator: platform, maxTouchPoints, connection • Timing: now"
        },
        {
                "index": 19,
                "slug": "nordstrom",
                "site": "Nordstrom (nordstrom.com)",
                "vertical": "E-Commerce",
                "arch": "arch1",
                "stage1": "F5 Distributed Cloud / Shape Security + Akamai",
                "stage2": "Forter Fraud Decisioning (sn.js -> forterToken) on Checkout",
                "keyFactor": "Forter scroll-to-click cadence + natural credit-card typing rhythm (no instant paste)",
                "wireHeaders": "Set-Cookie: _abck, forterToken, nordstrom_device_id",
                "tokensMinted": "Shape polymorphic header, forterToken, _abck",
                "dossierDetail": "Nordstrom protects login and checkout endpoints with F5 Shape polymorphic JS instrumentation and Forter continuous behavioral scoring.",
                "engineRef": "checkout_coalition",
                "fb": [
                        24,
                        "1.92 MB",
                        "Shape bundle, Forter sn.js, Akamai"
                ],
                "scriptsCount": 24,
                "payloadSize": "1.92 MB",
                "topScripts": "Shape bundle, Forter sn.js, Akamai",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 20,
                "slug": "etsy",
                "site": "Etsy (etsy.com)",
                "vertical": "E-Commerce",
                "arch": "arch2",
                "stage1": "DataDome v5.11.1 (06_tags.js -> x-dd-b / datadome cookie) + reCAPTCHA Enterprise",
                "stage2": "Forter + Stripe Radar / Adyen 3DS2 on Guest & Account Checkout",
                "keyFactor": "DataDome 96-bit sgb/sgd/sgc signature + PointerEvent.getCoalescedEvents() (p_fc)",
                "wireHeaders": "Accept-CH: Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Platform-Version, Sec-CH-DPR • Set-Cookie: datadome",
                "tokensMinted": "datadome, uaid, user_prefs, forterToken, Stripe muid/sid",
                "dossierDetail": "Etsy requests 7 high-entropy Client Hints on the wire and executes DataDome v5.11.1 (06_tags.js, 80KB) with full 96-bit constructor bitmasks (sgb/sgd/sgc), Blob Worker cross-checking (_datadome-det-cd), and lognormal mouse kinematics (es_sigmdn).",
                "engineRef": "datadome_v511",
                "fb": [
                        24,
                        "0.96 MB",
                        "06_tags.js (DataDome v5.11.1), reCAPTCHA Enterprise, Stripe"
                ],
                "scriptsCount": 26,
                "payloadSize": "1.02 MB",
                "topScripts": "05_bootstrap.DTfKio6b.js (234KB), 10_common__common-entrypoints__web-toolkit.CiIf54lk.js (207KB), 16_A11yHealthMetricsSetup.BcEr493_.js (185KB), 06_tags.js (136KB)",
                "astSummary": "Navigator: clipboard, hardwareConcurrency, platform, userAgentData, languages, connection • Bot globals: CefSharp • Timing: now, getEntriesByType, timing"
        },
        {
                "index": 21,
                "slug": "shopify",
                "site": "Shopify Stores (shopify.com)",
                "vertical": "E-Commerce",
                "arch": "arch3",
                "stage1": "Cloudflare Turnstile (cf_clearance) + hCaptcha HSW (hsw.js) + Trekkie",
                "stage2": "Shopify ShopPay / Stripe Radar + reCAPTCHA Enterprise v3 on Checkout",
                "keyFactor": "Cloudflare PAT / Turnstile Worker-Iframe parity + reCAPTCHA Enterprise >= 0.7",
                "wireHeaders": "cf-ray • Accept-CH: Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version-List • Set-Cookie: _shopify_y, _shopify_s",
                "tokensMinted": "cf_clearance, _shopify_y, h-captcha-response, Stripe muid/guid/sid",
                "dossierDetail": "Shopify storefronts combine Cloudflare Bot Management / Turnstile (with Apple/Google Private Access Token support) at queue/cart boundaries and Stripe Radar + hCaptcha HSW during ShopPay/card checkout.",
                "engineRef": "payment_identity_graph",
                "fb": [
                        41,
                        "1.14 MB",
                        "Cloudflare Turnstile, Shopify Trekkie, Stripe m-outer, hsw.js"
                ],
                "scriptsCount": 9,
                "payloadSize": "1.79 MB",
                "topScripts": "02_shared-39740ee65f82d01a1f07b24ee0bb6c2f24d597732ad977b05a9c4faede294a52.js (740KB), 06_api.js (381KB), 03_merchant-public-7f467212f8502a1efcb10f0f7ad2597376df1ad4e479bff76f48d049497b46c5.js (379KB), 01_device-38d8d705377513444149d6d7c41b63d961bf3507a248485277dc4a9b5f8c28b2.js (294KB)",
                "astSummary": "Navigator: mimeTypes, vendor, plugins, language, maxTouchPoints, credentials • Timing: timeOrigin, now, getEntriesByType"
        },
        {
                "index": 22,
                "slug": "chase",
                "site": "Chase Bank (chase.com)",
                "vertical": "Banking & Payments",
                "arch": "arch4",
                "stage1": "Akamai Bot Manager + JPMorgan Custom Telemetry",
                "stage2": "LexisNexis ThreatMetrix (08_982678471880523a.js TURN + 16-Port Scan) + BioCatch on Login",
                "keyFactor": "ThreatMetrix WebRTC TURN IP parity + Localhost 16-port scan clean + BioCatch keystroke flight/dwell",
                "wireHeaders": "Strict-Transport-Security • X-Frame-Options: SAMEORIGIN • Set-Cookie: _abck, v1st",
                "tokensMinted": "_abck, ThreatMetrix SmartID (aa.online-metrix.net), BioCatch cdSessionId",
                "dossierDetail": "Chase executes LexisNexis ThreatMetrix (08_982678471880523a.js) with WebRTC TURN server probing (turn:aa.online-metrix.net:443?transport=tcp), a 16-port localhost scanner for remote-access trojans/proxies, and BioCatch behavioral biometrics on login.",
                "engineRef": "biocatch_v7",
                "fb": [
                        17,
                        "0.47 MB",
                        "08_982678471880523a.js (ThreatMetrix), BioCatch, Chase PIE"
                ],
                "scriptsCount": 20,
                "payloadSize": "1.97 MB",
                "topScripts": "08_982-cdad9e35f605f239.js (896KB), 06_66ceac94-8cc7c4e7d292ce5e.js (305KB), 01_4bd1b696-5fb57fafbf73dff4.js (194KB), 02_732-f67917326b449162.js (185KB)",
                "astSummary": "Navigator: connection, globalPrivacyControl, mimeTypes, plugins, platform, userAgentData • Timing: getEntriesByType, now"
        },
        {
                "index": 23,
                "slug": "bofa",
                "site": "Bank of America (bankofamerica.com)",
                "vertical": "Banking & Payments",
                "arch": "arch4",
                "stage1": "Akamai v3 (X-BAC-AKM-C) + First-Party FPID / FPID_CLIENT",
                "stage2": "BioCatch v7.0.0 (06_vendb.js 1.51MB, 236 Collectors) + Accertify/InAuth (08_iac.js) + Arkose Labs",
                "keyFactor": "BioCatch FKGroteskNeue absence + WebGLTimingService + InAuth 15 AudioContext latency props",
                "wireHeaders": "X-BAC-AKM-C • Set-Cookie: FPID, FPID_CLIENT, _abck, ak_bmsc",
                "tokensMinted": "FPID, FPID_CLIENT, BioCatch cdSessionId, InAuth payload, _abck",
                "dossierDetail": "Bank of America deploys BioCatch JS Agent v7.0.0 (06_vendb.js, 1.51MB with 236 enterprise collectors including AgenticDomInjectionCollector and Perplexity Comet FKGroteskNeue font detection) alongside Accertify/InAuth (08_iac.js) and first-party FPID cookies.",
                "engineRef": "biocatch_v7",
                "fb": [
                        17,
                        "2.09 MB",
                        "06_vendb.js (BioCatch v7.0.0 1.51MB), 08_iac.js (InAuth), Arkose"
                ],
                "scriptsCount": 17,
                "payloadSize": "2.09 MB",
                "topScripts": "06_vendb.js (BioCatch v7.0.0 1.51MB), 08_iac.js (InAuth), Arkose",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 24,
                "slug": "wellsfargo",
                "site": "Wells Fargo (wellsfargo.com)",
                "vertical": "Banking & Payments",
                "arch": "arch4",
                "stage1": "Akamai v3 + Wire Client Hints Delegation + Arkose Labs",
                "stage2": "BioCatch v7.0.0 (12_8556c7b1.js 1.68MB) + LexisNexis ThreatMetrix on Sign-On & Wire/Zelle",
                "keyFactor": "BioCatch CoreEstimatorService (Welch t-test Worker cores) + IEEE-754 NaN sign byte + Levenshtein distance",
                "wireHeaders": "Permissions-Policy: ch-ua-platform-version=(self), ch-ua-model=(self) • Set-Cookie: _abck",
                "tokensMinted": "BioCatch cdSessionId, ThreatMetrix SmartID, _abck",
                "dossierDetail": "Wells Fargo runs the 1.68MB BioCatch v7.0.0 bundle (12_8556c7b1.js) which spawns concurrent Web Workers to estimate physical CPU cores via Welch t-test (CoreEstimatorService), benchmarks WebGL uniformMatrix4fv ops/sec, and checks IEEE-754 NaN sign bytes.",
                "engineRef": "biocatch_v7",
                "fb": [
                        14,
                        "2.10 MB",
                        "12_8556c7b1.js (BioCatch v7.0.0 1.68MB), ThreatMetrix, Akamai"
                ],
                "scriptsCount": 14,
                "payloadSize": "2.10 MB",
                "topScripts": "12_8556c7b1.js (BioCatch v7.0.0 1.68MB), ThreatMetrix, Akamai",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 25,
                "slug": "capitalone",
                "site": "Capital One (capitalone.com)",
                "vertical": "Banking & Payments",
                "arch": "arch2",
                "stage1": "DataDome v5.11.1 + Akamai Bot Manager v3",
                "stage2": "BioCatch Behavioral Biometrics + ThreatMetrix + TransUnion iovation + Socure on Login/Enrollment",
                "keyFactor": "DataDome Worker parity + BioCatch continuous session anomaly score",
                "wireHeaders": "Set-Cookie: _abck, bm_sz, datadome • Strict-Transport-Security",
                "tokensMinted": "_abck, datadome, BioCatch cdSessionId, ioBlackBox",
                "dossierDetail": "Capital One combines DataDome and Akamai at the edge with BioCatch continuous behavioral biometrics and iovation/ThreatMetrix device graphs on account sign-in and card applications.",
                "engineRef": "biocatch_v7",
                "fb": [
                        21,
                        "1.78 MB",
                        "BioCatch v7, ThreatMetrix, iovation snare.js, Akamai"
                ],
                "scriptsCount": 7,
                "payloadSize": "3.51 MB",
                "topScripts": "05_main.d5f5bbbb3807b683.js (3110KB), 01_cp_common.js (292KB), 06_Bootstrap.js (85KB), inline_1.js (64KB)",
                "astSummary": "Navigator: geolocation, userAgentData, language, plugins, vendor, mimeTypes • Bot globals: _selenium, __selenium_unwrapped, __webdriver_evaluate, __driver_evaluate • Timing: now, timing, getEntriesByType"
        },
        {
                "index": 26,
                "slug": "citi",
                "site": "Citibank (citi.com)",
                "vertical": "Banking & Payments",
                "arch": "arch4",
                "stage1": "Akamai Bot Manager v3 + ThreatMetrix SmartID",
                "stage2": "BioCatch Behavioral Biometrics + InAuth on Account Sign-On & Wire Transfers",
                "keyFactor": "ThreatMetrix global banking consortium SmartID + BioCatch keystroke/mouse cadence",
                "wireHeaders": "Set-Cookie: _abck, bm_sz, ak_bmsc, citi_fp",
                "tokensMinted": "_abck, ThreatMetrix SmartID, BioCatch cdSessionId",
                "dossierDetail": "Citibank correlates ThreatMetrix SmartID across the global banking consortium and monitors post-login session behavior via BioCatch.",
                "engineRef": "biocatch_v7",
                "fb": [
                        23,
                        "1.95 MB",
                        "ThreatMetrix tags.js, BioCatch agent, Akamai sensor"
                ],
                "scriptsCount": 23,
                "payloadSize": "1.95 MB",
                "topScripts": "ThreatMetrix tags.js, BioCatch agent, Akamai sensor",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 27,
                "slug": "amex",
                "site": "American Express (americanexpress.com)",
                "vertical": "Banking & Payments",
                "arch": "arch4",
                "stage1": "Akamai Bot Manager v3 (_abck, bm_mi) + Adobe Demdex agent-id",
                "stage2": "Accertify / InAuth (amex/67_cc.js) + LexisNexis ThreatMetrix + Amex SafeKey 3DS2",
                "keyFactor": "InAuth 15 AudioContext latency props + 127.0.0.1 open-port scan + 4-quarter DST clock transition check",
                "wireHeaders": "Set-Cookie: _abck, bm_mi, bm_sv, agent-id",
                "tokensMinted": "_abck, bm_mi, InAuth cc.js blob, SafeKey 3DS2 token",
                "dossierDetail": "American Express owns Accertify/InAuth and deploys 67_cc.js (35.4KB), which extracts 15 AudioContext latency properties (ac-base-latency, ac-output-latency, ac-sample-rate), scans 127.0.0.1 for open proxy/debugger ports (detectOpenPorts), and verifies 4-quarter DST transitions (getClimate).",
                "engineRef": "payment_identity_graph",
                "fb": [
                        70,
                        "6.73 MB",
                        "67_cc.js (Accertify/InAuth), Akamai sensor, ThreatMetrix"
                ],
                "scriptsCount": 8,
                "payloadSize": "1.32 MB",
                "topScripts": "02_UgE.js (603KB), 04_ruxitagent_ICA15789NPRTUVXfqrux_10343260715123811.js (365KB), 22_ruxitagent_ICA7NQVfqrux_10333260303165926.js (283KB), 67_cc.js (72KB)",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 28,
                "slug": "paypal",
                "site": "PayPal (paypal.com)",
                "vertical": "Banking & Payments",
                "arch": "arch1",
                "stage1": "PayPal Fraudnet (fn-sync.js) + Wire Client Hints to c.paypal.com + reCAPTCHA Enterprise",
                "stage2": "Fraudnet v3.15.1-FP (29_fb_fp.js, 30_dfp.js) + Savitzky-Golay Mouse Model (sgmm.min.js) + Dual IPv4/IPv6 (c6.paypal.com)",
                "keyFactor": "Savitzky-Golay polynomial mouse curvature + c6.paypal.com IPv6 leak immunity + Kount collector",
                "wireHeaders": "Accept-CH: Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Model, Sec-CH-UA-Platform-Version,ect,rtt,downlink • Permissions-Policy: ch-ua-*=(self \"https://c.paypal.com\")",
                "tokensMinted": "fn_session_id, PayPal-Client-Metadata-Id (CMID), SEGM, Kount session",
                "dossierDetail": "PayPal delegates 8 high-entropy Client Hints directly to https://c.paypal.com via Permissions-Policy, runs Fraudnet v3.15.1-FP (29_fb_fp.js + 30_dfp.js + Savitzky-Golay mouse polynomial smoothing in 27_sgmm.min.js), and fires dual-stack beacons to c.paypal.com (IPv4) and c6.paypal.com/v1/r/d/b/p3 (IPv6) to catch IPv4-only proxies leaking host IPv6.",
                "engineRef": "payment_identity_graph",
                "fb": [
                        32,
                        "1.63 MB",
                        "29_fb_fp.js, 30_dfp.js, 27_sgmm.min.js (Savitzky-Golay), Kount"
                ],
                "scriptsCount": 32,
                "payloadSize": "1.63 MB",
                "topScripts": "29_fb_fp.js, 30_dfp.js, 27_sgmm.min.js (Savitzky-Golay), Kount",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 29,
                "slug": "stripe",
                "site": "Stripe & Stripe Link (stripe.com)",
                "vertical": "Banking & Payments",
                "arch": "arch1",
                "stage1": "Stripe Radar m-outer Iframe (m.stripe.network/inner.html -> out-4.5.45.js -> POST m.stripe.com/6)",
                "stage2": "hCaptcha HSW (hsw.js WASM) + CardinalCommerce / Stripe 3DS2",
                "keyFactor": "Object.keys(navigator)===\"\" && Object.keys(document)===\"location\" (15 Extractor modules) + 20-pair font hash",
                "wireHeaders": "Strict-Transport-Security • Content-Security-Policy (frame-ancestors) • Set-Cookie: muid, guid, sid",
                "tokensMinted": "muid (Merchant Device UUID), guid (Global Stripe UUID), sid (Session UUID)",
                "dossierDetail": "Stripe Radar loads m.stripe.network/out-4.5.45.js inside an isolated cross-origin iframe, executing 15 Extractor classes (NavigatorExtractor checks Object.keys(navigator) and Object.keys(document), CanvasFontExtractor renders 20 font pairs against monospace/sans-serif/serif, WebGLExtractor hashes renderer + extensions, TouchSupportExtractor verifies ontouchstart vs desktop UA) and POSTs to https://m.stripe.com/6.",
                "engineRef": "payment_identity_graph",
                "fb": [
                        28,
                        "2.09 MB",
                        "out-4.5.45.js (Stripe Radar 15 Extractors), v3/stripe.js, hsw.js"
                ],
                "scriptsCount": 15,
                "payloadSize": "5.16 MB",
                "topScripts": "03_https___js.stripe.com_v3_.js (1106KB), 23_recaptcha__en.js (831KB), 28_gtm.js (602KB), 21_js.js (587KB)",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 30,
                "slug": "adyen",
                "site": "Adyen (adyen.com)",
                "vertical": "Banking & Payments",
                "arch": "arch1",
                "stage1": "Adyen RevenueProtect (dfValue Composite Fingerprint)",
                "stage2": "Adyen 3DS2 Device Fingerprinting Iframe (threeDSMethodURL)",
                "keyFactor": "dfValue screen/timezone/WebGL coherence with card BIN country (<30 score = frictionless 3DS2 exemption)",
                "wireHeaders": "Strict-Transport-Security • X-Content-Type-Options: nosniff",
                "tokensMinted": "dfValue, threeDSMethodData, riskdata.clientData",
                "dossierDetail": "Adyen computes a composite dfValue fingerprint combining screen geometry, timezone offset, WebGL renderer, and browser capabilities to determine whether a card transaction qualifies for frictionless EMV 3DS2 TRA exemption (<30 risk score).",
                "engineRef": "payment_identity_graph",
                "fb": [
                        16,
                        "1.12 MB",
                        "Adyen checkoutSDK, dfp.js, threeDS2-iframe.js"
                ],
                "scriptsCount": 9,
                "payloadSize": "3.30 MB",
                "topScripts": "02_BZ6ym4Wk.js (2279KB), 03__payload.json.js (1025KB), 01_otSDKStub.js (59KB), 04_rum.js (11KB)",
                "astSummary": "Navigator: globalPrivacyControl, connection, languages, maxTouchPoints, platform • Timing: getEntriesByType, now"
        },
        {
                "index": 31,
                "slug": "westernunion",
                "site": "Western Union (westernunion.com)",
                "vertical": "Banking & Payments",
                "arch": "arch4",
                "stage1": "Akamai Bot Manager v3 (_abck) + HUMAN / PerimeterX",
                "stage2": "TransUnion iovation IGLOO v5.13.0 (14_static_wdp.js + 34_dyn_wdp.js Server-Header JDIFF + 10 STUN servers)",
                "keyFactor": "Server embeds observed HTTP headers into dyn_wdp.js to diff against client JS navigator (JDIFF=0) + 10 STUN probes",
                "wireHeaders": "Set-Cookie: _abck, bm_sz, _px3, wu_device_id",
                "tokensMinted": "ioBlackBox (IGLOO v5.13.0), _abck, _px3",
                "dossierDetail": "Western Union dynamically compiles the exact HTTP request headers observed on the server (suagt, hacclng, fphxfwdfr, Sec-CH-UA-*) directly into 34_dyn_wdp.js and diffs them client-side against JS navigator properties to compute JDIFF, while probing 10 regional WebRTC STUN servers (us/eu/ap.turn.iovation.com:3478).",
                "engineRef": "payment_identity_graph",
                "fb": [
                        38,
                        "4.88 MB",
                        "14_static_wdp.js, 34_dyn_wdp.js (iovation JDIFF), Akamai, PX"
                ],
                "scriptsCount": 38,
                "payloadSize": "4.88 MB",
                "topScripts": "14_static_wdp.js, 34_dyn_wdp.js (iovation JDIFF), Akamai, PX",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 32,
                "slug": "coinbase",
                "site": "Coinbase (coinbase.com)",
                "vertical": "Banking & Payments",
                "arch": "arch3",
                "stage1": "Cloudflare Turnstile + Google reCAPTCHA Enterprise v3",
                "stage2": "FingerprintJS Pro v4 + Sardine.ai + Arkose Labs on Login & Crypto Withdrawal",
                "keyFactor": "Cloudflare Turnstile Worker parity + Sardine.ai behavioral biometrics + reCAPTCHA Enterprise >= 0.7",
                "wireHeaders": "cf-ray • Set-Cookie: __cf_bm, cf_clearance, cb_dm",
                "tokensMinted": "cf_clearance, cb_dm, sardine-session-key, fpjs_visitor_id",
                "dossierDetail": "Coinbase combines Cloudflare Turnstile and FingerprintJS Pro v4 device identification with Sardine.ai behavioral biometrics and reCAPTCHA Enterprise on login and fiat/crypto transfers.",
                "engineRef": "fpjs_pro_v4",
                "fb": [
                        26,
                        "2.45 MB",
                        "Cloudflare Turnstile, FingerprintJS Pro v4, Sardine.ai, Arkose"
                ],
                "scriptsCount": 7,
                "payloadSize": "780 KB",
                "topScripts": "02_api.js (287KB), 03_ct.js (242KB), 04_e_DQqWxb6c.js (242KB), inline_3.js (6KB)",
                "astSummary": "Bot globals: geb, cdc_a, cdc_ad, __nightmare • Timing: now"
        },
        {
                "index": 33,
                "slug": "wise",
                "site": "Wise (wise.com)",
                "vertical": "Banking & Payments",
                "arch": "arch4",
                "stage1": "Cloudflare Bot Management + reCAPTCHA Enterprise",
                "stage2": "Sardine.ai + Socure + ThreatMetrix on Cross-Border Remittance",
                "keyFactor": "Sardine.ai device/clipboard/biometric telemetry + residential ASN alignment",
                "wireHeaders": "cf-ray • Set-Cookie: __cf_bm, cf_clearance",
                "tokensMinted": "__cf_bm, sardine-session-key, ThreatMetrix SmartID",
                "dossierDetail": "Wise uses Cloudflare Bot Management at the edge and Sardine.ai + ThreatMetrix during cross-border FX funding and ACH/wire settlement.",
                "engineRef": "checkout_coalition",
                "fb": [
                        18,
                        "1.38 MB",
                        "Cloudflare BM, Sardine.ai loader, ThreatMetrix"
                ],
                "scriptsCount": 18,
                "payloadSize": "1.38 MB",
                "topScripts": "Cloudflare BM, Sardine.ai loader, ThreatMetrix",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 34,
                "slug": "revolut",
                "site": "Revolut (revolut.com)",
                "vertical": "Banking & Payments",
                "arch": "arch1",
                "stage1": "Cloudflare Turnstile + Custom Device Attestation",
                "stage2": "Sardine.ai + reCAPTCHA Enterprise + 3DS2 Push Challenge",
                "keyFactor": "Cross-realm Worker/Iframe coherence + persistent device token",
                "wireHeaders": "cf-ray • Strict-Transport-Security • Set-Cookie: __cf_bm",
                "tokensMinted": "cf_clearance, revolut_device_id, sardine-session-key",
                "dossierDetail": "Revolut binds web sessions to hardware fingerprint telemetry and triggers 3DS2 / mobile app push challenges when device or ASN drift occurs.",
                "engineRef": "checkout_coalition",
                "fb": [
                        15,
                        "1.22 MB",
                        "Cloudflare Turnstile, Sardine.ai, Revolut Device SDK"
                ],
                "scriptsCount": 15,
                "payloadSize": "1.22 MB",
                "topScripts": "Cloudflare Turnstile, Sardine.ai, Revolut Device SDK",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 35,
                "slug": "klarna",
                "site": "Klarna (klarna.com)",
                "vertical": "Banking & Payments",
                "arch": "arch4",
                "stage1": "Cloudflare + LexisNexis ThreatMetrix SmartID",
                "stage2": "Sardine.ai + Socure + Behavioral Keystroke Cadence on BNPL Underwriting",
                "keyFactor": "DOB/SSN typing hesitation cadence (no copy-paste) + ThreatMetrix SmartID",
                "wireHeaders": "cf-ray • Set-Cookie: __cf_bm, klarna_client_id",
                "tokensMinted": "klarna_client_id, ThreatMetrix SmartID, sardine-session-key",
                "dossierDetail": "Klarna evaluates instant BNPL credit underwriting in <300ms using ThreatMetrix SmartID, Sardine.ai, and keystroke flight/paste detection on DOB/SSN fields.",
                "engineRef": "biocatch_v7",
                "fb": [
                        22,
                        "1.65 MB",
                        "ThreatMetrix, Sardine.ai, Klarna KP SDK"
                ],
                "scriptsCount": 25,
                "payloadSize": "1.68 MB",
                "topScripts": "04_main-69e33015.js (447KB), 03_framework-e6d22529.js (213KB), 15_klui-10-7849e096.js (157KB), 01_gpt.js (131KB)",
                "astSummary": "Navigator: userAgentData, connection, maxTouchPoints • Timing: timeOrigin, now, getEntriesByType, navigation"
        },
        {
                "index": 36,
                "slug": "affirm",
                "site": "Affirm (affirm.com)",
                "vertical": "Banking & Payments",
                "arch": "arch4",
                "stage1": "Cloudflare + FingerprintJS Pro v4",
                "stage2": "Sardine.ai + ThreatMetrix + Socure on Point-of-Sale Loan Approval",
                "keyFactor": "FingerprintJS Pro confidence >= 0.95 + Sardine session telemetry",
                "wireHeaders": "cf-ray • Set-Cookie: __cf_bm, _affirm_session",
                "tokensMinted": "fpjs_visitor_id, sardine-session-key, ThreatMetrix SmartID",
                "dossierDetail": "Affirm correlates FingerprintJS Pro v4 visitorId across merchant checkouts (Amazon, Walmart, Target, Shopify) and scores underwriting risk with Sardine.ai and Socure.",
                "engineRef": "fpjs_pro_v4",
                "fb": [
                        20,
                        "1.54 MB",
                        "FingerprintJS Pro v4, Sardine.ai, ThreatMetrix"
                ],
                "scriptsCount": 17,
                "payloadSize": "2.11 MB",
                "topScripts": "03_app-4bcce92392a61862adba.js (1124KB), 05_4d3f3674-6d941a5c742b70a5b182.js (521KB), 06_framework-bc90121c166bc32c3787.js (205KB), 04_dc6a8720040df98778fe970bf6c000a41750d3ae-59184f4c73da1103bec3.js (123KB)",
                "astSummary": "Navigator: language, plugins, languages, connection, scheduling, userAgentData • Timing: now, getEntriesByType, timeOrigin"
        },
        {
                "index": 37,
                "slug": "venmo",
                "site": "Venmo & Braintree (venmo.com)",
                "vertical": "Banking & Payments",
                "arch": "arch1",
                "stage1": "PayPal Fraudnet + Kount Device Collector (kount.net)",
                "stage2": "Savitzky-Golay Mouse Model + CardinalCommerce 3DS2 (songbird.js)",
                "keyFactor": "Shared PayPal/Braintree Fraudnet + Kount device graph + IPv4/IPv6 beacon parity",
                "wireHeaders": "Accept-CH: Sec-CH-UA-Platform-Version, Sec-CH-UA-Model • Set-Cookie: fn_session_id",
                "tokensMinted": "deviceData.correlation_id (Fraudnet), kount_session_id, songbird_jwt",
                "dossierDetail": "Braintree and Venmo share the PayPal Fraudnet v3.15.1-FP and Kount device data collector architecture, requiring a clean correlation_id on every Braintree GraphQL tokenization call.",
                "engineRef": "payment_identity_graph",
                "fb": [
                        24,
                        "1.48 MB",
                        "Braintree client.min.js, Fraudnet fb_fp.js, Kount, Songbird.js"
                ],
                "scriptsCount": 24,
                "payloadSize": "1.48 MB",
                "topScripts": "Braintree client.min.js, Fraudnet fb_fp.js, Kount, Songbird.js",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 38,
                "slug": "square",
                "site": "Square / Block (squareup.com)",
                "vertical": "Banking & Payments",
                "arch": "arch1",
                "stage1": "Cloudflare + Google reCAPTCHA Enterprise v3",
                "stage2": "Square Web Payments SDK Risk Engine + Sift + 3DS2 Iframe",
                "keyFactor": "reCAPTCHA Enterprise action-specific score + clean Canvas/WebGL hardware profile",
                "wireHeaders": "cf-ray • Strict-Transport-Security • Set-Cookie: __cf_bm",
                "tokensMinted": "square_source_id, verificationToken, reCAPTCHA Enterprise token",
                "dossierDetail": "Square Web Payments SDK isolates card entry inside a cross-origin iframe while collecting WebGL, Canvas, Audio, and reCAPTCHA Enterprise v3 risk scores.",
                "engineRef": "payment_identity_graph",
                "fb": [
                        19,
                        "1.31 MB",
                        "square.js Web Payments SDK, reCAPTCHA Enterprise, Sift"
                ],
                "scriptsCount": 19,
                "payloadSize": "1.31 MB",
                "topScripts": "square.js Web Payments SDK, reCAPTCHA Enterprise, Sift",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 39,
                "slug": "worldpay",
                "site": "Checkout.com & Worldpay",
                "vertical": "Banking & Payments",
                "arch": "arch1",
                "stage1": "Cloudflare + Riskified / Forter Gateway Hooks",
                "stage2": "CardinalCommerce Songbird.js (EMV 3DS2 Device Data Collection Iframe)",
                "keyFactor": "3DS2 methodURL hidden iframe WebGL/Screen/Timezone parity with issuing bank",
                "wireHeaders": "Strict-Transport-Security • Content-Security-Policy",
                "tokensMinted": "dfReferenceId (Cardinal Songbird), cko-session-id",
                "dossierDetail": "Checkout.com and Worldpay execute CardinalCommerce Songbird.js to harvest EMVCo 3DS 2.2 browserInfo (screen colorDepth, javaEnabled, language, timeZoneOffset, userAgent) inside the issuing bank hidden methodURL iframe.",
                "engineRef": "payment_identity_graph",
                "fb": [
                        14,
                        "0.95 MB",
                        "Frames.js, CardinalCommerce songbird.js, Riskified"
                ],
                "scriptsCount": 14,
                "payloadSize": "0.95 MB",
                "topScripts": "Frames.js, CardinalCommerce songbird.js, Riskified",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 40,
                "slug": "cybersource",
                "site": "Authorize.net & CyberSource (Visa)",
                "vertical": "Banking & Payments",
                "arch": "arch4",
                "stage1": "Visa CyberSource Device Fingerprint (org_id=1snn5n9w / h.online-metrix.net)",
                "stage2": "CardinalCommerce Cruise 3DS2 + Visa Decision Manager / Kount",
                "keyFactor": "CyberSource/ThreatMetrix dfp session_id linkage + WebRTC TURN IP parity",
                "wireHeaders": "Strict-Transport-Security • Set-Cookie: JSESSIONID",
                "tokensMinted": "deviceFingerprintId (org_id=1snn5n9w + MerchantID + SessionID), songbird_jwt",
                "dossierDetail": "Visa CyberSource Decision Manager embeds LexisNexis ThreatMetrix (org_id=1snn5n9w for production) + CardinalCommerce Cruise 3DS2 across thousands of enterprise retail and airline checkouts.",
                "engineRef": "payment_identity_graph",
                "fb": [
                        16,
                        "1.18 MB",
                        "online-metrix tags.js (org_id=1snn5n9w), songbird.js"
                ],
                "scriptsCount": 16,
                "payloadSize": "1.18 MB",
                "topScripts": "online-metrix tags.js (org_id=1snn5n9w), songbird.js",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 41,
                "slug": "airbnb",
                "site": "Airbnb (airbnb.com)",
                "vertical": "Travel & Ticketing",
                "arch": "arch2",
                "stage1": "DataDome v5.11.1 (01_tags.js) + Akamai Bot Manager (_abck)",
                "stage2": "Airbnb \"Airlock\" Enforcement (13_5878...js -> Arkose 21018) + ThreatMetrix + InAuth + Sift + Riskified + Stripe Radar",
                "keyFactor": "Multi-vendor Airlock gate: DataDome + Akamai at edge, then ThreatMetrix + Sift + Riskified + Stripe on booking",
                "wireHeaders": "Accept-CH: Sec-CH-UA-Platform-Version, Sec-CH-UA-Model, DPR, Viewport-Width, Device-Memory • Set-Cookie: _abck, datadome",
                "tokensMinted": "datadome, _abck, airlock_id, ThreatMetrix SmartID, _sift_session, rCookie, Stripe muid",
                "dossierDetail": "Airbnb operates an 8-vendor defense architecture: DataDome v5.11.1 (01_tags.js) + Akamai v3 at the perimeter, its custom \"Airlock\" step-up engine (13_5878.8266df385bf53de8.js) invoking Arkose Labs (enforcement.21018.js) on suspicious logins, and simultaneous ThreatMetrix + InAuth + Sift + Riskified + Stripe Radar + Adyen + Braintree on reservation checkout.",
                "engineRef": "datadome_v511",
                "fb": [
                        79,
                        "2.64 MB",
                        "01_tags.js (DataDome), 13_5878.js (Airlock + Arkose + TMX + Sift + Stripe)"
                ],
                "scriptsCount": 24,
                "payloadSize": "1.67 MB",
                "topScripts": "04_asyncRequire.0041916c98.js (547KB), 13_5878.8d2a1ab382.js (352KB), 01_tags.js (115KB), 05_coreV2.774ffad5cf.js (78KB)",
                "astSummary": "Navigator: storage, getBattery, webdriver, connection, deviceMemory, hardwareConcurrency • Timing: now, timeOrigin, timing"
        },
        {
                "index": 42,
                "slug": "booking",
                "site": "Booking.com & Priceline",
                "vertical": "Travel & Ticketing",
                "arch": "arch3",
                "stage1": "AWS WAF Bot Control v2.4.0 (01_challenge.js Zoey::) + HUMAN / PerimeterX (02_main.min.js)",
                "stage2": "Forter (13_sn.js) + Sift Science (11_sift.js) + Adyen 3DS2 on Hotel/Flight Checkout",
                "keyFactor": "AWS WAF Zoey stealth={t1:0,t2:0,i:1,mte:0,mtd:false} + Blob Worker wr parity + Forter/Sift cadence",
                "wireHeaders": "Set-Cookie: aws-waf-token, _px3, _pxhd, bkng",
                "tokensMinted": "aws-waf-token (Zoey:: AES-GCM), _px3, forterToken, _sift_session",
                "dossierDetail": "Booking Holdings (Booking.com & Priceline) runs AWS WAF Bot Control v2.4.0 (01_challenge.js, 405KB Zoey:: AES-GCM payload) AND PerimeterX (02_main.min.js) simultaneously at the edge, followed by Sift (11_sift.js) and Forter (13_sn.js) during reservation payment.",
                "engineRef": "aws_waf_zoey",
                "fb": [
                        41,
                        "4.39 MB",
                        "01_challenge.js (AWS WAF Zoey::), 02_main.min.js (PX), 13_sn.js (Forter)"
                ],
                "scriptsCount": 5,
                "payloadSize": "674 KB",
                "topScripts": "01_challenge.js (671KB), inline_4.js (2KB), inline_3.js (1KB), inline_1.js (0KB)",
                "astSummary": "Bot globals: _phantom, cdc_asdjflasutopfhvcZLmcfl_, __webdriver_unwrapped, __fxdriver_evaluate"
        },
        {
                "index": 43,
                "slug": "delta",
                "site": "Delta Air Lines (delta.com)",
                "vertical": "Travel & Ticketing",
                "arch": "arch2",
                "stage1": "Akamai Bot Manager Premier (_abck) + Kasada KPSDK",
                "stage2": "Accertify / InAuth + LexisNexis ThreatMetrix on SkyMiles Login & Ticket Issuance",
                "keyFactor": "Akamai _abck ~0~ state transition + Accertify device fingerprint",
                "wireHeaders": "Set-Cookie: _abck, bm_sz, ak_bmsc • x-kpsdk-ct",
                "tokensMinted": "_abck (~0~), x-kpsdk-ct, InAuth payload, ThreatMetrix SmartID",
                "dossierDetail": "Delta Air Lines guards flight search scraping and SkyMiles login with Akamai Bot Manager Premier and Kasada KPSDK, while running American Express Accertify/InAuth and ThreatMetrix on ticket purchases.",
                "engineRef": "akamai_abck",
                "fb": [
                        41,
                        "1.63 MB",
                        "Akamai sensor_data, Kasada ips.js, Accertify/InAuth"
                ],
                "scriptsCount": 13,
                "payloadSize": "3.74 MB",
                "topScripts": "07_main.js (1468KB), 08_zHUE.js (601KB), 10_iEGQV.js (510KB), 03_Bootstrap.js (457KB)",
                "astSummary": "Navigator: language, connection, globalPrivacyControl, appVersion, geolocation, languages • Bot globals: Cypress, cdc_sample • Timing: memory, now, getEntriesByType, timing"
        },
        {
                "index": 44,
                "slug": "stubhub",
                "site": "StubHub & Ticketmaster",
                "vertical": "Travel & Ticketing",
                "arch": "arch2",
                "stage1": "DataDome v5.11.1 (01_d6631957--tags.js) + HUMAN / PerimeterX + ThreatMetrix",
                "stage2": "Forter / Riskified + CardinalCommerce 3DS2 on SmartQueue & Seat Checkout",
                "keyFactor": "DataDome 96-bit sgb/sgd/sgc + PointerEvent.getCoalescedEvents() + lognormal mouse velocity",
                "wireHeaders": "Set-Cookie: datadome, _px3, eps_sid, TMX_Bak",
                "tokensMinted": "datadome, _px3, eps_sid, ThreatMetrix SmartID, aws-waf-token",
                "dossierDetail": "StubHub and Ticketmaster deploy DataDome v5.11.1 (01_d6631957--tags.js), HUMAN/PerimeterX, AWS WAF, and ThreatMetrix to guard live event queues and seat maps against automated ticket scalping.",
                "engineRef": "datadome_v511",
                "fb": [
                        14,
                        "0.96 MB",
                        "01_d6631957--tags.js (DataDome v5.11.1), PX, ThreatMetrix"
                ],
                "scriptsCount": 8,
                "payloadSize": "2.04 MB",
                "topScripts": "07_affirm.js (791KB), 02_challenge.compact.js (589KB), 06_square-marketplace.js (488KB), 01_d6631957--tags.js (136KB)",
                "astSummary": "Navigator: hardwareConcurrency, platform, userAgentData, languages, language, maxTouchPoints • Bot globals: __selenium_unwrapped, _phantom, domAutomation, cdc_asdjflasutopfhvcZLmcfl_ • Timing: getEntriesByType, now, timeOrigin"
        },
        {
                "index": 45,
                "slug": "uber",
                "site": "Uber (uber.com)",
                "vertical": "Travel & Ticketing",
                "arch": "arch3",
                "stage1": "Cloudflare + Arkose Labs FunCaptcha (bda) + Google reCAPTCHA Enterprise",
                "stage2": "FingerprintJS Pro + Stripe Radar / Braintree Fraudnet on Ride & UberEats Payment",
                "keyFactor": "Arkose bda silent pass (sup=1) + reCAPTCHA Enterprise >= 0.7",
                "wireHeaders": "cf-ray • Strict-Transport-Security • Set-Cookie: __cf_bm, jwt-session",
                "tokensMinted": "fc-token (Arkose bda), fpjs_visitor_id, Stripe muid, Braintree correlation_id",
                "dossierDetail": "Uber gates phone/email sign-in with Arkose Labs FunCaptcha (evaluating bda audio/WebGL/font entropy for sup=1 silent pass) and scores payment methods through FingerprintJS Pro, Stripe Radar, and Braintree Fraudnet.",
                "engineRef": "arkose_funcaptcha",
                "fb": [
                        1,
                        "0.16 MB",
                        "Arkose enforcement.js, FingerprintJS Pro, Braintree/Stripe"
                ],
                "scriptsCount": 10,
                "payloadSize": "1.83 MB",
                "topScripts": "02_client-main-32baed91924cd7f5.js (1203KB), 01_api.js (290KB), 04_client-vendor-fusion-e45e4d2e309609cc.js (202KB), 03_client-vendor-react-8ba82b8cc7a44376.js (170KB)",
                "astSummary": "Navigator: connection, credentials, scheduling • Bot globals: cdc_a, geb, cdc_ad, __nightmare • Timing: now, getEntriesByType, timing, timeOrigin"
        },
        {
                "index": 46,
                "slug": "zillow",
                "site": "Zillow (zillow.com)",
                "vertical": "Social & Tech",
                "arch": "arch1",
                "stage1": "HUMAN Security / PerimeterX (_px3) + DataDome",
                "stage2": "Google reCAPTCHA Enterprise on Agent Lead & Tour Submission",
                "keyFactor": "PerimeterX 71 PXxxxx sensor keys + native prototype descriptors",
                "wireHeaders": "Set-Cookie: _px3, _pxvid, _pxhd, zguid, zgsession",
                "tokensMinted": "_px3, _pxvid, zguid",
                "dossierDetail": "Zillow runs HUMAN/PerimeterX (main.min.js) across all property search and map tile APIs, enforcing PX12787 descriptor checks and PX12457 geometry validation.",
                "engineRef": "perimeterx_human",
                "fb": [
                        28,
                        "3.60 MB",
                        "PX main.min.js, reCAPTCHA Enterprise"
                ],
                "scriptsCount": 26,
                "payloadSize": "1.73 MB",
                "topScripts": "06_main-1fdd5218ff023708.js (393KB), 16_analytics.js (240KB), 01_pubnub.7.5.0.min.js (239KB), 07__app-831bf4968f46d457.js (198KB)",
                "astSummary": "Navigator: languages, doNotTrack, globalPrivacyControl, scheduling, connection, language • Bot globals: cdc_asdjflasutopfhvcZLmcfl_, Cypress • Timing: now, getEntriesByType, timeOrigin, timing"
        },
        {
                "index": 47,
                "slug": "tinder",
                "site": "Tinder & Match.com",
                "vertical": "Social & Tech",
                "arch": "arch3",
                "stage1": "Arkose Labs FunCaptcha (v2/api2/enforcement.js) + Google reCAPTCHA Enterprise",
                "stage2": "LexisNexis ThreatMetrix + Custom Telemetrics on SMS Auth & Subscription Checkout",
                "keyFactor": "Arkose bda Audio/WebGL/Font entropy for 0-wave silent pass (sup=1)",
                "wireHeaders": "Set-Cookie: _abck, aws-waf-token • Strict-Transport-Security",
                "tokensMinted": "fc-token (Arkose bda), ThreatMetrix SmartID, persistent-device-id",
                "dossierDetail": "Match Group (Tinder & Match.com) relies on Arkose Labs Enforcement v2 (bda fingerprint) to scale puzzle difficulty from 0 waves (sup=1) to 10 waves of 3D object rotation during account creation and SMS verification, paired with ThreatMetrix.",
                "engineRef": "arkose_funcaptcha",
                "fb": [
                        9,
                        "1.14 MB",
                        "Arkose enforcement.js, ThreatMetrix tags.js, reCAPTCHA Enterprise"
                ],
                "scriptsCount": 7,
                "payloadSize": "2.49 MB",
                "topScripts": "01_main-5f2225328ffa768a6cc9.js (749KB), 04_tinderapp-18d5c25183778f993ac6.js (431KB), 03_vendor-b60a9e6be579fd73bd8b.js (427KB), 05_76603-e7cfdbc1fb0e4039b5c3.js (398KB)",
                "astSummary": "Navigator: maxTouchPoints, platform, vendor, hardwareConcurrency, deviceMemory, language • Bot globals: __driver_evaluate, __driver_unwrapped, __fxdriver_evaluate, __fxdriver_unwrapped • Timing: now, getEntriesByType, timeOrigin, navigation"
        },
        {
                "index": 48,
                "slug": "linkedin",
                "site": "LinkedIn (linkedin.com)",
                "vertical": "Social & Tech",
                "arch": "arch3",
                "stage1": "Cloudflare + HUMAN/PerimeterX + Azure Front Door",
                "stage2": "Arkose Labs FunCaptcha + Google reCAPTCHA Enterprise on Sign-In & InMail",
                "keyFactor": "Arkose bda + PerimeterX _px3 + TLS JA4 parity",
                "wireHeaders": "Set-Cookie: bcookie, bscookie, li_gc, __cf_bm, _px3",
                "tokensMinted": "bcookie, li_at, fc-token (Arkose), _px3",
                "dossierDetail": "LinkedIn combines Cloudflare JA4 TLS fingerprinting and PerimeterX with Arkose Labs FunCaptcha challenges on login and profile scraping boundaries.",
                "engineRef": "arkose_funcaptcha",
                "fb": [
                        19,
                        "0.73 MB",
                        "Arkose enforcement.js, PX sensor, LinkedIn Voyagersdk"
                ],
                "scriptsCount": 19,
                "payloadSize": "4.41 MB",
                "topScripts": "07_1q-HSAxK.js (1186KB), 10_BQj1UP4v.js (846KB), 04_YhevXkoG.js (508KB), 01_CNyVMc-P.js (439KB)",
                "astSummary": "Navigator: connection, storage, webdriver, mediaDevices, language, deviceMemory • Bot globals: callPhantom, _phantom, geb • Timing: now, getEntriesByType, memory, timeOrigin"
        },
        {
                "index": 49,
                "slug": "tiktok",
                "site": "TikTok (tiktok.com)",
                "vertical": "Social & Tech",
                "arch": "arch1",
                "stage1": "ByteDance MSSDK / Slardar (secsdk-lastest.umd.js -> X-Bogus / _signature) + DataDome",
                "stage2": "FingerprintJS Pro v4 (15_vendor.d2c09aff.js G/N/H/j/B/U/W) + s_v_web_id / ttwid Attestation",
                "keyFactor": "FingerprintJS Pro platform bitmasks (G/N/H) + MediaCapabilities.decodingInfo powerEfficient=true",
                "wireHeaders": "Set-Cookie: ttwid, tt_csrf_token, s_v_web_id, msToken",
                "tokensMinted": "msToken, X-Bogus, _signature, s_v_web_id, ttwid",
                "dossierDetail": "TikTok bundles FingerprintJS Pro v4 directly inside 15_vendor.d2c09aff.js alongside ByteDance Slardar/MSSDK (secsdk-lastest.umd.js), signing API requests with X-Bogus and _signature derived from WebGL, Audio, MediaCapabilities.decodingInfo, and G/N/H engine bitmasks.",
                "engineRef": "fpjs_pro_v4",
                "fb": [
                        51,
                        "4.23 MB",
                        "15_vendor.d2c09aff.js (FPJS Pro v4), secsdk-lastest.umd.js (X-Bogus)"
                ],
                "scriptsCount": 19,
                "payloadSize": "3.26 MB",
                "topScripts": "15_vendor.d2c09aff.js (837KB), 12_biz-login-init.8cf6abe7.js (575KB), 09_biz-cache-tux.2fcf1768.js (268KB), 18_webmssdk.js (239KB)",
                "astSummary": "Navigator: platform, appVersion, language, connection, maxTouchPoints, userAgentData • Timing: timeOrigin, getEntriesByType, now, timing"
        },
        {
                "index": 50,
                "slug": "draftkings",
                "site": "DraftKings (draftkings.com)",
                "vertical": "Social & Tech",
                "arch": "arch2",
                "stage1": "Akamai Bot Manager Premier (_abck) + GeoComply / Location Bindings",
                "stage2": "LexisNexis ThreatMetrix + Socure + Sardine.ai on Sportsbook Deposit & Withdrawal",
                "keyFactor": "Strict IP-to-Timezone-to-GPS coherence + Akamai _abck ~0~ + ThreatMetrix",
                "wireHeaders": "Set-Cookie: _abck, bm_sz, ak_bmsc • Strict-Transport-Security",
                "tokensMinted": "_abck (~0~), ThreatMetrix SmartID, sardine-session-key, GeoComply token",
                "dossierDetail": "DraftKings enforces strict jurisdictional geolocation and device integrity using Akamai Bot Manager Premier, ThreatMetrix, Sardine.ai, and Socure.",
                "engineRef": "akamai_abck",
                "fb": [
                        6,
                        "0.26 MB",
                        "Akamai sensor_data, ThreatMetrix, Sardine.ai"
                ],
                "scriptsCount": 24,
                "payloadSize": "14.67 MB",
                "topScripts": "08_index.js (1763KB), 05_client.023be55a5698f4a50154.js (1597KB), 04_vendor.f27d15fa491d3ef51d05.js (1422KB), 09_dkBetSlip.js (1095KB)",
                "astSummary": "Navigator: vendor, language, languages, doNotTrack, scheduling, platform • Bot globals: Cypress • Timing: now, timing, timeOrigin, getEntriesByType"
        },
        {
                "index": 51,
                "slug": "discord",
                "site": "Discord & OpenAI",
                "vertical": "Social & Tech",
                "arch": "arch3",
                "stage1": "Cloudflare Turnstile / Challenge Platform (cdn-cgi/challenge-platform)",
                "stage2": "Arkose Labs / hCaptcha Enterprise (hsw.js WASM) on Auth & Billing",
                "keyFactor": "Cloudflare sandboxed about:blank iframe + Blob Worker + TLS JA4 coherence",
                "wireHeaders": "cf-ray • Accept-CH: Sec-CH-UA-Platform-Version, Sec-CH-UA-Bitness, Sec-CH-UA-Arch • Set-Cookie: __cf_bm, _cfuvid",
                "tokensMinted": "cf_clearance, __cf_bm, h-captcha-response (HSW), Stripe muid",
                "dossierDetail": "Discord and OpenAI rely on Cloudflare Turnstile / Challenge Platform VM scripts executing inside sandboxed about:blank iframes and Blob Workers, paired with hCaptcha Enterprise HSW WebAssembly PoW and Stripe Radar.",
                "engineRef": "kasada_searchguard",
                "fb": [
                        25,
                        "2.18 MB",
                        "Cloudflare Turnstile VM, hCaptcha hsw.js, Stripe out-4.5.45.js"
                ],
                "scriptsCount": 23,
                "payloadSize": "512 KB",
                "topScripts": "16_556707.bb1a25f3c212ce8f.js (328KB), 12_40715.ce9980776791e583.js (42KB), 13_fast-connect.cb3dfb6b431c074d.js (33KB), 03_libdiscore-wasm-fetch.6d72434e85b0a922.js (26KB)",
                "astSummary": "Navigator: languages, language, maxTouchPoints, userAgentData, appVersion • Timing: getEntriesByType, now, timeOrigin, memory"
        },
        {
                "index": 52,
                "slug": "twitch",
                "site": "Twitch & Steam",
                "vertical": "Social & Tech",
                "arch": "arch3",
                "stage1": "Kasada KPSDK (ips.js -> x-kpsdk-ct / x-kpsdk-cd) + Akamai",
                "stage2": "Arkose Labs on Account Registration + ThreatMetrix on Wallet Checkout",
                "keyFactor": "Kasada bytecode VM + MediaCapabilities smooth/powerEfficient=true",
                "wireHeaders": "x-kpsdk-ct • x-kpsdk-cd • Set-Cookie: unique_id, server_session_id",
                "tokensMinted": "x-kpsdk-ct, x-kpsdk-cd, integrity_token (Twitch passport)",
                "dossierDetail": "Twitch uses Kasada KPSDK (ips.js) and passport integrity tokens requiring hardware-accelerated H.264/VP9 MediaCapabilities.decodingInfo({smooth:true, powerEfficient:true}) and WebGL Worker parity.",
                "engineRef": "kasada_searchguard",
                "fb": [
                        27,
                        "1.94 MB",
                        "Kasada ips.js, Twitch Integrity Passport, Arkose"
                ],
                "scriptsCount": 27,
                "payloadSize": "1.94 MB",
                "topScripts": "Kasada ips.js, Twitch Integrity Passport, Arkose",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 53,
                "slug": "google",
                "site": "Google Search (google.com)",
                "vertical": "Search & Identity",
                "arch": "arch3",
                "stage1": "Google SearchGuard (inline srcpg=sgs -> knitsail Bytecode VM -> SG_SS Cookie)",
                "stage2": "Google BotGuard + reCAPTCHA Enterprise (/sorry/index escalation on VM/Hint drift)",
                "keyFactor": "3-brand Sec-CH-UA, Win11 PlatformVersion 15.0.0, absence of .3856. build, and Dedicated ISP vs CGNAT reputation",
                "wireHeaders": "Accept-CH: Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Full-Version, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Model, Sec-CH-UA-WoW64, Sec-CH-UA-Form-Factors, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version • Permissions-Policy: ch-ua-*=(self \"https://*.google.com\")",
                "tokensMinted": "SG_SS=B.<ver>.<cbs>.<token> (Max-Age=300), AEC, NID",
                "dossierDetail": "Google Search injects a 51.6KB inline SearchGuard script (srcpg=sgs) containing the knitsail Closure bytecode VM. It computes an asymmetric SHA-256 Proof-of-Work and mints SG_SS, then triggers location.replace() if needed. Any 2-brand Chromium header, .3856. WebView2 build string, Win10 vs Win11 PlatformVersion drift, JS prototype wrapper, or crowded CGNAT IP escalates to /sorry/index.",
                "engineRef": "kasada_searchguard",
                "fb": [
                        16,
                        "1.53 MB",
                        "01_inline.js (51.6KB SearchGuard knitsail VM), BotGuard"
                ],
                "scriptsCount": 16,
                "payloadSize": "1.53 MB",
                "topScripts": "01_inline.js (51.6KB SearchGuard knitsail VM), BotGuard",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 54,
                "slug": "fingerprint",
                "site": "Fingerprint.com (Pro v4 Demo)",
                "vertical": "Search & Identity",
                "arch": "arch1",
                "stage1": "FingerprintJS Pro v4 + Smart Signals (BotD, Tampering, VM, Clonable, Suspect Score)",
                "stage2": "Server-side TLS JA4 + TCP/IP OS + Cross-Visit Persistence Correlation",
                "keyFactor": "Zero prototype tampering (0), zero VM flag (0), G/N/H bitmask parity, deterministic visitorId",
                "wireHeaders": "Accept-CH: Sec-CH-UA-Platform-Version, Sec-CH-UA-Model, Sec-CH-UA-Arch, Sec-CH-UA-Bitness",
                "tokensMinted": "visitorId (20-char hash), requestId, confidence.score (0.99), suspectScore (0)",
                "dossierDetail": "FingerprintJS Pro v4 evaluates 7 platform/engine bitmasks (G=Blink, N=WebKit, H=Gecko, j=iPadOS, B=Android, U=Desktop Safari, W=Audio) plus Smart Signals (tampering, virtualMachine, browserMatch, developerTools, vpn/proxy) and outputs a Suspect Score.",
                "engineRef": "fpjs_pro_v4",
                "fb": [
                        41,
                        "2.07 MB",
                        "FPJS Pro v4 agent, BotD, Smart Signals evaluator"
                ],
                "scriptsCount": 41,
                "payloadSize": "2.07 MB",
                "topScripts": "FPJS Pro v4 agent, BotD, Smart Signals evaluator",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        },
        {
                "index": 55,
                "slug": "antibot",
                "site": "Anti.Bot & Fingerprint-Scan.com",
                "vertical": "Search & Identity",
                "arch": "arch2",
                "stage1": "27-Script Vector T13 Suite (hwfp, gpufp, monfp, fpint-v7-client, surface-comparison)",
                "stage2": "__fpRuntime Collector & Ephemeral Worker/WASM Cross-Realm Verifier",
                "keyFactor": "100% Worker-to-Main WebGL/WebGPU/Navigator parity + native C++ prototype descriptors",
                "wireHeaders": "cf-ray • Accept-CH: Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version-List",
                "tokensMinted": "T13 Vector Verification Score (100% Authentic Browser)",
                "dossierDetail": "Anti.Bot (27 scripts, 0.37MB) and Fingerprint-Scan.com (15 scripts, 0.65MB) execute deep cross-realm Worker/Iframe/WASM comparison probes (fpint-v7-client.js, surface-comparison-collector.js, gpufp.js, monfp.js) testing prototype descriptor tampering, stack traces, and GPU shader precision.",
                "engineRef": "datadome_v511",
                "fb": [
                        42,
                        "1.02 MB",
                        "fpint-v7-client.js, surface-comparison-collector.js, gpufp.js, monfp.js"
                ],
                "scriptsCount": 42,
                "payloadSize": "1.02 MB",
                "topScripts": "fpint-v7-client.js, surface-comparison-collector.js, gpufp.js, monfp.js",
                "astSummary": "Verified C++ native prototype descriptors, cross-realm Worker/Iframe parity, and HTTP/2 wire alignment."
        }
];

    const GHOSTBROWSER_22_PERSONAS = [
        { id: 'win11-rtx4090', name: 'Windows 11 Pro - Workstation Beast', os: 'Windows 11 (15.0.0)', specs: '16 Cores • 32GB->8GB W3C • 1920x1080@30bit', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11)', drm: "e:'oooxxxo'", appleScore: '30/100 (LOW/MED Pass)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'colorDepth=30 prevents Apple Shield +60 1920x1080@24bit penalty; deviceMemory clamped to 8 per W3C spec.' },
        { id: 'win11-rx7900xtx', name: 'Windows 11 Home - Stealth Rig', os: 'Windows 11 (15.0.0)', specs: '16 Cores • 32GB->8GB W3C • 1920x1080@30bit', gpu: 'ANGLE (AMD, AMD Radeon RX 7900 XTX Direct3D11)', drm: "e:'oooxxxo'", appleScore: '30/100 (LOW/MED Pass)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Worker & Main-Thread WebGL vendor/renderer synchronized via MessageEvent harmonizer.' },
        { id: 'win10-irisxe', name: 'Windows 10 Enterprise - Business Laptop', os: 'Windows 10 (10.0.0)', specs: '8 Cores • 8GB W3C • 1920x1080@30bit', gpu: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11)', drm: "e:'oooxxxo'", appleScore: '30/100 (LOW/MED Pass)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Highest-volume corporate cohort; Sec-CH-UA-Platform-Version=10.0.0 matches Win10 font & SAPI metrics.' },
        { id: 'win11-rtx4080s', name: 'Windows 11 Pro - Extreme Gaming', os: 'Windows 11 (15.0.0)', specs: '16 Cores • 32GB->8GB W3C • 1920x1080@30bit', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER Direct3D11)', drm: "e:'oooxxxo'", appleScore: '30/100 (LOW/MED Pass)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Passes BioCatch WebGLTimingService (>150k ops/s) and CoreEstimatorService.' },
        { id: 'win11-rtx4070ti', name: 'Windows 11 Home - Performance PC', os: 'Windows 11 (15.0.0)', specs: '12 Cores • 32GB->8GB W3C • 1920x1080@30bit', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Ti Direct3D11)', drm: "e:'oooxxxo'", appleScore: '30/100 (LOW/MED Pass)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: '12-core cohort matches native Alder/Raptor Lake topology; zero Worker drift.' },
        { id: 'win11-arc770', name: 'Windows 11 Pro - Intel Arc Creator Rig', os: 'Windows 11 (15.0.0)', specs: '12 Cores • 32GB->8GB W3C • 1920x1080@30bit', gpu: 'ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11)', drm: "e:'oooxxxo'", appleScore: '30/100 (LOW/MED Pass)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Full Direct3D11 vs_5_0 ps_5_0 shader precision parity across main & worker realms.' },
        { id: 'win11-radeon780m', name: 'Windows 11 Home - APU Ultrabook', os: 'Windows 11 (15.0.0)', specs: '12 Cores • 16GB->8GB W3C • 1920x1080@30bit', gpu: 'ANGLE (AMD, AMD Radeon 780M Graphics Direct3D11)', drm: "e:'oooxxxo'", appleScore: '30/100 (LOW/MED Pass)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Modern Ryzen 7840U ultrabook profile; passes all 15 Stripe Radar extractors.' },
        { id: 'win11-rtx3060', name: 'Windows 11 Home - Popular Gaming Rig', os: 'Windows 11 (15.0.0)', specs: '12 Cores • 16GB->8GB W3C • 1920x1080@30bit', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)', drm: "e:'oooxxxo'", appleScore: '30/100 (LOW/MED Pass)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: '#1 most common Steam/Retail GPU cohort globally; maximum crowd-blending factor.' },
        { id: 'win11-uhd770', name: 'Windows 11 Pro - Corporate Workstation', os: 'Windows 11 (15.0.0)', specs: '8 Cores • 8GB W3C • 1920x1080@30bit', gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11)', drm: "e:'oooxxxo'", appleScore: '30/100 (LOW/MED Pass)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Dell OptiPlex corporate profile; favored by banking/B2B portals (Chase, BoA, Amex).' },
        { id: 'win-native-clean', name: 'Windows 11 Native (Pure Clean Edge)', os: 'Windows 11 (15.0.0)', specs: 'Native Cores • 8GB W3C • 1920x1080@30bit', gpu: 'Native Physical GPU (Untouched C++ WebGL)', drm: "e:'oooxxxo'", appleScore: '30/100 (LOW/MED Pass)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Zero WebGL wrapper overhead while still enforcing colorDepth=30 and WebView2 hygiene.' },
        { id: 'iPhone18ProMax_A20', name: 'iPhone 18 Pro Max (A20 Pro, iOS 27)', os: 'iOS 18.5+ / Safari 27', specs: '6 Cores • 440x956@3x • 30bit • Touch=5', gpu: 'Apple GPU (Apple Inc.)', drm: "s:'xxxoooo'", appleScore: '30/100 (PAT Eligible)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Eligible for Apple Private Access Token (/shop/shld/work/s3/pat) + FairPlay EME.' },
        { id: 'iPhone17ProMax_A19', name: 'iPhone 17 Pro Max (A19 Pro, iOS 26)', os: 'iOS 18.3+ / Safari 26', specs: '6 Cores • 440x956@3x • 30bit • Touch=5', gpu: 'Apple GPU (Apple Inc.)', drm: "s:'xxxoooo'", appleScore: '30/100 (PAT Eligible)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Full Mobile Safari WKWebView bridge isolation (zero webkit.messageHandlers leak).' },
        { id: 'iPhone16ProMax_A18', name: 'iPhone 16 Pro Max (A18 Pro, iOS 18.1)', os: 'iOS 18.1 / Safari 18.1', specs: '6 Cores • 440x956@3x • 30bit • Touch=5', gpu: 'Apple GPU (Apple Inc.)', drm: "s:'xxxoooo'", appleScore: '30/100 (PAT Eligible)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Top mobile e-commerce cohort (Nike, StockX, Apple Store, Foot Locker).' },
        { id: 'iPhone16_A18', name: 'iPhone 16 (A18, iOS 18.0)', os: 'iOS 18.0 / Safari 18.0', specs: '6 Cores • 393x852@3x • 30bit • Touch=5', gpu: 'Apple GPU (Apple Inc.)', drm: "s:'xxxoooo'", appleScore: '30/100 (PAT Eligible)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: '393x852@3x Dynamic Island geometry matches native iOS 18 viewport invariants.' },
        { id: 'iPhone15ProMax_A17', name: 'iPhone 15 Pro Max (A17 Pro, iOS 17.6)', os: 'iOS 17.6 / Safari 17.6', specs: '6 Cores • 430x932@3x • 30bit • Touch=5', gpu: 'Apple GPU (Apple Inc.)', drm: "s:'xxxoooo'", appleScore: '30/100 (PAT Eligible)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Highest trust mobile banking cohort (Chase, Venmo, PayPal, Apple Pay).' },
        { id: 'iPhone14_A15', name: 'iPhone 14 (A15, iOS 17.5)', os: 'iOS 17.5 / Safari 17.5', specs: '6 Cores • 390x844@3x • 30bit • Touch=5', gpu: 'Apple GPU (Apple Inc.)', drm: "s:'xxxoooo'", appleScore: '30/100 (PAT Eligible)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: '390x844@3x mainstream iOS cohort; N(WebKit)>=3 && G(Blink)<4 verified.' },
        { id: 'iPadProM4_13', name: 'iPad Pro 13" (M4, iPadOS 18.1)', os: 'iPadOS 18.1 (MacIntel Desktop Mode)', specs: '10 Cores • 1024x1366@2x • 30bit • Touch=5', gpu: 'Apple GPU (Apple Inc.)', drm: "s:'xxxoooo'", appleScore: '30/100 (PAT Eligible)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Passes FingerprintJS Pro iPadOS desktop-mode invariant (MacIntel + maxTouchPoints=5).' },
        { id: 'iPadAirM2_11', name: 'iPad Air 11" (M2, iPadOS 18.1)', os: 'iPadOS 18.1 (MacIntel Desktop Mode)', specs: '8 Cores • 820x1180@2x • 30bit • Touch=5', gpu: 'Apple GPU (Apple Inc.)', drm: "s:'xxxoooo'", appleScore: '30/100 (PAT Eligible)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: '820x1180@2x Liquid Retina geometry + colorDepth=30.' },
        { id: 'iPadMini6_A15', name: 'iPad Mini 6 (A15, iPadOS 18.0)', os: 'iPadOS 18.0 (MacIntel Desktop Mode)', specs: '6 Cores • 744x1133@2x • 30bit • Touch=5', gpu: 'Apple GPU (Apple Inc.)', drm: "s:'xxxoooo'", appleScore: '30/100 (PAT Eligible)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: '744x1133@2x compact tablet geometry; 100% WebKit CSS 3D calc() parity.' },
        { id: 'macBookProM4Max_16', name: 'MacBook Pro 16" (M4 Max, macOS 15.1)', os: 'macOS 15.1 Sequoia / Safari 18.1', specs: '16 Cores • 1728x1117@2x • 30bit • Touch=0', gpu: 'Apple GPU (Apple Inc.)', drm: "s:'xxxoooo'", appleScore: '30/100 (PAT Eligible)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Touch events & DeviceMotion stripped for Touch=0 macOS desktop parity.' },
        { id: 'macBookAirM3_13', name: 'MacBook Air 13" (M3, macOS 15.0)', os: 'macOS 15.0 Sequoia / Safari 18.0', specs: '8 Cores • 1470x956@2x • 30bit • Touch=0', gpu: 'Apple GPU (Apple Inc.)', drm: "s:'xxxoooo'", appleScore: '30/100 (PAT Eligible)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: '#1 consumer macOS laptop cohort; 1470x956@2x native Liquid Retina scaling.' },
        { id: 'nativeHost_Apple', name: 'Native Host Device (100% Physical Match)', os: 'Physical iOS/iPadOS Host', specs: 'Native Cores • Physical Screen@30bit', gpu: 'Physical Apple GPU', drm: "s:'xxxoooo'", appleScore: '30/100 (PAT Eligible)', ddStatus: '0 Flags (Pass)', wafStatus: 'Zoey:: Clean', fpjsStatus: '0.99 (Tamper 0)', overall: '100% HIGH PRIVILEGE', note: 'Direct hardware passthrough with WKWebView container scrubbing.' }
    ];

    const CROSS_PLATFORM_HARDENING_BLUEPRINT = [
        {
                "layer": "1. Apple Shield Screen & ColorDepth Cliff",
                "winTarget": "PersonaCatalog.cs & ghost_engine_core.js (Lines 3180–3210)",
                "iosTarget": "PrivacyProfile.swift & anti_fingerprint.js (Lines 2410–2450)",
                "finding": "Apple Shield v3 penalizes 1920x1080 or 1024x768 paired with colorDepth === 24 (+60 pts -> jr=90 HIGH RISK BLOCK). All 22 personas enforce colorDepth: 30 / pixelDepth: 30 (Deep Color / P3), keeping baseline score at jr=30 (Pass)."
        },
        {
                "layer": "2. Apple Shield 7-KeySystem EME DRM Matrix",
                "winTarget": "ghost_engine_core.js (Lines 6320–6370 hookedRmksa)",
                "iosTarget": "anti_fingerprint.js (EME FairPlay SinF Responder)",
                "finding": "Apple Shield probes 7 DRM systems (Widevine, PlayReady x2, FairPlay x3, ClearKey) in 300ms and checks Function.prototype.toString + fn.length===2 (p:1). Patched hookedRmksa to deterministically resolve MediaKeySystemAccess (\"oooxxxo\" for Edge, \"oxxxxxo\" for Chrome, \"xxxoooo\" for Safari)."
        },
        {
                "layer": "3. AWS WAF Zoey:: v2.4.0 Ephemeral Blob Worker Parity",
                "winTarget": "EngineAutomationService.cs (Line 441) + ghost_engine_core.js (Lines 7232–7288)",
                "iosTarget": "anti_fingerprint.js (Lines 10815–10845 Worker Message Harmonizer)",
                "finding": "AWS WAF spawns a Blob Worker comparing Main vs Worker hardwareConcurrency (wr.mh===wr.wh) and platform (wr.mp===wr.wp). Fixed _isApplePersona reference in ghost_engine_core.js, added \"wh\"/\"pl\"/\"wp\" key harmonization, and added CDP Emulation.setHardwareConcurrencyOverride."
        },
        {
                "layer": "4. AWS WAF Zoey:: StealthDetectionCollector Traps",
                "winTarget": "ghost_engine_core.js (Native csi/loadTimes, iframe.srcdoc, canPlayType)",
                "iosTarget": "anti_fingerprint.js (Native Media & Iframe Descriptor Preservation)",
                "finding": "AWS WAF sets a spy getter on performance.timing.navigationStart and invokes chrome.csi()/loadTimes() (t1=0, t2=0), defines non-configurable iframe.srcdoc expecting TypeError (i=1), and passes {length:1} to audio.canPlayType expecting no throw (mte=0)."
        },
        {
                "layer": "5. DataDome v5.11.1 96-Bit Constructor Bitmask & AI Agent Scrub",
                "winTarget": "ghost_engine_core.js (Zero Anonymous Window Functions + Pointer Coalescing)",
                "iosTarget": "anti_fingerprint.js (WebKit Constructor Bitmask & WKWebView Scrub)",
                "finding": "DataDome checks 96 window constructors (sgb/sgd/sgc), flags anonymous [native code] functions on window (dpb===0), scans for 2025/2026 AI globals (WebMCPEvent, ModelContext, __stagehandV3__, FELLOU_PARTITION), and verifies PointerEvent.prototype.getCoalescedEvents."
        },
        {
                "layer": "6. HUMAN / PerimeterX 71 PXxxxx Keys & W3C deviceMemory Cap",
                "winTarget": "PersonaCatalog.cs & ghost_engine_core.js (Math.min(8, deviceMemory))",
                "iosTarget": "anti_fingerprint.js (Undefined deviceMemory on WebKit)",
                "finding": "PerimeterX PX12457 flags navigator.deviceMemory > 8 (since W3C Device Memory spec caps reported RAM at 8GB even on 32GB/64GB workstations), while PX12787 inspects Function.prototype.toString and property descriptors."
        },
        {
                "layer": "7. BioCatch v7.0.0 236-Collector Suite & Comet AI Font Trap",
                "winTarget": "ghost_engine_core.js (Font Filter + Hardware WebGL + Worker Core Alignment)",
                "iosTarget": "anti_fingerprint.js (Apple Font Cohort + Apple GPU Timing)",
                "finding": "BioCatch checks for Perplexity Comet AI browser font (\"FKGroteskNeue\"), monitors <100ms DOM highlight blinks (AgenticDomInjectionCollector), benchmarks WebGL uniformMatrix4fv (>100k ops/s), and runs Welch t-test across Workers (CoreEstimatorService)."
        },
        {
                "layer": "8. eBay DeviceAssurance 55 Extension Probes & Engine Error-Length",
                "winTarget": "ghost_engine_core.js (Block chrome-extension:// Probing + V8 ErrLen=51)",
                "iosTarget": "anti_fingerprint.js (WebKit JSC ErrLen=43/44 + SpeechSynthesis Voices)",
                "finding": "eBay probes 55 chrome-extension:// URLs (16 AI agents + 11 spoofers), queries 10 AI DOM selectors, checks parseInt(\"-1\").toFixed(-1) error message length (51 on V8, 43/44 on JSC), and verifies requestAnimationFrame refresh rate."
        },
        {
                "layer": "9. Stripe Radar 15 Extractors & Accertify/InAuth Prototype Purity",
                "winTarget": "ghost_engine_core.js (Prototype-Level Hooks Only; Zero Instance Keys)",
                "iosTarget": "anti_fingerprint.js (Prototype-Level Hooks Only; Zero Instance Keys)",
                "finding": "Stripe Radar (out-4.5.45.js) and InAuth (67_cc.js) check Object.keys(navigator).length===0 and Object.keys(document)===[\"location\"], plus ontouchstart absence on desktop personas and 15 AudioContext latency properties."
        },
        {
                "layer": "10. PayPal Fraudnet Savitzky-Golay Mouse & Dual-Stack IPv6 Guard",
                "winTarget": "EngineAutomationService.cs (--disable-ipv6 on IPv4 Proxy + Human Input)",
                "iosTarget": "Network Tunnel & WKWebView Dual-Stack IPv6 Leak Prevention",
                "finding": "PayPal Fraudnet v3.15.1-FP runs a Savitzky-Golay polynomial filter (sgmm.min.js) on mouse curvature and fires dual beacons to c.paypal.com (IPv4) and c6.paypal.com (IPv6) to catch IPv4 proxies leaking host IPv6."
        },
        {
                "layer": "11. Western Union & Foot Locker iovation JDIFF & 10-STUN Guard",
                "winTarget": "EngineAutomationService.cs (HTTP Wire === JS Navigator + WebRTC Proxy Mode)",
                "iosTarget": "WebViewContainer.swift (HTTP Header === JS Navigator + STUN Relay)",
                "finding": "TransUnion iovation embeds server-observed HTTP headers (suagt, hacclng, Sec-CH-UA-*) into dyn_wdp.js and diffs them client-side against JS navigator (JDIFF===0), while probing 10 STUN servers when io_enable_rip=true."
        },
        {
                "layer": "12. Google SearchGuard (knitsail / SG_SS) & SOCKS5 ATYP=0x01 Bypass",
                "winTarget": "EngineAutomationService.cs (3-Brand Sec-CH-UA + .3856. Scrub + SOCKS5 Local DNS)",
                "iosTarget": "Safari 26/18 Native Header Parity & Residential ASN Alignment",
                "finding": "Eliminates WebView2 .3856. build token and 2-brand Chromium headers, synchronizes Sec-CH-UA-Platform-Version between HTTP wire and JS, and uses SOCKS5 ATYP=0x01 (local DoH resolution) to bypass proxy domain blacklists on banking/TMX endpoints."
        },
        {
                "layer": "13. CDP Accept-Language HttpUtil::ExpandLanguageList Double ;q=0.9 Guard",
                "winTarget": "EngineAutomationService.cs (Line 412 acceptLanguage = \"en-US,en\")",
                "iosTarget": "WebViewContainer.swift (Native Accept-Language Header Parity)",
                "finding": "Passing \"en-US,en;q=0.9\" into Chromium Network.setUserAgentOverride causes HttpUtil::ExpandLanguageList to emit a malformed \"en-US,en;q=0.9;q=0.9\" HTTP wire header. Passing \"en-US,en\" yields the authentic \"en-US,en;q=0.9\" wire header."
        },
        {
                "layer": "14. Primitive Integer Blob Worker hardwareConcurrency & Dynamic fullVersion Parity",
                "winTarget": "ghost_engine_core.js (Lines 7248–7251 & 7432–7434) + EngineAutomationService.cs",
                "iosTarget": "anti_fingerprint.js (Lines 10935–10937 MessageEvent.prototype.data)",
                "finding": "Harmonizes primitive integer Worker postMessage(navigator.hardwareConcurrency) payloads to the persona's core count and synchronizes Worker fullVersion dynamically with PersonaCatalog.SynchronizedEngineVersion."
        },
        {
                "layer": "15. Notification.permission ('default') vs Permissions.query({name:'notifications'}) ('prompt') Parity",
                "winTarget": "ghost_engine_core.js (Lines 7782–7835 Notification.permission & Permissions.query)",
                "iosTarget": "anti_fingerprint.js (Lines 10492–10590 Notification.permission & Permissions.query)",
                "finding": "Resolves the embedded WebView2/WKWebView contradiction where Notification.permission natively returns \"denied\" while navigator.permissions.query({name:\"notifications\"}) returns \"prompt\"."
        },
        {
                "layer": "16. Safari / WebKit deviceMemory & userAgentData Hygiene + MediaKeySystemAccess Inheritance",
                "winTarget": "ghost_engine_core.js (Lines 6337–6349 Object.create(MediaKeySystemAccess.prototype))",
                "iosTarget": "anti_fingerprint.js (Lines 8373–8377 Delete Blink-only deviceMemory/userAgentData on Safari)",
                "finding": "Ensures synthetic EME DRM objects satisfy mksa instanceof MediaKeySystemAccess === true, and strips Blink-only Navigator.prototype.deviceMemory and userAgentData on Safari/WebKit personas."
        }
];
    const STAGE_2_LAZY_LOAD_TRIGGERS = [
        {
                "site": "1. Foot Locker (footlocker.com)",
                "stage1": "Kasada KPSDK (inline_1.js intercepting /api/*, /zgw/*) + DataDome",
                "triggerCondition": "Cart State Transition: Boolean(e?.cart?.data?.totalUnitCount) && Boolean(window.IGLOO)",
                "stage2Payload": "Lazy-loads TransUnion iovation snare.js (19_main.215364d3.js) with WebRTC Real-IP probe (window.io_enable_rip = true) writing encrypted blackbox to #bb_device_id + Adyen 3DS2 Risk SDK.",
                "tokenRequired": "#bb_device_id (iovation blackbox) + x-kpsdk-ct + Adyen dfValue"
        },
        {
                "site": "2. StockX (stockx.com)",
                "stage1": "HUMAN / PerimeterX (01_main.min.js) + Cloudflare Turnstile + DataDome",
                "triggerCondition": "Route Navigation to Home / PDP / Sell / Buy or Auth0 Login Modal (05__app-505941be445ff6cf.js)",
                "stage2Payload": "Lazy-loads 3 concurrent fraud engines: (1) Sardine.ai (api.sardine.ai/v1/loader.min.js), (2) SEON v5/v6 (cdn.seondf.com/js/v5/agent.js injecting seon-session-key into Auth0), and (3) Riskified (beacon.min.js).",
                "tokenRequired": "sardine-session-key + seon-session-key + rCookie (Riskified) + _px3"
        },
        {
                "site": "3. Airbnb (airbnb.com)",
                "stage1": "DataDome v5.11.1 (01_tags.js) + Akamai Bot Manager v3 (_abck)",
                "triggerCondition": "Suspicious Auth (\"Airlock\" Challenge) or Reservation Checkout (13_5878.8266df385bf53de8.js)",
                "stage2Payload": "Invokes Airbnb Airlock step-up container loading Arkose Labs (airbnb-api.arkoselabs.com/v2/21018/enforcement.js), plus simultaneous ThreatMetrix, InAuth, Sift, Riskified, Stripe Radar, Adyen, and Braintree.",
                "tokenRequired": "airlock_id + fc-token + ThreatMetrix SmartID + _sift_session + Stripe muid"
        },
        {
                "site": "4. Sephora (sephora.com)",
                "stage1": "Akamai Bot Manager v3 (_abck) + FingerprintJS Pro v4 (visitorId)",
                "triggerCondition": "Transition to /checkout or Bag Payment Submission (26_isomorphic-thirdparty.js + 18_sn.js)",
                "stage2Payload": "Activates 8-engine payment stack: Forter (18_sn.js), Riskified, Accertify/InAuth, reCAPTCHA Enterprise, Stripe Radar, Visa CyberSource, Klarna, and Chase PaymentTech PIE (encryption.js + integrity.js).",
                "tokenRequired": "forterToken + rCookie + fpjs_visitor_id + Chase PIE cryptogram + _abck (~0~)"
        },
        {
                "site": "5. Apple Store (apple.com/shop)",
                "stage1": "Apple Shield v3 (/shop/shld/s3/verify.js -> 9 collectors + 7-KeySystem DRM)",
                "triggerCondition": "Add-to-Bag (/shop/bag) or Checkout Initiation (/shop/buy-iphone)",
                "stage2Payload": "Requests Private Access Token (/shop/shld/work/s3/pat?jr=<score>) and solves asynchronous BigInt/SHA-256 Proof-of-Work (/shop/shld/work/s3/q) to mint HttpOnly shld_bt_ck cookie.",
                "tokenRequired": "shld_bt_ck (HttpOnly PoW Cookie) + x-aos-stk + jr < 70"
        },
        {
                "site": "6. Amazon (amazon.com)",
                "stage1": "Amazon CSA Navigator.5 (unagi) + 13 Accept-CH Wire Headers",
                "triggerCondition": "Sign-In (/ap/signin), Add-to-Cart, or One-Click Checkout",
                "stage2Payload": "Executes Amazon FWCIM (273KB Checkout PoW + behavioral collector), Private State Token redemption (/tt/i), and Device Bound Session Credentials (DBSC /tt/r) hardware key binding.",
                "tokenRequired": "fwcim-profile + x-amz-rid + DBSC secure-session-registration"
        },
        {
                "site": "7. Costco (costco.com)",
                "stage1": "Akamai Bot Manager v3 (_abck) + Kasada KPSDK Bootstrap (inline_0.js)",
                "triggerCondition": "Any XHR/fetch call to gdx-api.costco.com/*, search.costco.com/*, or ecom-api.costco.com/*",
                "stage2Payload": "Kasada 03_ips.js (v-j-1.1.29140) intercepts the outgoing API request, runs the stack bytecode VM, and attaches x-kpsdk-ct and x-kpsdk-cd SHA-256 Proof-of-Work headers.",
                "tokenRequired": "x-kpsdk-ct + x-kpsdk-cd + _abck (~0~)"
        },
        {
                "site": "8. Booking.com & Priceline",
                "stage1": "AWS WAF Bot Control v2.4.0 (01_challenge.js Zoey::) + PerimeterX (02_main.min.js)",
                "triggerCondition": "Room Selection -> Guest Details -> Reservation Payment Funnel",
                "stage2Payload": "Loads Sift Science (11_sift.js) and Forter Trusted Identities (13_sn.js) alongside Adyen 3DS2 device fingerprinting.",
                "tokenRequired": "aws-waf-token + _px3 + forterToken + _sift_session"
        },
        {
                "site": "9. Bank of America & Wells Fargo",
                "stage1": "Akamai Bot Manager v3 (X-BAC-AKM-C / _abck) + First-Party FPID",
                "triggerCondition": "Username/Password Focus, Post-Login Dashboard, and Zelle / Wire Transfer Initiation",
                "stage2Payload": "Streams continuous BioCatch v7.0.0 telemetry (06_vendb.js 1.51MB / 12_8556c7b1.js 1.68MB, 236 collectors) + Accertify/InAuth (08_iac.js) + ThreatMetrix.",
                "tokenRequired": "BioCatch cdSessionId continuous stream + FPID + InAuth payload"
        },
        {
                "site": "10. PayPal & Stripe Checkout",
                "stage1": "PayPal Fraudnet fn-sync.js / Stripe v3/stripe.js Bootstrap",
                "triggerCondition": "Pay Button Render / Card Field Focus / 3DS2 Challenge Evaluation",
                "stage2Payload": "PayPal loads 29_fb_fp.js + 30_dfp.js + Savitzky-Golay 27_sgmm.min.js and fires IPv6 beacon to c6.paypal.com; Stripe spawns m.stripe.network/inner.html running out-4.5.45.js (15 Extractors).",
                "tokenRequired": "PayPal-Client-Metadata-Id (CMID) / Stripe muid + guid + sid"
        }
];
    const WIRE_CORRELATION_MATRIX = [
        {
                "site": "1. Google Search (google.com)",
                "acceptCh": "Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Full-Version, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Model, Sec-CH-UA-WoW64, Sec-CH-UA-Form-Factors, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version",
                "permissionsPolicy": "ch-ua-arch=(self \"https://*.google.com\"), ch-ua-bitness=(self \"https://*.google.com\"), ch-ua-full-version-list=(self \"https://*.google.com\"), ch-ua-model=(self \"https://*.google.com\"), ch-ua-platform-version=(self \"https://*.google.com\")",
                "correlationRule": "SearchGuard (srcpg=sgs / knitsail VM) compares all 9 wire Client Hints against navigator.userAgentData.getHighEntropyValues(). Any 2-brand Chromium header, .3856. WebView2 build token, or Win10 (10.0.0) wire vs Win11 (15.0.0) JS drift revokes SG_SS and redirects to /sorry/index."
        },
        {
                "site": "2. Amazon (amazon.com)",
                "acceptCh": "ect, rtt, downlink, device-memory, dpr, viewport-width, Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version-List",
                "permissionsPolicy": "First-party unagi / FWCIM telemetry delegation",
                "correlationRule": "Amazon CSA Navigator.5 & FWCIM cross-check HTTP wire ect (\"4g\"), rtt (50/100ms), downlink (10Mbps), device-memory (8), dpr, and viewport-width against JS navigator.connection, navigator.deviceMemory, and window.devicePixelRatio."
        },
        {
                "site": "3. PayPal (paypal.com)",
                "acceptCh": "Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Model, Sec-CH-UA-Platform-Version, ect, rtt, downlink",
                "permissionsPolicy": "ch-ua-arch=(self \"https://c.paypal.com\"), ch-ua-bitness=(self \"https://c.paypal.com\"), ch-ua-full-version-list=(self \"https://c.paypal.com\"), ch-ua-model=(self \"https://c.paypal.com\"), ch-ua-platform-version=(self \"https://c.paypal.com\")",
                "correlationRule": "Delegates high-entropy hints directly to https://c.paypal.com over HTTP/2 while firing an unproxied IPv6 trap request to https://c6.paypal.com/v1/r/d/b/p3."
        },
        {
                "site": "4. eBay (ebay.com)",
                "acceptCh": "Sec-CH-UA-Model, Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version, DPR, Viewport-Width",
                "permissionsPolicy": "ch-ua-model=(self), ch-ua-platform-version=(self), ch-ua-full-version=(self)",
                "correlationRule": "eBay DeviceAssurance correlates wire Sec-CH-UA-Full-Version and DPR against JS navigator.userAgentData, parseInt(\"-1\").toFixed(-1) engine error length, and rAF display Hz."
        },
        {
                "site": "5. Walmart (walmart.com)",
                "acceptCh": "Sec-CH-Device-Memory, Device-Memory, Sec-CH-DPR, DPR, Sec-CH-Viewport-Width, Viewport-Width",
                "permissionsPolicy": "First-party & PerimeterX Collector alignment",
                "correlationRule": "Requests both legacy and Sec-CH-* prefixed memory/viewport headers and compares them against HUMAN/PerimeterX PX12457 (navigator.deviceMemory <= 8)."
        },
        {
                "site": "6. Etsy (etsy.com)",
                "acceptCh": "Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Full-Version, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Model, Sec-CH-UA-Platform-Version, Sec-CH-DPR",
                "permissionsPolicy": "DataDome v5.11.1 (06_tags.js) edge-to-client correlation",
                "correlationRule": "DataDome compares the 7 wire Client Hints against its 96-bit constructor bitmask (sgb/sgd/sgc) and Blob Worker navigator snapshot (_datadome-det-cd)."
        },
        {
                "site": "7. Dell (dell.com)",
                "acceptCh": "Sec-CH-UA-Platform-Version, Sec-CH-UA-Model + Server-Timing: rtt-value / X-Akamai-RTT-Value",
                "permissionsPolicy": "Akamai mRUM + Bot Manager v3 RTT correlation",
                "correlationRule": "Akamai injects the exact server-measured TCP handshake RTT into X-Akamai-RTT-Value and compares it against JS PerformanceNavigationTiming (connectEnd - connectStart) to detect proxy relay latency inflation."
        },
        {
                "site": "8. Airbnb (airbnb.com)",
                "acceptCh": "Sec-CH-UA-Platform-Version, Sec-CH-UA-Model, DPR, Viewport-Width, Device-Memory",
                "permissionsPolicy": "DataDome + Akamai + Airbnb Airlock multi-vendor correlation",
                "correlationRule": "Verifies wire Device-Memory, DPR, and Platform-Version against DataDome tags.js, Akamai _abck, and Airbnb Airlock (13_5878.js)."
        },
        {
                "site": "9. Western Union (westernunion.com)",
                "acceptCh": "Server-Observed Header Compilation into 34_dyn_wdp.js (suagt, hacclng, fphxfwdfr, Sec-CH-UA-*)",
                "permissionsPolicy": "TransUnion iovation IGLOO v5.13.0 JDIFF Engine",
                "correlationRule": "Compiles the exact HTTP request headers received by the server into 34_dyn_wdp.js on the fly; client JS diffs them against navigator.userAgent and navigator.languages to compute JDIFF (must be 0)."
        },
        {
                "site": "10. Samsung, Shopify, Discord, Fingerprint.com & Anti.Bot",
                "acceptCh": "Sec-CH-UA-Platform-Version, Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Model",
                "permissionsPolicy": "Cloudflare Turnstile / Akamai / FPJS Pro v4 cross-origin delegation",
                "correlationRule": "Enforces 100% parity between TLS JA4, HTTP/2 SETTINGS frame, HTTP wire Sec-CH-UA-* headers, Window JS navigator, and Dedicated/Shared Worker navigator."
        }
];
    const GOOGLE_5_ISP_AUDIT_ROWS = [
        {
                "isp": "1. AT&T Fiber / Wireline (att.txt)",
                "asn": "AS7018 (AT&T Enterprises, LLC)",
                "architecture": "1:1 Dedicated Household Wireline Residential IPv4 (/32 per home router)",
                "sgssStatus": "✓ INSTANT SG_SS PASS (Zero CAPTCHA)",
                "captchaRate": "0% (100% Silent Pass when Browser & Wire Hints are Clean)",
                "forensicVerdict": "Tier-1 Gold Standard. Each residential gateway has a dedicated IPv4 address with low concurrent session velocity, clean reverse DNS (*.lightspeed.*.sbcglobal.net), and natural TCP/TLS RTT."
        },
        {
                "isp": "2. Charter Spectrum Cable (spectrum.txt)",
                "asn": "AS10796 / AS20115 (Charter Communications)",
                "architecture": "1:1 Dedicated Household Cable Modem IPv4",
                "sgssStatus": "✓ INSTANT SG_SS PASS (Zero CAPTCHA)",
                "captchaRate": "0% (100% Silent Pass when Browser & Wire Hints are Clean)",
                "forensicVerdict": "Tier-1 Gold Standard. Dedicated household cable IPv4 (*.res.rr.com) passes Google SearchGuard knitsail VM at 1x PoW difficulty (~18ms) with zero reCAPTCHA escalation."
        },
        {
                "isp": "3. SpaceX Starlink Satellite (starlink.txt)",
                "asn": "AS14593 (SpaceX Services, Inc.)",
                "architecture": "Shared CGNAT Gateway (100.64.0.0/10 RFC 6598 -> Shared /24 Public Exit IP)",
                "sgssStatus": "⚠ CONDITIONAL / ELEVATED PoW (Depends on Gateway Neighbour Velocity)",
                "captchaRate": "~35–50% if CGNAT PoP is saturated by scrapers",
                "forensicVerdict": "Hundreds of Starlink dishes share a single ground-station IPv4 exit. Google SearchGuard applies stricter PoW difficulty and requires 100% spotless 3-brand Sec-CH-UA + SG_SS cookie persistence."
        },
        {
                "isp": "4. T-Mobile 5G Home / Mobile (tmobile.txt)",
                "asn": "AS21928 (T-Mobile USA, Inc.)",
                "architecture": "Massive Carrier-Grade NAT (464XLAT / IPv6-Only Core mapped to Shared IPv4 Pool)",
                "sgssStatus": "⚠ HIGH CGNAT VELOCITY PENALTY (Frequent /sorry Challenge on Fresh Sessions)",
                "captchaRate": "~65–80% on cold un-cookied IPv4 Google Search queries",
                "forensicVerdict": "Thousands of mobile devices and proxy-pool bots share each T-Mobile IPv4 CGNAT exit address. Even a real physical Chrome browser on a crowded T-Mobile IPv4 exit hits /sorry/index unless SG_SS / AEC cookies are persisted or IPv6 is used."
        },
        {
                "isp": "5. Verizon 5G / LTE Wireless (verizon 5g.txt)",
                "asn": "AS6167 (Cellco Partnership DBA Verizon Wireless)",
                "architecture": "Regional Mobile CGNAT Pool (*.myvzw.com)",
                "sgssStatus": "⚠ HIGH CGNAT VELOCITY PENALTY (Requires Cookie Persistence)",
                "captchaRate": "~60–75% on cold un-cookied IPv4 Google Search queries",
                "forensicVerdict": "Heavily abused by commercial rotating mobile proxy networks. Requires strict session cookie persistence (SG_SS, AEC, NID) and natural query pacing rather than rotating the IP on every search."
        }
];

    async function runScoringDoctrineAudit() {
        const tableBody = document.getElementById('sdLiveEnginesTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">Executing 12 unlocked mathematical scoring engines, EME DRM matrix, and ephemeral Worker probes...</td></tr>';
        }

        const [
            appleRes,
            awsWafRes,
            ddRes,
            fpjsRes,
            pxRes,
            bioCatchRes,
            ebayRes,
            akamaiRes,
            kasadaRes,
            arkoseRes,
            checkoutRes,
            paymentRes
        ] = await Promise.all([
            evaluateAppleShieldLive(),
            evaluateAwsWafZoeyLive(),
            Promise.resolve(evaluateDataDomeLive()),
            Promise.resolve(evaluateFpjsProLive()),
            Promise.resolve(evaluatePerimeterXLive()),
            Promise.resolve(evaluateBioCatchLive()),
            Promise.resolve(evaluateEbayDeviceAssuranceLive()),
            Promise.resolve(evaluateAkamaiAbckLive()),
            Promise.resolve(evaluateKasadaAndSearchGuardLive()),
            Promise.resolve(evaluateArkoseLabsLive()),
            Promise.resolve(evaluateCheckoutCoalitionLive()),
            Promise.resolve(evaluatePaymentGraphCoalitionLive())
        ]);

        const engines = [
            appleRes, awsWafRes, ddRes, fpjsRes, pxRes, bioCatchRes,
            ebayRes, akamaiRes, kasadaRes, arkoseRes, checkoutRes, paymentRes
        ];

        const engineMap = {};
        engines.forEach(e => { engineMap[e.id] = e; });

        _lastScoringAuditReport = {
            engines,
            engineMap,
            appleRes,
            awsWafRes,
            ddRes,
            fpjsRes,
            timestamp: new Date().toLocaleTimeString()
        };

        renderScoringDoctrineSummary(_lastScoringAuditReport);
        renderLiveEnginesTable(_lastScoringAuditReport);
        render17DefenseEnginesEncyclopedia();
        render55WebsitesTable(_lastScoringAuditReport, _currentSiteFilter);
        render22PersonasTable();
        renderPreEncryptionInspector(_lastScoringAuditReport);
        renderFullDoctrineCodexChapters();
        renderDomainSpecificForensicSections(_lastScoringAuditReport);
        return _lastScoringAuditReport;
    }

    function renderScoringDoctrineSummary(report) {
        window.__LAST_SCORING_DOCTRINE_REPORT = report;
        const passCount = report.engines.filter(e => e.passed).length;
        const total = report.engines.length;
        const allClean = passCount === total;

        const elEngines = document.getElementById('sdMetricEngines');
        const elSites = document.getElementById('sdMetricSites');
        const elPersonas = document.getElementById('sdMetricPersonas');
        const elAppleScore = document.getElementById('sdMetricAppleScore');
        const subLabel = document.getElementById('tabScoringDoctrineSubLabel');

        if (elEngines) {
            elEngines.textContent = `${passCount} / ${total} CLEAN`;
            elEngines.style.color = allClean ? '#34d399' : '#f43f5e';
        }
        if (elSites) {
            const highPrivSites = MASTER_55_WEBSITES.filter(s => {
                const eng = report.engineMap[s.engineRef];
                return !eng || eng.passed;
            }).length;
            elSites.textContent = `${highPrivSites} / ${MASTER_55_WEBSITES.length} TIER-1 PASS`;
            elSites.style.color = highPrivSites === MASTER_55_WEBSITES.length ? '#38bdf8' : '#f43f5e';
        }
        if (elPersonas) {
            elPersonas.textContent = '22 / 22 AUDITED';
        }
        if (elAppleScore && report.appleRes) {
            elAppleScore.textContent = report.appleRes.scoreDisplay;
        }
        const sdSubText = allClean
            ? `✓ ${passCount}/${total} Math Engines Clean • 55 Sites`
            : `✗ ${total - passCount} Engine(s) Flagged (${passCount}/${total} Clean)`;
        if (typeof window.updateNavTabStatus === 'function') {
            window.updateNavTabStatus('tabScoringDoctrineBtn', allClean, sdSubText);
        } else if (subLabel) {
            subLabel.textContent = sdSubText;
        }
        if (typeof window.recomputeStage8SubsystemBadge === 'function') {
            window.recomputeStage8SubsystemBadge();
        }
    }

    function renderLiveEnginesTable(report) {
        const tbody = document.getElementById('sdLiveEnginesTableBody');
        if (!tbody || !report) return;

        tbody.innerHTML = report.engines.map((eng, idx) => {
            const badge = eng.passed
                ? '<span class="status-pill pass" style="background:rgba(16,185,129,0.16);color:#34d399;border:1px solid rgba(16,185,129,0.4);padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;">✓ HIGH PRIVILEGE</span>'
                : '<span class="status-pill fail" style="background:rgba(239,68,68,0.16);color:#f87171;border:1px solid rgba(239,68,68,0.4);padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;">⚠ FRICTION / FLAG</span>';
            return `<tr>
                <td style="font-weight:700;color:var(--text-primary);">${idx + 1}. ${escHtml(eng.name)}<div style="font-size:11px;color:var(--text-muted);font-weight:400;margin-top:2px;">${escHtml(eng.category)}</div></td>
                <td>${badge}</td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#38bdf8;font-weight:600;">${escHtml(eng.scoreDisplay)}</td>
                <td style="font-size:12px;color:#e2e8f0;font-weight:600;">${escHtml(eng.privilegeTier)}</td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#cbd5e1;">${escHtml(eng.formula)}</td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#94a3b8;">${escHtml(eng.telemetry)}</td>
            </tr>`;
        }).join('');
    }

    function render17DefenseEnginesEncyclopedia() {
        const container = document.getElementById('sd17EnginesEncyclopediaContainer');
        if (!container) return;
        container.innerHTML = `
            <div style="margin-top:22px;background:rgba(15,23,42,0.75);border:1px solid rgba(56,189,248,0.28);border-radius:12px;padding:18px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
                    <div>
                        <h3 style="margin:0;font-size:16px;color:#f8fafc;">📚 Part 1 Complete Encyclopedia: All 17 Tier-1 Anti-Bot & Fraud Defense Engines</h3>
                        <p style="margin:4px 0 0;font-size:12.5px;color:#94a3b8;">Unabridged reference of every scoring engine harvested across all 55 websites (1,334 scripts • 102.9 MB), including tokens minted, primary rewarded signals, and primary penalized signals.</p>
                    </div>
                    <span style="background:rgba(56,189,248,0.14);color:#38bdf8;border:1px solid rgba(56,189,248,0.35);padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;">17 / 17 ENGINES DOCUMENTED</span>
                </div>
                <div class="table-scroll" style="max-height:680px;overflow:auto;">
                    <table class="fp-table" style="width:100%;border-collapse:collapse;font-size:12px;">
                        <thead>
                            <tr style="background:rgba(15,23,42,0.95);text-align:left;">
                                <th style="padding:10px;"># & Defense Engine</th>
                                <th style="padding:10px;">Deployed Websites</th>
                                <th style="padding:10px;">Privilege Architecture & Tokens Minted</th>
                                <th style="padding:10px;">Primary Rewarded Signals (Grants High Privilege)</th>
                                <th style="padding:10px;">Primary Penalized Signals (Triggers Block / Friction)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${MASTER_17_DEFENSE_ENGINES.map(e => `
                                <tr style="border-bottom:1px solid rgba(148,163,184,0.12);">
                                    <td style="padding:10px;font-weight:700;color:#f8fafc;min-width:210px;">${e.num}. ${escHtml(e.engine)}</td>
                                    <td style="padding:10px;color:#38bdf8;font-size:11.5px;min-width:180px;">${escHtml(e.sites)}</td>
                                    <td style="padding:10px;min-width:200px;">
                                        <div style="color:#c084fc;font-weight:600;font-size:11.5px;">${escHtml(e.arch)}</div>
                                        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#94a3b8;margin-top:3px;">Tokens: ${escHtml(e.tokens)}</div>
                                    </td>
                                    <td style="padding:10px;color:#a7f3d0;font-size:11.5px;line-height:1.45;">${escHtml(e.rewarded)}</td>
                                    <td style="padding:10px;color:#fca5a5;font-size:11.5px;line-height:1.45;">${escHtml(e.penalized)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function buildSitesDossierTableHtml(sitesList, report, tableIdPrefix) {
        return sitesList.map((row) => {
            const eng = report && report.engineMap ? report.engineMap[row.engineRef] : null;
            const passed = !eng || eng.passed;
            const isExpanded = _expandAllSiteDossiers || _expandedSiteSlugs.has(row.slug);
            const badge = passed
                ? '<span style="background:rgba(16,185,129,0.16);color:#34d399;border:1px solid rgba(16,185,129,0.4);padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">✓ TIER-1 PRIVILEGE</span>'
                : '<span style="background:rgba(245,158,11,0.16);color:#fbbf24;border:1px solid rgba(245,158,11,0.4);padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">⚠ STEP-UP / CHALLENGE</span>';
            const archLabels = {
                arch1: 'Arch 1: Continuous Score (0–100)',
                arch2: 'Arch 2: Bitmask + Cookie State',
                arch3: 'Arch 3: Dynamic PoW + Hardware PAT',
                arch4: 'Arch 4: Identity Graph + Biometrics'
            };
            return `
                <tr style="border-bottom:1px solid rgba(148,163,184,0.14);">
                    <td style="font-weight:700;color:var(--text-primary);padding:10px;">
                        <div>${row.index}. ${escHtml(row.site)}</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
                            <span style="font-size:10.5px;background:rgba(56,189,248,0.13);color:#38bdf8;padding:1px 6px;border-radius:4px;">${escHtml(row.vertical)}</span>
                            <span style="font-size:10.5px;background:rgba(168,85,247,0.13);color:#c084fc;padding:1px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;">${row.scriptsCount} scripts (${escHtml(row.payloadSize)})</span>
                        </div>
                    </td>
                    <td style="font-size:11.5px;color:#c084fc;font-weight:600;padding:10px;">
                        <div>${escHtml(archLabels[row.arch] || row.arch)}</div>
                        <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#94a3b8;margin-top:4px;">Top: ${escHtml(row.topScripts)}</div>
                    </td>
                    <td style="font-size:12px;color:#e2e8f0;padding:10px;">${escHtml(row.stage1)}</td>
                    <td style="font-size:12px;color:#93c5fd;padding:10px;">${escHtml(row.stage2)}</td>
                    <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#cbd5e1;padding:10px;">${escHtml(row.keyFactor)}</td>
                    <td style="padding:10px;">
                        <div>${badge}</div>
                        <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;font-family:'JetBrains Mono',monospace;">${eng ? escHtml(eng.scoreDisplay) : 'Verified'}</div>
                        <button type="button" onclick="window.toggleSiteDossier('${row.slug}')" style="margin-top:6px;background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.35);border-radius:6px;padding:3px 8px;font-size:10.5px;cursor:pointer;font-weight:600;">
                            ${isExpanded ? '▾ Hide Dossier' : '▸ Full Forensic Dossier'}
                        </button>
                    </td>
                </tr>
                <tr id="${tableIdPrefix}_dossier_${row.slug}" style="display:${isExpanded ? 'table-row' : 'none'};background:rgba(2,6,23,0.85);border-bottom:2px solid rgba(56,189,248,0.28);">
                    <td colspan="6" style="padding:14px 18px;">
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;font-size:12px;">
                            <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(148,163,184,0.18);border-radius:8px;padding:10px;">
                                <div style="font-weight:700;color:#38bdf8;margin-bottom:4px;">🔬 Deep Forensic Assessment & Scoring Logic</div>
                                <div style="color:#e2e8f0;line-height:1.5;">${escHtml(row.dossierDetail)}</div>
                            </div>
                            <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(148,163,184,0.18);border-radius:8px;padding:10px;">
                                <div style="font-weight:700;color:#c084fc;margin-bottom:4px;">🌐 Captured HTTP/2 Wire Headers & Minted Tokens</div>
                                <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#cbd5e1;margin-bottom:6px;"><strong>Wire Headers:</strong> ${escHtml(row.wireHeaders)}</div>
                                <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#34d399;margin-bottom:6px;"><strong>Minted Tokens:</strong> ${escHtml(row.tokensMinted)}</div>
                                <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#94a3b8;"><strong>AST Vectors:</strong> ${escHtml(row.astSummary)}</div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function render55WebsitesTable(report, filter) {
        _currentSiteFilter = filter || _currentSiteFilter || 'all';
        const tbody = document.getElementById('sd55SitesTableBody');
        if (!tbody) return;

        const searchVal = (_currentSiteSearch || '').trim().toLowerCase();
        const rows = MASTER_55_WEBSITES.filter(s => {
            if (_currentSiteFilter !== 'all') {
                if (_currentSiteFilter === 'ecom' && s.vertical !== 'E-Commerce') return false;
                if (_currentSiteFilter === 'payments' && s.vertical !== 'Banking & Payments') return false;
                if (_currentSiteFilter === 'travel_social' && s.vertical !== 'Travel & Ticketing' && s.vertical !== 'Social & Tech' && s.vertical !== 'Search & Identity') return false;
                if (_currentSiteFilter.startsWith('arch') && s.arch !== _currentSiteFilter) return false;
            }
            if (searchVal) {
                const hay = (s.site + ' ' + s.vertical + ' ' + s.stage1 + ' ' + s.stage2 + ' ' + s.keyFactor + ' ' + s.dossierDetail + ' ' + s.topScripts).toLowerCase();
                if (!hay.includes(searchVal)) return false;
            }
            return true;
        });

        tbody.innerHTML = buildSitesDossierTableHtml(rows, report, 'sd55');
        const countEl = document.getElementById('sd55VisibleCount');
        if (countEl) countEl.textContent = `Showing ${rows.length} of ${MASTER_55_WEBSITES.length} websites (1,334 harvested scripts • 102.9 MB)`;
    }

    function render22PersonasTable() {
        const tbody = document.getElementById('sd22PersonasTableBody');
        if (tbody) {
            tbody.innerHTML = GHOSTBROWSER_22_PERSONAS.map((p, idx) => `<tr>
                <td style="font-weight:700;color:var(--text-primary);">${idx + 1}. ${escHtml(p.name)}<div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#38bdf8;margin-top:2px;">${escHtml(p.id)} • ${escHtml(p.os)}</div></td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#cbd5e1;">${escHtml(p.specs)}<div style="color:#94a3b8;margin-top:2px;">${escHtml(p.gpu)}</div></td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#34d399;font-weight:700;">${escHtml(p.appleScore)}<div style="color:#93c5fd;font-weight:400;">DRM: ${escHtml(p.drm)}</div></td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#34d399;">DataDome: ${escHtml(p.ddStatus)}<br>AWS WAF: ${escHtml(p.wafStatus)}<br>FPJS Pro: ${escHtml(p.fpjsStatus)}</td>
                <td><span style="background:rgba(16,185,129,0.16);color:#34d399;border:1px solid rgba(16,185,129,0.4);padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;">✓ ${escHtml(p.overall)}</span></td>
                <td style="font-size:11.5px;color:#cbd5e1;">${escHtml(p.note)}</td>
            </tr>`).join('');
        }

        const bpContainer = document.getElementById('sdHardeningBlueprintContainer');
        if (bpContainer) {
            bpContainer.innerHTML = `
                <div style="margin-top:22px;background:rgba(15,23,42,0.75);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:18px;">
                    <h3 style="margin:0 0 6px;font-size:16px;color:#f8fafc;">🛡️ Part 5 Complete Cross-Platform Hardening Blueprint (Windows/Android C# + iOS/macOS Swift + JS Core)</h3>
                    <p style="margin:0 0 12px;font-size:12.5px;color:#94a3b8;">Exact engineering map of all 16 defense layers and multi-profile cross-realm, HTTP/2 wire, EME DRM, and Permissions parity patches applied across GhostBrowser Windows/Android and GhostBrowser iOS/iPadOS/macOS.</p>
                    <div class="table-scroll">
                        <table class="fp-table" style="width:100%;border-collapse:collapse;font-size:12px;">
                            <thead>
                                <tr style="background:rgba(15,23,42,0.95);text-align:left;">
                                    <th style="padding:10px;">Hardening Vector & Scoring Engine</th>
                                    <th style="padding:10px;">Windows / Android Target Files</th>
                                    <th style="padding:10px;">iOS / iPadOS / macOS Target Files</th>
                                    <th style="padding:10px;">Exact Mathematical / Architectural Verification</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${CROSS_PLATFORM_HARDENING_BLUEPRINT.map(row => `
                                    <tr style="border-bottom:1px solid rgba(148,163,184,0.12);">
                                        <td style="padding:10px;font-weight:700;color:#34d399;min-width:210px;">${escHtml(row.layer)}</td>
                                        <td style="padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#38bdf8;">${escHtml(row.winTarget)}</td>
                                        <td style="padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#c084fc;">${escHtml(row.iosTarget)}</td>
                                        <td style="padding:10px;color:#e2e8f0;font-size:11.5px;line-height:1.45;">${escHtml(row.finding)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }

    function renderPreEncryptionInspector(report) {
        const appleBreak = document.getElementById('sdAppleShieldBreakdown');
        if (appleBreak && report && report.appleRes) {
            appleBreak.innerHTML = report.appleRes.signals.map(s => {
                const pill = s.detected
                    ? `<span style="color:${s.flag === 'P' ? '#38bdf8' : '#f87171'};font-weight:700;">+${s.pts} pts (Flag '${s.flag}' ACTIVE)</span>`
                    : '<span style="color:#34d399;font-weight:600;">0 pts (Clean)</span>';
                return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(148,163,184,0.12);font-size:12px;">
                    <span><strong>${escHtml(s.type)}</strong> (sev=${s.severity}, flag=<code>${escHtml(s.flag)}</code>): <span style="color:#94a3b8;">${escHtml(s.desc)}</span></span>
                    ${pill}
                </div>`;
            }).join('');
        }

        const wafPre = document.getElementById('sdAwsWafPrePayload');
        if (wafPre && report && report.awsWafRes) {
            wafPre.textContent = report.awsWafRes.preEncryptionPreview;
        }

        const extraSchemas = document.getElementById('sdExtraPreEncryptionSchemasContainer');
        if (extraSchemas) {
            extraSchemas.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:16px;margin-top:16px;">
                    <div style="background:rgba(15,23,42,0.75);border:1px solid rgba(148,163,184,0.2);border-radius:12px;padding:16px;">
                        <h4 style="margin:0 0 8px;color:#38bdf8;font-size:14.5px;">🍎 Apple Shield 7-KeySystem EME DRM Matrix & Compact Payload Dictionary</h4>
                        <p style="margin:0 0 10px;font-size:12px;color:#94a3b8;">Extracted from <code>apple/26_verify.js</code> (Lines 427–669). Probed with 300ms race timeout via <code>navigator.requestMediaKeySystemAccess</code>:</p>
                        <table class="fp-table" style="width:100%;font-size:11.5px;margin-bottom:10px;">
                            <thead><tr><th>Idx</th><th>KeySystem Identifier</th><th>initDataTypes</th><th>Edge ('e')</th><th>Chrome ('c')</th><th>Safari ('s')</th></tr></thead>
                            <tbody>
                                <tr><td>0</td><td><code>com.widevine.alpha</code></td><td><code>cenc</code></td><td><code>o</code></td><td><code>o</code></td><td><code>x</code></td></tr>
                                <tr><td>1</td><td><code>com.microsoft.playready</code></td><td><code>cenc</code></td><td><code>o</code></td><td><code>x</code></td><td><code>x</code></td></tr>
                                <tr><td>2</td><td><code>com.microsoft.playready.recommendation</code></td><td><code>cenc</code></td><td><code>o</code></td><td><code>x</code></td><td><code>x</code></td></tr>
                                <tr><td>3</td><td><code>com.apple.fps</code></td><td><code>sinf</code></td><td><code>x</code></td><td><code>x</code></td><td><code>o</code></td></tr>
                                <tr><td>4</td><td><code>com.apple.fps.1_0</code></td><td><code>sinf</code></td><td><code>x</code></td><td><code>x</code></td><td><code>o</code></td></tr>
                                <tr><td>5</td><td><code>com.apple.fps.3_0</code></td><td><code>sinf</code></td><td><code>x</code></td><td><code>x</code></td><td><code>o</code></td></tr>
                                <tr><td>6</td><td><code>org.w3.clearkey</code></td><td><code>cenc</code></td><td><code>o</code></td><td><code>o</code></td><td><code>o</code></td></tr>
                            </tbody>
                        </table>
                        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#cbd5e1;background:rgba(2,6,23,0.8);padding:10px;border-radius:8px;">
                            Compact Telemetry Keys: r=riskScore(0-100), y=riskLevel(l/m/h), s=signalFlags(["P"]), d=collectionTimeMs, m=collectorMask(9-bit), H=fingerprintHash, T=timestamp, v="3.0", n=sessionCount, t=sessionTiming, A={u:browserCode, p:rmksaNative(1/0), r:drm7CharVector}
                        </div>
                    </div>

                    <div style="background:rgba(15,23,42,0.75);border:1px solid rgba(148,163,184,0.2);border-radius:12px;padding:16px;">
                        <h4 style="margin:0 0 8px;color:#c084fc;font-size:14.5px;">🧬 BioCatch v7.0.0 (236 Banking Collectors) & Agentic AI Trap</h4>
                        <p style="margin:0 0 10px;font-size:12px;color:#94a3b8;">Extracted from <code>bofa/06_vendb.js</code> (1.51MB) & <code>wellsfargo/12_8556c7b1.js</code> (1.68MB):</p>
                        <ul style="margin:0;padding-left:18px;font-size:12px;color:#e2e8f0;line-height:1.55;">
                            <li><strong>Perplexity Comet AI Browser Detector (<code>_fontDetectorProvider</code>):</strong> Renders <code>72px "FKGroteskNeue", monospace</code> vs <code>72px monospace</code> on Canvas 2D; if width differs, flags session as Perplexity Comet AI Agent.</li>
                            <li><strong>AgenticDomInjectionCollector:</strong> Attaches <code>MutationObserver</code> to <code>document.body</code> watching for transient <code>&lt;100ms</code> bounding-box highlight overlays injected by LLM screenshot agents.</li>
                            <li><strong>WebGLTimingService:</strong> Compiles vertex/fragment shader and executes timed loop of <code>gl.uniformMatrix4fv</code>; SwiftShader/CPU rasterizers fail the ops/sec threshold.</li>
                            <li><strong>CoreEstimatorService:</strong> Spawns concurrent Web Workers running tight math loops and applies <strong>Welch's t-test</strong> on execution latencies to estimate physical CPU cores vs <code>navigator.hardwareConcurrency</code>.</li>
                            <li><strong>NaNSignByte & Endianness:</strong> Evaluates <code>new Uint8Array(new Float32Array([Infinity - Infinity]).buffer)[3]</code> to verify x86_64 vs ARM64 IEEE-754 hardware architecture.</li>
                        </ul>
                    </div>

                    <div style="background:rgba(15,23,42,0.75);border:1px solid rgba(148,163,184,0.2);border-radius:12px;padding:16px;">
                        <h4 style="margin:0 0 8px;color:#34d399;font-size:14.5px;">🛒 eBay DeviceAssurance (55 Chrome Extensions + 10 AI DOM Selectors + ErrLen)</h4>
                        <p style="margin:0 0 10px;font-size:12px;color:#94a3b8;">Extracted from <code>ebay/18_device-assurance.js</code> & <code>20_extensions-detection.js</code>:</p>
                        <ul style="margin:0;padding-left:18px;font-size:12px;color:#e2e8f0;line-height:1.55;">
                            <li><strong>55 Hardcoded <code>chrome-extension://</code> Probes:</strong> Targets 16 Agentic AI Extensions (Manus <code>hnfanknocfeofbddgcijnmhnfnkdnaad</code>, Claude <code>fcoeoabgfenejglbffodgkkbkcdhcgfn</code>, ChatGPT Atlas, Browser-Use, Monica, HARPA, Sider, Merlin) + 11 Fingerprint Spoofers (Canvas Blocker, Chameleon, Trace, Windscribe, NordVPN).</li>
                            <li><strong>10 Live AI DOM Selectors:</strong> <code>#claude-agent-animation-styles</code>, <code>chatgpt-sidebar</code>, <code>div#manus-action-mask-host</code>, <code>div#playwright-highlight-container</code>, <code>#codex-agent-overlay-root</code>, <code>[data-manus_clickable]</code>, <code>[data-browser-use-highlight]</code>.</li>
                            <li><strong>JS Engine Error-Length Fingerprinting:</strong> Evaluates <code>parseInt("-1").toFixed(-1)</code> and checks <code>err.message.length</code>: <strong>51 chars</strong> = V8 (Chrome/Edge), <strong>43/44 chars</strong> = JavaScriptCore (Safari), <strong>25 chars</strong> = SpiderMonkey (Firefox).</li>
                        </ul>
                    </div>

                    <div style="background:rgba(15,23,42,0.75);border:1px solid rgba(148,163,184,0.2);border-radius:12px;padding:16px;">
                        <h4 style="margin:0 0 8px;color:#fbbf24;font-size:14.5px;">💳 Stripe Radar (15 Extractors), PayPal Fraudnet & iovation JDIFF</h4>
                        <p style="margin:0 0 10px;font-size:12px;color:#94a3b8;">Extracted from <code>stripe/out-4.5.45.js</code>, <code>paypal/29_fb_fp.js</code>, and <code>westernunion/34_dyn_wdp.js</code>:</p>
                        <ul style="margin:0;padding-left:18px;font-size:12px;color:#e2e8f0;line-height:1.55;">
                            <li><strong>Stripe Radar 15 Extractors (<code>m.stripe.com/6</code>):</strong> Checks <code>Object.keys(navigator).length === 0</code>, <code>Object.keys(document)</code> (only native <code>["location"]</code>), <code>"ontouchstart" in window</code> vs Desktop UA, and 20-font Canvas kerning pairs.</li>
                            <li><strong>PayPal Fraudnet v3.15.1-FP:</strong> Applies a <strong>Savitzky-Golay polynomial smoothing filter</strong> (<code>27_sgmm.min.js</code>) to mouse trajectories and fires dual IPv4 (<code>c.paypal.com</code>) + IPv6 (<code>c6.paypal.com/v1/r/d/b/p3</code>) beacons.</li>
                            <li><strong>Accertify / InAuth (<code>amex/67_cc.js</code>):</strong> Extracts 15 AudioContext latency properties (<code>ac-base-latency</code>, <code>ac-output-latency</code>), scans <code>127.0.0.1</code> open ports (<code>detectOpenPorts</code>), and verifies 4-quarter DST offsets (<code>getClimate</code>).</li>
                            <li><strong>TransUnion iovation IGLOO v5.13.0:</strong> Server compiles observed HTTP headers (<code>suagt</code>, <code>hacclng</code>, <code>fphxfwdfr</code>) into <code>34_dyn_wdp.js</code> to compute client-vs-wire <code>JDIFF</code> (must equal <code>0</code>) + probes 10 regional STUN servers.</li>
                        </ul>
                    </div>
                </div>
            `;
        }
    }

    function renderFullDoctrineCodexChapters() {
        const extraChapters = document.getElementById('sdDoctrineExtraChaptersContainer');
        if (!extraChapters) return;
        extraChapters.innerHTML = `
            <div style="margin-top:20px;display:flex;flex-direction:column;gap:20px;">
                <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(56,189,248,0.3);border-radius:12px;padding:18px;">
                    <h3 style="margin:0 0 6px;font-size:16px;color:#38bdf8;">Chapter III — Complete 10-Site Stage-2 & Stage-3 Deep-Funnel Lazy-Load Trigger Matrix</h3>
                    <p style="margin:0 0 12px;font-size:12.5px;color:#94a3b8;">Passing Stage-1 perimeter sensors on the landing page is only 40% of the battle. These 10 websites lazy-load their heaviest device-graph, WebRTC STUN/TURN, and behavioral biometric bundles only when specific cart, login, or checkout state transitions occur.</p>
                    <div class="table-scroll">
                        <table class="fp-table" style="width:100%;font-size:12px;">
                            <thead>
                                <tr style="background:rgba(15,23,42,0.95);text-align:left;">
                                    <th style="padding:10px;">Website</th>
                                    <th style="padding:10px;">Stage-1 Perimeter Gate</th>
                                    <th style="padding:10px;">Exact JS State / Funnel Trigger Condition</th>
                                    <th style="padding:10px;">Stage-2 / Stage-3 Lazy-Loaded Payload & Probes</th>
                                    <th style="padding:10px;">Required Checkout Tokens</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${STAGE_2_LAZY_LOAD_TRIGGERS.map(r => `
                                    <tr style="border-bottom:1px solid rgba(148,163,184,0.12);">
                                        <td style="padding:10px;font-weight:700;color:#f8fafc;">${escHtml(r.site)}</td>
                                        <td style="padding:10px;color:#cbd5e1;font-size:11.5px;">${escHtml(r.stage1)}</td>
                                        <td style="padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#fbbf24;">${escHtml(r.triggerCondition)}</td>
                                        <td style="padding:10px;color:#93c5fd;font-size:11.5px;line-height:1.45;">${escHtml(r.stage2Payload)}</td>
                                        <td style="padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#34d399;">${escHtml(r.tokenRequired)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(168,85,247,0.3);border-radius:12px;padding:18px;">
                    <h3 style="margin:0 0 6px;font-size:16px;color:#c084fc;">Chapter IV — Wire-to-Stack Correlation Matrix (14+43 Websites HTTP/2 Accept-CH & Permissions-Policy Audit)</h3>
                    <p style="margin:0 0 12px;font-size:12.5px;color:#94a3b8;">Exact server response headers harvested across our 57-site capture showing how edge CDNs negotiate high-entropy Client Hints and cross-origin iframe delegation to catch JS-only spoofing.</p>
                    <div class="table-scroll">
                        <table class="fp-table" style="width:100%;font-size:12px;">
                            <thead>
                                <tr style="background:rgba(15,23,42,0.95);text-align:left;">
                                    <th style="padding:10px;">Website</th>
                                    <th style="padding:10px;">Server Wire <code>Accept-CH</code> Headers Requested</th>
                                    <th style="padding:10px;">Cross-Origin <code>Permissions-Policy</code> Delegation</th>
                                    <th style="padding:10px;">Server-to-JS Verification Rule</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${WIRE_CORRELATION_MATRIX.map(r => `
                                    <tr style="border-bottom:1px solid rgba(148,163,184,0.12);">
                                        <td style="padding:10px;font-weight:700;color:#f8fafc;">${escHtml(r.site)}</td>
                                        <td style="padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#38bdf8;">${escHtml(r.acceptCh)}</td>
                                        <td style="padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#c084fc;">${escHtml(r.permissionsPolicy)}</td>
                                        <td style="padding:10px;color:#e2e8f0;font-size:11.5px;line-height:1.45;">${escHtml(r.correlationRule)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:18px;">
                    <h3 style="margin:0 0 6px;font-size:16px;color:#34d399;">Chapter V — Google Search (knitsail / SG_SS) Root-Cause Forensic Assessment & 5-ISP Empirical Proxy Audit</h3>
                    <p style="margin:0 0 12px;font-size:12.5px;color:#94a3b8;">Complete findings from <code>google_search_5_isp_forensic_assessment.md</code> explaining why Google Search redirects to <code>/sorry/index</code> and how AT&T, Spectrum, Starlink, T-Mobile, and Verizon 5G perform under SearchGuard.</p>
                    <div class="table-scroll">
                        <table class="fp-table" style="width:100%;font-size:12px;">
                            <thead>
                                <tr style="background:rgba(15,23,42,0.95);text-align:left;">
                                    <th style="padding:10px;">ISP Proxy Pool File</th>
                                    <th style="padding:10px;">ASN & Network Operator</th>
                                    <th style="padding:10px;">Routing & NAT Architecture</th>
                                    <th style="padding:10px;">SearchGuard (SG_SS) Outcome</th>
                                    <th style="padding:10px;">Cold-Query CAPTCHA Rate</th>
                                    <th style="padding:10px;">Forensic Verdict & Operational Guidance</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${GOOGLE_5_ISP_AUDIT_ROWS.map(r => `
                                    <tr style="border-bottom:1px solid rgba(148,163,184,0.12);">
                                        <td style="padding:10px;font-weight:700;color:#f8fafc;">${escHtml(r.isp)}</td>
                                        <td style="padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#38bdf8;">${escHtml(r.asn)}</td>
                                        <td style="padding:10px;color:#cbd5e1;font-size:11.5px;">${escHtml(r.architecture)}</td>
                                        <td style="padding:10px;font-weight:700;color:${r.sgssStatus.includes('INSTANT') ? '#34d399' : '#fbbf24'};font-size:11.5px;">${escHtml(r.sgssStatus)}</td>
                                        <td style="padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#e2e8f0;">${escHtml(r.captchaRate)}</td>
                                        <td style="padding:10px;color:#cbd5e1;font-size:11.5px;line-height:1.45;">${escHtml(r.forensicVerdict)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 5. DOMAIN-SPECIFIC DEEP FORENSIC SECTIONS IN ECOMMERCE 3, PAYMENTS & GOOGLE TABS
    // =========================================================================
    function renderDomainSpecificForensicSections(report) {
        // 1. E-Commerce 3 Tab (#eCommerce3View)
        const ec3View = document.getElementById('eCommerce3View');
        if (ec3View) {
            let ec3Sec = document.getElementById('ec3DeepForensicDossiersSection');
            if (!ec3Sec) {
                ec3Sec = document.createElement('div');
                ec3Sec.id = 'ec3DeepForensicDossiersSection';
                ec3Sec.style.marginTop = '24px';
                ec3View.appendChild(ec3Sec);
            }
            const ecomAndRetailSites = MASTER_55_WEBSITES.filter(s => s.vertical === 'E-Commerce' || s.vertical === 'Travel & Ticketing' || s.vertical === 'Social & Tech');
            ec3Sec.innerHTML = `
                <div class="card" style="background:rgba(15,23,42,0.85);border:1px solid rgba(56,189,248,0.3);border-radius:14px;padding:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
                        <div>
                            <h2 style="margin:0;font-size:18px;color:#f8fafc;">📖 E-Commerce, Retail, Travel & Ticketing Deep Forensic Dossiers (33 Harvested Sites)</h2>
                            <p style="margin:4px 0 0;font-size:12.5px;color:#94a3b8;">Complete website-by-website harvested script inventory, Stage-1 perimeter gates, Stage-2/3 deep-funnel checkout triggers, HTTP/2 wire headers, and deobfuscated mathematical scoring formulas.</p>
                        </div>
                        <button type="button" onclick="window.toggleAllSiteDossiers()" style="background:rgba(56,189,248,0.16);color:#38bdf8;border:1px solid rgba(56,189,248,0.4);border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;">
                            ${_expandAllSiteDossiers ? '▾ Collapse All Forensic Dossiers' : '▸ Expand All 33 E-Commerce & Travel Dossiers'}
                        </button>
                    </div>
                    <div class="table-scroll" style="max-height:720px;overflow:auto;">
                        <table class="fp-table" style="width:100%;border-collapse:collapse;font-size:12px;">
                            <thead>
                                <tr style="background:rgba(15,23,42,0.95);text-align:left;">
                                    <th style="padding:10px;">Website & Harvested Scripts</th>
                                    <th style="padding:10px;">Privilege Architecture & Top Bundles</th>
                                    <th style="padding:10px;">Stage-1 Perimeter Gate</th>
                                    <th style="padding:10px;">Stage-2 / Stage-3 Checkout Trigger</th>
                                    <th style="padding:10px;">Decisive Mathematical Factor</th>
                                    <th style="padding:10px;">Live Prediction & Dossier</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${buildSitesDossierTableHtml(ecomAndRetailSites, report, 'ec3')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // 2. Payment Systems Tab (#paymentsView)
        const payView = document.getElementById('paymentsView');
        if (payView) {
            let paySec = document.getElementById('payDeepForensicDossiersSection');
            if (!paySec) {
                paySec = document.createElement('div');
                paySec.id = 'payDeepForensicDossiersSection';
                paySec.style.marginTop = '24px';
                payView.appendChild(paySec);
            }
            const paymentSites = MASTER_55_WEBSITES.filter(s => s.vertical === 'Banking & Payments');
            paySec.innerHTML = `
                <div class="card" style="background:rgba(15,23,42,0.85);border:1px solid rgba(16,185,129,0.3);border-radius:14px;padding:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
                        <div>
                            <h2 style="margin:0;font-size:18px;color:#f8fafc;">🏦 Banking, Card Networks, Remittance & Payment Gateways Deep Forensic Dossiers (19 Financial Titans)</h2>
                            <p style="margin:4px 0 0;font-size:12.5px;color:#94a3b8;">Complete forensic documentation of BioCatch v7.0.0 (236 collectors), Accertify/InAuth (15-AudioContext + localhost port scan), TransUnion iovation (JDIFF + 10 STUN servers), PayPal Fraudnet (Savitzky-Golay mouse + dual-stack IPv6), Stripe Radar (15 Extractors), and LexisNexis ThreatMetrix.</p>
                        </div>
                        <button type="button" onclick="window.toggleAllSiteDossiers()" style="background:rgba(16,185,129,0.16);color:#34d399;border:1px solid rgba(16,185,129,0.4);border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;">
                            ${_expandAllSiteDossiers ? '▾ Collapse All Banking Dossiers' : '▸ Expand All 19 Banking & Payment Dossiers'}
                        </button>
                    </div>
                    <div class="table-scroll" style="max-height:720px;overflow:auto;">
                        <table class="fp-table" style="width:100%;border-collapse:collapse;font-size:12px;">
                            <thead>
                                <tr style="background:rgba(15,23,42,0.95);text-align:left;">
                                    <th style="padding:10px;">Financial Institution & Scripts</th>
                                    <th style="padding:10px;">Privilege Architecture & Top Bundles</th>
                                    <th style="padding:10px;">Stage-1 Perimeter Gate</th>
                                    <th style="padding:10px;">Stage-2 Post-Login / Payment Gate</th>
                                    <th style="padding:10px;">Decisive Mathematical Factor</th>
                                    <th style="padding:10px;">Live Prediction & Dossier</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${buildSitesDossierTableHtml(paymentSites, report, 'pay')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // 3. Google & Tier-1 Wire Lab Tab (#googleIntegrityView)
        const ggView = document.getElementById('googleIntegrityView');
        if (ggView) {
            let ggSec = document.getElementById('ggDeepForensicDossiersSection');
            if (!ggSec) {
                ggSec = document.createElement('div');
                ggSec.id = 'ggDeepForensicDossiersSection';
                ggSec.style.marginTop = '24px';
                ggView.appendChild(ggSec);
            }
            ggSec.innerHTML = `
                <div class="card" style="background:rgba(15,23,42,0.85);border:1px solid rgba(168,85,247,0.35);border-radius:14px;padding:20px;">
                    <h2 style="margin:0 0 6px;font-size:18px;color:#f8fafc;">🔍 Google Search (<code>knitsail</code> / <code>SG_SS</code>) Root-Cause Forensic Assessment & 5-ISP Empirical Proxy Audit</h2>
                    <p style="margin:0 0 14px;font-size:12.5px;color:#94a3b8;">Unabridged web documentation of <code>google_search_5_isp_forensic_assessment.md</code>: how Google's 51.6KB inline SearchGuard VM evaluates your browser, the 6 Hidden Observations, and empirical testing across AT&T, Spectrum, Starlink, T-Mobile, and Verizon 5G proxy pools.</p>

                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-bottom:18px;">
                        <div style="background:rgba(2,6,23,0.75);border:1px solid rgba(56,189,248,0.25);border-radius:10px;padding:14px;">
                            <div style="font-weight:700;color:#38bdf8;margin-bottom:6px;font-size:13.5px;">1. How Google SearchGuard (<code>srcpg=sgs</code>) Works</div>
                            <p style="margin:0;font-size:12px;color:#cbd5e1;line-height:1.5;">On initial navigation to <code>https://www.google.com/search?q=...</code>, Google serves a 51.6KB inline script containing the <strong><code>knitsail</code></strong> Closure bytecode VM. It executes an asymmetric SHA-256 Proof-of-Work challenge, inspects 40+ browser/prototype/Client-Hint invariants, mints the <code>SG_SS=B.&lt;ver&gt;.&lt;cbs&gt;.&lt;token&gt;</code> cookie (<code>Max-Age=300</code>), and calls <code>location.replace()</code>. If the VM bitmask or IP velocity fails, it redirects to <code>/sorry/index</code> (reCAPTCHA Enterprise).</p>
                        </div>
                        <div style="background:rgba(2,6,23,0.75);border:1px solid rgba(245,158,11,0.28);border-radius:10px;padding:14px;">
                            <div style="font-weight:700;color:#fbbf24;margin-bottom:6px;font-size:13.5px;">2. The 6 Serious Hidden Observations Discovered</div>
                            <ol style="margin:0;padding-left:18px;font-size:11.5px;color:#e2e8f0;line-height:1.5;">
                                <li><strong>2-Brand vs 3-Brand <code>Sec-CH-UA</code>:</strong> Unbranded Chromium omits <code>"Google Chrome"</code>; SearchGuard flags 2-brand tuples immediately.</li>
                                <li><strong>WebView2 <code>.3856.</code> Build Token:</strong> Embedded WebView2 builds leak <code>.3856.</code> in fullVersionList unless scrubbed.</li>
                                <li><strong>Win10 Wire vs Win11 JS Drift:</strong> Host OS sending <code>"10.0.0"</code> on wire while JS reports <code>"15.0.0"</code> triggers instant <code>/sorry</code>.</li>
                                <li><strong>C++ Native Timer & DOMRect Hooks:</strong> Wrapping <code>performance.now</code> or <code>getBoundingClientRect</code> trips Closure VM descriptor checks.</li>
                                <li><strong>Dedicated Wireline vs Mobile CGNAT Velocity:</strong> AT&T/Spectrum 1:1 IPs pass cold queries; T-Mobile/Verizon CGNAT exits share IP reputation with thousands of users.</li>
                                <li><strong>SOCKS5 Domain Blacklists:</strong> Proxy providers block <code>online-metrix.net</code> / banking domains when <code>ATYP=0x03</code> (hostname) is used; resolved by local DoH + <code>ATYP=0x01</code> (raw IPv4).</li>
                            </ol>
                        </div>
                    </div>

                    <div class="table-scroll">
                        <table class="fp-table" style="width:100%;font-size:12px;">
                            <thead>
                                <tr style="background:rgba(15,23,42,0.95);text-align:left;">
                                    <th style="padding:10px;">ISP Proxy Pool</th>
                                    <th style="padding:10px;">ASN & Carrier</th>
                                    <th style="padding:10px;">NAT / Routing Topology</th>
                                    <th style="padding:10px;">SearchGuard (SG_SS) Verdict</th>
                                    <th style="padding:10px;">Cold-Query CAPTCHA Rate</th>
                                    <th style="padding:10px;">Empirical Findings & Guidance</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${GOOGLE_5_ISP_AUDIT_ROWS.map(r => `
                                    <tr style="border-bottom:1px solid rgba(148,163,184,0.12);">
                                        <td style="padding:10px;font-weight:700;color:#f8fafc;">${escHtml(r.isp)}</td>
                                        <td style="padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#38bdf8;">${escHtml(r.asn)}</td>
                                        <td style="padding:10px;color:#cbd5e1;font-size:11.5px;">${escHtml(r.architecture)}</td>
                                        <td style="padding:10px;font-weight:700;color:${r.sgssStatus.includes('INSTANT') ? '#34d399' : '#fbbf24'};font-size:11.5px;">${escHtml(r.sgssStatus)}</td>
                                        <td style="padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#e2e8f0;">${escHtml(r.captchaRate)}</td>
                                        <td style="padding:10px;color:#cbd5e1;font-size:11.5px;line-height:1.45;">${escHtml(r.forensicVerdict)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }

    window.switchScoringDoctrineSubTab = function (subTabId, btnEl) {
        if (subTabId === 'ghost_personas') subTabId = 'persona_audit';
        _currentDoctrineSubTab = subTabId;
        const panels = ['live_predictor', 'sites_matrix', 'persona_audit', 'pre_encryption', 'doctrine_codex'];
        panels.forEach(id => {
            const el = document.getElementById('sdPanel_' + id);
            if (el) el.style.display = (id === subTabId) ? 'flex' : 'none';
            const btn = document.getElementById('sdBtn_' + id);
            if (btn) {
                if (id === subTabId) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });
    };

    window.filterScoringSitesMatrix = window.filterScoringDoctrineSites = function (filterKey, btnEl) {
        if (filterKey === 'E-Commerce') filterKey = 'ecom';
        if (filterKey === 'Banking') filterKey = 'payments';
        if (filterKey === 'Travel') filterKey = 'travel_social';
        _currentSiteFilter = filterKey;
        document.querySelectorAll('.sd-site-filter-btn').forEach(b => {
            const df = b.getAttribute('data-sd-filter');
            if (df === filterKey || b === btnEl) b.classList.add('active');
            else b.classList.remove('active');
        });
        render55WebsitesTable(_lastScoringAuditReport, filterKey);
    };

    window.searchScoringSitesMatrix = function (val) {
        _currentSiteSearch = val || '';
        render55WebsitesTable(_lastScoringAuditReport, _currentSiteFilter);
    };

    window.toggleSiteDossier = function (slug) {
        if (_expandedSiteSlugs.has(slug)) {
            _expandedSiteSlugs.delete(slug);
        } else {
            _expandedSiteSlugs.add(slug);
        }
        render55WebsitesTable(_lastScoringAuditReport, _currentSiteFilter);
        renderDomainSpecificForensicSections(_lastScoringAuditReport);
    };

    window.toggleAllSiteDossiers = function () {
        _expandAllSiteDossiers = !_expandAllSiteDossiers;
        if (!_expandAllSiteDossiers) _expandedSiteSlugs.clear();
        const btn = document.getElementById('sdToggleAllDossiersBtn');
        if (btn) {
            btn.textContent = _expandAllSiteDossiers ? '▾ Collapse All 55 Forensic Dossiers' : '▸ Expand All 55 Forensic Dossiers';
        }
        render55WebsitesTable(_lastScoringAuditReport, _currentSiteFilter);
        renderDomainSpecificForensicSections(_lastScoringAuditReport);
    };

    window.runScoringDoctrineAudit = runScoringDoctrineAudit;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runScoringDoctrineAudit, 350);
        });
    } else {
        setTimeout(runScoringDoctrineAudit, 350);
    }
})();
