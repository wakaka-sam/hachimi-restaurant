import { access, readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const runtimeRoots = [
  'client/web',
  'client/cocos/assets/scripts',
  'shared',
  'server/src'
];
const runtimeExtensions = new Set(['.css', '.html', '.js', '.mjs', '.ts']);
const runtimeFiles = (await Promise.all(runtimeRoots.map((root) => listRuntimeFiles(root)))).flat().sort();

const textureDir = 'client/assets/textures';
const cocosTextureDir = 'client/cocos/assets/textures';
const forbiddenRuntimePattern = /canvas|<svg|drawImage|getContext|createElement\(['"]canvas|Canvas|Graphics\b|linear-gradient|radial-gradient|conic-gradient|box-shadow|text-shadow|filter\s*:|\.grayscale\b|grayscale\s*=|opacity\s*:/i;
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
  validateCssTextureBackgrounds(file, source);

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
  const sourcePath = join(textureDir, file);
  const buffer = await readFile(sourcePath);
  if (buffer.length < 32 || !buffer.subarray(0, 8).equals(pngSignature)) {
    fail(`${file} is not a valid PNG file.`);
  }

  const cocosPath = join(cocosTextureDir, file);
  try {
    const cocosBuffer = await readFile(cocosPath);
    if (!cocosBuffer.equals(buffer)) {
      fail(`Cocos texture copy differs from source texture: ${file}`);
    }
  } catch {
    fail(`Missing Cocos texture copy: ${file}`);
  }
}

try {
  const cocosFiles = (await readdir(cocosTextureDir)).filter((file) => file.endsWith('.png')).sort();
  const sourceSet = new Set(textureFiles);
  for (const file of cocosFiles) {
    if (!sourceSet.has(file)) {
      fail(`Unexpected Cocos texture without source counterpart: ${file}`);
    }
  }
} catch {
  fail(`Cocos texture directory is missing: ${cocosTextureDir}`);
}

if (failed) {
  process.exit(1);
}

console.log(`Texture policy verified: ${textureFiles.length} PNG textures, Cocos copies in sync, no runtime drawing tokens.`);

async function listRuntimeFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listRuntimeFiles(path));
    } else if (runtimeExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

function validateCssTextureBackgrounds(file, source) {
  if (extname(file) !== '.css') {
    return;
  }

  const lines = source.split('\n');
  lines.forEach((line, index) => {
    const match = line.match(/\bbackground(?:-color)?\s*:\s*([^;]+);/i);
    if (!match) {
      return;
    }

    const value = match[1].trim().toLowerCase();
    if (value === 'transparent' || value === 'none' || value.startsWith('url(')) {
      return;
    }

    fail(`${file}:${index + 1} uses a non-texture CSS background value: ${match[1].trim()}`);
  });
}
