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
            <span class="count-badge-center">{{ duel.opponentActiveDon }}</span>
          </div>
          <span v-else class="slot-label">DON</span>
        </div>

        <!-- DON RESTED -->
        <div class="virtual-slot-box slot-don-rest" :style="PLAYMAT_SLOTS.playerTop.donRest">
          <div v-if="duel.opponentRestedDon > 0" class="don-stack is-rested-don">
            <img src="/CardBackDon.png" alt="DON REST" class="card-auto-fit opacity-70" />
            <span class="count-badge-center">{{ duel.opponentRestedDon }}</span>
          </div>
        </div>

        <!-- LEADER ADVERSE (P2) -->
        <div 
          class="virtual-slot-box slot-standard clickable-target" 
          :style="PLAYMAT_SLOTS.playerTop.leader"
          @click="duel.opponentLeader[0] && onCardClick(duel.opponentLeader[0], true)"
          :class="{ 'is-rested': duel.opponentLeader[0]?.state === 'rested' }"
        >
          <div v-if="duel.opponentLeader.length > 0" class="card-display">
            <img :src="getCardImage(duel.opponentLeader[0])" :alt="duel.opponentLeader[0].name" class="card-auto-fit" />
            <div v-if="duel.opponentLeader[0]?.attachedDon?.length > 0" class="attached-don-badge">
              +{{ duel.opponentLeader[0].attachedDon.length }} DON!!
            </div>
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
            <img src="/CardBackRegular.png" alt="Life" class="card-auto-fit" />
            <span class="count-badge-center life-badge">{{ duel.opponentLife.length }}</span>
          </div>
          <span v-else class="slot-label">LIFE</span>
        </div>

        <!-- CHARACTER AREA (P2) -->
        <div class="virtual-slot-box slot-character-area" :style="PLAYMAT_SLOTS.playerTop.characterArea">
          <div class="character-grid">
            <div 
              v-for="card in duel.opponentDeploy" 
              :key="card.uniqueInstanceId"
              class="character-slot"
              @click="onCardClick(card, true)"
              :class="{ 'is-rested': card.state === 'rested' }"
            >
              <img :src="getCardImage(card)" :alt="card.name" class="card-auto-fit" />
              <div v-if="card.attachedDon?.length > 0" class="attached-don-badge">
                +{{ card.attachedDon.length }} DON!!
              </div>
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
        <div 
          class="virtual-slot-box slot-standard clickable-don" 
          :style="PLAYMAT_SLOTS.playerBottom.donSet"
          @click="selectDon"
          :class="{ 'is-don-selecting': isDonSelected }"
        >
          <div v-if="duel.playerActiveDon > 0" class="don-stack">
            <img src="/CardBackDon.png" alt="DON" class="card-auto-fit" />
            <span class="count-badge-center">{{ duel.playerActiveDon }}</span>
          </div>
          <span v-else class="slot-label">DON</span>
        </div>

        <!-- DON RESTED -->
        <div class="virtual-slot-box slot-don-rest" :style="PLAYMAT_SLOTS.playerBottom.donRest">
          <div v-if="duel.playerRestedDon > 0" class="don-stack is-rested-don">
            <img src="/CardBackDon.png" alt="DON REST" class="card-auto-fit opacity-70" />
            <span class="count-badge-center">{{ duel.playerRestedDon }}</span>
          </div>
        </div>

        <!-- NOTRE LEADER (P1) -->
        <div 
          class="virtual-slot-box slot-standard clickable-attacker" 
          :style="PLAYMAT_SLOTS.playerBottom.leader"
          @click="duel.playerLeader[0] && onCardClick(duel.playerLeader[0], false)"
          :class="{ 
            'is-attacking': selectedAttacker?.uniqueInstanceId === duel.playerLeader[0]?.uniqueInstanceId,
            'is-rested': duel.playerLeader[0]?.state === 'rested'
          }"
        >
          <div v-if="duel.playerLeader.length > 0" class="card-display">
            <img :src="getCardImage(duel.playerLeader[0])" :alt="duel.playerLeader[0].name" class="card-auto-fit" />
            <div v-if="duel.playerLeader[0]?.attachedDon?.length > 0" class="attached-don-badge">
              +{{ duel.playerLeader[0].attachedDon.length }} DON!!
            </div>
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
            <img src="/CardBackRegular.png" alt="Life" class="card-auto-fit" />
            <span class="count-badge-center life-badge">{{ duel.playerLife.length }}</span>
          </div>
          <span v-else class="slot-label">LIFE</span>
        </div>

        <!-- CHARACTER AREA (P1) -->
        <div class="virtual-slot-box slot-character-area" :style="PLAYMAT_SLOTS.playerBottom.characterArea">
          <div class="character-grid">
            <div 
              v-for="card in duel.playerDeploy" 
              :key="card.uniqueInstanceId"
              class="character-slot"
              @click="onCardClick(card, false)"
              :class="{ 
                'is-rested': card.state === 'rested',
                'is-attacking': selectedAttacker?.uniqueInstanceId === card.uniqueInstanceId
              }"
            >
              <img :src="getCardImage(card)" :alt="card.name" class="card-auto-fit" />
              <div v-if="card.attachedDon?.length > 0" class="attached-don-badge">
                +{{ card.attachedDon.length }} DON!!
              </div>
              <div class="card-power">{{ card.getCurrentPower() }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- PLAYER HAND -->
    <PlayerHand :hand="duel.playerHand" @play-card="playCard" />

    <!-- MODAL BLOQUEUR (ÉTAPE DE BLOCAGE - 7-1-2) -->
    <div v-if="isBlockingPhase" class="blocker-modal-overlay">
      <div class="blocker-modal">
        <h3>🛡️ Étape de Blocage</h3>
        <p>Un Bloqueur souhaite-t-il s'interposer ?</p>
        
        <div class="blocker-options">
          <div 
            v-for="blocker in availableBlockers" 
            :key="blocker.uniqueInstanceId"
            class="blocker-card-preview"
            @click="selectBlocker(blocker)"
          >
            <img :src="getCardImage(blocker)" :alt="blocker.name" />
            <span>{{ blocker.name }}</span>
          </div>
        </div>

        <button class="btn-pass-block" @click="passBlock">Ne pas bloquer</button>
      </div>
    </div>

    <!-- MODAL ÉTAPE DE CONTRE (7-1-3) -->
    <div v-if="isCounterPhase" class="counter-modal-overlay">
      <div class="counter-modal">
        <h3>⚡ Étape de Contre</h3>
        <p>Défaussez des cartes de votre main pour augmenter votre défense (+1000 / +2000) :</p>
        
        <div v-if="defenderHandWithCounter.length > 0" class="counter-hand-grid">
          <div 
            v-for="card in defenderHandWithCounter" 
            :key="card.uniqueInstanceId"
            class="counter-card-item"
            @click="useCounterCard(card)"
          >
            <img :src="getCardImage(card)" :alt="card.name" />
            <span class="counter-badge-value">+{{ card.counterPower }}</span>
          </div>
        </div>
        <p v-else class="no-counter-text">Aucune carte avec valeur de Contre en main.</p>

        <button class="btn-resolve-combat" @click="resolveCombatWithCounter">
          Valider et Résoudre le Combat
        </button>
      </div>
    </div>

    <!-- MODAL INSPECTION -->
    <DuelCardInspectModal 
      v-if="selectedCard" 
      :card="selectedCard"
      @close="selectedCard = null"
    />
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDuelStore } from '../../stores/duelStore'
import { useCombatManager } from '../../composables/useCombatManager'
import { useDonManager } from '../../composables/useDonManager'
import { PLAYMAT_SLOTS } from '../../config/playmatSlots'
import PlayerHand from './PlayerHand.vue'
import DuelCardInspectModal from './DuelCardInspectModal.vue'

