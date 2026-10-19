const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const appJs = fs.readFileSync('public/app.js', 'utf8');

const regex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const ids = new Set();
while ((match = regex.exec(appJs)) !== null) {
    ids.add(match[1]);
}

const missing = [];
for (const id of ids) {
    if (!html.includes('id="' + id + '"') && !html.includes("id='" + id + "'")) {
        missing.push(id);
    }
}

console.log('Checked', ids.size, 'IDs from app.js.');
if (missing.length > 0) {
    console.log('Missing IDs in index.html:', missing);
} else {
    console.log('All IDs found in index.html! 100% matched.');
}
