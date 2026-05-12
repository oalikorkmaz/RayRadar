const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    if (item === 'www' || item === 'node_modules' || item === 'android' || item === '.git') continue;
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(www)) fs.mkdirSync(www, { recursive: true });

for (const file of ['index.html', 'manifest.json', 'sw.js']) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(www, file));
}

for (const dir of ['js', 'styles', 'assets']) {
  const src = path.join(root, dir);
  if (fs.existsSync(src)) copyDir(src, path.join(www, dir));
}

console.log('Web files copied to www/');
