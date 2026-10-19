const fs = require('fs');

const files = [
  'hwfp.js',
  'gpufp.js',
  'monfp.js',
  'surface-comparison.js',
  'antispoof-detection.js',
  'fpint-v7-client.js'
];

for (const f of files) {
  const code = fs.readFileSync('scratch/antibot_scripts/' + f, 'utf8');
  console.log('=== ' + f + ' ===');
  
  // Look for event listeners or dispatchEvent
  const events = [];
  const evMatches = code.matchAll(/(?:addEventListener|dispatchEvent|CustomEvent)\s*\(\s*['"]([^'"]+)['"]/g);
  for (const m of evMatches) events.push(m[1]);
  console.log('Events:', Array.from(new Set(events)));

  // Look for document.getElementById calls
  const ids = [];
  const idMatches = code.matchAll(/(?:getElementById|\$)\s*\(\s*['"]([^'"]+)['"]/g);
  for (const m of idMatches) ids.push(m[1]);
  console.log('DOM IDs (top 20):', Array.from(new Set(ids)).slice(0, 20));
}
