import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

// Connexion Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Clés Supabase manquantes dans le fichier .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runImport() {
  console.log('📖 Lecture de card_effects.json...')
  const fileData = fs.readFileSync('./card_effects.json', 'utf-8')
  const cardEffects = JSON.parse(fileData)

  if (!cardEffects || typeof cardEffects !== 'object' || Array.isArray(cardEffects)) {
    throw new Error('card_effects.json doit contenir un objet de cartes')
  }

  const payload = Object.entries(cardEffects).map(([cardId, data]) => ({
    id: cardId,
    name: data.name || cardId,
    effect_ast: Array.isArray(data.ast) ? data.ast : []
  }))

  const duplicateIds = payload.map(card => card.id).filter((id, index, all) => all.indexOf(id) !== index)
  if (duplicateIds.length > 0) throw new Error(`IDs dupliqués: ${duplicateIds.slice(0, 5).join(', ')}`)

  console.log(`🚀 Importation de ${payload.length} cartes dans Supabase...`)

  // Découpage par lots pour éviter les requêtes trop lourdes.
  const chunkSize = 50
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize)

    const { error } = await supabase
      .from('cards')
      .upsert(chunk, { onConflict: 'id' })

    if (error) {
      console.error(`❌ Erreur sur le lot ${i / chunkSize + 1} :`, error.message)
    } else {
      console.log(`✅ Lot ${i / chunkSize + 1} importé (${chunk.length} cartes)`)
    }
  }

  console.log(`🎉 Importation terminée: ${payload.length} AST écrits dans effect_ast.`)
}

runImport()