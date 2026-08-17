import fs from 'fs';

const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));

const unparsedCards = [];

Object.entries(effects).forEach(([cardId, cardData]) => {
  const ast = cardData?.ast || [];
  ast.forEach((effect, idx) => {
    const walkActions = (node, path = []) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach((action, i) => walkActions(action, [...path, i]));
        return;
      }

      if (node.type === 'unparsed_action') {
          unparsedCards.push({
            cardId,
            rawText: node.rawText,
            fullPath: path.join('.'),
            effectIdx: idx
          });
      }

      Object.entries(node).forEach(([key, value]) => {
        if (value && typeof value === 'object') {
          walkActions(value, [...path, key]);
        }
      });
    };
    walkActions(effect);
  });
});

console.log(`Total unparsed_action: ${unparsedCards.length}\n`);

unparsedCards.slice(0, 20).forEach((item, i) => {
  console.log(`${i+1}. ${item.cardId}: "${(item.rawText || '').slice(0, 60)}..."`);
});

if (unparsedCards.length > 20) {
  console.log(`\n... and ${unparsedCards.length - 20} more`);
}

// Group by pattern
const patterns = {};
unparsedCards.forEach(item => {
  const first10 = (item.rawText || '').slice(0, 10).toLowerCase();
  if (!patterns[first10]) patterns[first10] = [];
  patterns[first10].push(item);
});

console.log('\nGrouped by first 10 chars:');
Object.entries(patterns).sort((a, b) => b[1].length - a[1].length).slice(0, 10).forEach(([pattern, items]) => {
  console.log(`  "${pattern}": ${items.length}x`);
});
