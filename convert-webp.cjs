const sharp = require('sharp');
const fs = require('fs');
sharp('public/assets/hero-wall.png')
  .webp({ quality: 82, effort: 4 })
  .toFile('public/assets/hero-wall.webp', (err) => {
    if (err) { console.error('ERROR:', err.message); process.exit(1); }
    const bytes = fs.statSync('public/assets/hero-wall.webp').size;
    console.log('Done: ' + Math.round(bytes / 1024) + 'KB (was ~8750KB)');
  });