const duel = useDuelStore()
const { 
  selectedAttacker, 
  isBlockingPhase, 
  availableBlockers, 
  isCounterPhase,
  handleCardClick, 
  selectBlocker, 
  passBlock,
  useCounterCard,
  resolveCombatWithCounter
} = useCombatManager()

const { isDonSelected, selectDon, attachDonTo } = useDonManager()
const selectedCard = ref(null)

// Récupère la main du joueur défendant qui contient des cartes avec valeur de Contre (> 0)
const defenderHandWithCounter = computed(() => {
  if (!duel.engine || !duel.engine.gameState) return []
  const defenderOwner = duel.engine.gameState.getOpponentPlayer()
  return defenderOwner.getZone('hand').filter(c => c.counterPower > 0)
})

function getCardImage(card) {
  return card.image_url || card.image || '/CardBackRegular.png'
}

function onCardClick(card, isOpponent = false) {
  if (isDonSelected.value && !isOpponent) {
    const attached = attachDonTo(card)
    if (attached) return
  }

  const result = handleCardClick(card, isOpponent)
  
  if (result.action === 'inspect') {
    selectedCard.value = card
  }
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

/* VIRTUAL SLOT BOX */
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
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.slot-standard {
  width: 76px !important;
  height: 106px !important;
}

.slot-don-rest {
  width: 96px !important;
  height: 68px !important;
}

.clickable-target, .clickable-attacker, .clickable-don {
  cursor: pointer !important;
}

.clickable-target:hover {
  border-color: #ef4444 !important;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.6) !important;
}

.clickable-don.is-don-selecting {
  outline: 3px solid #f59e0b !important;
  box-shadow: 0 0 15px #f59e0b, 0 0 25px #fbbf24 !important;
  transform: scale(1.08) !important;
}

/* DON & LIFE */
.don-stack, .life-display, .card-display {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.is-rested-don .card-auto-fit {
  transform: rotate(90deg);
  width: 68px !important;
  height: 96px !important;
}

.count-badge-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(15, 23, 42, 0.9);
  color: #fbbf24;
  border: 2px solid #fbbf24;
  font-size: 0.95rem;
  font-weight: 900;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
  z-index: 15;
}

.life-badge {
  background: rgba(15, 23, 42, 0.9);
  color: #22c55e;
  border-color: #22c55e;
}

.attached-don-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #f59e0b;
  color: #000;
  font-size: 0.65rem;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
  border: 1px solid #fff;
  z-index: 35;
}

