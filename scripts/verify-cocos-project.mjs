import { readFile } from 'node:fs/promises';

let failed = false;

function fail(message) {
  console.error(`Cocos project violation: ${message}`);
  failed = true;
}

function assertEqual(name, actual, expected) {
  if (actual !== expected) {
    fail(`${name} is ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}.`);
  }
}

function assertMatches(name, actual, pattern) {
  if (typeof actual !== 'string' || !pattern.test(actual)) {
    fail(`${name} is ${JSON.stringify(actual)}; expected to match ${pattern}.`);
  }
}

const project = JSON.parse(await readFile('client/cocos/project.json', 'utf8'));
const packageJson = JSON.parse(await readFile('client/cocos/package.json', 'utf8'));
const sceneWiring = JSON.parse(await readFile('client/cocos/scene-wiring.json', 'utf8'));
const gitignore = await readFile('.gitignore', 'utf8');

assertEqual('project.name', project.name, 'hachimi-restaurant');
assertMatches('project.engine', project.engine, /^3\.8\./);
assertEqual('project.orientation', project.orientation, 'portrait');
assertEqual('project.designResolution.width', project.designResolution?.width, 720);
assertEqual('project.designResolution.height', project.designResolution?.height, 1280);
assertEqual('project.designResolution.fitWidth', project.designResolution?.fitWidth, true);
assertEqual('project.designResolution.fitHeight', project.designResolution?.fitHeight, false);

assertMatches('packageJson.creator.version', packageJson.creator?.version, /^3\.8\./);
assertEqual('sceneWiring.scene', sceneWiring.scene, 'LittleAnimalRestaurantMain');
assertEqual('sceneWiring.rootComponent', sceneWiring.rootComponent, 'HachimiRestaurantGame');
assertEqual('sceneWiring.orientation', sceneWiring.orientation, project.orientation);
assertEqual('sceneWiring.designResolution.width', sceneWiring.designResolution?.width, project.designResolution?.width);
assertEqual('sceneWiring.designResolution.height', sceneWiring.designResolution?.height, project.designResolution?.height);

for (const screen of ['mainScreen', 'businessScreen', 'upgradeScreen', 'taskScreen', 'resultScreen']) {
  if (!sceneWiring.screens?.includes(screen)) {
    fail(`sceneWiring.screens missing ${screen}.`);
  }
}

for (const directory of [
  'client/cocos/build/',
  'client/cocos/library/',
  'client/cocos/temp/',
  'client/cocos/local/'
]) {
  if (!gitignore.includes(directory)) {
    fail(`.gitignore must ignore ${directory}.`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('Cocos project verified: Creator 3.8.x, portrait 720x1280, scene contract aligned, generated directories ignored.');
