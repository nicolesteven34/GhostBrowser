const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('id="ecommerceView"') || l.includes('tabECommerceBtn') || l.includes('ecommerce.js') || l.includes('tab-view')) {
    console.log(`${i + 1}: ${l.trim().slice(0, 100)}`);
  }
});
