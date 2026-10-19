const fs = require('fs');

const f1 = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic/detectexpert_audit_www.shopping.com_2026-10-13T10-45-14-725Z.json';
const f2 = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic/detectexpert_audit_www.shopping.com_2026-10-13T10-47-02-350Z.json';

const a1 = JSON.parse(fs.readFileSync(f1, 'utf8'));
const a2 = JSON.parse(fs.readFileSync(f2, 'utf8'));

console.log('File 1 Meta:', a1.meta);
console.log('File 1 Counters:', a1.summaryCounters);
console.log('File 1 Events count:', a1.vectorEvents?.length);

console.log('\nFile 2 Meta:', a2.meta);
console.log('File 2 Counters:', a2.summaryCounters);
console.log('File 2 Events count:', a2.vectorEvents?.length);
