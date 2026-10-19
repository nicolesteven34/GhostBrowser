const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');

// Extract classes inside eCommerce3View
const ec3Match = html.match(/<div id="eCommerce3View"[\s\S]*?<\/div>\s*<!-- ProxyDetect/i);
if (!ec3Match) {
  console.log('eCommerce3View not found!');
  process.exit(1);
}

const ec3Html = ec3Match[0];
const classMatches = [...ec3Html.matchAll(/class="([^"]+)"/g)];
const usedClasses = new Set();
classMatches.forEach(m => {
  m[1].split(/\s+/).forEach(c => {
    if (c) usedClasses.add(c);
  });
});

console.log('Total unique classes in eCommerce3View:', usedClasses.size);

const missing = [];
usedClasses.forEach(c => {
  const regex = new RegExp(`\\.${c}\\b`);
  if (!regex.test(css)) {
    missing.push(c);
  }
});

console.log('Missing classes in style.css:', missing);
