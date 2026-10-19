const fs = require('fs');
const path = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic';
const audit = JSON.parse(fs.readFileSync(path + '/detectexpert_audit_www.shopping.com_2026-10-13T10-47-02-350Z.json'));

console.log('Total vectorEvents:', audit.vectorEvents.length);

const vectorMap = {};
audit.vectorEvents.forEach((ev, idx) => {
  if (!vectorMap[ev.vectorId]) {
    vectorMap[ev.vectorId] = {
      count: 0,
      samples: [],
      apis: new Set(),
      args: new Set(),
      results: new Set(),
      threats: new Set()
    };
  }
  const entry = vectorMap[ev.vectorId];
  entry.count++;
  entry.apis.add(ev.api);
  entry.threats.add(ev.threat);
  if (entry.samples.length < 3) {
    entry.samples.push({
      idx,
      api: ev.api,
      argsSummary: ev.argsSummary,
      resultPreview: ev.resultPreview,
      callerScript: ev.callerScript,
      callerFunction: ev.callerFunction,
      extra: ev.extra
    });
  }
});

for (const [vecId, data] of Object.entries(vectorMap)) {
  console.log('==============================================');
  console.log(`VECTOR: ${vecId} | Count: ${data.count} | APIs: ${Array.from(data.apis).join(', ')} | Threats: ${Array.from(data.threats).join(', ')}`);
  console.log('Sample 1:', JSON.stringify(data.samples[0], null, 2));
  if (data.samples[1]) {
    console.log('Sample 2:', JSON.stringify(data.samples[1], null, 2));
  }
}
