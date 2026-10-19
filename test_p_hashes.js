const fs = require('fs');

const D = (e) => {
    let t = 14695981039346656037n, n = 18446744073709551615n;
    for (let r = 0; r < e.length; r++) t ^= BigInt(e.charCodeAt(r)), t = t * 1099511628211n & n;
    return t ^= t >> 32n, t = t * 15485907386658061715n & n, t ^= t >> 32n, t.toString(16).padStart(16, '0');
};
const E = (e) => Array.isArray(e) ? e.map(E) : e && typeof e == 'object' ? Object.fromEntries(Object.entries(e).sort(([e], [t]) => e.localeCompare(t)).map(([e, t]) => [e, E(t)])) : e;
const T = (e) => JSON.stringify(E(e));
const O = (e) => D(T(e));
const F = (e) => {
    if (!e || typeof e != 'object' || Array.isArray(e)) return e;
    let t = { ...e };
    delete t.tanh08;
    return t;
};

const bitmask = "10001111000101111000111111111";
const plugins = {
    items: [
        "PDF Viewer",
        "Chrome PDF Viewer",
        "Chromium PDF Viewer",
        "Microsoft Edge PDF Viewer",
        "WebKit built-in PDF"
    ],
    count: 5
};
const mimeTypes = {
    items: [
        "application/pdf",
        "text/pdf"
    ],
    count: 2
};
const mathFingerprint = {
    acos: 1.4473588658278522,
    acosh: 709.889355822726,
    asin: 0.12343746096704435,
    asinh: 0.881373587019543,
    atanh: 0.5493061443340549,
    atan: 0.4636476090008061,
    sin: 0.8178819121159085,
    sinh: 1.1752011936438014,
    cos: -0.8390715290095377,
    cosh: 1.5430806348152437,
    tan: -1.4214488238747245,
    tanh: 0.7615941559557649,
    exp: 2.718281828459045,
    expm1: 1.7182818284590453,
    log1p: 2.3978952727983707,
    powPI: 1.9275814160560206e-50,
    hash: "0cfe5e52"
};

console.log("ai: TIMEOUT ->", O({ browserFeaturesBitmask: bitmask, plugins, mimeTypes, ai: "TIMEOUT", mathFingerprint: F(mathFingerprint) }));
console.log("ai: false   ->", O({ browserFeaturesBitmask: bitmask, plugins, mimeTypes, ai: false, mathFingerprint: F(mathFingerprint) }));
console.log("ai: true    ->", O({ browserFeaturesBitmask: bitmask, plugins, mimeTypes, ai: true, mathFingerprint: F(mathFingerprint) }));
console.log("ai: object  ->", O({ browserFeaturesBitmask: bitmask, plugins, mimeTypes, ai: { status: "not_available" }, mathFingerprint: F(mathFingerprint) }));

