import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import peggy from 'peggy'

dotenv.config()

const setCode = process.argv[2]
if (!setCode) {
  console.error('Usage: node buildSetEffectsAst.js ST03')
  process.exit(1)
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase variables are missing from .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const parser = peggy.generate(fs.readFileSync('./opcg_grammar.pegjs', 'utf8'))
const effectOverrides = JSON.parse(fs.readFileSync('./effect_overrides.json', 'utf8'))

function hasUnparsedAction(value) {
  if (!value) return false
  if (Array.isArray(value)) return value.some(hasUnparsedAction)
  if (typeof value !== 'object') return false
  if (value.type === 'unparsed_action') return true
  return Object.values(value).some(hasUnparsedAction)
}

function parseEffect(effect) {
  if (!effect || String(effect).trim().toUpperCase() === 'NULL') return []
  try {
    const ast = parser.parse(String(effect).trim())
    return hasUnparsedAction(ast) ? [] : (Array.isArray(ast) ? ast : [ast])
  } catch (error) {
    console.warn(`Parse failed for effect: ${String(effect).slice(0, 80)} (${error.message})`)
    return []
  }
}

const SET_OVERRIDES = {
  'ST03-004': [{
    proc: 'onPlay',
    type: 'return_to_hand',
    amount: 1,
    target: {
      targetType: 'character',
      cardTypes: ['The Seven Warlords of the Sea', 'Thriller Bark Pirates'],
      maxCost: 4,
      from: 'trash'
    }
  }],
  'ST03-010': [{
    proc: 'onPlay',
    type: 'look_and_place',
    look: 3
  }, {
    proc: 'trigger',
    type: 'play_self'
  }]
}

async function run() {
  const { data: cards, error: readError } = await supabase
    .from('cards')
    .select('id,name,effect,set_id,type,sub_types')
    .eq('set_id', setCode)

  if (readError) throw readError
  if (!cards?.length) {
    console.error(`No cards found for set ${setCode}`)
    process.exitCode = 1
    return
  }

  const uniqueCards = cards.filter(card => !/_ALT_\d+$/i.test(card.id))
  const cardsWithEffect = uniqueCards.filter(card => {
    const effect = String(card.effect || '').trim()
    return effect !== '' && effect.toUpperCase() !== 'NULL'
  })
  const missingTraits = uniqueCards.filter(card => {
    return String(card.type || '').toLowerCase() === 'character' && !card.sub_types
  })
  if (missingTraits.length > 0) {
    console.warn(`Characters without traits in ${setCode}: ${missingTraits.map(card => card.id).join(', ')}`)
  }
  const payload = cardsWithEffect.map(card => ({
    id: card.id,
    name: card.name,
    effect_ast: effectOverrides[card.id]
      || effectOverrides[card.id.replace(/_ALT_\d+$/, '')]
      || SET_OVERRIDES[card.id.replace(/_ALT_\d+$/, '')]
      || parseEffect(card.effect)
  }))

  const { error: writeError } = await supabase
    .from('cards')
    .upsert(payload, { onConflict: 'id' })
  if (writeError) throw writeError

  const parsed = payload.filter(card => card.effect_ast.length > 0).length
  console.log(`AST written for ${parsed}/${payload.length} cards in ${setCode}`)
  console.log(`Cards requiring grammar overrides or manual review: ${payload.length - parsed}`)
  if (cardsWithEffect.length !== uniqueCards.length) {
    console.log(`Cards without effect skipped: ${uniqueCards.length - cardsWithEffect.length}`)
  }
}

run().catch(error => {
  console.error('AST generation failed:', error.message)
  process.exitCode = 1
})