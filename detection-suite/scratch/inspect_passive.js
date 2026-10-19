const fs = require('fs');
const path = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic';
const audit = JSON.parse(fs.readFileSync(path + '/detectexpert_audit_www.shopping.com_2026-10-13T10-47-02-350Z.json'));

console.log('summaryCounters:', audit.summaryCounters);
if (audit.passiveVectors) {
  console.log('passiveVectors:', audit.passiveVectors);
}
if (audit.meta) {
  console.log('meta:', audit.meta);
}
// Check if any other keys exist in audit
for (const key of Object.keys(audit)) {
  if (key !== 'vectorEvents' && key !== 'scriptsInventory') {
    console.log(`Key ${key}:`, JSON.stringify(audit[key], null, 2).slice(0, 300));
  }
}
