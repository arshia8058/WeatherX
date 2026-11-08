import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const webDir = resolve(root, 'www');
await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });
for (const entry of ['index.html', 'css', 'js', 'assets']) {
  await cp(resolve(root, entry), resolve(webDir, entry), { recursive: true });
}
await build({
  entryPoints: [resolve(root, 'native/geolocation-bridge.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  legalComments: 'eof',
  outfile: resolve(webDir, 'js/native-geolocation.js'),
});
console.log(`Web assets prepared in ${webDir}`);
