import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

const sourceDir = 'client/assets/textures';
const targetDir = 'client/cocos/assets/textures';

await mkdir(targetDir, { recursive: true });

const textureFiles = (await readdir(sourceDir)).filter((file) => file.endsWith('.png')).sort();
for (const file of textureFiles) {
  await copyFile(join(sourceDir, file), join(targetDir, basename(file)));
}

console.log(`Synced ${textureFiles.length} PNG textures into ${targetDir}`);
