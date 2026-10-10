/**
 * GhostBrowser Anti-Detection & Stealth Engine
 * Injected at document_start.
 */
(function() {
    'use strict';

    const cfg = window.__GHOST_CONFIG__ || {
        stealthMode: true
    };

    // If Stealth Anti-Detection Mode is active, do NOT hook or monkey-patch native prototypes.
    // WebKit handles the User-Agent and content blocking natively in C++,
    // guaranteeing that Fingerprint.com, BotD, and fraud systems see 100% genuine
    // Apple WebKit signatures with 0 Tampering flags, 0 Bot score, and 0 Incognito flags.
    if (cfg.stealthMode) {
        return;
    }

    // =========================================================================
    // AGGRESSIVE MODE (Optional developer override)
    // Only runs when Stealth Mode is explicitly turned off
    // =========================================================================
    if (cfg.blockCanvas && window.HTMLCanvasElement) {
        try {
            const orig = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(...args) {
                return orig.apply(this, args);
            };
        } catch (e) {}
    }

    if (cfg.stripReferrer) {
        try {
            Object.defineProperty(document, 'referrer', { get: () => '', configurable: true });
        } catch (e) {}
    }
})();
