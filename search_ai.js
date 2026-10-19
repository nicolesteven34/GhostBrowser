const fs = require('fs');
const content = fs.readFileSync('fp_runtime_deobf.js', 'utf8');
let pos = 0;
while (true) {
    pos = content.indexOf("'ai'", pos);
    if (pos === -1) break;
    console.log('Pos:', pos);
    console.log(content.slice(Math.max(0, pos - 50), pos + 100));
    pos += 4;
}
