/**
 * DetectExpert Pro Extracted Script
 * Target: https://anti.bot/static/js/apisig.js?v=1328a45ec42b
 * Detected Engine: Unknown
 * Vectors Invoked: 
 */

/* Stage 5: client-side signed-fetch helper.
 * Fetches a fresh nonce from /api/nonce, then sends signed POST with
 * X-Nonce / X-Ts / X-Sig / X-NSig headers.
 *
 * Server expects:
 *   sig  = HMAC_SHA256(K, METHOD|PATH|nonce|ts|sha256(body))
 *   nsig = HMAC_SHA256(K, nonce|ts|sid)   (issued by /api/nonce)
 *
 * The browser does NOT know K; instead it forwards the nsig it received
 * and computes Sig over (METHOD|PATH|nonce|ts|sha256(body)) using the
 * SAME nonce — but Sig is also issued server-side by /api/nonce... wait,
 * actually the server signs Sig itself per-request — that won't work for
 * a stateless client. So /api/nonce returns BOTH nsig (for replay
 * prevention) and a per-request token? No: the chosen design here is:
 *   - /api/nonce returns {nonce, ts, sig=HMAC(K, nonce|ts|sid), token=HMAC(K, nonce)}
 *   - client computes X-Sig = HMAC(token, METHOD|PATH|nonce|ts|bodyHash)
 *
 * That keeps K secret while letting the client sign with a per-nonce subkey.
 *
 * NOTE: this file deliberately exposes only the per-nonce token — even if
 * the attacker scrapes it, it expires in 60 s and is single-use.
 */
