const fs = require('fs');
const path = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic';
const audit = JSON.parse(fs.readFileSync(path + '/detectexpert_audit_www.shopping.com_2026-10-13T10-47-02-350Z.json'));

console.log('--- VECTOR COUNTS & METHODS ---');
const group = {};
audit.vectorEvents.forEach(e => {
  const key = `${e.category} | ${e.vectorId} | ${e.api}`;
  if (!group[key]) {
    group[key] = { count: 0, callers: new Set(), samples: [] };
  }
  group[key].count++;
  const scriptName = e.callerScript ? e.callerScript.split('/').pop().split('?')[0] : 'inline';
  group[key].callers.add(scriptName);
  if (group[key].samples.length < 2) {
    group[key].samples.push({
      args: e.argsSummary,
      result: e.resultPreview,
      extra: e.extra
    });
  }
});

for (const [k, v] of Object.entries(group)) {
  console.log(`\n=== [${v.count} calls] ${k} ===`);
  console.log(`Callers: ${[...v.callers].join(', ')}`);
  console.log(`Sample 1: args=${JSON.stringify(v.samples[0].args)} | result=${JSON.stringify(v.samples[0].result)}`);
  if (v.samples[1]) {
    console.log(`Sample 2: args=${JSON.stringify(v.samples[1].args)} | result=${JSON.stringify(v.samples[1].result)}`);
  }
}
