import cardEffects from './card_effects.json';

// 1. On filtre uniquement les cartes 100% parsées qui ont au moins une action dans l'AST
const parsedCards = Object.entries(cardEffects).filter(([id, card]: [string, any]) => {
  return card.source === 'parsed' && Array.isArray(card.ast) && card.ast.length > 0;
});

// 2. Fonction pour piocher N cartes aléatoires
function getRandomParsedCards(count: number) {
  const shuffled = [...parsedCards].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(([id, card]) => ({
    id,
    ...card
  }));
}

// 3. Exécution du test
console.log(`\n=== CARTES PARSÉES DISPONIBLES : ${parsedCards.length} ===\n`);

// On pioche 3 cartes parsées au hasard pour simuler/tester
const testSample = getRandomParsedCards(3);

testSample.forEach((card, index) => {
  console.log(`--- CARTE ${index + 1} : ${card.name} (${card.id}) ---`);
  console.log(`Effet brut : "${card.effect}"`);
  console.log(`AST généré :`, JSON.stringify(card.ast, null, 2));
  console.log('--------------------------------------------------\n');
});