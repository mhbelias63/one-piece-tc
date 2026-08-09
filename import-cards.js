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

// Fonction de nettoyage des noms avec Blacklist
function cleanCardName(rawName) {
  if (!rawName) return ''

  let clean = rawName

  // 1. Suppression des codes de set (ex: OP01-016, OP-01-016, ST01-001, etc.) avec ou sans parenthèses
  clean = clean.replace(/\(?\b[A-Z]{2,3}-?\d{2,3}-\d{3}\b\)?/gi, '')

  // 2. Suppression de 3 chiffres entre parenthèses : "(015)" -> ""
  clean = clean.replace(/\(\d{3}\)/g, '')

  // 3. Blacklist de mots-clés (case insensitive), avec ou sans parenthèses
  const blacklist = [
    'parallel',
    'manga',
    'reprint',
    'full art',
    'full-art',
    'fullart',
    'box topper',
    'boxtopper',
    'sp',
    'alternate art',
    'dash pack',
    'spr'
  ]

  blacklist.forEach(word => {
    // Regex pour capturer le mot, qu'il soit entouré de parenthèses ou isolé
    const regexWithParens = new RegExp(`\\(\\s*${word}\\s*\\)`, 'gi')
    const regexStandalone = new RegExp(`\\b${word}\\b`, 'gi')
    
    clean = clean.replace(regexWithParens, '')
    clean = clean.replace(regexStandalone, '')
  })

  // 4. Nettoyage de la ponctuation résiduelle (parenthèses vides, tirets isolés)
  clean = clean.replace(/\(\s*\)/g, '')

  // 5. Normalisation des points collés (ex: Monkey.D.Dragon -> Monkey D. Dragon)
  clean = clean.replace(/([a-zA-Z])\.(?=[a-zA-Z])/g, '$1. ')

  // 6. Nettoyage des espaces multiples et des extrémités
  clean = clean.replace(/\s+/g, ' ').trim()

  return clean
}

// Fonction de nettoyage des disclaimers dans la description des effets
function cleanCardEffect(rawEffect) {
  if (!rawEffect) return null

  // Tronque tout le texte à partir du mot "Disclaimer" (sensible ou non aux deux-points et majuscules)
  const clean = rawEffect.replace(/Disclaimer:?.*/is, '').trim()

  return clean || null
}

// 1. Récupération des données textuelles officielles sur optcgapi.com
async function fetchOfficialCardData(setCode) {
  console.log(`🌐 [1/3] Interrogation de optcgapi.com...`)

  try {
    const res = await fetch('https://optcgapi.com/api/allSetCards/')
    if (!res.ok) throw new Error(`Status HTTP: ${res.status}`)

    const allCards = await res.json()
    console.log(`📦 ${allCards.length} cartes au total chargées depuis optcgapi.com.`)

    const cardsMap = new Map()

    allCards.forEach(card => {
      let rawCode = card.card_set_id || card.card_number || card.id || ''
      const cleanCode = rawCode.replace(/^OP-?0*(\d+)/i, (m, p1) => `OP${p1.padStart(2, '0')}`)

      if (cleanCode.startsWith(setCode)) {
        cardsMap.set(cleanCode, card)
      }
    })

    console.log(`✅ ${cardsMap.size} cartes trouvées pour ${setCode}.`)
    return cardsMap

  } catch (err) {
    console.error(`❌ Erreur optcgapi.com :`, err.message)
    return null
  }
}

// 2. Récupération des images HD depuis ProxyCardsTool
async function fetchProxyCardsImages(folderPath) {
  console.log(`🌐 [2/3] Récupération des visuels HD sur ProxyCardsTool...`)
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: formData
    })

    const result = await res.json()
    const items = result.data?.items || result.data?.cards || []
    console.log(`🖼️ ${items.length} visuels HD récupérés.`)
    return items
  } catch (err) {
    console.error(`❌ Erreur ProxyCardsTool :`, err.message)
    return []
  }
}

// 3. Fusion et injection dans Supabase
// 3. Fusion et injection dans Supabase
async function rebuildSet(setCode, folderPath) {
    console.log(`🚀 DEMARRAGE DE L'IMPORTATION COMPLETE POUR ${setCode}`)

    const officialDataMap = await fetchOfficialCardData(setCode)
    if (!officialDataMap || officialDataMap.size === 0) return

    const proxyItems = await fetchProxyCardsImages(folderPath)
    if (proxyItems.length === 0) return

    const altCounters = {}
    const finalPayload = []
    const usedIds = new Set() // Pour garantir l'unicité stricte des ID

    for (const item of proxyItems) {
        const baseCode = item.codes?.[0]
        if (!baseCode) continue

        const official = officialDataMap.get(baseCode)
        if (!official) continue

        const isAlt = item.url.includes('/ALTS/') || item.name.includes('(') || item.name.includes('_')

        let cardId = baseCode

        // Si la carte est une alternative OU si la base existe déjà
        if (isAlt || usedIds.has(baseCode)) {
            altCounters[baseCode] = (altCounters[baseCode] || 0) + 1
            cardId = `${baseCode}_ALT_${altCounters[baseCode]}`
        }

        // Sécurité supplémentaire : s'assure que l'ID n'est jamais en doublon
        while (usedIds.has(cardId)) {
            altCounters[baseCode] = (altCounters[baseCode] || 0) + 1
            cardId = `${baseCode}_ALT_${altCounters[baseCode]}`
        }

        usedIds.add(cardId)

        const rawName = official.card_name || official.name
        const cleanName = cleanCardName(rawName)
        const rawEffect = official.card_text || official.effect || null

        finalPayload.push({
            id: cardId,
            name: cleanName,
            set_id: setCode,
            rarity: official.rarity || null,
            type: official.card_type || null,
            color: official.card_color || null,
            power: official.card_power && official.card_power !== 'NULL' ? parseInt(official.card_power) : null,
            cost: official.card_cost && official.card_cost !== 'NULL' ? parseInt(official.card_cost) : null,
            life: official.life && official.life !== 'NULL' ? parseInt(official.life) : null,
            counter: official.counter_amount ? parseInt(official.counter_amount) : null,
            attribute: official.attribute || null,
            effect: cleanCardEffect(rawEffect),
            image_url: item.url
        })
    }

    console.log(`🧹 Purge des anciennes données du set ${setCode} dans Supabase...`)
    await supabase.from('cards').delete().eq('set_id', setCode)

    console.log(`💾 [3/3] Insertion de ${finalPayload.length} cartes nettoyées dans Supabase...`)
    const { error } = await supabase.from('cards').insert(finalPayload)

    if (error) {
        console.error(`❌ Erreur Supabase :`, error.message)
    } else {
        console.log(`🎉 SUCCÈS ! ${finalPayload.length} cartes de ${setCode} réimportées sans aucun doublon !`)
    }
}

// Lancement pour OP05
rebuildSet('OP09', 'OnePiece/MorpiceRamadan/OP9')