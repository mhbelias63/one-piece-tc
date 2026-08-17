import fs from 'fs';
import { compileEffectAst } from './src/engine/effectCompiler.js';

const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));
for (const [id, cardData] of Object.entries(effects)) {
  const ast = cardData?.ast || [];
  if (ast.length > 0 && ast.every(effect => !(compileEffectAst(effect)?.actions?.length))) {
    console.log(`${id} - ${cardData.name} - ${JSON.stringify(ast).slice(0, 260)}`);
  }
}
