const fs = require('fs');
const content = fs.readFileSync('fp_runtime_deobf.js', 'utf8');
const pos = content.indexOf('TIMEOUT');
console.log('Index of TIMEOUT:', pos);
if (pos !== -1) {
    console.log(content.slice(pos - 100, pos + 200));
}
