<template>
  <div class="booster-page">
    <div class="booster-shell">
      <!-- 1. SÉLECTION -->
      <BoosterSelectStage
        v-if="step === 'select'"
        v-model:selectedView="selectedView"
        :currentBoosterMeta="currentBoosterMeta"
        :currentPackImage="currentPackImage"
        :opening="opening"
        :isCurrentSetEmpty="isCurrentSetEmpty"
        @prev-set="prevSet"
        @next-set="nextSet"
        @open-pack="openPack"
        @open-set-modal="showSetModal = true"
      />

      <!-- 2. RÉVÉLATION -->
      <BoosterRevealStage
        v-else-if="step === 'reveal'"
        :drawnCards="drawnCards"
        :currentIndex="currentIndex"
        :isSwiping="isSwiping"
        @next-card="nextCard"
        @finish="finishOpening"
      />

      <!-- 3. RÉCAPITULATIF -->
      <BoosterSummaryStage
        v-else-if="step === 'summary'"
        :drawnCards="drawnCards"
        @reset="resetToSelect"
      />
    </div>

    <!-- MODALE SÉLECTION SETS -->
    <SetSelectionModal
      :show="showSetModal"
      :boosterList="boosterList"
      :selectedSetCode="selectedSetCode"
      @close="showSetModal = false"
      @select-set="selectSetFromModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabase'
import { fetchCardsCached } from '../services/playerService'

import BoosterSelectStage from '../components/booster/BoosterSelectStage.vue'
import BoosterRevealStage from '../components/booster/BoosterRevealStage.vue'
import BoosterSummaryStage from '../components/booster/BoosterSummaryStage.vue'
import SetSelectionModal from '../components/booster/SetSelectionModal.vue'