(function () {
  'use strict';

  const DEFAULT_TIMEOUT_MS = 8000;
  const NONCE_TIMEOUT_MS = 5000;
  const MAX_TIMEOUT_MS = 30000;
  const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

  function _boundedTimeout(value, fallback) {
    const n = Number(value);
    return Math.max(250, Math.min(MAX_TIMEOUT_MS,
      Number.isFinite(n) && n > 0 ? n : fallback));
  }

  function _timeoutError(label) {
    const error = new Error((label || 'request') + ' timed out');
    error.name = 'TimeoutError';
    error.code = 'ETIMEDOUT';
    return error;
  }

  function _abortError(signal) {
    if (signal && signal.reason instanceof Error) return signal.reason;
    return new DOMException('The operation was aborted.', 'AbortError');
  }

  function _sleep(ms, signal) {
    return new Promise(function (resolve, reject) {
      if (signal && signal.aborted) return reject(_abortError(signal));
      const timer = setTimeout(done, Math.max(0, Number(ms) || 0));
      function done() {
        if (signal) signal.removeEventListener('abort', aborted);
        resolve();
      }
      function aborted() {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', aborted);
        reject(_abortError(signal));
      }
      if (signal) signal.addEventListener('abort', aborted, { once: true });
    });
  }

  // Give every request a real deadline while preserving an upstream AbortSignal.
  // This helper deliberately does not replace window.fetch globally.
  async function fetchWithDeadline(url, options, timeoutMs, label) {
    options = options || {};
    const upstream = options.signal;
    if (upstream && upstream.aborted) throw _abortError(upstream);
    const controller = new AbortController();
    let timedOut = false;
    const onAbort = function () { controller.abort(upstream && upstream.reason); };
    if (upstream) upstream.addEventListener('abort', onAbort, { once: true });
    let timer = null;
    let handedOff = false;
    const cleanup = function () {
      if (timer) clearTimeout(timer);
      timer = null;
      if (upstream) upstream.removeEventListener('abort', onAbort);
    };
    timer = setTimeout(function () {
      timedOut = true;
      controller.abort();
      cleanup();
    }, _boundedTimeout(timeoutMs, DEFAULT_TIMEOUT_MS));
    try {
      const response = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
      handedOff = true;
      // fetch() resolves after headers. Keep the same deadline alive while the
      // caller consumes the body; otherwise response.json() can still hang.
      ['arrayBuffer', 'blob', 'formData', 'json', 'text'].forEach(function (method) {
        if (!response || typeof response[method] !== 'function') return;
        const original = response[method].bind(response);
        try {
          Object.defineProperty(response, method, {
            configurable: true,
            value: async function () {
              try {
                return await original.apply(null, arguments);
              } catch (error) {
                if (timedOut) throw _timeoutError(label || String(url));
                throw error;
              } finally {
                cleanup();
              }
            }
          });
        } catch (_) {
          // Non-extensible Response implementations still remain protected by
          // the live AbortController timer above.
        }
      });
      const hasReadableBody = !!(response && response.body &&
        typeof ReadableStream === 'function' && response.body instanceof ReadableStream);
      if (!hasReadableBody) cleanup();
      return response;
    } catch (error) {
      if (timedOut) throw _timeoutError(label || String(url));
      if (upstream && upstream.aborted) throw _abortError(upstream);
      throw error;
    } finally {
      if (!handedOff) cleanup();
    }
  }

  async function _jsonWithDeadline(url, options, timeoutMs, label) {
    const controller = new AbortController();
    const upstream = options && options.signal;
    const onAbort = function () { controller.abort(upstream && upstream.reason); };
    if (upstream && upstream.aborted) throw _abortError(upstream);
    if (upstream) upstream.addEventListener('abort', onAbort, { once: true });
    let timedOut = false;
    const timer = setTimeout(function () {
      timedOut = true;
      controller.abort();
    }, _boundedTimeout(timeoutMs, DEFAULT_TIMEOUT_MS));
    try {
      const response = await fetch(url, Object.assign({}, options || {}, {
        signal: controller.signal
      }));
      if (!response.ok) {
        const error = new Error((label || String(url)) + ' HTTP ' + response.status);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      if (timedOut) throw _timeoutError(label || String(url));
      if (upstream && upstream.aborted) throw _abortError(upstream);
      throw error;
    } finally {
      clearTimeout(timer);
      if (upstream) upstream.removeEventListener('abort', onAbort);
    }
  }

  async function _sha256Hex(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function _hmacHex(keyHex, msg) {
    const keyBytes = new Uint8Array(keyHex.match(/.{2}/g).map(h => parseInt(h, 16)));
    const key = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
    return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function _abortable(promise, signal) {
    if (!signal) return promise;
    if (signal.aborted) {
      return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
    }
    return new Promise(function (resolve, reject) {
      const onAbort = function () {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      Promise.resolve(promise).then(
        function (value) {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        function (error) {
          signal.removeEventListener('abort', onAbort);
          reject(error);
        }
      );
    });
  }

  function _normaliseNonce(j) {
    const nonceText = String(j && j.nonce || '');
    if (!j || !nonceText || nonceText.length > 256 ||
        !Number.isFinite(Number(j.ts)) || !/^[a-f0-9]{64}$/i.test(String(j.sig || '')) ||
        !/^[a-f0-9]{64}$/i.test(String(j.token || ''))) {
      throw new Error('nonce_invalid');
    }
    return {
      nonce: String(j.nonce), ts: Number(j.ts), sig: String(j.sig),
      token: String(j.token), chal: j.chal || null
    };
  }

  async function _requestNonce(fetchOptions) {
    fetchOptions = fetchOptions || {};
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const j = await _jsonWithDeadline('/api/nonce', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: fetchOptions.signal,
          keepalive: fetchOptions.keepalive === true,
        }, NONCE_TIMEOUT_MS, 'nonce');
        return _normaliseNonce(j);
      } catch (error) {
        lastError = error;
        if ((fetchOptions.signal && fetchOptions.signal.aborted) ||
            (error && error.status && !TRANSIENT_STATUS.has(error.status)) || attempt === 1) {
          break;
        }
        await _sleep(150 + Math.floor(Math.random() * 100), fetchOptions.signal);
      }
    }
    throw lastError || new Error('nonce_failed');
  }

  // A single bootstrap request establishes the cookie before collectors fan out.
  // Its nonce is reserved atomically for one collector; every other collector
  // obtains a distinct single-use nonce and can run independently.
  let _sessionBootstrap = null;
  let _bootstrapNonce = null;
  let _sessionGeneration = 0;
  function _invalidateSessionBootstrap() {
    _sessionBootstrap = null;
    _bootstrapNonce = null;
    _sessionGeneration += 1;
  }
  function ensureSession(options) {
    options = options || {};
    if (options.force === true) _invalidateSessionBootstrap();
    if (!_sessionBootstrap) {
      const generation = _sessionGeneration;
      const task = _requestNonce({ keepalive: options.keepalive === true })
        .then(function (nonce) {
          if (generation === _sessionGeneration) _bootstrapNonce = nonce;
          return true;
        });
      _sessionBootstrap = task.catch(function (error) {
        if (generation === _sessionGeneration) _sessionBootstrap = null;
        throw error;
      });
    }
    return _abortable(_sessionBootstrap, options.signal);
  }

  async function getNonce(fetchOptions) {
    fetchOptions = fetchOptions || {};
    await ensureSession(fetchOptions);
    // The bootstrap nonce was issued after the session cookie was created and
    // is safe for exactly one request. Taking it synchronously preserves the
    // single-use property even when many collectors resume together.
    if (_bootstrapNonce) {
      const nonce = _bootstrapNonce;
      _bootstrapNonce = null;
      return nonce;
    }
    return _requestNonce(fetchOptions);
  }

  // ─── Stage 6: WASM challenge ────────────────────────────────────────
  let _wasmInst = null;
  let _wasmInflight = null;
  async function _initWasm() {
    if (_wasmInst) return _wasmInst;
    if (_wasmInflight) return _wasmInflight;
    const p = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(function () { controller.abort(); }, 5000);
      try {
        const r = await fetch('/static/js/hot.wasm', {
          credentials: 'same-origin',
          signal: controller.signal
        });
        if (!r.ok) throw new Error('hot.wasm:' + r.status);
        // NOTE: do NOT use `await X ? A : B` — `await` binds tighter than ?:
        const supportsStreaming =
          typeof WebAssembly.instantiateStreaming === 'function';
        let m;
        if (supportsStreaming) {
          try {
            m = await WebAssembly.instantiateStreaming(r);
          } catch (e) {
            // Fallback: wrong MIME / cloned-body / older browsers
            const r2 = await fetch('/static/js/hot.wasm', {
              credentials: 'same-origin',
              signal: controller.signal
            });
            m = await WebAssembly.instantiate(await r2.arrayBuffer());
          }
        } else {
          m = await WebAssembly.instantiate(await r.arrayBuffer());
        }
        _wasmInst = (m && m.instance) ? m.instance : m;
        if (!_wasmInst || !_wasmInst.exports || typeof _wasmInst.exports.chal !== 'function') {
          throw new Error('hot.wasm: chal export missing');
        }
        return _wasmInst;
      } finally {
        clearTimeout(timer);
      }
    })();
    _wasmInflight = p.catch(err => { _wasmInflight = null; throw err; });
    return _wasmInflight;
  }
  async function _computeChal(chalSpec, signal) {
    if (!chalSpec) return null;
    try {
      const inst = await _abortable(_initWasm(), signal);
      const fn = inst.exports.chal;
      const sLo = BigInt('0x' + chalSpec.seedLo);
      const sHi = BigInt('0x' + chalSpec.seedHi);
      const r = fn(sLo, sHi, chalSpec.n | 0);
      const u = r < 0n ? r + (1n << 64n) : r;
      return u.toString(16).padStart(16, '0');
    } catch (e) {
      console.warn('[apisig] chal compute failed:', e && e.message);
      return null;
    }
  }

  async function _signedFetchOnce(url, opts) {
    opts = opts || {};
    if (opts.signal && opts.signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }
    const method = (opts.method || 'POST').toUpperCase();
    const bodyStr = opts.body == null
      ? ''
      : (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));

    // Every request owns a fresh nonce. Session establishment is the only
    // single-flight phase; protected requests are never placed in a global FIFO.
    const n = await getNonce({
      signal: opts.signal,
      keepalive: opts.keepalive === true,
    });
    const path = new URL(url, location.origin).pathname;
    const bodyHash = await _sha256Hex(bodyStr);
    const sig = await _hmacHex(n.token, [method, path, n.nonce, String(n.ts), bodyHash].join('|'));
    const chal = await _computeChal(n.chal, opts.signal);
    if (opts.signal && opts.signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    var inHeaders = opts.headers || {};
    var headers = {};
    var contentType = 'application/json';
    if (typeof Headers !== 'undefined' && inHeaders instanceof Headers) {
      inHeaders.forEach(function (v, k) {
        if (String(k).toLowerCase() === 'content-type') {
          if (v) contentType = v;
        } else {
          headers[k] = v;
        }
      });
    } else {
      Object.keys(inHeaders).forEach(function (k) {
        var v = inHeaders[k];
        if (String(k).toLowerCase() === 'content-type') {
          if (v) contentType = v;
        } else {
          headers[k] = v;
        }
      });
    }

    Object.assign(headers, {
      'X-Nonce': n.nonce,
      'X-Ts':    String(n.ts),
      'X-Sig':   sig,
      'X-NSig':  n.sig,
      'X-Chal':  chal || '',
      'Content-Type': contentType,
    });

    const fetchOptions = {
      method,
      credentials: opts.credentials || 'same-origin',
      headers,
      body: bodyStr || undefined,
      signal: opts.signal,
      keepalive: opts.keepalive === true,
    };
    if (opts.cache) fetchOptions.cache = opts.cache;
    return fetchWithDeadline(
      url,
      fetchOptions,
      _boundedTimeout(opts.timeoutMs, DEFAULT_TIMEOUT_MS),
      'signed ' + method + ' ' + path
    );
  }

  async function _responseErrorCode(response) {
    if (!response || response.status !== 401) return '';
    try {
      const payload = await response.clone().json();
      return String(payload && payload.error || '');
    } catch (_) {
      return '';
    }
  }

  async function signedFetch(url, opts) {
    opts = opts || {};
    const retryCount = Math.max(0, Math.min(2, Number(opts.retryCount) || 0));
    let lastError = null;
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        let response = await _signedFetchOnce(url, opts);
        const authCode = await _responseErrorCode(response);
        if (authCode === 'sig_nonce_bad' || authCode === 'sig_stale' ||
            authCode === 'sig_replay') {
          try { if (response.body) await response.body.cancel(); } catch (_) {}
          _invalidateSessionBootstrap();
          await ensureSession({ signal: opts.signal });
          response = await _signedFetchOnce(url, opts);
        }
        if (!TRANSIENT_STATUS.has(response.status) || attempt === retryCount) {
          return response;
        }
        try { if (response.body) await response.body.cancel(); } catch (_) {}
        lastError = new Error('transient HTTP ' + response.status);
        lastError.status = response.status;
      } catch (error) {
        lastError = error;
        if ((opts.signal && opts.signal.aborted) || attempt === retryCount) throw error;
      }
      await _sleep(Math.min(1200, 200 * (2 ** attempt)) + Math.floor(Math.random() * 100), opts.signal);
    }
    throw lastError || new Error('signed request failed');
  }

  // Warm the wasm module so the first protected POST isn't latency-bound.
  if (typeof WebAssembly !== 'undefined') { _initWasm().catch(() => {}); }
  // Start cookie establishment before DOMContentLoaded so all eager collectors
  // share one session but do not serialize behind each other's network calls.
  ensureSession().catch(function (error) {
    console.warn('[apisig] session bootstrap deferred:', error && error.message);
  });

  window.apisig = Object.freeze({
    signedFetch,
    getNonce,
    ensureSession,
    fetchWithDeadline,
    timeoutError: _timeoutError,
  });
})();
