const fs = require('fs');
const code = fs.readFileSync('fp_runtime.js', 'utf8');

const endOfPreamble = code.indexOf('(function(){const _0x3ad7c3=_0x1c56');
const preamble = code.substring(0, endOfPreamble);

const vm = require('vm');
const ctx = {};
vm.runInNewContext(preamble, ctx);

const _0x1c56 = ctx._0x1c56;
console.log('Decoded test 0x3ad7c3(0x338):', _0x1c56(0x338));

// Now let's replace all _0x1c56(0x...) calls in the rest of code!
let body = code.substring(endOfPreamble);
let decodedCount = 0;
body = body.replace(/_0x(?:1c56|3ad7c3|3f7770|480eac|55b581|107542|4fec9c|4caebc|fa742a)\((0x[0-9a-f]+)\)/g, (match, hex) => {
    try {
        const val = _0x1c56(parseInt(hex, 16));
        decodedCount++;
        return JSON.stringify(val);
    } catch(e) {
        return match;
    }
});
console.log(`Decoded ${decodedCount} string calls!`);
fs.writeFileSync('fp_runtime_deobf.js', body);
console.log('Saved fp_runtime_deobf.js');
