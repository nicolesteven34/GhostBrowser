const fs = require('fs');
const path = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic';
const html = fs.readFileSync(path + '/detectexpert_dossier_www.shopping.com_2026-10-13T10-47-04-273Z.html', 'utf8');

const tableMatch = html.match(/<h2>Scripts Invoking Fingerprinting Checks<\/h2>[\s\S]*?<table>([\s\S]*?)<\/table>/i);
if (tableMatch) {
  const trs = tableMatch[1].match(/<tr>([\s\S]*?)<\/tr>/gi);
  console.log('Script rows count:', trs ? trs.length : 0);
  trs && trs.slice(1).forEach(tr => {
    const tds = tr.match(/<td>([\s\S]*?)<\/td>/gi);
    if (tds && tds.length >= 5) {
      const name = tds[0].replace(/<[^>]+>/g, '').trim();
      const calls = tds[3].replace(/<[^>]+>/g, '').trim();
      const vecs = tds[4].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (parseInt(calls, 10) > 0) {
        console.log(`${name.padEnd(35)} | calls: ${calls.padStart(3)} | ${vecs}`);
      }
    }
  });
}
