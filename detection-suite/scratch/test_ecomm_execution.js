// Simulation test of ecommerce.js execution
// Mock browser globals if in Node
globalThis.window = globalThis;
globalThis.performance = performance;
globalThis.navigator = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    platform: 'Win32',
    hardwareConcurrency: 16,
    deviceMemory: 8,
    webdriver: false,
    mediaDevices: {
        enumerateDevices: async () => [
            { kind: 'audioinput', deviceId: 'default' },
            { kind: 'videoinput', deviceId: 'webcam_1' },
            { kind: 'audiooutput', deviceId: 'speaker_1' }
        ]
    },
    getBattery: async () => ({
        level: 1.0,
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity
    })
};
globalThis.speechSynthesis = {
    getVoices: () => [
        { name: 'Microsoft David - English (United States)', lang: 'en-US' },
        { name: 'Microsoft Zira - English (United States)', lang: 'en-US' }
    ]
};
globalThis.document = {
    createElement: (tag) => {
        if (tag === 'canvas') {
            return {
                width: 300,
                height: 150,
                getContext: () => ({
                    font: '',
                    fillStyle: '',
                    textBaseline: '',
                    measureText: (txt) => ({ width: 120.45 }),
                    fillRect: () => {},
                    fillText: () => {},
                    arc: () => {},
                    beginPath: () => {},
                    closePath: () => {},
                    fill: () => {},
                    createLinearGradient: () => ({ addColorStop: () => {} }),
                    createRadialGradient: () => ({ addColorStop: () => {} }),
                    getParameter: (p) => 'Test GPU Parameter',
                    getExtension: () => ({}),
                    getSupportedExtensions: () => ['ANGLE_instanced_arrays', 'EXT_blend_minmax'],
                    getShaderPrecisionFormat: () => ({ rangeMin: 127, rangeMax: 127, precision: 23 })
                }),
                toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAABQCAYAAAD...'
            };
        }
        return {};
    }
};

require('../public/ecommerce.js');

async function test() {
    console.log('Testing ECommerceBenchmark.runFullAudit()...');
    const result = await globalThis.ECommerceBenchmark.runFullAudit({ ip: '135.134.139.92' });
    console.log('Result timestamp:', result.timestamp);
    console.log('Risk Score:', result.riskScore);
    console.log('Overall Verdict:', result.overallVerdict);
    console.log('Sensor Hash:', result.sensorHash);
    console.log('Sensor Payload Length:', result.sensorData?.length);
    console.log('reCAPTCHA Score:', result.recaptcha?.score);
    console.log('Forensic Total Calls:', result.forensicMetrics?.summaryCounters?.totalCalls);
    console.log('Active Vectors Count:', result.forensicMetrics?.vectors?.length);
    console.log('Test PASSED!');
}

test().catch(err => {
    console.error('Test FAILED:', err);
    process.exit(1);
});
