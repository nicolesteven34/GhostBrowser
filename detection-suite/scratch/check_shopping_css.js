const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');

// Extract classes inside shoppingView
const shoppingMatch = html.match(/<div id="shoppingView"[\s\S]*?<\/div>\s*<!-- ProxyDetect/i);
if (!shoppingMatch) {
  console.log('shoppingView not found!');
  process.exit(1);
}

const shopHtml = shoppingMatch[0];
const classMatches = [...shopHtml.matchAll(/class="([^"]+)"/g)];
const usedClasses = new Set();
classMatches.forEach(m => {
  m[1].split(/\s+/).forEach(c => {
    if (c) usedClasses.add(c);
  });
});

console.log('Total unique classes in shoppingView:', usedClasses.size);

const missing = [];
usedClasses.forEach(c => {
  // Check if .class appears in CSS
  const regex = new RegExp(`\\.${c}\\b`);
  if (!regex.test(css)) {
    missing.push(c);
  }
});

console.log('Missing classes in style.css:', missing);
