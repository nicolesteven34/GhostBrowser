const fs = require('fs');

// Create mock window and globals
global.window = global;
global.document = {
    createElement(tag) {
        if (tag === 'canvas') {
            return {
                width: 192,
                height: 108,
                getContext(ctxType) {
                    if (ctxType === '2d') {
                        return {
                            clearRect() {},
                            beginPath() {},
                            moveTo() {},
                            lineTo() {},
                            closePath() {},
                            fill() {},
                            getImageData(x, y, w, h) {
                                return { data: new Uint8Array(w * h * 4).fill(128) };
                            },
                            measureText(text) {
                                return { width: text.length * 10 };
                            }
                        };
                    }
                    if (ctxType === 'webgl' || ctxType === 'webgl2') {
                        return {
                            viewport() {},
                            clearColor() {},
                            clear() {},
                            createShader() { return {}; },
                            shaderSource() {},
                            compileShader() {},
                            createProgram() { return {}; },
                            attachShader() {},
                            linkProgram() {},
                            useProgram() {},
                            enable() {},
                            blendFunc() {},
                            createBuffer() { return {}; },
                            bindBuffer() {},
                            bufferData() {},
                            getAttribLocation() { return 0; },
                            enableVertexAttribArray() {},
                            vertexAttribPointer() {},
                            drawArrays() {},
                            readPixels(x, y, w, h, format, type, pixels) {
                                pixels.fill(128);
                            },
                            getParameter(p) {
                                if (p === 0x9245) return 'Google Inc. (Intel)';
                                if (p === 0x9246) return 'ANGLE (Intel UHD Graphics 630 / Direct3D 11)';
                                return 16384;
                            },
                            getExtension(ext) {
                                return { UNMASKED_VENDOR_WEBGL: 0x9245, UNMASKED_RENDERER_WEBGL: 0x9246 };
                            },
                            getShaderPrecisionFormat() {
                                return { rangeMin: 127, rangeMax: 127, precision: 23 };
                            },
                            getSupportedExtensions() {
                                return ['ANGLE_instanced_arrays', 'EXT_blend_minmax', 'OES_texture_float'];
                            },
                            VERTEX_SHADER: 35633,
                            FRAGMENT_SHADER: 35632,
                            LOW_FLOAT: 36336,
                            MEDIUM_FLOAT: 36337,
                            HIGH_FLOAT: 36338,
                            LOW_INT: 36339,
                            MEDIUM_INT: 36340,
                            HIGH_INT: 36341,
                            RGBA: 6408,
                            UNSIGNED_BYTE: 5121,
                            COLOR_BUFFER_BIT: 16384,
                            TRIANGLES: 4,
                            STATIC_DRAW: 35044,
                            ARRAY_BUFFER: 34962,
                            FLOAT: 5126,
                            SRC_ALPHA: 770,
                            ONE_MINUS_SRC_ALPHA: 771,
                            BLEND: 3042
                        };
                    }
                    return null;
                },
                toDataURL() {
                    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA';
                },
                toBlob(cb) {
                    cb(new Blob(['test'], { type: 'image/png' }));
                }
            };
        }
        return {};
    }
};

global.navigator = {
    hardwareConcurrency: 12,
    deviceMemory: 16,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36',
    platform: 'Win32',
    language: 'en-US',
    languages: ['en-US', 'en'],
    webdriver: false,
    gpu: {
        async requestAdapter() {
            return {
                isFallbackAdapter: false,
                limits: { maxComputeInvocationsPerWorkgroup: 1024, maxComputeWorkgroupStorageSize: 32768, maxBufferSize: 268435456 },
                requestAdapterInfo: async () => ({ vendor: 'Intel', architecture: 'Gen9.5', device: 'Intel UHD Graphics 630', description: 'Direct3D 12' })
            };
        }
    },
    async getBattery() {
        return { level: 1.0, charging: true };
    }
};

global.screen = {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
    colorDepth: 24,
    pixelDepth: 24,
    orientation: { type: 'landscape-primary' }
};

global.crypto = {
    subtle: {
        async digest(algo, data) {
            const crypto = require('crypto');
            return crypto.createHash('sha256').update(data).digest();
        }
    }
};

global.performance = {
    now: () => Date.now()
};

global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 1);

// Load patched antibot.js
require('../public/antibot.js');

async function test() {
    console.log('Testing AntiBotBenchmark.runFullAudit()...');
    const res = await global.window.AntiBotBenchmark.runFullAudit({ ip: '135.134.139.92' });
    console.log('Audit completed successfully!');
    console.log('Overall Verdict:', res.overallVerdict);
    console.log('Anomaly Score:', res.anomalyScore);
    console.log('Forensic Summary Counters:', res.forensicMetrics.summaryCounters);
    console.log('Forensic Vectors Count:', res.forensicMetrics.vectors.length);
    console.log('Sample Vectors:');
    res.forensicMetrics.vectors.slice(0, 5).forEach(v => {
        console.log(`  [${v.id}] ${v.title} -> calls: ${v.calls}, probe: ${v.probe}`);
    });
    console.log('Audio Data Checksum:', res.audio.checksum);
    console.log('Audio Tasks:', res.audio.renderedBuffers.length);
}

test().catch(e => {
    console.error('Test failed:', e);
    process.exit(1);
});
