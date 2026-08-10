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

  // Si leader_id existe mais que le leader n'est pas hydraté, on adapte la structure
  return data || []
}

// 3. Sauvegarder/mettre à jour un deck sur Supabase
export async function saveUserDeck(deck) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const payload = {
    id: deck.id, // On conserve STRICTEMENT l'ID unique du deck
    user_id: user.id,
    name: deck.name,
    leader: deck.leader, // On enregistre le leader
    cards: deck.cards,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('user_decks')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()

  if (error) console.error('Erreur sauvegarde deck :', error)
  return data
}

// 4. Ajouter une carte à la collection du joueur
export async function addCardToCollection(cardId, count = 1) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

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