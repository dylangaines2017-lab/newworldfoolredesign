#!/usr/bin/env node
// Shrinks site images in public/ to web-friendly WebP and updates references in src/.
//
//   npm run images
//
// Drop new full-size images (PNG/JPG) into one of the folders below, run this,
// and commit the result. Already-converted .webp files are left alone unless
// they're still larger than the folder's size limit. Originals are deleted
// after conversion — they stay in git history and nwf-website-assets.

import { readdir, readFile, rm, stat, writeFile, rename } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname;
const PUBLIC = join(ROOT, "public");
const SRC = join(ROOT, "src");

// Limits are ~2× the largest size each image is shown at, for sharp retina displays.
const RULES = [
  { dir: "films/stills", maxWidth: 2400, maxHeight: 2400, quality: 80 }, // lightbox, up to 90vw
  { dir: "FilmScreengrabs", maxWidth: 2400, maxHeight: 2400, quality: 80 }, // full-bleed accordion
  { dir: "aboutScreengrabs", maxWidth: 2400, maxHeight: 2400, quality: 80 },
  { dir: "films/placeholder", maxWidth: 2400, maxHeight: 2400, quality: 80 }, // work page cards / film heroes
  { dir: "films/posters", maxWidth: 1200, maxHeight: 1800, quality: 82 },
  { dir: ".", files: ["Joker_card.png"], maxWidth: 1000, maxHeight: 1500, quality: 85 },
  { dir: "BTS", maxWidth: 1200, maxHeight: 1200, quality: 78 }, // 14rem-tall marquee
  { dir: "team", maxWidth: 1000, maxHeight: 1400, quality: 82 },
  { dir: "laurels", maxWidth: 900, maxHeight: 400, quality: 90 }, // ~120px tall, keeps transparency
];

const INPUT = new Set([".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"]);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (INPUT.has(extname(entry.name).toLowerCase())) yield path;
  }
}

// A rule either covers a whole folder, or (with `files`) just the named files in it.
async function* filesFor(rule) {
  const dir = join(PUBLIC, rule.dir);
  if (rule.files) {
    for (const name of rule.files) {
      try {
        await stat(join(dir, name));
        yield join(dir, name);
      } catch {
        // already converted
      }
    }
  } else {
    yield* walk(dir);
  }
}

const renames = new Map(); // "/old/path.png" -> "/old/path.webp"
let before = 0;
let after = 0;

for (const rule of RULES) {
  for await (const file of filesFor(rule)) {
    const isWebp = extname(file).toLowerCase() === ".webp";
    const { width = 0, height = 0 } = await sharp(file).metadata();
    if (isWebp && width <= rule.maxWidth && height <= rule.maxHeight) continue;

    const out = file.slice(0, -extname(file).length) + ".webp";
    const tmp = out + ".tmp";
    const size = (await stat(file)).size;

    await sharp(file)
      .rotate() // respect camera EXIF orientation before metadata is stripped
      .resize({ width: rule.maxWidth, height: rule.maxHeight, fit: "inside", withoutEnlargement: true })
      .webp({ quality: rule.quality, alphaQuality: 100, effort: 5 })
      .toFile(tmp);

    if (file !== out) await rm(file);
    await rename(tmp, out);

    const newSize = (await stat(out)).size;
    before += size;
    after += newSize;
    console.log(`${(size / 1e6).toFixed(1).padStart(6)}MB → ${(newSize / 1e3).toFixed(0).padStart(5)}KB  ${relative(PUBLIC, out)}`);

    if (file !== out) renames.set("/" + relative(PUBLIC, file), "/" + relative(PUBLIC, out));
  }
}

// Point src/ at the new files.
if (renames.size) {
  for await (const file of (async function* srcFiles(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* srcFiles(path);
      else if (/\.(astro|ts|js|mjs|css|md)$/.test(entry.name)) yield path;
    }
  })(SRC)) {
    const text = await readFile(file, "utf8");
    let next = text;
    for (const [from, to] of renames) next = next.split(from).join(to);
    if (next !== text) {
      await writeFile(file, next);
      console.log(`updated references in ${relative(ROOT, file)}`);
    }
  }
}

console.log(`\n${renames.size} files converted: ${(before / 1e6).toFixed(1)}MB → ${(after / 1e6).toFixed(1)}MB`);
