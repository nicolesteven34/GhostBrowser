(function () {
  'use strict';
  const BL = window.BotLens;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = { fail: '✕', warn: '!', pass: '✓', info: 'i' };
  const RANK = { fail: 0, warn: 1, info: 2, pass: 3 };

  const state = {
    scan: null,
    results: [],
    runtime: new Map(),
    behavior: [],
    issuesOnly: false,
    flash: new Set(),
    reported: false,
  };

  const all = () => state.results.concat(Array.from(state.runtime.values()), state.behavior);

  // ---------------------------------------------------------------- render
  function renderVerdict() {
    const s = BL.score(all());
    const g = $('ov-gauge') || $('gauge');
    const bar = $('ov-gauge-bar') || $('gauge-bar');
    const scoreEl = $('ov-score') || $('score');
    const title = $('ov-verdict-title') || $('verdict-title');
    const sub = $('ov-verdict-sub') || $('verdict-sub');
    const nFail = $('ov-n-fail') || $('n-fail');
    const nWarn = $('ov-n-warn') || $('n-warn');
    const nPass = $('ov-n-pass') || $('n-pass');
    if (g) g.dataset.verdict = s.verdict;
    if (bar) bar.style.strokeDashoffset = String(326.73 * (1 - Math.max(0.02, s.score / 100)));
    if (scoreEl) scoreEl.textContent = s.score;
    if (title) {
      title.className = 'verdict-title ' + s.verdict;
      title.textContent = { human: 'Likely human', suspicious: 'Suspicious', bot: 'Automated / bot detected' }[s.verdict];
    }
    const top = all().filter((r) => r.status === 'fail').sort((a, b) => b.weight - a.weight).slice(0, 2).map((r) => r.name);
    if (sub) {
      sub.textContent = s.verdict === 'human'
        ? 'No significant automation, tampering or spoofing signals. Interact with the Behavior Lab to test live input analysis.'
        : 'Top signals: ' + (top.length ? top.join(' · ') : all().filter((r) => r.status === 'warn').slice(0, 3).map((r) => r.name).join(' · '));
    }
    if (nFail) nFail.textContent = s.fails;
    if (nWarn) nWarn.textContent = s.warns;
    if (nPass) nPass.textContent = s.passes;
    return s;
  }

  function renderChips() {
    const sc = state.scan;
    if (!sc) return;
    const c = sc.claimed;
    const mismatch = c.expectedEngine !== 'unknown' && sc.engine !== 'unknown' && c.expectedEngine !== sc.engine;
    const chips = [
      [`Claims: ${c.browser} ${String(c.version).split('.')[0]} · ${c.os}`, false],
      [`Engine: ${sc.engine}`, mismatch],
      [sc.secure ? 'Secure context' : 'Insecure context (LAN http)', false],
    ];
    if (window.__SERVER__) chips.push([`IP ${window.__SERVER__.ip}`, false]);
    const el = $('ov-chips') || $('chips');
    if (el) el.innerHTML = chips.map(([t, bad]) => `<span class="chip${bad ? ' bad' : ''}">${esc(t)}</span>`).join('');
  }

  function renderFingerprint() {
    if (!state.scan || !$('fp')) return;
    const fp = state.scan.fingerprint;
    $('fp').innerHTML = Object.entries(fp).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  }

  function renderCategories() {
    if (!$('categories')) return;
    const list = all();
    const html = BL.CAT_ORDER.map((cat) => {
      let items = list.filter((r) => r.category === cat);
      const counts = { fail: 0, warn: 0, pass: 0 };
      items.forEach((r) => { if (counts[r.status] != null) counts[r.status]++; });
      if (state.issuesOnly) items = items.filter((r) => r.status === 'fail' || r.status === 'warn');
      items.sort((a, b) => RANK[a.status] - RANK[b.status] || b.weight - a.weight);
      const badges = ['fail', 'warn', 'pass'].filter((k) => counts[k]).map((k) => `<span class="badge ${k}">${counts[k]} ${k}</span>`).join('');
      const rows = items.length
        ? items.map((r) => `
          <li class="check ${r.status}${state.flash.has(r.id) ? ' flash' : ''}">
            <span class="ico">${ICON[r.status]}</span>
            <div>
              <div class="name">${esc(r.name)}</div>
              <div class="detail">${esc(r.detail)}</div>
              ${r.evidence ? `<div class="evidence">${esc(r.evidence)}</div>` : ''}
            </div>
            <span class="pts">${r.weight ? '+' + r.weight : ''}</span>
          </li>`).join('')
        : `<div class="empty">${state.issuesOnly ? 'No issues in this category.' : 'No checks yet.'}</div>`;
      return `
        <article class="card cat">
          <header>
            <div class="cat-head"><h3>${esc(cat)}</h3><div class="badges">${badges}</div></div>
            <p class="cat-desc">${esc(BL.CAT_DESC[cat] || '')}</p>
          </header>
          <ul class="checks">${rows}</ul>
        </article>`;
    }).join('');
    $('categories').innerHTML = html;
    state.flash.clear();
  }

  let raf = 0;
  function render() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!state.scan) return;
      renderVerdict();
      renderCategories();
    });
  }

  // ---------------------------------------------------------------- report
  function buildReport() {
    const s = BL.score(all());
    return {
      page: 'overview',
      pv: (window.__SERVER__ || {}).pv || null,
      score: s.score,
      verdict: s.verdict,
      counts: { fail: s.fails, warn: s.warns, pass: s.passes },
      issues: all().filter((r) => r.status === 'fail' || r.status === 'warn').sort((a, b) => b.weight - a.weight),
      fingerprint: state.scan ? state.scan.fingerprint : null,
      results: all(),
      server: window.__SERVER__ || null,
      generatedAt: new Date().toISOString(),
    };
  }

  function sendReport() {
    try {
      fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildReport()), keepalive: true }).catch(() => {});
    } catch (e) { /* ignore */ }
  }

  function toast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 1800);
  }

  async function copyJSON() {
    const text = JSON.stringify(buildReport(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (x) { /* */ }
      ta.remove();
    }
    toast('Report copied to clipboard');
  }

  function download() {
    const blob = new Blob([JSON.stringify(buildReport(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `botlens-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------------------------------------------------------------- behavior lab UI
  function renderStats(st) {
    if (!$('lab-stats')) return;
    const tiles = [
      ['Moves', st.moves], ['Clicks', st.clicks], ['Keys', st.keys], ['Touches', st.touches],
      ['Scrolls', st.scrolls], ['Untrusted', st.untrusted, st.untrusted > 0],
      ['Move CV', st.moveTimingCV != null ? st.moveTimingCV.toFixed(2) : '–'], ['Key CV', st.keyTimingCV != null ? st.keyTimingCV.toFixed(2) : '–'],
    ];
    $('lab-stats').innerHTML = tiles.map(([k, v, bad]) => `<div class="stat${bad ? ' bad' : ''}"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('');
  }

  function wireLab() {
    const zone = $('lab-zone');
    if (!zone) return;
    let last = 0;
    const trail = (x, y) => {
      const now = performance.now();
      if (now - last < 30) return;
      last = now;
      const r = zone.getBoundingClientRect();
      const d = document.createElement('i');
      d.className = 'dot';
      d.style.left = x - r.left + 'px';
      d.style.top = y - r.top + 'px';
      zone.appendChild(d);
      setTimeout(() => d.remove(), 900);
    };
    zone.addEventListener('mousemove', (e) => trail(e.clientX, e.clientY));
    zone.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) trail(t.clientX, t.clientY); }, { passive: true });
    if ($('lab-btn')) $('lab-btn').addEventListener('click', () => toast('Click registered'));
    if ($('lab-selftest')) $('lab-selftest').addEventListener('click', () => {
      if ($('lab-btn')) $('lab-btn').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }));
      toast('Synthetic click dispatched. Check the Behavior card.');
    });
  }

  // ---------------------------------------------------------------- boot
  async function boot() {
    wireLab();
    if ($('ov-btn-rescan')) $('ov-btn-rescan').addEventListener('click', () => { if (typeof window.runFullAudit === 'function') window.runFullAudit(); else location.reload(); });
    if ($('ov-btn-copy')) $('ov-btn-copy').addEventListener('click', copyJSON);
    if ($('ov-btn-download')) $('ov-btn-download').addEventListener('click', download);
    if ($('issues-only')) $('issues-only').addEventListener('change', (e) => { state.issuesOnly = e.target.checked; render(); });

    // start behavior capture immediately (doesn't touch native-API integrity)
    let behaviorReady = false;
    BL.startBehaviorMonitor((results, st) => {
      state.behavior = results;
      renderStats(st);
      if (behaviorReady) render();
    }, { desktop: !/iPhone|iPad|iPod|Android/.test(navigator.userAgent) && !(navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform)) });

    if (!window.__SHARED_BL_SCAN_PROMISE__) {
      window.__SHARED_BL_SCAN_PROMISE__ = BL.scan();
    }
    const scan = await window.__SHARED_BL_SCAN_PROMISE__;
    state.scan = scan;
    state.results = scan.results.slice();
    behaviorReady = true;

    renderChips();
    renderFingerprint();
    if ($('scan-meta')) $('scan-meta').textContent = `${scan.results.length} static checks in ${scan.ms} ms · runtime & behavior monitors active`;
    render();
    if (typeof window.updateUnifiedSubsystemBadge === 'function') {
      const s = BL.score(all());
      window.updateUnifiedSubsystemBadge('subBotlensStatic', s.fails === 0, `${scan.results.length} Checks (${s.score}/100)`);
    }

    // Register runtime trap listener to be armed after all static/in-house engines finish scanning
    window.__BL_RUNTIME_CALLBACKS__ = window.__BL_RUNTIME_CALLBACKS__ || [];
    window.__BL_RUNTIME_CALLBACKS__.push((r) => {
      const isNew = !state.runtime.has(r.id);
      state.runtime.set(r.id, r);
      if (isNew && r.status === 'fail') {
        state.flash.add(r.id);
        toast('Live detection: ' + r.name);
      }
      render();
      if (isNew && r.status !== 'pass' && state.reported) sendReport();
    });

    setTimeout(() => { state.reported = true; sendReport(); }, 400);
    edgeEnrich();
  }

  /** Probe the direct TLS edge so TLS / HTTP2 / TCP verdicts join the Network & Headers category. */
  async function edgeEnrich() {
    const S = window.__SERVER__ || {};
    if (!S.edge || !S.pv) return;
    const NET = BL.CAT.NET;
    try {
      if (window.__SHARED_EDGE_NET_PROMISE__) {
        const net = await window.__SHARED_EDGE_NET_PROMISE__;
        if (net && net.findings) {
          const keep = /^net-(tls-family|h2-family|tls-h2|tcp-os|edge-ua|edge-ip|alpn|tls13|pq|h2|sni|mtu)$/;
          for (const f of net.findings || []) {
            if (keep.test(f.id) && !state.results.some((x) => x.id === 'edge-' + f.id)) {
              state.results.push({ category: NET, id: 'edge-' + f.id, name: f.name, status: f.status, detail: f.detail, weight: f.status === 'fail' || f.status === 'warn' ? f.weight || 0 : 0 });
            }
          }
        }
      } else {
        for (let i = 0; i < 2; i++) {
          const r = await Promise.race([
            fetch(`${S.edge.origin}/edge/probe?pv=${encodeURIComponent(S.pv)}&n=${i}`, { cache: 'no-store', mode: 'cors', credentials: 'omit' }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
          ]);
          await r.json();
        }
        const net = await (await fetch(`/api/deep/network?pv=${encodeURIComponent(S.pv)}`, { cache: 'no-store' })).json();
        const keep = /^net-(tls-family|h2-family|tls-h2|tcp-os|edge-ua|edge-ip|alpn|tls13|pq|h2|sni|mtu)$/;
        for (const f of net.findings || []) {
          if (keep.test(f.id)) state.results.push({ category: NET, id: 'edge-' + f.id, name: f.name, status: f.status, detail: f.detail, weight: f.status === 'fail' || f.status === 'warn' ? f.weight || 0 : 0 });
        }
      }
    } catch (e) {
      state.results.push({ category: NET, id: 'edge-err', name: 'Direct TLS edge', status: 'info', detail: `Edge probe failed (${e.message}). A firewall or proxy blocks ${S.edge.origin}.`, weight: 0 });
    }
    render();
    if (state.reported) sendReport();
  }

  window.rescanBotLensOverview = async function () {
    const scan = await window.__SHARED_BL_SCAN_PROMISE__;
    state.scan = scan;
    state.results = scan.results.slice();
    renderChips();
    renderFingerprint();
    render();
    edgeEnrich();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
