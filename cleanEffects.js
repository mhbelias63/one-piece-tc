import fs from 'fs';

const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));

// Clean up errata actions and malformed raw arrays
Object.entries(effects).forEach(([cardId, cardData]) => {
  const ast = cardData?.ast || [];
  ast.forEach((effect, idx) => {
    // Fix malformed raw array (split chars) -> keep as string
    if (Array.isArray(effect?.raw) && typeof effect.raw[0] === 'string') {
      effect.raw = effect.raw.join('');
    }

    // Clean up errata actions: remove them from the actions list
    if (Array.isArray(effect?.actions)) {
      effect.actions = effect.actions.filter(a => a?.type !== 'errata');
      if (effect.actions.length === 0) {
        delete effect.actions;
      }
    }
  });
});

fs.writeFileSync('./card_effects.json', JSON.stringify(effects, null, 2), 'utf8');
console.log('✅ Cleaned up card_effects.json');
console.log('  - Fixed raw arrays');
console.log('  - Removed errata actions');
