<template>
  <div 
    class="duel-fullscreen"
    :class="{ 
      'left-hidden': leftCollapsed, 
      'right-hidden': rightCollapsed 
    }"
  >
    <!-- Overlay de chargement uniquement -->
    <div v-if="isLoading" class="init-overlay">
      <div class="loader-box">
        <div class="spinner-wrapper">
          <div class="spinner"></div>
          <p class="loading-text">Chargement du deck {{ selectedStarterDeck }} et préparation du plateau...</p>
        </div>
      </div>
    </div>

    <!-- 1. PANNEAU GAUCHE -->
    <DuelLeftSidebar v-model:collapsed="leftCollapsed" :duel="duelStore" />

    <!-- 2. TAPIS CENTRAL -->
    <PlaymatBoard v-if="duelStore.isGameActive" />

    <!-- 3. PANNEAU DROIT -->
    <DuelRightSidebar v-model:collapsed="rightCollapsed" :duel="duelStore" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDuelStore } from '../stores/duelStore'
import { fetchCardsCached } from '../services/playerService'
import DuelLeftSidebar from '../components/duel/DuelLeftSidebar.vue'
import PlaymatBoard from '../components/duel/PlaymatBoard.vue'
import DuelRightSidebar from '../components/duel/DuelRightSidebar.vue'

const route = useRoute()
const router = useRouter()
const duelStore = useDuelStore()

const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const isLoading = ref(false)
const selectedStarterDeck = route.query.starter === 'ST03' ? 'ST03' : 'ST01'
const useAi = route.query.ai === 'true'
const humanPlayerId = route.query.humanPlayerId === '1' ? 1 : 0

const ST01_RECIPE = {
  leaderId: 'ST01-001',
  cards: [
    { id: 'ST01-002', count: 4 },
    { id: 'ST01-003', count: 4 },
    { id: 'ST01-004', count: 4 },
    { id: 'ST01-005', count: 4 },
    { id: 'ST01-006', count: 4 },
    { id: 'ST01-007', count: 4 },
    { id: 'ST01-008', count: 4 },
    { id: 'ST01-009', count: 4 },
    { id: 'ST01-010', count: 4 },
    { id: 'ST01-011', count: 2 },
    { id: 'ST01-012', count: 2 },
    { id: 'ST01-013', count: 2 },
    { id: 'ST01-014', count: 2 },
    { id: 'ST01-015', count: 2 },
    { id: 'ST01-016', count: 2 },
    { id: 'ST01-017', count: 2 }
  ]
}

onMounted(() => {
  // 1. Si on vient du lobby avec autoStart, on lance la préparation du duel
  if ((route.query.autoStart === 'true' || route.query.mode === 'practice') && !duelStore.isGameActive) {
    initializeDuel()
  } 
  // 2. Si aucune partie n'est active (ex: accès direct à /duel ou rafraîchissement), retour direct au lobby
  else if (!duelStore.isGameActive) {
    router.push('/lobby')
  }
})

function findCardInBdd(allCards, targetId) {
  return allCards.find(c => c.id === targetId || c.id.includes(targetId))
}

async function buildFullDeck(allCards) {
  if (selectedStarterDeck === 'ST03') {
    return buildGeneratedStarterDeck(allCards, 'ST03', 'ST03-001')
  }

  const deckList = []

  const leaderData = findCardInBdd(allCards, ST01_RECIPE.leaderId)
  if (leaderData) {
    deckList.push({ ...leaderData, id: ST01_RECIPE.leaderId })
  } else {
    deckList.push({
      id: ST01_RECIPE.leaderId,
      name: 'Monkey.D.Luffy',
      type: 'leader',
      power: 5000,
      image_url: ''
    })
  }

  ST01_RECIPE.cards.forEach(item => {
    const cardData = findCardInBdd(allCards, item.id)
    if (cardData) {
      for (let i = 0; i < item.count; i++) {
        deckList.push({ ...cardData, id: item.id })
      }
    } else {
      console.warn(`Carte manquante dans BDD : ${item.id}`)
      for (let i = 0; i < item.count; i++) {
        deckList.push({
          id: item.id,
          name: `Carte ${item.id}`,
          cost: 2,
          power: 3000,
          type: 'character',
          image_url: ''
        })
      }
    }
  })

  return deckList
}

function buildGeneratedStarterDeck(allCards, setCode, leaderId) {
  const setCards = allCards.filter(card => {
    return card.id?.startsWith(`${setCode}-`) && !/_ALT_\d+$/i.test(card.id)
  })
  const leaderData = findCardInBdd(setCards, leaderId)
  const deckList = [{
    ...(leaderData || { id: leaderId, name: leaderId, type: 'leader', power: 5000 }),
    id: leaderId
  }]
  const cards = setCards.filter(card => card.id !== leaderId)

  for (let index = 0; deckList.length < 50 && cards.length > 0; index++) {
    const cardData = cards[index % cards.length]
    deckList.push({ ...cardData, id: cardData.id })
  }

  return deckList
}

async function initializeDuel() {
  if (isLoading.value) return
  isLoading.value = true

  try {
    const allCards = await fetchCardsCached(true)

    const deck1 = await buildFullDeck(allCards)
    const deck2 = await buildFullDeck(allCards)

    const success = duelStore.initDuel(
      deck1,
      deck2,
      selectedStarterDeck === 'ST03' ? 'ST03-001' : ST01_RECIPE.leaderId,
      selectedStarterDeck === 'ST03' ? 'ST03-001' : ST01_RECIPE.leaderId
    )

    if (success) {
      duelStore.configureBot({ enabled: useAi, humanPlayerId })
      duelStore.startGame()
    } else {
      console.error("❌ Échec de l'initialisation dans le Store Pinia.")
      router.push('/lobby')
    }
  } catch (error) {
    console.error("❌ Erreur critique lors de initializeDuel :", error)
    router.push('/lobby')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.duel-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: #080b11;
  display: grid;
  grid-template-columns: 320px 1fr 280px;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  user-select: none;
  font-family: system-ui, -apple-system, sans-serif;
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.duel-fullscreen.left-hidden { grid-template-columns: 0px 1fr 280px; }
.duel-fullscreen.right-hidden { grid-template-columns: 320px 1fr 0px; }
.duel-fullscreen.left-hidden.right-hidden { grid-template-columns: 0px 1fr 0px; }

/* OVERLAY DE CHARGEMENT */
.init-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.95);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loader-box {
  text-align: center;
}

.spinner-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(245, 158, 11, 0.2);
  border-top-color: #f59e0b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: #fbbf24;
  font-weight: 700;
  font-size: 1.1rem;
  margin: 0;
}
</style>