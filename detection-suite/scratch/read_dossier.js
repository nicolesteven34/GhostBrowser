const fs = require('fs');
const path = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic';
const html = fs.readFileSync(path + '/detectexpert_dossier_www.shopping.com_2026-10-13T10-47-04-273Z.html', 'utf8');

console.log('HTML size:', html.length);
const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
console.log('Title:', titleMatch ? titleMatch[1] : 'none');

// Let's find headings, cards, badges
const headings = html.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi);
console.log('Headings:', headings);

// Find summary counters
const counterMatches = html.match(/<div class="[^"]*stat[^"]*"[^>]*>([\s\S]*?)<\/div>/gi) || [];
console.log('Found stats count:', counterMatches.length);
if (counterMatches.length === 0) {
  // Let's search for "Active" or "Passive" or "Risk" in context
  const lines = html.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('Risk') || l.includes('active') || l.includes('Summary') || l.includes('Vector') || l.includes('score')) {
      if (l.length < 200) console.log(`Line ${i}: ${l.trim()}`);
    }
  });
}
