const fs = require('fs');

const csvPath = 'C:/Users/Home/Desktop/app/research/anti.bot forensic/detectexpert_vectors_anti.bot_2026-10-13T06-57-19-733Z.csv';
const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
console.log('Total event rows in CSV:', lines.length - 1);

function parseCsvLine(line) {
    const res = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            res.push(current);
            current = '';
        } else {
            current += c;
        }
    }
    res.push(current);
    return res;
}

const header = parseCsvLine(lines[0]);
console.log('Headers:', header);

const vectorCounts = {};
const apiMethods = {};
const categories = {};
const callerScripts = {};

for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const cat = cols[3];
    const vecId = cols[4];
    const apiMethod = cols[6];
    const callerScript = cols[7];
    
    if (vecId) {
        vectorCounts[vecId] = (vectorCounts[vecId] || 0) + 1;
        if (!apiMethods[vecId]) apiMethods[vecId] = new Set();
        apiMethods[vecId].add(apiMethod);
        categories[vecId] = cat;
        if (!callerScripts[callerScript]) callerScripts[callerScript] = 0;
        callerScripts[callerScript]++;
    }
}

console.log('\n--- VECTOR COUNTS IN ANTI.BOT ---');
const sorted = Object.entries(vectorCounts).sort((a,b) => b[1] - a[1]);
let sum = 0;
for (const [id, count] of sorted) {
    sum += count;
    console.log(id.padEnd(30), String(count).padStart(5), '|', categories[id], '| APIs:', Array.from(apiMethods[id]).join('; '));
}
console.log('TOTAL CALLS:', sum);

console.log('\n--- CALLER SCRIPTS ---');
for (const [script, count] of Object.entries(callerScripts)) {
    console.log(script.padEnd(80), count);
}

const html = fs.readFileSync('C:/Users/Home/Desktop/app/research/anti.bot forensic/detectexpert_dossier_anti.bot_2026-10-13T06-59-03-982Z.html', 'utf8');
const titleMatch = html.match(/<title>([^<]+)<\/title>/);
const cards = [];
const cardRegex = /<div class="card"><div class="val">([^<]+)<\/div><div class="lbl">([^<]+)<\/div><\/div>/g;
let m;
while ((m = cardRegex.exec(html)) !== null) {
    cards.push({ val: m[1], lbl: m[2] });
}
console.log('\nTitle:', titleMatch ? titleMatch[1] : 'none');
console.log('Summary Cards in Dossier:');
console.table(cards);

const sectionHeaders = html.match(/<h2>([^<]+)<\/h2>/g) || [];
console.log('Sections:', sectionHeaders.map(s => s.replace(/<\/?h2>/g, '')));

