/**
 * Convert JPG/JPEG images to WebP (quality 80).
 * Run: node scripts/convert-to-webp.mjs
 *
 * - Reads all .jpg/.jpeg from public/negocios/ and public/websites/
 * - Writes .webp equivalents alongside them
 * - Does NOT delete originals (kept for fallback / legacy)
 */
import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const PUBLIC = join(import.meta.dirname, "..", "public");
const DIRS = ["negocios", "websites"];
const QUALITY = 80;

async function convertDir(dir) {
  const abs = join(PUBLIC, dir);
  let files;
  try {
    files = await readdir(abs);
  } catch {
    console.log(`  skip (not found): ${dir}`);
    return;
  }

  const jpgs = files.filter((f) => /\.(jpg|jpeg)$/i.test(f));
  if (!jpgs.length) {
    console.log(`  no JPG/JPEG files in ${dir}`);
    return;
  }

  for (const file of jpgs) {
    const src = join(abs, file);
    const dst = join(abs, file.replace(/\.(jpg|jpeg)$/i, ".webp"));

    const s = await stat(src);
    await sharp(src).webp({ quality: QUALITY }).toFile(dst);

    const out = await stat(dst);
    const saving = ((1 - out.size / s.size) * 100).toFixed(1);
    console.log(
      `  ${file} (${(s.size / 1024).toFixed(0)} KB) → ${out.name} (${(out.size / 1024).toFixed(0)} KB) [${saving}% smaller]`
    );
  }
}

console.log("Converting images to WebP...\n");
for (const dir of DIRS) {
  console.log(`${dir}/`);
  await convertDir(dir);
}
console.log("\nDone. Update component references from .jpg/.jpeg to .webp");
