const fs = require('fs');
const path = 'C:/Users/Home/Desktop/app/research/ecomm 2 forensic';
const audit = JSON.parse(fs.readFileSync(path + '/detectexpert_audit_www.shopping.com_2026-10-13T10-47-02-350Z.json'));

console.log('scriptsInventory count:', audit.scriptsInventory ? audit.scriptsInventory.length : 0);
if (audit.scriptsInventory && audit.scriptsInventory.length > 0) {
  console.log('Sample scriptInventory item:', JSON.stringify(audit.scriptsInventory[0], null, 2));
}

// Let's check cookies if present
console.log('Keys in audit:', Object.keys(audit));