// 1. On accepte le solde de gemmes transmis par App.vue
const props = defineProps({
  userGems: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['spend-gems'])

const step = ref('select')
const selectedView = ref('booster')
const drawnCards = ref([])
const currentIndex = ref(0)
const isSwiping = ref(false)
const opening = ref(false)
const showSetModal = ref(false)
const allDatabaseCards = ref([])

const selectedSetCode = ref('OP-01')

const boosterModules = import.meta.glob('../assets/images/booster/*.{webp,png,jpg,jpeg}', { eager: true, import: 'default' })

const boosterList = computed(() => {
  const list = []
  for (const path in boosterModules) {
    const filename = path.split('/').pop().replace(/\.(webp|png|jpg|jpeg)$/i, '')
    const dashIndex = filename.indexOf('-')
    if (dashIndex === -1) continue

    const title = filename.substring(0, dashIndex).trim()
    const matchBracket = filename.match(/\[(.*?)\]/)
    const setCode = matchBracket ? matchBracket[1].trim() : ''

    if (setCode) {
      const numberMatch = setCode.match(/OP-?(\d+)/i)
      const setNumber = numberMatch ? parseInt(numberMatch[1], 10) : 999
      list.push({ title, setCode, setNumber, imageUrl: boosterModules[path] })
    }
  }
  return list.sort((a, b) => a.setNumber - b.setNumber)
})

const currentBoosterMeta = computed(() => {
  const found = boosterList.value.find(b => b.setCode === selectedSetCode.value || b.setCode.replace('-', '') === selectedSetCode.value.replace('-', ''))
  return found || boosterList.value[0] || { title: 'Booster Premium', setCode: selectedSetCode.value, imageUrl: '' }
})

const currentPackImage = computed(() => currentBoosterMeta.value.imageUrl || '')

const isCurrentSetEmpty = computed(() => {
  if (!allDatabaseCards.value.length) return false
  const normalizedSelectedSet = selectedSetCode.value.replace('-', '').toLowerCase()
  return allDatabaseCards.value.filter(card => card && card.set_id && card.image_url && String(card.set_id).replace('-', '').toLowerCase() === normalizedSelectedSet).length === 0
})

// OPTIMISATION 1 : Utilisation du cache global au lieu de re-télécharger les 207 kB
async function loadCards() {
  const data = await fetchCardsCached()
  if (data) {
    allDatabaseCards.value = data.filter(c => c && c.image_url && String(c.image_url).trim() !== '')
  }
}

onMounted(() => loadCards())

function prevSet() {
  if (!boosterList.value.length) return
  const idx = boosterList.value.findIndex(b => b.setCode === currentBoosterMeta.value.setCode)
  selectedSetCode.value = boosterList.value[(idx - 1 + boosterList.value.length) % boosterList.value.length].setCode
}

function nextSet() {
  if (!boosterList.value.length) return
  const idx = boosterList.value.findIndex(b => b.setCode === currentBoosterMeta.value.setCode)
  selectedSetCode.value = boosterList.value[(idx + 1) % boosterList.value.length].setCode
}

function selectSetFromModal(code) {
  selectedSetCode.value = code
  showSetModal.value = false
}

function getRarity(card) {
  return card?.rarity ? String(card.rarity).trim().toUpperCase() : ''
}

function isAlternative(card) {
  if (!card) return false
  if (card.is_alt || card.is_alternative) return true
  const str = `${card.id || ''} ${card.name || ''}`.toUpperCase()
  return str.includes('_ALT_') || str.includes('-ALT') || str.includes('PARALLEL') || str.includes('ALTERNATIVE')
}

async function openPack() {
  if (opening.value || isCurrentSetEmpty.value) return

  const price = selectedView.value === 'booster' ? 100 : 2400

  // 🛑 OPTIMISATION 2 : VÉRIFICATION LOCALE DU SOLDE (0 requête si pas assez de gemmes)
  if (props.userGems < price) {
    alert("Tu n'as pas assez de gemmes pour cet achat !")
    return
  }

  opening.value = true

  // OPTIMISATION 3 : getSession() au lieu de getUser() pour économiser un appel réseau
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) {
    alert("Tu dois être connecté pour ouvrir des boosters !")
    opening.value = false
    return
  }

  if (!allDatabaseCards.value.length) await loadCards()

  const normalizedSelectedSet = selectedSetCode.value.replace('-', '').toLowerCase()
  const available = allDatabaseCards.value.filter(card => card && card.set_id && card.image_url && String(card.set_id).replace('-', '').toLowerCase() === normalizedSelectedSet)

  if (available.length === 0) {
    alert("Ce booster ne contient pas encore de cartes en base de données.")
    opening.value = false
    return
  }

  // Sécurité côté serveur
  const { data: success, error: gemError } = await supabase.rpc('deduct_gems', { user_id: user.id, amount: price })

  if (gemError || !success) {
    alert("Tu n'as pas assez de gemmes pour cet achat !")
    opening.value = false
    return
  }

  const mangaPool = available.filter(c => c.is_manga === true)
  const spPool = available.filter(c => c.is_sp === true && !c.is_manga)
  const leaderPoolStandard = available.filter(c => getRarity(c) === 'L' && !isAlternative(c) && !c.is_manga && !c.is_sp)
  const leaderPoolAlt = available.filter(c => getRarity(c) === 'L' && isAlternative(c) && !c.is_manga && !c.is_sp)
  const altPool = available.filter(c => isAlternative(c) && !c.is_manga && !c.is_sp && getRarity(c) !== 'L')
  const standardPool = available.filter(c => !isAlternative(c) && !c.is_manga && !c.is_sp && getRarity(c) !== 'L')

  const getRandomCard = (list) => (!list || list.length === 0) ? available[Math.floor(Math.random() * available.length)] : list[Math.floor(Math.random() * list.length)]

  const drawSpecialSlot = () => {
    const rand = Math.random() * 100
    if (rand < 0.1 && mangaPool.length > 0) return getRandomCard(mangaPool)
    if (rand < 1.6 && spPool.length > 0) return getRandomCard(spPool)
    if (rand < 5.1) {
      const secAlts = altPool.filter(c => getRarity(c) === 'SEC')
      if (secAlts.length > 0) return getRandomCard(secAlts)
    }
    if (rand < 20.1) {
      const srAlts = altPool.filter(c => getRarity(c) === 'SR')
      if (srAlts.length > 0) return getRandomCard(srAlts)
    }
    const allAlts = [...altPool, ...leaderPoolAlt]
    return getRandomCard(allAlts.length > 0 ? allAlts : standardPool)
  }

  const pack = []
  const dbInserts = []
  const numPacks = selectedView.value === 'booster' ? 1 : 24

  for (let p = 0; p < numPacks; p++) {
    const isGodPack = Math.random() * 100 < 0.1
    const hasLeader = Math.random() < 0.5
    const leaderSlotIndex = 5

    for (let i = 0; i < 12; i++) {
      let drawnCard;
      if (isGodPack) {
        if (i === 11) drawnCard = mangaPool.length > 0 ? getRandomCard(mangaPool) : getRandomCard(altPool)
        else if (i === 10) drawnCard = spPool.length > 0 ? getRandomCard(spPool) : getRandomCard(altPool)
        else if (i === leaderSlotIndex && hasLeader && leaderPoolAlt.length > 0) drawnCard = getRandomCard(leaderPoolAlt)
        else drawnCard = getRandomCard(altPool.length > 0 ? altPool : available)
      } else {
        if (i === 11) drawnCard = drawSpecialSlot()
        else if (i === 10) {
          const rarePool = standardPool.filter(c => ['R', 'SR', 'SEC'].includes(getRarity(c)))
          drawnCard = getRandomCard(rarePool.length > 0 ? rarePool : standardPool)
        } else if (i === leaderSlotIndex && hasLeader && leaderPoolStandard.length > 0) drawnCard = getRandomCard(leaderPoolStandard)
        else {
          const commonPool = standardPool.filter(c => ['C', 'UC'].includes(getRarity(c)))
          drawnCard = getRandomCard(commonPool.length > 0 ? commonPool : standardPool)
        }
      }

      const drawIndex = pack.length
      pack.push({ ...drawnCard, isGodPack, drawId: `card-${drawIndex}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` })
      dbInserts.push({ user_id: user.id, card_id: drawnCard.id })
    }
  }

  const { error: insertError } = await supabase.from('user_cards').insert(dbInserts)
  if (insertError) console.error("Erreur d'enregistrement Supabase :", insertError)

  drawnCards.value = pack
  currentIndex.value = 0
  step.value = 'reveal'
  opening.value = false

  emit('spend-gems', price)
}

function nextCard() {
  if (isSwiping.value) return
  isSwiping.value = true
  setTimeout(() => {
    currentIndex.value++
    isSwiping.value = false
    if (currentIndex.value >= drawnCards.value.length) step.value = 'summary'
  }, 180)
}

function finishOpening() {
  step.value = 'summary'
}

function resetToSelect() {
  step.value = 'select'
  currentIndex.value = 0
}
</script>

<style scoped>
.booster-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.booster-shell {
  position: relative;
  width: 100%;
  height: calc(100vh - 100px);
  max-height: calc(100vh - 100px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.18), transparent 34%),
    linear-gradient(135deg, #060816 0%, #0c1429 100%);
  overflow: hidden;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
}
</style>