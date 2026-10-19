const fs = require('fs');

const auditPath = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic/detectexpert_audit_www.shopping.com_2026-10-13T10-47-02-350Z.json';
const vectorsCsvPath = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic/detectexpert_vectors_www.shopping.com_2026-10-13T10-46-43-219Z.csv';

const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

console.log('=== ECOMMERCE 2 (shopping.com) AUDIT METADATA ===');
console.log('Target:', audit.target);
console.log('Target URL:', audit.targetUrl || audit.url);
console.log('Generator:', audit.generator);
console.log('Timestamp:', audit.timestamp);
console.log('Risk Score:', audit.riskScore || audit.score);
console.log('Verdict:', audit.verdict || audit.overallVerdict);
console.log('\n=== SUMMARY COUNTERS ===');
console.log(JSON.stringify(audit.summaryCounters || audit.summary || audit.metrics, null, 2));

console.log('\n=== DETECTED THIRD PARTIES / SCRIPTS ===');
if (audit.thirdParties || audit.scripts || audit.fingerprintingEngines) {
    console.log(JSON.stringify(audit.thirdParties || audit.scripts || audit.fingerprintingEngines, null, 2));
}

// Analyze Vectors CSV
const csv = fs.readFileSync(vectorsCsvPath, 'utf8').trim().split('\n');
console.log('\n=== CSV TOTAL ROWS ===', csv.length - 1);
const header = csv[0].split(',');
console.log('CSV Header:', header.join(' | '));

const vectorCounts = {};
const categoryCounts = {};
const engineCallers = new Set();

csv.slice(1).forEach(row => {
    // Basic CSV parser accounting for quotes
    const match = row.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
    if (!match) return;
    const cols = match.map(c => c.replace(/^,?"?|"$/g, '').replace(/""/g, '"'));
    const vectorId = cols[1] || cols[0];
    const category = cols[3] || cols[2];
    const caller = cols[7] || cols[6];

    vectorCounts[vectorId] = (vectorCounts[vectorId] || 0) + 1;
    if (category) categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    if (caller && caller.length > 5) engineCallers.add(caller.slice(0, 80));
});

console.log('\n=== VECTORS BY CALL COUNT ===');
Object.entries(vectorCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([v, c], idx) => {
        console.log(`${idx + 1}. ${v}: ${c} calls`);
    });

console.log('\n=== CALLER / SCRIPT EXAMPLES ===');
Array.from(engineCallers).slice(0, 15).forEach(c => console.log('Caller:', c));
