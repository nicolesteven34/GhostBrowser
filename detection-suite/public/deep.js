/*!
 * BotLens Deep, client-side forensic probes.
 * Fonts / system UI font / speech voices / GPU → OS inference, codecs & DRM (bundled-Chromium detection),
 * WebGPU vs WebGL, deep WebGL capabilities, CSS media features, storage quota, platform APIs, permissions,
 * Intl, CPU parallelism benchmark, timer resolution, WebRTC/STUN path discovery, latency sampling,
 * proof-of-work (SHA-256 in a Worker), persistent visitor ID, motion sensors, behavioural biometrics.
 */
(function (global) {
  'use strict';
  const D = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
  const withTimeout = (p, ms, fb) => Promise.race([Promise.resolve(p).catch(() => fb), sleep(ms).then(() => fb)]);
  const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const std = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
  const cv = (a) => { const m = mean(a); return a.length > 1 && m ? std(a) / m : null; };
  function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }
  D.util = { sleep, safe, withTimeout, mean, std, cv, hash };

  // ===========================================================================
  // OS inference: fonts
  // ===========================================================================
  const FONTS = {
    windows: ['Segoe UI', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Segoe MDL2 Assets', 'Segoe Fluent Icons', 'Segoe UI Variable Text', 'Marlett', 'Ebrima',
      'Gadugi', 'Nirmala UI', 'Leelawadee UI', 'Javanese Text', 'Myanmar Text', 'Microsoft Himalaya', 'Microsoft Yi Baiti', 'Mongolian Baiti', 'MV Boli',
      'Bahnschrift', 'Ink Free', 'HoloLens MDL2 Assets', 'Sylfaen', 'Microsoft JhengHei', 'Microsoft YaHei', 'Yu Gothic', 'Malgun Gothic', 'Cascadia Code'],
    apple: ['Helvetica Neue', 'Lucida Grande', 'Geneva', 'Monaco', 'Menlo', 'Avenir', 'Avenir Next', 'Apple SD Gothic Neo', 'Hiragino Sans',
      'Hiragino Kaku Gothic ProN', 'PingFang SC', 'Kohinoor Devanagari', 'Apple Chancery', 'Herculanum', 'Apple Color Emoji', 'Apple Symbols', 'Thonburi',
      'Kailasa', 'Chalkboard SE', 'Noteworthy', 'Marker Felt', 'Snell Roundhand', 'Bodoni 72', 'Damascus', 'Euphemia UCAS', 'Savoye LET'],
    linux: ['DejaVu Sans', 'DejaVu Serif', 'DejaVu Sans Mono', 'Liberation Sans', 'Liberation Serif', 'Liberation Mono', 'Ubuntu', 'Ubuntu Mono', 'Cantarell',
      'Noto Color Emoji', 'Nimbus Sans', 'Nimbus Roman', 'FreeSans', 'FreeSerif', 'Bitstream Vera Sans', 'URW Gothic', 'Droid Sans', 'Carlito', 'Caladea', 'Noto Sans'],
  };
  const MAC_ONLY = ['Lucida Grande', 'Geneva', 'Monaco', 'Apple Chancery', 'Herculanum', 'Savoye LET'];

  D.fonts = function () {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (!ctx) return { supported: false };
    const text = 'mmmmmmmmmmlli1WQ@#\u00e9\u4e2d\u0915\u05d0';
    const bases = ['monospace', 'sans-serif', 'serif'];
    const baseW = {};
    for (const b of bases) { ctx.font = `72px ${b}`; baseW[b] = ctx.measureText(text).width; }
    const has = (f) => bases.some((b) => { ctx.font = `72px "${f}", ${b}`; return ctx.measureText(text).width !== baseW[b]; });
    const present = {};
    const counts = {};
    for (const [os, list] of Object.entries(FONTS)) {
      present[os] = list.filter(has);
      counts[os] = present[os].length;
    }
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    let os = 'unknown';
    if (ranked[0][1] >= 3 && ranked[0][1] >= 2 * Math.max(1, ranked[1][1])) os = ranked[0][0];
    const macOnly = present.apple.filter((f) => MAC_ONLY.includes(f));
    return { supported: true, counts, present, os, macOnly, total: ranked.reduce((s, r) => s + r[1], 0) };
  };

  // ===========================================================================
  // OS inference: system UI font keywords
  // ===========================================================================
  D.systemFonts = function () {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;visibility:hidden;left:-9999px';
    document.body.appendChild(el);
    const out = {};
    for (const kw of ['caption', 'menu', 'message-box', 'status-bar', 'small-caption', 'icon']) {
      el.style.font = kw;
      out[kw] = getComputedStyle(el).fontFamily;
    }
    el.remove();
    const all = Object.values(out).join(' | ');
    let os = 'unknown';
    if (/Segoe UI|Tahoma|Microsoft Sans Serif|MS Shell Dlg|Yu Gothic UI|Malgun Gothic|Microsoft YaHei UI|Meiryo UI/i.test(all)) os = 'windows';
    else if (/-apple-system|BlinkMacSystemFont|AppleSystemUIFont|SF Pro|San Francisco|Lucida Grande|Helvetica Neue/i.test(all)) os = 'apple';
    else if (/Ubuntu|Cantarell|DejaVu|Noto Sans|Liberation|Roboto|Oxygen|Bitstream|Droid/i.test(all)) os = 'linux';
    return { keywords: out, os, detail: out.caption };
  };

  // ===========================================================================
  // OS inference: speech voices
  // ===========================================================================
  D.voices = function () {
    return new Promise((resolve) => {
      const ss = global.speechSynthesis;
      if (!ss) return resolve({ supported: false, count: 0, os: 'unknown' });
      const finish = () => {
        const v = safe(() => ss.getVoices(), []);
        let win = 0, apple = 0, linux = 0;
        for (const x of v) {
          const id = `${x.name} ${x.voiceURI}`;
          if (/Microsoft /i.test(id)) win++;
          else if (/com\.apple\.|^(Samantha|Alex|Daniel|Karen|Moira|Tessa|Fiona|Fred|Victoria|Albert|Thomas|Amélie|Anna|Alice|Kyoko|Ting-Ting|Yuna|Milena|Luca|Paulina|Monica|Rishi|Zosia|Ellen|Xander|Nora|Mariska|Sara|Satu|Ioana|Laura|Lekha|Carmit|Damayanti|Maged|Yelda|Kanya|Zuzana|Joana|Luciana|Mei-Jia|Sin-ji|Tünde|Melina|Daria|Lesya|Linh|Lana|Montse|Amira|Tina)\b/i.test(id)) apple++;
          else if (/espeak|speech-dispatcher|festival|pico|Chrome OS|-x-[a-z]{3}#|-x-[a-z]{3}-(local|network)/i.test(id)) linux++;
        }
        const ranked = [['windows', win], ['apple', apple], ['linux', linux]].sort((a, b) => b[1] - a[1]);
        const os = ranked[0][1] > 0 && ranked[0][1] > ranked[1][1] ? ranked[0][0] : 'unknown';
        resolve({
          supported: true, count: v.length, os, counts: { windows: win, apple, linux },
          sample: v.slice(0, 12).map((x) => `${x.name}${x.localService ? '' : ' (network)'}`),
          detail: v.slice(0, 3).map((x) => x.name).join(', '),
        });
      };
      if (safe(() => ss.getVoices().length, 0)) return finish();
      if (ss.addEventListener) ss.addEventListener('voiceschanged', finish, { once: true });
      setTimeout(finish, 1500);
    });
  };

  // ===========================================================================
  // GPU → OS
  // ===========================================================================
  D.gpuOS = function (renderer) {
    const r = renderer || '';
    if (/SwiftShader|llvmpipe(?!.*Linux)|Software/i.test(r) && !/Mesa/i.test(r)) return 'unknown';
    if (/Direct3D|D3D1[01]|D3D9|Microsoft Basic Render/i.test(r)) return 'windows';
    if (/Metal|Apple (M\d|GPU|A\d+)|OpenGL Engine/i.test(r)) return 'apple';
    if (/Mesa|llvmpipe|Adreno|Mali|PowerVR|Vulkan|OpenGL ES|OpenGL 4|Xclipse|Immortalis/i.test(r)) return 'linux';
    return 'unknown';
  };

  // ===========================================================================
  // Codecs & DRM
  // ===========================================================================
  D.codecs = function () {
    const v = document.createElement('video');
    const a = document.createElement('audio');
    const cp = (el, t) => safe(() => el.canPlayType(t), '') || '';
    const ms = (t) => !!safe(() => global.MediaSource && global.MediaSource.isTypeSupported(t), false);
    const yes = (s) => s === 'probably' || s === 'maybe';
    return {
      h264: yes(cp(v, 'video/mp4; codecs="avc1.42E01E"')) || ms('video/mp4; codecs="avc1.42E01E"'),
      hevc: yes(cp(v, 'video/mp4; codecs="hvc1.1.6.L93.B0"')) || ms('video/mp4; codecs="hvc1.1.6.L93.B0"'),
      av1: yes(cp(v, 'video/mp4; codecs="av01.0.05M.08"')) || ms('video/mp4; codecs="av01.0.05M.08"'),
      vp9: yes(cp(v, 'video/webm; codecs="vp09.00.10.08"')) || yes(cp(v, 'video/webm; codecs="vp9"')),
      vp8: yes(cp(v, 'video/webm; codecs="vp8"')),
      theora: yes(cp(v, 'video/ogg; codecs="theora"')),
      aac: yes(cp(a, 'audio/mp4; codecs="mp4a.40.2"')),
      opus: yes(cp(a, 'audio/ogg; codecs="opus"')) || yes(cp(a, 'audio/webm; codecs="opus"')),
      flac: yes(cp(a, 'audio/flac')),
      mp3: yes(cp(a, 'audio/mpeg')),
      ac3: yes(cp(a, 'audio/mp4; codecs="ac-3"')),
      eac3: yes(cp(a, 'audio/mp4; codecs="ec-3"')),
      hls: yes(cp(v, 'application/vnd.apple.mpegurl')),
      mseH264: ms('video/mp4; codecs="avc1.42E01E"'),
    };
  };

  D.drm = async function (skipWidevine) {
    if (!navigator.requestMediaKeySystemAccess) return { supported: false };
    const mp4 = [{ initDataTypes: ['cenc'], videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }] }];
    const webm = [{ initDataTypes: ['webm'], videoCapabilities: [{ contentType: 'video/webm; codecs="vp9"' }] }];
    const fps = [{ initDataTypes: ['sinf', 'skd', 'cenc'], videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }] }];
    const test = (ks, cfg) => withTimeout(navigator.requestMediaKeySystemAccess(ks, cfg).then(() => true, () => false), 3000, false);
    const [widevine, playready, playready2, fairplay, fairplay1, clearkey] = await Promise.all([
      skipWidevine ? Promise.resolve(null) : test('com.widevine.alpha', mp4.concat(webm)),
      test('com.microsoft.playready.recommendation', mp4),
      test('com.microsoft.playready', mp4),
      test('com.apple.fps', fps),
      test('com.apple.fps.1_0', fps),
      test('org.w3.clearkey', mp4.concat(webm)),
    ]);
    return { supported: true, widevine, playready: playready || playready2, fairplay: fairplay || fairplay1, clearkey };
  };

  // ===========================================================================
  // GPU: WebGPU adapter + deep WebGL
  // ===========================================================================
  D.webgpu = async function () {
    if (!navigator.gpu) return { supported: false };
    const ad = await withTimeout(navigator.gpu.requestAdapter(), 3000, null);
    if (!ad) return { supported: true, adapter: false };
    let info = ad.info || null;
    if (!info && ad.requestAdapterInfo) info = await withTimeout(ad.requestAdapterInfo(), 2000, {});
    info = info || {};
    return {
      supported: true, adapter: true,
      vendor: info.vendor || '', architecture: info.architecture || '', device: info.device || '', description: info.description || '',
      fallback: !!(ad.isFallbackAdapter || info.isFallbackAdapter),
      features: ad.features ? ad.features.size : null,
      maxTexture2D: ad.limits ? ad.limits.maxTextureDimension2D : null,
    };
  };

  D.webgl = function () {
    const out = { supported: false };
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const gl = c.getContext('webgl', { preserveDrawingBuffer: true }) || c.getContext('experimental-webgl');
    if (!gl) return out;
    out.supported = true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    out.vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    out.renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const P = (k) => safe(() => { const v = gl.getParameter(gl[k]); return v && v.length !== undefined && typeof v !== 'string' ? Array.from(v) : v; }, null);
    out.params = {};
    for (const k of ['MAX_TEXTURE_SIZE', 'MAX_RENDERBUFFER_SIZE', 'MAX_VIEWPORT_DIMS', 'MAX_VERTEX_ATTRIBS', 'MAX_VARYING_VECTORS',
      'MAX_VERTEX_UNIFORM_VECTORS', 'MAX_FRAGMENT_UNIFORM_VECTORS', 'MAX_COMBINED_TEXTURE_IMAGE_UNITS', 'MAX_CUBE_MAP_TEXTURE_SIZE',
      'ALIASED_LINE_WIDTH_RANGE', 'ALIASED_POINT_SIZE_RANGE', 'MAX_TEXTURE_IMAGE_UNITS', 'SUBPIXEL_BITS']) out.params[k] = P(k);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    out.params.MAX_ANISOTROPY = aniso ? safe(() => gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT), null) : null;
    const prec = (sh, pt) => safe(() => { const f = gl.getShaderPrecisionFormat(gl[sh], gl[pt]); return f ? [f.rangeMin, f.rangeMax, f.precision] : null; }, null);
    out.params.HIGH_FLOAT = prec('FRAGMENT_SHADER', 'HIGH_FLOAT');
    out.params.MEDIUM_FLOAT = prec('FRAGMENT_SHADER', 'MEDIUM_FLOAT');
    out.params.LOW_FLOAT = prec('FRAGMENT_SHADER', 'LOW_FLOAT');
    out.params.VS_MEDIUM_FLOAT = prec('VERTEX_SHADER', 'MEDIUM_FLOAT');
    out.params.MEDIUM_INT = prec('FRAGMENT_SHADER', 'MEDIUM_INT');
    out.extensions = (gl.getSupportedExtensions() || []).length;
    out.webgl2 = !!safe(() => document.createElement('canvas').getContext('webgl2'), null);
    // deterministic render → hash, rendered twice to detect per-read noise
    const render = () => {
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, 'attribute vec2 p;varying vec2 v;void main(){v=p;gl_Position=vec4(p,0.,1.);}');
      gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, 'precision highp float;varying vec2 v;void main(){gl_FragColor=vec4(sin(v.x*13.7)*.5+.5,cos(v.y*7.3)*.5+.5,fract(v.x*v.y*91.1),1.);}');
      gl.compileShader(fs);
      const pr = gl.createProgram();
      gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); gl.useProgram(pr);
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -0.2, 1, 0.9, 0.8]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const px = new Uint8Array(64 * 64 * 4);
      gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let s = '';
      for (let i = 0; i < px.length; i += 37) s += px[i].toString(36);
      return hash(s);
    };
    out.renderHash = safe(render, null);
    out.renderStable = out.renderHash !== null && safe(render, null) === out.renderHash;
    // IEEE-754 transcendental shader ULP probe (distinguishes ANGLE D3D11, Metal, Mesa, SwiftShader, Adreno, Mali)
    const shaderMath = () => {
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, 'attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.,1.);}');
      gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, [
        'precision highp float;varying vec2 v;',
        'void main(){',
        '  float x=v.x*6.2831853+0.1234567, y=v.y*3.1415926+0.7654321;',
        '  float a=atan(y,x), b=inversesqrt(x*x+y*y+0.00137);',
        '  float c=exp2(fract(a*7.13))-log2(1.0+fract(b*11.7));',
        '  float d=pow(abs(sin(x*17.3)+cos(y*23.1))*0.5+0.01, 1.7320508);',
        '  gl_FragColor=vec4(fract(a*251.0),fract(b*509.0),fract(c*1021.0),fract(d*2039.0));',
        '}',
      ].join('\n'));
      gl.compileShader(fs);
      const pr = gl.createProgram();
      gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); gl.useProgram(pr);
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, 16, 16);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const px = new Uint8Array(16 * 16 * 4);
      gl.readPixels(0, 0, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let s = '';
      for (let i = 0; i < px.length; i++) s += px[i].toString(16).padStart(2, '0');
      return hash(s);
    };
    out.shaderMathHash = safe(shaderMath, null);
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return out;
  };

  // ===========================================================================
  // Subpixel font & glyph rasterizer geometry (DirectWrite / CoreText / FreeType / Skia)
  // ===========================================================================
  D.fontRasterGeometry = function () {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (!ctx) return { supported: false };
    const probes = [
      ['sys', '16.5px system-ui, sans-serif', 'Ill1|fi fl ffl AV Wa To'],
      ['emoji15', '24px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", monospace', '\uD83E\uDE77\uD83E\uDE75\uD83E\uDE76'],
      ['zwj', '24px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", monospace', '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66'],
      ['singleEmoji', '24px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", monospace', '\uD83D\uDC68'],
      ['shaping', '20px sans-serif', '\u0644\u0627 \u0915\u094D\u0937 \u9F98'],
    ];
    const metrics = {};
    let subpixelWidths = 0;
    for (const [id, font, text] of probes) {
      ctx.font = font;
      const m = ctx.measureText(text);
      const w = m.width;
      if (w && w !== Math.floor(w)) subpixelWidths++;
      metrics[id] = {
        w: +(w || 0).toFixed(4),
        asc: m.actualBoundingBoxAscent != null ? +m.actualBoundingBoxAscent.toFixed(4) : null,
        desc: m.actualBoundingBoxDescent != null ? +m.actualBoundingBoxDescent.toFixed(4) : null,
        fAsc: m.fontBoundingBoxAscent != null ? +m.fontBoundingBoxAscent.toFixed(4) : null,
        fDesc: m.fontBoundingBoxDescent != null ? +m.fontBoundingBoxDescent.toFixed(4) : null,
      };
    }
    // ZWJ ligature collapse check: a 4-person family ZWJ emoji should collapse to ~1-1.4x single emoji width when a real color emoji font is active
    const zwjRatio = metrics.singleEmoji.w > 0 ? +(metrics.zwj.w / metrics.singleEmoji.w).toFixed(2) : null;
    const zwjCollapsed = zwjRatio !== null && zwjRatio < 1.8 && metrics.zwj.w > 0;
    return {
      supported: true,
      subpixelWidths,
      zwjRatio,
      zwjCollapsed,
      geometryHash: hash(JSON.stringify(metrics)),
      metrics,
    };
  };

  // ===========================================================================
  // WebAssembly CPU ISA (IEEE-754 NaN hardware sign-bit) & JIT/emulation probe
  // ===========================================================================
  const WASM_PROBE_BYTES = new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 11, 2, 96, 1, 124, 1, 127, 96, 1, 127, 1, 127,
    3, 3, 2, 0, 1, 7, 17, 2, 5, 110, 97, 110, 72, 105, 0, 0, 5, 98, 101, 110, 99, 104, 0, 1,
    10, 41, 2, 10, 0, 32, 0, 159, 189, 66, 32, 136, 167, 11,
    28, 1, 1, 127, 3, 64, 32, 1, 32, 0, 108, 65, 55, 115, 33, 1, 32, 0, 65, 1, 107, 34, 0, 13, 0, 11, 32, 1, 11,
  ]);
  const WASM_SIMD_BYTES = new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 22, 1, 20, 0, 253, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11,
  ]);
  D.wasmProbe = async function () {
    if (typeof WebAssembly !== 'object') return { supported: false };
    try {
      const { instance } = await WebAssembly.instantiate(WASM_PROBE_BYTES);
      const nanHi = instance.exports.nanHi(-1.0) >>> 0;
      const nanHex = nanHi.toString(16).padStart(8, '0');
      // On x86_64 SSE/AVX, sqrtsd(-1.0) produces -qNaN (0xfff80000); on ARM64 (Apple Silicon / iPhone / Android ARM), fsqrt(-1.0) produces +qNaN (0x7ff80000)
      const arch = nanHi === 0xfff80000 ? 'x86_64' : nanHi === 0x7ff80000 ? 'arm64' : 'other';
      const iters = 250000;
      const t0 = performance.now();
      const wasmOut = instance.exports.bench(iters);
      const wasmMs = Math.max(0.05, performance.now() - t0);
      const t1 = performance.now();
      let acc = 0;
      for (let i = iters; i > 0; i--) acc = (Math.imul(acc, i) ^ 55) | 0;
      const jsMs = Math.max(0.05, performance.now() - t1);
      const simd = safe(() => WebAssembly.validate(WASM_SIMD_BYTES), false);
      const threads = typeof SharedArrayBuffer === 'function' && safe(() => { new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true }); return true; }, false);
      return {
        supported: true,
        nanHex,
        arch,
        simd,
        threads,
        wasmMs: +wasmMs.toFixed(3),
        jsMs: +jsMs.toFixed(3),
        ratio: +(jsMs / wasmMs).toFixed(2),
        check: wasmOut === acc,
      };
    } catch (e) {
      return { supported: true, error: e.message || String(e) };
    }
  };

  // ===========================================================================
  // Display / CSS media features
  // ===========================================================================
  D.mediaQueries = function () {
    const m = (q) => safe(() => global.matchMedia(q).matches, null);
    const pick = (name, values) => values.find((v) => m(`(${name}: ${v})`)) || null;
    return {
      colorScheme: pick('prefers-color-scheme', ['dark', 'light']),
      reducedMotion: pick('prefers-reduced-motion', ['reduce', 'no-preference']),
      contrast: pick('prefers-contrast', ['more', 'less', 'custom', 'no-preference']),
      forcedColors: pick('forced-colors', ['active', 'none']),
      invertedColorsSupported: m('(inverted-colors: none)') || m('(inverted-colors: inverted)'),
      colorGamut: pick('color-gamut', ['rec2020', 'p3', 'srgb']),
      dynamicRange: pick('dynamic-range', ['high', 'standard']),
      hover: pick('hover', ['hover', 'none']),
      pointer: pick('pointer', ['fine', 'coarse', 'none']),
      anyPointerCoarse: m('(any-pointer: coarse)'),
      displayMode: pick('display-mode', ['standalone', 'fullscreen', 'minimal-ui', 'browser']),
      monochrome: m('(monochrome)'),
      update: pick('update', ['fast', 'slow', 'none']),
    };
  };

  // ===========================================================================
  // Storage, battery, keyboard, permissions, platform APIs, Intl
  // ===========================================================================
  D.storage = async function () {
    const out = {};
    if (navigator.storage && navigator.storage.estimate) {
      const e = await withTimeout(navigator.storage.estimate(), 2000, null);
      if (e) { out.quotaMB = Math.round(e.quota / 1048576); out.usageMB = Math.round(e.usage / 1048576); }
      out.persisted = await withTimeout(navigator.storage.persisted ? navigator.storage.persisted() : null, 1000, null);
    }
    return out;
  };

  D.battery = async function () {
    if (!navigator.getBattery) return { supported: false };
    const b = await withTimeout(navigator.getBattery(), 1500, null);
    if (!b) return { supported: true, error: 'timeout' };
    return { supported: true, charging: b.charging, level: b.level, chargingTime: b.chargingTime, dischargingTime: b.dischargingTime };
  };

  D.keyboard = async function () {
    if (!navigator.keyboard || !navigator.keyboard.getLayoutMap) return { supported: false };
    const map = await withTimeout(navigator.keyboard.getLayoutMap(), 1500, null);
    if (!map) return { supported: true, error: 'unavailable' };
    const q = map.get('KeyQ'), w = map.get('KeyW'), y = map.get('KeyY');
    let layout = 'QWERTY';
    if (q === 'a' && w === 'z') layout = 'AZERTY';
    else if (y === 'z') layout = 'QWERTZ';
    else if (q && !/[a-z]/.test(q)) layout = `non-Latin (${q}${w}${map.get('KeyE') || ''})`;
    return { supported: true, layout, sample: `${q}${w}${map.get('KeyE')}${map.get('KeyR')}${map.get('KeyT')}${y}` };
  };

  D.permissions = async function () {
    if (!navigator.permissions) return { supported: false };
    const names = ['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read', 'clipboard-write', 'persistent-storage', 'midi',
      'background-sync', 'accelerometer', 'gyroscope', 'magnetometer', 'screen-wake-lock', 'local-fonts', 'window-management', 'storage-access', 'push'];
    const out = {};
    await Promise.all(names.map(async (n) => {
      try {
        const desc = n === 'push' ? { name: n, userVisibleOnly: true } : { name: n };
        const st = await withTimeout(navigator.permissions.query(desc), 1500, null);
        out[n] = st ? st.state : 'timeout';
      } catch (e) { out[n] = 'unsupported'; }
    }));
    return { supported: true, states: out };
  };

  D.platformAPIs = function () {
    const n = navigator;
    return {
      usb: !!n.usb, bluetooth: !!n.bluetooth, serial: !!n.serial, hid: !!n.hid, xr: !!n.xr, midi: typeof n.requestMIDIAccess === 'function',
      share: typeof n.share === 'function', contacts: !!n.contacts, wakeLock: !!n.wakeLock, gamepad: typeof n.getGamepads === 'function',
      virtualKeyboard: !!n.virtualKeyboard, eyeDropper: 'EyeDropper' in global, filePicker: typeof global.showOpenFilePicker === 'function',
      applePay: 'ApplePaySession' in global, paymentRequest: 'PaymentRequest' in global, webTransport: 'WebTransport' in global,
      webCodecs: 'VideoEncoder' in global, compute: !!n.gpu, ink: !!n.ink, scheduling: !!(n.scheduling && n.scheduling.isInputPending),
      relatedApps: typeof n.getInstalledRelatedApps === 'function', webAuthn: 'PublicKeyCredential' in global, credentials: !!n.credentials,
      sharedWorker: 'SharedWorker' in global, launchQueue: 'launchQueue' in global, documentPiP: 'documentPictureInPicture' in global,
    };
  };

  D.intl = function () {
    const ro = safe(() => Intl.DateTimeFormat().resolvedOptions(), {});
    const tz = ro.timeZone;
    return {
      locale: ro.locale, calendar: ro.calendar, numberingSystem: ro.numberingSystem, timeZone: tz,
      hourCycle: safe(() => new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle, null),
      dateString: new Date().toString(),
      tzKnown: safe(() => (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone').includes(tz) || tz === 'UTC' : null), null),
      numberFormat: safe(() => new Intl.NumberFormat().format(1234567.891), ''),
      offset: new Date().getTimezoneOffset(),
    };
  };

  // ===========================================================================
  // CPU benchmark (single + parallel) and timer resolution
  // ===========================================================================
  const BENCH_SRC = 'onmessage=function(e){var end=performance.now()+e.data,n=0,x=0;while(performance.now()<end){for(var i=0;i<20000;i++){x=(x+i*2654435761)%1000003;}n++;}postMessage({n:n,x:x});};';
  D.cpu = async function () {
    if (typeof Worker === 'undefined') return { supported: false };
    const url = URL.createObjectURL(new Blob([BENCH_SRC], { type: 'application/javascript' }));
    const run = (count, ms) => Promise.all(Array.from({ length: count }, () => new Promise((resolve) => {
      let w;
      try { w = new Worker(url); } catch (e) { return resolve(0); }
      const t = setTimeout(() => { w.terminate(); resolve(0); }, ms + 2000);
      w.onmessage = (e) => { clearTimeout(t); w.terminate(); resolve(e.data.n); };
      w.onerror = () => { clearTimeout(t); resolve(0); };
      w.postMessage(ms);
    })));
    const hc = navigator.hardwareConcurrency || 2;
    const single = (await run(1, 250))[0];
    const n = Math.min(hc, 8);
    const multi = (await run(n, 250)).reduce((s, x) => s + x, 0);
    URL.revokeObjectURL(url);
    return { supported: true, single, workers: n, multi, speedup: single ? +(multi / single).toFixed(2) : null, claimed: hc };
  };

  D.timerResolution = function () {
    let min = Infinity, last = performance.now();
    for (let i = 0; i < 20000; i++) {
      const t = performance.now();
      const d = t - last;
      if (d > 0 && d < min) min = d;
      last = t;
    }
    return { minDeltaMs: min === Infinity ? null : +min.toFixed(4), crossOriginIsolated: !!global.crossOriginIsolated };
  };

  // ===========================================================================
  // Network paths: WebRTC/STUN, RTT, DNS probe
  // ===========================================================================
  D.webrtc = async function (ownHost, ownPort) {
    const PC = global.RTCPeerConnection || global.webkitRTCPeerConnection;
    if (!PC) return { supported: false };
    const own = `stun:${ownHost}:${ownPort}`;
    let pc;
    try {
      pc = new PC({ iceServers: [{ urls: own }, { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }] });
    } catch (e) {
      return { supported: true, error: e.message };
    }
    const cands = [];
    pc.onicecandidate = (e) => { if (e.candidate && e.candidate.candidate) cands.push({ c: e.candidate.candidate, url: e.candidate.url || '' }); };
    try {
      pc.createDataChannel('botlens');
      await pc.setLocalDescription(await pc.createOffer());
    } catch (e) {
      try { pc.close(); } catch (x) { /* */ }
      return { supported: true, error: e.message };
    }
    await new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const t = setTimeout(resolve, 5000);
      pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve(); } };
    });
    try { pc.close(); } catch (e) { /* */ }
    const parsed = cands.map(({ c, url }) => {
      const p = c.split(' ');
      const typ = p[p.indexOf('typ') + 1];
      return { ip: p[4], port: +p[5], protocol: p[2], type: typ, url };
    });
    const host = parsed.filter((x) => x.type === 'host');
    const srflx = parsed.filter((x) => x.type === 'srflx').map((x) => {
      const isPrivate = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.|fe80|fc|fd)/i.test(x.ip);
      return Object.assign(x, { source: x.url ? (x.url.indexOf(ownHost) !== -1 ? 'own' : 'public') : isPrivate ? 'own' : 'public' });
    });
    return {
      supported: true, gathered: true, total: parsed.length,
      mdns: host.some((x) => /\.local$/.test(x.ip)),
      hostRaw: [...new Set(host.filter((x) => !/\.local$/.test(x.ip)).map((x) => x.ip))],
      srflx: srflx.map((x) => ({ ip: x.ip, port: x.port, source: x.source, url: x.url })),
      relay: parsed.filter((x) => x.type === 'relay').length,
      candidates: parsed,
    };
  };

  D.rtt = async function (n) {
    const out = [];
    for (let i = 0; i < (n || 6); i++) {
      const t = performance.now();
      try { await fetch('/api/ping?r=' + Math.random(), { cache: 'no-store' }); out.push(+(performance.now() - t).toFixed(2)); } catch (e) { /* */ }
    }
    return out;
  };

  D.dnsProbe = function (token, zone) {
    if (!zone) return false;
    try {
      fetch(`https://${token}.${zone}/botlens.gif?t=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
      new Image().src = `https://${token}.${zone}/botlens-img.gif?t=${Date.now()}`;
    } catch (e) { /* */ }
    return true;
  };

  // ===========================================================================
  // Proof-of-work: SHA-256 puzzle solved in a Worker (pure JS → works without crypto.subtle)
  // ===========================================================================
  const POW_SRC = `
var K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
var W=new Uint32Array(64);
function sha(str){var len=str.length,nb=((len+8)>>6)+1,m=new Uint32Array(nb*16),i,t;
for(i=0;i<len;i++)m[i>>2]|=str.charCodeAt(i)<<(24-(i&3)*8);m[len>>2]|=0x80<<(24-(len&3)*8);m[nb*16-1]=len*8;
var h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
for(var b=0;b<nb;b++){for(t=0;t<16;t++)W[t]=m[b*16+t];
for(t=16;t<64;t++){var x=W[t-15],y=W[t-2];W[t]=(W[t-16]+(((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3))+W[t-7]+(((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10)))|0;}
var a=h0,c1=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
for(t=0;t<64;t++){var t1=(h+(((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)))+((e&f)^(~e&g))+K[t]+W[t])|0;
var t2=((((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)))+((a&c1)^(a&c)^(c1&c)))|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=c1;c1=a;a=(t1+t2)|0;}
h0=(h0+a)|0;h1=(h1+c1)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0;h5=(h5+f)|0;h6=(h6+g)|0;h7=(h7+h)|0;}
return [h0,h1,h2,h3,h4,h5,h6,h7];}
function lz(w){var n=0;for(var i=0;i<8;i++){if(w[i]===0){n+=32;continue;}return n+Math.clz32(w[i]);}return n;}
function hex(w){var s='';for(var i=0;i<8;i++)s+=('00000000'+(w[i]>>>0).toString(16)).slice(-8);return s;}
onmessage=function(e){var p=e.data.salt+':',bits=e.data.bits,t0=performance.now(),n=0,w;
for(;;){w=sha(p+n);if(lz(w)>=bits)break;n++;if((n&16383)===0&&performance.now()-t0>60000){postMessage({error:'timeout'});return;}}
postMessage({nonce:n,ms:Math.round(performance.now()-t0),hash:hex(w)});};`;

  D.pow = function (challenge) {
    return new Promise((resolve) => {
      if (!challenge) return resolve({ error: 'no challenge' });
      let w;
      try {
        w = new Worker(URL.createObjectURL(new Blob([POW_SRC], { type: 'application/javascript' })));
      } catch (e) {
        return resolve({ error: 'Worker blocked: ' + e.message });
      }
      const t = setTimeout(() => { w.terminate(); resolve({ error: 'timeout' }); }, 65000);
      w.onmessage = async (e) => {
        clearTimeout(t);
        w.terminate();
        const r = e.data;
        if (r.error) return resolve(r);
        const sol = Object.assign({}, challenge, { nonce: r.nonce, ms: r.ms });
        // cross-check JS SHA-256 against the native implementation (detects hooked crypto)
        let nativeMatch = null;
        if (global.crypto && crypto.subtle) {
          try {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${challenge.salt}:${r.nonce}`));
            nativeMatch = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('') === r.hash;
          } catch (x) { /* */ }
        }
        resolve({ solution: sol, hash: r.hash, ms: r.ms, nonce: r.nonce, nativeMatch });
      };
      w.onerror = (e) => { clearTimeout(t); resolve({ error: e.message || 'worker error' }); };
      w.postMessage({ salt: challenge.salt, bits: challenge.bits });
    });
  };

  // ===========================================================================
  // Persistent visitor ID (cookie + localStorage + IndexedDB, self-healing)
  // ===========================================================================
  D.visitorId = async function () {
    const sources = {};
    const fromCookie = (document.cookie.match(/(?:^|;\s*)bl_vid=([^;]+)/) || [])[1];
    if (fromCookie) sources.cookie = fromCookie;
    const fromLS = safe(() => localStorage.getItem('bl_vid'), null);
    if (fromLS) sources.localStorage = fromLS;
    const idb = () => new Promise((resolve) => {
      if (!global.indexedDB) return resolve(null);
      let req;
      try { req = indexedDB.open('botlens', 1); } catch (e) { return resolve(null); }
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const g = db.transaction('kv', 'readonly').objectStore('kv').get('vid');
          g.onsuccess = () => resolve({ db, value: g.result || null });
          g.onerror = () => resolve({ db, value: null });
        } catch (e) { resolve({ db, value: null }); }
      };
    });
    const idbRes = await withTimeout(idb(), 1500, null);
    if (idbRes && idbRes.value) sources.indexedDB = idbRes.value;
    const values = Object.values(sources);
    const id = values[0] || ('v_' + Array.from(crypto.getRandomValues(new Uint8Array(9))).map((b) => b.toString(16).padStart(2, '0')).join(''));
    const conflicting = new Set(values).size > 1;
    // heal all stores
    document.cookie = `bl_vid=${id}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    safe(() => localStorage.setItem('bl_vid', id));
    if (idbRes && idbRes.db) safe(() => idbRes.db.transaction('kv', 'readwrite').objectStore('kv').put(id, 'vid'));
    return { id, returning: values.length > 0, sources: Object.keys(sources), missing: ['cookie', 'localStorage', 'indexedDB'].filter((k) => !sources[k]), conflicting };
  };

  // ===========================================================================
  // Motion sensors (accelerometer noise ⇒ physical device in a hand / on a desk)
  // ===========================================================================
  D.motion = function (durationMs) {
    return new Promise((resolve) => {
      if (!('DeviceMotionEvent' in global)) return resolve({ supported: false });
      const samples = [];
      const onMotion = (e) => {
        const a = e.accelerationIncludingGravity;
        if (a && a.x != null) samples.push([a.x, a.y, a.z, e.interval]);
      };
      global.addEventListener('devicemotion', onMotion);
      setTimeout(() => {
        global.removeEventListener('devicemotion', onMotion);
        if (!samples.length) return resolve({ supported: true, events: 0 });
        const mags = samples.map(([x, y, z]) => Math.sqrt(x * x + y * y + z * z));
        const xs = samples.map((s) => s[0]), ys = samples.map((s) => s[1]), zs = samples.map((s) => s[2]);
        resolve({
          supported: true, events: samples.length, gravity: +mean(mags).toFixed(3),
          noise: +Math.max(std(xs), std(ys), std(zs)).toFixed(5), interval: samples[0][3],
          distinct: new Set(samples.map((s) => s.slice(0, 3).join(','))).size,
        });
      }, durationMs || 2500);
    });
  };
  D.requestMotionPermission = async function () {
    const DM = global.DeviceMotionEvent;
    if (DM && typeof DM.requestPermission === 'function') {
      try { return await DM.requestPermission(); } catch (e) { return 'error: ' + e.message; }
    }
    return 'not-required';
  };

  // ===========================================================================
  // Behavioural biometrics
  // ===========================================================================
  D.Biometrics = function (opts) {
    const desktop = !!opts.desktop;
    const S = {
      path: [], strokes: [], wheel: [], wheelModes: new Set(), touches: [], taps: [], keys: [], downs: {}, rollover: 0, shiftless: 0,
      fitts: [], typing: { started: 0, events: [] }, untrusted: 0, scrollsNoInput: 0, lastInput: 0, coalesced: 0, pointerMoves: 0,
      coalescedDt: [], clickDown: null, clicks: [],
    };
    let lastMove = null;
    const on = (t, fn, o) => global.addEventListener(t, fn, Object.assign({ capture: true, passive: true }, o || {}));
    on('pointermove', (e) => {
      if (!e.isTrusted) S.untrusted++;
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      S.pointerMoves++;
      if (e.getCoalescedEvents) {
        const ce = e.getCoalescedEvents();
        if (ce.length > 1) {
          S.coalesced++;
          for (let i = 1; i < ce.length; i++) {
            const dt = ce[i].timeStamp - ce[i - 1].timeStamp;
            if (dt > 0.2 && dt < 25) { S.coalescedDt.push(dt); if (S.coalescedDt.length > 200) S.coalescedDt.shift(); }
          }
        }
      }
      const p = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      if (lastMove && p.t - lastMove.t > 200 && S.path.length) { S.strokes.push(S.path); S.path = []; if (S.strokes.length > 60) S.strokes.shift(); }
      S.path.push(p);
      lastMove = p;
      S.lastInput = e.timeStamp;
    });
    on('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        S.clickDown = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      }
    });
    on('pointerup', (e) => {
      if ((e.pointerType === 'mouse' || e.pointerType === 'pen') && S.clickDown) {
        const dt = e.timeStamp - S.clickDown.t;
        const drift = Math.hypot(e.clientX - S.clickDown.x, e.clientY - S.clickDown.y);
        if (dt >= 0 && dt < 2000) { S.clicks.push({ dt, drift }); if (S.clicks.length > 100) S.clicks.shift(); }
        S.clickDown = null;
      }
    });
    on('wheel', (e) => { S.wheel.push(Math.abs(e.deltaY)); S.wheelModes.add(e.deltaMode); if (S.wheel.length > 300) S.wheel.shift(); S.lastInput = e.timeStamp; });
    on('touchstart', (e) => {
      S.lastInput = e.timeStamp;
      for (const t of e.changedTouches) S.touches.push({ id: t.identifier, t0: e.timeStamp, x: t.clientX, y: t.clientY, r: t.radiusX, f: t.force, path: [[t.clientX, t.clientY]] });
    });
    on('touchmove', (e) => {
      S.lastInput = e.timeStamp;
      for (const t of e.changedTouches) { const s = S.touches.find((x) => x.id === t.identifier && !x.t1); if (s) s.path.push([t.clientX, t.clientY]); }
    });
    on('touchend', (e) => {
      S.lastInput = e.timeStamp;
      for (const t of e.changedTouches) { const s = S.touches.find((x) => x.id === t.identifier && !x.t1); if (s) { s.t1 = e.timeStamp; S.taps.push(s); } }
      if (S.taps.length > 100) S.taps.splice(0, S.taps.length - 100);
    });
    on('keydown', (e) => {
      if (!e.isTrusted) S.untrusted++;
      S.lastInput = e.timeStamp;
      if (e.repeat) return;
      if (Object.keys(S.downs).length) S.rollover++;
      if (e.key && e.key.length === 1 && /[A-Z]/.test(e.key) && !e.shiftKey && !e.getModifierState('CapsLock')) S.shiftless++;
      S.downs[e.code || e.key] = e.timeStamp;
      S.keys.push({ k: e.code || e.key, down: e.timeStamp });
      if (S.keys.length > 400) S.keys.shift();
    });
    on('keyup', (e) => {
      const k = e.code || e.key;
      const d = S.downs[k];
      delete S.downs[k];
      if (d == null) return;
      for (let i = S.keys.length - 1; i >= 0; i--) if (S.keys[i].k === k && S.keys[i].up == null) { S.keys[i].up = e.timeStamp; break; }
    });

    // --- mouse dynamics
    function strokeMetrics(st) {
      if (st.length < 8) return null;
      let len = 0, vs = [], accs = [], angles = [], pauses = 0;
      for (let i = 1; i < st.length; i++) {
        const dx = st[i].x - st[i - 1].x, dy = st[i].y - st[i - 1].y, dt = Math.max(1, st[i].t - st[i - 1].t);
        const d = Math.hypot(dx, dy);
        len += d;
        vs.push(d / dt);
        if (dt > 50) pauses++;
        if (d > 0) angles.push(Math.atan2(dy, dx));
      }
      for (let i = 1; i < vs.length; i++) accs.push(vs[i] - vs[i - 1]);
      const direct = Math.hypot(st[st.length - 1].x - st[0].x, st[st.length - 1].y - st[0].y);
      let turn = 0, signChanges = 0;
      for (let i = 1; i < angles.length; i++) { let da = angles[i] - angles[i - 1]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; turn += Math.abs(da); }
      for (let i = 1; i < accs.length; i++) if (Math.sign(accs[i]) !== Math.sign(accs[i - 1])) signChanges++;
      // angle histogram entropy
      const bins = new Array(16).fill(0);
      angles.forEach((a) => { bins[Math.min(15, Math.floor(((a + Math.PI) / (2 * Math.PI)) * 16))]++; });
      const tot = angles.length || 1;
      const entropy = -bins.reduce((s, b) => (b ? s + (b / tot) * Math.log2(b / tot) : s), 0);
      return {
        length: len, efficiency: len ? direct / len : 1, vMax: Math.max(...vs), vMean: mean(vs), vCV: cv(vs) || 0,
        accSignChanges: signChanges / Math.max(1, accs.length), curvature: turn / Math.max(1, len) * 100, entropy, pauses, points: st.length,
        dtCV: cv(st.slice(1).map((p, i) => p.t - st[i].t)) || 0, profile: vs.slice(0, 60),
      };
    }

    // --- Fitts's law target test
    let fitts = null;
    function startFitts(arena, onDone, rounds) {
      rounds = rounds || 12;
      const sizes = [22, 32, 46, 64];
      const res = [];
      let prev = null, target = null, n = 0, movePath = [];
      const rect = () => arena.getBoundingClientRect();
      const mv = (e) => { movePath.push({ x: e.clientX, y: e.clientY, t: e.timeStamp }); };
      arena.addEventListener('pointermove', mv);
      function place() {
        const r = rect();
        const w = sizes[Math.floor(Math.random() * sizes.length)];
        const x = w / 2 + Math.random() * (r.width - w), y = w / 2 + Math.random() * (r.height - w);
        if (!target) { target = document.createElement('button'); target.className = 'fitts-target'; target.type = 'button'; arena.appendChild(target); }
        target.style.width = target.style.height = w + 'px';
        target.style.left = (x - w / 2) + 'px';
        target.style.top = (y - w / 2) + 'px';
        target.textContent = String(rounds - n);
        target.dataset.w = w; target.dataset.cx = x + r.left; target.dataset.cy = y + r.top;
      }
      function click(e) {
        if (e.target !== target) return;
        const cx = +target.dataset.cx, cy = +target.dataset.cy, w = +target.dataset.w;
        const now = e.timeStamp;
        if (prev) {
          const D2 = Math.hypot(cx - prev.x, cy - prev.y);
          const ID = Math.log2(D2 / w + 1);
          const MT = now - prev.t;
          const offset = Math.hypot(e.clientX - cx, e.clientY - cy) / (w / 2);
          // overshoot: did the path pass beyond the target along the approach axis?
          const ux = (cx - prev.x) / (D2 || 1), uy = (cy - prev.y) / (D2 || 1);
          const proj = movePath.map((p) => (p.x - prev.x) * ux + (p.y - prev.y) * uy);
          const overshoot = proj.some((v) => v > D2 + w / 2);
          const pathLen = movePath.reduce((s, p, i) => (i ? s + Math.hypot(p.x - movePath[i - 1].x, p.y - movePath[i - 1].y) : s), 0);
          res.push({ D: D2, W: w, ID, MT, offset, overshoot, efficiency: pathLen ? D2 / pathLen : 1, trusted: e.isTrusted, pointerType: e.pointerType || '' });
        }
        prev = { x: e.clientX, y: e.clientY, t: now };
        movePath = [];
        n++;
        if (n > rounds) {
          target.remove();
          arena.removeEventListener('pointermove', mv);
          arena.removeEventListener('click', click, true);
          S.fitts = res;
          fitts = null;
          onDone(res);
        } else place();
      }
      arena.addEventListener('click', click, true);
      place();
      fitts = { cancel() { arena.removeEventListener('click', click, true); arena.removeEventListener('pointermove', mv); if (target) target.remove(); } };
      return fitts;
    }

    function regression(pts) {
      const n = pts.length;
      if (n < 3) return null;
      const mx = mean(pts.map((p) => p[0])), my = mean(pts.map((p) => p[1]));
      let sxy = 0, sxx = 0, syy = 0;
      for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
      const b = sxx ? sxy / sxx : 0;
      const a = my - b * mx;
      const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 0;
      return { a, b, r2 };
    }

    function analyze() {
      const F = [];
      const f = (status, id, name, detail, weight) => F.push({ group: 'behavior', status, id, name, detail, weight: weight || 0 });
      const strokes = S.strokes.concat(S.path.length >= 8 ? [S.path] : []).map(strokeMetrics).filter(Boolean).filter((m) => m.length > 40);
      const summary = { strokes: strokes.length };

      if (S.untrusted) f('fail', 'bio-untrusted', 'Synthetic input events', `${S.untrusted} pointer/key events with isTrusted=false.`, 50);

      // mouse dynamics
      if (strokes.length >= 4) {
        const eff = mean(strokes.map((s) => s.efficiency));
        const ent = mean(strokes.map((s) => s.entropy));
        const vcv = mean(strokes.map((s) => s.vCV));
        const dtcv = mean(strokes.map((s) => s.dtCV));
        const acc = mean(strokes.map((s) => s.accSignChanges));
        const curv = mean(strokes.map((s) => s.curvature));
        Object.assign(summary, { efficiency: eff, entropy: ent, velocityCV: vcv, timingCV: dtcv, accelSignChanges: acc, curvature: curv });
        const roboticFlags = [];
        if (eff > 0.985) roboticFlags.push(`paths ${(eff * 100).toFixed(1)}% straight`);
        if (vcv < 0.25) roboticFlags.push(`constant speed (velocity CV ${vcv.toFixed(2)})`);
        if (dtcv < 0.08) roboticFlags.push(`metronomic sampling (Δt CV ${dtcv.toFixed(2)})`);
        if (ent < 1.2) roboticFlags.push(`low direction entropy (${ent.toFixed(2)} bits)`);
        if (roboticFlags.length >= 2) f('fail', 'bio-mouse', 'Mouse dynamics', `Robotic movement: ${roboticFlags.join(', ')}. Typical of linear/Bezier cursor scripts.`, 35);
        else if (roboticFlags.length === 1) f('warn', 'bio-mouse', 'Mouse dynamics', `One robotic trait: ${roboticFlags[0]}.`, 10);
        else f('pass', 'bio-mouse', 'Mouse dynamics', `Human-like: ${(eff * 100).toFixed(0)}% path efficiency, velocity CV ${vcv.toFixed(2)}, direction entropy ${ent.toFixed(2)} bits, ${(acc * 100).toFixed(0)}% acceleration reversals.`);
      } else if (desktop) {
        f('info', 'bio-mouse', 'Mouse dynamics', `Collecting… (${strokes.length}/4 strokes). Move the mouse around the page.`);
      }
      if (desktop && S.pointerMoves > 80) {
        if (S.coalesced > 0) {
          const dtMean = S.coalescedDt.length >= 6 ? mean(S.coalescedDt) : null;
          const hz = dtMean ? Math.round(1000 / dtMean) : null;
          summary.pointerHz = hz;
          f('pass', 'bio-coalesced', 'Coalesced hardware samples', `${S.coalesced} pointer events carried coalesced samples${hz ? ` (~${hz} Hz physical polling rate)` : ''}, so input comes from a physical high-rate device.`);
        }
      }
      if (S.clicks.length >= 3) {
        const cDurs = S.clicks.map((c) => c.dt);
        const cDrifts = S.clicks.map((c) => c.drift);
        const cMean = mean(cDurs), cCV = cv(cDurs) || 0, dMean = mean(cDrifts);
        summary.clicks = { count: S.clicks.length, dwellMean: cMean, dwellCV: cCV, driftMean: dMean };
        if (desktop && cMean < 6) f('fail', 'bio-click-dwell', 'Click press duration', `Mouse button held for ${cMean.toFixed(1)}ms on average (${S.clicks.length} clicks). Physical microswitches take 40–140ms; synthetic pointerdown/pointerup pairs fire in the same tick.`, 30);
        else if (S.clicks.length >= 5 && cCV < 0.08) f('warn', 'bio-click-dwell', 'Click press duration', `Click hold durations are nearly identical (CV ${cCV.toFixed(2)}, ≈${cMean.toFixed(0)}ms).`, 15);
        else f('pass', 'bio-click-dwell', 'Click press duration', `Natural button hold duration (${cMean.toFixed(0)}ms avg, CV ${cCV.toFixed(2)}, micro-drift ${dMean.toFixed(1)}px).`);
      }

      // Fitts
      if (S.fitts.length >= 6) {
        const pts = S.fitts.map((r) => [r.ID, r.MT]);
        const reg = regression(pts);
        const mt = mean(S.fitts.map((r) => r.MT));
        const off = mean(S.fitts.map((r) => r.offset));
        const offStd = std(S.fitts.map((r) => r.offset));
        const overs = S.fitts.filter((r) => r.overshoot).length / S.fitts.length;
        const effs = mean(S.fitts.map((r) => r.efficiency));
        Object.assign(summary, { fitts: { a: reg.a, b: reg.b, r2: reg.r2, meanMT: mt, meanOffset: off, overshootRate: overs, efficiency: effs, points: S.fitts } });
        const issues = [];
        if (mt < 160) issues.push(`mean movement time ${mt.toFixed(0)}ms is super-human`);
        if (reg.b < 15) issues.push(`movement time ignores target difficulty (slope ${reg.b.toFixed(0)} ms/bit)`);
        if (reg.r2 > 0.985) issues.push(`perfect linear fit (R² ${reg.r2.toFixed(3)})`);
        if (off < 0.06 && offStd < 0.05) issues.push('every click lands dead-centre');
        if (overs === 0 && effs > 0.99) issues.push('no overshoot or correction on any target');
        if (issues.length >= 2) f('fail', 'bio-fitts', "Fitts's law target test", `Not human: ${issues.join('; ')}.`, 40);
        else if (issues.length === 1) f('warn', 'bio-fitts', "Fitts's law target test", `Suspicious: ${issues[0]}.`, 15);
        else f('pass', 'bio-fitts', "Fitts's law target test", `Follows Fitts's law: MT = ${reg.a.toFixed(0)} + ${reg.b.toFixed(0)}·ID ms (R² ${reg.r2.toFixed(2)}), clicks scatter ${(off * 100).toFixed(0)}% of radius, ${(overs * 100).toFixed(0)}% overshoot.`);
      }

      // keystroke dynamics
      const ks = S.keys.filter((k) => k.up != null);
      if (ks.length >= 12) {
        const dwell = ks.map((k) => k.up - k.down);
        const flights = [];
        for (let i = 1; i < ks.length; i++) { const fl = ks[i].down - ks[i - 1].up; if (fl > -500 && fl < 1500) flights.push(fl); }
        const dm = mean(dwell), dcv = cv(dwell) || 0, fm = mean(flights), fcv = Math.abs(cv(flights) || 0);
        const roll = S.rollover / ks.length;
        Object.assign(summary, { typing: { dwellMean: dm, dwellCV: dcv, flightMean: fm, flightCV: fcv, rollover: roll, keys: ks.length } });
        const issues = [];
        if (dm < 10) issues.push(`keys held ${dm.toFixed(1)}ms (instant keydown/keyup pairs)`);
        if (dcv < 0.12) issues.push(`identical hold times (CV ${dcv.toFixed(2)})`);
        if (fcv < 0.15 && flights.length > 8) issues.push(`metronomic inter-key gaps (CV ${fcv.toFixed(2)})`);
        if (S.shiftless > 1) issues.push(`${S.shiftless} capital letters typed without Shift`);
        if (issues.length >= 2) f('fail', 'bio-keys', 'Keystroke dynamics', `Scripted typing: ${issues.join('; ')}.`, 35);
        else if (issues.length) f('warn', 'bio-keys', 'Keystroke dynamics', `Suspicious: ${issues[0]}.`, 15);
        else f('pass', 'bio-keys', 'Keystroke dynamics', `Human rhythm: dwell ${dm.toFixed(0)}ms (CV ${dcv.toFixed(2)}), flight ${fm.toFixed(0)}ms (CV ${fcv.toFixed(2)}), ${(roll * 100).toFixed(0)}% key rollover.`);
      }

      // wheel / scroll
      if (S.wheel.length >= 10) {
        const vals = S.wheel.filter((x) => x > 0);
        const distinct = new Set(vals.map((v) => Math.round(v))).size;
        const notched = vals.every((v) => Math.abs(v - Math.round(v / 100) * 100) < 1 || Math.abs(v - Math.round(v / 120) * 120) < 1 || Math.abs(v - Math.round(v / 3) * 3) < 0.01);
        const device = S.wheelModes.has(1) ? 'line-mode wheel (Firefox)' : notched && distinct <= 3 ? 'notched mouse wheel' : 'precision touchpad / smooth wheel';
        summary.wheel = { device, distinct, samples: vals.length };
        f('pass', 'bio-wheel', 'Scroll input device', `${device}: ${vals.length} samples, ${distinct} distinct delta values.`);
      }

      // touch
      if (S.taps.length >= 4) {
        const durs = S.taps.map((t) => t.t1 - t.t0);
        const radii = S.taps.map((t) => t.r).filter((x) => x != null);
        const forces = S.taps.map((t) => t.f).filter((x) => x != null);
        const dm = mean(durs), dcv = cv(durs) || 0;
        summary.touch = { taps: S.taps.length, durationMean: dm, durationCV: dcv, radiusStd: std(radii), forceStd: std(forces) };
        const issues = [];
        if (dm < 20) issues.push(`taps last ${dm.toFixed(0)}ms (instant)`);
        if (dcv < 0.1) issues.push(`identical tap durations (CV ${dcv.toFixed(2)})`);
        if (radii.length >= 4 && std(radii) === 0 && std(forces) === 0) issues.push('constant contact radius and force');
        if (issues.length >= 2) f('fail', 'bio-touch', 'Touch dynamics', `Synthetic taps: ${issues.join('; ')}.`, 35);
        else if (issues.length) f('warn', 'bio-touch', 'Touch dynamics', issues[0] + '.', 15);
        else f('pass', 'bio-touch', 'Touch dynamics', `Natural taps: ${dm.toFixed(0)}ms avg (CV ${dcv.toFixed(2)}), contact radius varies (σ ${std(radii).toFixed(2)}).`);
      }

      const lastStroke = strokes.length ? strokes[strokes.length - 1] : null;
      return { findings: F, summary, profile: lastStroke ? lastStroke.profile : [] };
    }

    return { analyze, startFitts, state: S };
  };

  // ===========================================================================
  // Stable device fingerprint (UA and IP deliberately excluded)
  // ===========================================================================
  D.fingerprint = function (parts) {
    const stable = JSON.stringify(parts, Object.keys(parts).sort());
    return hash(stable);
  };

  // ===========================================================================
  // Direct TLS edge probe (bypasses the CDN so the server sees the browser's own TLS/HTTP2/TCP stack)
  // ===========================================================================
  D.edgeProbe = async function (edge, pv) {
    if (!edge || !edge.origin) return { configured: false };
    const url = (n) => `${edge.origin}/edge/probe?pv=${encodeURIComponent(pv)}&n=${n}`;
    const out = { configured: true, origin: edge.origin, timings: [] };
    try {
      for (let i = 0; i < 4; i++) {
        const t = performance.now();
        const r = await withTimeout(fetch(url(i), { cache: 'no-store', mode: 'cors', credentials: 'omit' }), 2500, null);
        if (!r) throw new Error('timeout');
        const j = await r.json();
        out.timings.push(+(performance.now() - t).toFixed(2));
        if (i === 0) out.data = j;
      }
      out.ok = true;
      out.coldMs = out.timings[0];
      out.warm = out.timings.slice(1);
    } catch (e) {
      out.ok = false;
      out.error = e.message || String(e);
    }
    return out;
  };

  // ===========================================================================
  // DNS resolver leak via ip-api.com EDNS echo (the resolver that looked up the host is reported back)
  // ===========================================================================
  D.dnsLeak = async function () {
    try {
      const r = await withTimeout(fetch('https://edns.ip-api.com/json?_=' + Date.now(), { cache: 'no-store', credentials: 'omit' }), 2500, null);
      if (!r) return { error: 'timeout' };
      const j = await r.json();
      return { ip: j.dns && j.dns.ip, geo: j.dns && j.dns.geo, edns: j.edns || null };
    } catch (e) {
      return { error: e.message || String(e) };
    }
  };

  // ===========================================================================
  // Client telemetry attestation (keyed digest bound to pv + PoW solution + hardware hashes)
  // ===========================================================================
  D.attest = function (seed, fields) {
    if (!seed || !fields) return null;
    const msg = `${seed}:${fields.pv || ''}:${fields.fingerprint || ''}:${fields.nonce != null ? fields.nonce : ''}:${fields.wasmArch || ''}:${fields.shaderMathHash || ''}:${fields.rasterHash || ''}`;
    const h1 = hash(msg);
    const h2 = hash(`bl_v2:${h1}:${seed}`);
    return h1 + h2;
  };

  global.BotLensDeep = D;
})(window);
