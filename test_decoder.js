const fs = require('fs');
const content = fs.readFileSync('fp_runtime.js', 'utf8');

// Find end of rotation loop
// The rotation loop ends before (function(){const _0x3ad7c3=_0x1c56
const endRot = content.indexOf('(function(){const _0x3ad7c3=_0x1c56');
const header = content.slice(0, endRot);

const vm = require('vm');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(header, ctx);

console.log('0x7c3:', ctx._0x1c56(0x7c3));
console.log('0x708:', ctx._0x1c56(0x708));
console.log('0x4d4:', ctx._0x1c56(0x4d4));
console.log('0xde:', ctx._0x1c56(0xde));
console.log('0x3bb:', ctx._0x1c56(0x3bb));
