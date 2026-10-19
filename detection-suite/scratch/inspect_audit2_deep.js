const fs = require('fs');

const auditPath = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic/detectexpert_audit_www.shopping.com_2026-10-13T10-47-02-350Z.json';
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

console.log('=== META ===');
console.log(JSON.stringify(audit.meta, null, 2));

console.log('\n=== SUMMARY COUNTERS ===');
console.log(JSON.stringify(audit.summaryCounters, null, 2));

console.log('\n=== IDENTIFIED ANTI-FRAUD SYSTEMS ===');
console.log(JSON.stringify(audit.identifiedAntiFraudSystems, null, 2));

console.log('\n=== VECTOR EVENTS COUNT ===', audit.vectorEvents?.length);

const eventVectorCounts = {};
audit.vectorEvents?.forEach(ev => {
    const id = ev.vectorId || ev.id || ev.vector;
    eventVectorCounts[id] = (eventVectorCounts[id] || 0) + 1;
});
console.log('\n=== VECTOR EVENTS BREAKDOWN ===');
console.log(eventVectorCounts);

console.log('\n=== VECTOR EVENT SAMPLES (First 5) ===');
audit.vectorEvents?.slice(0, 5).forEach(ev => console.log(JSON.stringify(ev)));
