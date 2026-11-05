// Runs after `expo export -p web`: turns the website into an app you can add to the home screen
// (name, icon, full screen, works offline). Usage: node scripts/pwa.js [distDir]
const fs = require('fs');
const path = require('path');
const dist = process.argv[2] || 'dist';
const base = (process.env.BASE_URL || '').replace(/\/$/, '');
const file = path.join(dist, 'index.html');
let html = fs.readFileSync(file, 'utf8');

const head = `
    <link rel="manifest" href="${base}/manifest.json" />
    <meta name="theme-color" content="#1F5F4A" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Road to freedom" />
    <link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />
    <style>html,body{background:#F4F2EC;overscroll-behavior:none;-webkit-tap-highlight-color:transparent}</style>`;
html = html.replace('</head>', `${head}\n  </head>`);
// let the app use the full screen on phones with a notch / home bar
html = html.replace(/<meta name="viewport" content="[^"]*"\s*\/?>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />');
html = html.replace('</body>', `  <script>if('serviceWorker' in navigator){addEventListener('load',function(){navigator.serviceWorker.register('${base}/sw.js',{scope:'${base}/'})})}</script>\n  </body>`);
fs.writeFileSync(file, html);

// new cache name for every build, so phones pick up updates
const sw = path.join(dist, 'sw.js');
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace('__BUILD__', Date.now().toString(36)));
// GitHub Pages: don't run Jekyll (it would hide the _expo folder)
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
// open any deep link on the app too
fs.copyFileSync(file, path.join(dist, '404.html'));
console.log('Home-screen app ready in', dist, base ? `(served under ${base}/)` : '');
