const http = require('http');
const { spawn } = require('child_process');
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

// Let's run a search for 31b7bdf4a5dba25a and d51826882dce5b8e across variations
console.log('Testing target: 31b7bdf4a5dba25a and d51826882dce5b8e');