.opacity-70 {
  opacity: 0.7;
}

/* CHARACTER AREA */
.slot-character-area {
  width: 73.63% !important;
  max-width: 610px;
  height: 110px !important;
  padding: 2px 10px;
  box-sizing: border-box;
  overflow: visible !important;
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
  z-index: 10;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.character-slot:hover {
  transform: translateY(-4px) scale(1.05);
  filter: brightness(1.15);
  z-index: 20;
}

.character-slot.is-rested,
.virtual-slot-box.is-rested .card-auto-fit {
  transform: rotate(90deg);
}

.character-slot.is-attacking,
.virtual-slot-box.is-attacking {
  outline: 3px solid #ef4444 !important;
  box-shadow: 0 0 15px #ef4444, 0 0 25px #f59e0b !important;
  transform: translateY(-8px) scale(1.08) !important;
  z-index: 100 !important;
}

.card-auto-fit {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain;
  border-radius: 5px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.7);
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

.player-top-mat .virtual-slot-box {
  transform: rotate(180deg);
}

.player-top-mat .slot-character-area,
.player-top-mat .virtual-slot-box[style*="left: 50%"] {
  transform: translateX(-50%) rotate(180deg) !important;
}

.card-power {
  position: absolute;
  bottom: -6px;
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
  z-index: 30;
}

/* ==========================================================================
   MODAL ÉTAPE DE BLOCAGE (7-1-2)
   ========================================================================== */
.blocker-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.blocker-modal {
  background: #0f172a;
  border: 2px solid #f59e0b;
  border-radius: 12px;
  padding: 20px 30px;
  text-align: center;
  color: #fff;
  max-width: 450px;
  box-shadow: 0 0 25px rgba(245, 158, 11, 0.4);
}

.blocker-modal h3 {
  color: #f59e0b;
  margin-top: 0;
}

.blocker-options {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 20px 0;
}

.blocker-card-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.blocker-card-preview:hover {
  transform: scale(1.1);
}

.blocker-card-preview img {
  width: 70px;
  height: 98px;
  border-radius: 5px;
  border: 2px solid #38bdf8;
}

.blocker-card-preview span {
  font-size: 0.7rem;
  margin-top: 4px;
}

.btn-pass-block {
  background: #ef4444;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-pass-block:hover {
  background: #dc2626;
}

/* ==========================================================================
   MODAL ÉTAPE DE CONTRE (7-1-3)
   ========================================================================== */
.counter-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.counter-modal {
  background: #0f172a;
  border: 2px solid #38bdf8;
  border-radius: 12px;
  padding: 20px 30px;
  text-align: center;
  color: #fff;
  max-width: 500px;
  box-shadow: 0 0 25px rgba(56, 189, 248, 0.4);
}

.counter-modal h3 {
  color: #38bdf8;
  margin-top: 0;
}

.counter-hand-grid {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.counter-card-item {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.counter-card-item:hover {
  transform: translateY(-5px) scale(1.05);
}

.counter-card-item img {
  width: 65px;
  height: 90px;
  border-radius: 5px;
  border: 1px solid #38bdf8;
}

.counter-badge-value {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: #fff;
  font-weight: 900;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid #fff;
}

.no-counter-text {
  color: #94a3b8;
  font-style: italic;
  margin: 20px 0;
}

.btn-resolve-combat {
  background: #22c55e;
  color: #000;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 900;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-resolve-combat:hover {
  background: #16a34a;
}
</style>