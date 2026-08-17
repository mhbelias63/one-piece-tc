import fs from 'fs';

const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));

const nullCards = Object.entries(effects)
  .filter(([id, data]) => !data.ast || data.ast.length === 0)
  .slice(0, 10)
  .map(([id, data]) => ({
    id,
    name: data.name,
    effect: data.effect ? data.effect.slice(0, 60) : '(none)',
    reason: !data.effect ? 'NO EFFECT TEXT' : 'NO AST'
  }));

console.log('Sample of null/empty cards:');
nullCards.forEach(c => console.log(`  ${c.id} - ${c.name}: ${c.reason}`));
