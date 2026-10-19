/* ─── Stage 17: Display / Monitor Fingerprints · forged-display detection ─
 *  mon/v1 — multi-tier collection of display & monitor signals.
 *
 *  Design (per Display Fingerprinting research doc):
 *    Tier-1 (LIGHT, always-on, ~30-80 ms, no permission):
 *      • screen geometry, availability, depth, orientation
 *      • devicePixelRatio, visualViewport.scale, CSS resolution
 *      • CSS media queries: color-gamut, dynamic-range, scan, update,
 *        viewport-segment-*, orientation, prefers-color-scheme
 *      • CSS env(safe-area-inset-*), env(viewport-segment-*)
 *      • WebGL vendor/renderer + key limits
 *      • WebGPU adapter info + limits + isFallbackAdapter
 *      • screen.isExtended (single-bit topology hint)
 *
 *    Tier-2 (MEDIUM, ~120-300 ms, on user-button click):
 *      • requestAnimationFrame refresh-rate estimator
 *        (median, p10, p90, IQR, MAD, autocorr lag-1, jitter score)
 *      • short Performance.now() resolution probe
 *      • Window outer/inner reconciliation with screen avail*
 *
 *    Tier-3 (HIGH-RISK, permission-gated, ~0.5-2 s):
 *      • Window Management (window-management permission) →
 *          getScreenDetails() — multi-screen topology, isInternal,
 *          isPrimary, label, per-screen DPR.
 *      • Screen Capture (getDisplayMedia) → captured surface metadata
 *          (displaySurface, logicalSurface, screenPixelRatio, frameRate).
 *
 *  Forgery rules (cross-layer consistency, not single-field):
 *    HARD:
 *      • availWidth > width  OR  availHeight > height
 *      • Window.dpr ≠ ScreenDetails.dpr  after zoom-normalisation
 *      • capture.screenPixelRatio irreconcilable with measured DPR
 *      • capture.displaySurface = "monitor" with no monitor-class claim
 *      • claim of raw EDID/serial from page JS (always synthetic)
 *    STRONG:
 *      • screen.isExtended=true but getScreenDetails() shows 1 screen
 *      • WebGL renderer says discrete dGPU but WebGPU reports
 *        isFallbackAdapter=true
 *      • near-zero jitter in rAF deltas (< 0.05 ms MAD across ≥120 samples)
 *      • p90/p10 ratio < 1.001 (perfectly-templated frame timing)
 *      • inner/outer/avail* triangle inconsistent
 *      • DPR claims integer-only on all probes (silent bot stub)
 *    WEAK:
 *      • orientation type vs. width/height mismatch
 *      • dynamic-range high but color-gamut srgb only
 *      • update:slow on a desktop UA
 *
 *  The hash signature is built from the *deterministic* slice only
 *  (screen geometry, DPR rounded, MQ booleans, WebGL/WebGPU caps);
 *  timing distributions live in `telemetry` and never enter the hash so
 *  the MD5 stays stable across reruns on the same monitor.
 *
 *  References (browser-side, public APIs):
 *    – W3C CSSOM View, Window Management, Screen Capture, Media Queries L5
 *    – MDN screen.isExtended, getScreenDetails, GPUAdapter.info
 *    – DrawnApart (NDSS'22) on GPU timing fingerprinting
 * ──────────────────────────────────────────────────────────────────────── */
