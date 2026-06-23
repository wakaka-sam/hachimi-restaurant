import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

const sourceDir = 'client/assets/textures';
const targetDirs = [
  'client/cocos/assets/textures',
  'client/cocos/assets/resources/textures'
];

for (const targetDir of targetDirs) {
  await mkdir(targetDir, { recursive: true });
}

const textureFiles = (await readdir(sourceDir)).filter((file) => file.endsWith('.png')).sort();
for (const file of textureFiles) {
  for (const targetDir of targetDirs) {
    await copyFile(join(sourceDir, file), join(targetDir, basename(file)));
  }
}

console.log(`Synced ${textureFiles.length} PNG textures into ${targetDirs.join(', ')}`);
