const http = require('http');

http.get('http://localhost:9222/json', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        console.log('Ports/Tabs:', d);
    });
}).on('error', (e) => {
    console.log('No 9222:', e.message);
});
