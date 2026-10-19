const fs = require('fs');
const path = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic';
const lib = fs.readFileSync(path + '/detectexpert_vector_library.csv', 'utf8');
const lines = lib.trim().split('\n');
console.log('Total library vectors:', lines.length - 1);
lines.slice(1).forEach((l, idx) => {
  const parts = l.split('","');
  const id = parts[0].replace(/^"/, '');
  const title = parts[1];
  const cat = parts[2];
  const threat = parts[3];
  console.log(`${(idx + 1).toString().padStart(2)}. [${id}] - ${cat} - ${threat} - ${title}`);
});
