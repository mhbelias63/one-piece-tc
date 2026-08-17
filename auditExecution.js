import fs from 'fs';
import { compileEffectAst, findUnsupportedActionTypes } from './src/engine/effectCompiler.js';

const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));
const entries = Object.entries(effects);
const unsupported = new Map();
let cardsWithAst = 0;
let cardsWithCompiledActions = 0;
let emptyCompiledCards = 0;
let astCount = 0;
let actionCount = 0;

for (const [cardId, cardData] of entries) {
  const asts = Array.isArray(cardData?.ast) ? cardData.ast : [];
  if (asts.length === 0) continue;

  cardsWithAst++;
  astCount += asts.length;

  let cardHasCompiledActions = false;
  for (const ast of asts) {
    const compiled = compileEffectAst(ast);
    const actions = compiled?.actions || [];
    actionCount += actions.length;
    cardHasCompiledActions ||= actions.length > 0;

    for (const type of findUnsupportedActionTypes(ast)) {
      unsupported.set(type, (unsupported.get(type) || 0) + 1);
    }
  }

  if (cardHasCompiledActions) cardsWithCompiledActions++;
  else emptyCompiledCards++;
}

const noEffectCards = entries.filter(([, cardData]) => {
  return !cardData?.effect || String(cardData.effect).trim().toUpperCase() === 'NULL';
}).length;

console.log('EXECUTION AUDIT');
console.log('================');
console.log(`Total cards:                 ${entries.length}`);
console.log(`Cards without effect text:   ${noEffectCards}`);
console.log(`Cards with AST:               ${cardsWithAst}`);
console.log(`Cards with compiled actions:  ${cardsWithCompiledActions}`);
console.log(`Cards with passive/metadata AST:${emptyCompiledCards}`);
console.log(`AST effects:                  ${astCount}`);
console.log(`Compiled actions:             ${actionCount}`);
console.log(`Unsupported action types:     ${unsupported.size}`);

if (unsupported.size > 0) {
  console.log('\nUnsupported types:');
  [...unsupported.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => console.log(`  ${type}: ${count}`));
}

if (unsupported.size > 0) {
  process.exitCode = 1;
}
