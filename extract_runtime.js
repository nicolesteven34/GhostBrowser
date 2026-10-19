const fs = require('fs');
const content = fs.readFileSync('saveFingerprint.js', 'utf8');
    const endIdx = content.indexOf('`;function U()');
    const startIdx = content.lastIndexOf('`', endIdx - 1);
    const rawString = content.substring(startIdx + 1, endIdx);
    fs.writeFileSync('fp_runtime.js', rawString);
    console.log('Saved fp_runtime.js, length:', rawString.length);

