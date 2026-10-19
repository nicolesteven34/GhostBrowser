const fs = require('fs');

const auditPath = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic/detectexpert_audit_www.shopping.com_2026-10-13T10-47-02-350Z.json';
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

console.log('=== META ===');
console.log(audit.meta);

console.log('=== SUMMARY COUNTERS ===');
console.log(audit.summaryCounters);

console.log('=== IDENTIFIED ANTI-FRAUD SYSTEMS ===');
console.log(audit.identifiedAntiFraudSystems);

const eventVectorCounts = {};
audit.vectorEvents?.forEach(ev => {
    const id = ev.vectorId;
    eventVectorCounts[id] = (eventVectorCounts[id] || 0) + 1;
});
console.log('=== VECTOR EVENTS COUNTS ===');
console.log(eventVectorCounts);
