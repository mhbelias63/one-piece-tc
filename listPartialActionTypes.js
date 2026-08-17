import fs from 'fs';

const partial = JSON.parse(fs.readFileSync('./partially_parsed_cards.json', 'utf8'));
const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));

const partialIds = Object.keys(partial);
const typeFreq = {};
const exampleCards = {};

partialIds.forEach(cardId => {
  const effect = effects[cardId];
  if (!effect?.actions) return;

  const walkActions = (actions) => {
    if (!Array.isArray(actions)) return;
    actions.forEach(action => {
      if (action?.type) {
        typeFreq[action.type] = (typeFreq[action.type] || 0) + 1;
        if (!exampleCards[action.type]) {
          exampleCards[action.type] = cardId;
        }
      }
      if (action?.actions) walkActions(action.actions);
    });
  };
  walkActions(effect.actions);
});

console.log('Types d\'actions dans les 164 partielles:');
Object.entries(typeFreq)
  .sort(([,a], [,b]) => b - a)
  .forEach(([type, count]) => {
    console.log(`  ${type}: ${count}x (ex: ${exampleCards[type]})`);
  });
