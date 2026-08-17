import peggy from 'peggy'
import fs from 'fs'

// 1. Charger la grammaire Peggy
const grammar = fs.readFileSync('opcg_grammar.pegjs', 'utf8')
const parser = peggy.generate(grammar)

// 2. Charger les cartes réelles
const rawData = fs.readFileSync('canonical_cards.json', 'utf8')
const cards = JSON.parse(rawData)

// 3. Filtrer les cartes avec un effet non vide
const sampleCards = cards
  .filter(c => c.effect && c.effect.trim().length > 0)
  .slice(0, 10)

console.log(`\n--- TEST SUR ${sampleCards.length} VRAIES CARTES DU DATASET ---\n`)

let success = 0
let failed = 0

sampleCards.forEach((card) => {
  console.log(`----------------------------------------`)
  console.log(`Carte : ${card.baseCode} - ${card.name}`)
  console.log(`Texte : "${card.effect}"`)
  
  try {
    const result = parser.parse(card.effect)
    console.log('✅ AST :', JSON.stringify(result, null, 2))
    success++
  } catch (err) {
    console.log('❌ Erreur de parsing :', err.message)
    failed++
  }
})

console.log(`\n========================================`)
console.log(`Résultats : ${success} réussies / ${failed} échouées sur ${sampleCards.length} cartes.`)