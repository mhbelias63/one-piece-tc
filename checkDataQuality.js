import fs from 'fs';
const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));

let errataCount = 0;
let badRawCount = 0;
const errataCards = [];
const badRawCards = [];

Object.entries(effects).forEach(([cardId, cardData]) => {
  const ast = cardData?.ast || [];
  ast.forEach((effect, idx) => {
    if (Array.isArray(effect?.raw) && typeof effect.raw[0] === 'string') {
      badRawCount++;
      if (!badRawCards.includes(cardId)) badRawCards.push(cardId);
    }
    
    const walkActions = (actions) => {
      if (!Array.isArray(actions)) return;
      actions.forEach(a => {
        if (a?.type === 'errata') {
          errataCount++;
          if (!errataCards.includes(cardId)) errataCards.push(cardId);
        }
        if (a?.actions) walkActions(a.actions);
      });
    };
    walkActions(effect.actions);
  });
});

console.log('Cartes avec type errata:', errataCount, 'cartes uniques:', errataCards.length);
if (errataCards.length > 0) console.log('  Ex:', errataCards.slice(0, 5));
console.log('');
console.log('Cartes avec raw[] malformé:', badRawCount, 'cartes uniques:', badRawCards.length);
if (badRawCards.length > 0) console.log('  Ex:', badRawCards.slice(0, 5));
