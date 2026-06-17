import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const tempDir = await mkdtemp(join(tmpdir(), 'hachimi-cocos-simulation-'));

try {
  await writeFile(join(tempDir, 'package.json'), '{"type":"commonjs"}\n');
  await transpileCocosScript('client/cocos/assets/scripts/core/GameRules.ts', 'GameRules.js');
  await transpileCocosScript('client/cocos/assets/scripts/core/BusinessSimulation.ts', 'BusinessSimulation.js');

  const require = createRequire(join(tempDir, 'verify.cjs'));
  const { CONSTANTS } = require(join(tempDir, 'GameRules.js'));
  const { BusinessSimulation } = require(join(tempDir, 'BusinessSimulation.js'));

  verifyInteractiveServiceChain(BusinessSimulation, CONSTANTS);
  verifySpeedMode(BusinessSimulation, CONSTANTS);
  verifyWaitingQueueCap(BusinessSimulation, CONSTANTS);
  verifyCustomerSessionCap(BusinessSimulation, CONSTANTS);
  verifySnapshotRestore(BusinessSimulation, CONSTANTS);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log('Cocos business simulation verified: service chain, 2x speed, queue cap, customer cap, and snapshot restore.');

async function transpileCocosScript(sourcePath, outputName) {
  const source = await readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    },
    fileName: sourcePath
  });
  await writeFile(join(tempDir, outputName), output.outputText);
}

function createTuning(CONSTANTS, overrides = {}) {
  return {
    tableCapacity: 2,
    initialCustomerCount: CONSTANTS.initialCustomerCount,
    patienceSeconds: 16,
    spawnIntervalSeconds: 7.2,
    moveSpeedMultiplier: 1,
    cashierWindowSeconds: 8,
    prepDelaySeconds: 5.5,
    eatingSeconds: 12.5,
    ...overrides
  };
}

function createSimulation(BusinessSimulation, CONSTANTS, speedMode = '1x', overrides = {}) {
  return new BusinessSimulation(createTuning(CONSTANTS, overrides), speedMode);
}

function verifyInteractiveServiceChain(BusinessSimulation, CONSTANTS) {
  const sim = createSimulation(BusinessSimulation, CONSTANTS);
  assert.equal(sim.waiting.length, CONSTANTS.initialCustomerCount);
  assert.equal(sim.tables.length, 2);

  sim.handleTablePressed(0);
  assert.equal(sim.tables[0].customer?.phase, 'seated');
  assert.equal(sim.waiting.length, CONSTANTS.initialCustomerCount - 1);

  sim.update(5.6);
  assert.equal(sim.tables[0].customer?.phase, 'readyFood');

  sim.handleTablePressed(0);
  assert.equal(sim.tables[0].customer?.phase, 'eating');
  assert.match(sim.lastFeedback, /服务成功/);

  sim.update(12.6);
  assert.equal(sim.tables[0].customer?.phase, 'readyPay');

  sim.collectFirstReadyPay();
  assert.equal(sim.customersServed, 1);
  assert.equal(sim.maxCombo, 1);
  assert.equal(sim.tables[0].customer, null);
  assert.match(sim.lastFeedback, /收银成功 连击 1/);

  const summary = sim.getSummary();
  assert.equal(summary.durationSeconds, CONSTANTS.sessionDurationSeconds);
  assert.equal(summary.customerTypes.normal, summary.customersServed + summary.customersLost);
}

function verifySpeedMode(BusinessSimulation, CONSTANTS) {
  const oneX = createSimulation(BusinessSimulation, CONSTANTS, '1x', { initialCustomerCount: 0 });
  const twoX = createSimulation(BusinessSimulation, CONSTANTS, '2x', { initialCustomerCount: 0 });

  oneX.update(10);
  twoX.update(10);

  assert.equal(oneX.timeLeft, CONSTANTS.sessionDurationSeconds - 10);
  assert.equal(twoX.timeLeft, CONSTANTS.sessionDurationSeconds - 20);
  assert.equal(twoX.getSummary().speedMode, '2x');

  twoX.toggleSpeedMode();
  assert.equal(twoX.speedMode, '1x');
}

function verifyWaitingQueueCap(BusinessSimulation, CONSTANTS) {
  const sim = createSimulation(BusinessSimulation, CONSTANTS, '1x', {
    tableCapacity: 0,
    initialCustomerCount: 0,
    patienceSeconds: 1000,
    spawnIntervalSeconds: 0.1
  });

  for (let step = 0; step < 80; step += 1) {
    sim.update(0.1);
  }

  assert.equal(sim.waiting.length, CONSTANTS.maxWaitingCustomers);
  assert.equal(sim.nextCustomerId, CONSTANTS.maxWaitingCustomers + 1);
}

function verifyCustomerSessionCap(BusinessSimulation, CONSTANTS) {
  const sim = createSimulation(BusinessSimulation, CONSTANTS, '1x', {
    tableCapacity: 0,
    initialCustomerCount: 0,
    patienceSeconds: 0.1,
    spawnIntervalSeconds: 0.1
  });

  for (let step = 0; step < 200; step += 1) {
    sim.update(0.2);
  }

  assert.equal(sim.nextCustomerId, CONSTANTS.maxCustomersPerSession + 1);
  assert.ok(sim.customersServed + sim.customersLost <= CONSTANTS.maxCustomersPerSession);
}

function verifySnapshotRestore(BusinessSimulation, CONSTANTS) {
  const sim = createSimulation(BusinessSimulation, CONSTANTS);
  sim.handleTablePressed(0);
  sim.update(1);
  const snapshot = sim.getSnapshot('session-1', '2026-06-17T00:00:00.000Z', '2026-06-17T00:03:30.000Z');
  const restored = BusinessSimulation.fromSnapshot(createTuning(CONSTANTS), snapshot);

  assert.equal(restored.tables[0].customer?.phase, 'seated');
  assert.equal(restored.waiting.length, sim.waiting.length);
  assert.equal(restored.timeLeft, sim.timeLeft);
  assert.notEqual(restored.tables[0].customer, sim.tables[0].customer);

  restored.handleTablePressed(1);
  assert.equal(restored.tables[1].customer?.phase, 'seated');
  assert.equal(sim.tables[1].customer, null);
}
