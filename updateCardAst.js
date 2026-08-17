import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const cardId = process.argv[2]
if (!cardId) {
  console.error('Usage: node updateCardAst.js ST03-004')
  process.exit(1)
}

if (/_ALT_\d+$/i.test(cardId)) {
  console.error(`Alternate card IDs are disabled: ${cardId}`)
  process.exit(1)
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase variables are missing from .env')
  process.exit(1)
}

const overrides = JSON.parse(fs.readFileSync('./effect_overrides.json', 'utf8'))
const baseId = cardId.replace(/_ALT_\d+$/, '')
const ast = overrides[cardId] || overrides[baseId]

if (!Array.isArray(ast)) {
  console.error(`No AST override found for ${cardId} in effect_overrides.json`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const { data: existing, error: readError } = await supabase
  .from('cards')
  .select('id,name')
  .eq('id', cardId)
  .maybeSingle()

if (readError) throw readError
if (!existing) {
  console.error(`Card ${cardId} was not found in Supabase`)
  process.exit(1)
}

const { error: writeError } = await supabase
  .from('cards')
  .update({ effect_ast: ast })
  .eq('id', cardId)

if (writeError) throw writeError
console.log(`AST updated for ${existing.name} (${cardId}) with ${ast.length} effect(s).`)
