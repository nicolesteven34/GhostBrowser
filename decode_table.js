const fs = require('fs');
const content = fs.readFileSync('fp_runtime_deobf.js', 'utf8');

// Find string array
const matchArr = content.match(/function _0x2d6d\(\)\{const _0x[a-f0-9]+=\[([\s\S]*?)\];return/);
if (matchArr) {
    const rawStrings = eval('[' + matchArr[1] + ']');
    console.log('Total strings:', rawStrings.length);
    // The offset in _0x1c56 is 0x8d
    // _0x51c512 = _0x51c512 - 0x8d
    // But there is a rotation loop at the beginning of fp_runtime!
}
