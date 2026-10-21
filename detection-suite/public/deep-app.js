(function () {
  'use strict';
  const S = window.__SERVER__ || {};
  const D = window.BotLensDeep;
  const BL = window.BotLens;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = { fail: '✕', warn: '!', pass: '✓', info: 'i' };
  const RANK = { fail: 0, warn: 1, info: 2, pass: 3 };
  const GROUPS = ['net', 'ip', 'device', 'behavior', 'challenge'];
  const GROUP_LABEL = { net: 'Network', ip: 'IP & DNS', device: 'Device', behavior: 'Behaviour', challenge: 'Challenge' };
  const OSLBL = { windows: 'Windows', apple: 'Apple (macOS/iOS)', linux: 'Linux/Android', bsd: 'BSD', unknown: 'unknown' };
  const FAMLBL = { chromium: 'Chromium', firefox: 'Firefox', webkit: 'Safari/WebKit', library: 'HTTP library', unknown: 'unknown' };

  const state = {
    groups: { net: [], ip: [], device: [], behavior: [], challenge: [] },
    runtime: new Map(),
    overview: null,
    raw: { server: S },
    motion: null,
  };

  const osFamily = (os) => ({ Windows: 'windows', macOS: 'apple', iOS: 'apple', iPadOS: 'apple', Android: 'linux', Linux: 'linux', ChromeOS: 'linux' }[os] || 'unknown');
  const engFamily = (e) => ({ V8: 'chromium', SpiderMonkey: 'firefox', JavaScriptCore: 'webkit' }[e] || 'unknown');

  async function getJSON(url, opts) {
    const r = await fetch(url, Object.assign({ cache: 'no-store', credentials: 'same-origin' }, opts || {}));
    return r.json();
  }

  // ------------------------------------------------------------------ scoring
  function allFindings() {
    const list = [];
    for (const g of GROUPS) list.push(...state.groups[g]);
    list.push(...state.runtime.values());
    return list;
  }
  function score(list) {
    let s = 0, fails = 0, warns = 0, passes = 0;
    for (const r of list) {
      if (r.status === 'fail') { fails++; s += r.weight || 0; }
      else if (r.status === 'warn') { warns++; s += r.weight || 0; }
      else if (r.status === 'pass') passes++;
    }
    s = Math.min(100, Math.round(s));
    return { score: s, verdict: s >= 50 ? 'bot' : s >= 20 ? 'suspicious' : 'human', fails, warns, passes };
  }

  // ------------------------------------------------------------------ rendering helpers
  function rows(list) {
    if (!list.length) return '<div class="empty">Running…</div>';
    return list.slice().sort((a, b) => RANK[a.status] - RANK[b.status] || (b.weight || 0) - (a.weight || 0)).map((r) => `
      <li class="check ${r.status}">
        <span class="ico">${ICON[r.status]}</span>
        <div><div class="name">${esc(r.name)}</div><div class="detail">${esc(r.detail)}</div>${r.evidence ? `<div class="evidence">${esc(r.evidence)}</div>` : ''}</div>
        <span class="pts">${r.weight && (r.status === 'fail' || r.status === 'warn') ? '+' + r.weight : ''}</span>
      </li>`).join('');
  }
  function dl(id, obj) {
    $(id).innerHTML = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</dd>`).join('') || '<dt>-</dt><dd>no data</dd>';
  }
  function badges(list) {
    const c = { fail: 0, warn: 0, pass: 0 };
    list.forEach((r) => { if (c[r.status] != null) c[r.status]++; });
    return ['fail', 'warn', 'pass'].filter((k) => c[k]).map((k) => `<span class="badge ${k}">${c[k]} ${k}</span>`).join('');
  }

  let raf = 0;
  function render() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const runtimeList = Array.from(state.runtime.values());
      const groupsView = Object.assign({}, state.groups, { challenge: state.groups.challenge.concat(runtimeList) });
      for (const g of GROUPS) {
        $('f-' + g).innerHTML = rows(groupsView[g]);
        const b = document.querySelector(`[data-badges="${g}"]`);
        if (b) b.innerHTML = badges(groupsView[g]);
        const cnt = document.querySelector(`[data-count="${g}"]`);
        const bad = groupsView[g].filter((r) => r.status === 'fail').length;
        if (cnt) { cnt.textContent = bad ? bad : ''; cnt.className = bad ? 'bad' : ''; }
      }
      const deep = score(allFindings());
      const ov = state.overview ? BL.score(state.overview.results) : null;
      const combinedList = allFindings().concat(state.overview ? state.overview.results : []);
      const comb = score(combinedList);
      const g = $('gauge');
      g.dataset.verdict = comb.verdict;
      $('gauge-bar').style.strokeDashoffset = String(326.73 * (1 - Math.max(0.02, comb.score / 100)));
      $('score').textContent = comb.score;
      const t = $('verdict-title');
      t.className = 'verdict-title ' + comb.verdict;
      t.textContent = { human: 'Likely human', suspicious: 'Suspicious', bot: 'Automated / bot detected' }[comb.verdict];
      const top = combinedList.filter((r) => r.status === 'fail').sort((a, b) => (b.weight || 0) - (a.weight || 0));
      $('verdict-sub').textContent = top.length ? 'Top signals: ' + top.slice(0, 3).map((r) => r.name).join(' · ') : 'No hard failures across network, IP, device, behaviour and challenge layers.';
      $('n-fail').textContent = comb.fails;
      $('n-warn').textContent = comb.warns;
      $('n-pass').textContent = comb.passes;
      $('section-scores').innerHTML = [['Overview', ov ? ov.score : null]].concat(GROUPS.map((k) => [GROUP_LABEL[k], score(groupsView[k]).score])).map(([k, v]) =>
        `<div class="sec"><span>${esc(k)}</span><div class="bar"><i style="width:${v == null ? 0 : v}%" class="${v >= 50 ? 'bad' : v >= 20 ? 'mid' : 'ok'}"></i></div><b>${v == null ? '…' : v}</b></div>`).join('');
      const topOrWarn = top.slice(0, 10).concat(top.length ? [] : combinedList.filter((r) => r.status === 'warn').slice(0, 6));
      $('top-signals').innerHTML = topOrWarn.length ? rows(topOrWarn) : (comb.passes ? '<div class="empty">Nothing notable.</div>' : '<div class="empty">Running…</div>');
      $('raw').textContent = JSON.stringify(state.raw, null, 2).slice(0, 200000);
    });
  }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 2000);
  }

  // ------------------------------------------------------------------ tabs & buttons
  function wire() {
    document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === b));
      const targetTab = b.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach((p) => {
        const isMatch = targetTab === 'all' || p.dataset.panel === targetTab;
        p.classList.toggle('active', isMatch);
      });
    }));
    if ($('btn-rescan')) $('btn-rescan').addEventListener('click', () => { if (typeof window.runFullAudit === 'function') window.runFullAudit(); else location.reload(); });
    if ($('btn-copy')) $('btn-copy').addEventListener('click', async () => {
      const text = JSON.stringify(report(), null, 2);
      try { await navigator.clipboard.writeText(text); } catch (e) {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (x) { /* */ } ta.remove();
      }
      toast('Investigation report copied');
    });
    if ($('btn-download')) $('btn-download').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(report(), null, 2)], { type: 'application/json' }));
      a.download = `botlens-deep-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
    });
    if (!S.secure && !S.clientSecure && $('https-banner')) {
      $('https-banner').hidden = false;
      if ($('https-link')) $('https-link').href = (S.httpsUrl || ('https://' + location.hostname + ':' + location.port)) + '/deep';
    }
  }

  function report() {
    const list = allFindings().concat(state.overview ? state.overview.results : []);
    const s = score(list);
    return { page: 'deep', score: s.score, verdict: s.verdict, issues: list.filter((r) => r.status === 'fail' || r.status === 'warn').sort((a, b) => b.weight - a.weight), groups: state.groups, raw: state.raw, generatedAt: new Date().toISOString() };
  }

  // ------------------------------------------------------------------ device verdicts (client-side)
  function deviceFindings(x) {
    const F = [];
    const f = (status, id, name, detail, weight) => F.push({ group: 'device', status, id, name, detail, weight: weight || 0 });
    const c = x.claimed;
    const uaFam = osFamily(c.os);
    const exp = c.expectedEngine;
    const desktop = x.desktop;

    // fonts
    const fo = x.fonts;
    if (fo && fo.supported) {
      const sample = (os) => fo.present[os].slice(0, 5).join(', ');
      if (fo.os !== 'unknown' && uaFam !== 'unknown' && fo.os !== uaFam) f('fail', 'dev-fonts', 'Installed fonts vs. claimed OS', `UA claims ${c.os}, but the installed fonts are ${OSLBL[fo.os]} (${sample(fo.os)}…; Win ${fo.counts.windows}/Apple ${fo.counts.apple}/Linux ${fo.counts.linux}). Headless Linux servers and antidetect profiles give themselves away like this.`, 35);
      else if (fo.os !== 'unknown' && fo.os === uaFam) f('pass', 'dev-fonts', 'Installed fonts vs. claimed OS', `${fo.counts[fo.os]} ${OSLBL[fo.os]} system fonts present (${sample(fo.os)}…).`);
      else f('info', 'dev-fonts', 'Installed fonts vs. claimed OS', `Inconclusive (Win ${fo.counts.windows}/Apple ${fo.counts.apple}/Linux ${fo.counts.linux}). Font access may be restricted by the browser.`);
      if (c.iosDevice === 'iPhone' && fo.macOnly.length >= 2) f('warn', 'dev-macfonts', 'macOS-only fonts on an iPhone', `Fonts that ship only with macOS are present: ${fo.macOnly.join(', ')}. This looks like a Mac pretending to be an iPhone.`, 20);
    }
    // system font
    const sf = x.sysFont;
    if (sf && sf.os !== 'unknown' && uaFam !== 'unknown') {
      if (sf.os !== uaFam) f('fail', 'dev-sysfont', 'System UI font vs. claimed OS', `The OS dialog font resolves to "${sf.detail}" (${OSLBL[sf.os]}), but the UA claims ${c.os}.`, 30);
      else f('pass', 'dev-sysfont', 'System UI font vs. claimed OS', `"${sf.detail}" is consistent with ${c.os}.`);
    }
    // voices
    const v = x.voices;
    if (v && v.supported) {
      if (v.os !== 'unknown' && uaFam !== 'unknown' && v.os !== uaFam) f('warn', 'dev-voices', 'Speech voices vs. claimed OS', `Installed TTS voices are ${OSLBL[v.os]} (${v.detail}), but the UA claims ${c.os}.`, 20);
      else if (v.os !== 'unknown') f('pass', 'dev-voices', 'Speech voices vs. claimed OS', `${v.count} voices, ${OSLBL[v.os]}-style (${v.detail}).`);
      else if (v.count === 0 && desktop) f('info', 'dev-voices', 'Speech voices vs. claimed OS', 'No TTS voices installed.');
    }
    // codecs
    const cd = x.codecs;
    if (cd) {
      if (exp === 'V8' && !c.iosDevice && /^(Chrome|Edge|Opera|Samsung Internet)$/.test(c.browser) && !cd.h264) f('fail', 'dev-codecs', 'Proprietary codecs', `${c.browser} ships H.264/AAC, but this engine can't play them. This is an open-source Chromium build (Playwright/Puppeteer-bundled, distro or antidetect).`, 35);
      else if (exp === 'JavaScriptCore' && !cd.hls) f('fail', 'dev-codecs', 'Native HLS playback', 'Every Safari / iOS WebKit plays HLS natively, but this engine cannot. It is not WebKit.', 30);
      else if (exp === 'SpiderMonkey' && cd.hls && c.os !== 'Android') f('fail', 'dev-codecs', 'Native HLS playback', 'Desktop Firefox has no native HLS, yet HLS is playable. The engine is not Firefox.', 25);
      else f('pass', 'dev-codecs', 'Codec support', `H.264 ${cd.h264 ? '✓' : '✗'} · HEVC ${cd.hevc ? '✓' : '✗'} · AV1 ${cd.av1 ? '✓' : '✗'} · VP9 ${cd.vp9 ? '✓' : '✗'} · AAC ${cd.aac ? '✓' : '✗'} · HLS ${cd.hls ? '✓' : '✗'}, consistent with ${c.browser}.`);
    }
    // DRM
    const dr = x.drm;
    if (dr && dr.supported) {
      if (c.browser === 'Chrome' && !x.brave && dr.widevine === false) f('warn', 'dev-drm', 'Widevine CDM', 'Google Chrome always ships the Widevine CDM, but it is missing. Chrome for Testing / Chromium (automation builds) lack it.', 25);
      else if (dr.fairplay && exp !== 'JavaScriptCore') f('fail', 'dev-drm', 'FairPlay DRM', `Apple FairPlay is available, but the UA claims ${c.browser}. This is an Apple WebKit engine.`, 35);
      else if (c.browser === 'Edge' && c.os === 'Windows' && dr.playready === false) f('warn', 'dev-drm', 'PlayReady DRM', 'Edge on Windows normally exposes PlayReady.', 15);
      else f('pass', 'dev-drm', 'DRM key systems', `Widevine ${dr.widevine == null ? 'skipped' : dr.widevine ? '✓' : '✗'} · PlayReady ${dr.playready ? '✓' : '✗'} · FairPlay ${dr.fairplay ? '✓' : '✗'} · ClearKey ${dr.clearkey ? '✓' : '✗'}`);
    } else if (dr && !x.secure) {
      f('info', 'dev-drm', 'DRM key systems', 'EME is unavailable on insecure (http) pages. Use HTTPS for this check.');
    }
    // WebGPU vs WebGL
    const gp = x.webgpu, gl = x.webgl;
    const vendorOf = (s) => {
      s = (s || '').toLowerCase();
      if (/nvidia|geforce|quadro|rtx|gtx/.test(s)) return 'nvidia';
      if (/amd|radeon|\bati\b/.test(s)) return 'amd';
      if (/intel/.test(s)) return 'intel';
      if (/apple|\bm[1-9]\b/.test(s)) return 'apple';
      if (/qualcomm|adreno/.test(s)) return 'qualcomm';
      if (/\barm\b|mali|immortalis/.test(s)) return 'arm';
      if (/swiftshader|google/.test(s)) return 'google';
      if (/microsoft|basic render/.test(s)) return 'microsoft';
      return null;
    };
    if (gp && gp.adapter && gl && gl.supported) {
      const a = vendorOf(`${gp.vendor} ${gp.architecture} ${gp.description}`);
      const b = vendorOf(`${gl.renderer} ${gl.vendor}`);
      if (a && b && a !== b && !(b === 'google' || a === 'google')) f('fail', 'dev-webgpu', 'WebGPU adapter vs. WebGL renderer', `WebGPU reports a ${a} GPU but WebGL claims ${b} ("${gl.renderer}"). The WebGL renderer string is spoofed (antidetect tools forget WebGPU).`, 30);
      else if (a) f('pass', 'dev-webgpu', 'WebGPU adapter vs. WebGL renderer', `Both APIs agree on a ${a} GPU (${gp.architecture || gp.vendor}).`);
      if (gp.fallback) f('warn', 'dev-webgpu-fb', 'WebGPU software adapter', 'Only a fallback (software) WebGPU adapter exists, so there is no real GPU (VM / headless / server).', 15);
    }
    if (gl && gl.supported) {
      const desk = /NVIDIA|GeForce|Radeon|AMD|Intel|Apple M/i.test(gl.renderer) && !/SwiftShader|llvmpipe/i.test(gl.renderer);
      if (desk && desktop && gl.params.MAX_TEXTURE_SIZE && gl.params.MAX_TEXTURE_SIZE < 16384) f('warn', 'dev-glcaps', 'GPU string vs. capabilities', `Renderer claims "${gl.renderer}" but MAX_TEXTURE_SIZE is only ${gl.params.MAX_TEXTURE_SIZE} (software-rasteriser limit). The renderer string is spoofed.`, 20);
      if (gl.renderHash && !gl.renderStable) f('warn', 'dev-glnoise', 'WebGL readback stability', 'The same WebGL scene read back twice gave different pixels. WebGL noise injection is active.', 15);
      else if (gl.renderHash) f('pass', 'dev-glnoise', 'WebGL readback stability', `Deterministic render (hash ${gl.renderHash}), shader ULP ${gl.shaderMathHash || 'n/a'}, ${gl.extensions} extensions, WebGL2 ${gl.webgl2 ? '✓' : '✗'}.`);
      const mf = gl.params.MEDIUM_FLOAT;
      const claimsMobileSoCGpu = /Adreno|Mali-|Immotalis|PowerVR|Apple A\d+|Apple GPU/i.test(gl.renderer || '') && (c.os === 'iOS' || c.os === 'iPadOS' || c.os === 'Android');
      if (mf && claimsMobileSoCGpu && mf[2] === 23 && /Adreno [4567]\d\d|Mali-G|Apple A1[0-6]/i.test(gl.renderer || '')) {
        f('warn', 'dev-glprec', 'Shader float precision vs. GPU', `Renderer claims mobile GPU "${gl.renderer}", but FRAGMENT_SHADER MEDIUM_FLOAT precision is 23-bit fp32 ([${mf.join(', ')}]) instead of mobile 10-bit fp16. Typical of a desktop/ANGLE GPU spoofing a mobile renderer string.`, 25);
      } else if (mf) {
        f('pass', 'dev-glprec', 'Shader float precision & ULP', `MEDIUM_FLOAT [${mf.join(', ')}], HIGH_FLOAT [${(gl.params.HIGH_FLOAT || []).join(', ')}], transcendental ULP hash ${gl.shaderMathHash || 'n/a'}.`);
      }
    }
    // WebAssembly hardware ISA (IEEE-754 NaN sign bit)
    const wm = x.wasm;
    if (wm && wm.supported && wm.arch) {
      const claimsArm = c.os === 'iOS' || c.os === 'iPadOS' || /Apple M[1-9]|Apple A\d+|Adreno|Mali|Immotalis|PowerVR/i.test((gl && gl.renderer) || '') || /aarch64|arm64|armv8/i.test(navigator.platform || '');
      const claimsX86WinLinux = (c.os === 'Windows' || c.os === 'Linux') && /NVIDIA|GeForce|Radeon|Intel.*(UHD|Iris|HD Graphics|Arc)/i.test((gl && gl.renderer) || '');
      if (claimsArm && wm.arch === 'x86_64') {
        f('fail', 'dev-wasm-arch', 'WebAssembly CPU ISA vs. claimed device', `Compiled WebAssembly f64.sqrt(-1) produced x86_64 -qNaN (0x${wm.nanHex}), proving the physical CPU is x86_64 despite the ARM / Apple Silicon device claim (${c.os} · ${(gl && gl.renderer) || navigator.platform}).`, 40);
      } else if (claimsX86WinLinux && wm.arch === 'arm64') {
        f('warn', 'dev-wasm-arch', 'WebAssembly CPU ISA vs. claimed device', `Compiled WebAssembly f64.sqrt(-1) produced ARM64 +qNaN (0x${wm.nanHex}), whereas the GPU/OS claims an x86 desktop stack.`, 20);
      } else {
        f('pass', 'dev-wasm-arch', 'WebAssembly CPU ISA & JIT', `Native ${wm.arch} IEEE-754 NaN (0x${wm.nanHex}) · SIMD ${wm.simd ? '✓' : '✗'} · Threads ${wm.threads ? '✓' : '✗'} · Wasm/JS ratio ${wm.ratio}×.`);
      }
    }
    // Subpixel font & emoji glyph shaping
    const rs = x.raster;
    if (rs && rs.supported) {
      if (!rs.zwjCollapsed && (c.os === 'Windows' || c.os === 'macOS' || c.os === 'iOS' || c.os === 'iPadOS' || c.os === 'Android')) {
        f('warn', 'dev-raster', 'Unicode ZWJ emoji & glyph shaping', `4-person ZWJ emoji sequence did not collapse into a single ligature (width ratio ${rs.zwjRatio}× vs single emoji). Typical of headless Linux containers missing color emoji fonts while claiming ${c.os}.`, 20);
      } else {
        f('pass', 'dev-raster', 'Unicode ZWJ emoji & glyph shaping', `ZWJ ligature collapsed (${rs.zwjRatio}× width), ${rs.subpixelWidths}/5 subpixel advances, geometry hash ${rs.geometryHash}.`);
      }
    }
    // media queries
    const mq = x.mq;
    if (mq) {
      if (exp === 'JavaScriptCore' && mq.invertedColorsSupported === false) f('warn', 'dev-mq', 'WebKit-only media features', 'Safari/WebKit support the inverted-colors media feature; this engine does not.', 15);
      else if ((exp === 'V8' || exp === 'SpiderMonkey') && mq.invertedColorsSupported) f('fail', 'dev-mq', 'WebKit-only media features', `inverted-colors (WebKit-only) is supported, but the UA claims ${c.browser}.`, 25);
      if (mq.forcedColors === 'active') f('info', 'dev-forced', 'Forced colors', 'Windows high-contrast / forced-colors mode is active (an accessibility setting, a human trait).');
    }
    // storage
    const st = x.storage;
    if (st && exp === 'V8' && desktop && st.quotaMB != null && st.quotaMB < 2048) f('warn', 'dev-quota', 'Storage quota', `Storage quota is only ${st.quotaMB} MB (normal Chrome gets ~60% of the disk). Incognito profile, tiny container disk or a throwaway automation profile.`, 10);
    else if (st && st.quotaMB != null) f('pass', 'dev-quota', 'Storage quota', `${(st.quotaMB / 1024).toFixed(1)} GB quota, ${st.usageMB} MB used.`);
    // platform APIs
    const ap = x.apis;
    if (ap) {
      if (exp !== 'V8' && (ap.usb || ap.serial || ap.hid)) f('fail', 'dev-apis', 'Chromium-only device APIs', `WebUSB/WebSerial/WebHID are present, but the UA claims ${c.browser}.`, 30);
      else if (exp === 'V8' && desktop && x.secure && !x.brave && /^(Chrome|Edge)$/.test(c.browser) && !ap.usb && !ap.hid && !ap.serial) f('warn', 'dev-apis', 'Chromium device APIs', `Desktop ${c.browser} exposes WebUSB/WebHID/WebSerial on secure pages; all are missing.`, 15);
      else f('pass', 'dev-apis', 'Platform API surface', `USB ${ap.usb ? '✓' : '✗'} · HID ${ap.hid ? '✓' : '✗'} · Serial ${ap.serial ? '✓' : '✗'} · Bluetooth ${ap.bluetooth ? '✓' : '✗'} · Share ${ap.share ? '✓' : '✗'} · ApplePay ${ap.applePay ? '✓' : '✗'}`);
      if (c.os === 'Linux' && exp === 'V8' && x.secure && ap.share) f('warn', 'dev-share', 'Web Share on Linux', 'Chrome on Linux has no Web Share API, so the real OS is not Linux.', 10);
    }
    // CPU
    const cp = x.cpu;
    if (cp && cp.supported && cp.speedup != null) {
      const expected = Math.min(cp.workers, cp.claimed);
      if (cp.claimed >= 4 && cp.speedup < Math.max(1.6, expected * 0.3)) f('warn', 'dev-cpu', 'CPU parallelism vs. hardwareConcurrency', `Claims ${cp.claimed} cores, but ${cp.workers} parallel workers only achieved ${cp.speedup}× throughput. The core count is spoofed, or this is a CPU-starved VM.`, 20);
      else f('pass', 'dev-cpu', 'CPU parallelism vs. hardwareConcurrency', `${cp.workers} workers → ${cp.speedup}× speed-up, plausible for ${cp.claimed} logical cores.`);
    }
    // Intl
    if (x.intl && x.intl.tzKnown === false) f('warn', 'dev-tz', 'Timezone validity', `Timezone "${x.intl.timeZone}" is not a canonical IANA zone (hand-rolled timezone spoof).`, 10);
    // keyboard
    if (x.kb && x.kb.layout && x.kb.layout !== 'QWERTY') {
      const langs = (navigator.languages || []).join(',').toLowerCase();
      const fit = (x.kb.layout === 'AZERTY' && /fr|be/.test(langs)) || (x.kb.layout === 'QWERTZ' && /de|cs|sk|hu|pl|sl|hr/.test(langs)) || /non-Latin/.test(x.kb.layout);
      f('info', 'dev-kb', 'Keyboard layout', `${x.kb.layout} (${x.kb.sample})${fit ? '' : ', unusual for languages ' + langs}.`);
    }
    return F;
  }

  function motionFindings(m, claimed) {
    const F = [];
    const f = (status, id, name, detail, weight) => F.push({ group: 'device', status, id, name, detail, weight: weight || 0 });
    if (!m || !m.supported) { f('info', 'dev-motion', 'Motion sensors', 'DeviceMotion API unavailable.'); return F; }
    if (!m.events) {
      if (claimed.mobile) f('warn', 'dev-motion', 'Motion sensors', 'A phone/tablet produced no accelerometer data. Emulators, simulators and desktop emulation have no sensors (or permission was denied).', 15);
      else f('info', 'dev-motion', 'Motion sensors', 'No motion sensors (normal for desktops/laptops).');
      return F;
    }
    if (m.noise === 0 || m.distinct <= 2) f('fail', 'dev-motion', 'Motion sensors', `${m.events} samples with identical values (noise ${m.noise}). Real accelerometers always jitter, so these are synthetic/emulated readings.`, 35);
    else if (m.gravity < 8.3 || m.gravity > 11.3) f('warn', 'dev-motion', 'Motion sensors', `Gravity magnitude ${m.gravity} m/s² is far from 9.81. Fabricated sensor data.`, 15);
    else f('pass', 'dev-motion', 'Motion sensors', `${m.events} samples, gravity ${m.gravity} m/s², sensor noise σ=${m.noise}. A physical device.`);
    return F;
  }

  // ------------------------------------------------------------------ matrix
  function renderMatrix(x) {
    const c = x.claimed;
    const uaFam = osFamily(c.os);
    const expStack = engFamily(c.expectedEngine);
    const row = (layer, observed, expected, ok, note) => ({ layer, observed, expected, ok, note });
    const R = [];
    R.push(row('User-Agent claim', `${c.browser} ${String(c.version).split('.')[0]} on ${c.os}`, '-', null));
    R.push(row('JavaScript engine', x.engine, c.expectedEngine, x.engine === 'unknown' ? null : x.engine === c.expectedEngine));
    const css = x.overviewResults.find((r) => r.id === 'css-engine');
    if (css) R.push(row('CSS engine', css.status === 'pass' ? 'matches' : 'mismatch', c.expectedEngine, css.status === 'pass'));
    const net = x.net || {};
    const needs = S.edge ? 'edge probe failed' : S.secure ? 'not captured' : 'needs HTTPS';
    if (net.tls) R.push(row('TLS stack (JA4)', `${FAMLBL[net.tls.class.family]} · ${net.tls.ja4}`, FAMLBL[expStack], net.tls.class.family === expStack));
    else R.push(row('TLS stack (JA4)', needs, FAMLBL[expStack], null));
    if (net.h2) R.push(row('HTTP/2 stack', `${FAMLBL[net.h2.class.family]} · ${net.h2.pseudoOrder}`, FAMLBL[expStack], net.h2.class.family === expStack));
    else R.push(row('HTTP/2 stack', net.tls ? `HTTP/${net.httpVersion || '?'}` : needs, FAMLBL[expStack], net.tls ? false : null));
    if (net.syn) R.push(row('TCP/IP SYN', net.syn.guess.label, OSLBL[uaFam], net.syn.guess.os === uaFam));
    else if (net.tcpInfo) R.push(row('TCP options (kernel)', net.tcpInfo.guess.label, OSLBL[uaFam], net.tcpInfo.guess.os === 'unknown' ? null : net.tcpInfo.guess.os === uaFam));
    else R.push(row('TCP/IP SYN', net.tcpSensor ? `sensor ${net.tcpSensor.status}` : '…', OSLBL[uaFam], null));
    if (x.fonts) R.push(row('Installed fonts', OSLBL[x.fonts.os], OSLBL[uaFam], x.fonts.os === 'unknown' ? null : x.fonts.os === uaFam));
    if (x.sysFont) R.push(row('System UI font', `${OSLBL[x.sysFont.os]} · ${x.sysFont.detail}`, OSLBL[uaFam], x.sysFont.os === 'unknown' ? null : x.sysFont.os === uaFam));
    if (x.voices) R.push(row('Speech voices', `${OSLBL[x.voices.os]} · ${x.voices.count}`, OSLBL[uaFam], x.voices.os === 'unknown' ? null : x.voices.os === uaFam));
    if (x.gpuOS) R.push(row('GPU driver', `${OSLBL[x.gpuOS]} · ${(x.webgl && x.webgl.renderer) || ''}`, OSLBL[uaFam], x.gpuOS === 'unknown' ? null : x.gpuOS === uaFam));
    if (x.wasm && x.wasm.supported && x.wasm.arch) {
      const claimsArm = c.os === 'iOS' || c.os === 'iPadOS' || /Apple M[1-9]|Apple A\d+|Adreno|Mali|Immotalis|PowerVR/i.test((x.webgl && x.webgl.renderer) || '') || /aarch64|arm64|armv8/i.test(navigator.platform || '');
      const expIsa = claimsArm ? 'arm64' : 'x86_64 / arm64';
      R.push(row('Wasm CPU ISA (NaN)', `${x.wasm.arch} (0x${x.wasm.nanHex})`, expIsa, claimsArm ? x.wasm.arch === 'arm64' : true));
    }
    if (x.raster && x.raster.supported) {
      R.push(row('Emoji ZWJ & glyph shaping', `ratio ${x.raster.zwjRatio}× · hash ${x.raster.geometryHash}`, 'collapsed (<1.8×)', x.raster.zwjCollapsed));
    }
    const intel = x.intel;
    if (intel && intel.flags) {
      const kind = intel.flags.tor ? 'Tor exit' : intel.flags.hosting ? 'Datacenter' : intel.flags.proxy ? 'VPN / proxy' : intel.flags.mobile ? 'Mobile carrier' : 'Residential ISP';
      R.push(row('IP network', `${kind} · ${(intel.asn && ('AS' + intel.asn.asn + ' ' + intel.asn.name)) || ''}`, 'Residential / mobile', !(intel.flags.tor || intel.flags.hosting || intel.flags.proxy)));
    }
    const corr = x.corr;
    if (corr) {
      const leak = corr.findings.find((r) => r.id === 'rtc-leak');
      if (leak) R.push(row('WebRTC UDP path', leak.status === 'pass' ? 'same exit IP' : leak.status === 'fail' ? 'different exit IP' : 'n/a', 'same as HTTP', leak.status === 'pass' ? true : leak.status === 'fail' ? false : null));
      const tz = corr.findings.find((r) => r.id === 'geo-tz');
      if (tz) R.push(row('IP geo vs. clock', tz.status === 'pass' ? 'consistent' : 'mismatch', 'consistent', tz.status === 'pass'));
    }
    $('matrix').innerHTML = `<thead><tr><th>Layer</th><th>Observed</th><th>Expected for claim</th><th></th></tr></thead><tbody>${R.map((r) =>
      `<tr><td>${esc(r.layer)}</td><td class="mono">${esc(r.observed)}</td><td>${esc(r.expected)}</td><td class="st ${r.ok === true ? 'ok' : r.ok === false ? 'bad' : 'na'}">${r.ok === true ? '✓' : r.ok === false ? '✕' : '·'}</td></tr>`).join('')}</tbody>`;
  }

  // ------------------------------------------------------------------ charts
  function fittsChart(points, reg) {
    const svg = $('fitts-chart');
    if (!points || !points.length) { svg.innerHTML = '<text x="160" y="90" text-anchor="middle" class="chart-empty">MT vs. index of difficulty appears here</text>'; return; }
    const maxID = Math.max(5, ...points.map((p) => p.ID)), maxMT = Math.max(800, ...points.map((p) => p.MT));
    const X = (v) => 30 + (v / maxID) * 280, Y = (v) => 155 - (v / maxMT) * 140;
    let h = `<line x1="30" y1="155" x2="310" y2="155" class="axis"/><line x1="30" y1="15" x2="30" y2="155" class="axis"/>`;
    h += `<text x="310" y="168" text-anchor="end" class="lbl">ID (bits)</text><text x="34" y="14" class="lbl">MT ${maxMT.toFixed(0)}ms</text>`;
    h += points.map((p) => `<circle cx="${X(p.ID).toFixed(1)}" cy="${Y(p.MT).toFixed(1)}" r="3.5" class="pt${p.overshoot ? ' os' : ''}"/>`).join('');
    if (reg) h += `<line x1="${X(0)}" y1="${Y(reg.a)}" x2="${X(maxID)}" y2="${Y(reg.a + reg.b * maxID)}" class="reg"/>`;
    svg.innerHTML = h;
  }
  function velocityChart(profile) {
    const svg = $('velocity-chart');
    if (!profile || profile.length < 3) { svg.innerHTML = '<text x="160" y="50" text-anchor="middle" class="chart-empty">move the mouse</text>'; return; }
    const max = Math.max(...profile, 0.01);
    const pts = profile.map((v, i) => `${(i / (profile.length - 1)) * 316 + 2},${86 - (v / max) * 80}`).join(' ');
    svg.innerHTML = `<polyline points="${pts}" class="vel"/>`;
  }

  // ------------------------------------------------------------------ boot
  async function boot() {
    wire();
    const desktop = !/iPhone|iPad|iPod|Android/.test(navigator.userAgent) && !(navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
    const ownStunHost = S.stunHost || (/^(localhost|127\.|\[?::1)/.test(location.hostname) ? ((S.lan && S.lan[0]) || '127.0.0.1') : location.hostname.replace(/^\[|\]$/g, ''));

    // behaviour biometrics start immediately
    const bio = D.Biometrics({ desktop });
    const updateBio = () => {
      const r = bio.analyze();
      state.groups.behavior = r.findings.length ? r.findings : [{ group: 'behavior', status: 'info', id: 'bio-wait', name: 'Waiting for input', detail: desktop ? 'Move the mouse, run the target test and type the sentence to build your biometric profile.' : 'Tap, swipe and type to build your biometric profile.' }];
      velocityChart(r.profile);
      const s = r.summary;
      dl('bio-detail', {
        'Strokes analysed': s.strokes, 'Path efficiency': s.efficiency != null ? (s.efficiency * 100).toFixed(1) + '%' : null,
        'Velocity CV': s.velocityCV != null ? s.velocityCV.toFixed(2) : null, 'Direction entropy': s.entropy != null ? s.entropy.toFixed(2) + ' bits' : null,
        'Pointer polling': s.pointerHz ? `~${s.pointerHz} Hz (coalesced)` : null,
        'Click hold': s.clicks ? `${s.clicks.dwellMean.toFixed(0)} ms (CV ${s.clicks.dwellCV.toFixed(2)}, drift ${s.clicks.driftMean.toFixed(1)}px)` : null,
        'Key dwell': s.typing ? `${s.typing.dwellMean.toFixed(0)} ms (CV ${s.typing.dwellCV.toFixed(2)})` : null,
        'Key flight': s.typing ? `${s.typing.flightMean.toFixed(0)} ms (CV ${s.typing.flightCV.toFixed(2)})` : null,
        'Key rollover': s.typing ? (s.typing.rollover * 100).toFixed(0) + '%' : null,
        'Scroll device': s.wheel ? s.wheel.device : null,
        'Taps': s.touch ? `${s.touch.taps} · ${s.touch.durationMean.toFixed(0)} ms avg` : null,
      });
      state.raw.biometrics = s;
      render();
    };
    setInterval(updateBio, 1200);
    updateBio();
    $('btn-fitts').addEventListener('click', () => {
      const arena = $('fitts-arena');
      $('btn-fitts').style.display = 'none';
      bio.startFitts(arena, (res) => {
        $('btn-fitts').style.display = '';
        $('btn-fitts').textContent = 'Run again';
        const r = bio.analyze();
        const fz = r.summary.fitts;
        fittsChart(res, fz ? { a: fz.a, b: fz.b } : null);
        updateBio();
      });
    });
    fittsChart(null);

    // live runtime traps → challenge group (armed after all static/in-house scans complete)
    // server-side lookups (parallel)
    const pEdge = D.edgeProbe(S.edge, S.pv);
    const pDns = D.dnsLeak();
    const pNet = pEdge.then(() => getJSON(`/api/deep/network?pv=${S.pv}`)).catch((e) => ({ error: e.message }));
    window.__SHARED_EDGE_NET_PROMISE__ = pNet;
    const pIP = getJSON(`/api/deep/ip?pv=${S.pv}`).catch((e) => ({ error: e.message }));
    const pPow = D.pow(S.pow);
    const pRtc = D.util.withTimeout(D.webrtc(ownStunHost, S.stunPort || 3478), 7000, { supported: true, error: 'timeout' });
    if (S.dnsZone && S.dnsToken) D.dnsProbe(S.dnsToken, S.dnsZone);

    // client probes
    if (!window.__SHARED_BL_SCAN_PROMISE__) {
      window.__SHARED_BL_SCAN_PROMISE__ = BL.scan();
    }
    const overview = await window.__SHARED_BL_SCAN_PROMISE__;
    state.overview = overview;
    state.raw.overview = { engine: overview.engine, claimed: overview.claimed, fingerprint: overview.fingerprint };
    window.__BL_RUNTIME_CALLBACKS__ = window.__BL_RUNTIME_CALLBACKS__ || [];
    window.__BL_RUNTIME_CALLBACKS__.push((r) => { state.runtime.set(r.id, Object.assign({ group: 'challenge' }, r)); render(); });

    const claimed = overview.claimed;
    const T = D.util.withTimeout;
    const [fonts, sysFont, voices, codecs, drm, webgpu, webgl, mq, storage, battery, kb, perms, intl, cpu, vid, rtt, wasm, raster] = await Promise.all([
      Promise.resolve(D.util.safe(D.fonts, null)),
      Promise.resolve(D.util.safe(D.systemFonts, null)),
      T(D.voices(), 2500, null),
      Promise.resolve(D.util.safe(D.codecs, null)),
      T(D.drm(claimed.expectedEngine === 'SpiderMonkey'), 5000, null),
      T(D.webgpu(), 5000, null),
      Promise.resolve(D.util.safe(D.webgl, null)),
      Promise.resolve(D.util.safe(D.mediaQueries, null)),
      T(D.storage(), 3000, null),
      T(D.battery(), 2000, null),
      T(D.keyboard(), 2000, null),
      T(D.permissions(), 3000, null),
      Promise.resolve(D.util.safe(D.intl, null)),
      T(D.cpu(), 6000, null),
      T(D.visitorId(), 3000, null),
      D.rtt(6),
      T(D.wasmProbe(), 2500, null),
      Promise.resolve(D.util.safe(D.fontRasterGeometry, null)),
    ]);
    const apis = D.platformAPIs();
    const timer = D.timerResolution();
    const gpuOS = webgl && webgl.supported ? D.gpuOS(webgl.renderer) : 'unknown';
    const brave = !!(navigator.brave);
    const x = { claimed, engine: overview.engine, desktop: overview.desktop, secure: !!window.isSecureContext, brave, fonts, sysFont, voices, codecs, drm, webgpu, webgl, mq, storage, battery, kb, perms, intl, cpu, apis, timer, gpuOS, wasm, raster, overviewResults: overview.results };
    state.groups.device = deviceFindings(x);
    Object.assign(state.raw, { fonts, sysFont, voices, codecs, drm, webgpu, webgl, mq, storage, battery, kb, perms, intl, cpu, apis, timer, wasm, raster, visitor: vid });

    dl('os-detail', {
      'Claimed OS': `${claimed.os} ${claimed.osVersion}`,
      'Fonts → OS': fonts ? `${OSLBL[fonts.os]} (Win ${fonts.counts.windows} · Apple ${fonts.counts.apple} · Linux ${fonts.counts.linux})` : null,
      'Windows fonts': fonts ? fonts.present.windows.join(', ') : null,
      'Apple fonts': fonts ? fonts.present.apple.join(', ') : null,
      'Linux fonts': fonts ? fonts.present.linux.join(', ') : null,
      'System UI font': sysFont ? `${sysFont.detail} → ${OSLBL[sysFont.os]}` : null,
      'Glyph & emoji shaping': raster && raster.supported ? `ZWJ ratio ${raster.zwjRatio}× (${raster.zwjCollapsed ? 'collapsed ✓' : 'uncollapsed ✗'}) · ${raster.subpixelWidths}/5 subpixel · hash ${raster.geometryHash}` : null,
      'Speech voices': voices ? `${voices.count} → ${OSLBL[voices.os]}: ${(voices.sample || []).slice(0, 6).join(', ')}` : null,
      'GPU → OS': `${OSLBL[gpuOS]}`,
      'Intl': intl ? `${intl.locale} · ${intl.timeZone} · ${intl.calendar} · ${intl.numberFormat}` : null,
      'Date string': intl ? intl.dateString : null,
      'Keyboard': kb && kb.layout ? `${kb.layout} (${kb.sample})` : 'n/a',
    });
    dl('hw-detail', {
      'WebGL renderer': webgl && webgl.renderer, 'WebGL caps': webgl && webgl.params ? `tex ${webgl.params.MAX_TEXTURE_SIZE} · rb ${webgl.params.MAX_RENDERBUFFER_SIZE} · aniso ${webgl.params.MAX_ANISOTROPY || 'n/a'} · ${webgl.extensions} ext · WebGL2 ${webgl.webgl2 ? '✓' : '✗'}` : null,
      'Shader precision & ULP': webgl && webgl.params ? `med float [${(webgl.params.MEDIUM_FLOAT || []).join(',')}] · high float [${(webgl.params.HIGH_FLOAT || []).join(',')}] · ULP hash ${webgl.shaderMathHash || 'n/a'}` : null,
      'WebGPU': webgpu ? (webgpu.adapter ? `${webgpu.vendor} ${webgpu.architecture} ${webgpu.description}${webgpu.fallback ? ' (fallback)' : ''}` : webgpu.supported ? 'no adapter' : 'unsupported') : null,
      'Wasm CPU ISA': wasm && wasm.supported && wasm.arch ? `${wasm.arch} (NaN 0x${wasm.nanHex}) · SIMD ${wasm.simd ? '✓' : '✗'} · Threads ${wasm.threads ? '✓' : '✗'} · Wasm/JS ${wasm.ratio}× (${wasm.wasmMs}ms vs ${wasm.jsMs}ms)` : null,
      'Codecs': codecs ? Object.entries(codecs).filter(([, v]) => v).map(([k]) => k).join(', ') : null,
      'DRM': drm ? (drm.supported ? `Widevine ${drm.widevine} · PlayReady ${drm.playready} · FairPlay ${drm.fairplay}` : 'EME unavailable') : null,
      'CPU': cpu && cpu.supported ? `${cpu.claimed} logical cores claimed · ${cpu.workers} workers → ${cpu.speedup}× · single ${cpu.single} ops` : null,
      'Timer resolution': `${timer.minDeltaMs} ms${timer.crossOriginIsolated ? ' (COI)' : ''}`,
      'Storage': storage && storage.quotaMB != null ? `${storage.quotaMB} MB quota, persisted=${storage.persisted}` : null,
      'Battery': battery && battery.supported && battery.level != null ? `${Math.round(battery.level * 100)}% ${battery.charging ? 'charging' : 'on battery'}` : 'n/a',
      'Display': mq ? `${mq.colorGamut} gamut · ${mq.dynamicRange} range · ${mq.colorScheme} · pointer ${mq.pointer}/${mq.hover}` : null,
      'Permissions': perms && perms.states ? Object.entries(perms.states).map(([k, v]) => `${k}:${v}`).join(' · ') : null,
      'Platform APIs': Object.entries(apis).filter(([, v]) => v).map(([k]) => k).join(', '),
    });
    render();

    // motion sensors: automatic where no permission is needed (Android), on demand elsewhere
    const runMotion = async () => {
      const perm = await D.requestMotionPermission();
      const m = await D.motion(2500);
      m.permission = perm;
      state.motion = m;
      state.raw.motion = m;
      state.groups.device = state.groups.device.filter((r) => r.id !== 'dev-motion').concat(motionFindings(m, claimed));
      render();
      toast('Motion-sensor check complete');
    };
    $('btn-motion').addEventListener('click', runMotion);
    if (claimed.os === 'Android') runMotion();

    // server results
    const net = await pNet;
    const edgeRes = await pEdge;
    state.raw.network = net;
    state.raw.edgeProbe = edgeRes;
    state.groups.net = (net.findings || []).map((r) => Object.assign({ group: 'net' }, r));
    if (net.error) state.groups.net.push({ group: 'net', status: 'info', id: 'net-err', name: 'Network forensics', detail: net.error });
    if (net.tls) {
      const t = net.tls;
      dl('tls-detail', {
        'JA4': t.ja4, 'JA4_r': t.ja4_r, 'JA3': t.ja3, 'JA3N (normalised)': t.ja3n, 'Stack': `${FAMLBL[t.class.family]}: ${t.class.reasons.join('; ')}`,
        'SNI': t.info.sni || '(none)', 'ALPN': t.info.alpn.join(', '), 'Versions': t.info.versions.join(', '), 'Ciphers': t.info.ciphers,
        'Extensions': t.info.extensions.join(', '), 'Groups': t.info.groups.join(', '), 'Key shares': t.info.keyShares.join(', '),
        'Cert compression': t.info.certCompression.join(', ') || 'none', 'ALPS': t.info.alps.join(', ') || 'none',
        'Session ID / Ticket': `${t.info.sessionIdLen != null ? t.info.sessionIdLen + 'B' : 'n/a'} · ticket=${!!t.info.hasSessionTicket} · psk=${!!t.info.hasPSK}`,
        'ClientHello size': t.info.helloBytes + ' bytes',
        'Handshake': net.tlsHandshakeMs != null ? net.tlsHandshakeMs + ' ms' : null,
      });
    } else {
      dl('tls-detail', { Status: net.edge || S.edge ? `Direct edge probe failed${edgeRes && edgeRes.error ? ': ' + edgeRes.error : ''} (port blocked by a firewall / proxy?)` : S.secure ? 'ClientHello not captured' : 'Plain HTTP: open the HTTPS URL to capture the TLS ClientHello' });
    }
    const ti = net.tcpInfo;
    dl('h2-detail', {
      'Capture point': net.viaEdge ? `direct edge ${S.edge ? S.edge.origin : ''} (CDN bypassed)` : (S.via && S.via !== 'direct' ? `${S.via} (no client TLS visible)` : 'direct connection'),
      'Protocol': `HTTP/${net.httpVersion || '?'}${net.alpn ? ' (ALPN ' + net.alpn + ')' : ''}`,
      'Akamai fingerprint': net.h2 && net.h2.akamai,
      'H2 stack': net.h2 && `${FAMLBL[net.h2.class.family]}: ${net.h2.class.reasons.join('; ')}`,
      'SETTINGS': net.h2 && Object.entries(net.h2.settings).map(([k, v]) => `${k}=${v}`).join(', '),
      'WINDOW_UPDATE': net.h2 && net.h2.windowUpdate,
      'Pseudo-header order': net.h2 && net.h2.pseudoOrder,
      'Header order': (net.h2 && net.h2.headerOrder ? net.h2.headerOrder : net.headerOrder || []).join(', '),
      'H2 PING RTT': net.h2PingMs != null ? net.h2PingMs.toFixed(2) + ' ms' : null,
      'TCP/IP sensor': net.tcpSensor ? `${net.tcpSensor.status}${net.tcpSensor.backend ? ' via ' + net.tcpSensor.backend : ''}` : null,
      'SYN signature': net.syn ? `${net.syn.guess.signature} → ${net.syn.guess.label}` : null,
      'TTL / MTU': net.syn ? `TTL ${net.syn.ttl} (initial ${net.syn.guess.initialTTL}, ~${net.syn.guess.hops} hops) · MTU ${net.syn.guess.mtu} (${net.syn.guess.link})` : null,
      'Kernel tcp_info': ti ? `${ti.guess.label} · ts ${ti.ts ? 'on' : 'off'} · sack ${ti.sack ? 'on' : 'off'} · wscale ${ti.peerWscale} · MSS ${ti.peerMss} · MTU ${ti.mtu} · rtt ${ti.rtt} ms (min ${ti.minrtt})` : null,
      'Edge timings': edgeRes && edgeRes.ok ? `cold ${edgeRes.coldMs} ms (new TLS connection) · warm ${edgeRes.warm.join(', ')} ms` : null,
      'Remote endpoint': net.remote,
      'Assets fetched': net.assets ? Object.keys(net.assets).join(', ') : null,
    });
    render();

    const ipRes = await pIP;
    const intel = ipRes.intel;
    state.raw.ip = ipRes;
    state.groups.ip = intel ? intel.findings.map((r) => Object.assign({ group: 'ip' }, r)) : [{ group: 'ip', status: 'info', id: 'ip-err', name: 'IP intelligence', detail: ipRes.error || 'unavailable' }];
    if (intel) {
      dl('ip-detail', {
        'Visitor IP': intel.visitorIP + (intel.note ? ' (local)' : ''), 'Analysed IP': intel.ip, 'Note': intel.note,
        'ASN': intel.asn ? `AS${intel.asn.asn} ${intel.asn.name} · ${intel.asn.prefix} · ${intel.asn.cc} (${intel.asn.registry})` : null,
        'ISP / org': intel.geo ? `${intel.geo.isp} / ${intel.geo.org}` : null,
        'Location': intel.geo ? `${intel.geo.city}, ${intel.geo.regionName}, ${intel.geo.country} (${intel.geo.lat}, ${intel.geo.lon})` : null,
        'IP timezone': intel.geo && intel.geo.timezone, 'Reverse DNS': intel.rdns ? `${intel.rdns.ptr}${intel.rdns.forwardConfirmed ? ' ✓ FCrDNS' : ' ✗ not confirmed'}` : 'none',
        'Flags': Object.entries(intel.flags || {}).map(([k, v]) => `${k}:${v ? 'yes' : 'no'}`).join(' · '),
        'proxycheck.io': intel.providers && intel.providers.proxycheck ? JSON.stringify(intel.providers.proxycheck) : null,
        'Lists': ipRes.lists ? `Tor ${ipRes.lists.tor} · DC ranges ${ipRes.lists.datacenterRanges} · VPN ranges ${ipRes.lists.vpnRanges}` : null,
      });
    }
    const dnsRes = await pDns;
    state.raw.dnsLeak = dnsRes;
    const sensorStatus = {
      'Delivery path': S.via === 'cloudflare' ? `Cloudflare (${S.cfCountry || '?'}) → nginx → BotLens` : S.via === 'proxy' ? 'reverse proxy → BotLens' : 'direct',
      'Direct TLS edge': S.edge ? `${S.edge.origin} · ${edgeRes && edgeRes.ok ? 'reached ✓' : 'unreachable ✗ ' + ((edgeRes && edgeRes.error) || '')}` : 'not configured',
      'TCP/IP SYN sensor': net.tcpSensor ? `${net.tcpSensor.status}${net.tcpSensor.detail ? ': ' + net.tcpSensor.detail : ''}` : '…',
      'Kernel tcp_info': net.tcpInfo ? 'captured on edge connection ✓' : 'n/a',
      'STUN server': ipRes.stun ? `udp4 ${ipRes.stun.udp4}, udp6 ${ipRes.stun.udp6} (port ${ipRes.stun.port})` : '…',
      'DNS resolver probe': ipRes.dns ? `${ipRes.dns.state}${ipRes.dns.zone ? ' (' + ipRes.dns.zone + ')' : ' (set DNS_ZONE to enable)'}` : '…',
      'Transport': S.secure ? `HTTPS · HTTP/${net.httpVersion}` : S.clientSecure ? `HTTPS via ${S.via} (edge: HTTP/${net.httpVersion || '?'})` : 'plain HTTP (TLS/H2 forensics off)',
      'DNS resolver (ip-api EDNS)': dnsRes ? (dnsRes.ip ? `${dnsRes.ip} · ${dnsRes.geo}` : dnsRes.error) : '…',
      'Threat lists': ipRes.lists ? `Tor ${ipRes.lists.tor}, datacenter ${ipRes.lists.datacenterRanges}, VPN ${ipRes.lists.vpnRanges} ranges` : '…',
    };
    dl('sensors', sensorStatus);
    render();

    // WebRTC + PoW + correlation
    const rtc = await pRtc;
    state.raw.webrtc = rtc;
    dl('rtc-detail', rtc && rtc.supported ? {
      'Candidates': rtc.total, 'Server-reflexive': (rtc.srflx || []).map((s) => `${s.ip}:${s.port} (${s.source})`).join(', ') || 'none',
      'Host (raw IP)': (rtc.hostRaw || []).join(', ') || 'none', 'mDNS obfuscation': rtc.mdns ? 'yes' : 'no', 'Relay': rtc.relay,
      'Own STUN': `stun:${ownStunHost}:${S.stunPort}`, 'Error': rtc.error,
    } : { WebRTC: 'unavailable' });

    const pow = await pPow;
    state.raw.pow = pow;
    if (pow && pow.nativeMatch === false) state.groups.challenge.push({ group: 'challenge', status: 'fail', id: 'crypto-hook', name: 'crypto.subtle integrity', detail: 'Native SHA-256 disagrees with the reference implementation, so crypto.subtle.digest is hooked.', weight: 35 });

    const fpParts = {
      canvas: overview.fingerprint['Canvas hash'], gl: webgl ? `${webgl.renderer}|${webgl.renderHash}|${webgl.shaderMathHash || ''}|${JSON.stringify(webgl.params)}` : '',
      fonts: fonts ? JSON.stringify(fonts.present) : '', screen: `${screen.width}x${screen.height}x${devicePixelRatio}x${screen.colorDepth}`,
      hc: navigator.hardwareConcurrency, dm: navigator.deviceMemory, tz: intl && intl.timeZone, langs: (navigator.languages || []).join(','),
      platform: navigator.platform, voices: voices ? (voices.sample || []).join(',') : '', codecs: JSON.stringify(codecs), gamut: mq && mq.colorGamut,
      gpu: webgpu && webgpu.adapter ? `${webgpu.vendor}|${webgpu.architecture}` : '',
      wasm: wasm && wasm.arch ? `${wasm.arch}|${wasm.nanHex}` : '',
      raster: raster && raster.geometryHash ? raster.geometryHash : '',
    };
    const fingerprint = D.fingerprint(fpParts);
    const jsCookie = Math.random().toString(36).slice(2, 12);
    document.cookie = `bl_js=${jsCookie}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    const attestation = D.attest(S.attestSeed, {
      pv: S.pv,
      fingerprint,
      nonce: pow && pow.solution ? pow.solution.nonce : null,
      wasmArch: wasm && wasm.arch ? wasm.arch : '',
      shaderMathHash: webgl && webgl.shaderMathHash ? webgl.shaderMathHash : '',
      rasterHash: raster && raster.geometryHash ? raster.geometryHash : '',
    });
    const body = {
      pv: S.pv, tz: intl && intl.timeZone, tzOffset: new Date().getTimezoneOffset(), languages: Array.from(navigator.languages || []),
      webrtc: rtc, rtt, fingerprint, visitorId: vid && vid.id, jsCookie, attestation,
      edgeRtt: edgeRes && edgeRes.ok ? edgeRes.warm : null,
      dnsLeak: dnsRes && dnsRes.ip ? dnsRes : null, dnsLeakError: dnsRes && dnsRes.error ? dnsRes.error : null,
      pow: pow && pow.solution ? pow.solution : null,
      wasm: wasm && wasm.supported ? { arch: wasm.arch, nanHex: wasm.nanHex, simd: wasm.simd, threads: wasm.threads, ratio: wasm.ratio } : null,
      raster: raster && raster.supported ? { zwjRatio: raster.zwjRatio, zwjCollapsed: raster.zwjCollapsed, geometryHash: raster.geometryHash } : null,
      shaderMathHash: webgl && webgl.shaderMathHash ? webgl.shaderMathHash : null,
      device: {
        fontOS: fonts && fonts.os, fontOSDetail: fonts && fonts.os !== 'unknown' ? fonts.present[fonts.os].slice(0, 3).join(', ') : '',
        systemFontOS: sysFont && sysFont.os, systemFontDetail: sysFont && sysFont.detail,
        voiceOS: voices && voices.os, voiceDetail: voices && voices.detail, gpuOS, gpuDetail: webgl && webgl.renderer,
      },
    };
    let corr = null;
    try {
      corr = await getJSON(`/api/deep/correlate?pv=${S.pv}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (e) {
      corr = { findings: [{ group: 'challenge', status: 'info', id: 'corr-err', name: 'Correlation', detail: e.message }] };
    }
    state.raw.correlation = corr;
    for (const r of corr.findings || []) {
      const g = GROUPS.includes(r.group) ? r.group : 'challenge';
      state.groups[g] = state.groups[g].filter((x0) => x0.id !== r.id).concat([r]);
    }
    if (pow && pow.error) state.groups.challenge.push({ group: 'challenge', status: 'warn', id: 'pow-err', name: 'Proof-of-work', detail: 'Could not run: ' + pow.error, weight: 10 });
    if (vid) state.groups.challenge.push({ group: 'challenge', status: vid.conflicting ? 'warn' : 'info', id: 'visitor', name: 'Persistent visitor ID', detail: vid.returning ? `Returning visitor ${vid.id} (found in ${vid.sources.join(', ')}${vid.missing.length ? '; missing from ' + vid.missing.join(', ') + ', restored' : ''}).${vid.conflicting ? ' Stores disagree, so storage was tampered with.' : ''}` : `First visit. New ID ${vid.id} written to cookie, localStorage and IndexedDB.`, weight: vid.conflicting ? 10 : 0 });

    const rep = corr.reputation || {};
    dl('rep-detail', {
      'Device fingerprint': fingerprint, 'Visitor ID': vid && vid.id, 'Visitor status': vid ? (vid.returning ? 'returning' : 'new') : null,
      'Telemetry attestation': attestation ? `${attestation.slice(0, 16)}… (bound to pv + PoW)` : 'n/a',
      'PoW': pow && pow.solution ? `${pow.solution.bits}-bit · ${pow.ms} ms · nonce ${pow.nonce.toLocaleString()} · native SHA match ${pow.nativeMatch}` : (pow && pow.error) || null,
      'Client RTT samples': rtt.join(', ') + ' ms', 'Server H2 PING': corr.h2PingMs != null ? corr.h2PingMs.toFixed(2) + ' ms' : 'n/a',
      'IP velocity': rep.ip ? `${rep.ip.hits1m}/min · ${rep.ip.hits10m}/10min · ${rep.ip.hitsTotal} total · ${rep.ip.distinctUAs} UA(s)` : null,
      'Fingerprint history': rep.fingerprint ? `seen ${rep.fingerprint.seen}× · ${rep.fingerprint.distinctIPs} IP(s) · ${rep.fingerprint.distinctUAs} UA(s) · ${rep.fingerprint.distinctVisitorIds} visitor ID(s)` : null,
      'Stack cohort cluster': rep.cohort ? `${rep.cohort.key} · ${rep.cohort.seen} hit(s) across ${rep.cohort.distinctIPs} IP(s)` : null,
      'OS votes': (corr.votes || []).map((v) => `${v.source}: ${OSLBL[v.os]}`).join(' · '),
      'Recent STUN peers': (corr.stunSeen || []).join(', ') || 'none',
    });
    renderMatrix(Object.assign(x, { net, intel, corr }));
    render();
    if (typeof window.updateUnifiedSubsystemBadge === 'function') {
      const netFails = (state.groups.net || []).filter((f) => f.status === 'fail').length;
      const ipFails = (state.groups.ip || []).filter((f) => f.status === 'fail').length;
      const devFails = (state.groups.device || []).concat(state.groups.challenge || []).filter((f) => f.status === 'fail').length;
      window.updateUnifiedSubsystemBadge('subEdgeTls', netFails === 0, net.tls ? `JA4 ${net.tls.ja4.slice(0, 10)}…` : 'TLS/H2 Active');
      window.updateUnifiedSubsystemBadge('subDnsStun', ipFails === 0, `DNS :53 & STUN :3478`);
      window.updateUnifiedSubsystemBadge('subBotlensDeep', devFails === 0, `Wasm/Shader/PoW Clean`);
    }

    setTimeout(() => {
      const rp = report();
      fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: 'deep', pv: S.pv, score: rp.score, verdict: rp.verdict, issues: rp.issues.slice(0, 30), fingerprint }) }).catch(() => {});
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
