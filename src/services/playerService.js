import { supabase } from '../supabase'

// 1. Récupérer le profil du joueur
export async function fetchUserProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) console.error('Erreur profil :', error)
  return data
}

// 2. Charger les decks du joueur depuis Supabase
export async function fetchUserDecks() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_decks')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    console.error('Erreur chargement decks :', error)
    return []
  }
  return data
}

// 3. Sauvegarder/mettre à jour un deck sur Supabase
export async function saveUserDeck(deck) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const payload = {
    user_id: user.id,
    name: deck.name,
    leader_id: deck.leader?.id || null,
    cards: deck.cards,
    updated_at: new Date().toISOString()
  }

  // Si le deck a déjà un ID Supabase, on fait un update, sinon un insert
  if (deck.id && !deck.id.includes('-')) {
    payload.id = deck.id
  }

  const { data, error } = await supabase
    .from('user_decks')
    .upsert(payload)
    .select()
    .single()

  if (error) console.error('Erreur sauvegarde deck :', error)
  return data
}

// 4. Ajouter une carte à la collection du joueur (ex: ouverture de booster)
export async function addCardToCollection(cardId, count = 1) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // On vérifie si la carte est déjà possédée
  const { data: existing } = await supabase
    .from('user_cards')
    .select('count')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .single()

  if (existing) {
    await supabase
      .from('user_cards')
      .update({ count: existing.count + count })
      .eq('user_id', user.id)
      .eq('card_id', cardId)
  } else {
    await supabase
      .from('user_cards')
      .insert({ user_id: user.id, card_id: cardId, count })
  }
}