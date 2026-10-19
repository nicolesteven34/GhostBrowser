// FingerprintJS OSS v3 integration (no Pro key required)
// Replaces broken `your-public-key` Pro endpoint that returned 401.
const fpPromise = Promise.resolve().then(() => {
  if (!window.FingerprintJS || typeof window.FingerprintJS.load !== 'function') {
    throw new Error('Self-hosted FingerprintJS runtime is unavailable');
  }
  // Explicitly disable the optional upstream telemetry request. All collection
  // and reporting stays on this deployment.
  return window.FingerprintJS.load({ monitoring: false });
});

const FP_COLLECT_TIMEOUT_MS = 8000;
const FP_REPORT_TIMEOUT_MS = 7000;
let fingerprintRun = null;

function fpTimeoutError(label) {
  const error = new Error(`${label || 'Fingerprint collection'} timed out`);
  error.name = 'TimeoutError';
  error.code = 'ETIMEDOUT';
  return error;
}

function withFpDeadline(promise, timeoutMs, label) {
  let timer = null;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(fpTimeoutError(label)), timeoutMs);
    })
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function fpDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForApiSig(timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (window.apisig && typeof window.apisig.signedFetch === 'function') {
      return window.apisig.signedFetch.bind(window.apisig);
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('apisig.signedFetch unavailable');
}

function publishFingerprintCoverage(result) {
  const components = result && result.components &&
    typeof result.components === 'object'
    ? Object.values(result.components)
    : [];
  const measured = components.filter(component =>
    component &&
    typeof component === 'object' &&
    !component.error &&
    Object.prototype.hasOwnProperty.call(component, 'value')
  ).length;
  const total = components.length;
  const score = total > 0
    ? Math.max(0, Math.min(100, Math.round((measured / total) * 100)))
    : null;
  const confidence = Number(
    result && result.confidence && result.confidence.score
  );
  window.__fpResult = {
    state: 'complete',
    score,
    coverage: {
      measured,
      total,
    },
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(1, confidence))
      : null,
  };
  window.__lastFingerprintScore = score;
  if (typeof window.cyberSetTestScore === 'function') {
    window.cyberSetTestScore('fingerprint', score);
  }
  window.dispatchEvent(new CustomEvent('antibot:fingerprint-ready', {
    detail: {
      state: 'complete',
      score,
      measured,
      total,
    },
  }));
  return score;
}

function publishFingerprintTerminal(error) {
  const timedOut = !!(error && (
    error.name === 'TimeoutError' || error.name === 'AbortError' ||
    error.code === 'ETIMEDOUT'
  ));
  const state = timedOut ? 'timeout' : 'unknown';
  window.__fpResult = {
    state,
    score: null,
    coverage: { measured: 0, total: 0 },
    confidence: null,
    error: error && error.message ? error.message : String(error || 'unavailable'),
  };
  window.__lastFingerprintScore = null;
  if (typeof window.cyberSetTestScore === 'function') {
    window.cyberSetTestScore('fingerprint', null);
  }
  window.dispatchEvent(new CustomEvent('antibot:fingerprint-ready', {
    detail: { state, score: null, measured: 0, total: 0 },
  }));
}

async function reportFingerprint(result) {
  const signedFetch = await waitForApiSig(5000);
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FP_REPORT_TIMEOUT_MS);
    try {
      const response = await signedFetch('/api/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: result.visitorId,
          confidence: result.confidence && result.confidence.score,
          components: Object.keys(result.components || {}).length,
          timestamp: new Date().toISOString()
        }),
        credentials: 'same-origin',
        signal: controller.signal,
        timeoutMs: FP_REPORT_TIMEOUT_MS,
        retryCount: 0,
      });
      if (!response.ok) {
        const error = new Error(`Fingerprint report HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      const report = await withFpDeadline(response.json(), 2000, 'Fingerprint response');
      if (!report || report.success !== true) {
        throw new Error((report && report.error) || 'Fingerprint report rejected');
      }
      return report;
    } catch (error) {
      lastError = error;
      const transient = !error.status || [408, 425, 429, 500, 502, 503, 504].includes(error.status);
      if (!transient || attempt === 1) throw error;
      await fpDelay(250 + attempt * 500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('Fingerprint report unavailable');
}

async function collectFingerprint() {
  try {
    const fp = await withFpDeadline(fpPromise, FP_COLLECT_TIMEOUT_MS, 'Fingerprint runtime');
    let result = null;
    let collectionError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await withFpDeadline(fp.get(), FP_COLLECT_TIMEOUT_MS, 'Fingerprint collection');
        break;
      } catch (error) {
        collectionError = error;
        if (error && (error.name === 'TimeoutError' || error.name === 'AbortError')) break;
        if (attempt === 0) await fpDelay(250);
      }
    }
    if (!result) throw (collectionError || new Error('Fingerprint collection unavailable'));
    publishFingerprintCoverage(result);

    // Отправляем результат на сервер (OSS не возвращает requestId/browserData)
    try {
      await reportFingerprint(result);
      if (window.__fpResult) window.__fpResult.reportState = 'complete';
    } catch (e) {
      // Local evidence is still valid, but report state must be terminal.
      if (window.__fpResult) {
        window.__fpResult.reportState = e && (e.name === 'AbortError' || e.name === 'TimeoutError')
          ? 'timeout' : 'unknown';
      }
      console.warn('FingerprintJS report failed:', e && e.message);
    }

    return result;
  } catch (error) {
    console.error('FingerprintJS error:', error);
    publishFingerprintTerminal(error);
    return null;
  }
}

function getFingerprint() {
  if (!fingerprintRun) fingerprintRun = collectFingerprint();
  return fingerprintRun;
}

function startFingerprintImmediately() {
  // One shared run prevents the inline page bootstrap from duplicating this work.
  void getFingerprint();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startFingerprintImmediately, { once: true });
} else {
  queueMicrotask(startFingerprintImmediately);
}
