import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Variables Supabase manquantes dans le .env")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Nettoyage des noms
function cleanCardName(rawName) {
  if (!rawName) return ''
  let clean = rawName
  clean = clean.replace(/\(?\b[A-Z]{2,3}-?\d{2,3}-\d{3}\b\)?/gi, '')
  clean = clean.replace(/\(\d{3}\)/g, '')

  const blacklist = [
    'parallel', 'manga', 'reprint', 'full art', 'full-art', 'fullart',
    'box topper', 'boxtopper', 'sp', 'sps', 'alternate art', 'spr'
  ]

  blacklist.forEach(word => {
    const regexWithParens = new RegExp(`\\(\\s*${word}\\s*\\)`, 'gi')
    const regexStandalone = new RegExp(`\\b${word}\\b`, 'gi')
    clean = clean.replace(regexWithParens, '')
    clean = clean.replace(regexStandalone, '')
  })

  clean = clean.replace(/\(\s*\)/g, '')
  clean = clean.replace(/([a-zA-Z])\.(?=[a-zA-Z])/g, '$1. ')
  clean = clean.replace(/\s+/g, ' ').trim()
  return clean
}

// Nettoyage des textes d'effets
function cleanCardEffect(rawEffect) {
  if (!rawEffect) return null
  return rawEffect.replace(/Disclaimer:?.*/is, '').trim() || null
}

function firstValue(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || null
}

// Détection Manga
function checkIsManga(itemUrl, itemName) {
  const url = (itemUrl || '').toLowerCase()
  const name = (itemName || '').toLowerCase()
  return url.includes('manga') || name.includes('manga')
}

// Détection SP
function checkIsSp(itemUrl, itemName) {
  const url = (itemUrl || '').toLowerCase()
  const name = (itemName || '').toLowerCase()
  return (
    url.includes('/sp/') || 
    url.includes('/sps/') || 
    url.includes('sp') || 
    name.includes('sp')
  )
}

// Détection Alt Art
function isAltCard(item) {
  const searchText = [
    item?.url || '',
    item?.name || '',
    item?.card_number || '',
    item?.code || '',
    item?.id || '',
    ...(Array.isArray(item?.codes) ? item.codes : [])
  ].join(' ')

  if (/\/ALTS?\//i.test(searchText)) return true
  if (/(?:^|[_\s-])ALT(?:[_\s-]\d+)?/i.test(searchText)) return true
  if (/\b(?:alternate art|alt art|alt)\b/i.test(item?.name || '')) return true
  return false
}

// 1. Dictionnaire global de toutes les cartes (Boosters + Starter Decks)
async function fetchAllOfficialCards() {
  console.log(`🌐 [1/3] Chargement des bases optcgapi.com (Set + ST)...`)
  try {
    const [resSet, resST] = await Promise.all([
      fetch('https://optcgapi.com/api/allSetCards/'),
      fetch('https://www.optcgapi.com/api/allSTCards/')
    ])

    if (!resSet.ok) throw new Error(`Status HTTP SetCards: ${resSet.status}`)
    if (!resST.ok) throw new Error(`Status HTTP STCards: ${resST.status}`)

    const setCards = await resSet.json()
    const stCards = await resST.json()

    const allCards = [...setCards, ...stCards]
    console.log(`📦 ${allCards.length} cartes globales chargées (${setCards.length} boosters + ${stCards.length} ST decks).`)

    const cardsMap = new Map()
    allCards.forEach(card => {
      let rawCode = card.card_set_id || card.card_number || card.id || ''
      const cleanCode = rawCode
        .replace(/^OP-?0*(\d+)/i, (m, p1) => `OP${p1.padStart(2, '0')}`)
        .replace(/^ST-?0*(\d+)/i, (m, p1) => `ST${p1.padStart(2, '0')}`)
      
      if (cleanCode) {
        cardsMap.set(cleanCode, card)
        cardsMap.set(rawCode.toUpperCase(), card)
      }
    })

    return cardsMap
  } catch (err) {
    console.error(`❌ Erreur optcgapi.com :`, err.message)
    return null
  }
}

// 2. Visuels ProxyCardsTool
async function fetchProxyCardsImages(folderPath) {
  console.log(`🌐 [2/3] Récupération des visuels HD sur ProxyCardsTool pour ${folderPath}...`)
  const formData = new URLSearchParams()
  formData.append('action', 'pct_morpice_catalog')
  formData.append('game', 'One Piece')
  formData.append('source', 'dotgg')
  formData.append('folder', folderPath)
  formData.append('sort', 'name_asc')
  formData.append('page', '1')
  formData.append('per_page', '500')

  try {
    const res = await fetch('https://proxycardstool.net/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0'
      },
      body: formData
    })

    const result = await res.json()
    const items = result.data?.items || result.data?.cards || []
    console.log(`🖼️ ${items.length} visuels trouvés dans le dossier.`)
    return items
  } catch (err) {
    console.error(`❌ Erreur ProxyCardsTool :`, err.message)
    return []
  }
}

