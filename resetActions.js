import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nnwlhrrburrfdnoldini.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ud2xocnJidXJyZmRub2xkaW5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjEwOTkwMSwiZXhwIjoyMTAxNjg1OTAxfQ.BFGHs5wA2R1KwFCpnyoUmm0xC657J9ED3VDNU2h0gGM'
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function resetAllActions() {
  console.log('🧹 Nettoyage de la colonne actionV3s dans Supabase...')

  const { error } = await supabase
    .from('cards')
    .update({ actionV3s: [] })
    .neq('id', '') // Cible toutes les lignes

  if (error) {
    console.error('❌ Erreur lors du nettoyage :', error)
  } else {
    console.log('✅ Base nettoyée ! Toutes les cartes ont à présent actionV3s = []')
  }
}

resetAllActions()