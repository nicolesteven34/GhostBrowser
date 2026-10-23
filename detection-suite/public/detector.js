/*!
 * BotLens detector
 * Client-side detection of browser automation, headless environments,
 * API tampering / spoofing and bot-like behaviour.
 * Targets desktop (Windows / macOS / Linux) and mobile (iOS / iPadOS / Android).
 */
(function (global) {
  'use strict';

  // ===========================================================================
  // Constants & utilities
  // ===========================================================================
  const CAT = {
    AUTO: 'Automation Frameworks',
    HEADLESS: 'Headless & Environment',
    TAMPER: 'Tampering & API Lies',
    CONSIST: 'Consistency Cross-checks',
    MOBILE: 'iOS & Mobile',
    NET: 'Network & Headers',
    RUNTIME: 'Runtime Monitor (live)',
    BEHAV: 'Behavior (live)',
  };
  const CAT_ORDER = [CAT.AUTO, CAT.HEADLESS, CAT.TAMPER, CAT.CONSIST, CAT.MOBILE, CAT.NET, CAT.RUNTIME, CAT.BEHAV];
  const CAT_DESC = {
    [CAT.AUTO]: 'Fingerprints left by Selenium, ChromeDriver, Puppeteer, Playwright, PhantomJS, Cypress, TestCafe, CDP clients and similar tools.',
    [CAT.HEADLESS]: 'Traits of headless browsers, virtual machines and server-side environments.',
    [CAT.TAMPER]: 'Native APIs that were overridden, proxied or noised: stealth plugins, antidetect browsers, spoofing extensions.',
    [CAT.CONSIST]: 'Claimed identity (User-Agent) vs. what the JS engine, GPU, screen and client hints actually reveal.',
    [CAT.MOBILE]: 'iOS / iPadOS / Android specific realism checks (WebKit-only APIs, touch, screen geometry, GPU).',
    [CAT.NET]: 'Server-side analysis of the HTTP request headers. JavaScript cannot see or spoof these.',
    [CAT.RUNTIME]: 'Continuous monitoring: DOM API calls from injected/evaluated code, late-appearing driver globals and attributes.',
    [CAT.BEHAV]: 'Live analysis of your mouse, touch and keyboard input. Interact with the Behavior Lab to feed it.',
  };
  const DEFAULT_WEIGHT = { fail: 30, warn: 10, pass: 0, info: 0 };

  const ORIGIN = location.origin;
  const _fnToString = Function.prototype.toString;
  const _getOwnDesc = Object.getOwnPropertyDescriptor;
  const _getOwnNames = Object.getOwnPropertyNames;
  const NATIVE_RE = /^function\s*(?:get\s+|set\s+)?[^(]*\(\s*\)\s*\{\s*\[native code\]\s*\}$/;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function withTimeout(p, ms, fallback) {
    return Promise.race([Promise.resolve(p).catch(() => fallback), sleep(ms).then(() => fallback)]);
  }
  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }
  function fnStr(fn, toStr) {
    try { return Reflect.apply(toStr || _fnToString, fn, []); } catch (e) { return null; }
  }
  function isNativeStr(s) {
    return typeof s === 'string' && NATIVE_RE.test(s.replace(/\s+/g, ' ').trim());
  }
  function fmt(v) {
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return '"' + v + '"';
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function mean(a) { return a.reduce((s, x) => s + x, 0) / (a.length || 1); }
  function cv(a) {
    if (a.length < 2) return null;
    const m = mean(a);
    if (!m) return 0;
    const sd = Math.sqrt(mean(a.map((x) => (x - m) * (x - m))));
    return sd / m;
  }

  // ===========================================================================
  // Result collection & scoring
  // ===========================================================================
  function createCollector() {
    const list = [];
    function add(category, id, name, status, detail, opts) {
      opts = opts || {};
      const scored = status === 'fail' || status === 'warn';
      const r = {
        category, id, name, status,
        detail: detail || '',
        weight: scored ? (opts.weight != null ? opts.weight : DEFAULT_WEIGHT[status]) : 0,
      };
      if (opts.evidence !== undefined) r.evidence = opts.evidence;
      const i = list.findIndex((x) => x.id === id);
      if (i >= 0) list[i] = r; else list.push(r);
      return r;
    }
    return { list, add };
  }

  function score(list) {
    let s = 0, fails = 0, warns = 0, passes = 0, infos = 0;
    for (const r of list) {
      if (r.status === 'fail') { fails++; s += r.weight; }
      else if (r.status === 'warn') { warns++; s += r.weight; }
      else if (r.status === 'pass') passes++;
      else infos++;
    }
    s = Math.min(100, Math.round(s));
    const verdict = s >= 50 ? 'bot' : s >= 20 ? 'suspicious' : 'human';
    return { score: s, verdict, fails, warns, passes, infos };
  }

  // ===========================================================================
  // Identity: what the UA claims vs. what the engine is
  // ===========================================================================
  function parseUA(ua) {
    const r = { os: 'Unknown', osVersion: '', browser: 'Unknown', version: '', mobile: false, iosDevice: null, expectedEngine: 'unknown', inApp: null, chromeMajor: null };
    let m;
    if (/iPhone|iPod/.test(ua)) { r.os = 'iOS'; r.iosDevice = /iPod/.test(ua) ? 'iPod' : 'iPhone'; r.mobile = true; }
    else if (/iPad/.test(ua)) { r.os = 'iPadOS'; r.iosDevice = 'iPad'; r.mobile = true; }
    else if (/Android/.test(ua)) { r.os = 'Android'; r.mobile = true; }
    else if (/CrOS/.test(ua)) r.os = 'ChromeOS';
    else if (/Windows/.test(ua)) r.os = 'Windows';
    else if (/Macintosh|Mac OS X/.test(ua)) r.os = 'macOS';
    else if (/Linux|X11|FreeBSD|OpenBSD/.test(ua)) r.os = 'Linux';

    if (r.iosDevice && (m = ua.match(/OS (\d+(?:_\d+)*)/))) r.osVersion = m[1].replace(/_/g, '.');
    else if ((m = ua.match(/Android (\d+(?:\.\d+)*)/))) r.osVersion = m[1];
    else if ((m = ua.match(/Windows NT (\d+\.\d+)/))) r.osVersion = m[1];
    else if ((m = ua.match(/Mac OS X (\d+(?:[_.]\d+)*)/))) r.osVersion = m[1].replace(/_/g, '.');

    const BROWSERS = [
      ['Edge (iOS)', /EdgiOS\/([\d.]+)/], ['Chrome (iOS)', /CriOS\/([\d.]+)/], ['Firefox (iOS)', /FxiOS\/([\d.]+)/], ['Opera (iOS)', /OPT\/([\d.]+)/],
      ['Headless Chrome', /HeadlessChrome\/([\d.]+)/], ['Electron', /Electron\/([\d.]+)/],
      ['Edge', /Edg(?:e|A)?\/([\d.]+)/], ['Opera', /OPR\/([\d.]+)/], ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
      ['Yandex', /YaBrowser\/([\d.]+)/], ['Vivaldi', /Vivaldi\/([\d.]+)/],
      ['Firefox', /Firefox\/([\d.]+)/], ['Chrome', /Chrome\/([\d.]+)/], ['Chromium', /Chromium\/([\d.]+)/],
      ['Safari', /Version\/([\d.]+).*Safari/],
    ];
    for (const [name, re] of BROWSERS) {
      if ((m = ua.match(re))) { r.browser = name; r.version = m[1]; break; }
    }
    if (r.iosDevice && r.browser === 'Unknown') r.browser = 'iOS WebView';

    const INAPP = [[/FBAN|FBAV|FB_IAB/, 'Facebook'], [/Instagram/, 'Instagram'], [/\bLine\//, 'LINE'], [/Twitter/i, 'X / Twitter'],
      [/GSA\//, 'Google App'], [/musical_ly|BytedanceWebview|TikTok/i, 'TikTok'], [/Snapchat/, 'Snapchat'], [/LinkedInApp/, 'LinkedIn'],
      [/MicroMessenger/, 'WeChat'], [/Pinterest/, 'Pinterest']];
    for (const [re, n] of INAPP) if (re.test(ua)) { r.inApp = n; break; }

    if (r.iosDevice) r.expectedEngine = 'JavaScriptCore';
    else if (/Firefox/.test(r.browser)) r.expectedEngine = 'SpiderMonkey';
    else if (r.browser === 'Safari') r.expectedEngine = 'JavaScriptCore';
    else if (/Chrome|Edge|Opera|Samsung|Yandex|Vivaldi|Electron|Chromium/.test(r.browser)) r.expectedEngine = 'V8';
    const cm = ua.match(/Chrome\/(\d+)/);
    r.chromeMajor = cm ? +cm[1] : null;
    return r;
  }

  /** Identify the real JS engine from behaviour that UA spoofing can't change. */
  function detectEngine() {
    let msg = '';
    try { null[0]; } catch (e) { msg = String(e && e.message); }
    let engine = 'unknown';
    if (/Cannot read propert/i.test(msg)) engine = 'V8';
    else if (/is not an object/i.test(msg)) engine = 'JavaScriptCore';
    else if (/has no properties|is null/i.test(msg)) engine = 'SpiderMonkey';
    const evalLen = safe(() => global.eval.toString().length, 0);
    if (engine === 'unknown') {
      if (evalLen === 37) engine = 'SpiderMonkey';
      else if ('chrome' in global) engine = 'V8';
    }
    return { engine, errorMessage: msg, evalLength: evalLen };
  }

  function claimedEngineVersion(c, ua) {
    let m;
    if (c.expectedEngine === 'V8') return c.chromeMajor ? { family: 'chrome', v: c.chromeMajor } : null;
    if (c.expectedEngine === 'SpiderMonkey') return (m = ua.match(/Firefox\/(\d+(?:\.\d+)?)/)) ? { family: 'firefox', v: parseFloat(m[1]) } : null;
    if (c.expectedEngine === 'JavaScriptCore') {
      if ((m = ua.match(/Version\/(\d+(?:\.\d+)?)/))) return { family: 'safari', v: parseFloat(m[1]) };
      if (c.iosDevice && c.osVersion) return { family: 'safari', v: parseFloat(c.osVersion.split('.').slice(0, 2).join('.')) };
    }
    return null;
  }

  // JS features with the browser version that introduced them. Used to verify the claimed version.
  const FEATURES = [
    { name: 'Array.prototype.at', test: () => typeof [].at === 'function', chrome: 92, firefox: 90, safari: 15.4 },
    { name: 'structuredClone', test: () => typeof global.structuredClone === 'function', chrome: 98, firefox: 94, safari: 15.4 },
    { name: 'Array.prototype.findLast', test: () => typeof [].findLast === 'function', chrome: 97, firefox: 104, safari: 15.4 },
    { name: 'Array.prototype.toSorted', test: () => typeof [].toSorted === 'function', chrome: 110, firefox: 115, safari: 16 },
    { name: 'String.prototype.isWellFormed', test: () => typeof ''.isWellFormed === 'function', chrome: 111, firefox: 119, safari: 16.4 },
    { name: 'Array.fromAsync', test: () => typeof Array.fromAsync === 'function', chrome: 121, firefox: 115, safari: 16.4 },
    { name: 'Object.groupBy', test: () => typeof Object.groupBy === 'function', chrome: 117, firefox: 119, safari: null },
    { name: 'Promise.withResolvers', test: () => typeof Promise.withResolvers === 'function', chrome: 119, firefox: 121, safari: null },
    { name: 'Set.prototype.union', test: () => typeof new Set().union === 'function', chrome: 122, firefox: 127, safari: null },
    { name: 'URL.parse', test: () => typeof URL.parse === 'function', chrome: 126, firefox: 126, safari: null },
    { name: 'Promise.try', test: () => typeof Promise.try === 'function', chrome: 128, firefox: 134, safari: null },
    { name: 'Iterator helpers', test: () => typeof global.Iterator === 'function' && typeof global.Iterator.prototype.map === 'function', chrome: 122, firefox: 131, safari: null },
    { name: 'Float16Array', test: () => typeof global.Float16Array === 'function', chrome: 135, firefox: 129, safari: null },
    { name: 'RegExp.escape', test: () => typeof RegExp.escape === 'function', chrome: 136, firefox: 134, safari: null },
    { name: 'Object.hasOwn', test: () => typeof Object.hasOwn === 'function', chrome: 93, firefox: 92, safari: 15.4 },
    { name: 'Array.prototype.with', test: () => typeof [].with === 'function', chrome: 110, firefox: 115, safari: 16 },
    { name: 'CSS :has()', test: () => CSS.supports('selector(:has(a))'), chrome: 105, firefox: 121, safari: 15.4 },
    { name: 'CSS container queries', test: () => CSS.supports('container-type: inline-size'), chrome: 105, firefox: 110, safari: 16 },
    { name: 'Popover API', test: () => typeof HTMLElement.prototype.showPopover === 'function', chrome: 114, firefox: 125, safari: null },
    { name: 'Intl.Segmenter', test: () => typeof Intl.Segmenter === 'function', chrome: 87, firefox: 125, safari: 14.1 },
    { name: 'navigator.userActivation', test: () => !!navigator.userActivation, chrome: 72, firefox: 120, safari: 16.4 },
    { name: 'Intl.DurationFormat', test: () => typeof Intl.DurationFormat === 'function', chrome: 129, firefox: 136, safari: 16.4 },
    { name: 'CSS anchor positioning', test: () => CSS.supports('anchor-name: --a'), chrome: 125, firefox: null, safari: null },
    { name: 'View Transitions', test: () => typeof document.startViewTransition === 'function', chrome: 111, firefox: null, safari: null },
  ];

  // ===========================================================================
  // Native-function integrity ("lie detection")
  // ===========================================================================
  /** Returns true when the function is a Proxy (Proxies skip the prototype-cycle check). */
  function isProxied(fn) {
    try {
      const s = fnStr(fn);
      if (s && isNativeStr(s)) return false;
    } catch (e) { /* ignore */ }
    let proto;
    try { proto = Object.getPrototypeOf(fn); } catch (e) { return false; }
    let proxied = false;
    try {
      Object.setPrototypeOf(fn, Object.create(fn));
      proxied = true; // a plain function would have thrown "Cyclic __proto__ value"
    } catch (e) {
      proxied = false;
    } finally {
      try { Object.setPrototypeOf(fn, proto); } catch (e) { /* ignore */ }
    }
    return proxied;
  }

  function inspectFn(fn, expectName, iframeWin, lenient) {
    const lies = [];
    if (typeof fn !== 'function') return { lies, missing: true };
    const s = fnStr(fn);
    if (s == null) lies.push('toString() throws');
    else if (!isNativeStr(s)) lies.push('toString() is not "[native code]"');
    else if (expectName && !lenient && s.indexOf(expectName) === -1) lies.push('toString() lost the function name (Proxy/bind wrapper)');
    if (iframeWin && iframeWin.Function) {
      const s2 = fnStr(fn, iframeWin.Function.prototype.toString);
      if (s2 != null && !isNativeStr(s2)) lies.push('clean-realm toString() reveals JS source');
    }
    if (!lenient) {
      if (Object.prototype.hasOwnProperty.call(fn, 'prototype')) lies.push('has a .prototype (natives don\'t)');
      const own = safe(() => _getOwnNames(fn), []).filter((k) => k !== 'length' && k !== 'name');
      if (own.length) lies.push('unexpected own properties: ' + own.join(', '));
      try {
        // eslint-disable-next-line no-new
        new fn();
        lies.push('is constructible (natives aren\'t)');
      } catch (e) { /* expected TypeError */ }
    }
    if (isProxied(fn)) lies.push('wrapped in a Proxy');
    return { lies, str: s };
  }

  function resolveTarget(path, kind) {
    const parts = path.split('.');
    const last = parts.pop();
    let obj = global;
    for (const p of parts) {
      if (p === 'window') continue;
      obj = obj == null ? undefined : safe(() => obj[p]);
    }
    if (obj == null) return null;
    let d = _getOwnDesc(obj, last);
    if (!d && obj === global && global.Window) d = _getOwnDesc(global.Window.prototype, last);
    if (!d) return null;
    return kind === 'get' ? d.get || null : typeof d.value === 'function' ? d.value : null;
  }

  const NAV_PROPS = ['userAgent', 'appVersion', 'platform', 'vendor', 'language', 'languages', 'hardwareConcurrency', 'deviceMemory',
    'maxTouchPoints', 'webdriver', 'plugins', 'mimeTypes', 'userAgentData', 'connection', 'cookieEnabled', 'doNotTrack', 'pdfViewerEnabled'];

  const FN_TARGETS = [
    ['Function.prototype.toString', 'fn'],
    ['Object.getOwnPropertyDescriptor', 'fn'], ['Object.getOwnPropertyNames', 'fn'], ['Object.defineProperty', 'fn'],
    ['Reflect.ownKeys', 'fn'], ['JSON.stringify', 'fn'], ['Math.random', 'fn'],
    ['HTMLCanvasElement.prototype.toDataURL', 'fn'], ['HTMLCanvasElement.prototype.toBlob', 'fn'], ['HTMLCanvasElement.prototype.getContext', 'fn'],
    ['CanvasRenderingContext2D.prototype.getImageData', 'fn'], ['CanvasRenderingContext2D.prototype.measureText', 'fn'],
    ['CanvasRenderingContext2D.prototype.fillText', 'fn'],
    ['WebGLRenderingContext.prototype.getParameter', 'fn'], ['WebGLRenderingContext.prototype.getExtension', 'fn'],
    ['WebGLRenderingContext.prototype.getSupportedExtensions', 'fn'], ['WebGLRenderingContext.prototype.readPixels', 'fn'],
    ['WebGL2RenderingContext.prototype.getParameter', 'fn'],
    ['AudioBuffer.prototype.getChannelData', 'fn'], ['AnalyserNode.prototype.getFloatFrequencyData', 'fn'],
    ['OfflineAudioContext.prototype.startRendering', 'fn'],
    ['Permissions.prototype.query', 'fn'], ['MediaDevices.prototype.enumerateDevices', 'fn'],
    ['Navigator.prototype.getBattery', 'fn'], ['Navigator.prototype.javaEnabled', 'fn'], ['Navigator.prototype.sendBeacon', 'fn'],
    ['HTMLMediaElement.prototype.canPlayType', 'fn'], ['SpeechSynthesis.prototype.getVoices', 'fn'],
    ['Date.prototype.getTimezoneOffset', 'fn'], ['Intl.DateTimeFormat.prototype.resolvedOptions', 'fn'],
    ['Element.prototype.getBoundingClientRect', 'fn'], ['Element.prototype.getClientRects', 'fn'], ['Element.prototype.attachShadow', 'fn'],
    ['Document.prototype.hasFocus', 'fn'], ['Document.prototype.createElement', 'fn'],
    ['Performance.prototype.now', 'fn'], ['window.matchMedia', 'fn'], ['window.setTimeout', 'fn'],
    ['HTMLIFrameElement.prototype.contentWindow', 'get'], ['HTMLElement.prototype.offsetWidth', 'get'], ['HTMLElement.prototype.offsetHeight', 'get'],
    ['Document.prototype.hidden', 'get'], ['Document.prototype.visibilityState', 'get'],
    ['Screen.prototype.width', 'get'], ['Screen.prototype.height', 'get'], ['Screen.prototype.availWidth', 'get'],
    ['Screen.prototype.availHeight', 'get'], ['Screen.prototype.colorDepth', 'get'], ['Screen.prototype.pixelDepth', 'get'],
    ['Notification.permission', 'get'],
    ['window.devicePixelRatio', 'get'], ['window.outerWidth', 'get'], ['window.outerHeight', 'get'],
    ['window.innerWidth', 'get'], ['window.innerHeight', 'get'], ['window.screenX', 'get'], ['window.screenY', 'get'],
    ['window.navigator', 'get'], ['window.screen', 'get'],
    ['chrome.loadTimes', 'fn'], ['chrome.csi', 'fn'], ['chrome.app.getDetails', 'fn'], ['chrome.app.getIsInstalled', 'fn'],
    ['chrome.app.runningState', 'fn'], ['chrome.runtime.connect', 'fn'], ['chrome.runtime.sendMessage', 'fn'],
    ['WebGL2RenderingContext.prototype.getExtension', 'fn'], ['WebGL2RenderingContext.prototype.getSupportedExtensions', 'fn'],
    ['WebGLRenderingContext.prototype.getShaderPrecisionFormat', 'fn'],
    ['Date.prototype.toString', 'fn'], ['Intl.DateTimeFormat.prototype.formatToParts', 'fn'],
    ['Crypto.prototype.getRandomValues', 'fn'], ['SubtleCrypto.prototype.digest', 'fn'],
    ['FontFaceSet.prototype.check', 'fn'], ['Element.prototype.getAttribute', 'fn'],
    ['HTMLCanvasElement.prototype.captureStream', 'fn'], ['OffscreenCanvas.prototype.convertToBlob', 'fn'],
    ['RTCPeerConnection.prototype.createDataChannel', 'fn'], ['RTCPeerConnection.prototype.setLocalDescription', 'fn'],
    ['Navigator.prototype.requestMediaKeySystemAccess', 'fn'], ['MediaCapabilities.prototype.decodingInfo', 'fn'],
    ['StorageManager.prototype.estimate', 'fn'], ['Geolocation.prototype.getCurrentPosition', 'fn'],
    ['Intl.Collator.prototype.resolvedOptions', 'fn'], ['Intl.NumberFormat.prototype.resolvedOptions', 'fn'],
    ['History.prototype.length', 'get'], ['Document.prototype.referrer', 'get'], ['Document.prototype.cookie', 'get'],
    ['Navigator.prototype.permissions', 'get'], ['Navigator.prototype.mediaDevices', 'get'], ['Navigator.prototype.gpu', 'get'],
  ];

  // ===========================================================================
  // Automation markers
  // ===========================================================================
  const MARKERS = [
    ['_selenium', 'Selenium'], ['callSelenium', 'Selenium'], ['_Selenium_IDE_Recorder', 'Selenium IDE'], ['calledSelenium', 'Selenium'],
    ['__webdriverFunc', 'WebDriver'], ['__webdriver_script_fn', 'WebDriver'], ['__webdriver_script_func', 'WebDriver'],
    ['__webdriver_evaluate', 'WebDriver'], ['__webdriver_unwrapped', 'WebDriver'], ['__selenium_evaluate', 'Selenium'],
    ['__selenium_unwrapped', 'Selenium'], ['__fxdriver_evaluate', 'FirefoxDriver'], ['__fxdriver_unwrapped', 'FirefoxDriver'],
    ['__driver_evaluate', 'WebDriver'], ['__driver_unwrapped', 'WebDriver'], ['_WEBDRIVER_ELEM_CACHE', 'WebDriver'],
    ['__$webdriverAsyncExecutor', 'WebDriver'], ['__webdriverajax', 'WebDriver'], ['webdriver', 'WebDriver'],
    ['__lastWatirAlert', 'Watir'], ['__lastWatirConfirm', 'Watir'], ['__lastWatirPrompt', 'Watir'],
    ['$chrome_asyncScriptInfo', 'ChromeDriver'],
    ['domAutomation', 'Chrome automation'], ['domAutomationController', 'Chrome automation'],
    ['callPhantom', 'PhantomJS'], ['_phantom', 'PhantomJS'], ['phantom', 'PhantomJS'],
    ['__nightmare', 'Nightmare.js'],
    ['__playwright__binding__', 'Playwright'], ['__pwInitScripts', 'Playwright'], ['__playwright_evaluation_script__', 'Playwright'], ['playwright', 'Playwright'],
    ['__puppeteer_evaluation_script__', 'Puppeteer'], ['puppeteer', 'Puppeteer'],
    ['Cypress', 'Cypress'], ['__cypress', 'Cypress'],
    ['%hammerhead%', 'TestCafe'], ['%testCafeDriver%', 'TestCafe'], ['%testCafeCore%', 'TestCafe'],
    ['awesomium', 'Awesomium'], ['geb', 'Geb'], ['wdioElectron', 'WebdriverIO'], ['__zombie', 'Zombie.js'],
    ['fmget_targets', 'Headless crawler'], ['spawn', 'Node / CouchJS runtime'], ['emit', 'Node / CouchJS runtime'],
    ['Buffer', 'Node.js runtime'], ['process', 'Node.js runtime'], ['require', 'Node.js runtime'], ['nw', 'NW.js'],
    ['__webdriver_script_function', 'WebDriver'], ['__testim', 'Testim'], ['__mabl', 'mabl'], ['__nightwatch', 'Nightwatch'],
    ['__karma__', 'Karma test runner'], ['__coverage__', 'Istanbul test coverage'], ['__wdio', 'WebdriverIO'],
    ['__selenium_ide', 'Selenium IDE'], ['__katalon', 'Katalon'], ['_Recorder', 'Selenium recorder'],
  ];
  const MARKER_RES = [
    [/^\$?cdc_[a-z0-9]+_/i, 'ChromeDriver'], [/\$wdc_/i, 'WebDriver'], [/selenium/i, 'Selenium'], [/webdriver/i, 'WebDriver'],
    [/puppeteer|pptr/i, 'Puppeteer'], [/playwright|^__pw/i, 'Playwright'], [/nightmare/i, 'Nightmare.js'], [/phantom/i, 'PhantomJS'],
    [/cypress/i, 'Cypress'], [/hammerhead|testcafe/i, 'TestCafe'], [/__fxdriver|__driver_|watir/i, 'WebDriver'],
  ];
  const AUTOMATION_UA_RE = /HeadlessChrome|PhantomJS|Puppeteer|Playwright|Selenium|jsdom|HtmlUnit|SlimerJS|Zombie|Lighthouse|Chrome-Lighthouse|GTmetrix|PTST|python|curl|wget|scrapy|httpclient|[a-z]bot\b|\bbot\b|crawler|spider|slurp/i;

  function scanMarkers() {
    const hits = [];
    const seen = new Set();
    const push = (where, key, fw) => {
      const k = where + '.' + key;
      if (seen.has(k)) return;
      seen.add(k);
      hits.push({ where, key, framework: fw });
    };
    for (const [key, fw] of MARKERS) {
      if (safe(() => key in global, false)) push('window', key, fw);
      if (safe(() => key in document, false)) push('document', key, fw);
    }
    const scanNames = (obj, where) => {
      for (const n of safe(() => _getOwnNames(obj), [])) {
        const m = MARKER_RES.find(([re]) => re.test(n));
        if (m) push(where, n, m[1]);
      }
    };
    scanNames(global, 'window');
    scanNames(document, 'document');
    return hits;
  }

  /** CDP "Runtime.enable" leak: an attached inspector serialises console arguments. */
  function cdpProbe() {
    let hit = false;
    try {
      const e = new Error('botlens-cdp-probe');
      Object.defineProperty(e, 'stack', { configurable: false, enumerable: false, get() { hit = true; return ''; } });
      console.debug(e);
    } catch (x) { /* ignore */ }
    return hit;
  }

  // ===========================================================================
  // Probes (async data gathering)
  // ===========================================================================
  function makeIframe() {
    try {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      f.tabIndex = -1;
      f.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden;left:-9999px';
      document.body.appendChild(f);
      return { el: f, win: f.contentWindow };
    } catch (e) {
      return { el: null, win: null };
    }
  }

  function offscreen2dSign(OC) {
    try {
      if (typeof OC === 'undefined') return null;
      const c = new OC(120, 30);
      const x = c.getContext('2d');
      if (!x) return null;
      x.fillStyle = 'rgb(17,128,201)';
      x.fillRect(0, 0, 10, 10);
      const sd = x.getImageData(0, 0, 10, 10).data;
      let bad = 0;
      for (let i = 0; i < sd.length; i += 4) if (sd[i] !== 17 || sd[i + 1] !== 128 || sd[i + 2] !== 201 || sd[i + 3] !== 255) bad++;
      x.textBaseline = 'top'; x.font = '14px sans-serif';
      x.fillStyle = '#e53'; x.fillRect(40, 2, 50, 18);
      x.fillStyle = '#18a'; x.fillText('BL-W2D-9', 2, 6);
      const d = x.getImageData(0, 0, 120, 30).data;
      let s = '';
      for (let i = 0; i < d.length; i += 19) s += d[i].toString(36);
      return { hash: hash(s), solidMismatch: bad };
    } catch (e) { return null; }
  }

  /**
   * Call-stack recursion-depth side-channel probe:
   * At the exact RangeError boundary +2 frames, an untouched C++ native getter/method executes without
   * allocating nested JS call frames. A JS wrapper or Proxy apply/get trap must allocate extra JS frames
   * (for the handler + Reflect.apply / inner call) and either overflows earlier or leaks wrapper frames.
   */
  function recursionProbe() {
    const out = { wrapped: [] };
    try {
      const baseGet = (_getOwnDesc(global.Navigator.prototype, 'onLine') || {}).get;
      if (typeof baseGet !== 'function') return out;
      const targets = [];
      for (const p of ['userAgent', 'webdriver', 'plugins', 'languages', 'platform', 'hardwareConcurrency', 'vendor']) {
        const d = _getOwnDesc(global.Navigator.prototype, p);
        if (d && typeof d.get === 'function') targets.push({ name: 'navigator.' + p, fn: d.get, recv: navigator });
      }
      targets.push({ name: 'Function.prototype.toString', fn: Function.prototype.toString, recv: baseGet });
      const testAtBoundary = (fn, recv) => {
        let err = null;
        function dive(n) {
          try {
            return dive(n + 1);
          } catch (e) {
            if (n === 0) return;
            try {
              fn.call(recv);
            } catch (e2) {
              err = e2;
            }
            throw e;
          }
        }
        // Unwind 2 frames above RangeError (capped at 120 frames so JavaScriptCore ES6 Proper Tail Calls never infinite-loop!), then invoke fn.call(recv)
        let maxD = 0;
        function measure(d) {
          maxD = d;
          if (d >= 120) throw new RangeError('Maximum call stack size exceeded');
          return 1 + measure(d + 1);
        }
        try { measure(0); } catch (e) { /* maxD recorded */ }
        const limit = Math.max(10, Math.min(115, maxD - 3));
        function runTo(d) {
          if (d >= limit) {
            try { fn.call(recv); return { ok: true }; } catch (e2) { return { ok: false, stack: String((e2 && e2.stack) || '') }; }
          }
          const r = runTo(d + 1);
          return r;
        }
        return safe(() => runTo(0), { ok: true });
      };
      const baseRes = testAtBoundary(baseGet, navigator);
      if (baseRes && baseRes.ok) {
        for (const t of targets) {
          const r = testAtBoundary(t.fn, t.recv);
          if (r && !r.ok) {
            out.wrapped.push(`${t.name} overflowed early at stack boundary`);
          }
        }
      }
    } catch (e) { /* ignore */ }
    return out;
  }

  function workerProbe() {
    return new Promise((resolve) => {
      if (typeof Worker === 'undefined' || typeof Blob === 'undefined') return resolve(null);
      const src = 'self.onmessage=function(){var n=self.navigator||{};var r={};' +
        'try{r.userAgent=n.userAgent;r.platform=n.platform;r.hardwareConcurrency=n.hardwareConcurrency;r.deviceMemory=n.deviceMemory;' +
        'r.languages=n.languages?Array.prototype.slice.call(n.languages):null;r.language=n.language;r.webdriver=n.webdriver;' +
        'var ro=Intl.DateTimeFormat().resolvedOptions();r.timeZone=ro.timeZone;r.locale=ro.locale;r.tzOffset=new Date().getTimezoneOffset();' +
        'try{null[0]}catch(ek){r.errMsg=String(ek&&ek.message)}' +
        'if(n.userAgentData){r.uaPlatform=n.userAgentData.platform;r.uaMobile=n.userAgentData.mobile;' +
        'r.uaBrands=n.userAgentData.brands.map(function(b){return b.brand+" "+b.version}).join(", ")}}catch(e){r.error=String(e)}' +
        'try{if(typeof OffscreenCanvas!=="undefined"){var g=new OffscreenCanvas(1,1).getContext("webgl");if(g){' +
        'var x=g.getExtension("WEBGL_debug_renderer_info");r.glRenderer=g.getParameter(x?x.UNMASKED_RENDERER_WEBGL:g.RENDERER);' +
        'r.glVendor=g.getParameter(x?x.UNMASKED_VENDOR_WEBGL:g.VENDOR);r.glMaxTex=g.getParameter(g.MAX_TEXTURE_SIZE)}' +
        'var c2=new OffscreenCanvas(120,30),x2=c2.getContext("2d");if(x2){x2.fillStyle="rgb(17,128,201)";x2.fillRect(0,0,10,10);' +
        'var sd=x2.getImageData(0,0,10,10).data,bad=0;for(var j=0;j<sd.length;j+=4)if(sd[j]!==17||sd[j+1]!==128||sd[j+2]!==201||sd[j+3]!==255)bad++;' +
        'x2.textBaseline="top";x2.font="14px sans-serif";x2.fillStyle="#e53";x2.fillRect(40,2,50,18);x2.fillStyle="#18a";x2.fillText("BL-W2D-9",2,6);' +
        'var pd=x2.getImageData(0,0,120,30).data,s="";for(var i=0;i<pd.length;i+=19)s+=pd[i].toString(36);' +
        'var h=2166136261;for(var k=0;k<s.length;k++){h^=s.charCodeAt(k);h=Math.imul(h,16777619)>>>0}' +
        'r.canvas2dHash=("0000000"+h.toString(16)).slice(-8);r.solidMismatch=bad}}}catch(e){}self.postMessage(r)};';
      let url, w;
      try {
        url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
        w = new Worker(url);
      } catch (e) {
        return resolve({ error: 'Worker blocked: ' + e.message });
      }
      const t = setTimeout(() => { safe(() => w.terminate()); resolve({ error: 'timeout' }); }, 2500);
      w.onmessage = (e) => { clearTimeout(t); safe(() => { w.terminate(); URL.revokeObjectURL(url); }); resolve(e.data); };
      w.onerror = (e) => { clearTimeout(t); resolve({ error: 'worker error ' + (e.message || '') }); };
      w.postMessage(1);
    });
  }

  async function uaHighEntropy() {
    const d = navigator.userAgentData;
    if (!d) return null;
    const low = { brands: (d.brands || []).map((b) => ({ brand: b.brand, version: b.version })), mobile: d.mobile, platform: d.platform };
    let high = null;
    try { high = await d.getHighEntropyValues(['architecture', 'bitness', 'model', 'platformVersion', 'fullVersionList']); } catch (e) { /* */ }
    return { low, high };
  }

  async function notificationProbe() {
    if (!('Notification' in global) || !navigator.permissions) return null;
    const st = await navigator.permissions.query({ name: 'notifications' });
    return { permission: global.Notification.permission, state: st.state };
  }

  async function devicesProbe() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return null;
    const list = await navigator.mediaDevices.enumerateDevices();
    const kinds = {};
    const fakeLabels = [];
    for (const d of list) {
      kinds[d.kind] = (kinds[d.kind] || 0) + 1;
      if (/\bfake\b|fake_device|Fake Default|Fake Audio/i.test(d.label || '')) fakeLabels.push(d.label);
    }
    return { count: list.length, kinds, fakeLabels };
  }

  function voicesProbe() {
    return new Promise((res) => {
      const ss = global.speechSynthesis;
      if (!ss) return res(null);
      const v = safe(() => ss.getVoices(), []);
      if (v.length) return res(v.length);
      const done = () => res(safe(() => ss.getVoices().length, 0));
      if (ss.addEventListener) ss.addEventListener('voiceschanged', done, { once: true });
      setTimeout(done, 1200);
    });
  }

  async function braveProbe() {
    return !!(navigator.brave && typeof navigator.brave.isBrave === 'function' && (await navigator.brave.isBrave()));
  }

  /** navigator as seen from a ServiceWorker (separate global scope that stealth patches rarely reach). */
  async function serviceWorkerProbe() {
    if (!global.isSecureContext || !navigator.serviceWorker || typeof MessageChannel === 'undefined') return null;
    const reg = await navigator.serviceWorker.register('/bl-sw.js', { scope: '/bl-sw/' });
    const sw = reg.active || reg.waiting || reg.installing;
    if (!sw) return { error: 'no worker' };
    if (sw.state !== 'activated') {
      await new Promise((res) => {
        const t = setTimeout(res, 3000);
        sw.addEventListener('statechange', () => { if (sw.state === 'activated') { clearTimeout(t); res(); } });
      });
    }
    return new Promise((resolve) => {
      const ch = new MessageChannel();
      const t = setTimeout(() => resolve({ error: 'timeout' }), 2500);
      ch.port1.onmessage = (e) => { clearTimeout(t); resolve(e.data); };
      try { (reg.active || sw).postMessage('probe', [ch.port2]); } catch (e) { clearTimeout(t); resolve({ error: e.message }); }
    });
  }

  async function audioProbe() {
    const AC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    if (!AC) return null;
    async function render() {
      const ctx = new AC(1, 5000, 44100);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 10000;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -50; comp.knee.value = 40; comp.ratio.value = 12; comp.attack.value = 0; comp.release.value = 0.25;
      osc.connect(comp); comp.connect(ctx.destination);
      osc.start(0);
      const buf = await new Promise((res, rej) => {
        ctx.oncomplete = (e) => res(e.renderedBuffer);
        const p = ctx.startRendering();
        if (p && p.then) p.then(res, rej);
      });
      const sum = (d) => { let s = 0; for (let i = 4500; i < 5000; i++) s += Math.abs(d[i]); return s; };
      return { a: sum(buf.getChannelData(0)), b: sum(buf.getChannelData(0)) };
    }
    const r1 = await render();
    const r2 = await render();
    return { value: r1.a, renderStable: r1.a === r2.a, readStable: r1.a === r1.b };
  }

  function getWebGL() {
    const out = { supported: false };
    try {
      const c = document.createElement('canvas');
      const g = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!g) return out;
      out.supported = true;
      out.vendor = g.getParameter(g.VENDOR);
      out.renderer = g.getParameter(g.RENDERER);
      const ext = g.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        out.unmaskedVendor = g.getParameter(ext.UNMASKED_VENDOR_WEBGL);
        out.unmaskedRenderer = g.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      }
      out.maxTexture = g.getParameter(g.MAX_TEXTURE_SIZE);
      out.extensions = (g.getSupportedExtensions() || []).length;
      const lose = g.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (e) {
      out.error = String(e);
    }
    return out;
  }

  function canvasProbe() {
    const out = { supported: false };
    try {
      const c = document.createElement('canvas');
      c.width = 20; c.height = 20;
      const ctx = c.getContext('2d');
      if (!ctx) return out;
      out.supported = true;
      ctx.fillStyle = 'rgb(17,128,201)';
      ctx.fillRect(0, 0, 20, 20);
      const d = ctx.getImageData(0, 0, 20, 20).data;
      let bad = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] !== 17 || d[i + 1] !== 128 || d[i + 2] !== 201 || d[i + 3] !== 255) bad++;
      out.solidMismatch = bad;

      const c2 = document.createElement('canvas');
      c2.width = 240; c2.height = 60;
      const x = c2.getContext('2d');
      x.textBaseline = 'top';
      x.font = '16px Arial';
      x.fillStyle = '#f60'; x.fillRect(100, 1, 62, 20);
      x.fillStyle = '#069'; x.fillText('BotLens <canvas> 1.0 \u{1F603}', 2, 15);
      x.fillStyle = 'rgba(102,204,0,0.7)'; x.fillText('BotLens <canvas> 1.0 \u{1F603}', 4, 17);
      const u1 = c2.toDataURL();
      const u2 = c2.toDataURL();
      const blank = document.createElement('canvas');
      blank.width = 240; blank.height = 60;
      out.dataUrlStable = u1 === u2;
      out.blank = u1 === blank.toDataURL();
      out.hash = hash(u1);
    } catch (e) {
      out.error = String(e);
    }
    return out;
  }

  function tzOffsetFor(tz, date) {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const p = {};
    for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    const t = Math.floor(date.getTime() / 1000) * 1000;
    return Math.round((t - asUTC) / 60000);
  }

  async function gatherContext() {
    const nav = navigator;
    const ua = nav.userAgent || '';
    const claimed = parseUA(ua);
    const engine = detectEngine();
    if (claimed.os === 'macOS' && nav.maxTouchPoints > 1 && engine.engine === 'JavaScriptCore') {
      claimed.os = 'iPadOS';
      claimed.iosDevice = 'iPad';
      claimed.mobile = true;
      claimed.desktopMode = true;
      claimed.expectedEngine = 'JavaScriptCore';
    }
    const desktop = ['Windows', 'macOS', 'Linux', 'ChromeOS'].includes(claimed.os);
    const iframe = makeIframe();
    const [worker, uaHigh, notif, devices, voices, audio, brave, sw] = await Promise.all([
      withTimeout(workerProbe(), 2000, null),
      withTimeout(uaHighEntropy(), 1200, null),
      withTimeout(notificationProbe(), 1200, null),
      withTimeout(devicesProbe(), 1200, null),
      withTimeout(voicesProbe(), 1200, null),
      withTimeout(audioProbe(), 1800, null),
      withTimeout(braveProbe(), 600, false),
      withTimeout(serviceWorkerProbe(), 1500, null),
    ]);
    return {
      ua, claimed, engine, desktop, iframe, worker, uaHigh, notif, devices, voices, audio, brave, sw,
      gl: getWebGL(),
      canvas: canvasProbe(),
      secure: !!global.isSecureContext,
      server: global.__SERVER__ || null,
    };
  }

  // ===========================================================================
  // Check groups
  // ===========================================================================
  async function checkAutomation(ctx, add) {
    const C = CAT.AUTO;

    const wd = safe(() => navigator.webdriver);
    if (wd === true) {
      add(C, 'webdriver', 'navigator.webdriver flag', 'fail', 'navigator.webdriver === true. The browser reports it is driven by WebDriver/CDP automation (Selenium, Puppeteer, Playwright, safaridriver, Appium…).', { weight: 60 });
    } else if (!('webdriver' in navigator)) {
      add(C, 'webdriver', 'navigator.webdriver flag', 'warn', 'The webdriver property was removed from Navigator. Chrome, Firefox and Safari all define it, and deleting it is a classic stealth-plugin patch.', { weight: 20 });
    } else {
      add(C, 'webdriver', 'navigator.webdriver flag', 'pass', 'navigator.webdriver is ' + String(wd) + '.');
    }

    const hits = scanMarkers();
    if (hits.length) {
      const by = {};
      for (const h of hits) (by[h.framework] = by[h.framework] || []).push(h.where + '.' + h.key);
      for (const fw of Object.keys(by)) {
        add(C, 'marker-' + fw, fw + ' globals', 'fail', `Automation globals found: ${by[fw].join(', ')}`, { weight: 60 });
      }
    } else {
      add(C, 'markers', 'Framework globals', 'pass', 'No Selenium / ChromeDriver (cdc_) / PhantomJS / Nightmare / Playwright / Puppeteer / Cypress / TestCafe / Node globals on window or document.');
    }

    const attrs = ['selenium', 'webdriver', 'driver'].filter((a) => document.documentElement.hasAttribute(a));
    if (attrs.length) add(C, 'doc-attrs', 'Driver attributes on <html>', 'fail', 'Attributes injected by a WebDriver: ' + attrs.join(', '), { weight: 60 });
    else add(C, 'doc-attrs', 'Driver attributes on <html>', 'pass', 'No selenium / webdriver / driver attributes on the document element.');

    const m = ctx.ua.match(AUTOMATION_UA_RE);
    if (m) add(C, 'ua-token', 'Automation token in User-Agent', 'fail', `User-Agent contains "${m[0]}".`, { weight: 60 });
    else if (/Electron\//.test(ctx.ua)) add(C, 'ua-token', 'Automation token in User-Agent', 'warn', 'User-Agent contains "Electron". This is an embedded Chromium app, often used for automation.', { weight: 20 });
    else add(C, 'ua-token', 'Automation token in User-Agent', 'pass', 'No HeadlessChrome / PhantomJS / bot / HTTP-library tokens.');

    if (ctx.uaHigh && ctx.uaHigh.low.brands.some((b) => /headless/i.test(b.brand))) {
      add(C, 'ch-headless', 'Client Hints brand', 'fail', 'navigator.userAgentData.brands contains "HeadlessChrome".', { weight: 60 });
    }

    const electron = safe(() => global.process && global.process.versions && global.process.versions.electron, null);
    if (electron) add(C, 'electron', 'Electron / Node integration', 'fail', `Node.js integration exposed to the page (Electron ${electron}).`, { weight: 40 });

    if (ctx.engine.engine === 'V8') {
      if (cdpProbe()) {
        add(C, 'cdp', 'Chrome DevTools Protocol attached', 'fail', 'An inspector client serialised a console probe, so the CDP Runtime domain is enabled. Puppeteer, Playwright, Selenium 4, undetected-chromedriver and nodriver do this. (It also triggers if YOU have DevTools open.)', { weight: 40 });
      } else {
        add(C, 'cdp', 'Chrome DevTools Protocol attached', 'pass', 'No inspector serialisation observed. Newer Chromium versions closed this leak, so a pass here does not prove much on its own.');
      }
    }
  }

  async function checkHeadless(ctx, add) {
    const C = CAT.HEADLESS;
    const c = ctx.claimed;
    const ow = global.outerWidth, oh = global.outerHeight, iw = global.innerWidth, ih = global.innerHeight;

    if (ow === 0 && oh === 0) add(C, 'outer-zero', 'Window outer size', 'fail', 'outerWidth/outerHeight are 0. This is the classic headless-Chrome giveaway.', { weight: 40 });
    else if (ctx.desktop && ow === iw && oh === ih) add(C, 'outer-zero', 'Window outer size', 'warn', `Viewport equals the outer window (${iw}×${ih}), so there is no browser toolbar. Headless, kiosk or F11 fullscreen.`, { weight: 12 });
    else add(C, 'outer-zero', 'Window outer size', 'pass', `outer ${ow}×${oh}, inner ${iw}×${ih}.`);

    if (ctx.desktop) {
      if (screen.width === 800 && screen.height === 600) add(C, 'screen-default', 'Screen resolution', 'warn', 'Screen is exactly 800×600, the default headless resolution.', { weight: 15 });
      else if (screen.availWidth === screen.width && screen.availHeight === screen.height) add(C, 'screen-default', 'Screen resolution', 'warn', `No OS taskbar/menu bar space reserved (avail = ${screen.width}×${screen.height}). Common in headless and VMs, but auto-hide taskbars do this too.`, { weight: 5 });
      else add(C, 'screen-default', 'Screen resolution', 'pass', `${screen.width}×${screen.height}, available ${screen.availWidth}×${screen.availHeight}.`);
    }

    const plugins = safe(() => navigator.plugins.length, 0);
    if (ctx.desktop) {
      if (plugins === 0 && navigator.pdfViewerEnabled !== false) add(C, 'plugins', 'Browser plugins', 'warn', 'navigator.plugins is empty. Desktop Chrome, Edge, Firefox and Safari all expose PDF viewer plugins.', { weight: 20 });
      else add(C, 'plugins', 'Browser plugins', 'pass', `${plugins} plugin(s) present.`);
    }

    const langs = safe(() => navigator.languages, null);
    if (!langs) add(C, 'languages', 'navigator.languages', 'warn', 'navigator.languages is undefined.', { weight: 15 });
    else if (langs.length === 0) add(C, 'languages', 'navigator.languages', 'fail', 'navigator.languages is empty, a headless / bare-environment trait.', { weight: 30 });
    else add(C, 'languages', 'navigator.languages', 'pass', langs.join(', '));

    if (c.expectedEngine === 'V8' && ctx.engine.engine === 'V8' && !c.iosDevice && c.browser !== 'Electron') {
      if (typeof global.chrome === 'undefined') add(C, 'window-chrome', 'window.chrome object', 'warn', 'Chromium UA but window.chrome is missing (old headless Chrome / stripped runtime).', { weight: 25 });
      else add(C, 'window-chrome', 'window.chrome object', 'pass', 'window.chrome present: ' + Object.keys(global.chrome).slice(0, 6).join(', '));
    }

    if (ctx.notif) {
      if (ctx.notif.permission === 'denied' && ctx.notif.state === 'prompt') add(C, 'notif', 'Notification permission coherence', 'fail', 'Notification.permission is "denied" while the Permissions API says "prompt". This contradiction is a known headless-Chrome trait.', { weight: 35 });
      else add(C, 'notif', 'Notification permission coherence', 'pass', `Notification.permission="${ctx.notif.permission}", permissions.query="${ctx.notif.state}".`);
    }

    const gl = ctx.gl;
    const rend = (gl.unmaskedRenderer || gl.renderer || '') + ' ' + (gl.unmaskedVendor || gl.vendor || '');
    if (!gl.supported) {
      add(C, 'webgl-soft', 'GPU / WebGL', ctx.desktop ? 'warn' : 'info', 'WebGL unavailable (disabled, blocked, or a GPU-less environment).', { weight: 10 });
    } else if (/SwiftShader|llvmpipe|softpipe|Software Rasterizer|Mesa OffScreen|Microsoft Basic Render|VMware|VirtualBox|SVGA3D|Parallels|QEMU|virgl|Basic Display/i.test(rend)) {
      add(C, 'webgl-soft', 'GPU / WebGL', 'warn', `Software or virtual GPU: "${rend.trim()}". Typical of headless browsers, VMs and cloud bot farms.`, { weight: 20 });
    } else {
      add(C, 'webgl-soft', 'GPU / WebGL', 'pass', rend.trim() || 'WebGL available');
    }

    if (ctx.devices) {
      if (ctx.devices.fakeLabels && ctx.devices.fakeLabels.length > 0) add(C, 'media-devices', 'Media devices', 'fail', `Synthetic Chromium fake media devices exposed (--use-fake-device-for-media-stream): ${ctx.devices.fakeLabels.slice(0, 4).join(', ')}`, { weight: 35 });
      else if (ctx.devices.count === 0 && ctx.desktop) add(C, 'media-devices', 'Media devices', 'warn', 'No audio/video devices enumerated. Headless browsers and servers usually have none.', { weight: 10 });
      else add(C, 'media-devices', 'Media devices', 'pass', `${ctx.devices.count} device(s): ${Object.entries(ctx.devices.kinds).map(([k, v]) => k + '×' + v).join(', ') || '-'}`);
    } else if (!ctx.secure) {
      add(C, 'media-devices', 'Media devices', 'info', 'navigator.mediaDevices is unavailable in an insecure (http LAN) context. Check skipped.');
    }

    if (ctx.voices === 0 && ctx.desktop) add(C, 'voices', 'Speech synthesis voices', 'warn', 'No TTS voices installed. Common in headless/Linux server environments.', { weight: 5 });
    else if (ctx.voices != null) add(C, 'voices', 'Speech synthesis voices', 'pass', `${ctx.voices} voice(s).`);

    const conn = navigator.connection;
    if (conn && conn.rtt === 0 && ctx.engine.engine === 'V8') add(C, 'rtt', 'Network RTT estimate', 'warn', 'navigator.connection.rtt is 0. Headless or emulated network.', { weight: 5 });

    const hc = navigator.hardwareConcurrency;
    if (hc !== undefined && hc < 2) add(C, 'cores', 'CPU cores', 'warn', `hardwareConcurrency = ${hc}. Single-core is typical of small cloud VMs / containers.`, { weight: 10 });
    else if (hc !== undefined) add(C, 'cores', 'CPU cores', 'pass', `${hc} logical cores.`);

    const tz = safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone, '');
    if (/^(UTC|Etc\/UTC|Etc\/GMT|GMT)$/.test(tz)) add(C, 'tz-utc', 'Timezone', 'warn', `Timezone is ${tz}. Cloud servers and bot farms default to UTC.`, { weight: 5 });
  }

  async function checkTampering(ctx, add) {
    const C = CAT.TAMPER;
    const iwin = ctx.iframe.win;
    let checked = 0, lied = 0;

    for (const p of NAV_PROPS) {
      const d = _getOwnDesc(global.Navigator.prototype, p);
      if (!d || !d.get) continue;
      checked++;
      const r = inspectFn(d.get, p, iwin);
      if (!d.enumerable || !d.configurable) r.lies.push(`non-standard WebIDL descriptor flags (enumerable=${!!d.enumerable}, configurable=${!!d.configurable})`);
      if (d.set !== undefined) r.lies.push('readonly WebIDL attribute has a setter');
      try {
        d.get.call(Object.create(global.Navigator.prototype));
        r.lies.push('getter accepts a fake receiver (no "Illegal invocation")');
      } catch (e) { /* expected */ }
      if (r.lies.length) {
        lied++;
        add(C, 'nav-' + p, `navigator.${p} getter`, 'fail', 'Getter was replaced or wrapped: ' + r.lies.join('; ') + '.', { weight: 30, evidence: r.str });
      }
    }

    const recProbe = recursionProbe();
    if (recProbe.wrapped.length) {
      lied++;
      add(C, 'recursion-depth', 'Call-stack recursion boundary', 'fail', `Extra stack frames detected when invoking native getters near RangeError limit: ${recProbe.wrapped.join('; ')}. Invisible JS/Proxy wrapper detected.`, { weight: 35 });
    } else {
      add(C, 'recursion-depth', 'Call-stack recursion boundary', 'pass', 'Native getters consume zero extra JS call-stack frames at the RangeError recursion boundary.');
    }

    if (iwin && iwin.Navigator) {
      const topKeys = safe(() => _getOwnNames(global.Navigator.prototype), []);
      const ifrKeys = safe(() => _getOwnNames(iwin.Navigator.prototype), []);
      const ifrSet = new Set(ifrKeys);
      const topSet = new Set(topKeys);
      const topShared = topKeys.filter((k) => ifrSet.has(k));
      const ifrShared = ifrKeys.filter((k) => topSet.has(k));
      if (topShared.length && ifrShared.length && topShared.join(',') !== ifrShared.join(',')) {
        add(C, 'nav-key-order', 'Navigator.prototype WebIDL key order', 'fail', 'Property enumeration order on Navigator.prototype differs from a clean iframe (properties were deleted and re-defined by a stealth script).', { weight: 35 });
      } else if (topKeys.length) {
        add(C, 'nav-key-order', 'Navigator.prototype WebIDL key order', 'pass', `All ${topKeys.length} WebIDL prototype keys match clean-realm enumeration order.`);
      }
    }

    for (const [path, kind] of FN_TARGETS) {
      const fn = resolveTarget(path, kind);
      if (!fn) continue;
      checked++;
      const r = inspectFn(fn, path.split('.').pop(), iwin, path.indexOf('chrome.') === 0);
      if (r.lies.length) {
        lied++;
        add(C, 'fn-' + path, path + (kind === 'get' ? ' (getter)' : '()'), 'fail', 'Native API tampered: ' + r.lies.join('; ') + '. Typical of stealth plugins, spoofing extensions and antidetect browsers.', { weight: 30, evidence: r.str });
      }
    }
    if (!lied) add(C, 'native-integrity', 'Native API integrity', 'pass', `${checked} native functions & getters verified with toString, clean-realm, Proxy, constructor and receiver checks.`);

    const navOwn = safe(() => _getOwnNames(navigator), []);
    if (navOwn.length) add(C, 'nav-own', 'Properties planted on navigator', 'fail', 'Real browsers keep these on Navigator.prototype. Found own properties: ' + navOwn.join(', '), { weight: 35 });
    else add(C, 'nav-own', 'Properties planted on navigator', 'pass', 'navigator has no own properties (as expected).');

    const scrOwn = safe(() => _getOwnNames(screen), []);
    if (scrOwn.length) add(C, 'screen-own', 'Properties planted on screen', 'fail', 'Own properties on screen: ' + scrOwn.join(', '), { weight: 30 });

    const protoOK = safe(() => Object.getPrototypeOf(navigator) === global.Navigator.prototype && Object.prototype.toString.call(navigator) === '[object Navigator]', false);
    if (!protoOK) add(C, 'nav-proto', 'navigator prototype chain', 'fail', 'navigator is not a genuine Navigator instance (replaced or proxied object).', { weight: 40 });

    const replaced = ['outerWidth', 'outerHeight', 'innerWidth', 'innerHeight', 'devicePixelRatio', 'screenX', 'screenY'].filter((p) => {
      const d = _getOwnDesc(global, p) || (global.Window && _getOwnDesc(global.Window.prototype, p));
      return d && 'value' in d;
    });
    if (replaced.length) add(C, 'win-replaced', 'Overwritten window metrics', 'warn', 'These window accessors were replaced by plain values: ' + replaced.join(', '), { weight: 20 });

    // plugin array authenticity
    const pl = navigator.plugins;
    if (pl && pl.length) {
      const issues = [];
      if (!safe(() => pl instanceof global.PluginArray, false)) issues.push('not instanceof PluginArray');
      if (!safe(() => pl[0] instanceof global.Plugin, false)) issues.push('plugins[0] not instanceof Plugin');
      if (!safe(() => pl.item(4294967296) === pl[0], false)) issues.push('item(2^32) does not wrap to item(0) (fake WebIDL)');
      if (!safe(() => !navigator.mimeTypes.length || navigator.mimeTypes[0].enabledPlugin instanceof global.Plugin, false)) issues.push('mimeTypes[0].enabledPlugin is not a Plugin');
      if (issues.length) add(C, 'plugins-fake', 'Plugin array authenticity', 'fail', 'navigator.plugins is a forgery: ' + issues.join('; '), { weight: 35 });
      else add(C, 'plugins-fake', 'Plugin array authenticity', 'pass', 'PluginArray/Plugin/MimeType objects are genuine.');
    }

    // main frame vs fresh iframe
    if (iwin) {
      const mism = [];
      const cmp = (label, a, b) => { if (fmt(a) !== fmt(b)) mism.push(`${label}: top=${fmt(a)} iframe=${fmt(b)}`); };
      const inav = safe(() => iwin.navigator, null);
      if (inav) {
        cmp('userAgent', navigator.userAgent, inav.userAgent);
        cmp('platform', navigator.platform, inav.platform);
        cmp('vendor', navigator.vendor, inav.vendor);
        cmp('webdriver', navigator.webdriver, inav.webdriver);
        cmp('hardwareConcurrency', navigator.hardwareConcurrency, inav.hardwareConcurrency);
        cmp('deviceMemory', navigator.deviceMemory, inav.deviceMemory);
        cmp('maxTouchPoints', navigator.maxTouchPoints, inav.maxTouchPoints);
        cmp('languages', safe(() => Array.from(navigator.languages)), safe(() => Array.from(inav.languages)));
        cmp('plugins.length', safe(() => navigator.plugins.length), safe(() => inav.plugins.length));
        cmp('typeof chrome', typeof global.chrome, typeof iwin.chrome);
      }
      if (iwin === global || safe(() => iwin.self !== iwin, false)) mism.push('iframe.contentWindow resolves to the top window (broken contentWindow patch)');
      if (mism.length) add(C, 'iframe-consistency', 'Main frame vs. iframe', 'fail', 'Spoofing was applied to the top frame only. ' + mism.join(' · '), { weight: 35 });
      else add(C, 'iframe-consistency', 'Main frame vs. iframe', 'pass', 'A fresh same-origin iframe reports identical navigator values.');
    }

    // main thread vs web worker
    const w = ctx.worker;
    if (w && !w.error) {
      const mism = [];
      const cmp = (label, a, b) => { if (a !== undefined && b !== undefined && fmt(a) !== fmt(b)) mism.push(`${label}: window=${fmt(a)} worker=${fmt(b)}`); };
      cmp('userAgent', navigator.userAgent, w.userAgent);
      cmp('platform', navigator.platform, w.platform);
      cmp('hardwareConcurrency', navigator.hardwareConcurrency, w.hardwareConcurrency);
      cmp('deviceMemory', navigator.deviceMemory, w.deviceMemory);
      cmp('languages', safe(() => Array.from(navigator.languages)), w.languages || undefined);
      cmp('timeZone', safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone), w.timeZone);
      cmp('timezoneOffset', new Date().getTimezoneOffset(), w.tzOffset);
      if (ctx.uaHigh) {
        cmp('userAgentData.platform', ctx.uaHigh.low.platform, w.uaPlatform);
        cmp('userAgentData.brands', ctx.uaHigh.low.brands.map((b) => b.brand + ' ' + b.version).join(', '), w.uaBrands);
      }
      if (mism.length) add(C, 'worker-consistency', 'Window vs. Web Worker', 'fail', 'The worker scope reveals the real values (spoofing only patched window). ' + mism.join(' · '), { weight: 35 });
      else add(C, 'worker-consistency', 'Window vs. Web Worker', 'pass', 'Worker reports the same UA, platform, cores, languages and timezone.');

      const mainGL = ctx.gl.unmaskedRenderer || ctx.gl.renderer;
      if (w.glRenderer && mainGL && w.glRenderer !== mainGL) {
        add(C, 'worker-gpu', 'GPU: window vs. worker', 'warn', `WebGL renderer differs: window="${mainGL}" worker="${w.glRenderer}". The GPU string is spoofed on window.`, { weight: 20 });
      }
      if (w.glMaxTex && ctx.gl.maxTexture && w.glMaxTex !== ctx.gl.maxTexture) {
        add(C, 'worker-gltex', 'WebGL MAX_TEXTURE_SIZE: window vs. worker', 'fail', `Window reports MAX_TEXTURE_SIZE=${ctx.gl.maxTexture} but Worker reports ${w.glMaxTex}. WebGL parameters are spoofed on main thread.`, { weight: 30 });
      }
      const mainOC = offscreen2dSign(global.OffscreenCanvas);
      if (mainOC && w.canvas2dHash) {
        if (mainOC.hash !== w.canvas2dHash) {
          add(C, 'worker-canvas', 'OffscreenCanvas: window vs. worker', 'fail', `2D OffscreenCanvas render differs between main thread (${mainOC.hash}) and Worker (${w.canvas2dHash}). Canvas noise hook only affects one realm or injects per-call noise.`, { weight: 30 });
        } else {
          add(C, 'worker-canvas', 'OffscreenCanvas: window vs. worker', 'pass', `Identical 2D OffscreenCanvas render across main thread and Worker (${w.canvas2dHash}).`);
        }
      }
    } else {
      add(C, 'worker-consistency', 'Window vs. Web Worker', 'info', 'Worker comparison unavailable' + (w && w.error ? ` (${w.error})` : '') + '.');
    }

    // main thread vs service worker
    const swd = ctx.sw;
    if (swd && !swd.error) {
      const mism = [];
      const cmp = (label, a, b) => { if (a !== undefined && b !== undefined && b !== null && fmt(a) !== fmt(b)) mism.push(`${label}: window=${fmt(a)} serviceWorker=${fmt(b)}`); };
      cmp('userAgent', navigator.userAgent, swd.userAgent);
      cmp('platform', navigator.platform, swd.platform);
      cmp('hardwareConcurrency', navigator.hardwareConcurrency, swd.hardwareConcurrency);
      cmp('deviceMemory', navigator.deviceMemory, swd.deviceMemory);
      cmp('languages', safe(() => Array.from(navigator.languages)), swd.languages);
      cmp('timeZone', safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone), swd.timeZone);
      if (ctx.uaHigh) cmp('userAgentData.platform', ctx.uaHigh.low.platform, swd.uaPlatform);
      if (mism.length) add(C, 'sw-consistency', 'Window vs. Service Worker', 'fail', 'The ServiceWorker scope (which stealth patches rarely reach) reveals different values. ' + mism.join(' · '), { weight: 35 });
      else add(C, 'sw-consistency', 'Window vs. Service Worker', 'pass', 'ServiceWorker scope reports identical UA, platform, cores, languages and timezone.');
    } else if (global.isSecureContext && 'serviceWorker' in navigator) {
      add(C, 'sw-consistency', 'Window vs. Service Worker', 'info', 'Service-worker comparison unavailable' + (swd && swd.error ? ` (${swd.error})` : ' (registration blocked)') + '.');
    }

    // canvas & audio noise
    const cv2 = ctx.canvas;
    if (cv2.supported) {
      if (cv2.blank) add(C, 'canvas', 'Canvas readback', 'warn', 'Canvas readback returns a blank image. Fingerprinting is blocked (privacy mode or extension).', { weight: 10 });
      else if (!cv2.dataUrlStable) add(C, 'canvas', 'Canvas readback', 'fail', 'Reading the same canvas twice gave different pixels. Randomised anti-fingerprint noise (antidetect browser or extension).', { weight: 25 });
      else if (cv2.solidMismatch > 0) add(C, 'canvas', 'Canvas readback', 'warn', `${cv2.solidMismatch}/400 pixels of a solid fill came back altered. Canvas noise injection (Brave, Safari Advanced Fingerprinting Protection, extensions, antidetect).`, { weight: 15 });
      else add(C, 'canvas', 'Canvas readback', 'pass', `Pixel-exact and stable (hash ${cv2.hash}).`);
    }
    if (ctx.audio) {
      if (!ctx.audio.renderStable || !ctx.audio.readStable) add(C, 'audio', 'Audio fingerprint stability', 'warn', `Audio output changes between ${!ctx.audio.readStable ? 'reads of the same buffer' : 'identical renders'}. Audio noise injection.`, { weight: 15 });
      else add(C, 'audio', 'Audio fingerprint stability', 'pass', 'Offline audio render is deterministic (' + ctx.audio.value.toFixed(6) + ').');
    }
    if (ctx.brave) add(C, 'brave', 'Brave browser', 'info', 'Brave detected. Its "farbling" deliberately randomises canvas/audio/hardware values per site.');

    if (ctx.engine.engine === 'V8' && typeof Error.prepareStackTrace === 'function') {
      add(C, 'prepare-stack', 'Error.prepareStackTrace', 'warn', 'Error.prepareStackTrace is overridden. Used by stealth scripts to scrub automation frames from stack traces.', { weight: 10 });
    }
  }

  async function checkConsistency(ctx, add) {
    const C = CAT.CONSIST;
    const c = ctx.claimed;
    const eng = ctx.engine.engine;
    const ua = ctx.ua;

    // JS engine vs claimed browser
    if (c.expectedEngine !== 'unknown' && eng !== 'unknown') {
      if (c.expectedEngine !== eng) {
        add(C, 'engine', 'JS engine vs. User-Agent', 'fail', `User-Agent claims ${c.browser} on ${c.os} (→ ${c.expectedEngine}) but the JavaScript engine behaves like ${eng}. ${c.iosDevice ? 'Every iOS browser must use WebKit, so this is desktop emulation (e.g. DevTools device mode) or a UA spoofer.' : 'The User-Agent is spoofed.'}`, { weight: 50, evidence: ctx.engine.errorMessage });
      } else {
        add(C, 'engine', 'JS engine vs. User-Agent', 'pass', `${c.browser} → ${eng}, as expected.`);
      }
    }

    // browser-exclusive APIs
    const v8Only = [];
    if (navigator.userAgentData) v8Only.push('navigator.userAgentData');
    if (performance.memory) v8Only.push('performance.memory');
    if ('webkitTemporaryStorage' in navigator) v8Only.push('navigator.webkitTemporaryStorage');
    const geckoOnly = [];
    if ('mozInnerScreenX' in global) geckoOnly.push('mozInnerScreenX');
    if ('MozAppearance' in document.documentElement.style) geckoOnly.push('MozAppearance');
    const webkitOnly = [];
    if (typeof navigator.standalone === 'boolean') webkitOnly.push('navigator.standalone');
    if ('GestureEvent' in global) webkitOnly.push('GestureEvent');
    if ('ApplePaySession' in global) webkitOnly.push('ApplePaySession');
    const featureLies = [];
    if (c.expectedEngine === 'JavaScriptCore' || c.expectedEngine === 'SpiderMonkey') if (v8Only.length) featureLies.push('Chromium-only APIs present: ' + v8Only.join(', '));
    if (c.expectedEngine === 'V8' || c.expectedEngine === 'JavaScriptCore') if (geckoOnly.length) featureLies.push('Firefox-only APIs present: ' + geckoOnly.join(', '));
    if (c.expectedEngine === 'V8' || c.expectedEngine === 'SpiderMonkey') if (webkitOnly.length) featureLies.push('WebKit-only APIs present: ' + webkitOnly.join(', '));
    if (featureLies.length) add(C, 'feature-set', 'Browser-exclusive APIs', 'fail', `Claimed ${c.browser}, but: ${featureLies.join(' · ')}`, { weight: 40 });
    else if (c.expectedEngine !== 'unknown') add(C, 'feature-set', 'Browser-exclusive APIs', 'pass', 'Vendor-specific APIs match the claimed browser.');

    // claimed version vs. JS feature support
    const cev = claimedEngineVersion(c, ua);
    if (cev && c.expectedEngine === eng) {
      const missing = [], tooNew = [];
      for (const f of FEATURES) {
        const req = f[cev.family];
        if (req == null) continue;
        const has = safe(f.test, false);
        if (cev.v >= req && !has) missing.push(`${f.name} (${cev.family} ${req})`);
        if (cev.v < req && has) tooNew.push(`${f.name} (${cev.family} ${req})`);
      }
      if (missing.length) add(C, 'version', 'Claimed version vs. engine features', 'fail', `UA claims ${cev.family} ${cev.v} but the engine lacks: ${missing.join(', ')}. The User-Agent version is forged.`, { weight: 35 });
      else if (tooNew.length) add(C, 'version', 'Claimed version vs. engine features', 'warn', `UA claims ${cev.family} ${cev.v} but the engine already supports: ${tooNew.join(', ')}. The engine is newer than the claimed version (hard-coded old UA string).`, { weight: 20 });
      else add(C, 'version', 'Claimed version vs. engine features', 'pass', `Engine feature set matches ${cev.family} ${cev.v}.`);
    }

    // platform vs UA OS
    const plat = navigator.platform || '';
    const PLAT_RE = { Windows: /^Win/, macOS: /^Mac/, iOS: /^(iPhone|iPod|iPad)/, iPadOS: /^(iPad|MacIntel)/, Android: /^(Linux|Android|null$)/i, Linux: /^(Linux|X11|FreeBSD|OpenBSD)/, ChromeOS: /Linux|CrOS/ };
    const pre = PLAT_RE[c.os];
    if (pre && plat) {
      if (!pre.test(plat)) add(C, 'platform', 'navigator.platform vs. User-Agent', 'fail', `UA says ${c.os} but navigator.platform is "${plat}".`, { weight: 40 });
      else add(C, 'platform', 'navigator.platform vs. User-Agent', 'pass', `"${plat}" matches ${c.os}.`);
    }

    // vendor
    const VENDOR = { V8: 'Google Inc.', JavaScriptCore: 'Apple Computer, Inc.', SpiderMonkey: '' };
    if (c.expectedEngine in VENDOR && !/Samsung|Yandex/.test(c.browser)) {
      if (navigator.vendor !== VENDOR[c.expectedEngine]) add(C, 'vendor', 'navigator.vendor', 'fail', `Expected "${VENDOR[c.expectedEngine]}" for ${c.browser}, got "${navigator.vendor}".`, { weight: 30 });
      else add(C, 'vendor', 'navigator.vendor', 'pass', `"${navigator.vendor}"`);
    }

    // appVersion
    if (eng !== 'SpiderMonkey' && ua.indexOf('Mozilla/') === 0 && navigator.appVersion) {
      if (navigator.appVersion !== ua.slice(8)) add(C, 'appversion', 'navigator.appVersion', 'fail', 'appVersion does not match userAgent. Only one of them was spoofed.', { weight: 30 });
      else add(C, 'appversion', 'navigator.appVersion', 'pass', 'appVersion consistent with userAgent.');
    }

    // Client Hints
    if (ctx.uaHigh) {
      const low = ctx.uaHigh.low;
      const issues = [];
      const PMAP = { Windows: 'Windows', macOS: 'macOS', Linux: 'Linux', Android: 'Android', ChromeOS: 'Chrome OS' };
      if (PMAP[c.os] && low.platform && low.platform !== PMAP[c.os]) issues.push(`UA says ${c.os} but userAgentData.platform="${low.platform}"`);
      const expMobile = c.os === 'Android' && /Mobile/.test(ua);
      if (typeof low.mobile === 'boolean' && c.os !== 'Unknown' && low.mobile !== expMobile) issues.push(`userAgentData.mobile=${low.mobile} but UA ${expMobile ? 'is' : 'is not'} mobile`);
      const br = low.brands.find((b) => /^(Chromium|Google Chrome|Microsoft Edge)$/.test(b.brand));
      if (br && c.chromeMajor && +br.version !== c.chromeMajor) issues.push(`UA says Chrome ${c.chromeMajor} but brands say ${br.brand} ${br.version}`);
      if (issues.length) add(C, 'client-hints', 'User-Agent Client Hints', 'fail', issues.join(' · '), { weight: 40 });
      else add(C, 'client-hints', 'User-Agent Client Hints', 'pass', `${low.brands.map((b) => b.brand + ' ' + b.version).join(', ')} · ${low.platform}`);
    } else if (c.expectedEngine === 'V8' && ctx.secure && (c.chromeMajor || 0) >= 90) {
      add(C, 'client-hints', 'User-Agent Client Hints', 'warn', 'Chromium UA on a secure page, but navigator.userAgentData is missing. The UA string is probably spoofed by a non-Chromium client.', { weight: 20 });
    }

    // GPU vs OS
    const gl = ctx.gl;
    if (gl.supported) {
      const rv = (gl.unmaskedRenderer || gl.renderer || '') + ' ' + (gl.unmaskedVendor || gl.vendor || '');
      let bad = null;
      if (c.iosDevice && !/Apple/i.test(rv)) bad = `iOS devices report "Apple GPU", got "${rv.trim()}"`;
      else if (c.os === 'macOS' && /Direct3D|D3D1[01]|D3D9/i.test(rv)) bad = `macOS cannot use Direct3D: "${rv.trim()}"`;
      else if (c.os === 'Windows' && /Apple (M\d|GPU)|Metal Renderer/i.test(rv)) bad = `Windows with an Apple GPU: "${rv.trim()}"`;
      else if (c.os === 'Android' && /Direct3D|D3D1[01]|Apple (M\d|GPU)|NVIDIA GeForce|Radeon/i.test(rv)) bad = `Android with a desktop GPU: "${rv.trim()}"`;
      else if (c.os === 'Linux' && /Direct3D|D3D1[01]|Apple M\d/i.test(rv)) bad = `Linux with Direct3D/Apple GPU: "${rv.trim()}"`;
      if (bad) add(C, 'gpu-os', 'GPU vs. operating system', 'fail', bad + '. The UA or GPU string is spoofed.', { weight: 40 });
      else add(C, 'gpu-os', 'GPU vs. operating system', 'pass', 'GPU vendor plausible for ' + c.os + '.');
    }

    // timezone
    const tz = safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone, null);
    if (tz) {
      const now = new Date();
      const expected = safe(() => tzOffsetFor(tz, now), null);
      const actual = now.getTimezoneOffset();
      if (expected != null && expected !== actual) add(C, 'timezone', 'Timezone coherence', 'fail', `Intl timezone "${tz}" implies offset ${-expected / 60}h but Date reports ${-actual / 60}h. Timezone spoofing.`, { weight: 35 });
      else add(C, 'timezone', 'Timezone coherence', 'pass', `${tz} (UTC${actual <= 0 ? '+' : '-'}${Math.abs(actual / 60)}) consistent across Date and Intl.`);
    }

    // language
    const langs = safe(() => Array.from(navigator.languages), []);
    if (langs.length && navigator.language && navigator.language !== langs[0]) {
      add(C, 'lang', 'navigator.language vs. languages', 'warn', `language="${navigator.language}" but languages[0]="${langs[0]}".`, { weight: 10 });
    }

    // touch vs device class
    const tp = navigator.maxTouchPoints || 0;
    if (c.mobile && tp === 0) add(C, 'touch', 'Touch support vs. device class', 'fail', `UA claims a ${c.os} mobile device but maxTouchPoints is 0. A desktop is pretending to be mobile.`, { weight: 35 });
    else if (c.os === 'macOS' && tp > 1) add(C, 'touch', 'Touch support vs. device class', 'warn', `macOS has no touchscreens but maxTouchPoints=${tp}.`, { weight: 20 });
    else add(C, 'touch', 'Touch support vs. device class', 'pass', `maxTouchPoints=${tp} for ${c.os}.`);

    // pointer media
    const mm = (q) => safe(() => global.matchMedia(q).matches, false);
    if (c.mobile && mm('(any-pointer: fine)') && !mm('(any-pointer: coarse)')) {
      add(C, 'pointer', 'Pointer type vs. device class', 'warn', 'Mobile UA but the only pointer is a fine (mouse) pointer.', { weight: 25 });
    } else if (c.mobile) {
      add(C, 'pointer', 'Pointer type vs. device class', 'pass', 'Coarse (touch) pointer present.');
    }

    // header cross-checks
    const srv = ctx.server;
    if (srv) {
      if (srv.userAgent && srv.userAgent !== navigator.userAgent) {
        add(C, 'ua-header', 'JS User-Agent vs. HTTP header', 'fail', 'navigator.userAgent differs from the User-Agent header sent on the wire, so the UA was overridden in JavaScript only.', { weight: 45, evidence: 'header: ' + srv.userAgent });
      } else if (srv.userAgent) {
        add(C, 'ua-header', 'JS User-Agent vs. HTTP header', 'pass', 'navigator.userAgent is identical to the HTTP User-Agent header.');
      }
      if (srv.acceptLanguage && langs.length) {
        const hdr = srv.acceptLanguage.split(',')[0].split(';')[0].trim().toLowerCase();
        const js = langs[0].toLowerCase();
        if (hdr && hdr.split('-')[0] !== js.split('-')[0]) add(C, 'lang-header', 'Accept-Language vs. navigator.languages', 'warn', `HTTP header prefers "${hdr}" but JS reports "${js}".`, { weight: 15 });
        else add(C, 'lang-header', 'Accept-Language vs. navigator.languages', 'pass', `"${hdr}" ≈ "${js}".`);
      }
    }
  }

  // Known iPhone portrait viewport geometries (CSS px @ DPR)
  const IPHONE_SCREENS = [
    ['320x568@2', 'iPhone 5/5s/SE (1st)'], ['375x667@2', 'iPhone 6/7/8/SE (2nd/3rd)'], ['414x736@3', 'iPhone 6+/7+/8+'],
    ['375x812@3', 'iPhone X/XS/11 Pro/12 mini/13 mini'], ['414x896@2', 'iPhone XR/11'], ['414x896@3', 'iPhone XS Max/11 Pro Max'],
    ['390x844@3', 'iPhone 12/13/14/16e'], ['428x926@3', 'iPhone 12/13 Pro Max, 14 Plus'], ['393x852@3', 'iPhone 14 Pro/15/15 Pro/16'],
    ['430x932@3', 'iPhone 14 Pro Max/15 Plus/15 Pro Max/16 Plus'], ['402x874@3', 'iPhone 16 Pro/17/17 Pro'], ['440x956@3', 'iPhone 16 Pro Max/17 Pro Max'],
    ['420x912@3', 'iPhone Air'], ['320x693@3', 'iPhone (Display Zoom)'], ['375x812@2', 'iPhone (Display Zoom)'],
  ];

  async function checkMobile(ctx, add) {
    const C = CAT.MOBILE;
    const c = ctx.claimed;
    const eng = ctx.engine.engine;
    const looksIOS = !!c.iosDevice;

    if (!looksIOS && c.os !== 'Android') {
      add(C, 'mobile-skip', 'Device class', 'info', `Desktop device (${c.os}). iOS-specific realism checks skipped. Open this page on an iPhone/iPad to run them.`);
      if (eng === 'JavaScriptCore' && (navigator.maxTouchPoints || 0) > 1) {
        add(C, 'ios-hidden', 'Hidden iOS device', 'warn', 'Desktop UA, but a touch-capable WebKit engine. An iPhone/iPad is requesting the desktop site, or the UA is spoofed.', { weight: 10 });
      }
      return;
    }

    if (looksIOS) {
      if (eng !== 'JavaScriptCore') add(C, 'ios-webkit', 'WebKit engine (iOS requirement)', 'fail', `Apple requires all iOS browsers to use WebKit/JavaScriptCore, but this engine is ${eng}. This is an emulated or spoofed iPhone.`, { weight: 50 });
      else add(C, 'ios-webkit', 'WebKit engine (iOS requirement)', 'pass', 'JavaScriptCore confirmed.');

      if (typeof navigator.standalone !== 'boolean') add(C, 'ios-standalone', 'navigator.standalone', 'warn', 'Missing the iOS WebKit-only navigator.standalone property.', { weight: 20 });
      else add(C, 'ios-standalone', 'navigator.standalone', 'pass', `Present (standalone=${navigator.standalone}${navigator.standalone ? ', running as home-screen web app' : ''}).`);

      if (!safe(() => CSS.supports('-webkit-touch-callout', 'none'), false)) add(C, 'ios-callout', '-webkit-touch-callout support', 'warn', 'The iOS-only CSS property -webkit-touch-callout is not supported.', { weight: 20 });
      else add(C, 'ios-callout', '-webkit-touch-callout support', 'pass', 'iOS-only CSS property supported.');

      const dmr = safe(() => typeof global.DeviceMotionEvent.requestPermission === 'function', false);
      if (dmr) add(C, 'ios-motion', 'DeviceMotionEvent.requestPermission', 'pass', 'iOS 13+ motion-permission API present.');
      else add(C, 'ios-motion', 'DeviceMotionEvent.requestPermission', ctx.secure ? 'warn' : 'info', 'iOS 13+ motion-permission API missing' + (ctx.secure ? '.' : ' (may be hidden on insecure http).'), { weight: 20 });

      if (typeof global.orientation !== 'number' && !c.desktopMode) add(C, 'ios-orientation', 'window.orientation', 'warn', 'window.orientation (still exposed by iOS WebKit) is missing.', { weight: 10 });

      if (navigator.userAgentData) add(C, 'ios-uadata', 'Client Hints on iOS', 'fail', 'navigator.userAgentData exists, but WebKit does not implement it. This is a Chromium engine.', { weight: 40 });
      if (navigator.deviceMemory !== undefined) add(C, 'ios-devmem', 'deviceMemory on iOS', 'fail', 'navigator.deviceMemory exists, but WebKit does not implement it. This is a Chromium engine.', { weight: 30 });

      const tp = navigator.maxTouchPoints || 0;
      if (tp < 1 || !('ontouchstart' in global)) add(C, 'ios-touch', 'Touch hardware', 'fail', `iOS devices are touch-only, but maxTouchPoints=${tp}, ontouchstart=${'ontouchstart' in global}.`, { weight: 35 });
      else add(C, 'ios-touch', 'Touch hardware', 'pass', `maxTouchPoints=${tp}, touch events supported.`);

      if (c.iosDevice === 'iPhone') {
        const w = Math.min(screen.width, screen.height), h = Math.max(screen.width, screen.height), dpr = global.devicePixelRatio;
        const key = `${w}x${h}@${dpr}`;
        const model = IPHONE_SCREENS.find((s) => s[0] === key);
        if (w > 500) add(C, 'ios-screen', 'iPhone screen geometry', 'fail', `Screen ${w}×${h} is far larger than any iPhone (desktop pretending to be an iPhone).`, { weight: 30 });
        else if (dpr < 2) add(C, 'ios-screen', 'iPhone screen geometry', 'warn', `devicePixelRatio=${dpr}, but every modern iPhone is 2× or 3×.`, { weight: 20 });
        else if (model) add(C, 'ios-screen', 'iPhone screen geometry', 'pass', `${key} → ${model[1]}.`);
        else add(C, 'ios-screen', 'iPhone screen geometry', 'warn', `${key} does not match a known iPhone geometry (emulation, or a model newer than this list).`, { weight: 5 });
      }

      if (safe(() => global.webkit && global.webkit.messageHandlers, null)) {
        add(C, 'ios-wkwebview', 'Embedded WKWebView', 'warn', 'window.webkit.messageHandlers is present, so this page runs inside a native app\'s WKWebView (in-app browser or app-driven automation), not Safari.', { weight: 5 });
      }
      if (c.inApp) add(C, 'ios-inapp', 'In-app browser', 'info', `Opened inside the ${c.inApp} in-app browser.`);
      if (c.desktopMode) add(C, 'ios-desktop', 'iPad desktop-class browsing', 'info', 'iPadOS presents a Mac User-Agent by default. Identified as iPad via touch + WebKit.');
      return;
    }

    // Android
    if (c.os === 'Android') {
      const tp = navigator.maxTouchPoints || 0;
      if (tp < 1) add(C, 'and-touch', 'Touch hardware', 'fail', 'Android UA with no touch points.', { weight: 35 });
      else add(C, 'and-touch', 'Touch hardware', 'pass', `maxTouchPoints=${tp}.`);
      if (eng === 'JavaScriptCore') add(C, 'and-engine', 'Engine on Android', 'fail', 'Android UA but a WebKit/JSC engine (an Apple device spoofing Android).', { weight: 40 });
      const w = Math.min(screen.width, screen.height);
      if (/Mobile/.test(ctx.ua) && w > 600) add(C, 'and-screen', 'Phone screen size', 'warn', `Mobile Android UA but the screen short side is ${w}px.`, { weight: 15 });
      if (ctx.server && ctx.server.headerOrder && /X-Requested-With/i.test(ctx.server.headerOrder.join(','))) add(C, 'and-webview', 'Android WebView', 'info', 'Request came from an embedded Android WebView app.');
    }
  }

  async function checkNetwork(ctx, add) {
    const C = CAT.NET;
    const srv = ctx.server;
    if (!srv) {
      add(C, 'srv-missing', 'Server header analysis', 'info', 'No server-side data (page not served by the BotLens server).');
      return;
    }
    for (const f of srv.findings) add(C, f.id, f.name, f.status, f.detail, { weight: f.weight });
    add(C, 'hdr-order', 'Header order', 'info', srv.headerOrder.join(' → '));
    add(C, 'srv-ip', 'Client IP / protocol', 'info', `${srv.ip} via HTTP/${srv.httpVersion} to ${srv.host}${srv.trustworthy ? ' (trustworthy origin)' : ''}`);
    if (!ctx.secure) add(C, 'insecure', 'Secure context', 'info', 'Page is not a secure context (plain http on a LAN IP). Browsers hide some APIs (Client Hints, media devices…) and the checks adapt. Use localhost or HTTPS for full coverage.');
  }

  // ===========================================================================
  // Fingerprint summary
  // ===========================================================================
  function buildFingerprint(ctx) {
    const c = ctx.claimed;
    const tz = safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone, '?');
    const off = -new Date().getTimezoneOffset() / 60;
    const fp = {
      'User-Agent': ctx.ua,
      'Claimed browser': `${c.browser} ${c.version}`.trim(),
      'Claimed OS': `${c.os} ${c.osVersion}`.trim() + (c.desktopMode ? ' (desktop-mode UA)' : ''),
      'Detected JS engine': ctx.engine.engine,
      'navigator.platform': navigator.platform,
      'navigator.vendor': navigator.vendor || '(empty)',
      'Screen': `${screen.width}×${screen.height} @${global.devicePixelRatio}x (avail ${screen.availWidth}×${screen.availHeight}, ${screen.colorDepth}-bit)`,
      'Viewport': `${global.innerWidth}×${global.innerHeight} (outer ${global.outerWidth}×${global.outerHeight})`,
      'CPU cores': navigator.hardwareConcurrency ?? 'n/a',
      'Device memory': navigator.deviceMemory != null ? navigator.deviceMemory + ' GB' : 'n/a',
      'Touch points': navigator.maxTouchPoints ?? 0,
      'Languages': safe(() => navigator.languages.join(', '), navigator.language),
      'Timezone': `${tz} (UTC${off >= 0 ? '+' : ''}${off})`,
      'GPU': ctx.gl.supported ? `${ctx.gl.unmaskedVendor || ctx.gl.vendor} · ${ctx.gl.unmaskedRenderer || ctx.gl.renderer}` : 'WebGL unavailable',
      'Canvas hash': ctx.canvas.hash || 'n/a',
      'Secure context': ctx.secure ? 'yes' : 'no (http LAN)',
    };
    if (ctx.uaHigh) {
      fp['Client Hints'] = ctx.uaHigh.low.brands.map((b) => `${b.brand} ${b.version}`).join(', ');
      const hi = ctx.uaHigh.high;
      if (hi) {
        let pv = hi.platformVersion || '';
        if (ctx.uaHigh.low.platform === 'Windows' && pv) pv += parseInt(pv, 10) >= 13 ? ' (Windows 11)' : parseInt(pv, 10) > 0 ? ' (Windows 10)' : ' (Windows 7/8)';
        fp['Platform (CH)'] = `${ctx.uaHigh.low.platform} ${pv} ${hi.architecture || ''} ${hi.bitness ? hi.bitness + '-bit' : ''} ${hi.model || ''}`.replace(/\s+/g, ' ').trim();
      }
    }
    if (ctx.server) fp['IP (server-seen)'] = ctx.server.ip;
    return fp;
  }

  // ===========================================================================
  // Extended static checks (deepen every existing category)
  // ===========================================================================
  const STANDARD_PLUGINS = ['PDF Viewer', 'Chrome PDF Viewer', 'Chromium PDF Viewer', 'Microsoft Edge PDF Viewer', 'WebKit built-in PDF'];
  const PRE_SCRIPT_GLOBALS = new Set(safe(() => _getOwnNames(global), []));
  const ALLOWED_GLOBALS = new Set(['BotLens', '__SERVER__', 'BotLensDeep', '__SHARED_BL_SCAN_PROMISE__']);
  function markPageScriptsLoaded() {
    for (const k of safe(() => _getOwnNames(global), [])) {
      if (!PRE_SCRIPT_GLOBALS.has(k)) ALLOWED_GLOBALS.add(k);
    }
  }

  async function checkExtended(ctx, add) {
    const c = ctx.claimed;
    const eng = ctx.engine.engine;
    const mm = (q) => safe(() => global.matchMedia(q).matches, null);

    // ----------------------------------------------------------- TAMPER: media-query lie detection
    const dpr = global.devicePixelRatio;
    if (dpr) {
      const ok = mm(`(min-resolution: ${(dpr - 0.011).toFixed(3)}dppx) and (max-resolution: ${(dpr + 0.011).toFixed(3)}dppx)`);
      if (ok === false) add(CAT.TAMPER, 'mq-dpr', 'devicePixelRatio vs. CSS resolution', 'fail', `JS reports devicePixelRatio=${dpr} but the CSS engine disagrees. The JS value is spoofed.`, { weight: 30 });
      else if (ok) add(CAT.TAMPER, 'mq-dpr', 'devicePixelRatio vs. CSS resolution', 'pass', `CSS resolution media query confirms ${dpr}dppx.`);
    }
    if (screen.width) {
      const ok = mm(`(min-device-width: ${screen.width - 1}px) and (max-device-width: ${screen.width + 1}px)`);
      if (ok === false) add(CAT.TAMPER, 'mq-screen', 'screen.width vs. CSS device-width', 'fail', `screen.width=${screen.width} but CSS device-width disagrees. The screen size is spoofed in JavaScript.`, { weight: 30 });
      else if (ok) add(CAT.TAMPER, 'mq-screen', 'screen.width vs. CSS device-width', 'pass', `CSS device-width confirms ${screen.width}px.`);
    }
    if (ctx.desktop && global.innerWidth) {
      const ok = mm(`(min-width: ${global.innerWidth - 1}px) and (max-width: ${global.innerWidth + 1}px)`);
      if (ok === false) add(CAT.TAMPER, 'mq-viewport', 'innerWidth vs. CSS viewport width', 'fail', `innerWidth=${global.innerWidth} but the CSS viewport width disagrees. Window metrics are spoofed.`, { weight: 25 });
    }
    const tp = navigator.maxTouchPoints || 0;
    if (tp > 0 && !('ontouchstart' in global) && mm('(any-pointer: coarse)') === false && eng !== 'SpiderMonkey') {
      add(CAT.TAMPER, 'touch-lie', 'maxTouchPoints vs. touch capability', 'warn', `maxTouchPoints=${tp} but there are no touch events and no coarse pointer. The touch support value is spoofed.`, { weight: 20 });
    }

    // ----------------------------------------------------------- TAMPER: WebIDL invariants
    const dm = navigator.deviceMemory;
    if (dm !== undefined && ![0.25, 0.5, 1, 2, 4, 8, 16, 32].includes(dm)) add(CAT.TAMPER, 'devmem-value', 'deviceMemory value', 'fail', `deviceMemory=${dm}, but browsers only report rounded powers of two (0.25…8). Spoofed value.`, { weight: 30 });
    const hc = navigator.hardwareConcurrency;
    if (hc !== undefined && (!Number.isInteger(hc) || hc < 1 || hc > 512)) add(CAT.TAMPER, 'hc-value', 'hardwareConcurrency value', 'fail', `hardwareConcurrency=${hc} is not a valid core count.`, { weight: 30 });
    const langFrozen = safe(() => Object.isFrozen(navigator.languages), null);
    if (langFrozen === false) add(CAT.TAMPER, 'lang-frozen', 'navigator.languages FrozenArray', 'fail', 'navigator.languages is a plain mutable array. Real browsers return a frozen array, so this getter was replaced.', { weight: 25 });
    else if (langFrozen) add(CAT.TAMPER, 'lang-frozen', 'navigator.languages FrozenArray', 'pass', 'languages is a genuine FrozenArray.');
    const sameObj = safe(() => navigator.plugins === navigator.plugins && navigator.mimeTypes === navigator.mimeTypes, null);
    if (sameObj === false) add(CAT.TAMPER, 'plugins-sameobject', 'navigator.plugins [SameObject]', 'fail', 'navigator.plugins returns a new object on every read. The getter is a spoof that builds fake plugin lists.', { weight: 25 });
    const pl = safe(() => Array.from(navigator.plugins).map((p) => p.name), []);
    if (pl.length) {
      const odd = pl.filter((n) => !STANDARD_PLUGINS.includes(n));
      if (odd.length) add(CAT.TAMPER, 'plugins-names', 'Plugin list contents', ctx.engine.engine === 'SpiderMonkey' ? 'warn' : 'fail', `Since 2021 browsers expose exactly the 5 standard PDF plugins, but found: ${odd.join(', ')}. Legacy/fake plugin list (puppeteer-extra-stealth style).`, { weight: 30 });
      else add(CAT.TAMPER, 'plugins-names', 'Plugin list contents', 'pass', `Standard PDF plugin set (${pl.length}).`);
    }
    if (ctx.gl.supported && (eng === 'V8' || eng === 'JavaScriptCore') && ctx.gl.renderer && ctx.gl.renderer !== 'WebKit WebGL') {
      add(CAT.TAMPER, 'gl-masked', 'WebGL masked RENDERER', 'fail', `Chromium/WebKit always report RENDERER="WebKit WebGL" (the real GPU is only in the debug extension), but got "${ctx.gl.renderer}". getParameter() is spoofed.`, { weight: 30 });
    }
    for (const [path, kind] of [['Date.now', 'fn'], ['Date.prototype.getTime', 'fn'], ['Intl.DateTimeFormat', 'fn-ctor']]) {
      const fn = kind === 'fn-ctor' ? safe(() => global.Intl.DateTimeFormat) : resolveTarget(path, 'fn');
      if (!fn) continue;
      const s = fnStr(fn);
      if (s && !isNativeStr(s.replace(/^class\s/, 'function '))) add(CAT.TAMPER, 'fn2-' + path, path + '()', 'fail', 'Clock/locale API replaced with JavaScript (time-travel / timezone spoofing, e.g. Playwright clock or an antidetect tz patch).', { weight: 30 });
    }

    // ----------------------------------------------------------- CONSIST: CSS engine & navigator legacy fields
    const cssEngine = safe(() => (CSS.supports('-moz-orient', 'inline') ? 'SpiderMonkey' : CSS.supports('-apple-pay-button-style', 'black') ? 'JavaScriptCore' : CSS.supports('-webkit-app-region', 'drag') ? 'V8' : 'unknown'), 'unknown');
    if (cssEngine !== 'unknown' && c.expectedEngine !== 'unknown') {
      const nameOf = { V8: 'Blink', SpiderMonkey: 'Gecko', JavaScriptCore: 'WebKit' };
      if (cssEngine !== c.expectedEngine) add(CAT.CONSIST, 'css-engine', 'CSS rendering engine vs. User-Agent', 'fail', `The CSS parser is ${nameOf[cssEngine]}, but ${c.browser} uses ${nameOf[c.expectedEngine]}. Detected without JavaScript engine quirks, so it can't be patched by a JS spoof.`, { weight: 40 });
      else add(CAT.CONSIST, 'css-engine', 'CSS rendering engine vs. User-Agent', 'pass', `CSS parser is ${nameOf[cssEngine]}, as expected.`);
    }
    const ps = navigator.productSub;
    if (ps && c.expectedEngine !== 'unknown') {
      const want = c.expectedEngine === 'SpiderMonkey' ? '20100101' : '20030107';
      if (ps !== want) add(CAT.CONSIST, 'productsub', 'navigator.productSub', 'fail', `Expected "${want}" for ${c.browser}, got "${ps}".`, { weight: 25 });
    }
    if (c.expectedEngine === 'SpiderMonkey' && navigator.oscpu) {
      const o = navigator.oscpu;
      const osOf = /Windows/.test(o) ? 'Windows' : /Mac/.test(o) ? 'macOS' : /Linux|X11/.test(o) ? (c.os === 'Android' ? 'Android' : 'Linux') : null;
      if (osOf && osOf !== c.os && !(osOf === 'Linux' && c.os === 'Android')) add(CAT.CONSIST, 'oscpu', 'navigator.oscpu vs. User-Agent', 'fail', `UA says ${c.os} but Firefox's oscpu says "${o}".`, { weight: 35 });
      else add(CAT.CONSIST, 'oscpu', 'navigator.oscpu vs. User-Agent', 'pass', `"${o}"`);
    } else if (c.expectedEngine !== 'SpiderMonkey' && (navigator.oscpu !== undefined || navigator.buildID !== undefined)) {
      add(CAT.CONSIST, 'oscpu', 'Firefox-only navigator fields', 'fail', `navigator.oscpu/buildID exist (Firefox-only) but UA claims ${c.browser}.`, { weight: 40 });
    }
    if (ctx.uaHigh && /^Chrome$/.test(c.browser)) {
      const brands = ctx.uaHigh.low.brands.map((b) => b.brand);
      if (!brands.includes('Google Chrome') && !ctx.brave && !brands.some((b) => /Brave|Opera|Edge|Vivaldi|Yandex|Samsung|Arc|DuckDuckGo/i.test(b))) {
        add(CAT.CONSIST, 'brand', 'Chrome branding', 'warn', `User-Agent claims Google Chrome but Client Hints brands are [${brands.join(', ')}] with no "Google Chrome". This is an unbranded Chromium build (bundled with Puppeteer/Playwright, Chrome for Testing, or a custom/antidetect build).`, { weight: 15 });
      } else if (brands.includes('Google Chrome')) {
        add(CAT.CONSIST, 'brand', 'Chrome branding', 'pass', 'Client Hints carry the official "Google Chrome" brand.');
      }
    }
    const locale = safe(() => Intl.DateTimeFormat().resolvedOptions().locale, '');
    if (locale && navigator.language && locale.split('-')[0].toLowerCase() !== navigator.language.split('-')[0].toLowerCase()) {
      add(CAT.CONSIST, 'intl-locale', 'Intl locale vs. navigator.language', 'warn', `Intl formats in "${locale}" but navigator.language is "${navigator.language}". Antidetect tools often spoof navigator.language without the Intl locale.`, { weight: 8 });
    } else if (locale) {
      add(CAT.CONSIST, 'intl-locale', 'Intl locale vs. navigator.language', 'pass', `${locale} ≈ ${navigator.language}`);
    }
    if (ctx.desktop && screen.orientation && screen.orientation.type) {
      const land = screen.width >= screen.height;
      if (/portrait/.test(screen.orientation.type) === land && screen.width !== screen.height) add(CAT.CONSIST, 'orientation', 'Screen orientation vs. dimensions', 'warn', `orientation="${screen.orientation.type}" but the screen is ${screen.width}×${screen.height}.`, { weight: 15 });
    }

    // ----------------------------------------------------------- MOBILE: emulation tells
    if (c.mobile) {
      const desktopOnly = [];
      if ('EyeDropper' in global) desktopOnly.push('EyeDropper');
      if (typeof global.showOpenFilePicker === 'function') desktopOnly.push('showOpenFilePicker');
      if (typeof global.showDirectoryPicker === 'function') desktopOnly.push('showDirectoryPicker');
      if (navigator.windowControlsOverlay) desktopOnly.push('windowControlsOverlay');
      if (desktopOnly.length) add(CAT.MOBILE, 'desktop-apis', 'Desktop-only APIs on a mobile device', 'fail', `${desktopOnly.join(', ')} exist only in desktop Chromium. This is a desktop browser in mobile emulation (DevTools device mode / automation device descriptors).`, { weight: 35 });
      else add(CAT.MOBILE, 'desktop-apis', 'Desktop-only APIs on a mobile device', 'pass', 'No desktop-only APIs exposed.');
    }
    if (c.iosDevice === 'iPhone') {
      if (tp !== 5) add(CAT.MOBILE, 'ios-tp5', 'iPhone touch points', 'warn', `Every iPhone reports maxTouchPoints=5, got ${tp} (DevTools emulation defaults to 1).`, { weight: 15 });
      else add(CAT.MOBILE, 'ios-tp5', 'iPhone touch points', 'pass', 'maxTouchPoints=5, as on real iPhones.');
      if (hc !== undefined && hc > 8) add(CAT.MOBILE, 'ios-cores', 'iPhone CPU cores', 'warn', `hardwareConcurrency=${hc}. No iPhone has more than 6 CPU cores (iOS Simulator on a Mac, or spoof).`, { weight: 15 });
      if (parseFloat(c.osVersion) >= 16 && mm('(color-gamut: p3)') === false) add(CAT.MOBILE, 'ios-p3', 'Display color gamut', 'warn', 'All iPhones supported by iOS 16+ have Display-P3 screens, but the P3 media query is false.', { weight: 10 });
      if (ctx.secure && typeof navigator.share !== 'function') add(CAT.MOBILE, 'ios-share', 'Web Share API', 'warn', 'iOS Safari exposes navigator.share on secure pages; it is missing.', { weight: 10 });
    }

    // ----------------------------------------------------------- HEADLESS: environment & storage
    if (ctx.desktop && safe(() => navigator.plugins.length, 0) === 0 && navigator.pdfViewerEnabled === true) {
      add(CAT.HEADLESS, 'pdf-contradiction', 'PDF viewer contradiction', 'warn', 'pdfViewerEnabled is true but navigator.plugins is empty.', { weight: 20 });
    }
    if (navigator.cookieEnabled === false) add(CAT.HEADLESS, 'cookies-off', 'Cookies disabled', 'warn', 'navigator.cookieEnabled is false, which is unusual for real users.', { weight: 10 });
    if (safe(() => navigator.javaEnabled(), false)) add(CAT.HEADLESS, 'java', 'Java enabled', 'warn', 'navigator.javaEnabled() returned true. No modern browser supports Java applets.', { weight: 10 });
    const storageBroken = [];
    try { localStorage.setItem('__bl', '1'); localStorage.removeItem('__bl'); } catch (e) { storageBroken.push('localStorage'); }
    try { sessionStorage.setItem('__bl', '1'); sessionStorage.removeItem('__bl'); } catch (e) { storageBroken.push('sessionStorage'); }
    if (!global.indexedDB) storageBroken.push('indexedDB');
    if (storageBroken.length) add(CAT.HEADLESS, 'storage', 'Web storage availability', 'warn', `Unavailable: ${storageBroken.join(', ')}. Storage disabled (hardened scraper profile or strict privacy mode).`, { weight: 10 });
    else add(CAT.HEADLESS, 'storage', 'Web storage availability', 'pass', 'localStorage, sessionStorage and IndexedDB all work.');
    if (document.visibilityState === 'visible' && safe(() => document.hasFocus(), true) === false) {
      add(CAT.HEADLESS, 'focus', 'Window focus', 'warn', 'Page is visible but the window never had focus during the scan. Background automation (or you clicked elsewhere).', { weight: 5 });
    }
    const navInfo = [];
    if (global.opener) navInfo.push('opened by another window (window.opener)');
    if (global.name) navInfo.push(`window.name="${String(global.name).slice(0, 40)}"`);
    if (history.length <= 1 && !document.referrer) navInfo.push('fresh tab with no history or referrer');
    if (navInfo.length) add(CAT.HEADLESS, 'nav-context', 'Navigation context', 'info', navInfo.join(' · '));

    // ----------------------------------------------------------- AUTO: injected main-world globals
    const iw = ctx.iframe.win;
    if (iw) {
      const base = new Set(safe(() => _getOwnNames(iw), []));
      const extra = safe(() => _getOwnNames(global), []).filter((n) => !base.has(n) && !ALLOWED_GLOBALS.has(n) && !/^\d+$/.test(n));
      if (extra.length) add(CAT.AUTO, 'globals-diff', 'Injected main-world globals', 'info', `Globals not present in a clean frame: ${extra.slice(0, 25).join(', ')}${extra.length > 25 ? '…' : ''} (from extensions, automation init scripts or page code).`);
      else add(CAT.AUTO, 'globals-diff', 'Injected main-world globals', 'pass', 'Global scope matches a clean frame. No injected scripts.');
    }
    const st = String(new Error('x').stack || '');
    if (/pptr:|__puppeteer|playwright|UtilityScript|selenium|webdriver/i.test(st)) add(CAT.AUTO, 'own-stack', 'Scan call stack', 'fail', 'The scan itself was invoked from automation-evaluated code: ' + st.split('\n').slice(1, 3).join(' | '), { weight: 60 });
  }

  // ===========================================================================
  // Public: scan
  // ===========================================================================
  let _savedRuntimeDescs = [];
  let _runtimeTimers = [];
  let _runtimeObservers = [];
  function disarmRuntimeMonitor() {
    while (_savedRuntimeDescs.length) {
      const { proto, name, desc } = _savedRuntimeDescs.pop();
      try { Object.defineProperty(proto, name, desc); } catch (e) { /* */ }
    }
    while (_runtimeTimers.length) clearInterval(_runtimeTimers.pop());
    while (_runtimeObservers.length) {
      try { _runtimeObservers.pop().disconnect(); } catch (e) { /* */ }
    }
  }

  async function scan() {
    disarmRuntimeMonitor();
    const t0 = performance.now();
    const col = createCollector();
    const ctx = await gatherContext();
    const groups = [checkAutomation, checkHeadless, checkTampering, checkConsistency, checkMobile, checkNetwork, checkExtended];
    for (const g of groups) {
      try {
        await g(ctx, col.add);
      } catch (e) {
        col.add(CAT.HEADLESS, 'crash-' + g.name, `Check group "${g.name}" errored`, 'info', String((e && e.message) || e));
      }
    }
    if (ctx.iframe.el) safe(() => ctx.iframe.el.remove());
    return {
      results: col.list,
      fingerprint: buildFingerprint(ctx),
      claimed: ctx.claimed,
      engine: ctx.engine.engine,
      secure: ctx.secure,
      desktop: ctx.desktop,
      ms: Math.round(performance.now() - t0),
    };
  }

  // ===========================================================================
  // Public: runtime monitor (stack-trace traps, late markers, attributes)
  // ===========================================================================
  function startRuntimeMonitor(emit) {
    const C = CAT.RUNTIME;
    const SIGS = [
      [/pptr:|__puppeteer_evaluation_script__|puppeteer/i, 'Puppeteer', 60],
      [/__playwright|playwright|UtilityScript|InjectedScript/i, 'Playwright', 60],
      [/selenium|webdriver|chromedriver|geckodriver|safaridriver|wdio|callFunction|executeAsyncScript|executeScript/i, 'Selenium / WebDriver', 60],
      [/cypress/i, 'Cypress', 60],
      [/testcafe|hammerhead/i, 'TestCafe', 60],
      [/chrome-extension:|moz-extension:|safari-web-extension:|safari-extension:/i, 'Browser extension (main world)', 0],
    ];
    const seen = new Map();
    let busy = false;

    function inspect(api) {
      if (busy) return;
      busy = true;
      try {
        const stack = String(new Error().stack || '');
        const lines = stack.split('\n').map((l) => l.trim()).filter((l) => l && l !== 'Error' && l.indexOf('/detector.js') === -1);
        if (!lines.length) return; // internal call from this file
        if (lines.some((l) => l.indexOf(ORIGIN) !== -1)) return; // the page's own scripts
        let label = 'Injected / evaluated code', weight = 25, status = 'warn';
        for (const [re, name, w] of SIGS) {
          if (re.test(stack)) { label = name; weight = w; status = w ? 'fail' : 'info'; break; }
        }
        const prev = seen.get(label) || { count: 0, apis: new Set() };
        prev.count++;
        prev.apis.add(api);
        seen.set(label, prev);
        const isNew = prev.count === 1;
        if (isNew || prev.count % 10 === 0) {
          emit({
            category: C, id: 'rt-' + label, status, weight: status === 'info' ? 0 : weight,
            name: `${label} called page APIs`,
            detail: `${prev.count} call(s) to ${Array.from(prev.apis).join(', ')} from code that is not part of this page${label === 'Injected / evaluated code' ? ' (automation evaluate(), executeScript(), or the DevTools console)' : ''}.`,
            evidence: lines.slice(0, 4).join('\n'),
          });
        }
      } catch (e) { /* ignore */ } finally {
        busy = false;
      }
    }

    disarmRuntimeMonitor();
    const wrapFn = (proto, name, label) => {
      const d = proto && _getOwnDesc(proto, name);
      if (!d || typeof d.value !== 'function') return;
      _savedRuntimeDescs.push({ proto, name, desc: d });
      const orig = d.value;
      const w = { [name](...args) { inspect(label); return Reflect.apply(orig, this, args); } }[name];
      try { Object.defineProperty(proto, name, Object.assign({}, d, { value: w })); } catch (e) { /* */ }
    };
    const wrapGet = (proto, name, label) => {
      const d = proto && _getOwnDesc(proto, name);
      if (!d || typeof d.get !== 'function') return;
      _savedRuntimeDescs.push({ proto, name, desc: d });
      const og = d.get;
      try { Object.defineProperty(proto, name, Object.assign({}, d, { get() { inspect(label); return og.call(this); } })); } catch (e) { /* */ }
    };

    const D = global.Document && global.Document.prototype;
    const E = global.Element && global.Element.prototype;
    const H = global.HTMLElement && global.HTMLElement.prototype;
    ['querySelector', 'querySelectorAll', 'getElementById', 'getElementsByTagName', 'getElementsByClassName', 'evaluate', 'elementFromPoint']
      .forEach((n) => wrapFn(D, n, 'document.' + n));
    ['querySelector', 'querySelectorAll', 'getAttribute', 'getBoundingClientRect', 'getClientRects', 'scrollIntoView', 'checkVisibility', 'closest', 'matches']
      .forEach((n) => wrapFn(E, n, 'Element.' + n));
    ['click', 'focus', 'blur'].forEach((n) => wrapFn(H, n, 'HTMLElement.' + n));
    wrapGet(E, 'outerHTML', 'Element.outerHTML');
    wrapGet(E, 'innerHTML', 'Element.innerHTML');
    wrapGet(H, 'innerText', 'HTMLElement.innerText');
    wrapGet(D, 'title', 'document.title');
    wrapFn(_getOwnDesc(global, 'getComputedStyle') ? global : global.Window && global.Window.prototype, 'getComputedStyle', 'getComputedStyle');

    // late attributes on <html>
    try {
      const mo = new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.type === 'attributes' && /^(selenium|webdriver|driver)$/i.test(m.attributeName)) {
            emit({ category: C, id: 'rt-attr-' + m.attributeName, status: 'fail', weight: 60, name: 'Driver attribute injected', detail: `Attribute "${m.attributeName}" was added to <html> after load.` });
          }
        }
      });
      mo.observe(document.documentElement, { attributes: true });
      _runtimeObservers.push(mo);
    } catch (e) { /* */ }

    // late globals / webdriver flag (ChromeDriver creates cdc_ vars on first executeScript)
    const known = new Set(scanMarkers().map((h) => h.where + '.' + h.key));
    let wdReported = navigator.webdriver === true;
    const timer = setInterval(() => {
      for (const h of scanMarkers()) {
        const k = h.where + '.' + h.key;
        if (known.has(k)) continue;
        known.add(k);
        emit({ category: C, id: 'rt-marker-' + k, status: 'fail', weight: 60, name: `${h.framework} global appeared`, detail: `${k} was created after page load (driver executed a script).` });
      }
      if (!wdReported && navigator.webdriver === true) {
        wdReported = true;
        emit({ category: C, id: 'rt-webdriver', status: 'fail', weight: 60, name: 'navigator.webdriver became true', detail: 'Automation attached after page load.' });
      }
    }, 2000);
    _runtimeTimers.push(timer);

    emit({ category: C, id: 'rt-status', status: 'pass', weight: 0, name: 'Runtime traps armed', detail: 'Watching DOM query/read APIs for calls from injected code, plus late driver globals and attributes.' });
    return () => disarmRuntimeMonitor();
  }

  // ===========================================================================
  // Public: behaviour monitor
  // ===========================================================================
  function startBehaviorMonitor(onUpdate, opts) {
    opts = opts || {};
    const C = CAT.BEHAV;
    const desktop = !!opts.desktop;
    const B = {
      moves: 0, movesWithDelta: 0, screenEqClient: 0, clicks: 0, clicksNoMove: 0, keys: 0, touches: 0, scrolls: 0,
      untrusted: 0, untrustedTypes: new Set(), moveIntervals: [], keyIntervals: [], path: [], lastMove: 0, lastKey: 0,
      movesSinceClick: 0, lastTouch: 0, touchRadii: [], touchForces: [], pointerTypes: new Set(),
      lastHuman: 0, progScrolls: 0, injectedChars: 0, pastes: 0, dwell: [], downAt: {}, firstInteraction: null, coalesced: 0, predicted: 0, pointerMoves: 0,
      mouseDownAt: 0, clickDwell: [], moveDeltaErr: 0, moveDeltaSamples: 0, prevClientX: null, prevClientY: null,
    };
    const types = ['mousemove', 'mousedown', 'mouseup', 'click', 'keydown', 'keyup', 'touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointermove', 'wheel', 'scroll', 'input', 'paste'];
    const t0 = performance.now();
    let dirty = false;

    let lastScroll = 0;
    function onEvent(e) {
      dirty = true;
      if (!e.isTrusted) { B.untrusted++; B.untrustedTypes.add(e.type); }
      const t = e.timeStamp || performance.now();
      if (e.isTrusted && /^(mousedown|keydown|touchstart|touchmove|touchend|wheel|pointerdown|mousemove|click)$/.test(e.type)) {
        B.lastHuman = t;
        if (B.firstInteraction === null && e.type !== 'mousemove') B.firstInteraction = t - t0;
      }
      switch (e.type) {
        case 'mousemove':
          B.moves++;
          B.movesSinceClick++;
          if (e.movementX || e.movementY) B.movesWithDelta++;
          if (B.prevClientX !== null && (e.movementX || e.movementY) && (!B.lastMove || t - B.lastMove < 120)) {
            const dx = e.clientX - B.prevClientX, dy = e.clientY - B.prevClientY;
            if (Math.hypot(dx, dy) > 2 && Math.hypot(e.movementX - dx, e.movementY - dy) > Math.max(40, Math.hypot(dx, dy) * 3)) B.moveDeltaErr++;
            B.moveDeltaSamples++;
          }
          B.prevClientX = e.clientX; B.prevClientY = e.clientY;
          if (e.screenX === e.clientX && e.screenY === e.clientY) B.screenEqClient++;
          if (B.lastMove) { const dt = t - B.lastMove; if (dt > 0 && dt < 200) { B.moveIntervals.push(dt); if (B.moveIntervals.length > 300) B.moveIntervals.shift(); } }
          B.lastMove = t;
          B.path.push({ x: e.clientX, y: e.clientY, t });
          if (B.path.length > 600) B.path.shift();
          break;
        case 'mousedown':
          B.mouseDownAt = t;
          break;
        case 'mouseup':
          if (B.mouseDownAt > 0 && t >= B.mouseDownAt && t - B.mouseDownAt < 2000) {
            B.clickDwell.push(t - B.mouseDownAt);
            if (B.clickDwell.length > 100) B.clickDwell.shift();
          }
          B.mouseDownAt = 0;
          break;
        case 'click':
          B.clicks++;
          if (e.detail > 0 && B.movesSinceClick === 0 && t - B.lastTouch > 1000) B.clicksNoMove++;
          B.movesSinceClick = 0;
          break;
        case 'keydown':
          B.keys++;
          if (!e.repeat) B.downAt[e.code || e.key] = t;
          if (B.lastKey) { const dt = t - B.lastKey; if (dt < 2000) { B.keyIntervals.push(dt); if (B.keyIntervals.length > 200) B.keyIntervals.shift(); } }
          B.lastKey = t;
          break;
        case 'keyup': {
          const k = e.code || e.key;
          if (B.downAt[k] != null) { B.dwell.push(t - B.downAt[k]); delete B.downAt[k]; if (B.dwell.length > 200) B.dwell.shift(); }
          break;
        }
        case 'input':
          if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') break;
          if (e.inputType === 'insertText' && t - B.lastKey > 150) B.injectedChars += (e.data || '').length || 1;
          break;
        case 'paste':
          B.pastes++;
          break;
        case 'touchstart':
          B.touches++;
          B.lastTouch = t;
          if (e.touches && e.touches[0]) {
            const tt = e.touches[0];
            if (tt.radiusX != null) B.touchRadii.push(tt.radiusX);
            if (tt.force != null) B.touchForces.push(tt.force);
          }
          break;
        case 'touchend':
          B.lastTouch = t;
          break;
        case 'pointerdown':
          if (e.pointerType) B.pointerTypes.add(e.pointerType);
          break;
        case 'pointermove':
          B.pointerMoves++;
          if (typeof e.getCoalescedEvents === 'function') { const n = e.getCoalescedEvents().length; if (n > 1) B.coalesced++; }
          if (typeof e.getPredictedEvents === 'function') { const p = e.getPredictedEvents().length; if (p > 0) B.predicted++; }
          break;
        case 'wheel':
          B.scrolls++;
          break;
        case 'scroll':
          if (t - lastScroll > 500 && t - B.lastHuman > 1500 && t - t0 > 1500) B.progScrolls++;
          lastScroll = t;
          break;
        default:
      }
    }
    for (const ty of types) global.addEventListener(ty, onEvent, { capture: true, passive: true });

    function linearity() {
      // split the path into strokes at pauses > 250ms and measure straightness
      const strokes = [];
      let cur = [];
      for (let i = 0; i < B.path.length; i++) {
        const p = B.path[i];
        if (cur.length && p.t - cur[cur.length - 1].t > 250) { if (cur.length >= 10) strokes.push(cur); cur = []; }
        cur.push(p);
      }
      if (cur.length >= 10) strokes.push(cur);
      if (!strokes.length) return null;
      let straight = 0;
      for (const s of strokes) {
        let len = 0;
        for (let i = 1; i < s.length; i++) len += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
        const direct = Math.hypot(s[s.length - 1].x - s[0].x, s[s.length - 1].y - s[0].y);
        if (len > 50 && direct / len > 0.995) straight++;
      }
      return { strokes: strokes.length, straight, ratio: straight / strokes.length };
    }

    function analyze() {
      const res = [];
      const r = (id, name, status, detail, weight) => res.push({ category: C, id: 'bh-' + id, name, status, detail, weight: weight || 0 });
      const interacted = B.moves + B.clicks + B.keys + B.touches + B.scrolls > 0;

      if (B.untrusted) r('untrusted', 'Synthetic events', 'fail', `${B.untrusted} event(s) with isTrusted=false (${Array.from(B.untrustedTypes).join(', ')}). They were dispatched by script, not by real hardware.`, 50);
      else if (interacted) r('untrusted', 'Synthetic events', 'pass', 'All input events are hardware-trusted (isTrusted=true).');

      if (B.moves >= 30 && B.movesWithDelta === 0) r('movement', 'Mouse movement deltas', 'fail', `${B.moves} mousemove events, all with movementX/Y = 0. These are CDP / WebDriver-injected moves.`, 35);
      else if (B.moves >= 30 && B.moveDeltaSamples >= 20 && B.moveDeltaErr / B.moveDeltaSamples > 0.25) r('movement', 'Mouse movement deltas', 'warn', `movementX/Y disagrees with clientX/Y displacement on ${B.moveDeltaErr}/${B.moveDeltaSamples} moves. Synthetic movement delta spoofing.`, 20);
      else if (B.moves >= 30) r('movement', 'Mouse movement deltas', 'pass', `${Math.round((100 * B.movesWithDelta) / B.moves)}% of moves carry consistent movement deltas.`);

      if (desktop && B.moves >= 20 && B.screenEqClient / B.moves > 0.9) r('screen-client', 'Screen vs. client coordinates', 'warn', 'Mouse screenX/Y always equal clientX/Y: no window offset or toolbar. Typical of injected events in headless windows (or F11 fullscreen).', 15);

      if (B.clicksNoMove >= 2 && desktop) r('teleport', 'Teleporting clicks', 'warn', `${B.clicksNoMove} mouse click(s) landed without any preceding mouse movement.`, 20);

      if (B.clickDwell.length >= 3) {
        const cdMean = mean(B.clickDwell), cdCV = cv(B.clickDwell);
        if (desktop && cdMean < 6) r('click-dwell', 'Click press duration', 'fail', `Mouse button held for ${cdMean.toFixed(1)}ms on average (${B.clickDwell.length} clicks). Physical microswitches take 40–140ms; synthetic mousedown+mouseup pairs fire in the same tick.`, 30);
        else if (B.clickDwell.length >= 5 && cdCV !== null && cdCV < 0.08) r('click-dwell', 'Click press duration', 'warn', `Click press durations are nearly constant (CV ${cdCV.toFixed(2)}, ≈${cdMean.toFixed(0)}ms). Scripted click delay.`, 15);
        else r('click-dwell', 'Click press duration', 'pass', `Natural button press duration (≈${cdMean.toFixed(0)}ms${cdCV != null ? ', CV ' + cdCV.toFixed(2) : ''}).`);
      }

      const lin = linearity();
      const mcv = cv(B.moveIntervals);
      if (lin && lin.strokes >= 3 && lin.ratio > 0.8 && mcv !== null && mcv < 0.25) r('linear', 'Mouse path shape', 'warn', `${lin.straight}/${lin.strokes} strokes are perfectly straight with metronomic timing (CV ${mcv.toFixed(2)}). Scripted cursor.`, 25);
      else if (lin && lin.strokes >= 2) r('linear', 'Mouse path shape', 'pass', `${lin.strokes} strokes, curved/irregular like a human hand (timing CV ${mcv != null ? mcv.toFixed(2) : '-'}).`);

      const kcv = cv(B.keyIntervals);
      if (B.keyIntervals.length >= 10 && kcv !== null && kcv < 0.12) r('typing', 'Typing rhythm', 'warn', `Keystroke intervals are nearly constant (CV ${kcv.toFixed(2)}, mean ${mean(B.keyIntervals).toFixed(0)}ms). Robotic typing.`, 25);
      else if (B.keyIntervals.length >= 10) r('typing', 'Typing rhythm', 'pass', `Natural keystroke variance (CV ${kcv.toFixed(2)}, mean ${mean(B.keyIntervals).toFixed(0)}ms).`);
      if (B.keyIntervals.length >= 5 && mean(B.keyIntervals) < 15) r('typing-speed', 'Typing speed', 'fail', `Average ${mean(B.keyIntervals).toFixed(1)}ms between keystrokes, which is faster than humanly possible.`, 35);

      if (B.touches >= 3 && B.touchRadii.length >= 3) {
        const allSame = B.touchRadii.every((x) => x === B.touchRadii[0]) && B.touchForces.every((x) => x === B.touchForces[0]);
        if (allSame && (B.touchRadii[0] <= 1)) r('touch', 'Touch contact realism', 'warn', `All touches have identical radius (${B.touchRadii[0]}) and force (${B.touchForces[0]}), like synthetic taps.`, 15);
        else r('touch', 'Touch contact realism', 'pass', `Touch radius/force vary naturally (radius ≈ ${mean(B.touchRadii).toFixed(1)}).`);
      }

      const dwellMean = mean(B.dwell);
      const dwellCV = cv(B.dwell);
      if (B.dwell.length >= 8 && dwellMean < 8) r('dwell', 'Key dwell time', 'fail', `Keys are held for ${dwellMean.toFixed(1)}ms on average. Humans hold keys 50-150ms; injected keydown/keyup pairs are instantaneous.`, 35);
      else if (B.dwell.length >= 8 && dwellCV !== null && dwellCV < 0.1) r('dwell', 'Key dwell time', 'warn', `Key hold times are nearly identical (CV ${dwellCV.toFixed(2)}, ≈${dwellMean.toFixed(0)}ms). Scripted typing with a fixed delay.`, 20);
      else if (B.dwell.length >= 8) r('dwell', 'Key dwell time', 'pass', `Natural key hold times (≈${dwellMean.toFixed(0)}ms, CV ${dwellCV.toFixed(2)}).`);

      if (B.injectedChars >= 3) r('inject', 'Text without keystrokes', desktop ? 'warn' : 'info', `${B.injectedChars} character(s) appeared in inputs without matching key events. That comes from Playwright fill(), CDP Input.insertText, autofill or dictation.`, desktop ? 25 : 0);
      if (B.progScrolls >= 3) r('progscroll', 'Programmatic scrolling', 'warn', `${B.progScrolls} scroll burst(s) happened with no wheel, touch, key or mouse input. The page was scrolled by script (window.scrollTo / element.scrollIntoView).`, 20);
      if (B.firstInteraction !== null) {
        if (B.firstInteraction < 120) r('ttfi', 'Time to first interaction', 'warn', `First input arrived ${B.firstInteraction.toFixed(0)}ms after load, faster than a human can perceive and react.`, 15);
        else r('ttfi', 'Time to first interaction', 'pass', `First input ${(B.firstInteraction / 1000).toFixed(1)}s after load.`);
      }
      if (desktop && B.pointerMoves >= 60 && B.coalesced === 0 && B.moves >= 60) r('coalesced', 'Coalesced pointer events', 'info', 'No coalesced pointer samples. Normal for 60Hz mice; high-rate mice and pens produce them, but injected events never do.');
      else if (B.coalesced > 0) r('coalesced', 'Coalesced pointer events', 'pass', `${B.coalesced} pointer events carried coalesced hardware samples (high-frequency physical device).`);

      if (!interacted) r('idle', 'Waiting for interaction', 'info', 'Move the mouse, scroll, tap or type in the Behavior Lab to analyse input patterns.');
      return res;
    }

    function stats() {
      return {
        moves: B.moves, clicks: B.clicks, keys: B.keys, touches: B.touches, scrolls: B.scrolls, untrusted: B.untrusted,
        moveTimingCV: cv(B.moveIntervals), keyTimingCV: cv(B.keyIntervals), pointerTypes: Array.from(B.pointerTypes),
      };
    }

    const tick = () => { if (dirty) { dirty = false; onUpdate(analyze(), stats()); } };
    const timer = setInterval(tick, 700);
    onUpdate(analyze(), stats());
    return {
      stop() { clearInterval(timer); for (const ty of types) global.removeEventListener(ty, onEvent, { capture: true }); },
    };
  }

  global.BotLens = { CAT, CAT_ORDER, CAT_DESC, scan, score, startRuntimeMonitor, disarmRuntimeMonitor, markPageScriptsLoaded, startBehaviorMonitor };
})(window);
