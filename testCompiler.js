import { DuelEngine } from './src/engine/DuelEngine.js';
import { compileEffectAst } from './src/engine/effectCompiler.js';
import fs from 'fs';

// Load a few test cards with different action types
const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));

// Find cards with the top 3 action types: place_rest, search_deck, boost_power
const testCards = {
  place_rest: null,
  search_deck: null,
  boost_power: null
};

Object.entries(effects).forEach(([cardId, cardData]) => {
  const ast = cardData?.ast?.[0];
  if (!ast?.actions) return;
  
  const findType = (actions, type) => {
    if (!Array.isArray(actions)) return false;
    return actions.some(a => {
      if (a?.type === type) return true;
      if (a?.actions) return findType(a.actions, type);
      return false;
    });
  };
  
  Object.keys(testCards).forEach(type => {
    if (!testCards[type] && findType(ast.actions, type)) {
      testCards[type] = { cardId, effect: cardData, ast };
    }
  });
});

console.log('TEST EXECUTION - Top 3 action types\n');
console.log('='.repeat(60));

Object.entries(testCards).forEach(([type, data]) => {
  if (!data) {
    console.log(`\n❌ ${type}: No test card found`);
    return;
  }
  
  console.log(`\n✓ ${type}: ${data.cardId} - ${data.effect.name}`);
  console.log(`  Effect: ${(data.effect.effect || '').slice(0, 80)}...`);
  
  const actions = data.ast.actions || [];
  console.log(`  Actions: ${actions.length} root actions`);
  actions.slice(0, 3).forEach((a, i) => {
    console.log(`    ${i+1}. ${a.type}`);
  });
  
  // Compile and show the compiled output
  const compiled = compileEffectAst(data.ast);
  if (compiled?.actions?.length > 0) {
    console.log(`  Compiled: ${compiled.actions.length} actions`);
    compiled.actions.slice(0, 3).forEach((a, i) => {
      console.log(`    ${i+1}. ${a.kind}`);
    });
  } else {
    console.log(`  Compiled: No actions produced`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('If all 3 types have compiled successfully, the pipeline works!');
