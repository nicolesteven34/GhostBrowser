const fs = require('fs');
const path = 'C:/Users/Home/Desktop/testsite1/walmart';

const audit = JSON.parse(fs.readFileSync(path + '/detectexpert_audit_www.walmart.com_2026-10-13T12-06-27-351Z.json', 'utf8'));

console.log('=== WALMART AUDIT META ===');
console.log('Meta:', audit.meta);
console.log('Summary Counters:', audit.summaryCounters);
console.log('Identified Systems:', audit.identifiedAntiFraudSystems);
console.log('VectorEvents Count:', audit.vectorEvents?.length);

const counts = {};
const methods = {};
const samples = {};
audit.vectorEvents?.forEach(e => {
  const k = e.vectorId || e.category;
  counts[k] = (counts[k] || 0) + 1;
  if (!methods[k]) methods[k] = new Set();
  methods[k].add(e.api);
  if (!samples[k]) samples[k] = [];
  if (samples[k].length < 2) {
    samples[k].push({ args: e.argsSummary, res: e.resultPreview });
  }
});

console.log('\n=== WALMART VECTOR BREAKDOWN ===');
for (const [k, v] of Object.entries(counts)) {
  console.log(`${k.padEnd(30)}: ${v.toString().padStart(3)} calls | APIs: ${[...methods[k]].join(', ')}`);
  console.log(`   Sample args: ${samples[k][0]?.args} | res: ${samples[k][0]?.res?.slice(0, 50)}`);
}

// Check Dossier HTML
const html = fs.readFileSync(path + '/detectexpert_dossier_www.walmart.com_2026-10-13T12-06-28-737Z.html', 'utf8');
const title = html.match(/<title>([\s\S]*?)<\/title>/i);
const headings = html.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi);
console.log('\nDossier Title:', title ? title[1].trim() : 'none');
console.log('Headings:', headings ? headings.map(h => h.replace(/<[^>]+>/g, '').trim()) : []);
