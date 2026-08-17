import fs from 'fs';

const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));

const problematicCards = ['OP14-110', 'OP16-105', 'OP03-027', 'OP05-096'];

problematicCards.forEach(cardId => {
  const card = effects[cardId];
  if (!card) return;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Card: ${cardId} - ${card.name}`);
  console.log(`Full Effect: ${card.effect}`);
  console.log(`\nAST:`);
  
  const ast = card.ast || [];
  ast.forEach((effect, idx) => {
    console.log(`  Effect ${idx}:`);
    if (effect.actions) {
      const walkActions = (actions, indent = '    ') => {
        actions.forEach((a, i) => {
          console.log(`${indent}[${i}] ${a.type}${a.rawText ? ' - unparsed: ' + a.rawText.slice(0, 50) : ''}`);
          if (a.actions) walkActions(a.actions, indent + '  ');
        });
      };
      walkActions(effect.actions);
    }
  });
});
