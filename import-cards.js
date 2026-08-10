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
    'box topper', 'boxtopper', 'sp', 'sps', 'alternate art', 'dash pack', 'spr'
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
    url.includes('sp') || // Détecte n'importe quel "sp" dans l'URL
    name.includes('sp')
  )
}

// 1. Dictionnaire global de toutes les cartes
async function fetchAllOfficialCards() {
  console.log(`🌐 [1/3] Chargement de la base globale optcgapi.com...`)
  try {
    const res = await fetch('https://optcgapi.com/api/allSetCards/')
    if (!res.ok) throw new Error(`Status HTTP: ${res.status}`)

    const allCards = await res.json()
    console.log(`📦 ${allCards.length} cartes globales chargées.`)

    const cardsMap = new Map()
    allCards.forEach(card => {
      let rawCode = card.card_set_id || card.card_number || card.id || ''
      const cleanCode = rawCode.replace(/^OP-?0*(\d+)/i, (m, p1) => `OP${p1.padStart(2, '0')}`)
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
                rarity: 'SR',
                card_type: 'CHARACTER'
            }
        }

        // Évite le doublon "OP09_OP09" mais préfixe si la carte vient d'un autre set (ex: OP07)
        let formattedBaseId = baseCode
        if (!baseCode.startsWith(setCode)) {
            formattedBaseId = `${setCode}_${baseCode}`
        }

        const isAlt = item.url.includes('/ALTS/') || item.name.includes('(') || item.name.includes('_')
        let cardId = formattedBaseId

        if (isAlt || usedIds.has(cardId)) {
            altCounters[baseCode] = (altCounters[baseCode] || 0) + 1
            cardId = `${formattedBaseId}_ALT_${altCounters[baseCode]}`
        }

        while (usedIds.has(cardId)) {
            altCounters[baseCode] = (altCounters[baseCode] || 0) + 1
            cardId = `${formattedBaseId}_ALT_${altCounters[baseCode]}`
        }

        usedIds.add(cardId)

        const rawName = official.card_name || official.name || baseCode
        const cleanName = cleanCardName(rawName)
        const rawEffect = official.card_text || official.effect || null

        const isManga = checkIsManga(item.url, item.name)
        const isSp = checkIsSp(item.url, item.name)

        finalPayload.push({
            id: cardId,
            name: cleanName,
            set_id: setCode,
            rarity: official.rarity || 'SR',
            type: official.card_type || null,
            color: official.card_color || null,
            power: official.card_power && official.card_power !== 'NULL' ? parseInt(official.card_power) : null,
            cost: official.card_cost && official.card_cost !== 'NULL' ? parseInt(official.card_cost) : null,
            life: official.life && official.life !== 'NULL' ? parseInt(official.life) : null,
            counter: official.counter_amount ? parseInt(official.counter_amount) : null,
            attribute: official.attribute || null,
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
    }
}

// Exécution
rebuildSet('PRB02', 'OnePiece/MorpiceRamadan/PRB02')