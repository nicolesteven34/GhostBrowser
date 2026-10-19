// Test ShoppingBenchmark execution in Node.js
global.window = global;
global.performance = require('perf_hooks').performance;
global.crypto = require('crypto').webcrypto;

require('../public/shopping.js');

(async () => {
  try {
    const res = await window.ShoppingBenchmark.runFullAudit();
    console.log('Overall Verdict:', res.overallVerdict);
    console.log('Risk Score:', res.riskScore);
    console.log('Duration:', res.durationMs + 'ms');
    console.log('CSM Sensor Hash:', res.csmSensorHash);
    console.log('Summary Counters:', res.forensicMetrics.summaryCounters);
    console.log('Total calls check:', res.forensicMetrics.summaryCounters.totalCalls);
    console.log('Vectors count:', res.forensicMetrics.vectors.length);
    console.log('Covered vectors count:', res.forensicMetrics.vectors.filter(v => v.status === 'COVERED').length);
    console.log('Active vectors with calls > 0:', res.forensicMetrics.vectors.filter(v => v.calls > 0).length);
    const totalCallsSum = res.forensicMetrics.vectors.reduce((sum, v) => sum + v.calls, 0);
    console.log('Sum of calls across all vectors in benchmark:', totalCallsSum);
    console.log('TEST PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
})();
