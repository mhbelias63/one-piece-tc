<template>
  <main class="board-container">
    
    <!-- JOUEUR DU HAUT (ADVERSAIRE / P2) -->
    <section class="playmat-half player-top-mat">
      <div class="mat-scale-wrapper">
        
        <!-- 1. STAGE -->
        <div class="virtual-slot-box slot-placeholder" :style="PLAYMAT_SLOTS.playerTop.stage">
          <span class="slot-label">STAGE</span>
        </div>

        <!-- 2. DON!! ACTIVE -->
        <div class="virtual-slot-box" :style="PLAYMAT_SLOTS.playerTop.donSet">
          <img src="/CardBackDon.png" alt="DON P2" class="card-auto-fit" />
        </div>

        <!-- 3. DON!! REST -->
        <div class="virtual-slot-box slot-placeholder" :style="PLAYMAT_SLOTS.playerTop.donRest">
          <span class="slot-label">DON!! REST</span>
        </div>

        <!-- 4. LEADER -->
        <div class="virtual-slot-box slot-placeholder" :style="PLAYMAT_SLOTS.playerTop.leader">
          <span class="slot-label">LEADER</span>
        </div>

        <!-- 5. DECK -->
        <div class="virtual-slot-box" :style="PLAYMAT_SLOTS.playerTop.deck">
          <img src="/img_deck.png" alt="Deck P2" class="card-auto-fit" />
        </div>

        <!-- 6. TRASH -->
        <div class="virtual-slot-box slot-placeholder" :style="PLAYMAT_SLOTS.playerTop.trash">
          <span class="slot-label">TRASH</span>
        </div>

        <!-- 7. LIFE AREA ADVERSAIRE -->
        <div class="virtual-slot-box life-container" :style="PLAYMAT_SLOTS.playerTop.life">
          <div class="life-card-single">
            <img src="/CardBackRegular.png" alt="Life Card P2" class="card-auto-fit" />
          </div>
        </div>

        <!-- 8. CHARACTER AREA -->
        <div class="virtual-slot-box slot-placeholder" :style="PLAYMAT_SLOTS.playerTop.characterArea">
          <span class="slot-label">CHARACTER AREA</span>
        </div>

      </div>
    </section>

    <!-- JOUEUR DU BAS (JOUEUR PRINCIPAL / P1) -->
    <section class="playmat-half player-bottom-mat">
      <div class="mat-scale-wrapper">
        
        <!-- 1. STAGE -->
        <div class="virtual-slot-box slot-placeholder" :style="PLAYMAT_SLOTS.playerBottom.stage">
          <span class="slot-label">STAGE</span>
        </div>

        <!-- 2. DON!! ACTIVE -->
        <div class="virtual-slot-box" :style="PLAYMAT_SLOTS.playerBottom.donSet">
          <img src="/CardBackDon.png" alt="DON P1" class="card-auto-fit" />
        </div>

        <!-- 3. DON!! REST -->
        <div class="virtual-slot-box slot-placeholder" :style="PLAYMAT_SLOTS.playerBottom.donRest">
          <span class="slot-label">DON!! REST</span>
        </div>

        <!-- 4. LEADER -->
        <div class="virtual-slot-box slot-placeholder" :style="PLAYMAT_SLOTS.playerBottom.leader">
          <span class="slot-label">LEADER</span>
        </div>

        <!-- 5. DECK JOUEUR (EMPILEMENT VISUEL 3D) -->
        <div 
          class="virtual-slot-box deck-container" 
          :style="PLAYMAT_SLOTS.playerBottom.deck"
          @click="drawCard"
          :title="`Piocher (Reste : ${deckCount})`"
        >
          <div v-if="deckCount > 0" class="deck-stack">
            <img 
              v-for="n in visibleDeckStack" 
              :key="`deck-layer-${n}`"
              src="/CardBackRegular.png" 
              alt="Deck Card" 
              class="deck-card-layer"
              :style="{
                top: `-${(n - 1) * 2}px`,
                left: `-${(n - 1) * 1.5}px`,
                zIndex: n
              }"
            />
            <span class="deck-count-badge">{{ deckCount }}</span>
          </div>
          <span v-else class="slot-label">DECK VIDE</span>
        </div>

        <!-- 6. TRASH -->
        <div class="virtual-slot-box slot-placeholder" :style="PLAYMAT_SLOTS.playerBottom.trash">
          <span class="slot-label">TRASH</span>
        </div>

        <!-- 7. LIFE AREA JOUEUR -->
        <div class="virtual-slot-box life-container" :style="PLAYMAT_SLOTS.playerBottom.life">
          <div class="life-card-single">
            <img src="/CardBackRegular.png" alt="Life Card P1" class="card-auto-fit" />
          </div>
        </div>

        <!-- 8. CHARACTER AREA -->
        <div class="virtual-slot-box slot-placeholder" :style="PLAYMAT_SLOTS.playerBottom.characterArea">
          <span class="slot-label">CHARACTER AREA</span>
        </div>

        <!-- MAIN DU JOUEUR (RELIÉE ET UNIQUE) -->
        <PlayerHand :hand="hand" @inspect-card="openCardModal" />

      </div>
    </section>

    <!-- MODAL DÉTAILS CARTE DE LA MAIN -->
   <DuelCardInspectModal 
  v-if="selectedCard" 
  :card="selectedCard" 
  @close="selectedCard = null" 
