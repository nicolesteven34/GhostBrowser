const fs = require('fs');
const path = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic';
const audit = JSON.parse(fs.readFileSync(path + '/detectexpert_audit_www.shopping.com_2026-10-13T10-47-02-350Z.json'));

const summary = {};
audit.vectorEvents.forEach((ev, idx) => {
  if (!summary[ev.vectorId]) {
    summary[ev.vectorId] = {
      count: 0,
      api: ev.api,
      category: ev.category,
      threat: ev.threat,
      items: []
    };
  }
  summary[ev.vectorId].count++;
  summary[ev.vectorId].items.push({
    api: ev.api,
    argsSummary: ev.argsSummary,
    resultPreview: ev.resultPreview,
    callerScript: ev.callerScript ? ev.callerScript.split('?')[0] : '',
    callerFunction: ev.callerFunction,
    lineNumber: ev.lineNumber,
    extra: ev.extra
  });
});

for (const [k, v] of Object.entries(summary)) {
  console.log(`[${k}] count: ${v.count} | api: ${v.api} | cat: ${v.category} | threat: ${v.threat}`);
  // print unique argsSummary
  const uniqueArgs = [...new Set(v.items.map(i => i.argsSummary))];
  console.log('  Args: ', uniqueArgs.slice(0, 5));
  const uniqueResults = [...new Set(v.items.map(i => i.resultPreview))];
  console.log('  Results: ', uniqueResults.slice(0, 5));
}
