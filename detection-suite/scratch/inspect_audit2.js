const fs = require('fs');

const auditPath = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic/detectexpert_audit_www.shopping.com_2026-10-13T10-47-02-350Z.json';
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

console.log('=== AUDIT ROOT KEYS ===');
console.log(Object.keys(audit));

console.log('\n=== AUDIT TARGET INFO ===');
console.log({
    target: audit.target,
    targetUrl: audit.targetUrl,
    generator: audit.generator,
    timestamp: audit.timestamp,
    overallVerdict: audit.overallVerdict,
    riskScore: audit.riskScore
});

console.log('\n=== SUMMARY COUNTERS ===');
console.log(audit.summaryCounters);

console.log('\n=== LIBRARY PARITY ===');
console.log(audit.libraryParity);

console.log('\n=== ACTIVE AUDIT VECTORS ===');
if (audit.activeAuditVectors) {
    console.log(audit.activeAuditVectors);
} else if (audit.vectors) {
    console.log(audit.vectors.map(v => ({ id: v.id, title: v.title, calls: v.calls, category: v.category, threat: v.threat })));
}

console.log('\n=== THIRD PARTIES ===');
console.log(audit.thirdParties || audit.detectedEngines || audit.antiFraudSystems);
