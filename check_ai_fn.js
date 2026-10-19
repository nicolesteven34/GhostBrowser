const fs = require('fs');
const content = fs.readFileSync('fp_runtime_deobf.js', 'utf8');
const pos = content.indexOf(",['ai',");
console.log(content.slice(pos - 200, pos + 200));
