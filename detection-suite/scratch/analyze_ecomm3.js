const fs = require('fs');
const path = require('path');

const base = 'C:/Users/Home/Desktop/testsite1/ecomm 3';
const systems = ['apple', 'dell', 'ebay'];

systems.forEach(sys => {
  const dir = path.join(base, sys);
  const files = fs.readdirSync(dir);
  console.log(`\n=======================================================`);
  console.log(`SYSTEM: ${sys.toUpperCase()}`);
  console.log(`=======================================================`);
  
  // Find JSON audit files
  const auditFiles = files.filter(f => f.startsWith('detectexpert_audit_') && f.endsWith('.json'));
  auditFiles.forEach(af => {
    const filePath = path.join(dir, af);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`\nFile: ${af}`);
    console.log('Meta:', content.meta);
    console.log('Summary Counters:', content.summaryCounters);
    console.log('Anti-Fraud Systems:', content.identifiedAntiFraudSystems);
    console.log('Total vectorEvents:', content.vectorEvents ? content.vectorEvents.length : 0);
    
    if (content.vectorEvents) {
      const counts = {};
      const threats = {};
      content.vectorEvents.forEach(e => {
        const k = e.vectorId || e.category;
        counts[k] = (counts[k] || 0) + 1;
        threats[k] = e.threat;
      });
      console.log('Vector breakdown:');
      for (const [k, v] of Object.entries(counts)) {
        console.log(`  - ${k.padEnd(30)}: ${v.toString().padStart(4)} calls (Threat: ${threats[k]})`);
      }
    }
  });

  // Find HTML dossier
  const dossierFile = files.find(f => f.startsWith('detectexpert_dossier_') && f.endsWith('.html'));
  if (dossierFile) {
    const html = fs.readFileSync(path.join(dir, dossierFile), 'utf8');
    const title = html.match(/<title>([\s\S]*?)<\/title>/i);
    const headings = html.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi);
    console.log(`\nDossier HTML: ${dossierFile}`);
    console.log('Title:', title ? title[1].trim() : 'none');
    console.log('Headings:', headings ? headings.map(h => h.replace(/<[^>]+>/g, '').trim()) : []);
  }
});
