import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const text = (path) => readFile(new URL(path, root), 'utf8');

test('Persian font subsets are bundled as valid WOFF2 assets', async () => {
  for (const weight of [400, 700]) {
    const font = await readFile(new URL(`assets/fonts/vazirmatn-arabic-${weight}-normal.woff2`, root));
    assert.equal(font.toString('ascii', 0, 4), 'wOF2');
  }
  const css = await text('css/style.css');
  assert.match(css, /unicode-range:.*U\+200C-200E/);
  assert.match(css, /unicode-bidi: plaintext/);
});

test('GitHub Pages build includes the locally hosted font assets', async () => {
  const workflow = await text('.github/workflows/pages.yml');
  const builder = await text('scripts/build-web.mjs');
  assert.match(workflow, /run: npm run build:web/);
  assert.match(workflow, /path: www/);
  assert.match(builder, /'assets'/);
});
