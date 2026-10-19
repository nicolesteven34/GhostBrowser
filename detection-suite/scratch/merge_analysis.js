const fs = require('fs');
const path = require('path');

const base = 'C:/Users/Home/Desktop/testsite1/ecomm 3';
const apple = JSON.parse(fs.readFileSync(path.join(base, 'apple/detectexpert_audit_www.apple.com_2026-10-13T12-25-39-391Z.json')));
const dell = JSON.parse(fs.readFileSync(path.join(base, 'dell/detectexpert_audit_stats.dell.com_2026-10-13T12-43-40-280Z.json')));
const ebay = JSON.parse(fs.readFileSync(path.join(base, 'ebay/detectexpert_audit_signin.ebay.com_2026-10-13T12-13-57-353Z.json')));

console.log('Apple calls:', apple.vectorEvents.length);
console.log('Dell calls:', dell.vectorEvents.length);
console.log('eBay calls:', ebay.vectorEvents.length);
console.log('Combined calls:', apple.vectorEvents.length + dell.vectorEvents.length + ebay.vectorEvents.length);

const combined = {};
const systemsMap = { Apple: apple, Dell: dell, eBay: ebay };

for (const [sysName, audit] of Object.entries(systemsMap)) {
  audit.vectorEvents.forEach(e => {
    const k = e.vectorId;
    if (!combined[k]) {
      combined[k] = {
        vectorId: k,
        category: e.category,
        threat: e.threat,
        api: e.api,
        totalCalls: 0,
        bySystem: { Apple: 0, Dell: 0, eBay: 0 }
      };
    }
    combined[k].totalCalls++;
    combined[k].bySystem[sysName]++;
  });
}

console.log('\n--- MERGED VECTORS ACROSS 3 SYSTEMS ---');
console.log(`Unique vectors: ${Object.keys(combined).length}`);
for (const [k, v] of Object.entries(combined)) {
  console.log(`${k.padEnd(32)} | Total: ${v.totalCalls.toString().padStart(3)} | Apple: ${v.bySystem.Apple.toString().padStart(2)} | Dell: ${v.bySystem.Dell.toString().padStart(3)} | eBay: ${v.bySystem.eBay.toString().padStart(3)} | Threat: ${v.threat}`);
}
