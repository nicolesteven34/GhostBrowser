const fs = require('fs');
const path = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic';
const lib = fs.readFileSync(path + '/detectexpert_vector_library.csv', 'utf8');
const lines = lib.trim().split('\n');
console.log('Total library vectors:', lines.length - 1);
console.log('Header:', lines[0]);
lines.slice(1, 15).forEach(l => console.log(l));
