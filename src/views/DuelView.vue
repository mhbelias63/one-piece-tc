<template>
  <div 
    class="duel-fullscreen"
    :class="{ 
      'left-hidden': leftCollapsed, 
      'right-hidden': rightCollapsed 
    }"
  >
    <!-- Initialiser le duel si pas déjà fait -->
    <div v-if="!duelStore.isGameActive" class="init-overlay">
      <button @click="initializeDuel" class="init-btn">
        {{ isLoading ? 'Chargement du Deck ST01...' : 'Lancer le Duel (ST01)' }}
      </button>
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
import { ref } from 'vue'
import { useDuelStore } from '../stores/duelStore'
import { fetchCardsCached } from '../services/playerService'
import DuelLeftSidebar from '../components/duel/DuelLeftSidebar.vue'
import PlaymatBoard from '../components/duel/PlaymatBoard.vue'
import DuelRightSidebar from '../components/duel/DuelRightSidebar.vue'

const duelStore = useDuelStore()
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const isLoading = ref(false)

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

function findCardInBdd(allCards, targetId) {
  return allCards.find(c => c.id === targetId || c.id.includes(targetId))
}

async function buildFullDeck(allCards) {
  const deckList = []

  // 1. Récupération et ajout du LEADER obligatoirement dans la liste du deck
  const leaderData = findCardInBdd(allCards, ST01_RECIPE.leaderId)
  if (leaderData) {
    deckList.push({ ...leaderData, id: ST01_RECIPE.leaderId }) // Force l'ID propre
  } else {
    // Fallback de sécurité si le leader n'est pas trouvé
    deckList.push({
      id: ST01_RECIPE.leaderId,
      name: 'Monkey.D.Luffy',
      type: 'leader',
      power: 5000,
      image_url: ''
    })
  }

  // 2. Ajout des 50 cartes du deck
  ST01_RECIPE.cards.forEach(item => {
    const cardData = findCardInBdd(allCards, item.id)
    if (cardData) {
      for (let i = 0; i < item.count; i++) {
        deckList.push({ ...cardData, id: item.id }) // Force l'ID exact
      }
    } else {
      console.warn(`Carte manquante dans BDD : ${item.id}`)
      // Fallback
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

async function initializeDuel() {
  if (isLoading.value) return
  isLoading.value = true

  try {
    console.log("🚀 Démarrage du duel...")
    const allCards = await fetchCardsCached(true) // Force la maj Supabase

    const deck1 = await buildFullDeck(allCards)
    const deck2 = await buildFullDeck(allCards)

    console.log(`📦 Deck 1 préparé : ${deck1.length} cartes (avec Leader)`)

    // Initialisation
    const success = duelStore.initDuel(
      deck1,
      deck2,
      ST01_RECIPE.leaderId,
      ST01_RECIPE.leaderId
    )

    if (success) {
      duelStore.startGame()
      console.log("🎮 Duel démarré avec succès !")
    } else {
      console.error("❌ Échec de l'initialisation dans le Store Pinia.")
    }
  } catch (error) {
    console.error("❌ Erreur critique lors de initializeDuel :", error)
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

.init-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.init-btn {
  padding: 15px 40px;
  background: #f59e0b;
  color: #000;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.init-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 30px #f59e0b;
}
</style>