const fs = require('fs');

const lines = fs.readFileSync('C:/Users/Home/Desktop/app/research/ecomm forensic/detectexpert_vectors_www.ecommerce.com_2026-10-13T09-14-23-974Z.csv', 'utf8').trim().split('\n');

const fontLines = lines.slice(1).filter(l => l.includes('canvas.measureText'));
const fonts = new Set();
fontLines.forEach(l => {
    const parts = l.split(',');
    fonts.add(parts[11]);
});
console.log('Unique font strings count:', fonts.size);
Array.from(fonts).forEach((f, idx) => console.log(`${idx + 1}: ${f}`));

console.log('\n--- BEACON SAMPLES ---');
const beaconLines = lines.slice(1).filter(l => l.includes('network.sendBeacon'));
console.log('Total sendBeacon calls:', beaconLines.length);
beaconLines.slice(0, 5).forEach((b, idx) => {
    const p = b.split(',');
    console.log(`${idx + 1}: caller=${p[7]?.slice(0, 50)} | args=${p[11]} | res=${p[12]}`);
});

console.log('\n--- WEBRTC SAMPLES ---');
const rtcLines = lines.slice(1).filter(l => l.includes('webrtc.createOffer'));
rtcLines.forEach((r, idx) => {
    const p = r.split(',');
    console.log(`${idx + 1}: API=${p[6]} | args=${p[11]} | res=${p[12]}`);
});
