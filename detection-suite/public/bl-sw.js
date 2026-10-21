/* BotLens service-worker probe: reports the navigator as seen from a ServiceWorker scope.
   Stealth/antidetect patches applied to window (and often dedicated workers) rarely reach service workers. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('message', (e) => {
  const n = self.navigator || {};
  const r = {};
  try {
    r.userAgent = n.userAgent;
    r.platform = n.platform;
    r.hardwareConcurrency = n.hardwareConcurrency;
    r.deviceMemory = n.deviceMemory;
    r.languages = n.languages ? Array.prototype.slice.call(n.languages) : null;
    r.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    r.tzOffset = new Date().getTimezoneOffset();
    if (n.userAgentData) {
      r.uaPlatform = n.userAgentData.platform;
      r.uaBrands = n.userAgentData.brands.map((b) => b.brand + ' ' + b.version).join(', ');
    }
  } catch (err) {
    r.error = String(err);
  }
  const port = e.ports && e.ports[0];
  if (port) port.postMessage(r);
});
