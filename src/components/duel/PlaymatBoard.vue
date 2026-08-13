<template>
  <main class="board-container">
    <!-- JOUEUR DU HAUT (ADVERSAIRE / P2) -->
    <section class="playmat-half player-top-mat">
      <div class="mat-scale-wrapper">
        <!-- STAGE -->
        <div class="virtual-slot-box slot-standard" :style="PLAYMAT_SLOTS.playerTop.stage">
          <div v-if="duel.opponentStage.length > 0" class="card-display">
            <img :src="getCardImage(duel.opponentStage[0])" :alt="duel.opponentStage[0].name" class="card-auto-fit" />
          </div>
          <span v-else class="slot-label">STAGE</span>
        </div>

        <!-- DON ACTIVE -->
        <div class="virtual-slot-box slot-standard" :style="PLAYMAT_SLOTS.playerTop.donSet">
          <div v-if="duel.opponentActiveDon > 0" class="don-stack">
            <img src="/CardBackDon.png" alt="DON" class="card-auto-fit" />
            <span class="don-count">{{ duel.opponentActiveDon }}</span>
          </div>
        </div>

        <!-- DON RESTED -->
        <div class="virtual-slot-box slot-don-rest" :style="PLAYMAT_SLOTS.playerTop.donRest">
          <div v-if="duel.opponentRestedDon > 0" class="don-stack">
            <img src="/CardBackDon.png" alt="DON REST" class="card-auto-fit opacity-50" />
            <span class="don-count">{{ duel.opponentRestedDon }}</span>
          </div>
        </div>

        <!-- LEADER -->
        <div class="virtual-slot-box slot-standard" :style="PLAYMAT_SLOTS.playerTop.leader">
          <div v-if="duel.opponentLeader.length > 0" class="card-display">
            <img :src="getCardImage(duel.opponentLeader[0])" :alt="duel.opponentLeader[0].name" class="card-auto-fit" />
          </div>
          <span v-else class="slot-label">LEADER</span>
        </div>

        <!-- DECK -->
        <div class="virtual-slot-box slot-standard" :style="PLAYMAT_SLOTS.playerTop.deck">
          <div v-if="duel.opponentDeck.length > 0" class="deck-stack">
            <img 
              v-for="n in Math.min(3, duel.opponentDeck.length)" 
              :key="`deck-${n}`"
              src="/CardBackRegular.png" 
              alt="Deck" 
              class="deck-card-layer"
              :style="{ top: `-${(n-1)*2}px`, left: `-${(n-1)*1.5}px`, zIndex: n }"
            />
            <span class="deck-count-badge">{{ duel.opponentDeck.length }}</span>
          </div>
        </div>

        <!-- TRASH -->
        <div class="virtual-slot-box slot-standard" :style="PLAYMAT_SLOTS.playerTop.trash">
          <span class="slot-label">TRASH</span>
        </div>

        <!-- LIFE -->
        <div class="virtual-slot-box slot-standard" :style="PLAYMAT_SLOTS.playerTop.life">
          <div v-if="duel.opponentLife.length > 0" class="life-display">
            <img :src="getCardImage(duel.opponentLife[0])" :alt="`Life`" class="card-auto-fit" />
          </div>
        </div>

        <!-- CHARACTER AREA (P2) -->
        <div class="virtual-slot-box slot-character-area" :style="PLAYMAT_SLOTS.playerTop.characterArea">
          <div class="character-grid">
            <div 
              v-for="card in duel.opponentDeploy" 
              :key="card.uniqueInstanceId"
              class="character-slot"
              @click="selectCard(card)"
              :class="{ 'is-rested': card.state === 'rested' }"
            >
              <img :src="getCardImage(card)" :alt="card.name" class="card-auto-fit" />
              <div class="card-power">{{ card.getCurrentPower() }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- JOUEUR DU BAS (P1) -->
    <section class="playmat-half player-bottom-mat">
      <div class="mat-scale-wrapper">
        <!-- STAGE -->
        <div class="virtual-slot-box slot-standard" :style="PLAYMAT_SLOTS.playerBottom.stage">
          <div v-if="duel.playerStage.length > 0" class="card-display">
            <img :src="getCardImage(duel.playerStage[0])" :alt="duel.playerStage[0].name" class="card-auto-fit" />
          </div>
          <span v-else class="slot-label">STAGE</span>
        </div>

        <!-- DON ACTIVE -->
        <div class="virtual-slot-box slot-standard" :style="PLAYMAT_SLOTS.playerBottom.donSet">
          <div v-if="duel.playerActiveDon > 0" class="don-stack">
            <img src="/CardBackDon.png" alt="DON" class="card-auto-fit" />
            <span class="don-count">{{ duel.playerActiveDon }}</span>
          </div>
        </div>

        <!-- DON RESTED -->
        <div class="virtual-slot-box slot-don-rest" :style="PLAYMAT_SLOTS.playerBottom.donRest">
          <div v-if="duel.playerRestedDon > 0" class="don-stack">
            <img src="/CardBackDon.png" alt="DON REST" class="card-auto-fit opacity-50" />
            <span class="don-count">{{ duel.playerRestedDon }}</span>
          </div>
        </div>

        <!-- LEADER -->
        <div class="virtual-slot-box slot-standard" :style="PLAYMAT_SLOTS.playerBottom.leader">
          <div v-if="duel.playerLeader.length > 0" class="card-display">
            <img :src="getCardImage(duel.playerLeader[0])" :alt="duel.playerLeader[0].name" class="card-auto-fit" />
          </div>
          <span v-else class="slot-label">LEADER</span>
        </div>

        <!-- DECK -->
        <div 
          class="virtual-slot-box slot-standard clickable-deck" 
          :style="PLAYMAT_SLOTS.playerBottom.deck"
          @click="drawCardFromDeck"
        >
          <div v-if="duel.playerDeck.length > 0" class="deck-stack">
            <img 
              v-for="n in Math.min(3, duel.playerDeck.length)" 
              :key="`deck-${n}`"
              src="/CardBackRegular.png" 
              alt="Deck" 
              class="deck-card-layer"
              :style="{ top: `-${(n-1)*2}px`, left: `-${(n-1)*1.5}px`, zIndex: n }"
            />
            <span class="deck-count-badge">{{ duel.playerDeck.length }}</span>
          </div>
        </div>

        <!-- TRASH -->
        <div class="virtual-slot-box slot-standard" :style="PLAYMAT_SLOTS.playerBottom.trash">
          <span class="slot-label">TRASH</span>
        </div>

        <!-- LIFE -->
        <div class="virtual-slot-box slot-standard" :style="PLAYMAT_SLOTS.playerBottom.life">
          <div v-if="duel.playerLife.length > 0" class="life-display">
            <img :src="getCardImage(duel.playerLife[0])" :alt="`Life`" class="card-auto-fit" />
          </div>
        </div>

        <!-- CHARACTER AREA (P1) -->
        <div class="virtual-slot-box slot-character-area" :style="PLAYMAT_SLOTS.playerBottom.characterArea">
          <div class="character-grid">
            <div 
              v-for="card in duel.playerDeploy" 
              :key="card.uniqueInstanceId"
              class="character-slot"
              @click="selectCard(card)"
              :class="{ 'is-rested': card.state === 'rested' }"
            >
              <img :src="getCardImage(card)" :alt="card.name" class="card-auto-fit" />
              <div class="card-power">{{ card.getCurrentPower() }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- PLAYER HAND -->
    <PlayerHand :hand="duel.playerHand" @play-card="playCard" />

    <!-- MODAL INSPECTION -->
    <DuelCardInspectModal 
      v-if="selectedCard" 
      :card="selectedCard"
      @close="selectedCard = null"
    />
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useDuelStore } from '../../stores/duelStore'
import { PLAYMAT_SLOTS } from '../../config/playmatSlots'
import PlayerHand from './PlayerHand.vue'
import DuelCardInspectModal from './DuelCardInspectModal.vue'

const duel = useDuelStore()
const selectedCard = ref(null)

function getCardImage(card) {
  return card.image_url || card.image || '/CardBackRegular.png'
}

function selectCard(card) {
  selectedCard.value = card
}

function playCard(cardId) {
  if (duel.currentPhase !== 'main') {
    alert("Vous ne pouvez poser des cartes que durant la Main Phase !")
    return
  }

  const success = duel.playCard(cardId)
  if (!success) {
    console.warn("Action impossible : Don insuffisant ou zone pleine.")
  }
}

function drawCardFromDeck() {
  if (!duel.engine) return
  const currentPlayer = duel.engine.gameState.getCurrentPlayer()
  duel.engine.drawFromDeck(currentPlayer)
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
  margin: 0;
  padding: 0;
  overflow: visible; 
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

/* ==========================================================================
   VIRTUAL SLOT BOX (TAILLES FIXES ET STRICTEMENT INVARIABLES)
   ========================================================================== */
.virtual-slot-box {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.15);
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.slot-standard {
  width: 76px !important;
  height: 106px !important;
}

.slot-don-rest {
  width: 96px !important;
  height: 68px !important;
}

/* ==========================================================================
   CHARACTER AREA & GRID SYSTEM
   ========================================================================== */
.slot-character-area {
  width: 73.63% !important;
  max-width: 610px;
  height: 110px !important;
  padding: 2px 10px;
  box-sizing: border-box;
  overflow: hidden;
}

.slot-character-area,
.virtual-slot-box[style*="left: 50%"] {
  transform: translateX(-50%);
}

.character-grid {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  width: 100%;
  height: 100%;
  gap: 8px;
}

.character-slot {
  position: relative;
  width: 76px !important;
  height: 106px !important;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.character-slot:hover {
  transform: translateY(-4px) scale(1.05);
  filter: brightness(1.15);
}

.character-slot.is-rested {
  transform: rotate(90deg);
}

.card-auto-fit {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain;
  border-radius: 5px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6);
}

.slot-label {
  font-size: 0.65rem;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
  text-align: center;
}

.clickable-deck {
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.clickable-deck:hover {
  border-color: #f59e0b;
  transform: scale(1.04);
}

.deck-stack {
  width: 100%;
  height: 100%;
  position: relative;
}

.deck-card-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
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

/* Ré-inverse les cartes/textes de l'adversaire (P2) */
.player-top-mat .virtual-slot-box {
  transform: rotate(180deg);
}

.player-top-mat .slot-character-area,
.player-top-mat .virtual-slot-box[style*="left: 50%"] {
  transform: translateX(-50%) rotate(180deg) !important;
}

.card-power {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: #fbbf24;
  border: 1px solid #fbbf24;
  font-size: 0.68rem;
  font-weight: 900;
  padding: 1px 6px;
  border-radius: 12px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  z-index: 10;
}
</style>