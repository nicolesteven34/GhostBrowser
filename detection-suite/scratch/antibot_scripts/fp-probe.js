/*!
 * fp-probe.js v3 — canvas / WebGL / WebGPU integrity collector.
 *
 * v3 CHANGES
 *  - Painters come from FPScene. v1 duplicated them here and in the worker,
 *    and duplicated a compositing bug with them.
 *  - self-difference actually works now (see probeSelfDifference).
 *  - Every probe reports a status. `missing` must never look like `clean`
 *    to the scorer, so the client is explicit about why something is absent.
 *  - A/B ROI probe (scene.roi existed in v1 but nothing used it).
 *  - Tiles verify overlapping reads against each other, not just against the
 *    full frame — a pixel read twice by two getImageData calls must agree.
 *  - WebGL split into an exact NEAREST pass-through and a separate entropy
 *    shader. v1 called a sin/cos/pow shader "exact", which it is not.
 *  - `always` tier scans stratified offsets instead of 153,600 pixels.
 */
(function (global) {
  'use strict';

  // These are implementation constants.  They are deliberately not copied
  // from the challenge: otherwise an old collector can claim to be whatever
  // build the server just requested.
  var STACK_ID = 'anti.bot/fpint-v7-forward-port';
  var VERSION = 4;
  var COLLECTOR_BUILD = 7;
  var WORKER_BUILD = 7;
  var S = global.FPScene;
  if (!S) throw new Error('fp-probe: fp-scene.js must load first');

  var OK = 'ok', UNSUP = 'unsupported', BLOCKED = 'blocked', TIMEOUT = 'timeout', ERR = 'error';

  function now() { return (global.performance && performance.now) ? performance.now() : Date.now(); }

  function h32(b) {
    var h = 0x811c9dc5;
    for (var i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  async function sha256Hex(b) {
    if (!global.crypto || !crypto.subtle) return null;
    var d = await crypto.subtle.digest('SHA-256', b instanceof Uint8Array ? b : new Uint8Array(b));
    return Array.prototype.map.call(new Uint8Array(d), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }

  function mkCanvas(doc, w, h) {
    var c = doc.createElement('canvas');
    c.width = w; c.height = h;
    // colorSpace pinned to srgb: a Display-P3 backing store would apply a
    // conversion on readback and break every exact invariant below.
    var ctx = c.getContext('2d', { alpha: false, colorSpace: 'srgb', willReadFrequently: true });
    if (!ctx) throw new Error('no-2d-context');
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx: ctx };
  }
  function read(canvas) {
    var ctx = canvas.getContext('2d');
    return new Uint8ClampedArray(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
  }
  function cmp(a, b) {
    if (!a || !b || a.length !== b.length) {
      return { st: ERR, err: 'length-mismatch', lengthMismatch: true,
               leftLength: a && a.length, rightLength: b && b.length };
    }
    var n = 0, dev = 0, max = 0, ch = [0, 0, 0, 0];
    for (var i = 0; i < a.length; i += 4) {
      var hit = 0;
      for (var c = 0; c < 4; c++) {
        var d = Math.abs(a[i + c] - b[i + c]);
        if (d) { dev += d; ch[c]++; hit = 1; if (d > max) max = d; }
      }
      n += hit;
    }
    return { n: n, dev: dev, max: max, ch: ch };
  }
  function fail(e) {
    var m = String((e && e.message) || e);
    return { st: /timeout/i.test(m) ? TIMEOUT : /Security|tainted|denied/i.test(m) ? BLOCKED : ERR, err: m };
  }
  function safe(fn) {
    return function () {
      try {
        var r = fn.apply(null, arguments);
        return (r && typeof r.then === 'function') ? r.catch(fail) : r;
      } catch (e) { return fail(e); }
    };
  }

  /* helpers that own compositing state so painters never have to */
  function paintFresh(ctx, scene, withRoi) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    S.paintExact(ctx, scene);
    if (withRoi) S.paintRoi(ctx, scene);
    ctx.restore();
  }

  /* ================================================================== *
   * 3. base canvas vs server ground truth
   * ================================================================== */
  function probeBase(doc, scene, full) {
    var m = mkCanvas(doc, scene.exact.w, scene.exact.h);
    paintFresh(m.ctx, scene, false);
    var px = read(m.canvas), W = scene.exact.w, H = scene.exact.h;
    var cw = W / scene.exact.cols, chh = H / scene.exact.rows;
    var cellAt = function (x, y) {
      return scene.exact.cells[Math.min(scene.exact.rows - 1, (y / chh) | 0) * scene.exact.cols +
                               Math.min(scene.exact.cols - 1, (x / cw) | 0)];
    };

    var n = 0, dev = 0, max = 0, ch = [0, 0, 0, 0], scanned = 0;
    function check(off) {
      var x = off % W, y = (off / W) | 0, e = cellAt(x, y), i = off * 4, hit = 0;
      for (var c = 0; c < 3; c++) {
        var d = Math.abs(px[i + c] - e[c]);
        if (d) { dev += d; ch[c]++; hit = 1; if (d > max) max = d; }
      }
      if (px[i + 3] !== 255) { ch[3]++; hit = 1; }
      n += hit; scanned++;
    }

    if (full) {
      for (var off = 0; off < W * H; off++) check(off);
    } else {
      // `always` tier: stratified scan. The full 153,600-pixel loop is the
      // single largest cost in the cheap tier and buys little there.
      var grid = S.blockerGridOffsets(W, H);
      for (var gi = 0; gi < grid.length; gi++) check(grid[gi]);
      for (var s = 0; s < scene.samples.length; s++) check(scene.samples[s].off);
      for (var k = 0; k < 2000; k++) check(((k * 7919) % (W * H)) | 0);
    }

    var gridN = 0, gridArr = S.blockerGridOffsets(W, H);
    for (var q = 0; q < gridArr.length; q++) {
      var gx = gridArr[q] % W, gy = (gridArr[q] / W) | 0, ge = cellAt(gx, gy), gj = gridArr[q] * 4;
      if (px[gj] !== ge[0] || px[gj + 1] !== ge[1] || px[gj + 2] !== ge[2]) gridN++;
    }

    return { st: OK, full: !!full, scanned: scanned, n: n, dev: dev, max: max, ch: ch,
             gridN: gridN, gridTotal: gridArr.length, _px: px, _canvas: m.canvas };
  }

  /* ================================================================== *
   * 4/5. stability + tiles with overlap verification
   * ================================================================== */
  function probeStability(doc, scene, base) {
    var r1 = base._px, r2 = read(base._canvas);
    var dup = mkCanvas(doc, scene.exact.w, scene.exact.h);
    paintFresh(dup.ctx, scene, false);
    var r3 = read(dup.canvas);

    // Overlap check: read the frame through the seeded tile plan and compare
    // every pixel covered by more than one getImageData call.
    var W = scene.exact.w, H = scene.exact.h;
    var ctx = base._canvas.getContext('2d');
    var acc = new Uint8ClampedArray(W * H * 4);
    var cover = new Uint8Array(W * H);
    var overlapReads = 0, overlapMismatchPixels = 0, overlapMismatchChannels = 0, maxOverlapDelta = 0;

    for (var t = 0; t < scene.tiles.length; t++) {
      var T = scene.tiles[t];
      var x = Math.max(0, T.x), y = Math.max(0, T.y);
      var w = Math.min(W - x, T.w), h = Math.min(H - y, T.h);
      if (w <= 0 || h <= 0) continue;
      var d = ctx.getImageData(x, y, w, h).data;
      for (var ry = 0; ry < h; ry++) {
        for (var rx = 0; rx < w; rx++) {
          var src = (ry * w + rx) * 4, off = (y + ry) * W + (x + rx), dst = off * 4;
          if (cover[off]) {
            overlapReads++;
            var overlapHit = 0;
            for (var c = 0; c < 4; c++) {
              var delta = Math.abs(acc[dst + c] - d[src + c]);
              if (delta) { overlapMismatchChannels++; overlapHit = 1; if (delta > maxOverlapDelta) maxOverlapDelta = delta; }
            }
            overlapMismatchPixels += overlapHit;
          } else {
            acc[dst] = d[src]; acc[dst + 1] = d[src + 1];
            acc[dst + 2] = d[src + 2]; acc[dst + 3] = d[src + 3];
            cover[off] = 1;
          }
        }
      }
    }
    var uncovered = 0;
    for (var u = 0; u < cover.length; u++) if (!cover[u]) uncovered++;

    return {
      st: OK,
      repeat: cmp(r1, r2),
      duplicate: cmp(r1, r3),
      tiles: uncovered ? { st: ERR, err: 'tile-plan-uncovered', uncovered: uncovered } : cmp(r1, acc),
      overlap: { reads: overlapReads, mismatchPixels: overlapMismatchPixels,
                 mismatchChannels: overlapMismatchChannels, maxDelta: maxOverlapDelta }
    };
  }

  /* ================================================================== *
   * 6. self-difference — the v1 showstopper
   *
   * |Cb - Cs| is exactly zero for every channel only where the source pixel
   * is fully opaque, which is why this runs on the opaque rect scene and
   * never on antialiased text. The painter must not reset compositing state
   * between the two passes; in v1 it did, so the `difference` operator never
   * applied and the probe reported the whole canvas as dirty.
   * ================================================================== */
  function probeSelfDifference(doc, scene) {
    var m = mkCanvas(doc, scene.exact.w, scene.exact.h);
    var ctx = m.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    S.paintExact(ctx, scene);
    ctx.globalCompositeOperation = 'difference';
    S.paintExact(ctx, scene);          // must leave GCO alone
    ctx.restore();

    var px = read(m.canvas), n = 0, dev = 0, max = 0;
    for (var i = 0; i < px.length; i += 4) {
      var d = px[i] + px[i + 1] + px[i + 2];
      if (d) { n++; dev += d; if (d > max) max = d; }
    }
    return { st: OK, n: n, dev: dev, max: max, total: px.length / 4 };
  }

  /* ================================================================== *
   * 5b. A/B ROI locality — global noise leaks outside the mutated rect
   * ================================================================== */
  function probeRoi(doc, scene) {
    var A = mkCanvas(doc, scene.exact.w, scene.exact.h);
    paintFresh(A.ctx, scene, false);
    var B = mkCanvas(doc, scene.exact.w, scene.exact.h);
    paintFresh(B.ctx, scene, true);
    var a = read(A.canvas), b = read(B.canvas);

    var W = scene.exact.w, r = scene.roi;
    var inside = 0, outside = 0, outsideDev = 0, insideExpected = r.w * r.h, wrongColor = 0, alphaBad = 0;
    for (var i = 0; i < a.length; i += 4) {
      var off = i / 4, x = off % W, y = (off / W) | 0;
      var isRoi = x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
      var diff = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) +
                 Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]);
      if (isRoi) {
        if (b[i] !== r.color[0] || b[i + 1] !== r.color[1] || b[i + 2] !== r.color[2] || b[i + 3] !== 255) wrongColor++;
        if (a[i + 3] !== 255 || b[i + 3] !== 255) alphaBad++;
        if (diff) inside++;
      } else if (diff) { outside++; outsideDev += diff; }
    }
    return { st: OK, insideChanged: inside, insideExpected: insideExpected,
             outsideChanged: outside, outsideDev: outsideDev, wrongRoiColor: wrongColor,
             alphaBad: alphaBad, exactInside: inside === insideExpected && wrongColor === 0 };
  }

  /* ================================================================== *
   * 7. bitmap permutations
   * ================================================================== */
  function probeMirror(doc, scene) {
    function xf(src, a, b, c, d, e, f, w, h) {
      var m = mkCanvas(doc, w, h);
      m.ctx.setTransform(a, b, c, d, e, f);
      m.ctx.drawImage(src, 0, 0);
      m.ctx.setTransform(1, 0, 0, 1, 0, 0);
      return m.canvas;
    }
    var src = mkCanvas(doc, scene.exact.w, scene.exact.h);
    paintFresh(src.ctx, scene, false);
    var ref = read(src.canvas), W = scene.exact.w, H = scene.exact.h;
    var mh = function (c) { return xf(c, -1, 0, 0, 1, c.width, 0, c.width, c.height); };
    var mv = function (c) { return xf(c, 1, 0, 0, -1, 0, c.height, c.width, c.height); };
    var r90 = function (c) { return xf(c, 0, 1, -1, 0, c.height, 0, c.height, c.width); };

    var sq = mkCanvas(doc, scene.square, scene.square);
    sq.ctx.drawImage(src.canvas, 0, 0, scene.square, scene.square);
    var sqRef = read(sq.canvas), rot = sq.canvas;
    for (var i = 0; i < 4; i++) rot = r90(rot);

    return { st: OK, h: cmp(ref, read(mh(mh(src.canvas)))),
             v: cmp(ref, read(mv(mv(src.canvas)))), rot4: cmp(sqRef, read(rot)) };
  }

  /* ================================================================== *
   * 8. cross-readout, including the OffscreenCanvas path
   * ================================================================== */
  async function probeReadout(doc, scene) {
    var m = mkCanvas(doc, scene.exact.w, scene.exact.h);
    paintFresh(m.ctx, scene, false);
    var direct = read(m.canvas), out = { st: OK, direct: h32(direct) };

    async function toRgba(src) {
      var bmp = await createImageBitmap(src);
      try {
        var t = mkCanvas(doc, bmp.width, bmp.height);
        t.ctx.drawImage(bmp, 0, 0);
        return read(t.canvas);
      } finally { if (bmp.close) bmp.close(); }
    }
    function b64ToBlob(durl) {
      var bin = atob(durl.split(',')[1]), u8 = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return new Blob([u8], { type: 'image/png' });
    }

    try { out.dataURL = cmp(direct, await toRgba(b64ToBlob(m.canvas.toDataURL('image/png')))); }
    catch (e) { out.dataURL = fail(e); }

    try {
      var blob = await new Promise(function (res, rej) {
        var done = false, to = setTimeout(function () { if (!done) { done = true; rej(new Error('toBlob timeout')); } }, 2500);
        m.canvas.toBlob(function (b) {
          if (done) return; done = true; clearTimeout(to);
          b ? res(b) : rej(new Error('toBlob returned null'));
        }, 'image/png');
      });
      out.blob = cmp(direct, await toRgba(blob));
    } catch (e) { out.blob = fail(e); }

    try { out.bitmap = cmp(direct, await toRgba(m.canvas)); } catch (e) { out.bitmap = fail(e); }

    // OffscreenCanvas.convertToBlob is a fifth, separately hookable exit path.
    try {
      if (typeof OffscreenCanvas === 'undefined') out.offscreen = { st: UNSUP };
      else {
        var oc = new OffscreenCanvas(scene.exact.w, scene.exact.h);
        var octx = oc.getContext('2d', { alpha: false, willReadFrequently: true });
        octx.imageSmoothingEnabled = false;
        octx.save(); octx.globalCompositeOperation = 'source-over'; octx.globalAlpha = 1;
        S.paintExact(octx, scene); octx.restore();
        out.offscreen = cmp(direct, await toRgba(await oc.convertToBlob({ type: 'image/png' })));
      }
    } catch (e) { out.offscreen = fail(e); }

    return out;
  }

  /* ================================================================== *
   * 9. recovery / noise classification (sensitive tier only)
   * ================================================================== */
  async function probeRecovery(doc, scene, base) {
    var W = scene.exact.w, cw = W / scene.exact.cols, chh = scene.exact.h / scene.exact.rows;
    var hist = [{}, {}, {}];
    for (var y = 0; y < scene.exact.h; y += 3) {
      for (var x = 0; x < W; x += 3) {
        var e = scene.exact.cells[Math.min(scene.exact.rows - 1, (y / chh) | 0) * scene.exact.cols +
                                  Math.min(scene.exact.cols - 1, (x / cw) | 0)];
        var i = (y * W + x) * 4;
        for (var c = 0; c < 3; c++) { var d = base._px[i + c] - e[c]; hist[c][d] = (hist[c][d] || 0) + 1; }
      }
    }
    var vec = hist.map(function (h) {
      var best = 0, bn = -1;
      for (var k in h) if (h[k] > bn) { bn = h[k]; best = parseInt(k, 10); }
      return best;
    });

    var N = 5, frames = [];
    for (var f = 0; f < N; f++) {
      var m = mkCanvas(doc, scene.entropy.w, scene.entropy.h);
      m.ctx.save(); m.ctx.globalCompositeOperation = 'source-over'; m.ctx.globalAlpha = 1;
      S.paintEntropy(m.ctx, scene);
      m.ctx.fillStyle = 'rgb(' + ((f * 47) % 256) + ',' + ((f * 91) % 256) + ',' + ((f * 13) % 256) + ')';
      m.ctx.fillRect(0, 0, scene.entropy.w, 6);
      m.ctx.restore();
      frames.push(read(m.canvas));
    }
    /* Allocation-free tally. The previous form built one object per byte —
       460,800 allocations per sensitive run, ~460 ms, the single largest cost
       in the whole collector. It also broke ties by picking the numerically
       smallest byte, because for..in enumerates integer keys in ascending
       order; ties must resolve to the first observed frame, which is a real
       measurement rather than an artefact of key ordering. */
    var len = frames[0].length, voted = new Uint8ClampedArray(len);
    var vals = new Uint8Array(N), cnt = new Uint8Array(N);
    for (var p = 0; p < len; p++) {
      var k = 0;
      for (var q = 0; q < N; q++) {
        var v = frames[q][p], j = 0;
        for (; j < k; j++) { if (vals[j] === v) { cnt[j]++; break; } }
        if (j === k) { vals[k] = v; cnt[k] = 1; k++; }
      }
      var bi = 0;                       // vals[0] is frames[0]'s value
      for (var j2 = 1; j2 < k; j2++) if (cnt[j2] > cnt[bi]) bi = j2;
      voted[p] = vals[bi];
      for (var j3 = 0; j3 < k; j3++) cnt[j3] = 0;
    }
    return { st: OK, shiftVector: vec, rawHash: h32(frames[0]),
             majorityHash: h32(voted), majorityStable: h32(voted) === h32(frames[0]),
             canonical: await sha256Hex(voted) };
  }

  /* ================================================================== *
   * 10/11. realms
   * ================================================================== */
  function realmTextMetrics(doc) {
    var m = mkCanvas(doc, 16, 16);
    return h32(new TextEncoder().encode(S.textMetricSignature(m.ctx)));
  }

  function realmDigest(doc, scene) {
    var m = mkCanvas(doc, scene.exact.w, scene.exact.h);
    paintFresh(m.ctx, scene, false);
    var exact = h32(read(m.canvas));
    var e = mkCanvas(doc, scene.entropy.w, scene.entropy.h);
    e.ctx.save(); e.ctx.globalCompositeOperation = 'source-over'; e.ctx.globalAlpha = 1;
    S.paintEntropy(e.ctx, scene); e.ctx.restore();
    var sd = probeSelfDifference(doc, scene);
    var gl = null;
    try {
      var gc = doc.createElement('canvas');
      var g = gc.getContext('webgl2') || gc.getContext('webgl');
      if (g) {
        var dbg = g.getExtension('WEBGL_debug_renderer_info');
        gl = { renderer: dbg ? g.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER),
               maxTex: g.getParameter(g.MAX_TEXTURE_SIZE) };
      }
    } catch (_) {}
    return { st: OK, exact: exact, entropy: h32(read(e.canvas)), selfDiffN: sd.n, gl: gl,
             textMetrics: realmTextMetrics(doc),
             hwc: (doc.defaultView || global).navigator.hardwareConcurrency,
             webdriver: (doc.defaultView || global).navigator.webdriver };
  }

  function probeIframeRealm(scene) {
    return new Promise(function (resolve) {
      var f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      // Current production CSP forbids style attributes.  The class lives in
      // the first-party stylesheet and therefore remains measurable without
      // weakening style-src-attr.
      f.className = 'fpint-v7-realm-frame';
      f.src = 'about:blank';
      var done = false;
      var finish = function (v) { if (done) return; done = true; try { f.remove(); } catch (_) {} resolve(v); };
      f.onload = function () {
        try { finish(realmDigest(f.contentDocument, scene)); } catch (e) { finish(fail(e)); }
      };
      (document.body || document.documentElement).appendChild(f);
      setTimeout(function () { finish({ st: TIMEOUT }); }, 3000);
    });
  }

  function probeWorkerRealm(seed, spec, url) {
    return new Promise(function (resolve) {
      var w, done = false;
      var finish = function (v) { if (done) return; done = true; try { w && w.terminate(); } catch (_) {} resolve(v); };
      try { w = new Worker(url); } catch (e) { return resolve({ st: BLOCKED, err: String(e.message || e) }); }
      var to = setTimeout(function () { finish({ st: TIMEOUT }); }, 6000);
      w.onmessage = function (ev) {
        clearTimeout(to);
        var value = ev.data || {};
        if (value.protocol !== VERSION || value.workerBuild !== WORKER_BUILD ||
            value.stack !== STACK_ID) {
          return finish({ st: ERR, err: 'worker version handshake mismatch' });
        }
        finish(value);
      };
      w.onerror = function (ev) { clearTimeout(to); finish({ st: ERR, err: String(ev.message || 'worker') }); };
      w.postMessage({ seed: seed, spec: spec, protocol: VERSION,
                      collectorBuild: COLLECTOR_BUILD, workerBuild: WORKER_BUILD,
                      stack: STACK_ID });
    });
  }

  /* ================================================================== *
   * 12/13/14. non-pixel surfaces
   * ================================================================== */
  function round3(v) { return typeof v === 'number' ? Math.round(v * 1000) / 1000 : null; }

  function probeTextMetrics(doc) {
    var out = [], samples = [
      { s: 'Cwm fjordbank glyphs', f: 'serif', px: 48 },
      { s: 'mmMwWLliI0O&1', f: 'sans-serif', px: 40 },
      { s: '\u00DD\u00FE{}[]|\\/@#$%', f: 'monospace', px: 44 }
    ];
    for (var k = 0; k < samples.length; k++) {
      var sp = samples[k], m = mkCanvas(doc, 900, 140);
      m.ctx.fillStyle = '#fff'; m.ctx.fillRect(0, 0, 900, 140);
      m.ctx.font = sp.px + 'px ' + sp.f; m.ctx.textBaseline = 'alphabetic';
      var tm = m.ctx.measureText(sp.s);
      m.ctx.fillStyle = '#000'; m.ctx.fillText(sp.s, 40, 100);
      var px = read(m.canvas), minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
      for (var y = 0; y < 140; y++) for (var x = 0; x < 900; x++) {
        var i = (y * 900 + x) * 4;
        if (px[i] !== 255 || px[i + 1] !== 255 || px[i + 2] !== 255) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      var dW = (tm.actualBoundingBoxLeft || 0) + (tm.actualBoundingBoxRight || 0);
      var dH = (tm.actualBoundingBoxAscent || 0) + (tm.actualBoundingBoxDescent || 0);
      out.push({ f: sp.f, width: round3(tm.width),
                 abbL: round3(tm.actualBoundingBoxLeft), abbR: round3(tm.actualBoundingBoxRight),
                 abbA: round3(tm.actualBoundingBoxAscent), abbD: round3(tm.actualBoundingBoxDescent),
                 fbbA: round3(tm.fontBoundingBoxAscent), fbbD: round3(tm.fontBoundingBoxDescent),
                 pxW: maxX < 0 ? -1 : maxX - minX + 1, pxH: maxY < 0 ? -1 : maxY - minY + 1,
                 dW: maxX < 0 ? null : round3(Math.abs(dW - (maxX - minX + 1))),
                 dH: maxY < 0 ? null : round3(Math.abs(dH - (maxY - minY + 1))) });
    }
    return { st: OK, rows: out };
  }

  function probeRects() {
    function measure(html, fontFamily, fontSize) {
      var el = document.createElement('span');
      el.setAttribute('aria-hidden', 'true');
      el.className = 'fpint-v7-measure';
      if (global.AntiBotStyle && typeof global.AntiBotStyle.setMany === 'function') {
        global.AntiBotStyle.setMany(el, {
          fontFamily: fontFamily || 'initial',
          fontSize: String(fontSize || 48) + 'px'
        });
      } else {
        // Standalone package/browser test fallback.  Production always takes
        // the nonce-backed CSSOM branch above.
        el.style.fontFamily = fontFamily || 'initial';
        el.style.fontSize = String(fontSize || 48) + 'px';
      }
      el.innerHTML = html;
      (document.body || document.documentElement).appendChild(el);
      var r = el.getBoundingClientRect();
      if (global.AntiBotStyle && typeof global.AntiBotStyle.release === 'function') {
        global.AntiBotStyle.release(el);
      }
      el.remove();
      return [round3(r.width), round3(r.height)];
    }
    var families = ['serif', 'sans-serif', 'monospace', 'system-ui', '-apple-system',
                    'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Noto Sans',
                    'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji'];
    var fonts = {};
    for (var i = 0; i < families.length; i++) {
      fonts[families[i]] = measure('mmMwWLliI0O&1', families[i], 48);
    }
    // Raw vector only. v1 shipped hardcoded "width > 140 means Windows"
    // thresholds; those belong in a learned cohort model, not in a rule.
    return { st: OK, emoji: {
        smile: measure('\uD83D\uDE00', null, 64),
        family: measure('\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', null, 64),
        flag: measure('\uD83C\uDDE6\uD83C\uDDEA', null, 64),
        rainbow: measure('\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08', null, 64),
        heart: measure('\u2764\uFE0F', null, 64)
      },
      mathml: {
        frac: measure('<math><mfrac><mi>x</mi><msqrt><mi>y</mi></msqrt></mfrac></math>', null, 32),
        sum: measure('<math><munderover><mo>&#8721;</mo><mi>i</mi><mi>n</mi></munderover></math>', null, 32)
      },
      fonts: fonts };
  }

  function probeWinding(doc, scene) {
    var m = mkCanvas(doc, scene.square, scene.square), w = scene.winding;
    // simple: two same-direction rects. The server computes the expected
    // nonzero/evenodd bits in closed form, so this is verifiable ground truth.
    var simple = new Path2D();
    simple.rect(w.rectA.x, w.rectA.y, w.rectA.w, w.rectA.h);
    simple.rect(w.rectB.x, w.rectB.y, w.rectB.w, w.rectB.h);
    var snz = '', seo = '';
    for (var i = 0; i < w.simple.length; i++) {
      var p = w.simple[i];
      snz += m.ctx.isPointInPath(simple, p.x, p.y, 'nonzero') ? '1' : '0';
      seo += m.ctx.isPointInPath(simple, p.x, p.y, 'evenodd') ? '1' : '0';
    }
    // complex: entropy only, no server ground truth
    var cx = new Path2D();
    cx.moveTo(20, 20); cx.lineTo(230, 90); cx.lineTo(40, 230); cx.lineTo(200, 210); cx.closePath();
    cx.moveTo(90, 60); cx.bezierCurveTo(200, 30, 30, 200, 190, 180); cx.closePath();
    cx.arc(128, 128, 70, 0, Math.PI * 1.4);
    m.ctx.lineWidth = 9; m.ctx.setLineDash([7, 3, 2, 5]);
    var cnz = '', ceo = '', cst = '';
    for (var j = 0; j < w.complex.length; j++) {
      var q = w.complex[j];
      cnz += m.ctx.isPointInPath(cx, q[0], q[1], 'nonzero') ? '1' : '0';
      ceo += m.ctx.isPointInPath(cx, q[0], q[1], 'evenodd') ? '1' : '0';
      cst += m.ctx.isPointInStroke(cx, q[0], q[1]) ? '1' : '0';
    }
    return { st: OK, simple: { nonzero: snz, evenodd: seo },
             complex: { nonzero: cnz, evenodd: ceo, stroke: cst } };
  }

  /* ================================================================== *
   * 15-19. GPU
   * ================================================================== */
  var GL_PARAMS = ['VERSION', 'SHADING_LANGUAGE_VERSION', 'VENDOR', 'RENDERER',
    'MAX_TEXTURE_SIZE', 'MAX_CUBE_MAP_TEXTURE_SIZE', 'MAX_RENDERBUFFER_SIZE', 'MAX_VIEWPORT_DIMS',
    'MAX_VERTEX_ATTRIBS', 'MAX_TEXTURE_IMAGE_UNITS', 'MAX_VERTEX_TEXTURE_IMAGE_UNITS',
    'MAX_COMBINED_TEXTURE_IMAGE_UNITS', 'MAX_VARYING_VECTORS', 'MAX_VERTEX_UNIFORM_VECTORS',
    'MAX_FRAGMENT_UNIFORM_VECTORS', 'ALIASED_LINE_WIDTH_RANGE', 'ALIASED_POINT_SIZE_RANGE',
    'RED_BITS', 'GREEN_BITS', 'BLUE_BITS', 'ALPHA_BITS', 'DEPTH_BITS', 'STENCIL_BITS',
    'MAX_3D_TEXTURE_SIZE', 'MAX_ARRAY_TEXTURE_LAYERS', 'MAX_DRAW_BUFFERS',
    'MAX_COLOR_ATTACHMENTS', 'UNIFORM_BUFFER_OFFSET_ALIGNMENT', 'MAX_SAMPLES'];

  function glCaps(doc, kind) {
    var c = doc.createElement('canvas'); c.width = 64; c.height = 64;
    var gl = c.getContext(kind, { alpha: false, antialias: false, depth: true,
                                  stencil: true, preserveDrawingBuffer: true });
    if (!gl) return { st: UNSUP };
    var norm = function (v) { return ArrayBuffer.isView(v) ? Array.from(v) : v; };
    var params = {};
    GL_PARAMS.forEach(function (n) {
      if (typeof gl[n] !== 'number') return;
      try { params[n] = norm(gl.getParameter(gl[n])); } catch (_) {}
    });
    var prec = {};
    [['V', 'VERTEX_SHADER'], ['F', 'FRAGMENT_SHADER']].forEach(function (st) {
      ['LOW_FLOAT', 'MEDIUM_FLOAT', 'HIGH_FLOAT', 'LOW_INT', 'MEDIUM_INT', 'HIGH_INT'].forEach(function (t) {
        try { var f = gl.getShaderPrecisionFormat(gl[st[1]], gl[t]);
              prec[st[0] + t] = f ? [f.rangeMin, f.rangeMax, f.precision] : null; }
        catch (_) { prec[st[0] + t] = null; }
      });
    });
    var exts = (gl.getSupportedExtensions() || []).slice().sort(), extLie = 0;
    ['EXT_texture_filter_anisotropic', 'OES_texture_float', 'WEBGL_lose_context',
     'WEBGL_debug_renderer_info', 'EXT_color_buffer_float'].forEach(function (n) {
      var listed = exts.indexOf(n) >= 0, got = false;
      try { got = !!gl.getExtension(n); } catch (_) {}
      if (listed !== got) extLie++;
    });
    var dbg = null;
    try { var d = gl.getExtension('WEBGL_debug_renderer_info');
          if (d) dbg = { vendor: gl.getParameter(d.UNMASKED_VENDOR_WEBGL),
                         renderer: gl.getParameter(d.UNMASKED_RENDERER_WEBGL) }; } catch (_) {}
    return { st: OK, attrs: gl.getContextAttributes(), params: params, precision: prec,
             extensions: exts, extensionCount: exts.length, extensionLie: extLie,
             unmasked: dbg, _gl: gl, _canvas: c };
  }

  function compile(gl, vsSrc, fsSrc) {
    function sh(t, src) {
      var shader = gl.createShader(t);
      if (!shader) throw new Error('createShader failed');
      gl.shaderSource(shader, src); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var log = gl.getShaderInfoLog(shader); gl.deleteShader(shader);
        throw new Error(log || 'shader compile failed');
      }
      return shader;
    }
    var vs = sh(gl.VERTEX_SHADER, vsSrc), fs = sh(gl.FRAGMENT_SHADER, fsSrc);
    var program = gl.createProgram();
    if (!program) { gl.deleteShader(vs); gl.deleteShader(fs); throw new Error('createProgram failed'); }
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(program); gl.deleteProgram(program);
      throw new Error(log || 'program link failed');
    }
    return program;
  }

  var VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';
  var FS_EXACT = 'precision mediump float;varying vec2 uv;uniform sampler2D t;' +
                 'void main(){gl_FragColor=texture2D(t,uv);}';
  var FS_ENTROPY_HIGH = 'precision highp float;varying vec2 uv;uniform sampler2D t;uniform vec4 k;' +
    'void main(){vec4 s=texture2D(t,uv);' +
    'float w=sin(uv.x*k.x*12.0)*cos(uv.y*k.y*9.0)+pow(abs(uv.x-k.z),1.7);' +
    'gl_FragColor=vec4(clamp(s.rgb+vec3(w*k.w*0.25),0.0,1.0),1.0);}';
  var FS_ENTROPY_MEDIUM = FS_ENTROPY_HIGH.replace('precision highp float', 'precision mediump float');

  function glRender(doc, scene, caps) {
    if (!caps || caps.st !== OK) return { st: UNSUP };
    var gl = caps._gl, c = caps._canvas;
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    try { gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); } catch (_) {}
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 8, 8, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(scene.gl.tex));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.disable(gl.BLEND); gl.disable(gl.DITHER); gl.viewport(0, 0, 64, 64);

    function draw(prog, withK) {
      gl.useProgram(prog);
      var loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1i(gl.getUniformLocation(prog, 't'), 0);
      if (withK) gl.uniform4f.apply(gl, [gl.getUniformLocation(prog, 'k')].concat(scene.gl.k));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      var out = new Uint8Array(64 * 64 * 4);
      gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, out);
      return out;
    }

    /* --- exact pass-through: RGBA8, NEAREST, no blending, integral 8x scale.
           Every output texel must equal its source texel exactly. --- */
    var exactProgram = compile(gl, VS, FS_EXACT);
    var highp = null;
    try { highp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT); } catch (_) {}
    var entropyProgram = compile(gl, VS, highp && highp.precision > 0 ? FS_ENTROPY_HIGH : FS_ENTROPY_MEDIUM);
    var exactPx = draw(exactProgram, false);
    var texMismatch = 0, texMaxDelta = 0;
    for (var y = 0; y < 64; y++) {
      for (var x = 0; x < 64; x++) {
        // Texture uploads and readPixels are both represented bottom-row first
        // in their typed arrays. v2 flipped this axis twice and marked every
        // clean WebGL implementation as inconsistent.
        var sy = y >> 3, sx = x >> 3;
        var si = (sy * 8 + sx) * 4, di = (y * 64 + x) * 4;
        for (var ch = 0; ch < 3; ch++) {
          var d = Math.abs(exactPx[di + ch] - scene.gl.tex[si + ch]);
          if (d) { texMismatch++; if (d > texMaxDelta) texMaxDelta = d; }
        }
      }
    }

    /* --- entropy shader: implementation-sensitive, cohort-scored only --- */
    var entPx = draw(entropyProgram, true);

    /* --- FBO vs default framebuffer --- */
    var fbo = gl.createFramebuffer(), rtex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, rtex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rtex, 0);
    var fboOk = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    var fboPx = null;
    if (fboOk) { gl.bindTexture(gl.TEXTURE_2D, tex); fboPx = draw(entropyProgram, true); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    /* --- readPixels vs the 2D pipeline, after Y normalisation --- */
    var via = mkCanvas(doc, 64, 64);
    via.ctx.drawImage(c, 0, 0);
    var v2d = read(via.canvas), flip = new Uint8ClampedArray(entPx.length);
    for (var row = 0; row < 64; row++) flip.set(entPx.subarray((63 - row) * 256, (64 - row) * 256), row * 256);
    var xn = 0, xdev = 0, xmax = 0;
    for (var i = 0; i < flip.length; i += 4) {
      var hit = 0;
      for (var cc = 0; cc < 3; cc++) {
        var dd = Math.abs(flip[i + cc] - v2d[i + cc]);
        if (dd) { xdev += dd; hit = 1; if (dd > xmax) xmax = dd; }
      }
      xn += hit;
    }

    var result = { st: OK,
      exactPassthrough: { oracle: 'typed-array-no-flip-v3', mismatches: texMismatch, maxDelta: texMaxDelta, total: 64 * 64 * 3 },
      entropyHash: h32(entPx),
      fbo: fboOk ? { hash: h32(fboPx), sameAsDefault: h32(fboPx) === h32(entPx) } : { st: UNSUP },
      glVs2d: { n: xn, dev: xdev, max: xmax },
      glError: gl.getError() };

    try { gl.deleteProgram(exactProgram); } catch (_) {}
    try { gl.deleteProgram(entropyProgram); } catch (_) {}
    try { gl.deleteBuffer(buf); } catch (_) {}
    try { gl.deleteTexture(tex); } catch (_) {}
    try { gl.deleteTexture(rtex); } catch (_) {}
    try { gl.deleteFramebuffer(fbo); } catch (_) {}
    return result;
  }

  async function probeWebGPU(scope) {
    scope = scope || global;
    if (!scope.navigator || !scope.navigator.gpu) return { st: UNSUP };
    var a = null;
    try { a = await scope.navigator.gpu.requestAdapter(); } catch (e) { return fail(e); }
    if (!a) return { st: UNSUP, adapter: null };
    var limits = {};
    try { for (var k in a.limits) limits[k] = a.limits[k]; } catch (_) {}
    var info = null;
    try { info = a.info ? { vendor: a.info.vendor, architecture: a.info.architecture,
                            device: a.info.device, description: a.info.description } : null; } catch (_) {}
    var feats = [];
    try { a.features.forEach(function (f) { feats.push(f); }); } catch (_) {}
    return { st: OK, info: info, features: feats.sort(), limits: limits,
             preferredFormat: (function () { try { return scope.navigator.gpu.getPreferredCanvasFormat(); } catch (_) { return null; } })() };
  }

  function probeMath() {
    var v = [Math.sin(1e300), Math.cos(1e300), Math.tan(1e300), Math.asin(0.12345),
             Math.acos(0.12345), Math.atan(0.5), Math.atanh(0.5), Math.asinh(1e300),
             Math.acosh(1e300), Math.sinh(1), Math.cosh(1), Math.tanh(1), Math.exp(1),
             Math.expm1(1), Math.log1p(10), Math.log10(1000.1), Math.pow(Math.PI, -100),
             Math.cbrt(100), Math.hypot(3.3, 4.4)];
    return { st: OK, values: v.map(String), hash: h32(new TextEncoder().encode(v.join('|'))) };
  }

  function probeEnv() {
    var n = global.navigator || {}, s = global.screen || {}, uad = n.userAgentData || null;
    var mq = function (q) { try { return matchMedia(q).matches; } catch (_) { return null; } };
    return { st: OK, ua: n.userAgent, platform: n.platform, vendor: n.vendor,
      languages: n.languages, language: n.language,
      hardwareConcurrency: n.hardwareConcurrency, deviceMemory: n.deviceMemory,
      maxTouchPoints: n.maxTouchPoints, pdfViewerEnabled: n.pdfViewerEnabled, webdriver: n.webdriver,
      braveApi: !!n.brave, screenEqualsWindow: (s.width === global.innerWidth && s.height === global.innerHeight),
      uaData: uad ? { mobile: uad.mobile, platform: uad.platform,
                      brands: (uad.brands || []).map(function (b) { return b.brand + '/' + b.version; }) } : null,
      screen: { w: s.width, h: s.height, aw: s.availWidth, ah: s.availHeight,
                colorDepth: s.colorDepth, pixelDepth: s.pixelDepth },
      dpr: global.devicePixelRatio,
      tz: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) { return null; } })(),
      tzOffset: new Date().getTimezoneOffset(),
      media: { colorGamut: mq('(color-gamut: p3)') ? 'p3' : (mq('(color-gamut: srgb)') ? 'srgb' : 'unknown'),
               hdr: mq('(dynamic-range: high)'), forcedColors: mq('(forced-colors: active)'),
               reducedMotion: mq('(prefers-reduced-motion: reduce)'),
               invertedColors: mq('(inverted-colors: inverted)'), monochrome: mq('(monochrome)'),
               pointerCoarse: mq('(pointer: coarse)') } };
  }

  function probeIntegrity() {
    var out = { st: OK, toStringOk: {}, proxyLie: {}, stack: [] };
    var targets = [
      ['canvas.toDataURL', HTMLCanvasElement.prototype, 'toDataURL'],
      ['canvas.toBlob', HTMLCanvasElement.prototype, 'toBlob'],
      ['ctx2d.getImageData', CanvasRenderingContext2D.prototype, 'getImageData'],
      ['ctx2d.measureText', CanvasRenderingContext2D.prototype, 'measureText'],
      ['webgl.getParameter', global.WebGLRenderingContext && WebGLRenderingContext.prototype, 'getParameter'],
      ['webgl.readPixels', global.WebGLRenderingContext && WebGLRenderingContext.prototype, 'readPixels'],
      ['webgl2.getParameter', global.WebGL2RenderingContext && WebGL2RenderingContext.prototype, 'getParameter'],
      ['webgl2.readPixels', global.WebGL2RenderingContext && WebGL2RenderingContext.prototype, 'readPixels'],
      ['el.getBoundingClientRect', Element.prototype, 'getBoundingClientRect']
    ];
    targets.forEach(function (t) {
      if (!t[1]) return;
      var fn = t[1][t[2]];
      if (typeof fn !== 'function') return;
      try {
        out.toStringOk[t[0]] = /\{\s*\[native code\]\s*\}/.test(Function.prototype.toString.call(fn)) && fn.name === t[2];
      } catch (_) { out.toStringOk[t[0]] = false; }
      var originalPrototype = null, changed = false;
      try {
        originalPrototype = Object.getPrototypeOf(fn);
        Object.setPrototypeOf(fn, fn); changed = true;
        out.proxyLie[t[0]] = true;
      } catch (e) {
        out.proxyLie[t[0]] = !/[Cc]yclic/.test(String(e.message || ''));
      } finally {
        // Do not leave a third-party wrapper in a mutated state. A lying Proxy
        // usually did not change its target, but restoring is cheap insurance.
        if (changed && originalPrototype !== null) {
          try { Object.setPrototypeOf(fn, originalPrototype); } catch (_) {}
        }
      }
    });
    try {
      var cv = document.createElement('canvas');
      cv.getContext('2d').getImageData(cv);
    } catch (e) {
      var m = String(e && e.stack || '').match(/(chrome-extension|moz-extension|safari-web-extension):\/\/[a-z0-9-]+/gi);
      out.stack = m ? Array.from(new Set(m)) : [];
    }
    return out;
  }

  /* ================================================================== *
   * Orchestration
   * ================================================================== */
  var TIERS = {
    always:    ['base', 'stability', 'selfdiff', 'rects', 'webgl', 'env', 'integrity'],
    auth:      ['base', 'stability', 'selfdiff', 'readout', 'rects', 'text', 'winding',
                'realms', 'webgl', 'webgpu', 'math', 'env', 'integrity'],
    sensitive: ['base', 'stability', 'selfdiff', 'readout', 'roi', 'mirror', 'rects', 'text',
                'winding', 'realms', 'recovery', 'webgl', 'glrender', 'webgpu', 'math',
                'env', 'integrity']
  };

  async function ensureDocumentReady(doc) {
    if (doc.body) return;
    await new Promise(function (resolve) {
      var done = false;
      var finish = function () { if (!done) { done = true; resolve(); } };
      doc.addEventListener('DOMContentLoaded', finish, { once: true });
      setTimeout(finish, 1000);
    });
  }

  async function run(challenge, opts) {
    opts = opts || {};
    await ensureDocumentReady(document);
    var workerUrl = opts.workerUrl || '/fp/fp-worker.js';
    if (!challenge || challenge.stack !== STACK_ID || challenge.probe !== VERSION ||
        challenge.collectorBuild !== COLLECTOR_BUILD ||
        challenge.workerBuild !== WORKER_BUILD || challenge.spec !== S.SPEC_VERSION) {
      throw new Error('fp-probe: challenge version mismatch');
    }
    var t0 = now(), scene = S.derive(challenge.seed);
    var tier = challenge.tier || 'always';
    var want = TIERS[tier] || TIERS.always;
    var has = function (k) { return want.indexOf(k) >= 0; };
    var doc = document;
    // tier is echoed for diagnostics only; the server overwrites it from the
    // stored challenge, because a client-chosen tier is a downgrade attack.
    var R = { stack: STACK_ID, v: VERSION, build: COLLECTOR_BUILD,
              workerBuild: WORKER_BUILD, spec: S.SPEC_VERSION,
              cid: challenge.cid, tier: tier, probes: want };

    var base = safe(probeBase)(doc, scene, tier !== 'always');
    R.base = base.st === OK
      ? { st: OK, full: base.full, scanned: base.scanned, n: base.n, dev: base.dev,
          max: base.max, ch: base.ch, gridN: base.gridN, gridTotal: base.gridTotal }
      : base;
    if (base.st === OK) {
      R.samples = scene.samples.map(function (s) {
        var i = s.off * 4;
        return [base._px[i], base._px[i + 1], base._px[i + 2], base._px[i + 3]];
      });
    }

    if (has('stability') && base.st === OK) R.stability = safe(probeStability)(doc, scene, base);
    if (has('selfdiff')) R.selfdiff = safe(probeSelfDifference)(doc, scene);
    if (has('roi')) R.roi = safe(probeRoi)(doc, scene);
    if (has('mirror')) R.mirror = safe(probeMirror)(doc, scene);
    if (has('readout')) R.readout = await safe(probeReadout)(doc, scene);
    if (has('recovery') && base.st === OK) R.recovery = await safe(probeRecovery)(doc, scene, base);
    if (has('text')) R.text = safe(probeTextMetrics)(doc);
    if (has('rects')) R.rects = safe(probeRects)();
    if (has('winding')) R.winding = safe(probeWinding)(doc, scene);
    if (has('math')) R.math = safe(probeMath)();
    if (has('env')) R.env = safe(probeEnv)();
    if (has('integrity')) R.integrity = safe(probeIntegrity)();

    if (has('realms')) {
      var main = safe(realmDigest)(doc, scene);
      var res = await Promise.all([probeWorkerRealm(challenge.seed, S.SPEC_VERSION, workerUrl), probeIframeRealm(scene)]);
      R.realms = { main: main, worker: res[0], iframe: res[1] };
    }
    if (has('webgl')) {
      var c1 = safe(glCaps)(doc, 'webgl'), c2 = safe(glCaps)(doc, 'webgl2');
      if (has('glrender')) R.glrender = safe(glRender)(doc, scene, c2.st === OK ? c2 : c1);
      var strip = function (o) {
        if (!o || o.st !== OK) return o;
        var out = {}; for (var k in o) if (k[0] !== '_') out[k] = o[k];
        return out;
      };
      R.webgl = { v1: strip(c1), v2: strip(c2) };
      [c1, c2].forEach(function (caps) {
        if (!caps || caps.st !== OK || !caps._gl) return;
        try {
          var lose = caps._gl.getExtension('WEBGL_lose_context');
          if (lose) lose.loseContext();
        } catch (_) {}
      });
    }
    if (has('webgpu')) R.webgpu = await safe(probeWebGPU)(global);

    R.ms = Math.round(now() - t0);
    return R;
  }

  global.FPProbe = { run: run, VERSION: VERSION, BUILD: COLLECTOR_BUILD,
                     WORKER_BUILD: WORKER_BUILD, STACK: STACK_ID, TIERS: TIERS };
})(typeof self !== 'undefined' ? self : this);
