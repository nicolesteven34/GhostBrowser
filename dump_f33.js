const fs = require('fs');
const content = fs.readFileSync('fp_runtime_deobf.js', 'utf8');
const start = content.indexOf('async function _0xf33cf');
const end = content.indexOf('async function _0x149647');
console.log(content.slice(start, end));
