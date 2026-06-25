import { mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);
const designDir = 'docs/design/optimized-tabs-2026-06-24';
const outputDir = 'client/assets/textures';

const crops = [
  {
    source: 'restaurant-tab-720x1280.png',
    output: 'design-title-sign.png',
    x: 74,
    y: 14,
    width: 572,
    height: 118
  },
  {
    source: 'restaurant-tab-720x1280.png',
    output: 'design-restaurant-scene.png',
    x: 0,
    y: 205,
    width: 720,
    height: 470
  },
  {
    source: 'restaurant-tab-720x1280.png',
    output: 'design-start-button.png',
    x: 170,
    y: 675,
    width: 380,
    height: 96
  },
  {
    source: 'restaurant-tab-720x1280.png',
    output: 'design-nav-restaurant.png',
    x: 0,
    y: 1160,
    width: 720,
    height: 105
  },
  {
    source: 'upgrade-tab-720x1280.png',
    output: 'design-upgrade-full.png',
    x: 0,
    y: 0,
    width: 720,
    height: 1280
  },
  {
    source: 'upgrade-tab-720x1280.png',
    output: 'design-upgrade-heading.png',
    x: 150,
    y: 210,
    width: 420,
    height: 90
  },
  {
    source: 'upgrade-tab-720x1280.png',
    output: 'design-upgrade-board.png',
    x: 36,
    y: 300,
    width: 648,
    height: 800
  },
  {
    source: 'upgrade-tab-720x1280.png',
    output: 'design-upgrade-icon-cashier.png',
    x: 68,
    y: 366,
    width: 140,
    height: 116
  },
  {
    source: 'upgrade-tab-720x1280.png',
    output: 'design-upgrade-icon-table.png',
    x: 68,
    y: 508,
    width: 140,
    height: 116
  },
  {
    source: 'upgrade-tab-720x1280.png',
    output: 'design-upgrade-icon-chair.png',
    x: 68,
    y: 650,
    width: 140,
    height: 116
  },
  {
    source: 'upgrade-tab-720x1280.png',
    output: 'design-upgrade-icon-floor.png',
    x: 68,
    y: 794,
    width: 140,
    height: 116
  },
  {
    source: 'upgrade-tab-720x1280.png',
    output: 'design-upgrade-icon-wall.png',
    x: 68,
    y: 936,
    width: 140,
    height: 116
  },
  {
    source: 'upgrade-tab-720x1280.png',
    output: 'design-upgrade-button-green.png',
    x: 516,
    y: 392,
    width: 124,
    height: 82
  },
  {
    source: 'upgrade-tab-720x1280.png',
    output: 'design-upgrade-button-locked.png',
    x: 205,
    y: 1033,
    width: 310,
    height: 84
  },
  {
    source: 'upgrade-tab-720x1280.png',
    output: 'design-nav-upgrade.png',
    x: 0,
    y: 1160,
    width: 720,
    height: 105
  },
  {
    source: 'tasks-tab-720x1280.png',
    output: 'design-task-heading.png',
    x: 144,
    y: 286,
    width: 432,
    height: 100
  },
  {
    source: 'tasks-tab-720x1280.png',
    output: 'design-task-board.png',
    x: 24,
    y: 354,
    width: 672,
    height: 800
  },
  {
    source: 'tasks-tab-720x1280.png',
    output: 'design-nav-tasks.png',
    x: 0,
    y: 1160,
    width: 720,
    height: 105
  }
];

await mkdir(outputDir, { recursive: true });

for (const crop of crops) {
  const sourcePath = join(designDir, crop.source);
  const outputPath = join(outputDir, crop.output);
  await execFileAsync('sips', [
    '-c',
    String(crop.height),
    String(crop.width),
    '--cropOffset',
    String(crop.y),
    String(crop.x),
    sourcePath,
    '-o',
    outputPath
  ]);
}

console.log(`Extracted ${crops.length} design UI textures into ${outputDir}`);
