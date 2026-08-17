import fs from 'fs';

const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));

const typeFreq = {};
const exampleCards = {};

Object.entries(effects).forEach(([cardId, cardData]) => {
  const astArray = cardData?.ast;
  if (!astArray || !Array.isArray(astArray)) return;

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
  
  astArray.forEach(effect => {
    if (effect?.actions) {
      walkActions(effect.actions);
    }
  });
});

console.log('Top 30 types d\'actions les plus courants:');
Object.entries(typeFreq)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 30)
  .forEach(([type, count]) => {
    console.log(`  ${type}: ${count}x (ex: ${exampleCards[type]})`);
  });
