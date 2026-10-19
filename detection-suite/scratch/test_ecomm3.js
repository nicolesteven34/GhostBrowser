global.window = global;
global.performance = require('perf_hooks').performance;
global.crypto = require('crypto').webcrypto;

require('../public/ecomm3.js');

(async () => {
  try {
    const res = await window.ECommerce3Benchmark.runFullAudit();
    console.log('Overall Verdict:', res.overallVerdict);
    console.log('Risk Score:', res.riskScore);
    console.log('Total calls check:', res.totalCalls);
    console.log('Summary counters totalCalls:', res.forensicMetrics.summaryCounters.totalCalls);
    console.log('Active vectors with calls > 0:', res.forensicMetrics.vectors.filter(v => v.calls > 0).length);
    const sumCalls = res.forensicMetrics.vectors.reduce((s, v) => s + v.calls, 0);
    console.log('Sum of calls across all 18 vectors:', sumCalls);
    console.log('Apple calls:', res.systems.apple.totalCalls);
    console.log('Dell calls:', res.systems.dell.totalCalls);
    console.log('eBay calls:', res.systems.ebay.totalCalls);
    console.log('Walmart calls:', res.systems.walmart.totalCalls);
    if (sumCalls === 633 && res.totalCalls === 633 && res.systems.walmart.totalCalls === 224) {
      console.log('SUCCESS: All 633 calls perfectly matched across 4 systems!');
    } else {
      console.error('MISMATCH!');
      process.exit(1);
    }
  } catch (e) {
    console.error('ERROR:', e);
    process.exit(1);
  }
})();