/>

  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PLAYMAT_SLOTS } from '../../config/playmatSlots'
import PlayerHand from './PlayerHand.vue'
import DuelCardInspectModal from './DuelCardInspectModal.vue'

const deckCount = ref(50)
const hand = ref([])
const selectedCard = ref(null)

const visibleDeckStack = computed(() => {
  if (deckCount.value <= 0) return 0
  return Math.min(5, Math.ceil(deckCount.value / 10))
})

function drawCard() {
  if (deckCount.value <= 0) return

  deckCount.value--
  hand.value.push({
    id: Date.now() + Math.random(),
    name: 'Sanji',
    type: 'Character',
    rarity: 'SR',
    cost: 2,
    power: 3000,
    color: 'Red',
    attribute: 'Strike',
    image: '/testcard.png',
    image_url: '/testcard.png',
    effect: '[On Play] Look at 5 cards from the top of your deck; reveal up to 1 Red character and add it to your hand.'
  })
}

function openCardModal(card) {
  selectedCard.value = card
}
</script>

<style scoped>
.board-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
  background: #000;
  overflow: hidden;
}

.playmat-half {
  position: relative;
  width: 100%;
  height: 50vh;
  max-width: 100%;
  margin: 0;
  padding: 0;
}

.player-top-mat {
  background: url('/playmat/playmat_2025_regional_2ndMarker.png') center/100% 100% no-repeat;
  transform: rotate(180deg);
}

.player-bottom-mat {
  background: url('/playmat/playmat_2025_regional_2ndMarker.png') center/100% 100% no-repeat;
}

.mat-scale-wrapper {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.virtual-slot-box {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px dashed rgba(245, 158, 11, 0.5);
  transition: all 0.2s ease;
}

.card-auto-fit {
  width: 100%;
  height: 100%;
  object-fit: fill;
  border-radius: 5px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
}

.slot-placeholder {
  pointer-events: none;
}

.slot-label {
  font-size: 0.6rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.04em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  text-align: center;
}

/* ==========================================================================
   LIFE AREA : CARTE UNIQUE VERTICALE
   ========================================================================== */
.life-container {
  overflow: visible;
  background: none;
  border: none;
}

.life-card-single {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.life-card-single:hover {
  transform: scale(1.05);
}

/* ==========================================================================
   DECK CONTAINER & STACK
   ========================================================================== */
.deck-container {
  cursor: pointer;
  background: none !important;
  border: none !important;
}

.deck-stack {
  position: relative;
  width: 100%;
  height: 100%;
}

.deck-card-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: fill;
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  transition: all 0.15s ease;
}

.deck-container:hover .deck-card-layer {
  filter: brightness(1.15);
}

.deck-count-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.85);
  color: #f59e0b;
  border: 1px solid #f59e0b;
  font-size: 0.65rem;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 4px;
  z-index: 20;
}
</style>