(function monitorFpInit() {
  const $ = (id) => document.getElementById(id);
  if (!$('monfp-card')) return;

  const FP_VERSION = 'mon/v1';
  const STATE = {
    running: false,
    activeTask: null,
    baseline: null,
    lastHash: null,
    lastRefresh: null,
    serverStored: false,
  };

  // ── helpers ─────────────────────────────────────────────────────────
  const now = () => performance.now();
  const median = (a) => {
    if (!a.length) return 0;
    const s = a.slice().sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const mad = (a, m) => {
    if (!a.length) return 0;
    const med = m != null ? m : median(a);
    return median(a.map((x) => Math.abs(x - med)));
  };
  const pct = (a, p) => {
    if (!a.length) return 0;
    const s = a.slice().sort((x, y) => x - y);
    const i = Math.max(0, Math.min(s.length - 1, Math.floor(s.length * p)));
    return s[i];
  };
  const round = (v, d = 3) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(d) : v);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function setStatus(label, state) {
    const el = $('monfp-status');
    if (!el) return;
    el.textContent = label;
    el.dataset.state = state;
  }
  function setScore(score, verdict, palette) {
    const el = $('monfp-score');
    const v  = $('monfp-verdict');
    if (el) {
      el.textContent = score == null ? '—' : (score >= 0 ? '+' : '') + score;
      el.dataset.tone = palette || 'ok';
    }
    if (v) {
      v.textContent = verdict || '—';
      v.dataset.tone = palette || 'ok';
    }
  }
  function setKv(id, val) {
    const el = $(id);
    if (el) el.textContent = val == null || val === '' ? '—' : String(val);
  }
  function setProgress(p, label) {
    const bar = $('monfp-bar');
    const lab = $('monfp-progress-label');
    if (bar) window.AntiBotStyle.progress(bar, '--p', p);
    if (lab && label) lab.textContent = label;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const yieldEv = () => new Promise((r) => requestAnimationFrame(() => r()));

  function timeoutError(label) {
    const error = new Error(`${label || 'operation'} timed out`);
    error.name = 'TimeoutError';
    error.code = 'ETIMEDOUT';
    return error;
  }

  function withDeadline(promise, timeoutMs, label) {
    let timer = null;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(timeoutError(label)), timeoutMs);
      })
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  async function waitForSignedFetch(timeoutMs = 4000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (window.apisig && typeof window.apisig.signedFetch === 'function') {
        return window.apisig.signedFetch.bind(window.apisig);
      }
      await sleep(50);
    }
    throw timeoutError('signed transport bootstrap');
  }

  async function submitBaseline(payload) {
    const send = await waitForSignedFetch();
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      try {
        const response = await send('/api/monitor-fingerprint', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
          timeoutMs: 7000,
          retryCount: 0,
        });
        if (!response.ok) {
          const error = new Error(`monitor report HTTP ${response.status}`);
          error.status = response.status;
          throw error;
        }
        return await withDeadline(response.json(), 2000, 'monitor report body');
      } catch (error) {
        lastError = error;
        const transient = !error.status || [408, 425, 429, 500, 502, 503, 504].includes(error.status);
        if (!transient || attempt === 1) throw error;
        await sleep(250 + attempt * 500);
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError || new Error('monitor report unavailable');
  }

  // ── Tier-1 collectors (silent baseline) ─────────────────────────────
  function collectScreen() {
    const s = window.screen || {};
    const o = s.orientation || {};
    return {
      width:        s.width        | 0,
      height:       s.height       | 0,
      availWidth:   s.availWidth   | 0,
      availHeight:  s.availHeight  | 0,
      availLeft:    typeof s.availLeft === 'number' ? s.availLeft : null,
      availTop:     typeof s.availTop  === 'number' ? s.availTop  : null,
      colorDepth:   s.colorDepth   | 0,
      pixelDepth:   s.pixelDepth   | 0,
      isExtended:   typeof s.isExtended === 'boolean' ? s.isExtended : null,
      orientationType:  o.type  || null,
      orientationAngle: typeof o.angle === 'number' ? o.angle : null,
    };
  }

  function collectViewport() {
    const vv = window.visualViewport;
    return {
      innerWidth:  window.innerWidth  | 0,
      innerHeight: window.innerHeight | 0,
      outerWidth:  window.outerWidth  | 0,
      outerHeight: window.outerHeight | 0,
      screenX:     window.screenX     | 0,
      screenY:     window.screenY     | 0,
      dpr:         round(window.devicePixelRatio || 1, 6),
      vvScale:     vv ? round(vv.scale || 1, 6) : 1,
      vvWidth:     vv ? Math.round(vv.width)    : null,
      vvHeight:    vv ? Math.round(vv.height)   : null,
      vvOffsetLeft: vv ? Math.round(vv.offsetLeft) : null,
      vvOffsetTop:  vv ? Math.round(vv.offsetTop)  : null,
    };
  }

  function collectMedia() {
    const mq = (q) => {
      try { return window.matchMedia(q).matches; } catch { return null; }
    };
    // CSS resolution buckets — query strictly to derive an effective resolution
    const resBuckets = [];
    [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4].forEach((d) => {
      try {
        if (window.matchMedia(`(resolution: ${d}dppx)`).matches) resBuckets.push(d);
      } catch {}
    });
    return {
      // density / resolution
      cssRes_dppx_buckets: resBuckets,
      cssRes_minus_dpr:    resBuckets.length === 1 ? round(resBuckets[0] - (window.devicePixelRatio || 1), 4) : null,
      // colour & HDR
      gamut_srgb:    mq('(color-gamut: srgb)'),
      gamut_p3:      mq('(color-gamut: p3)'),
      gamut_rec2020: mq('(color-gamut: rec2020)'),
      dynamic_high:  mq('(dynamic-range: high)'),
      dynamic_std:   mq('(dynamic-range: standard)'),
      video_gamut_p3:      mq('(video-color-gamut: p3)'),
      video_gamut_rec2020: mq('(video-color-gamut: rec2020)'),
      video_dyn_high:      mq('(video-dynamic-range: high)'),
      // display class
      scan_progressive: mq('(scan: progressive)'),
      scan_interlace:   mq('(scan: interlace)'),
      update_fast:      mq('(update: fast)'),
      update_slow:      mq('(update: slow)'),
      update_none:      mq('(update: none)'),
      hover_hover:      mq('(hover: hover)'),
      pointer_fine:     mq('(pointer: fine)'),
      pointer_coarse:   mq('(pointer: coarse)'),
      // viewport / foldable
      orientation_portrait:  mq('(orientation: portrait)'),
      orientation_landscape: mq('(orientation: landscape)'),
      hseg_2: mq('(horizontal-viewport-segments: 2)'),
      vseg_2: mq('(vertical-viewport-segments: 2)'),
      // user prefs (not display per se but useful for consistency)
      prefers_dark:  mq('(prefers-color-scheme: dark)'),
      prefers_light: mq('(prefers-color-scheme: light)'),
      forced_colors: mq('(forced-colors: active)'),
    };
  }

  function readCssEnv() {
    // Render a hidden element and read computed env() values via padding.
    try {
      const el = document.createElement('div');
      el.className = 'csp-env-probe';
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      const result = {
        safe_top:    parseFloat(cs.paddingTop)    || 0,
        safe_right:  parseFloat(cs.paddingRight)  || 0,
        safe_bottom: parseFloat(cs.paddingBottom) || 0,
        safe_left:   parseFloat(cs.paddingLeft)   || 0,
      };
      document.body.removeChild(el);
      return result;
    } catch { return null; }
  }

  function collectWebGL() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl') ||
                 c.getContext('experimental-webgl');
      if (!gl) return { supported: false };
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const out = {
        supported: true,
        version:        String(gl.getParameter(gl.VERSION) || ''),
        slVersion:      String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || ''),
        vendor:         dbg ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)   || '') : String(gl.getParameter(gl.VENDOR)   || ''),
        renderer:       dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : String(gl.getParameter(gl.RENDERER) || ''),
        maxTexSize:     gl.getParameter(gl.MAX_TEXTURE_SIZE)         | 0,
        maxCubeMap:     gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE)| 0,
        maxRenderbuf:   gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)    | 0,
        maxViewport:    (() => { try { const v = gl.getParameter(gl.MAX_VIEWPORT_DIMS); return v ? [v[0]|0, v[1]|0] : null; } catch { return null; } })(),
        antialias:      !!(gl.getContextAttributes() && gl.getContextAttributes().antialias),
      };
      try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
      return out;
    } catch (e) { return { supported: false, error: String(e && e.message || e) }; }
  }

  async function collectWebGPU() {
    try {
      if (!('gpu' in navigator)) return { supported: false };
      const adapter = await withDeadline(
        navigator.gpu.requestAdapter().catch(() => null),
        2500,
        'WebGPU adapter'
      );
      if (!adapter) return { supported: false };
      const info = (adapter.info || {});
      const limits = {};
      try {
        for (const k of Object.keys(adapter.limits || {})) {
          const v = adapter.limits[k];
          if (typeof v === 'number' || typeof v === 'bigint') limits[k] = String(v);
        }
      } catch {}
      const features = [];
      try { adapter.features && adapter.features.forEach((f) => features.push(String(f))); } catch {}
      return {
        supported: true,
        info: {
          vendor:       String(info.vendor       || ''),
          architecture: String(info.architecture || ''),
          device:       String(info.device       || ''),
          description:  String(info.description  || ''),
        },
        isFallbackAdapter: !!adapter.isFallbackAdapter,
        limits, features,
      };
    } catch (e) { return { supported: false, error: String(e && e.message || e) }; }
  }

  // ── Tier-2 collectors (refresh / vsync, on demand) ──────────────────
  async function estimateRefresh(samples = 180) {
    return new Promise((resolve) => {
      const ts = [];
      let settled = false;
      let rafId = 0;
      const deadline = setTimeout(() => finish(true), 6500);
      function finish(timedOut) {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        if (rafId) cancelAnimationFrame(rafId);
        if (ts.length < 8) {
          resolve({
            unavailable: true, timeout: !!timedOut,
            n: Math.max(0, ts.length - 1), hz: null, med: null, mad: null,
            p10: null, p90: null, min: null, max: null, cv: null,
            ratio_p90_p10: null, ac1: null, jitter_zero: null,
          });
          return;
        }
        const deltas = [];
        for (let i = 1; i < ts.length; i++) deltas.push(ts[i] - ts[i - 1]);
        // robust outlier trim — drop top 5 % which dominate tab-throttle
        // events without changing the bulk distribution.
        const sorted = deltas.slice().sort((a, b) => a - b);
        const trimmed = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.95)));
        const med = median(trimmed);
        const m   = mad(trimmed, med);
        const p10 = pct(trimmed, 0.10);
        const p90 = pct(trimmed, 0.90);
        const minD = trimmed[0];
        const maxD = trimmed[trimmed.length - 1];
        let acNum = 0, acDen = 0;
        const mean = trimmed.reduce((s, x) => s + x, 0) / trimmed.length;
        for (let i = 1; i < trimmed.length; i++) {
          acNum += (trimmed[i] - mean) * (trimmed[i - 1] - mean);
        }
        for (let i = 0; i < trimmed.length; i++) {
          acDen += (trimmed[i] - mean) * (trimmed[i] - mean);
        }
        const ac1 = acDen > 0 ? acNum / acDen : 0;
        resolve({
          n: trimmed.length,
          partial: !!timedOut,
          hz: med > 0 ? round(1000 / med, 3) : null,
          med: round(med, 4), mad: round(m, 4),
          p10: round(p10, 4), p90: round(p90, 4),
          min: round(minD, 4), max: round(maxD, 4),
          cv: med > 0 ? round(m / med, 5) : null,
          ratio_p90_p10: p10 > 0 ? round(p90 / p10, 5) : null,
          ac1: round(ac1, 5), jitter_zero: m < 0.05,
        });
      }
      function step(t) {
        if (settled) return;
        ts.push(t);
        if (ts.length < samples) rafId = requestAnimationFrame(step);
        else finish(false);
      }
      rafId = requestAnimationFrame(step);
    });
  }

  function probeClock() {
    // performance.now resolution: how small can a delta be?
    const ds = [];
    let last = performance.now();
    for (let i = 0; i < 20000; i++) {
      const t = performance.now();
      const d = t - last;
      if (d > 0) ds.push(d);
      last = t;
    }
    ds.sort((a, b) => a - b);
    return {
      minDelta: round(ds[0] || 0, 6),
      medDelta: round(ds[ds.length >> 1] || 0, 6),
      samples: ds.length,
    };
  }

  // ── Tier-3 collectors (permission-gated step-up) ─────────────────────
  async function collectScreenDetails() {
    try {
      if (typeof window.getScreenDetails !== 'function') {
        return { supported: false, reason: 'no-getScreenDetails' };
      }
      let perm = 'unknown';
      try {
        const p = await withDeadline(
          navigator.permissions.query({ name: 'window-management' }),
          3000,
          'window-management permission query'
        );
        perm = p.state;
      } catch {}
      if (perm === 'denied') return { supported: true, denied: true, perm };
      const det = await withDeadline(window.getScreenDetails(), 30000, 'screen details');
      const pack = (s) => ({
        width:       s.width      | 0,
        height:      s.height     | 0,
        availWidth:  s.availWidth | 0,
        availHeight: s.availHeight| 0,
        left:        s.left       | 0,
        top:         s.top        | 0,
        availLeft:   s.availLeft  | 0,
        availTop:    s.availTop   | 0,
        dpr:         round(s.devicePixelRatio || 1, 6),
        colorDepth:  s.colorDepth | 0,
        isInternal:  !!s.isInternal,
        isPrimary:   !!s.isPrimary,
        isExtended:  !!s.isExtended,
        label:       String(s.label || ''),
        orientationType:  s.orientation && s.orientation.type  || null,
        orientationAngle: s.orientation && s.orientation.angle != null ? s.orientation.angle : null,
      });
      return {
        supported: true, perm,
        current: pack(det.currentScreen),
        screens: (det.screens || []).map(pack),
      };
    } catch (e) {
      return { supported: true, error: String(e && e.message || e) };
    }
  }

  async function collectCaptureTruth() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        return { supported: false };
      }
      const stream = await withDeadline(
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }),
        30000,
        'screen capture permission'
      );
      const tracks = stream.getVideoTracks();
      const out = tracks.map((t) => {
        const s = t.getSettings ? t.getSettings() : {};
        return {
          label:           t.label || null,
          width:           s.width  | 0,
          height:          s.height | 0,
          frameRate:       round(s.frameRate || 0, 3),
          displaySurface:  s.displaySurface  || null,
          logicalSurface:  s.logicalSurface  || null,
          screenPixelRatio: s.screenPixelRatio != null ? round(s.screenPixelRatio, 6) : null,
          cursor:          s.cursor || null,
          aspectRatio:     s.aspectRatio != null ? round(s.aspectRatio, 6) : null,
          deviceId:        s.deviceId || null,
        };
      });
      try { tracks.forEach((t) => t.stop()); } catch {}
      return { supported: true, tracks: out };
    } catch (e) {
      return { supported: true, error: String(e && e.message || e) };
    }
  }

  // ── Forgery / consistency analyser ──────────────────────────────────
  function analyse(baseline, refresh, screens, capture) {
    const findings = [];   // {sev: 'hard'|'strong'|'weak', code, msg}
    const s  = baseline.screen;
    const v  = baseline.viewport;
    const m  = baseline.media;
    const wg = baseline.webgl  || {};
    const wgpu = baseline.webgpu || {};

    // ─── HARD contradictions ───────────────────────────────────────────
    if (s.availWidth > s.width) {
      findings.push({ sev: 'hard', code: 'AVAIL_W_GT_W', msg: `availWidth=${s.availWidth} > width=${s.width}` });
    }
    if (s.availHeight > s.height) {
      findings.push({ sev: 'hard', code: 'AVAIL_H_GT_H', msg: `availHeight=${s.availHeight} > height=${s.height}` });
    }
    if (s.width <= 0 || s.height <= 0) {
      findings.push({ sev: 'hard', code: 'ZERO_SCREEN', msg: 'screen.width/height is zero' });
    }
    if (v.dpr <= 0 || v.dpr > 16) {
      findings.push({ sev: 'hard', code: 'DPR_OUT_OF_RANGE', msg: `dpr=${v.dpr}` });
    }

    // CSS resolution vs DPR (after page-zoom normalisation)
    if (m.cssRes_minus_dpr != null && Math.abs(m.cssRes_minus_dpr) > 0.25) {
      findings.push({ sev: 'strong', code: 'DPR_CSS_RES_DRIFT',
        msg: `css resolution differs from DPR by ${m.cssRes_minus_dpr}` });
    }

    // Inner > outer is impossible
    if (v.outerWidth > 0 && v.innerWidth > v.outerWidth + 4) {
      findings.push({ sev: 'strong', code: 'INNER_GT_OUTER_W',
        msg: `inner=${v.innerWidth} > outer=${v.outerWidth}` });
    }
    if (v.outerHeight > 0 && v.innerHeight > v.outerHeight + 64) {
      findings.push({ sev: 'strong', code: 'INNER_GT_OUTER_H',
        msg: `inner=${v.innerHeight} > outer=${v.outerHeight}` });
    }

    // Orientation vs aspect mismatch
    if (m.orientation_portrait && s.width > s.height) {
      findings.push({ sev: 'weak', code: 'ORIENT_VS_GEOM',
        msg: `MQ portrait but width>height` });
    }

    // HDR strong without P3
    if (m.dynamic_high && !m.gamut_p3 && !m.gamut_rec2020) {
      findings.push({ sev: 'weak', code: 'HDR_NO_P3',
        msg: 'dynamic-range:high without P3/Rec2020 gamut' });
    }

    // update:slow on a desktop UA is unusual
    if (m.update_slow && /(Windows|Macintosh|X11)/.test(navigator.userAgent || '')) {
      findings.push({ sev: 'weak', code: 'DESKTOP_SLOW_UPDATE',
        msg: 'CSS update:slow on a desktop UA' });
    }

    // WebGL dGPU strings vs WebGPU fallback adapter
    const rendStr = (wg.renderer || '').toLowerCase();
    const looksDiscrete = /(rtx|gtx|radeon|geforce|quadro|arc a\d|m1|m2|m3|m4|apple gpu)/.test(rendStr);
    if (wgpu.supported && wgpu.isFallbackAdapter && looksDiscrete) {
      findings.push({ sev: 'strong', code: 'GPU_FALLBACK_VS_DGPU',
        msg: `WebGPU fallback adapter but WebGL renderer reports "${wg.renderer}"` });
    }

    // ─── refresh / vsync (tier-2) ──────────────────────────────────────
    if (refresh && refresh.n) {
      if (refresh.jitter_zero && refresh.n >= 100) {
        findings.push({ sev: 'strong', code: 'RAF_ZERO_JITTER',
          msg: `rAF MAD=${refresh.mad}ms across ${refresh.n} frames — perfectly templated` });
      }
      if (refresh.ratio_p90_p10 != null && refresh.ratio_p90_p10 < 1.001 && refresh.n >= 100) {
        findings.push({ sev: 'strong', code: 'RAF_P90_P10_FLAT',
          msg: `p90/p10=${refresh.ratio_p90_p10} (real displays show jitter)` });
      }
      if (refresh.hz != null && (refresh.hz < 20 || refresh.hz > 360)) {
        findings.push({ sev: 'weak', code: 'RAF_HZ_OOR',
          msg: `unusual rAF Hz=${refresh.hz}` });
      }
    }

    // ─── multi-screen reconciliation (tier-3) ──────────────────────────
    if (screens && screens.supported && !screens.denied && !screens.error) {
      const cur = screens.current;
      const arr = screens.screens || [];
      // isExtended discrepancy
      if (s.isExtended === true && arr.length <= 1) {
        findings.push({ sev: 'strong', code: 'EXT_TRUE_ONE_SCREEN',
          msg: `screen.isExtended=true but getScreenDetails returns ${arr.length} screen(s)` });
      }
      if (s.isExtended === false && arr.length > 1) {
        findings.push({ sev: 'strong', code: 'EXT_FALSE_MANY_SCREENS',
          msg: `screen.isExtended=false but ${arr.length} screens reported` });
      }
      // per-screen DPR vs window DPR after zoom — coarse
      if (cur && Math.abs(cur.dpr - v.dpr) > 0.25 && Math.abs(v.vvScale - 1) < 0.05) {
        findings.push({ sev: 'strong', code: 'PER_SCREEN_DPR_DRIFT',
          msg: `currentScreen.dpr=${cur.dpr} vs window.dpr=${v.dpr}` });
      }
      // bounding-box sanity
      arr.forEach((sc, i) => {
        if (sc.availWidth > sc.width || sc.availHeight > sc.height) {
          findings.push({ sev: 'hard', code: 'SD_AVAIL_GT_TOTAL',
            msg: `screen[${i}].avail* exceeds total` });
        }
      });
    }

    // ─── capture truth reconciliation (tier-3) ─────────────────────────
    if (capture && capture.supported && capture.tracks && capture.tracks.length) {
      const tr = capture.tracks[0];
      if (tr.screenPixelRatio != null && Math.abs(tr.screenPixelRatio - v.dpr) > 0.25
          && Math.abs(v.vvScale - 1) < 0.05) {
        findings.push({ sev: 'hard', code: 'CAPTURE_DPR_MISMATCH',
          msg: `capture.screenPixelRatio=${tr.screenPixelRatio} vs page DPR=${v.dpr}` });
      }
      if (tr.displaySurface === 'monitor' && tr.width > 0 && tr.height > 0) {
        // Captured monitor dims vs claimed screen dims
        const claimedW = s.width  * v.dpr;
        const claimedH = s.height * v.dpr;
        const dw = Math.abs(tr.width  - claimedW) / Math.max(1, claimedW);
        const dh = Math.abs(tr.height - claimedH) / Math.max(1, claimedH);
        if (dw > 0.05 || dh > 0.05) {
          findings.push({ sev: 'strong', code: 'CAPTURE_SIZE_DRIFT',
            msg: `monitor capture ${tr.width}×${tr.height} vs claimed ${claimedW|0}×${claimedH|0}` });
        }
      }
    }

    // ─── score ─────────────────────────────────────────────────────────
    let score = 0;
    for (const f of findings) {
      if (f.sev === 'hard')   score -= 40;
      else if (f.sev === 'strong') score -= 18;
      else if (f.sev === 'weak')   score -= 5;
    }
    score = Math.max(-100, Math.min(0, score));
    let verdict, palette;
    if (score <= -40) { verdict = 'FORGED DISPLAY';   palette = 'bad';  }
    else if (score <= -18) { verdict = 'SUSPICIOUS';   palette = 'warn'; }
    else if (score <= -5)  { verdict = 'MINOR ANOMALIES'; palette = 'warn'; }
    else                   { verdict = 'CONSISTENT';   palette = 'ok';   }
    return { findings, score, verdict, palette };
  }

  // ── UI render ───────────────────────────────────────────────────────
  function renderBaselineKv(b) {
    const s = b.screen, v = b.viewport, m = b.media, w = b.webgl || {}, g = b.webgpu || {};
    setKv('monfp-k-geom',      `${s.width}×${s.height}px (avail ${s.availWidth}×${s.availHeight})`);
    setKv('monfp-k-dpr',       `${v.dpr}× · CSS res ${m.cssRes_dppx_buckets.length === 1 ? m.cssRes_dppx_buckets[0] + 'dppx' : '—'} · vv ${v.vvScale}×`);
    setKv('monfp-k-depth',     `${s.colorDepth}-bit · pixel ${s.pixelDepth}-bit`);
    setKv('monfp-k-orient',    `${s.orientationType || '—'} · ${s.orientationAngle != null ? s.orientationAngle + '°' : ''}`);
    const gamut = m.gamut_rec2020 ? 'rec2020' : m.gamut_p3 ? 'p3' : m.gamut_srgb ? 'srgb' : '?';
    const dyn   = m.dynamic_high ? 'HDR' : m.dynamic_std ? 'SDR' : '?';
    setKv('monfp-k-color',     `gamut ${gamut} · ${dyn}`);
    setKv('monfp-k-display',   `scan ${m.scan_progressive ? 'progressive' : m.scan_interlace ? 'interlace' : '?'} · update ${m.update_fast ? 'fast' : m.update_slow ? 'slow' : m.update_none ? 'none' : '?'}`);
    setKv('monfp-k-extended',  s.isExtended === null ? 'unknown (policy)' : (s.isExtended ? 'multi-screen' : 'single screen'));
    setKv('monfp-k-webgl',     w.supported ? `${w.vendor || '?'} · ${w.renderer || '?'}` : 'unsupported');
    setKv('monfp-k-webgpu',    g.supported
      ? `${g.info.vendor || '?'} ${g.info.architecture || ''} · ${g.isFallbackAdapter ? 'fallback' : 'native'}`
      : 'unsupported');
  }

  function renderRefresh(r) {
    if (!r) {
      setKv('monfp-k-refresh', '—');
      setKv('monfp-k-jitter',  '—');
      return;
    }
    setKv('monfp-k-refresh', `${r.hz} Hz · med ${r.med}ms (n=${r.n})`);
    setKv('monfp-k-jitter',  `MAD ${r.mad}ms · p10/p90 ${r.p10}/${r.p90} · ratio ${r.ratio_p90_p10} · ac1 ${r.ac1}`);
  }

  function renderScreens(sd) {
    const root = $('monfp-screens');
    if (!root) return;
    if (!sd || !sd.supported) { root.innerHTML = '<div class="monfp-mini">Window Management API unsupported</div>'; return; }
    if (sd.denied) { root.innerHTML = '<div class="monfp-mini">Permission denied</div>'; return; }
    if (sd.error)  { root.innerHTML = `<div class="monfp-mini">Error: ${esc(sd.error)}</div>`; return; }
    const rows = (sd.screens || []).map((s, i) => `
      <div class="monfp-screen-row">
        <span class="monfp-screen-tag ${s.isPrimary ? 'monfp-screen-tag--primary' : ''} ${s.isInternal ? 'monfp-screen-tag--internal' : 'monfp-screen-tag--external'}">
          ${s.isPrimary ? 'PRI' : '#' + (i + 1)} · ${s.isInternal ? 'INT' : 'EXT'}
        </span>
        <span class="monfp-screen-geo">${s.width}×${s.height} @ ${s.dpr}×</span>
        <span class="monfp-screen-pos">(${s.left},${s.top})</span>
        <span class="monfp-screen-label">${esc(s.label || '—')}</span>
      </div>`).join('');
    root.innerHTML = rows || '<div class="monfp-mini">No screens reported</div>';
  }

  function renderCapture(cap) {
    const root = $('monfp-capture');
    if (!root) return;
    if (!cap)              { root.innerHTML = '<div class="monfp-mini">Skipped</div>'; return; }
    if (!cap.supported)    { root.innerHTML = '<div class="monfp-mini">Screen Capture unsupported</div>'; return; }
    if (cap.error)         { root.innerHTML = `<div class="monfp-mini">${esc(cap.error)}</div>`; return; }
    const rows = (cap.tracks || []).map((t) => `
      <div class="monfp-cap-row">
        <span class="monfp-cap-surface">${esc(t.displaySurface || '?')}</span>
        <span class="monfp-cap-geom">${t.width}×${t.height} @ ${t.frameRate}fps</span>
        <span class="monfp-cap-spr">screenPxRatio ${t.screenPixelRatio != null ? t.screenPixelRatio : '—'}</span>
        <span class="monfp-cap-label" title="${esc(t.label || '')}">${esc(t.label || '—')}</span>
      </div>`).join('');
    root.innerHTML = rows || '<div class="monfp-mini">No tracks</div>';
  }

  function renderFindings(an) {
    const root = $('monfp-findings');
    if (!root) return;
    if (!an.findings.length) {
      root.innerHTML = '<li class="monfp-finding monfp-finding--ok">No anomalies detected — display story is internally consistent.</li>';
      return;
    }
    root.innerHTML = an.findings.map((f) => `
      <li class="monfp-finding monfp-finding--${esc(f.sev)}" data-sev="${esc(f.sev)}">
        <span class="monfp-finding__sev">${esc(f.sev.toUpperCase())}</span>
        <span class="monfp-finding__code">${esc(f.code)}</span>
        <span class="monfp-finding__msg">${esc(f.msg)}</span>
      </li>`).join('');
  }

  // ── orchestration ───────────────────────────────────────────────────
  function setControlsDisabled(disabled) {
    const refreshButton = $('monfp-run');
    const stepUpButton = $('monfp-stepup');
    if (refreshButton) refreshButton.disabled = disabled;
    if (stepUpButton) stepUpButton.disabled = disabled;
  }

  async function withRunLock(taskName, task) {
    if (STATE.running) {
      console.info(`[monitor-fp] ${taskName} skipped; ${STATE.activeTask || 'another task'} is running`);
      return false;
    }
    STATE.running = true;
    STATE.activeTask = taskName;
    setControlsDisabled(true);
    try {
      await task();
      return true;
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      console.error(`[monitor-fp] ${taskName} failed:`, error);
      const timedOut = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      setStatus(timedOut ? 'Timeout' : 'Unknown', timedOut ? 'warn' : 'error');
      setProgress(100, `${taskName} failed: ${message}`);
      throw error;
    } finally {
      STATE.running = false;
      STATE.activeTask = null;
      setControlsDisabled(false);
    }
  }

  async function collectBaseline() {
    setStatus('Collecting…', 'busy');
    setProgress(8, 'Reading screen / viewport / media…');
    const tStart = now();

    const screen   = collectScreen();
    const viewport = collectViewport();
    const media    = collectMedia();
    const cssEnv   = readCssEnv();
    setProgress(38, 'WebGL / WebGPU…');
    const webgl  = collectWebGL();
    const webgpu = await collectWebGPU();
    setProgress(60, 'Building signature…');

    const baseline = {
      version: FP_VERSION,
      screen, viewport, media, cssEnv, webgl, webgpu,
      ua: {
        userAgent: navigator.userAgent || '',
        platform:  (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '',
        languages: Array.isArray(navigator.languages) ? navigator.languages.slice(0, 4) : [navigator.language || ''],
      },
      ts: Date.now(),
    };
    STATE.baseline = baseline;
    STATE.lastRefresh = null;

    // Signature (deterministic — no timing, no microsecond floats)
    const sig = {
      v: FP_VERSION,
      g: [screen.width, screen.height, screen.colorDepth, screen.pixelDepth, screen.orientationType || ''],
      d: round(viewport.dpr, 2),
      m: [media.gamut_p3, media.gamut_rec2020, media.dynamic_high,
          media.scan_progressive, media.update_fast, media.hover_hover, media.pointer_fine],
      gl: webgl.supported ? [webgl.vendor || '', webgl.renderer || '', webgl.maxTexSize | 0] : ['unsupported'],
      gpu: webgpu.supported
        ? [webgpu.info.vendor || '', webgpu.info.architecture || '', webgpu.isFallbackAdapter ? 1 : 0]
        : ['unsupported'],
    };
    setProgress(72, 'Posting baseline…');

    let resp = null;
    try {
      resp = await submitBaseline({
        features: { signature: sig, baseline },
        telemetry: { totalMs: round(now() - tStart, 1) },
        client: window.__clientIpInfo || null,
      });
    } catch (e) {
      resp = {
        ok: false,
        state: e && (e.name === 'TimeoutError' || e.name === 'AbortError') ? 'timeout' : 'unknown',
        error: e && e.message ? e.message : String(e)
      };
    }

    if (resp && resp.ok && resp.hash) {
      STATE.serverStored = true;
      STATE.lastHash = resp.hash;
      $('monfp-hash').textContent = resp.hash;
      $('monfp-runtime').textContent = `${round(now() - tStart, 1)} ms · baseline tier`;
      $('monfp-history-count').textContent = String(resp.count || 0);
    } else {
      STATE.serverStored = false;
      $('monfp-hash').textContent = (resp && resp.error) ? `error: ${resp.error}` : 'submission failed';
    }

    // The server has now stored the exact session/address-family display
    // evidence. Notify the shell only after that write completed, otherwise an
    // eager score refresh races the ingest and keeps showing the old snapshot.
    try {
      const displayStatus = resp && resp.ok && resp.display_evidence
        ? String(resp.display_evidence.status || 'unavailable')
        : (resp && resp.state === 'timeout' ? 'timeout' : 'unavailable');
      window.dispatchEvent(new CustomEvent('antibot:fingerprint-evidence-ready', {
        detail: {
          family: 'display',
          state: displayStatus === 'consistent_observed' ? 'pass'
            : (displayStatus === 'candidate_contradiction' ? 'inconclusive' : displayStatus),
          assessed_count: displayStatus === 'consistent_observed' ? 1 : 0,
          conflict_count: 0,
          ts: Date.now(),
        },
      }));
    } catch (_) {}

    renderBaselineKv(baseline);
    setProgress(100, resp && resp.ok
      ? 'Baseline ready · click ▶ for refresh probe'
      : `Baseline local · server ${resp.state || 'unknown'}`);

    // Initial scoring without refresh / step-up data
    const an = analyse(baseline, null, null, null);
    setScore(an.score, an.verdict, an.palette);
    renderFindings(an);
    setStatus(
      resp && resp.ok ? (an.palette === 'ok' ? 'Clean baseline' : 'Anomalies')
        : (resp && resp.state === 'timeout' ? 'Report timeout' : 'Report unknown'),
      resp && resp.ok ? an.palette : 'warn'
    );
    $('monfp-features-pre').textContent = JSON.stringify({ baseline, signature: sig }, null, 2);
  }

  async function runBaseline() {
    return withRunLock('baseline', collectBaseline);
  }

  async function runRefreshProbe() {
    return withRunLock('refresh probe', async () => {
      if (!STATE.baseline) await collectBaseline();
      setStatus('Probing refresh…', 'busy');
      setProgress(20, 'rAF refresh estimator (180 frames)…');
      const refresh = await estimateRefresh(180);
      STATE.lastRefresh = refresh;
      setProgress(70, 'Performance.now resolution…');
      const clock = probeClock();
      setProgress(95, 'Re-scoring…');
      renderRefresh(refresh);
      const an = analyse(STATE.baseline, refresh, null, null);
      setScore(an.score, an.verdict, an.palette);
      renderFindings(an);
      if (refresh.unavailable) {
        setStatus(refresh.timeout ? 'Refresh timeout' : 'Refresh unknown', 'warn');
        setProgress(100, refresh.timeout ? 'Refresh probe timed out' : 'Refresh probe unavailable');
      } else {
        setStatus(an.palette === 'ok' ? 'Clean baseline + refresh' : 'Anomalies (with refresh)', an.palette);
        setProgress(100, `Refresh ${refresh.hz} Hz · MAD ${refresh.mad} ms`);
      }
      $('monfp-features-pre').textContent = JSON.stringify({
        baseline: STATE.baseline, refresh, clock,
      }, null, 2);
    });
  }

  async function runStepUp() {
    return withRunLock('step-up', async () => {
      if (!STATE.baseline) await collectBaseline();
      setStatus('Requesting permissions…', 'busy');
      setProgress(20, 'Window Management permission…');
      const screens = await collectScreenDetails();
      renderScreens(screens);
      setProgress(60, 'Screen capture (you will see a picker)…');
      const capture = await collectCaptureTruth();
      renderCapture(capture);
      setProgress(95, 'Re-scoring with capture truth…');
      const refresh = STATE.lastRefresh;
      const an = analyse(STATE.baseline, refresh, screens, capture);
      setScore(an.score, an.verdict, an.palette);
      renderFindings(an);
      setStatus(an.palette === 'ok' ? 'Clean (full step-up)' : 'Anomalies (full step-up)', an.palette);
      setProgress(100, 'Step-up complete');
      $('monfp-features-pre').textContent = JSON.stringify({
        baseline: STATE.baseline, refresh, screens, capture,
      }, null, 2);
    });
  }

  // ── wire up UI ──────────────────────────────────────────────────────
  function installMonitorFp() {
    const r1 = $('monfp-run');
    const r2 = $('monfp-stepup');
    if (r1) r1.addEventListener('click', () => { runRefreshProbe().catch(() => {}); });
    if (r2) r2.addEventListener('click', () => { runStepUp().catch(() => {}); });
    // Tier-1 baseline is part of page-load assessment. Opening the panel only
    // reveals cached results; permission-gated and timing probes remain manual.
    let eagerAttempt = 0;
    const startEager = () => {
      if (STATE.serverStored || eagerAttempt >= 3) return;
      if (STATE.running) {
        setTimeout(startEager, 300);
        return;
      }
      eagerAttempt += 1;
      runBaseline().then(() => {
        if (!STATE.serverStored && eagerAttempt < 3) {
          setTimeout(startEager, 300 * (2 ** eagerAttempt));
        }
      }).catch(() => {
        if (eagerAttempt < 3) setTimeout(startEager, 300 * (2 ** eagerAttempt));
      });
    };
    setTimeout(startEager, 0);
    window.addEventListener('panel:view', (e) => {
      if (e.detail && e.detail.viewId === 'monitor-fp' && !STATE.serverStored) startEager();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installMonitorFp, { once:true });
  } else {
    installMonitorFp();
  }
})();
