const fs = require('fs');
const path = require('path');

const base = 'C:/Users/Home/Desktop/testsite1/ecomm 3';
const apple = JSON.parse(fs.readFileSync(path.join(base, 'apple/detectexpert_audit_www.apple.com_2026-10-13T12-25-39-391Z.json')));
const dell = JSON.parse(fs.readFileSync(path.join(base, 'dell/detectexpert_audit_stats.dell.com_2026-10-13T12-43-40-280Z.json')));
const ebay = JSON.parse(fs.readFileSync(path.join(base, 'ebay/detectexpert_audit_signin.ebay.com_2026-10-13T12-13-57-353Z.json')));

console.log('Apple counters:', apple.summaryCounters);
console.log('Dell counters:', dell.summaryCounters);
console.log('eBay counters:', ebay.summaryCounters);

// Aggregated counters
const agg = {};
[apple, dell, ebay].forEach(s => {
  for (const [k, v] of Object.entries(s.summaryCounters)) {
    agg[k] = (agg[k] || 0) + v;
  }
});
console.log('Aggregated counters:', agg);
