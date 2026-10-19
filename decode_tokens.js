const fs = require('fs');
const content = fs.readFileSync('fp_runtime.js', 'utf8');
const endRot = content.indexOf('(function(){const _0x3ad7c3=_0x1c56');
const header = content.slice(0, endRot);

const vm = require('vm');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(header, ctx);

console.log('0xc2:', ctx._0x1c56(0xc2));
console.log('0x48b:', ctx._0x1c56(0x48b));
console.log('0x568:', ctx._0x1c56(0x568));
console.log('0x263:', ctx._0x1c56(0x263));
console.log('0x365:', ctx._0x1c56(0x365));
console.log('0x281:', ctx._0x1c56(0x281));
console.log('0x752:', ctx._0x1c56(0x752));
console.log('0x722:', ctx._0x1c56(0x722));
console.log('0x186:', ctx._0x1c56(0x186));
console.log('0x1f1:', ctx._0x1c56(0x1f1));
