/**
 * DetectExpert Pro Extracted Script
 * Target: https://anti.bot/fp/v7/fp-scene.js?v=1328a45ec42b
 * Detected Engine: Unknown
 * Vectors Invoked: 
 */

/*!
 * fp-scene.js v3 — deterministic derivation AND the shared painters.
 *
 * Loaded verbatim by all three environments:
 *   browser  : <script src="/fp/fp-scene.js">      -> window.FPScene
 *   worker   : importScripts('/fp/fp-scene.js')    -> self.FPScene
 *   Node     : require('../public/fp-scene.js')    -> module.exports
 *
 * v2 CHANGES
 *  - The painters live here. In v1 they were duplicated in fp-probe.js and
 *    fp-worker.js, and the same compositing bug was duplicated with them.
 *  - PAINTERS NEVER TOUCH globalCompositeOperation OR globalAlpha.
 *    The v1 painter opened with `ctx.globalCompositeOperation='source-over'`,
 *    which silently cancelled the `difference` operator the self-difference
 *    probe had just set. Result: the invariant reported ~100% dirty pixels on
 *    every honest browser. Caller owns compositing state; painters only draw.
 *  - 128-bit seed (v1 used ~31 bits: birthday collisions around 46k challenges).
 *  - Samples are unique and stratified, each tagged with its class.
 *  - Tile plan and ROI mutation are derived here so both realms agree.
 *  - v3 winding points are labelled and kept away from every rectangle edge;
 *    the v2 random points hit boundaries and disagreed with isPointInPath().
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FPScene = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  var SPEC_VERSION = 3;

  /* ---------------- PRNG: sfc32, seeded with four uint32 ---------------- */
  function sfc32(a, b, c, d) {
    a |= 0; b |= 0; c |= 0; d |= 0;
    return function () {
      var t = (((a + b) | 0) + d) | 0;
      d = (d + 1) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  function fromSeed(seed) {
    var s = Array.isArray(seed) ? seed : [seed, 0x9e3779b9, 0x243f6a88, 0xb7e15162];
    var rnd = sfc32(s[0] >>> 0, s[1] >>> 0, s[2] >>> 0, s[3] >>> 0);
    for (var i = 0; i < 12; i++) rnd();   // discard warm-up
    return rnd;
  }
  function int(rnd, n) { return Math.floor(rnd() * n); }
  function pick(rnd, a) { return a[int(rnd, a.length)]; }

  /* ---------------- fixed vocabularies (bump SPEC on change) ---------------- */
  var WORDS = ['Cwm fjordbank glyphs', 'Sphinx of black quartz', 'Portez ce vieux whisky',
               'Съешь ещё этих мягких', 'これは日本語です', 'مرحبا بالعالم', 'नमस्ते दुनिया'];
  var EMOJI = ['\uD83D\uDE00', '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67',
               '\uD83C\uDDE6\uD83C\uDDEA', '\u2764\uFE0F', '\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08'];
  var FONTS = ['serif', 'sans-serif', 'monospace', 'system-ui', 'cursive'];
  var COMPOSITES = ['multiply', 'screen', 'overlay', 'lighten', 'color-burn'];

  // Rotate geometry as well as colours. A public challenge can always be
  // emulated, but a small versioned family catalog prevents cheap special
  // casing of one forever-fixed 480x320 grid. Every layout divides exactly.
  var EXACT_LAYOUTS = [
    { w: 384, h: 256, cols: 6, rows: 4 },
    { w: 448, h: 288, cols: 7, rows: 6 },
    { w: 480, h: 320, cols: 8, rows: 5 },
    { w: 512, h: 288, cols: 8, rows: 6 }
  ];
  var EN_W = 480, EN_H = 240;
  var SQ = 256;

  function derive(seed) {
    var rnd = fromSeed(seed);
    var layout = EXACT_LAYOUTS[int(rnd, EXACT_LAYOUTS.length)];
    var EX_W = layout.w, EX_H = layout.h, EX_COLS = layout.cols, EX_ROWS = layout.rows;
    var cw = EX_W / EX_COLS, ch = EX_H / EX_ROWS;

    var cells = [];
    for (var i = 0; i < EX_COLS * EX_ROWS; i++) {
      // Never emit pure black: it makes the self-difference invariant
      // indistinguishable from a canvas that was simply painted twice.
      cells.push([8 + int(rnd, 248), 8 + int(rnd, 248), 8 + int(rnd, 248)]);
    }

    var roi = { x: 8 + int(rnd, EX_W - 96), y: 8 + int(rnd, EX_H - 80),
                w: 24 + int(rnd, 40), h: 20 + int(rnd, 32) };
    do {
      roi.color = [8 + int(rnd, 248), 8 + int(rnd, 248), 8 + int(rnd, 248)];
    } while (cells.some(function (c) {
      return c[0] === roi.color[0] && c[1] === roi.color[1] && c[2] === roi.color[2];
    }));

    /* ----- stratified unique samples ----- */
    var seen = Object.create(null), samples = [];
    function add(off, cls) {
      off = off | 0;
      if (off < 0 || off >= EX_W * EX_H || seen[off]) return false;
      seen[off] = 1; samples.push({ off: off, cls: cls }); return true;
    }
    var grid = blockerGridOffsets(EX_W, EX_H), guard = 0;
    while (samples.filter(function (s) { return s.cls === 'grid'; }).length < 16 && guard++ < 500) {
      add(grid[int(rnd, grid.length)], 'grid');
    }
    guard = 0;
    while (samples.filter(function (s) { return s.cls === 'edge'; }).length < 20 && guard++ < 800) {
      // one pixel either side of a cell boundary: catches rounding drift
      var c = 1 + int(rnd, EX_COLS - 1), r = int(rnd, EX_ROWS);
      var ex = c * cw + (rnd() < 0.5 ? -1 : 0);
      var ey = r * ch + int(rnd, ch);
      add(ey * EX_W + ex, 'edge');
    }
    guard = 0;
    while (samples.filter(function (s) { return s.cls === 'roi'; }).length < 16 && guard++ < 800) {
      add((roi.y + int(rnd, roi.h)) * EX_W + roi.x + int(rnd, roi.w), 'roi');
    }
    guard = 0;
    while (samples.length < 96 && guard++ < 4000) {
      add(int(rnd, EX_W * EX_H), 'interior');
    }

    /* ----- tile plan with explicit overlaps ----- */
    var tiles = [], nx = 3 + int(rnd, 3), ny = 2 + int(rnd, 3);
    for (var ty = 0; ty < ny; ty++) {
      for (var tx = 0; tx < nx; tx++) {
        var x0 = Math.floor(tx * EX_W / nx), x1 = Math.floor((tx + 1) * EX_W / nx);
        var y0 = Math.floor(ty * EX_H / ny), y1 = Math.floor((ty + 1) * EX_H / ny);
        var ox = tx > 0 ? 2 + int(rnd, 6) : 0, oy = ty > 0 ? 2 + int(rnd, 6) : 0;
        tiles.push({ x: x0 - ox, y: y0 - oy, w: x1 - x0 + ox, h: y1 - y0 + oy });
      }
    }

    /* ----- entropy ops ----- */
    var ops = [];
    for (var k = 0; k < 14; k++) {
      var kind = int(rnd, 5);
      if (kind === 0) ops.push({ t: 'text', s: pick(rnd, WORDS), f: pick(rnd, FONTS),
        px: 12 + int(rnd, 34), x: int(rnd, EN_W - 40), y: 20 + int(rnd, EN_H - 24),
        c: [int(rnd, 256), int(rnd, 256), int(rnd, 256)], a: 0.3 + rnd() * 0.7 });
      else if (kind === 1) ops.push({ t: 'emoji', s: pick(rnd, EMOJI), px: 18 + int(rnd, 40),
        x: int(rnd, EN_W - 60), y: 30 + int(rnd, EN_H - 34) });
      else if (kind === 2) ops.push({ t: 'grad', x0: int(rnd, EN_W), y0: int(rnd, EN_H),
        x1: int(rnd, EN_W), y1: int(rnd, EN_H),
        c0: [int(rnd, 256), int(rnd, 256), int(rnd, 256)],
        c1: [int(rnd, 256), int(rnd, 256), int(rnd, 256)],
        w: 40 + int(rnd, 160), h: 20 + int(rnd, 80) });
      else if (kind === 3) ops.push({ t: 'arc', x: int(rnd, EN_W), y: int(rnd, EN_H),
        r: 8 + int(rnd, 50), sa: rnd() * 6.283, ea: rnd() * 6.283,
        c: [int(rnd, 256), int(rnd, 256), int(rnd, 256)], lw: 1 + int(rnd, 6),
        blur: int(rnd, 12), gco: pick(rnd, COMPOSITES) });
      else ops.push({ t: 'bez', x: int(rnd, EN_W), y: int(rnd, EN_H),
        cx1: int(rnd, EN_W), cy1: int(rnd, EN_H), cx2: int(rnd, EN_W), cy2: int(rnd, EN_H),
        ex: int(rnd, EN_W), ey: int(rnd, EN_H),
        c: [int(rnd, 256), int(rnd, 256), int(rnd, 256)], lw: 1 + int(rnd, 5) });
    }

    /* ----- winding: labelled points with deterministic ground truth.
            The regions are generated analytically, so every point is at least
            four CSS pixels from an edge and every class is guaranteed to
            exist. v2 used random points and disagreed with the browser when a
            point landed on a path boundary. */
    var rectA = { x: 20 + int(rnd, 20), y: 20 + int(rnd, 20),
                  w: 100 + int(rnd, 20), h: 100 + int(rnd, 20) };
    var dx = 35 + int(rnd, 20), dy = 35 + int(rnd, 20);
    var rectB = { x: rectA.x + dx, y: rectA.y + dy,
                  w: 100 + int(rnd, 20), h: 100 + int(rnd, 20) };
    var simplePts = [], complexPts = [], pointSeen = Object.create(null);
    function addPoint(cls, minX, maxX, minY, maxY) {
      if (minX > maxX || minY > maxY) throw new Error('invalid winding region: ' + cls);
      var guard = 0;
      while (guard++ < 1000) {
        var x = minX + int(rnd, maxX - minX + 1);
        var y = minY + int(rnd, maxY - minY + 1);
        var key = x + ':' + y;
        if (!pointSeen[key]) { pointSeen[key] = 1; simplePts.push({ x: x, y: y, cls: cls }); return; }
      }
      throw new Error('winding point uniqueness exhausted: ' + cls);
    }
    for (var wp = 0; wp < 10; wp++) {
      addPoint('outside', 4, SQ - 5, 4, rectA.y - 5);
      addPoint('a', rectA.x + 4, rectB.x - 5, rectA.y + 4, rectA.y + rectA.h - 5);
      addPoint('b', rectA.x + rectA.w + 4, rectB.x + rectB.w - 5,
               rectB.y + 4, rectB.y + rectB.h - 5);
      addPoint('overlap', rectB.x + 4, rectA.x + rectA.w - 5,
               rectB.y + 4, rectA.y + rectA.h - 5);
    }
    for (var cp = 0; cp < 40; cp++) complexPts.push([int(rnd, SQ), int(rnd, SQ)]);

    /* ----- GPU ----- */
    var gl = { tex: [], k: [rnd(), rnd(), rnd(), rnd()] };
    for (var tx2 = 0; tx2 < 8 * 8; tx2++) {
      gl.tex.push(int(rnd, 256), int(rnd, 256), int(rnd, 256), 255);
    }

    return {
      spec: SPEC_VERSION, seed: seed,
      exact: { w: EX_W, h: EX_H, cols: EX_COLS, rows: EX_ROWS, cells: cells },
      entropy: { w: EN_W, h: EN_H, ops: ops },
      square: SQ, roi: roi, samples: samples, tiles: tiles,
      winding: { rectA: rectA, rectB: rectB, simple: simplePts, complex: complexPts },
      gl: gl
    };
  }

  /* ================================================================== *
   * PAINTERS — pure drawing. No compositing or alpha state changes.
   * ================================================================== */
  function paintExact(ctx, scene) {
    var ex = scene.exact, cw = ex.w / ex.cols, ch = ex.h / ex.rows;
    for (var r = 0; r < ex.rows; r++) {
      for (var c = 0; c < ex.cols; c++) {
        var col = ex.cells[r * ex.cols + c];
        ctx.fillStyle = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
        ctx.fillRect(Math.round(c * cw), Math.round(r * ch), Math.round(cw), Math.round(ch));
      }
    }
  }

  /** The B side of the A/B differential probe: identical, plus one ROI rect. */
  function paintRoi(ctx, scene) {
    var roi = scene.roi;
    ctx.fillStyle = 'rgb(' + roi.color[0] + ',' + roi.color[1] + ',' + roi.color[2] + ')';
    ctx.fillRect(roi.x, roi.y, roi.w, roi.h);
  }

  function paintEntropy(ctx, scene) {
    var en = scene.entropy;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, en.w, en.h);
    for (var i = 0; i < en.ops.length; i++) {
      var o = en.ops[i];
      ctx.save();
      if (o.t === 'text') {
        ctx.globalAlpha = o.a; ctx.font = o.px + 'px ' + o.f;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = 'rgb(' + o.c.join(',') + ')';
        ctx.fillText(o.s, o.x, o.y);
      } else if (o.t === 'emoji') {
        ctx.font = o.px + 'px sans-serif'; ctx.fillText(o.s, o.x, o.y);
      } else if (o.t === 'grad') {
        var g = ctx.createLinearGradient(o.x0, o.y0, o.x1, o.y1);
        g.addColorStop(0, 'rgb(' + o.c0.join(',') + ')');
        g.addColorStop(1, 'rgb(' + o.c1.join(',') + ')');
        ctx.fillStyle = g; ctx.fillRect(o.x0, o.y0, o.w, o.h);
      } else if (o.t === 'arc') {
        ctx.globalCompositeOperation = o.gco;
        ctx.shadowBlur = o.blur; ctx.shadowColor = 'rgb(' + o.c.join(',') + ')';
        ctx.lineWidth = o.lw; ctx.strokeStyle = 'rgb(' + o.c.join(',') + ')';
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, o.sa, o.ea); ctx.stroke();
      } else {
        ctx.lineWidth = o.lw; ctx.strokeStyle = 'rgb(' + o.c.join(',') + ')';
        ctx.beginPath(); ctx.moveTo(o.x, o.y);
        ctx.bezierCurveTo(o.cx1, o.cy1, o.cx2, o.cy2, o.ex, o.ey); ctx.stroke();
      }
      ctx.restore();   // save/restore is scoped per-op, so the caller's
                       // compositing state survives the whole scene
    }
  }


  /** Canonical, readback-free TextMetrics signature shared by every realm. */
  function textMetricSignature(ctx) {
    var samples = [
      ['48px serif', 'Cwm fjordbank glyphs'],
      ['40px sans-serif', 'mmMwWLliI0O&1'],
      ['44px monospace', '\u00DD\u00FE{}[]|\\/@#$%']
    ];
    var fields = ['width', 'actualBoundingBoxLeft', 'actualBoundingBoxRight',
      'actualBoundingBoxAscent', 'actualBoundingBoxDescent',
      'fontBoundingBoxAscent', 'fontBoundingBoxDescent'];
    var out = [];
    ctx.direction = 'ltr';
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    for (var i = 0; i < samples.length; i++) {
      ctx.font = samples[i][0];
      var m = ctx.measureText(samples[i][1]);
      for (var j = 0; j < fields.length; j++) {
        var v = m[fields[j]];
        out.push(typeof v === 'number' && isFinite(v) ? String(Math.round(v * 1024) / 1024) : '-');
      }
    }
    return out.join('|');
  }

  /* ================================================================== *
   * Server-side ground truth
   * ================================================================== */
  function expectedPixel(scene, index, withRoi) {
    var ex = scene.exact, w = ex.w;
    var x = index % w, y = (index / w) | 0;
    if (withRoi) {
      var r = scene.roi;
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
        return [r.color[0], r.color[1], r.color[2], 255];
      }
    }
    var cw = w / ex.cols, chh = ex.h / ex.rows;
    var col = Math.min(ex.cols - 1, (x / cw) | 0);
    var row = Math.min(ex.rows - 1, (y / chh) | 0);
    var c = ex.cells[row * ex.cols + col];
    return [c[0], c[1], c[2], 255];
  }

  /** Closed-form winding results for the labelled rect-only points. */
  function expectedWinding(scene) {
    var nz = '', eo = '';
    for (var i = 0; i < scene.winding.simple.length; i++) {
      var cls = scene.winding.simple[i].cls;
      var inside = cls === 'a' || cls === 'b' || cls === 'overlap';
      var odd = cls === 'a' || cls === 'b';
      nz += inside ? '1' : '0';
      eo += odd ? '1' : '0';
    }
    return { nonzero: nz, evenodd: eo };
  }

  /** Pixels the Canvas-Blocker family perturbs: a coarse grid, not every pixel. */
  function blockerGridOffsets(w, h) {
    var out = [], di = Math.max(1, Math.floor(h / 10)), dj = Math.max(1, Math.floor(w / 10));
    for (var i = 0; i < h; i += di) for (var j = 0; j < w; j += dj) out.push(i * w + j);
    return out;
  }

  return {
    SPEC_VERSION: SPEC_VERSION, sfc32: sfc32, fromSeed: fromSeed,
    derive: derive, paintExact: paintExact, paintRoi: paintRoi, paintEntropy: paintEntropy,
    expectedPixel: expectedPixel, expectedWinding: expectedWinding,
    textMetricSignature: textMetricSignature, blockerGridOffsets: blockerGridOffsets
  };
});

