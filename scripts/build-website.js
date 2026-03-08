#!/usr/bin/env node
/**
 * 打包 website 为可部署的静态文件
 * 输出到 dist/ 目录，可直接上传到服务器
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WEBSITE = path.join(ROOT, 'website');
const ASSETS = path.join(ROOT, 'assets');
const DIST = path.join(ROOT, 'dist');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function main() {
  console.log('Building website for deployment...\n');

  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }
  ensureDir(DIST);
  ensureDir(path.join(DIST, 'assets'));

  // 1. 复制并修改 index.html（将 ../assets/ 改为 assets/）
  let html = fs.readFileSync(path.join(WEBSITE, 'index.html'), 'utf8');
  html = html.replace(/\.\.\/assets\//g, 'assets/');
  fs.writeFileSync(path.join(DIST, 'index.html'), html);
  console.log('  ✓ index.html');

  // 2. 复制 style.css 和 script.js
  copyFile(path.join(WEBSITE, 'style.css'), path.join(DIST, 'style.css'));
  copyFile(path.join(WEBSITE, 'script.js'), path.join(DIST, 'script.js'));
  copyFile(path.join(WEBSITE, 'privacy.html'), path.join(DIST, 'privacy.html'));
  console.log('  ✓ style.css');
  console.log('  ✓ script.js');
  console.log('  ✓ privacy.html');

  // 3. 复制 assets
  const assetFiles = fs.readdirSync(ASSETS).filter(f => {
    const p = path.join(ASSETS, f);
    return fs.statSync(p).isFile();
  });
  for (const f of assetFiles) {
    copyFile(path.join(ASSETS, f), path.join(DIST, 'assets', f));
  }
  console.log('  ✓ assets/ (' + assetFiles.length + ' files)');

  console.log('\nDone! Deploy the "dist" folder to your server.');
  console.log('  dist/');
  console.log('  ├── index.html');
  console.log('  ├── style.css');
  console.log('  ├── script.js');
  console.log('  └── assets/');
}

main();
