/**
 * convert-frames.js
 * Converts all JPG frame sequences to WebP (quality 72) in-place.
 * Run: node convert-frames.js
 * Outputs: images/frame_0001.webp, images1/frame_0001.webp, etc.
 */

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const DIRS    = ['images', 'images1', 'images3', 'images4', 'images5'];
const QUALITY = 72;   // WebP quality — visually lossless for interior photos
const CONCURRENCY = 8; // parallel conversions

async function convertDir(dir) {
    const full = path.join(__dirname, dir);
    if (!fs.existsSync(full)) return;

    const files = fs.readdirSync(full).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    console.log(`\n[${dir}] Converting ${files.length} files…`);

    let done = 0;
    const queue = [...files];

    const worker = async () => {
        while (queue.length) {
            const file = queue.shift();
            const src  = path.join(full, file);
            const dest = path.join(full, file.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
            if (fs.existsSync(dest)) { done++; continue; }
            try {
                await sharp(src).webp({ quality: QUALITY, effort: 4 }).toFile(dest);
                done++;
                if (done % 20 === 0) process.stdout.write(`  ${done}/${files.length}\r`);
            } catch (e) {
                console.error(`  Error: ${file}`, e.message);
            }
        }
    };

    const workers = Array.from({ length: CONCURRENCY }, worker);
    await Promise.all(workers);
    console.log(`  ✓ ${done}/${files.length} done`);
}

(async () => {
    console.log('Starting WebP conversion…');
    for (const dir of DIRS) await convertDir(dir);
    console.log('\n✅ All conversions complete.');
})();
