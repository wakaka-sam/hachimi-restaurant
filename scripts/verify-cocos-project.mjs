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

validateSceneBlueprint(sceneWiring);

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

function validateSceneBlueprint(sceneWiring) {
  const blueprint = sceneWiring.sceneBlueprint;
  if (!blueprint || typeof blueprint !== 'object') {
    fail('sceneWiring.sceneBlueprint is required.');
    return;
  }

  assertEqual('sceneBlueprint.shared.rootComponent', blueprint.shared?.rootComponent, sceneWiring.rootComponent);
  assertEqual('sceneBlueprint.shared.textureCatalog', blueprint.shared?.textureCatalog, 'TextureCatalog');
  validateKnownValues('sceneBlueprint.shared.topBarLabels', blueprint.shared?.topBarLabels, sceneWiring.labels);
  validateKnownValues('sceneBlueprint.shared.navigationButtons', blueprint.shared?.navigationButtons, sceneWiring.buttons);
  validateTextureSurfaces('sceneBlueprint.shared.textureSurfaces', blueprint.shared?.textureSurfaces, sceneWiring);
  validateGuideFocus(sceneWiring, blueprint);

  const blueprintScreens = blueprint.screens || {};
  for (const screen of sceneWiring.screens || []) {
    const screenBlueprint = blueprintScreens[screen];
    if (!screenBlueprint) {
      fail(`sceneBlueprint.screens missing ${screen}.`);
      continue;
    }

    if (!sceneWiring.safeArea?.requiredNodes?.includes(screenBlueprint.safeAreaNode)) {
      fail(`sceneBlueprint.screens.${screen}.safeAreaNode is not listed in safeArea.requiredNodes.`);
    }
    validateKnownValues(`sceneBlueprint.screens.${screen}.labels`, screenBlueprint.labels, sceneWiring.labels);
    validateKnownValues(`sceneBlueprint.screens.${screen}.buttons`, screenBlueprint.buttons, sceneWiring.buttons);
    validateKnownValues(`sceneBlueprint.screens.${screen}.sprites`, screenBlueprint.sprites, sceneWiring.sprites);
    validateTextureSurfaces(`sceneBlueprint.screens.${screen}.textureSurfaces`, screenBlueprint.textureSurfaces, sceneWiring);
  }

  for (const screen of Object.keys(blueprintScreens)) {
    if (!sceneWiring.screens?.includes(screen)) {
      fail(`sceneBlueprint.screens contains unknown screen ${screen}.`);
    }
  }

  const componentTotals = {};
  for (const [screen, screenBlueprint] of Object.entries(blueprintScreens)) {
    for (const [component, count] of Object.entries(screenBlueprint.componentInstances || {})) {
      if (!sceneWiring.requiredComponents?.includes(component)) {
        fail(`sceneBlueprint.screens.${screen}.componentInstances references unknown component ${component}.`);
      }
      componentTotals[component] = (componentTotals[component] || 0) + Number(count || 0);
    }
    for (const [arrayName, length] of Object.entries(screenBlueprint.minimumSpriteArrayLengths || {})) {
      if ((sceneWiring.minimumSpriteArrayLengths?.[arrayName] || 0) < Number(length || 0)) {
        fail(`sceneBlueprint.screens.${screen}.minimumSpriteArrayLengths.${arrayName} exceeds manifest minimum.`);
      }
    }
    for (const [arrayName, length] of Object.entries(screenBlueprint.minimumLabelArrayLengths || {})) {
      if ((sceneWiring.minimumLabelArrayLengths?.[arrayName] || 0) < Number(length || 0)) {
        fail(`sceneBlueprint.screens.${screen}.minimumLabelArrayLengths.${arrayName} exceeds manifest minimum.`);
      }
    }
  }

  for (const component of ['TableSlotView', 'PartStatusView', 'PartUpgradeView', 'TaskItemView', 'TexturedButtonView', 'TexturedPanelView']) {
    if ((componentTotals[component] || 0) < (sceneWiring.minimumInstances?.[component] || 0)) {
      fail(`sceneBlueprint component total for ${component} is ${componentTotals[component] || 0}; expected at least ${sceneWiring.minimumInstances?.[component] || 0}.`);
    }
  }
}

function validateGuideFocus(sceneWiring, blueprint) {
  const guideFocus = sceneWiring.guideFocus;
  const requiredKeys = [
    'startBusiness',
    'upgradeNav',
    'taskNav',
    'seatCustomer',
    'serveFood',
    'collectPay',
    'upgradePart',
    'claimTask'
  ];
  if (!guideFocus || typeof guideFocus !== 'object') {
    fail('sceneWiring.guideFocus is required.');
    return;
  }
  assertEqual('sceneWiring.guideFocus.nodeArray', guideFocus.nodeArray, 'guideFocusNodes');
  assertEqual('sceneWiring.guideFocus.panelArray', guideFocus.panelArray, 'guideFocusPanels');
  assertEqual('sceneWiring.guideFocus.panelTexture', guideFocus.panelTexture, 'guideFocus');
  assertEqual('sceneBlueprint.shared.guideFocusKeys', (blueprint.shared?.guideFocusKeys || []).join(','), requiredKeys.join(','));
  assertEqual('sceneWiring.guideFocus.keys', (guideFocus.keys || []).join(','), requiredKeys.join(','));
  for (const property of ['guideFocusNodes', 'guideFocusPanels']) {
    if (!sceneWiring.componentProperties?.HachimiRestaurantGame?.includes(property)) {
      fail(`sceneWiring.componentProperties.HachimiRestaurantGame missing ${property}.`);
    }
  }
  if ((sceneWiring.texturedPanelRoles?.guideFocusPanels || 0) < requiredKeys.length) {
    fail(`sceneWiring.texturedPanelRoles.guideFocusPanels must be at least ${requiredKeys.length}.`);
  }
}

function validateKnownValues(name, values = [], allowed = []) {
  if (!Array.isArray(values)) {
    fail(`${name} must be an array.`);
    return;
  }
  for (const value of values) {
    if (!allowed?.includes(value)) {
      fail(`${name} references unknown value ${value}.`);
    }
  }
}

function validateTextureSurfaces(name, values = [], sceneWiring) {
  if (!Array.isArray(values)) {
    fail(`${name} must be an array.`);
    return;
  }
  for (const value of values) {
    if (!Object.hasOwn(sceneWiring.texturedPanelRoles || {}, value)) {
      fail(`${name} references unknown texturedPanelRole ${value}.`);
    }
  }
}
