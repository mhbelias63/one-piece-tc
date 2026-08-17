import fs from 'fs';
import peggy from 'peggy';

// 1. Chargement de la grammaire et du dataset
const grammarText = fs.readFileSync('opcg_grammar.pegjs', 'utf8');
const cards = JSON.parse(fs.readFileSync('canonical_cards.json', 'utf8'));

const parser = peggy.generate(grammarText);

let total = cards.length;
let fullyParsedCount = 0;
let partiallyParsedCount = 0;
let crashCount = 0;

const failedCards = [];
const partiallyParsedCards = [];

// Objets pour grouper et compter la récurrence des erreurs
const unparsedFrequency = {};
const crashFrequency = {};

// Recherche récursive des nœuds unparsed_action
function findUnparsedSegments(node) {
  let results = [];
  if (!node) return results;

  if (Array.isArray(node)) {
    node.forEach(child => results.push(...findUnparsedSegments(child)));
  } else if (typeof node === 'object') {
    if (node.type === 'unparsed_action' && node.rawText) {
      results.push(node.rawText);
    } else {
      Object.values(node).forEach(value => {
        results.push(...findUnparsedSegments(value));
      });
    }
  }
  return results;
}

// 2. Analyse
cards.forEach(card => {
  if (!card.effect) return;

  try {
    const ast = parser.parse(card.effect);
    const unparsedSegments = findUnparsedSegments(ast);

    if (unparsedSegments.length === 0) {
      fullyParsedCount++;
    } else {
      partiallyParsedCount++;
      partiallyParsedCards.push({
        code: card.code,
        name: card.name,
        effect: card.effect,
        unparsed_segments: unparsedSegments
      });

      unparsedSegments.forEach(seg => {
        const trimmed = seg.trim();
        unparsedFrequency[trimmed] = (unparsedFrequency[trimmed] || 0) + 1;
      });
    }
  } catch (err) {
    crashCount++;
    failedCards.push({
      code: card.code,
      name: card.name,
      effect: card.effect,
      error: err.message
    });

    const errKey = err.message.split(' (line')[0];
    crashFrequency[errKey] = (crashFrequency[errKey] || 0) + 1;
  }
});

// 3. Sauvegarde des rapports
fs.writeFileSync('failed_cards.json', JSON.stringify(failedCards, null, 2));
fs.writeFileSync('partially_parsed_cards.json', JSON.stringify(partiallyParsedCards, null, 2));


// 4. Affichage du rapport synthétique
console.log('========================================');
console.log('📊 RAPPORT GLOBAL DE PARSING PEGGY.JS');
console.log('========================================');
console.log(`Cartes analysées        : ${total}`);
console.log(`✅ 100% gérées (AST)    : ${fullyParsedCount} (${((fullyParsedCount / total) * 100).toFixed(1)}%)`);
console.log(`⚠️  Partiellement gérées : ${partiallyParsedCount} (${((partiallyParsedCount / total) * 100).toFixed(1)}%)`);
console.log(`❌ Crashes de grammaire : ${crashCount} (${((crashCount / total) * 100).toFixed(1)}%)`);
console.log('========================================');

if (Object.keys(unparsedFrequency).length > 0) {
  console.log('\n🔥 TOP 100 DES SEGMENTS UNPARSED LES PLUS FRÉQUENTS :');
  Object.entries(unparsedFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100) // Modification ici : 100 au lieu de 5
    .forEach(([text, count]) => console.log(`  [${count}x] "${text}"`));
}

if (Object.keys(crashFrequency).length > 0) {
  console.log('\n🔥 TOP 100 DES ERREURS DE PARSING :');
  Object.entries(crashFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100) // Modification ici : 100 au lieu de 5
    .forEach(([err, count]) => console.log(`  [${count}x] ${err}`));
}

console.log('\n📁 Détails enregistrés dans partially_parsed_cards.json et failed_cards.json\n');