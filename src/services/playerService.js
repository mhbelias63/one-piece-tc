import { supabase } from '../supabase'

// Cache en mémoire pour éviter de ré-interroger la table 'cards' à chaque affichage
let cardsCache = null

export async function fetchCardsCached() {
  if (cardsCache && cardsCache.length > 0) {
    return cardsCache
  }
  const { data, error } = await supabase.from('cards').select('*')
  if (!error && data) {
    cardsCache = data
  }
  return cardsCache || []
}

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

  return data || []
}

// 3. Sauvegarder/mettre à jour un deck sur Supabase
export async function saveUserDeck(deck) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.warn('Utilisateur non connecté : sauvegarde Supabase annulée.')
    return null
  }

  const payload = {
    id: deck.id,
    user_id: user.id,
    name: deck.name,
    leader: deck.leader,
    cards: deck.cards,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('user_decks')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    console.error('Erreur Supabase lors de la sauvegarde du deck :', error.message, error.details)
  } else {
    console.log('Deck sauvegardé avec succès sur Supabase !', data)
  }
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

// Déduire des gemmes lors d'un achat (ex: ouverture de booster)
export async function deductUserGems(amount) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non connecté' }

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('gems')
    .eq('id', user.id)
    .single()

  if (fetchError || !profile) {
    return { success: false, error: 'Impossible de récupérer les gemmes' }
  }

  if (profile.gems < amount) {
    return { success: false, error: 'Gemmes insuffisantes !' }
  }

  const newGems = profile.gems - amount

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ gems: newGems })
    .eq('id', user.id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true, newGems }
}