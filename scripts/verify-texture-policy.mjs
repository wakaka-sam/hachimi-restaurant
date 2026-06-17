import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const runtimeFiles = [
  'client/web/index.html',
  'client/web/main.js',
  'client/web/styles.css',
  'shared/game-rules.mjs',
  'server/src/app.mjs'
];

const textureDir = 'client/assets/textures';
const forbiddenRuntimePattern = /canvas|<svg|drawImage|getContext|createElement\(['"]canvas|Canvas/i;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
let failed = false;

function fail(message) {
  console.error(`Texture policy violation: ${message}`);
  failed = true;
}

for (const file of runtimeFiles) {
  const source = await readFile(file, 'utf8');
  if (forbiddenRuntimePattern.test(source)) {
    fail(`${file} contains runtime drawing tokens.`);
  }

  for (const match of source.matchAll(/\/textures\/[A-Za-z0-9._-]+\.png/g)) {
    const assetPath = join(textureDir, match[0].replace('/textures/', ''));
    try {
      await access(assetPath);
    } catch {
      fail(`${file} references missing texture ${match[0]}.`);
    }
  }
}

const textureFiles = (await readdir(textureDir)).filter((file) => file.endsWith('.png'));
if (textureFiles.length < 1) {
  fail('No PNG textures found.');
}

for (const file of textureFiles) {
  const buffer = await readFile(join(textureDir, file));
  if (buffer.length < 32 || !buffer.subarray(0, 8).equals(pngSignature)) {
    fail(`${file} is not a valid PNG file.`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Texture policy verified: ${textureFiles.length} PNG textures, no runtime drawing tokens.`);
