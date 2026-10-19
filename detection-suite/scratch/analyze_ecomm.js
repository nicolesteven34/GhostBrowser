const fs = require('fs');

const dossierHtml = fs.readFileSync('C:/Users/Home/Desktop/app/research/ecomm forensic/detectexpert_dossier_www.ecommerce.com_2026-10-13T09-14-26-532Z.html', 'utf8');
const auditJson = JSON.parse(fs.readFileSync('C:/Users/Home/Desktop/app/research/ecomm forensic/detectexpert_audit_www.ecommerce.com_2026-10-13T09-14-24-825Z.json', 'utf8'));

console.log('=== DOSSIER TITLE ===');
console.log(dossierHtml.match(/<title>(.*?)<\/title>/)?.[1]);

console.log('\n=== SUMMARY COUNTERS (from JSON) ===');
console.log(auditJson.summaryCounters);

console.log('\n=== IDENTIFIED ANTI-FRAUD SYSTEMS ===');
for (const [id, sys] of Object.entries(auditJson.identifiedAntiFraudSystems || {})) {
    console.log(`- ${sys.name} (${id})`);
    console.log(`  Vendor: ${sys.vendor}`);
    console.log(`  Category: ${sys.category}`);
    console.log(`  Vectors Checked: ${sys.vectorsChecked?.join(', ')}`);
}

console.log('\n=== SCRIPTS INVENTORY IN AUDIT JSON ===');
console.log(`Total scripts in inventory: ${auditJson.scriptsInventory?.length || 0}`);
(auditJson.scriptsInventory || []).slice(0, 15).forEach((s, idx) => {
    console.log(`  ${idx + 1}. [${s.system || 'First-Party / Other'}] ${s.url?.slice(0, 90)} (${s.callCount || 0} calls)`);
});
