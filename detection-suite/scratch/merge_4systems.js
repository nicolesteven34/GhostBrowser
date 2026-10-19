const fs = require('fs');
const path = require('path');

const apple = JSON.parse(fs.readFileSync('C:/Users/Home/Desktop/testsite1/ecomm 3/apple/detectexpert_audit_www.apple.com_2026-10-13T12-25-39-391Z.json'));
const dell = JSON.parse(fs.readFileSync('C:/Users/Home/Desktop/testsite1/ecomm 3/dell/detectexpert_audit_stats.dell.com_2026-10-13T12-43-40-280Z.json'));
const ebay = JSON.parse(fs.readFileSync('C:/Users/Home/Desktop/testsite1/ecomm 3/ebay/detectexpert_audit_signin.ebay.com_2026-10-13T12-13-57-353Z.json'));
const walmart = JSON.parse(fs.readFileSync('C:/Users/Home/Desktop/testsite1/walmart/detectexpert_audit_www.walmart.com_2026-10-13T12-06-27-351Z.json'));

const systems = {
  Apple: apple,
  Dell: dell,
  eBay: ebay,
  Walmart: walmart
};

console.log('Call counts:');
let grandTotal = 0;
for (const [k, v] of Object.entries(systems)) {
  console.log(`  ${k.padEnd(10)}: ${v.vectorEvents.length} calls`);
  grandTotal += v.vectorEvents.length;
}
console.log(`  GRAND TOTAL: ${grandTotal} calls`);

const merged = {};
for (const [sysName, audit] of Object.entries(systems)) {
  audit.vectorEvents.forEach(e => {
    const k = e.vectorId;
    if (!merged[k]) {
      merged[k] = {
        vectorId: k,
        category: e.category,
        threat: e.threat,
        totalCalls: 0,
        bySystem: { Apple: 0, Dell: 0, eBay: 0, Walmart: 0 }
      };
    }
    merged[k].totalCalls++;
    merged[k].bySystem[sysName]++;
  });
}

console.log('\n--- MERGED VECTORS ACROSS ALL 4 SYSTEMS ---');
console.log(`Unique active vector types: ${Object.keys(merged).length}`);
for (const [k, v] of Object.entries(merged)) {
  console.log(`${k.padEnd(32)} | Total: ${v.totalCalls.toString().padStart(3)} | A: ${v.bySystem.Apple.toString().padStart(2)} | D: ${v.bySystem.Dell.toString().padStart(3)} | E: ${v.bySystem.eBay.toString().padStart(3)} | W: ${v.bySystem.Walmart.toString().padStart(3)} | Threat: ${v.threat}`);
}

// Summary counters sum
const aggCounters = {};
for (const [sysName, audit] of Object.entries(systems)) {
  for (const [k, v] of Object.entries(audit.summaryCounters)) {
    aggCounters[k] = (aggCounters[k] || 0) + v;
  }
}
console.log('\nAggregated Summary Counters across 4 systems:');
console.log(aggCounters);