// 3. Reconstitution et envoi vers Supabase
async function rebuildSet(setCode, folderPath) {
  console.log(`🚀 DEMARRAGE DE L'IMPORTATION POUR ${setCode}`)

  const globalDataMap = await fetchAllOfficialCards()
  if (!globalDataMap) return

  const proxyItems = await fetchProxyCardsImages(folderPath)
  if (proxyItems.length === 0) return

  const altCounters = {}
  const usedIds = new Set()
  const finalPayload = []

  for (const item of proxyItems) {
    const baseCode = item.codes?.[0] || `CARD`

    let official = globalDataMap.get(baseCode)
    if (!official) {
      const normalized = baseCode.replace('-', '').toUpperCase()
      for (const [k, v] of globalDataMap.entries()) {
        if (k.replace('-', '').toUpperCase() === normalized) {
          official = v
          break
        }
      }
    }

    if (!official) {
      official = {
        card_name: item.name || baseCode,
        rarity: 'C',
        card_type: 'CHARACTER'
      }
    }

    let formattedBaseId = baseCode
    if (!baseCode.startsWith(setCode)) {
      formattedBaseId = `${setCode}_${baseCode}`
    }

    // --- LOGIQUE CORRIGÉE DES ALT ARTS ---
    const isAlt = isAltCard(item)
    let cardId = formattedBaseId

    if (isAlt) {
      altCounters[baseCode] = (altCounters[baseCode] || 0) + 1
      cardId = `${formattedBaseId}_ALT_${altCounters[baseCode]}`
    }

    if (usedIds.has(cardId)) continue
    usedIds.add(cardId)
    // -------------------------------------

    const rawName = official.card_name || official.name || baseCode
    const cleanName = cleanCardName(rawName)
    const rawEffect = official.card_text || official.effect || null

    const isManga = checkIsManga(item.url, item.name)
    const isSp = checkIsSp(item.url, item.name)

    finalPayload.push({
      id: cardId,
      name: cleanName,
      set_id: setCode,
      rarity: official.rarity || 'C',
      type: official.card_type || null,
      color: official.card_color || null,
      power: official.card_power && official.card_power !== 'NULL' ? parseInt(official.card_power) : null,
      cost: official.card_cost && official.card_cost !== 'NULL' ? parseInt(official.card_cost) : null,
      life: official.life && official.life !== 'NULL' ? parseInt(official.life) : null,
      counter: official.counter_amount ? parseInt(official.counter_amount) : null,
      attribute: official.attribute || null,
      sub_types: firstValue(
        official.sub_types,
        official.subtype,
        official.card_subtypes,
        official.card_sub_types,
        official.traits,
        official.card_traits
      ),
      category: firstValue(official.category, official.card_category, official.cardCategory),
      effect: cleanCardEffect(rawEffect),
      image_url: item.url,
      is_manga: isManga,
      is_sp: isSp
    })
  }

  console.log(`🧹 Purge des anciennes données du set ${setCode} dans Supabase...`)
  await supabase.from('cards').delete().eq('set_id', setCode)

  console.log(`💾 [3/3] Insertion de ${finalPayload.length} cartes dans Supabase pour ${setCode}...`)
  const { error } = await supabase.from('cards').insert(finalPayload)

  if (error) {
    console.error(`❌ Erreur Supabase :`, error.message)
  } else {
    console.log(`🎉 SUCCÈS ! ${finalPayload.length} cartes importées proprement pour ${setCode} !`)
    const missingTraits = finalPayload.filter(card => {
      return String(card.type || '').toLowerCase() === 'character' && !card.sub_types
    })
    if (missingTraits.length > 0) {
      console.warn(`⚠️ ${missingTraits.length} personnages sans traits: ${missingTraits.map(card => card.id).join(', ')}`)
    }
  }
}

// Exemple pour lancer l'importation d'un set
rebuildSet('ST04', 'OnePiece/MorpiceRamadan/ST04')