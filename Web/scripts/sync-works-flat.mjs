/**
 * همگام‌سازی هنر برداریِ حالت فلت از ریپوی Kimiagar.Works به Web.
 *
 * منبع حقیقت `D:\Source\Kimiagar.Works` است (یا هرجا KIMIAGAR_WORKS_DIR
 * اشاره کند). این اسکریپت فایل‌های runtime حالت فلت را به
 * `Web/src/art/flat/kit/` کپی می‌کند، import های `../animation/` را به
 * `./` بازنویسی می‌کند و یک هدر «تولیدشده — ویرایش نکنید» می‌زند.
 *
 *   node scripts/sync-works-flat.mjs          # کپی
 *   node scripts/sync-works-flat.mjs --check  # فقط مقایسه؛ اختلاف ⇒ exit 1 (برای CI)
 *
 * آداپتورهای React در `Web/src/art/flat/react/` و اجزای صحنه هرگز همگام
 * نمی‌شوند؛ فقط `kit/` خروجی این اسکریپت است.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(HERE, '..');
const WORKS_DIR = resolve(process.env.KIMIAGAR_WORKS_DIR ?? resolve(WEB_ROOT, '..', '..', 'Kimiagar.Works'));
const OUT_DIR = resolve(WEB_ROOT, 'src', 'art', 'flat', 'kit');
const CHECK = process.argv.includes('--check');

/** فایل‌های runtime حالت فلت (بدون rasterizer / UI پیش‌نمایش / پیکسل). */
const FILES = [
  ['src/flat/backend.ts', 'backend.ts'],
  ['src/flat/shapes.ts', 'shapes.ts'],
  ['src/flat/palette.ts', 'palette.ts'],
  ['src/flat/canvas2d.ts', 'canvas2d.ts'],
  ['src/flat/svg.ts', 'svg.ts'],
  ['src/flat/props.ts', 'props.ts'],
  ['src/flat/ingredients.ts', 'ingredients.ts'],
  ['src/flat/scene-parts.ts', 'scene-parts.ts'],
  ['src/flat/scene.ts', 'scene.ts'],
  ['src/animation/color.ts', 'color.ts'],
  ['src/animation/rng.ts', 'rng.ts'],
  ['src/animation/fire.ts', 'fire.ts'],
];

if (!existsSync(WORKS_DIR)) {
  console.error(`Kimiagar.Works not found at ${WORKS_DIR} (set KIMIAGAR_WORKS_DIR)`);
  process.exit(2);
}

function worksCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: WORKS_DIR, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

const commit = worksCommit();
const HEADER_START = '/* GENERATED FROM Kimiagar.Works';

function header(rel) {
  return (
    `${HEADER_START} — do not edit.\n` +
    ` * source: ${rel}\n` +
    ` * sync:   npm run art:sync-works   (scripts/sync-works-flat.mjs)\n` +
    ' */\n'
  );
}

/** import های خواهر-پوشه‌ی animation در ساختار تخت kit/ به همان پوشه می‌آیند. */
function rewriteImports(src) {
  return src.replace(/(['"])\.\.\/animation\/([a-z0-9-]+)\.ts\1/g, "$1./$2.ts$1");
}

/** خط commit را از مقایسه حذف می‌کنیم تا فقط محتوا سنجیده شود. */
function stripVolatile(text) {
  return text.replace(/^ \* works-commit: .*$/m, '');
}

let changed = 0;
mkdirSync(OUT_DIR, { recursive: true });

for (const [rel, name] of FILES) {
  const from = resolve(WORKS_DIR, rel);
  if (!existsSync(from)) {
    console.error(`missing in Works: ${rel}`);
    process.exit(2);
  }
  const body = rewriteImports(readFileSync(from, 'utf8'));
  const next = `${header(rel).replace(' */\n', ` * works-commit: ${commit}\n */\n`)}${body}`;
  const to = resolve(OUT_DIR, name);
  const prev = existsSync(to) ? readFileSync(to, 'utf8') : null;
  if (prev !== null && stripVolatile(prev) === stripVolatile(next)) continue;
  changed++;
  if (CHECK) {
    console.error(`out of sync: src/art/flat/kit/${name}`);
  } else {
    writeFileSync(to, next);
    console.log(`synced ${name} ← ${rel}`);
  }
}

if (CHECK) {
  if (changed) {
    console.error(`${changed} file(s) differ from Kimiagar.Works @ ${commit}. Run: npm run art:sync-works`);
    process.exit(1);
  }
  console.log(`kit in sync with Kimiagar.Works @ ${commit}`);
} else {
  console.log(changed ? `${changed} file(s) updated from Kimiagar.Works @ ${commit}` : 'already up to date');
}
