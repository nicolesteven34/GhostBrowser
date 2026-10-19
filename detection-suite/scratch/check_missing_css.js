const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');

const classRegex = /class="([^"]+)"/g;
const classes = new Set();
let match;
while ((match = classRegex.exec(html)) !== null) {
    match[1].split(/\s+/).forEach(c => {
        if (c.trim()) classes.add(c.trim());
    });
}

const missing = [];
classes.forEach(c => {
    // Check if .class appears in css
    const regex = new RegExp('\\.' + c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?=[\\s{,.:#>\\[])');
    if (!regex.test(css)) {
        missing.push(c);
    }
});

console.log('Total classes in index.html:', classes.size);
console.log('Missing classes in style.css:', missing.length);
console.log(missing.sort());
