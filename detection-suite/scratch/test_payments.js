const fs = require('fs');

// Load payments.js into global context
require('../public/payments.js');

async function test() {
    console.log("Running PaymentSystemsBenchmark audit...");
    const res = await globalThis.PaymentSystemsBenchmark.runFullAudit();
    
    console.log("Overall Verdict:", res.overallVerdict);
    console.log("Risk Score:", res.riskScore);
    console.log("Merged Sensor Hash:", res.mergedSensorHash);
    console.log("Total calls check:", res.totalCalls);
    console.log("Summary counters totalCalls:", res.forensicMetrics.summaryCounters.totalCalls);
    
    const activeVectors = res.forensicMetrics.vectors.filter(v => v.calls > 0);
    console.log("Active vectors with calls > 0:", activeVectors.length);
    
    const vectorCallsSum = activeVectors.reduce((acc, v) => acc + v.calls, 0);
    console.log("Sum of calls across all 19 active vectors:", vectorCallsSum);
    
    console.log("AMEX calls:", res.systems.amex.totalCalls);
    console.log("BOA calls:", res.systems.boa.totalCalls);
    console.log("LINK calls:", res.systems.link.totalCalls);
    console.log("PAYPAL calls:", res.systems.pp.totalCalls);
    console.log("STRIPE calls:", res.systems.stripe.totalCalls);
    console.log("WELLS FARGO calls:", res.systems.wf.totalCalls);
    console.log("WESTERN UNION calls:", res.systems.wu.totalCalls);

    if (res.totalCalls !== 612) throw new Error(`Expected 612 calls, got ${res.totalCalls}`);
    if (res.systems.amex.totalCalls !== 100) throw new Error(`AMEX calls mismatch: ${res.systems.amex.totalCalls}`);
    if (res.systems.boa.totalCalls !== 22) throw new Error(`BOA calls mismatch: ${res.systems.boa.totalCalls}`);
    if (res.systems.link.totalCalls !== 132) throw new Error(`LINK calls mismatch: ${res.systems.link.totalCalls}`);
    if (res.systems.pp.totalCalls !== 87) throw new Error(`PP calls mismatch: ${res.systems.pp.totalCalls}`);
    if (res.systems.stripe.totalCalls !== 64) throw new Error(`STRIPE calls mismatch: ${res.systems.stripe.totalCalls}`);
    if (res.systems.wf.totalCalls !== 98) throw new Error(`WF calls mismatch: ${res.systems.wf.totalCalls}`);
    if (res.systems.wu.totalCalls !== 109) throw new Error(`WU calls mismatch: ${res.systems.wu.totalCalls}`);
    if (activeVectors.length !== 19) throw new Error(`Expected 19 active vectors, got ${activeVectors.length}`);
    if (vectorCallsSum !== 612) throw new Error(`Expected sum 612, got ${vectorCallsSum}`);

    console.log("\nSUCCESS: All 612 calls perfectly matched across 7 payment systems and 19 active vectors!");
}

test().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
