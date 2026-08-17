import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const SUPABASE_URL = 'https://nnwlhrrburrfdnoldini.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ud2xocnJidXJyZmRub2xkaW5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjEwOTkwMSwiZXhwIjoyMTAxNjg1OTAxfQ.BFGHs5wA2R1KwFCpnyoUmm0xC657J9ED3VDNU2h0gGM'
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function exportUniqueCards() {
  console.log('📦 Récupération des cartes depuis Supabase...')

  const { data: cards, error } = await supabase
    .from('cards')
    .select('id, name, set_id, effect, type')

  if (error) {
    console.error('❌ Erreur :', error)
    return
  }

  const uniqueCardsMap = new Map()

  cards.forEach(card => {
    if (!card.id) return

    // 1. Extrait le code canonique depuis l'ID (ex: "EB01-001" depuis "EB01-001_ALT_1")
    const baseCode = card.id.split('_')[0].trim()

    // 2. Si la carte canonique n'a pas encore été enregistrée, on l'ajoute
    if (!uniqueCardsMap.has(baseCode) && card.effect && card.effect.trim() !== '') {
      uniqueCardsMap.set(baseCode, {
        baseCode,
        name: card.name,
        type: card.type,
        setId: card.set_id,
        effect: card.effect.trim()
      })
    }
  })

  const uniqueCardsList = Array.from(uniqueCardsMap.values())

  fs.writeFileSync('canonical_cards.json', JSON.stringify(uniqueCardsList, null, 2))
  console.log(`✅ Fichier 'canonical_cards.json' généré avec succès !`)
  console.log(`📊 ${uniqueCardsList.length} cartes uniques extraites (les déclinaisons ALT ont été ignorées).`)
}

exportUniqueCards()