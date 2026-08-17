import fs from 'fs';

const partial = JSON.parse(fs.readFileSync('./partially_parsed_cards.json', 'utf8'));
const allTypes = new Set();
const cardsByType = {};

Object.values(partial).forEach(card => {
  const walkActions = (actions) => {
    if (!Array.isArray(actions)) return;
    actions.forEach(a => {
      if (a?.type) {
        allTypes.add(a.type);
        if (!cardsByType[a.type]) cardsByType[a.type] = [];
        cardsByType[a.type].push(card.id);
      }
      if (a?.actions) walkActions(a.actions);
    });
  };
  walkActions(card.actions || []);
});

console.log('Tous les types trouvés dans les 164 partielles:');
Array.from(allTypes).sort().forEach(t => {
  const count = cardsByType[t]?.length || 0;
  console.log(`  ${t}: ${count} cartes`);
});
