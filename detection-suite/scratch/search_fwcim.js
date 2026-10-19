const { execSync } = require('child_process');
const fs = require('fs');

const code = execSync('tar -xOf "C:\\Users\\Home\\Desktop\\app\\research\\ecomm 2 forensic\\detectexpert_scripts_www.shopping.com_2026-10-13T10-47-05-338Z.zip" scripts/04_FWCIMAssets.js', { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');

const keywords = ['battery', 'getBattery', 'hardwareConcurrency', 'deviceMemory', 'webdriver', 'plugins', 'canvas', 'webgl', 'speechSynthesis', 'userAgentData', 'platform', 'screen'];
for (const kw of keywords) {
  const matches = [...code.matchAll(new RegExp(kw, 'gi'))];
  console.log(`${kw.padEnd(20)}: ${matches.length} occurrences`);
}
