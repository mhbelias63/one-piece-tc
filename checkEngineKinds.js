import fs from 'fs';
import { compileEffectAst } from './src/engine/effectCompiler.js';

const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));
const source = fs.readFileSync('./src/engine/DuelEngine.js', 'utf8');
const engineCases = [...source.matchAll(/case '([^']+)'/g)].map(match => match[1]);
const generatedKinds = new Set();
let compiledActionCount = 0;

for (const card of Object.values(effects)) {
  for (const ast of card.ast || []) {
    for (const action of compileEffectAst(ast)?.actions || []) {
      if (action.kind) {
        generatedKinds.add(action.kind);
        compiledActionCount++;
      }
    }
  }
}

const missing = [...generatedKinds].filter(kind => !engineCases.includes(kind)).sort();
console.log(`Compiled actions: ${compiledActionCount}`);
console.log(`Generated kinds: ${generatedKinds.size}`);
console.log(`Missing engine cases: ${missing.length}`);
missing.forEach(kind => console.log(`  ${kind}`));
