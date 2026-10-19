const fs = require('fs');
const path = require('path');

const base = 'C:/Users/Home/Desktop/testsite1/ecomm 3';
const apple = JSON.parse(fs.readFileSync(path.join(base, 'apple/detectexpert_audit_www.apple.com_2026-10-13T12-25-39-391Z.json')));
const dell = JSON.parse(fs.readFileSync(path.join(base, 'dell/detectexpert_audit_stats.dell.com_2026-10-13T12-43-40-280Z.json')));
const ebay = JSON.parse(fs.readFileSync(path.join(base, 'ebay/detectexpert_audit_signin.ebay.com_2026-10-13T12-13-57-353Z.json')));

console.log('=== APPLE CALL SAMPLES ===');
apple.vectorEvents.slice(0, 5).forEach(e => console.log(`${e.vectorId} | ${e.api} | args: ${e.argsSummary} | res: ${e.resultPreview?.slice(0, 60)}`));

console.log('\n=== DELL CALL SAMPLES ===');
dell.vectorEvents.slice(0, 5).forEach(e => console.log(`${e.vectorId} | ${e.api} | args: ${e.argsSummary} | res: ${e.resultPreview?.slice(0, 60)}`));

console.log('\n=== EBAY CALL SAMPLES (especially portProbe & precision) ===');
ebay.vectorEvents.filter(e => e.vectorId.includes('port') || e.vectorId.includes('Precision') || e.vectorId.includes('webrtc')).slice(0, 8).forEach(e => {
  console.log(`${e.vectorId} | ${e.api} | args: ${e.argsSummary} | res: ${e.resultPreview?.slice(0, 60)}`);
});
