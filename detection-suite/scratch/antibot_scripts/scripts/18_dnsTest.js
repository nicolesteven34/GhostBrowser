/**
 * DetectExpert Pro Extracted Script
 * Target: https://anti.bot/static/js/dnsTest.js?v=1328a45ec42b
 * Detected Engine: Unknown
 * Vectors Invoked: 
 */

// DNS leak test — only DNS resolution needed; HTTPS connections to *.dns4
// resolve to RFC5737 TEST-NET (198.51.100.1) by design and would generate
// Mixed Content / connection-timeout console errors. Use <link rel="dns-prefetch">
// instead — it triggers DNS resolution without opening any network socket.
(function dnsTest() {
  console.log('🔍 Запуск DNS leak тестирования...');
  console.log('🆔 Test ID:', testIdGlobal);

  const safeId = testIdGlobal.replace(/\./g, '-');
  const PROBES_PER_FAMILY = 6;
  const RESULT_DEADLINE_MS = 28000;
  const RESULT_BACKOFF_MS = [700, 1100, 1700, 2600, 3800, 5000];
  const RESULT_POLL_BATCH_SIZE = 3;
  const burstToken = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const probeIdsByFamily = { 4: [], 6: [] };
  for (const family of [4, 6]) {
    for (let i = 0; i < PROBES_PER_FAMILY; i++) {
      const suffix = `-${family}-${i.toString(36)}-${burstToken}`;
      probeIdsByFamily[family].push(
        `${safeId.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`.toLowerCase()
      );
    }
  }
  const allProbeIds = [...probeIdsByFamily[4], ...probeIdsByFamily[6]];
  window.__dnsProbeIdsByFamily = {
    4: probeIdsByFamily[4].slice(),
    6: probeIdsByFamily[6].slice()
  };
  window.__dnsProbeIds = allProbeIds.slice();

  function toText(value, fallback = '—') {
    return value === null || value === undefined || value === '' ? fallback : String(value);
  }

  function appendCountryFlag(target, countryCode) {
    const code = toText(countryCode, '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return false;
    const emoji = [...code]
      .map(letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65))
      .join('');
    const flag = document.createElement('span');
    flag.className = 'flag flag--emoji';
    flag.setAttribute('role', 'img');
    flag.setAttribute('aria-label', `${code} flag`);
    flag.textContent = emoji;
    target.appendChild(flag);
    target.appendChild(document.createTextNode(' '));
    return true;
  }

  function appendValue(target, value, countryCode = null) {
    if (countryCode) appendCountryFlag(target, countryCode);
    target.appendChild(document.createTextNode(toText(value)));
  }

  function appendTableCell(row, value, className = '', countryCode = null) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    appendValue(cell, value, countryCode);
    row.appendChild(cell);
    return cell;
  }

  function appendMobileField(container, label, value, className = '', countryCode = null) {
    const item = document.createElement('div');
    item.className = 'card-item';
    const labelNode = document.createElement('div');
    labelNode.className = 'label';
    labelNode.textContent = label;
    const valueNode = document.createElement('div');
    valueNode.className = ['value', className].filter(Boolean).join(' ');
    appendValue(valueNode, value, countryCode);
    item.append(labelNode, valueNode);
    container.appendChild(item);
    return valueNode;
  }

  function showTableMessage(tbody, colSpan, message) {
    if (!tbody) return;
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = colSpan;
    cell.classList.add('csp-text-center');
    cell.textContent = message;
    row.appendChild(cell);
    tbody.replaceChildren(row);
  }

  function showMobileMessage(container, message) {
    if (!container) return;
    const node = document.createElement('div');
    node.className = 'text-loading-table';
    node.textContent = message;
    container.replaceChildren(node);
  }

  function setFlagValue(target, countryCode, fallback = '—') {
    if (!target) return;
    target.replaceChildren();
    if (!appendCountryFlag(target, countryCode)) target.textContent = fallback;
  }

  function prefetch(host) {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = '//' + host;
    document.head.appendChild(link);
    // dns-prefetch is immediate and does not delay the document load event.
    // The active lookup is equally important, but an Image created while the
    // page is still loading becomes a load-blocking subresource in Chromium.
    // Start it as soon as `load` fires so DNS observation remains eager while
    // page readiness is deterministic even when the probe endpoint is
    // intentionally unreachable.
    const resolveActively = function () {
      const img = new Image();
      img.onerror = img.onload = function () {};
      // Use https so the URL is same-protocol with the page (no Mixed Content
      // warning); the request will fail at TCP layer to TEST-NET silently.
      img.src = 'https://' + host + '/_dnsleak.gif?t=' + Date.now();
    };
    if (document.readyState === 'complete') resolveActively();
    else if (typeof window.addEventListener === 'function') {
      window.addEventListener('load', resolveActively, { once: true });
    }
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function fetchRows(endpoint, id, timeoutMs = 4500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(
        endpoint + '?id=' + encodeURIComponent(id),
        { cache: 'no-store', credentials: 'same-origin', signal: controller.signal }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Invalid DNS results payload');
      return rows;
    } finally {
      clearTimeout(timer);
    }
  }

  async function pollResultSet(endpoint, ids, rowKey) {
    const started = Date.now();
    const deadline = started + RESULT_DEADLINE_MS;
    const rows = new Map();
    let successfulFetches = 0;
    let failedFetches = 0;
    let stableRounds = 0;
    let previousSize = 0;
    let attempt = 0;
    const touchedIds = new Set();

    while (Date.now() < deadline) {
      const delay = RESULT_BACKOFF_MS[Math.min(attempt, RESULT_BACKOFF_MS.length - 1)];
      await wait(Math.min(delay, Math.max(0, deadline - Date.now())));
      if (Date.now() >= deadline) break;
      const batchIds = [];
      for (let i = 0; i < Math.min(RESULT_POLL_BATCH_SIZE, ids.length); i++) {
        const id = ids[(attempt * RESULT_POLL_BATCH_SIZE + i) % ids.length];
        batchIds.push(id);
        touchedIds.add(id);
      }
      const batch = await Promise.allSettled(batchIds.map(id => fetchRows(endpoint, id)));
      for (const result of batch) {
        if (result.status === 'fulfilled') {
          successfulFetches++;
          for (const row of result.value) {
            rows.set(rowKey(row), row);
          }
        } else {
          failedFetches++;
        }
      }
      if (rows.size === previousSize) stableRounds++;
      else stableRounds = 0;
      previousSize = rows.size;
      attempt++;
      // Allow the whole four-second query burst to land, then finish after a
      // quiet poll. This collects multiple resolvers without always waiting
      // for the full deadline.
      if (rows.size && touchedIds.size === ids.length &&
          Date.now() - started >= 6000 && stableRounds >= 1) break;
    }

    return {
      rows: [...rows.values()],
      status: rows.size ? 'complete' : (successfulFetches ? 'timeout' : 'unavailable'),
      attempts: attempt,
      successfulFetches,
      failedFetches
    };
  }

  function dnsRowKey(row) {
    return `dns|${toText(row && row.ip, '')}`;
  }

  function ednsRowKey(row) {
    return [
      'edns',
      toText(row && row.client_subnet, ''),
      toText(row && row.prefix_length, ''),
      toText(row && row.resolver_ip, '')
    ].join('|');
  }

  async function registerProbeIds() {
    const deadline = Date.now() + 6000;
    while (!(window.apisig && typeof window.apisig.signedFetch === 'function')) {
      if (Date.now() >= deadline) throw new Error('signed API unavailable');
      await wait(50);
    }
    const response = await window.apisig.signedFetch('/api/dns/probes', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ probe_ids: allProbeIds })
    });
    if (!response.ok) throw new Error(`DNS probe registration HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.probe_ids) ||
        payload.probe_ids.length !== allProbeIds.length) {
      throw new Error('DNS probe registration incomplete');
    }
  }

  async function startRegisteredDnsProbe() {
  await registerProbeIds();
  for (const family of [4, 6]) {
    probeIdsByFamily[family].forEach((probeId, index) => {
      const jitter = Math.round(Math.random() * 3500 + index * 40);
      setTimeout(() => prefetch(`${probeId}.dns${family}.anti.bot`), jitter);
    });
  }

  console.log('🔍 Polling DNS results for unique probe labels:', allProbeIds.length);
  pollResultSet('/dns-results', allProbeIds, dnsRowKey)
    .then(outcome => {
      const data = outcome.rows;
      console.log('📊 DNS результаты получены:', data);
      const tbody = document.getElementById('dns-body');
      const tbodymob = document.getElementById('dns-body-mob');
      if (!tbody || !tbodymob) return;
      if (!Array.isArray(data)) throw new Error('Invalid DNS results payload');

      if (!data.length) {
        const message = outcome.status === 'unavailable'
          ? 'DNS results unavailable'
          : 'DNS probe timed out — no resolver observation (not a clean verdict)';
        showTableMessage(tbody, 8, message);
        showMobileMessage(tbodymob, message);
        const dnsContainer = document.getElementById('dns-table-consistency');
        const banner = document.createElement('div');
        banner.className = 'consistency bad';
        banner.textContent = message;
        if (dnsContainer) dnsContainer.replaceChildren(banner);
      } else {
        tbody.replaceChildren();
        tbodymob.replaceChildren();

        data.sort((a, b) => toText(a && a.ip, '').localeCompare(toText(b && b.ip, '')));
        for (const dns of data) {
          const tr = document.createElement('tr');

          let vpnClass = '', threatClass = '', originClass = '', routeClass = '';
          const originScore = dns.origin_score;
          const relation = dns.resolver_relation || {};
          const routeScore = Number.isFinite(Number(relation.score)) ? Number(relation.score) : null;
          const routeText = relation.label
            ? `${relation.label}${relation.distance_km != null ? ` · ${relation.distance_km} km` : ''}`
            : 'unknown';
          if (originScore !== null && originScore !== undefined) {
            if (originScore <= 19) originClass = 'green';
            else if (originScore <= 60) originClass = 'orange';
            else originClass = 'red';
          }
          if (dns.vpn_score !== null) {
            if (dns.vpn_score <= 19) vpnClass = 'green';
            else if (dns.vpn_score <= 50) vpnClass = 'orange';
            else vpnClass = 'red';
          }
          if (dns.threat_score !== null) {
            if (dns.threat_score <= 29) threatClass = 'green';
            else if (dns.threat_score <= 60) threatClass = 'orange';
            else threatClass = 'red';
          }
          if (routeScore !== null) {
            if (routeScore < 30) routeClass = 'green';
            else if (routeScore < 60) routeClass = 'orange';
            else routeClass = 'red';
          }

          appendTableCell(tr, dns.ip, 'table-copy-value', dns.country_code);
          appendTableCell(tr, dns.country || 'Unknown');
          appendTableCell(tr, [dns.provider, dns.asn].filter(Boolean).join(' · ') || 'Unknown');
          appendTableCell(tr, dns.network_type || 'unknown');
          appendTableCell(tr, originScore !== null && originScore !== undefined ? originScore : '—', `${originClass} table-copy-value`.trim());
          appendTableCell(tr, dns.vpn_score !== null ? dns.vpn_score : '—', `${vpnClass} table-copy-value`.trim());
          appendTableCell(tr, dns.threat_score !== null ? dns.threat_score : '—', `${threatClass} table-copy-value`.trim());
          appendTableCell(tr, routeText, `${routeClass} table-copy-value`.trim());
          tbody.appendChild(tr);

          const div = document.createElement('div');
          div.className = 'table-items';
          appendMobileField(div, 'IP Address', dns.ip, '', dns.country_code);
          appendMobileField(div, 'Country', dns.country || 'Unknown');
          appendMobileField(div, 'Provider / ASN', [dns.provider, dns.asn].filter(Boolean).join(' · ') || 'Unknown', 'copy-value');
          appendMobileField(div, 'Network Type', dns.network_type || 'unknown');
          appendMobileField(div, 'Origin Score', originScore !== null && originScore !== undefined ? originScore : '—', `${originClass} copy-value`.trim());
          appendMobileField(div, 'VPN Likelihood', dns.vpn_score !== null ? dns.vpn_score : '—', `${vpnClass} copy-value`.trim());
          appendMobileField(div, 'IP Abuse Risk', dns.threat_score !== null ? dns.threat_score : '—', `${threatClass} copy-value`.trim());
          appendMobileField(div, 'DNS Route', routeText, `${routeClass} copy-value`.trim());
          tbodymob.appendChild(div);

          if (typeof addFullIPInfoRow === 'function') addFullIPInfoRow('DNS IP', dns.ip, dns);
        }
        const dnsContainer = document.getElementById('dns-table-consistency');
        const doneBanner = document.createElement('div');
        const maxRouteScore = data.reduce(
          (max, row) => Math.max(max, Number(row && row.resolver_relation && row.resolver_relation.score) || 0),
          0
        );
        doneBanner.className = `consistency ${maxRouteScore >= 60 ? 'bad' : 'good'}`;
        doneBanner.textContent = maxRouteScore >= 60
          ? 'DNS route mismatch detected — review resolver location'
          : 'DNS resolver path collected — no strong route mismatch';
        if (dnsContainer) dnsContainer.replaceChildren(doneBanner);
      }
    })
    .catch(err => {
      console.error('❌ DNS results error:', err);
      showTableMessage(document.getElementById('dns-body'), 8, 'DNS results unavailable');
      showMobileMessage(document.getElementById('dns-body-mob'), 'DNS results unavailable');
    });

    console.log('🔍 Polling EDNS results for unique probe labels:', allProbeIds.length);
    pollResultSet('/edns-results', allProbeIds, ednsRowKey)
      .then(outcome => {
        const data = outcome.rows;
        console.log('📊 EDNS результаты получены:', data);
        const tbody = document.getElementById('edns-body');
        const tbodymob = document.getElementById('edns-body-mob');
        if (!tbody || !tbodymob) return;
        if (!Array.isArray(data)) throw new Error('Invalid EDNS results payload');

        if (!data.length) {
          const message = outcome.status === 'unavailable'
            ? 'EDNS results unavailable'
            : 'EDNS probe timed out — no observation (not a clean verdict)';
          showTableMessage(tbody, 5, message);
          showMobileMessage(tbodymob, message);
          const ednsContainer = document.getElementById('edns-table-consistency');
          const banner = document.createElement('div');
          banner.className = 'consistency bad';
          banner.textContent = message;
          if (ednsContainer) ednsContainer.replaceChildren(banner);
        } else {
          tbody.replaceChildren();
          tbodymob.replaceChildren();

          // Кэш IP→info (24h TTL) — общий для всех таблиц на странице, чтобы
          // не палить лимиты внешних API на каждый перезапуск/повторный IP.
          const IP_CACHE_KEY = 'antibot_ipinfo_cache_v1';
          const IP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
          window.__ipInfoMem = window.__ipInfoMem || new Map();
          window.__ipInfoInflight = window.__ipInfoInflight || new Map();

          function loadCache() {
            try {
              const raw = localStorage.getItem(IP_CACHE_KEY);
              return raw ? JSON.parse(raw) : {};
            } catch (_) { return {}; }
          }
          function saveCache(obj) {
            try { localStorage.setItem(IP_CACHE_KEY, JSON.stringify(obj)); } catch (_) {}
          }
          async function signedInfoReport(payload) {
            const deadline = Date.now() + 5000;
            while (!(window.apisig && typeof window.apisig.signedFetch === 'function')) {
              if (Date.now() >= deadline) throw new Error('apisig.signedFetch unavailable');
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            return window.apisig.signedFetch('/api/report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              credentials: 'same-origin'
            });
          }
          function lookupIpInfo(ip) {
            if (!ip) return Promise.resolve(null);
            if (window.__ipInfoMem.has(ip)) return Promise.resolve(window.__ipInfoMem.get(ip));
            const persisted = loadCache();
            const hit = persisted[ip];
            if (hit && (Date.now() - hit.t) < IP_CACHE_TTL_MS) {
              window.__ipInfoMem.set(ip, hit.v);
              return Promise.resolve(hit.v);
            }
            if (window.__ipInfoInflight.has(ip)) return window.__ipInfoInflight.get(ip);
            const p = signedInfoReport({ protocol: 'INFO', ip: ip })
              .then(r => {
                if (!r.ok) throw new Error('IP info HTTP ' + r.status);
                return r.json();
              })
              .then(info => {
                window.__ipInfoMem.set(ip, info);
                const c = loadCache();
                c[ip] = { t: Date.now(), v: info };
                saveCache(c);
                window.__ipInfoInflight.delete(ip);
                return info;
              })
              .catch(err => {
                window.__ipInfoInflight.delete(ip);
                console.warn('IP info lookup failed for', ip, err);
                return null;
              });
            window.__ipInfoInflight.set(ip, p);
            return p;
          }

          for (const e of data) {
            const cs = (e.client_subnet && e.client_subnet !== 'N/A') ? e.client_subnet : 'N/A';
            const pl = (e.prefix_length && e.prefix_length !== 0) ? e.prefix_length : '—';

            const tr = document.createElement('tr');
            appendTableCell(tr, cs);
            appendTableCell(tr, pl);
            appendTableCell(tr, e.resolver_ip, 'table-copy-value');
            const tdFlag = document.createElement('td');
            const flagSpinner = document.createElement('span');
            flagSpinner.className = 'spinner';
            tdFlag.appendChild(flagSpinner);
            const tdCountry = appendTableCell(tr, '...');
            tr.insertBefore(tdFlag, tdCountry);
            tbody.appendChild(tr);

            const div = document.createElement('div');
            div.className = 'table-items';
            appendMobileField(div, 'Client Subnet', cs);
            appendMobileField(div, 'Prefix Length', pl);
            appendMobileField(div, 'Resolver IP', e.resolver_ip, 'copy-value');
            const mobileFlag = appendMobileField(div, 'Flag', '');
            const mobileSpinner = document.createElement('span');
            mobileSpinner.className = 'spinner';
            mobileFlag.replaceChildren(mobileSpinner);
            const mobileCountry = appendMobileField(div, 'Country', '...');
            tbodymob.appendChild(div);

            // Async IP→country lookup (cached). Skip private/CGN ranges.
            const ip = toText(e.resolver_ip, '');
            const isPrivate = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1$|fc|fd|fe80:)/i.test(ip);
            if (isPrivate) {
              tdFlag.textContent = '🔒';
              tdCountry.textContent = 'Private';
              mobileFlag.textContent = '🔒';
              mobileCountry.textContent = 'Private';
              continue;
            }
            lookupIpInfo(ip).then(info => {
              const code = info && info.country_code;
              const name = (info && info.country) || 'Unknown';
              setFlagValue(tdFlag, code);
              tdCountry.textContent = name;
              setFlagValue(mobileFlag, code);
              mobileCountry.textContent = name;
            });
          }

          const ednsContainer = document.getElementById('edns-table-consistency');
          const doneBanner2 = document.createElement('div');
          doneBanner2.textContent = 'EDNS Test Completed!';
          doneBanner2.className = 'consistency good';
          if (ednsContainer) ednsContainer.replaceChildren(doneBanner2);
        }
      })
      .catch(err => {
        console.error('❌ EDNS results error:', err);
        showTableMessage(document.getElementById('edns-body'), 5, 'EDNS results unavailable');
        showMobileMessage(document.getElementById('edns-body-mob'), 'EDNS results unavailable');
      });
  }
  startRegisteredDnsProbe().catch(err => {
    console.error('❌ DNS probe registration failed:', err);
    showTableMessage(document.getElementById('dns-body'), 8, 'DNS probe registration failed');
    showMobileMessage(document.getElementById('dns-body-mob'), 'DNS probe registration failed');
    showTableMessage(document.getElementById('edns-body'), 5, 'EDNS probe registration failed');
    showMobileMessage(document.getElementById('edns-body-mob'), 'EDNS probe registration failed');
  });
})();
