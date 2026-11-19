import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Arena Forge postbuild: bundle the FULL web runtime into dist/ for the
// Capacitor app (which serves dist/ from its local web server).
//
// Root cause this exists (2026-11-18): vite's build does NOT copy classic
// <script src> / <link> files into dist/ — only its own bundled assets
// land there. The old script copied only game.js, so in the APK
// bootstrap.js 404'd and game.js never loaded at all: the app showed
// static index.html with no JS (empty fighter card, no app home, no
// diagnostic strip, dead buttons) while the website worked fine because
// GitHub Pages serves the repo root with every file present.
//
// This script derives the file list from the sources at build time (no
// hardcoded list to go stale) and FAILS the build if any boot-critical
// target is missing, so a missing runtime file can never silently
// regress the APK again.

const projectRoot = process.cwd();
const distDir = resolve(projectRoot, 'dist');

const missing = [];
const copied = [];

function toRepoPath(raw) {
  // Strip query string / fragment, keep only ./-relative paths.
  const clean = raw.split(/[?#]/)[0];
  if (!clean.startsWith('./')) return null;
  const rel = clean.slice(2);
  if (!rel || rel.includes('..')) return null;
  return rel;
}

function copyOne(rel) {
  const src = resolve(projectRoot, rel);
  const dest = resolve(distDir, rel);
  if (!existsSync(src)) {
    missing.push(rel);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  copied.push(rel);
}

function listFilesRecursive(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

// 1. Everything index.html references (classic <script src> and
// <link href>, incl. the 8 CSS files) — parsed, not hardcoded.
const indexHtml = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');
const htmlRefs = new Set();
for (const match of indexHtml.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
  const rel = toRepoPath(match[1]);
  if (rel) htmlRefs.add(rel);
}
for (const rel of [...htmlRefs].sort()) copyOne(rel);

// 2. Everything bootstrap.js loads via loadClassicScript — parsed from
// the source: the explicit calls plus the moduleFiles array. (game.js
// is in this set too, so the historical game.js copy is preserved.)
const bootstrap = readFileSync(resolve(projectRoot, 'bootstrap.js'), 'utf8');
const bootstrapRefs = new Set();
for (const match of bootstrap.matchAll(/['"]\.\/([^'"]+\.js)['"]/g)) {
  bootstrapRefs.add(match[1]);
}
for (const rel of [...bootstrapRefs].sort()) copyOne(rel);

// 3. Lazy audio the voice/SFX modules fetch via new Audio() relative
// to document.baseURI: copy the whole referenced trees. Missing
// recordings are a WARNING, not a build failure — they 404 on the
// website too and fail silently at runtime (voice lines stay silent
// until a voice is picked); they must never block boot.
const audioDirs = ['assets/voice', 'assets/sfx'];
for (const dir of audioDirs) {
  const srcDir = resolve(projectRoot, dir);
  if (!existsSync(srcDir)) {
    console.warn(`Warning: audio directory missing (skipped): ${dir}`);
    continue;
  }
  cpSync(srcDir, resolve(distDir, dir), { recursive: true });
  for (const file of listFilesRecursive(srcDir)) {
    copied.push(file.slice(projectRoot.length + 1));
  }
}

// Report (not fail) on referenced audio files that do not exist in the
// repo, so they are visible instead of silently skipped.
for (const mod of readdirSync(resolve(projectRoot, 'modules/audio'))) {
  const modPath = resolve(projectRoot, 'modules/audio', mod);
  if (!modPath.endsWith('.js')) continue;
  const src = readFileSync(modPath, 'utf8');
  const base = src.match(/var BASE = '([^']+)'/);
  if (!base) continue;
  const names = new Set(src.match(/'([A-Za-z0-9_-]+\.mp3)'/g)?.map((s) => s.slice(1, -1)) ?? []);
  for (const name of [...names].sort()) {
    if (!existsSync(resolve(projectRoot, base[1], name))) {
      console.warn(`Warning: referenced audio file missing from repo (not copied): ${base[1]}${name}`);
    }
  }
}

// 4. Build-time assertion: every boot-critical target must now exist
// in dist/. If anything is missing (bad parse, a file deleted from
// the repo, a copy bug), fail loudly instead of shipping a dead APK.
for (const rel of [...htmlRefs, ...bootstrapRefs]) {
  if (!existsSync(resolve(distDir, rel))) missing.push(rel);
}
const uniqueMissing = [...new Set(missing)].sort();
if (uniqueMissing.length > 0) {
  console.error('ERROR: missing runtime files — refusing to ship an APK with no JS:');
  for (const rel of uniqueMissing) console.error(`  MISSING ${rel}`);
  process.exit(1);
}

console.log(`Copied ${copied.length} runtime files into dist/ for Capacitor's local web runtime (incl. game.js, bootstrap.js, ${htmlRefs.size} index.html refs, ${bootstrapRefs.size} bootstrap targets, ${audioDirs.join(', ')}).`);
