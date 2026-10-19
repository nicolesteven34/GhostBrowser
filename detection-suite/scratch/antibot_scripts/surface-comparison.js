/*
 * Deterministic Canvas2D / WebGL1 / WebGL2 surface comparison.
 *
 * The scene is described as normalized vector triangles and rendered at a
 * fixed canonical resolution.  A fixed resolution is intentional: CSS may
 * scale the preview on any device without changing the fingerprint input.
 * Rendering uses no font, image or third-party dependency. A bounded, signed
 * first-party summary is submitted after the local comparison completes.
 */
(function surfaceComparisonModule(root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root && root.document) {
    root.AntibotSurfaceComparison = api;
    api.installAutoStart();
  }
})(
  typeof window !== 'undefined'
    ? window
    : (typeof globalThis !== 'undefined' ? globalThis : this),
  function createSurfaceComparisonApi(root) {
    'use strict';

    const VERSION = '1.0.0';
    const DEFAULT_SEED = 'anti.bot/surface-comparison/v1';
    const WIDTH = 192;
    const HEIGHT = 108;
    const REPEAT_COUNT = 2;
    const MAX_WIDTH = 256;
    const MAX_HEIGHT = 144;
    const MAX_REPEATS = 3;
    const EVENT_NAME = 'antibot:surface-comparison-ready';
    const STATE_KEY = '__ANTIBOT_SURFACE_COMPARISON__';
    const PROMISE_KEY = '__ANTIBOT_SURFACE_COMPARISON_PROMISE__';
    const SURFACE_NAMES = Object.freeze(['Canvas2D', 'WebGL1', 'WebGL2']);

    const DOM_IDS = Object.freeze({
      status: 'surface-comparison-status',
      summary: 'surface-comparison-summary',
      json: 'surface-comparison-json',
      surfaces: Object.freeze({
        Canvas2D: Object.freeze({
          preview: 'surface-canvas2d-preview',
          hash: 'surface-canvas2d-hash',
          dHash: 'surface-canvas2d-dhash',
          stability: 'surface-canvas2d-stability',
          alpha: 'surface-canvas2d-alpha',
          duration: 'surface-canvas2d-duration',
        }),
        WebGL1: Object.freeze({
          preview: 'surface-webgl1-preview',
          hash: 'surface-webgl1-hash',
          dHash: 'surface-webgl1-dhash',
          stability: 'surface-webgl1-stability',
          alpha: 'surface-webgl1-alpha',
          duration: 'surface-webgl1-duration',
        }),
        WebGL2: Object.freeze({
          preview: 'surface-webgl2-preview',
          hash: 'surface-webgl2-hash',
          dHash: 'surface-webgl2-dhash',
          stability: 'surface-webgl2-stability',
          alpha: 'surface-webgl2-alpha',
          duration: 'surface-webgl2-duration',
        }),
      }),
      pairs: Object.freeze({
        'Canvas2D/WebGL1': 'surface-canvas2d-webgl1-match',
        'Canvas2D/WebGL2': 'surface-canvas2d-webgl2-match',
        'WebGL1/WebGL2': 'surface-webgl1-webgl2-match',
      }),
    });

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function round(value, places) {
      if (!Number.isFinite(value)) return null;
      const multiplier = 10 ** (places == null ? 4 : places);
      return Math.round(value * multiplier) / multiplier;
    }

    function now() {
      if (root && root.performance && typeof root.performance.now === 'function') {
        return root.performance.now();
      }
      return Date.now();
    }

    function fnv1a(text) {
      let value = 0x811c9dc5;
      const input = String(text);
      for (let index = 0; index < input.length; index += 1) {
        value ^= input.charCodeAt(index);
        value = Math.imul(value, 0x01000193);
      }
      return value >>> 0;
    }

    function makePrng(seed) {
      let state = fnv1a(seed) || 0x9e3779b9;
      return function random() {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 0x100000000;
      };
    }

    function ephemeralSeed() {
      try {
        const words = new Uint32Array(4);
        root.crypto.getRandomValues(words);
        return `anti.bot/surface/v2/${Array.from(words, value =>
          value.toString(16).padStart(8, '0')).join('')}`;
      } catch (_) {
        return `${DEFAULT_SEED}/${Date.now().toString(16)}/${Math.random().toString(16).slice(2)}`;
      }
    }

    function triangle(color, a, b, c) {
      return Object.freeze({
        color: Object.freeze(color.slice(0, 4)),
        points: Object.freeze([
          Object.freeze(a.slice(0, 2)),
          Object.freeze(b.slice(0, 2)),
          Object.freeze(c.slice(0, 2)),
        ]),
      });
    }

    function addRectangle(target, color, left, top, right, bottom) {
      target.push(triangle(color, [left, top], [right, top], [right, bottom]));
      target.push(triangle(color, [left, top], [right, bottom], [left, bottom]));
    }

    function addRing(target, color, centerX, centerY, innerRadius, outerRadius, segments) {
      for (let index = 0; index < segments; index += 1) {
        const first = (index / segments) * Math.PI * 2;
        const second = ((index + 1) / segments) * Math.PI * 2;
        const outerA = [
          centerX + Math.cos(first) * outerRadius,
          centerY + Math.sin(first) * outerRadius,
        ];
        const outerB = [
          centerX + Math.cos(second) * outerRadius,
          centerY + Math.sin(second) * outerRadius,
        ];
        const innerA = [
          centerX + Math.cos(first) * innerRadius,
          centerY + Math.sin(first) * innerRadius,
        ];
        const innerB = [
          centerX + Math.cos(second) * innerRadius,
          centerY + Math.sin(second) * innerRadius,
        ];
        target.push(triangle(color, outerA, outerB, innerB));
        target.push(triangle(color, outerA, innerB, innerA));
      }
    }

    /*
     * Every point is normalized to the [0, 1] viewport.  The same immutable
     * scene object is passed to all three renderers.
     */
    function createScene(seed) {
      const normalizedSeed = String(seed || DEFAULT_SEED);
      const random = makePrng(normalizedSeed);
      const triangles = [];
      const navy = [7, 18, 32, 255];
      const navyRaised = [11, 30, 48, 255];
      const cyan = [30, 224, 218, 255];
      const cyanDim = [16, 111, 124, 255];
      const amber = [255, 183, 38, 255];
      const amberDim = [128, 82, 12, 255];

      addRectangle(triangles, navy, 0.025, 0.045, 0.975, 0.955);
      addRectangle(triangles, navyRaised, 0.055, 0.09, 0.945, 0.91);

      addRing(triangles, cyanDim, 0.34, 0.5, 0.19, 0.23, 20);
      addRing(triangles, cyan, 0.34, 0.5, 0.205, 0.218, 20);

      // Seeded triangular facets make the challenge non-trivial while all
      // coordinates and colors remain deterministic and renderer-independent.
      for (let index = 0; index < 14; index += 1) {
        const angle = random() * Math.PI * 2;
        const radius = 0.025 + random() * 0.15;
        const cx = 0.34 + Math.cos(angle) * radius;
        const cy = 0.5 + Math.sin(angle) * radius;
        const size = 0.018 + random() * 0.038;
        const color = index % 4 === 0 ? cyan : cyanDim;
        triangles.push(triangle(
          color,
          [clamp(cx, 0.08, 0.58), clamp(cy - size, 0.16, 0.84)],
          [clamp(cx + size, 0.08, 0.58), clamp(cy + size, 0.16, 0.84)],
          [clamp(cx - size, 0.08, 0.58), clamp(cy + size * 0.72, 0.16, 0.84)]
        ));
      }

      // A route and compact signal bars use exactly the same tessellated
      // vector primitives in Canvas2D and WebGL.
      triangles.push(triangle(amber, [0.49, 0.48], [0.69, 0.33], [0.67, 0.39]));
      triangles.push(triangle(amber, [0.49, 0.48], [0.67, 0.39], [0.51, 0.53]));
      triangles.push(triangle(amberDim, [0.66, 0.39], [0.87, 0.57], [0.83, 0.61]));
      triangles.push(triangle(amberDim, [0.66, 0.39], [0.83, 0.61], [0.63, 0.45]));

      for (let index = 0; index < 5; index += 1) {
        const left = 0.69 + index * 0.045;
        const height = 0.08 + index * 0.045;
        addRectangle(triangles, index === 4 ? amber : cyanDim, left, 0.82 - height, left + 0.024, 0.82);
      }

      return Object.freeze({
        seed: normalizedSeed,
        primitive: 'normalized-vector-triangles',
        triangles: Object.freeze(triangles.slice()),
      });
    }

    function colorCss(color) {
      return `rgba(${color[0]},${color[1]},${color[2]},${color[3] / 255})`;
    }

    function makeCanvas(width, height) {
      if (!root || !root.document || typeof root.document.createElement !== 'function') {
        throw new Error('document.createElement is unavailable');
      }
      const canvas = root.document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }

    function copyPixels(value) {
      return new Uint8Array(value.buffer.slice(
        value.byteOffset,
        value.byteOffset + value.byteLength
      ));
    }

    function createCanvas2dRenderer(scene, width, height) {
      const canvas = makeCanvas(width, height);
      const context = canvas.getContext('2d', {
        alpha: true,
        colorSpace: 'srgb',
        willReadFrequently: true,
      });
      if (!context || typeof context.getImageData !== 'function') {
        throw new Error('Canvas2D is unavailable');
      }
      context.imageSmoothingEnabled = false;

      return {
        canvas,
        render() {
          context.clearRect(0, 0, width, height);

          // Batch equal colors into one path.  This prevents artificial seams
          // between the two triangles used to tessellate a rectangle.
          const byColor = new Map();
          scene.triangles.forEach((item) => {
            const key = item.color.join(',');
            if (!byColor.has(key)) byColor.set(key, []);
            byColor.get(key).push(item);
          });

          byColor.forEach((items) => {
            context.beginPath();
            items.forEach((item) => {
              context.moveTo(item.points[0][0] * width, item.points[0][1] * height);
              context.lineTo(item.points[1][0] * width, item.points[1][1] * height);
              context.lineTo(item.points[2][0] * width, item.points[2][1] * height);
              context.closePath();
            });
            context.fillStyle = colorCss(items[0].color);
            context.fill('nonzero');
          });

          return copyPixels(context.getImageData(0, 0, width, height).data);
        },
        dispose() {},
      };
    }

    function compileShader(gl, type, source) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Unable to create WebGL shader');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || 'WebGL shader compilation failed';
        gl.deleteShader(shader);
        throw new Error(message.slice(0, 240));
      }
      return shader;
    }

    function createWebglRenderer(version, scene, width, height) {
      const canvas = makeCanvas(width, height);
      const contextNames = version === 2 ? ['webgl2'] : ['webgl', 'experimental-webgl'];
      const options = {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
        desynchronized: false,
        powerPreference: 'default',
      };
      let gl = null;
      for (const contextName of contextNames) {
        gl = canvas.getContext(contextName, options);
        if (gl) break;
      }
      if (!gl) throw new Error(`WebGL${version} is unavailable`);

      const vertexSource = version === 2
        ? `#version 300 es
          in vec2 a_position;
          in vec4 a_color;
          out lowp vec4 v_color;
          void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_color = a_color;
          }`
        : `attribute vec2 a_position;
          attribute vec4 a_color;
          varying lowp vec4 v_color;
          void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_color = a_color;
          }`;
      const fragmentSource = version === 2
        ? `#version 300 es
          precision mediump float;
          in lowp vec4 v_color;
          out vec4 out_color;
          void main() {
            out_color = v_color;
          }`
        : `precision mediump float;
          varying lowp vec4 v_color;
          void main() {
            gl_FragColor = v_color;
          }`;

      const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
      const program = gl.createProgram();
      if (!program) throw new Error('Unable to create WebGL program');
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error((gl.getProgramInfoLog(program) || 'WebGL link failed').slice(0, 240));
      }

      const floatsPerVertex = 6;
      const values = new Float32Array(scene.triangles.length * 3 * floatsPerVertex);
      let offset = 0;
      scene.triangles.forEach((item) => {
        item.points.forEach((point) => {
          values[offset] = point[0] * 2 - 1;
          values[offset + 1] = 1 - point[1] * 2;
          values[offset + 2] = item.color[0] / 255;
          values[offset + 3] = item.color[1] / 255;
          values[offset + 4] = item.color[2] / 255;
          values[offset + 5] = item.color[3] / 255;
          offset += floatsPerVertex;
        });
      });

      const buffer = gl.createBuffer();
      if (!buffer) throw new Error('Unable to create WebGL buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
      gl.useProgram(program);

      const positionLocation = gl.getAttribLocation(program, 'a_position');
      const colorLocation = gl.getAttribLocation(program, 'a_color');
      if (positionLocation < 0 || colorLocation < 0) {
        throw new Error('WebGL attribute lookup failed');
      }
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, floatsPerVertex * 4, 0);
      gl.enableVertexAttribArray(colorLocation);
      gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, floatsPerVertex * 4, 2 * 4);
      gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.DITHER);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);

      function topDownPixels() {
        const bottomUp = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bottomUp);
        const topDown = new Uint8Array(bottomUp.length);
        const rowSize = width * 4;
        for (let row = 0; row < height; row += 1) {
          const sourceOffset = (height - row - 1) * rowSize;
          topDown.set(bottomUp.subarray(sourceOffset, sourceOffset + rowSize), row * rowSize);
        }
        return topDown;
      }

      return {
        canvas,
        render() {
          if (typeof gl.isContextLost === 'function' && gl.isContextLost()) {
            throw new Error(`WebGL${version} context was lost`);
          }
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLES, 0, scene.triangles.length * 3);
          gl.finish();
          return topDownPixels();
        },
        dispose() {
          gl.deleteBuffer(buffer);
          gl.deleteProgram(program);
          gl.deleteShader(vertexShader);
          gl.deleteShader(fragmentShader);
          const loseContext = gl.getExtension('WEBGL_lose_context');
          if (loseContext && typeof loseContext.loseContext === 'function') {
            loseContext.loseContext();
          }
          gl = null;
        },
      };
    }

    function rotr(value, bits) {
      return (value >>> bits) | (value << (32 - bits));
    }

    // Synchronous SHA-256 keeps the required exact hash available even when
    // SubtleCrypto is blocked by an unusual browser policy.
    function sha256Hex(input) {
      const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
      const bitLength = bytes.length * 8;
      const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
      const data = new Uint8Array(paddedLength);
      data.set(bytes);
      data[bytes.length] = 0x80;
      const view = new DataView(data.buffer);
      const high = Math.floor(bitLength / 0x100000000);
      const low = bitLength >>> 0;
      view.setUint32(paddedLength - 8, high, false);
      view.setUint32(paddedLength - 4, low, false);

      let h0 = 0x6a09e667;
      let h1 = 0xbb67ae85;
      let h2 = 0x3c6ef372;
      let h3 = 0xa54ff53a;
      let h4 = 0x510e527f;
      let h5 = 0x9b05688c;
      let h6 = 0x1f83d9ab;
      let h7 = 0x5be0cd19;
      const constants = new Uint32Array([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
      ]);
      const words = new Uint32Array(64);

      for (let chunk = 0; chunk < data.length; chunk += 64) {
        for (let index = 0; index < 16; index += 1) {
          words[index] = view.getUint32(chunk + index * 4, false);
        }
        for (let index = 16; index < 64; index += 1) {
          const x = words[index - 15];
          const y = words[index - 2];
          const sigma0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
          const sigma1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
          words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
        }

        let a = h0;
        let b = h1;
        let c = h2;
        let d = h3;
        let e = h4;
        let f = h5;
        let g = h6;
        let h = h7;
        for (let index = 0; index < 64; index += 1) {
          const sum1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
          const choice = (e & f) ^ (~e & g);
          const temp1 = (h + sum1 + choice + constants[index] + words[index]) >>> 0;
          const sum0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
          const majority = (a & b) ^ (a & c) ^ (b & c);
          const temp2 = (sum0 + majority) >>> 0;
          h = g;
          g = f;
          f = e;
          e = (d + temp1) >>> 0;
          d = c;
          c = b;
          b = a;
          a = (temp1 + temp2) >>> 0;
        }
        h0 = (h0 + a) >>> 0;
        h1 = (h1 + b) >>> 0;
        h2 = (h2 + c) >>> 0;
        h3 = (h3 + d) >>> 0;
        h4 = (h4 + e) >>> 0;
        h5 = (h5 + f) >>> 0;
        h6 = (h6 + g) >>> 0;
        h7 = (h7 + h) >>> 0;
      }

      return [h0, h1, h2, h3, h4, h5, h6, h7]
        .map((value) => value.toString(16).padStart(8, '0'))
        .join('');
    }

    function luma(pixels, width, height, sampleX, sampleY) {
      const x = clamp(Math.floor(sampleX), 0, width - 1);
      const y = clamp(Math.floor(sampleY), 0, height - 1);
      const offset = (y * width + x) * 4;
      const alpha = pixels[offset + 3] / 255;
      return (
        pixels[offset] * 0.2126
        + pixels[offset + 1] * 0.7152
        + pixels[offset + 2] * 0.0722
      ) * alpha;
    }

    function dHash(pixels, width, height) {
      if (!(pixels instanceof Uint8Array) || pixels.length !== width * height * 4) {
        throw new Error('dHash received an invalid RGBA buffer');
      }
      let result = '';
      let nibble = 0;
      let bits = 0;
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const sampleY = ((y + 0.5) / 8) * height;
          const left = luma(pixels, width, height, ((x + 0.5) / 9) * width, sampleY);
          const right = luma(pixels, width, height, ((x + 1.5) / 9) * width, sampleY);
          nibble = (nibble << 1) | (left > right ? 1 : 0);
          bits += 1;
          if (bits === 4) {
            result += nibble.toString(16);
            nibble = 0;
            bits = 0;
          }
        }
      }
      return result.padStart(16, '0');
    }

    function hammingHex(first, second) {
      if (typeof first !== 'string' || typeof second !== 'string' || first.length !== second.length) {
        return null;
      }
      const counts = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
      let distance = 0;
      for (let index = 0; index < first.length; index += 1) {
        const a = Number.parseInt(first[index], 16);
        const b = Number.parseInt(second[index], 16);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
        distance += counts[a ^ b];
      }
      return distance;
    }

    function pixelMetrics(first, second) {
      if (!(first instanceof Uint8Array)
          || !(second instanceof Uint8Array)
          || first.length !== second.length
          || first.length === 0) {
        return null;
      }
      let absolute = 0;
      let squared = 0;
      let maxChannelDelta = 0;
      let differentPixels = 0;
      for (let offset = 0; offset < first.length; offset += 4) {
        let pixelDifferent = false;
        for (let channel = 0; channel < 4; channel += 1) {
          const difference = Math.abs(first[offset + channel] - second[offset + channel]);
          absolute += difference;
          squared += difference * difference;
          if (difference > maxChannelDelta) maxChannelDelta = difference;
          if (difference !== 0) pixelDifferent = true;
        }
        if (pixelDifferent) differentPixels += 1;
      }
      const channels = first.length;
      const pixels = first.length / 4;
      return {
        mae: round(absolute / channels, 4),
        rmse: round(Math.sqrt(squared / channels), 4),
        maxChannelDelta,
        differentPixels,
        differentPixelRatio: round(differentPixels / pixels, 6),
      };
    }

    function alphaCoverage(pixels) {
      if (!(pixels instanceof Uint8Array) || pixels.length === 0) return null;
      let visible = 0;
      let opaque = 0;
      const count = pixels.length / 4;
      for (let offset = 3; offset < pixels.length; offset += 4) {
        if (pixels[offset] > 0) visible += 1;
        if (pixels[offset] === 255) opaque += 1;
      }
      return {
        visibleRatio: round(visible / count, 6),
        opaqueRatio: round(opaque / count, 6),
      };
    }

    function classifyPair(input) {
      if (!input || input.available === false) {
        return {
          label: 'unavailable',
          explanation: 'One or both rendering surfaces are unavailable.',
        };
      }
      if (input.hashA && input.hashA === input.hashB) {
        return {
          label: 'exact',
          explanation: 'SHA-256 hashes of the canonical RGBA buffers are identical.',
        };
      }
      const hamming = input.dhashHamming;
      const metrics = input.metrics;
      if (metrics
          && Number.isFinite(hamming)
          && hamming <= 8
          && metrics.mae <= 8
          && metrics.rmse <= 16) {
        return {
          label: 'near',
          explanation: 'Perceptual and pixel deltas are within the documented near-match limits.',
        };
      }
      return {
        label: 'different',
        explanation: 'The canonical RGBA outputs differ beyond the near-match limits.',
      };
    }

    function publicError(error) {
      const message = error && error.message ? String(error.message) : String(error || 'unknown error');
      return message.replace(/[\r\n\t]+/g, ' ').slice(0, 240);
    }

    async function analyzeSurface(name, createRenderer, width, height, repeatCount) {
      let renderer = null;
      const started = now();
      try {
        renderer = createRenderer();
        const initializationMs = now() - started;
        const samples = [];
        const pixelBuffers = [];
        for (let index = 0; index < repeatCount; index += 1) {
          const renderStarted = now();
          const pixels = renderer.render();
          const renderReadbackMs = now() - renderStarted;
          if (!(pixels instanceof Uint8Array) || pixels.length !== width * height * 4) {
            throw new Error(`${name} returned an invalid RGBA buffer`);
          }
          pixelBuffers.push(pixels);
          samples.push({
            sha256: sha256Hex(pixels),
            dHash: dHash(pixels, width, height),
            alphaCoverage: alphaCoverage(pixels),
            renderReadbackMs: round(renderReadbackMs, 3),
          });
        }

        let maximumRepeatMae = 0;
        let maximumRepeatRmse = 0;
        let maximumRepeatHamming = 0;
        for (let index = 1; index < pixelBuffers.length; index += 1) {
          const metrics = pixelMetrics(pixelBuffers[0], pixelBuffers[index]);
          maximumRepeatMae = Math.max(maximumRepeatMae, metrics.mae);
          maximumRepeatRmse = Math.max(maximumRepeatRmse, metrics.rmse);
          maximumRepeatHamming = Math.max(
            maximumRepeatHamming,
            hammingHex(samples[0].dHash, samples[index].dHash)
          );
        }
        const hashes = new Set(samples.map((sample) => sample.sha256));
        const stabilityLabel = hashes.size === 1
          ? 'exact'
          : (maximumRepeatHamming <= 2 && maximumRepeatMae <= 1 ? 'near' : 'unstable');
        const durations = samples.map((sample) => sample.renderReadbackMs);

        return {
          result: {
            name,
            available: true,
            sha256: samples[0].sha256,
            dHash: samples[0].dHash,
            alphaCoverage: samples[0].alphaCoverage,
            performance: {
              initializationMs: round(initializationMs, 3),
              renderReadbackMs: {
                min: round(Math.min(...durations), 3),
                median: round(durations.slice().sort((a, b) => a - b)[Math.floor(durations.length / 2)], 3),
                max: round(Math.max(...durations), 3),
              },
            },
            repeatStability: {
              label: stabilityLabel,
              repeats: repeatCount,
              uniqueExactHashes: hashes.size,
              maximumDHashHamming: maximumRepeatHamming,
              maximumPixelMae: round(maximumRepeatMae, 4),
              maximumPixelRmse: round(maximumRepeatRmse, 4),
            },
          },
          pixels: pixelBuffers[0],
        };
      } catch (error) {
        return {
          result: {
            name,
            available: false,
            error: publicError(error),
            repeatStability: {
              label: 'unavailable',
              repeats: 0,
            },
          },
          pixels: null,
        };
      } finally {
        if (renderer && typeof renderer.dispose === 'function') {
          try {
            renderer.dispose();
          } catch (_) {
            // Disposal must not turn a completed measurement into a failure.
          }
        }
      }
    }

    function compareSurfaces(first, second, firstPixels, secondPixels) {
      const available = Boolean(
        first && first.available && second && second.available && firstPixels && secondPixels
      );
      if (!available) {
        return {
          pair: `${first ? first.name : 'unknown'}/${second ? second.name : 'unknown'}`,
          available: false,
          label: 'unavailable',
          explanation: 'One or both rendering surfaces are unavailable.',
          sha256Exact: false,
          dHashHamming: null,
          pixel: null,
        };
      }
      const metrics = pixelMetrics(firstPixels, secondPixels);
      const hamming = hammingHex(first.dHash, second.dHash);
      const classification = classifyPair({
        available: true,
        hashA: first.sha256,
        hashB: second.sha256,
        dhashHamming: hamming,
        metrics,
      });
      return {
        pair: `${first.name}/${second.name}`,
        available: true,
        label: classification.label,
        explanation: classification.explanation,
        sha256Exact: first.sha256 === second.sha256,
        dHashHamming: hamming,
        pixel: metrics,
      };
    }

    function setText(documentRef, id, value) {
      const element = documentRef.getElementById(id);
      if (!element) return;
      const text = value == null ? '—' : String(value);
      if ('value' in element && /^(OUTPUT|TEXTAREA|INPUT)$/.test(element.tagName || '')) {
        element.value = text;
      } else {
        element.textContent = text;
      }
    }

    function drawPreview(documentRef, id, pixels, width, height) {
      const canvas = documentRef.getElementById(id);
      if (!canvas || typeof canvas.getContext !== 'function' || !pixels) return;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: true });
      if (!context || typeof context.putImageData !== 'function') return;
      const bytes = new Uint8ClampedArray(pixels);
      let imageData;
      if (typeof root.ImageData === 'function') {
        imageData = new root.ImageData(bytes, width, height);
      } else {
        imageData = context.createImageData(width, height);
        imageData.data.set(bytes);
      }
      context.putImageData(imageData, 0, 0);
    }

    function renderIntoDom(state, representativePixels) {
      if (!root || !root.document) return;
      const documentRef = root.document;
      setText(documentRef, DOM_IDS.status, state.status);

      const pairSummary = state.comparisons
        .map((comparison) => `${comparison.pair}: ${comparison.label}`)
        .join(' · ');
      setText(documentRef, DOM_IDS.summary, pairSummary);

      state.surfaces.forEach((surface) => {
        const ids = DOM_IDS.surfaces[surface.name];
        if (!ids) return;
        setText(documentRef, ids.hash, surface.sha256 || 'unavailable');
        setText(documentRef, ids.dHash, surface.dHash || 'unavailable');
        setText(documentRef, ids.stability, surface.repeatStability.label);
        setText(
          documentRef,
          ids.alpha,
          surface.alphaCoverage ? `${round(surface.alphaCoverage.visibleRatio * 100, 2)}%` : 'unavailable'
        );
        setText(
          documentRef,
          ids.duration,
          surface.performance ? `${surface.performance.renderReadbackMs.median} ms` : 'unavailable'
        );
        drawPreview(
          documentRef,
          ids.preview,
          representativePixels[surface.name],
          state.challenge.width,
          state.challenge.height
        );
      });

      state.comparisons.forEach((comparison) => {
        setText(documentRef, DOM_IDS.pairs[comparison.pair], comparison.label);
      });
      setText(documentRef, DOM_IDS.json, JSON.stringify(state, null, 2));
    }

    async function run(options) {
      const settings = options || {};
      const width = clamp(Number(settings.width) || WIDTH, 1, MAX_WIDTH);
      const height = clamp(Number(settings.height) || HEIGHT, 1, MAX_HEIGHT);
      const repeatCount = clamp(Number(settings.repeatCount) || REPEAT_COUNT, 1, MAX_REPEATS);
      const seed = String(settings.seed || DEFAULT_SEED);
      const scene = createScene(seed);
      const startedAt = new Date().toISOString();
      const started = now();

      const canvas2d = await analyzeSurface(
        'Canvas2D',
        () => createCanvas2dRenderer(scene, width, height),
        width,
        height,
        repeatCount
      );
      const webgl1 = await analyzeSurface(
        'WebGL1',
        () => createWebglRenderer(1, scene, width, height),
        width,
        height,
        repeatCount
      );
      const webgl2 = await analyzeSurface(
        'WebGL2',
        () => createWebglRenderer(2, scene, width, height),
        width,
        height,
        repeatCount
      );
      const analyzed = [canvas2d, webgl1, webgl2];
      const surfaces = analyzed.map((item) => item.result);
      const byName = Object.fromEntries(analyzed.map((item) => [item.result.name, item]));
      const comparisons = [
        compareSurfaces(
          byName.Canvas2D.result,
          byName.WebGL1.result,
          byName.Canvas2D.pixels,
          byName.WebGL1.pixels
        ),
        compareSurfaces(
          byName.Canvas2D.result,
          byName.WebGL2.result,
          byName.Canvas2D.pixels,
          byName.WebGL2.pixels
        ),
        compareSurfaces(
          byName.WebGL1.result,
          byName.WebGL2.result,
          byName.WebGL1.pixels,
          byName.WebGL2.pixels
        ),
      ];
      const availableCount = surfaces.filter((surface) => surface.available).length;
      const state = {
        version: VERSION,
        status: availableCount === surfaces.length
          ? 'complete'
          : (availableCount > 0 ? 'partial' : 'unavailable'),
        startedAt,
        completedAt: new Date().toISOString(),
        totalRuntimeMs: round(now() - started, 3),
        challenge: {
          seed,
          scenePrimitive: scene.primitive,
          triangleCount: scene.triangles.length,
          width,
          height,
          repeatCount,
          canonicalResolution: true,
          cssPreviewMayScale: true,
        },
        surfaces,
        comparisons,
        thresholds: {
          near: {
            maximumDHashHamming: 8,
            maximumPixelMae: 8,
            maximumPixelRmse: 16,
          },
        },
      };
      const representativePixels = Object.fromEntries(
        analyzed.map((item) => [item.result.name, item.pixels])
      );
      renderIntoDom(state, representativePixels);
      return state;
    }

    function evidenceSummary(state) {
      const source = state && typeof state === 'object' ? state : {};
      return {
        version: String(source.version || VERSION).slice(0, 24),
        status: String(source.status || 'unavailable').slice(0, 24),
        challenge: {
          width: Number(source.challenge && source.challenge.width) || null,
          height: Number(source.challenge && source.challenge.height) || null,
          repeat_count: Number(source.challenge && source.challenge.repeatCount) || 0,
          canonical_resolution: source.challenge && source.challenge.canonicalResolution === true,
        },
        surfaces: (Array.isArray(source.surfaces) ? source.surfaces : []).slice(0, 3).map((surface) => ({
          name: String(surface && surface.name || '').slice(0, 24),
          available: !!(surface && surface.available),
          sha256: /^[a-f0-9]{64}$/i.test(String(surface && surface.sha256 || ''))
            ? String(surface.sha256).toLowerCase() : null,
          dhash: /^[a-f0-9]{16}$/i.test(String(surface && surface.dHash || ''))
            ? String(surface.dHash).toLowerCase() : null,
          repeat_stability: String(surface && surface.repeatStability &&
            surface.repeatStability.label || 'unavailable').slice(0, 24),
          repeats: Number(surface && surface.repeatStability && surface.repeatStability.repeats) || 0,
          unique_exact_hashes: Number(surface && surface.repeatStability &&
            surface.repeatStability.uniqueExactHashes) || 0,
          maximum_dhash_hamming: Number(surface && surface.repeatStability &&
            surface.repeatStability.maximumDHashHamming) || 0,
          error_class: surface && !surface.available ? 'surface-unavailable' : null,
        })),
        comparisons: (Array.isArray(source.comparisons) ? source.comparisons : []).slice(0, 3)
          .map((comparison) => ({
            pair: String(comparison && comparison.pair || '').slice(0, 48),
            available: !!(comparison && comparison.available),
            label: String(comparison && comparison.label || 'unavailable').slice(0, 24),
            dhash_hamming: Number.isFinite(Number(comparison && comparison.dHashHamming))
              ? Number(comparison.dHashHamming) : null,
          })),
      };
    }

    async function submitEvidence(state) {
      if (!root) return false;
      try {
        if (typeof root.awaitAntibotSession === 'function') {
          await Promise.race([
            root.awaitAntibotSession(1800),
            new Promise((resolve) => setTimeout(resolve, 1850)),
          ]);
        }
      } catch (_) {}
      // This module autostarts at DOM ready and can beat the signed transport
      // bootstrap. Wait a bounded interval instead of permanently dropping the
      // page-load result because apisig was a few frames late.
      const transportDeadline = Date.now() + 2200;
      while ((!root.apisig || typeof root.apisig.signedFetch !== 'function') &&
             Date.now() < transportDeadline) {
        await new Promise((resolve) => root.setTimeout(resolve, 50));
      }
      if (!root.apisig || typeof root.apisig.signedFetch !== 'function') return false;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const controller = typeof root.AbortController === 'function'
          ? new root.AbortController() : null;
        let timer = null;
        try {
          const timeoutMs = 2600 + (attempt * 500);
          const request = root.apisig.signedFetch('/api/antispoof-results', {
              method: 'POST',
              credentials: 'same-origin',
              cache: 'no-store',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ surface_comparison: evidenceSummary(state) }),
              signal: controller ? controller.signal : undefined,
              retryCount: 0,
            });
          const response = await Promise.race([
            request,
            new Promise((_, reject) => {
              timer = root.setTimeout(() => {
                try { if (controller) controller.abort(); } catch (_) {}
                const error = new Error('surface evidence submit timeout');
                error.name = 'TimeoutError';
                reject(error);
              }, timeoutMs);
            }),
          ]);
          if (response && response.ok) return true;
          if (!response || ![408, 425, 429, 500, 502, 503, 504].includes(response.status)) return false;
        } catch (_) {
          if (attempt >= 1) return false;
        } finally {
          if (timer) root.clearTimeout(timer);
        }
        await new Promise((resolve) => root.setTimeout(resolve, 250));
      }
      return false;
    }

    function dispatchReady(state, serverStored) {
      if (!root || typeof root.dispatchEvent !== 'function') return;
      try {
        const CustomEventConstructor = root.CustomEvent;
        if (typeof CustomEventConstructor === 'function') {
          root.dispatchEvent(new CustomEventConstructor(EVENT_NAME, { detail: state }));
          const surfaces = Array.isArray(state && state.surfaces) ? state.surfaces : [];
          const assessed = surfaces.filter(surface => surface.available === true).length;
          const conflicts = surfaces.filter(surface =>
            surface.available === true && surface.repeatStability &&
            surface.repeatStability.label === 'unstable').length;
          root.dispatchEvent(new CustomEventConstructor('antibot:fingerprint-evidence-ready', {
            detail:{
              family:'surface-comparison',
              state:serverStored
                ? (conflicts ? 'inconclusive' : (assessed ? 'pass' : 'unavailable'))
                : 'unavailable',
              assessed_count:serverStored ? assessed : 0,
              conflict_count:0,
              ts:Date.now(),
            },
          }));
        }
      } catch (_) {
        // State remains available on window if custom events are restricted.
      }
    }

    function startOnce() {
      if (!root) return Promise.resolve(null);
      if (root[PROMISE_KEY]) return root[PROMISE_KEY];
      root[STATE_KEY] = {
        version: VERSION,
        status: 'running',
        startedAt: new Date().toISOString(),
      };
      root[PROMISE_KEY] = Promise.resolve()
        // A fresh per-page seed changes the actual vector workload while all
        // three renderers still consume the same immutable scene.
        .then(() => run({ seed:ephemeralSeed() }))
        .then(async (state) => {
          root[STATE_KEY] = state;
          const serverStored = await submitEvidence(state);
          dispatchReady(state, serverStored);
          return state;
        })
        .catch((error) => {
          const failed = {
            version: VERSION,
            status: 'error',
            completedAt: new Date().toISOString(),
            error: publicError(error),
          };
          root[STATE_KEY] = failed;
          if (root.document) setText(root.document, DOM_IDS.status, 'error');
          dispatchReady(failed, false);
          return failed;
        });
      return root[PROMISE_KEY];
    }

    function installAutoStart() {
      if (!root || !root.document || root.__ANTIBOT_SURFACE_COMPARISON_AUTOSTART__) return;
      root.__ANTIBOT_SURFACE_COMPARISON_AUTOSTART__ = true;
      const trigger = () => {
        startOnce();
      };
      root.addEventListener('antibot:ip-ready', trigger, { once: true });
      if (root.document.readyState === 'loading') {
        root.document.addEventListener('DOMContentLoaded', trigger, { once: true });
      } else {
        trigger();
      }
    }

    return Object.freeze({
      VERSION,
      DEFAULT_SEED,
      WIDTH,
      HEIGHT,
      REPEAT_COUNT,
      MAX_WIDTH,
      MAX_HEIGHT,
      MAX_REPEATS,
      EVENT_NAME,
      STATE_KEY,
      SURFACE_NAMES,
      DOM_IDS,
      createScene,
      ephemeralSeed,
      evidenceSummary,
      sha256Hex,
      dHash,
      hammingHex,
      pixelMetrics,
      alphaCoverage,
      classifyPair,
      compareSurfaces,
      run,
      startOnce,
      installAutoStart,
    });
  }
);
