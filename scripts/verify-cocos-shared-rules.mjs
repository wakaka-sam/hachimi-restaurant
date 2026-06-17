import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import {
  CONSTANTS as SHARED_CONSTANTS,
  CUSTOMER_TYPES,
  PARTS,
  PART_LABELS,
  TASK_TYPES,
  TASK_TYPE_LABELS
} from '../shared/game-rules.mjs';

const cocosRulesPath = 'client/cocos/assets/scripts/core/GameRules.ts';
const source = await readFile(cocosRulesPath, 'utf8');
const sourceFile = ts.createSourceFile(cocosRulesPath, source, ts.ScriptTarget.Latest, true);
let failed = false;

const CLIENT_CONSTANT_KEYS = [
  'baseRevenue',
  'incomeGrowth',
  'starsPerPart',
  'partsPerRestaurant',
  'staminaMax',
  'sessionStaminaCost',
  'sessionDurationSeconds',
  'maxSpeedMultiplier',
  'maxTableSlots',
  'initialCustomerCount',
  'maxWaitingCustomers',
  'maxCustomersPerSession',
  'normalCustomersPerSession'
];

compare('PARTS', readStringArray('PARTS'), PARTS);
compare('CUSTOMER_TYPES', readStringArray('CUSTOMER_TYPES'), CUSTOMER_TYPES);
compare('TASK_TYPES', readStringArray('TASK_TYPES'), TASK_TYPES);
compare('PART_LABELS', readStringMap('PART_LABELS'), PART_LABELS);
compare('TASK_TYPE_LABELS', readStringMap('TASK_TYPE_LABELS'), TASK_TYPE_LABELS);
compare(
  'CONSTANTS',
  readNumberMap('CONSTANTS'),
  Object.fromEntries(CLIENT_CONSTANT_KEYS.map((key) => [key, SHARED_CONSTANTS[key]]))
);

if (failed) {
  process.exit(1);
}

console.log(`Cocos shared rules verified: ${CLIENT_CONSTANT_KEYS.length} constants, ${PARTS.length} parts, ${TASK_TYPES.length} task types.`);

function compare(name, actual, expected) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    console.error(`Cocos shared rules violation: ${name} differs.`);
    console.error(`  actual:   ${actualText}`);
    console.error(`  expected: ${expectedText}`);
    failed = true;
  }
}

function readStringArray(name) {
  const node = unwrapInitializer(findExportedVariable(name));
  if (!ts.isArrayLiteralExpression(node)) {
    throw new Error(`${name} must be an array literal in ${cocosRulesPath}`);
  }
  return node.elements.map((element) => {
    if (!ts.isStringLiteral(element)) {
      throw new Error(`${name} must contain only string literals in ${cocosRulesPath}`);
    }
    return element.text;
  });
}

function readStringMap(name) {
  const node = unwrapInitializer(findExportedVariable(name));
  if (!ts.isObjectLiteralExpression(node)) {
    throw new Error(`${name} must be an object literal in ${cocosRulesPath}`);
  }
  return Object.fromEntries(node.properties.map((property) => {
    if (!ts.isPropertyAssignment(property)) {
      throw new Error(`${name} must contain only property assignments in ${cocosRulesPath}`);
    }
    const value = unwrapInitializer(property.initializer);
    if (!ts.isStringLiteral(value)) {
      throw new Error(`${name}.${getPropertyName(property)} must be a string literal in ${cocosRulesPath}`);
    }
    return [getPropertyName(property), value.text];
  }));
}

function readNumberMap(name) {
  const node = unwrapInitializer(findExportedVariable(name));
  if (!ts.isObjectLiteralExpression(node)) {
    throw new Error(`${name} must be an object literal in ${cocosRulesPath}`);
  }
  return Object.fromEntries(node.properties.map((property) => {
    if (!ts.isPropertyAssignment(property)) {
      throw new Error(`${name} must contain only property assignments in ${cocosRulesPath}`);
    }
    return [getPropertyName(property), readNumberLiteral(property.initializer, `${name}.${getPropertyName(property)}`)];
  }));
}

function readNumberLiteral(node, name) {
  const value = unwrapInitializer(node);
  if (ts.isNumericLiteral(value)) {
    return Number(value.text);
  }
  if (
    ts.isPrefixUnaryExpression(value)
    && value.operator === ts.SyntaxKind.MinusToken
    && ts.isNumericLiteral(value.operand)
  ) {
    return -Number(value.operand.text);
  }
  throw new Error(`${name} must be a number literal in ${cocosRulesPath}`);
}

function findExportedVariable(name) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !isExported(statement)) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        if (!declaration.initializer) {
          throw new Error(`${name} has no initializer in ${cocosRulesPath}`);
        }
        return declaration.initializer;
      }
    }
  }
  throw new Error(`Missing exported variable ${name} in ${cocosRulesPath}`);
}

function isExported(statement) {
  return Boolean(statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function unwrapInitializer(node) {
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression?.(node)) {
    return unwrapInitializer(node.expression);
  }
  return node;
}

function getPropertyName(property) {
  const name = property.name;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  throw new Error(`Unsupported property name in ${cocosRulesPath}`);
}
