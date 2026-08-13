<template>
  <div class="duel-initializer">
    <div v-if="!duelStore.isGameActive" class="init-panel">
      <h1>🎮 Start Duel</h1>
      <p>Initialize a duel with test decks</p>
      
      <div class="init-buttons">
        <button @click="startLocalDuel" class="start-btn">
          Start Local Duel
        </button>
      </div>
    </div>

    <div v-else class="duel-info">
      <div class="status-bar">
        <div class="turn-info">
          <h2>{{ duelStore.currentPlayer?.name || 'Player' }}'s Turn</h2>
          <p>Turn #{{ duelStore.turnCount }} | Phase: {{ duelStore.getPhaseDisplayName() }}</p>
        </div>

        <div class="resources">
          <div class="resource">
            <span class="label">Life:</span>
            <span class="value">{{ duelStore.playerLifeRemaining }}/{{ duelStore.playerLife.length }}</span>
          </div>
          <div class="resource">
            <span class="label">Don:</span>
            <span class="value">{{ duelStore.playerActiveDon }}/{{ duelStore.playerActiveDon + duelStore.playerRestedDon }}</span>
          </div>
          <div class="resource">
            <span class="label">Hand:</span>
            <span class="value">{{ duelStore.playerHand.length }}</span>
          </div>
          <div class="resource">
            <span class="label">Deploy:</span>
            <span class="value">{{ duelStore.playerDeploy.length }}/5</span>
          </div>
        </div>
      </div>

      <div class="combat-log">
        <h3>Combat Log</h3>
        <div class="log-entries">
          <div v-for="(entry, idx) in duelStore.combatLog.slice(-10)" :key="idx" class="log-entry">
            {{ entry }}
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button @click="duelStore.nextPhase" class="phase-btn">Next Phase</button>
        <button @click="duelStore.endTurn" class="turn-btn">End Turn</button>
        <button @click="duelStore.concede" class="concede-btn">Concede</button>
      </div>

      <div v-if="duelStore.isGameEnded" class="game-over">
        <h2>{{ duelStore.winner === 0 ? '🎉 You Win!' : '💀 You Lose!' }}</h2>
        <p>Reason: {{ duelStore.defeatReason }}</p>
        <button @click="resetDuel" class="reset-btn">Start New Duel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useDuelStore } from '../stores/duelStore'

const duelStore = useDuelStore()

// Test deck data
const testDeck = [
  // Leaders
  { id: 'OP01-L001', name: 'Luffy', type: 'leader', cost: 0, power: 3000, color: 'red' },
  // Characters
  ...Array.from({ length: 25 }, (_, i) => ({
    id: `OP01-00${i + 1}`,
    name: `Character ${i + 1}`,
    type: 'character',
    cost: Math.floor(i / 5) + 1,
    power: (i % 5 + 1) * 1000,
    color: 'red'
  })),
  // Events & Stage (rest of deck)
  ...Array.from({ length: 24 }, (_, i) => ({
    id: `OP01-E0${i + 1}`,
    name: `Event ${i + 1}`,
    type: 'event',
    cost: 1,
    power: 0,
    color: 'red'
  }))
]

const testDeck2 = [
  { id: 'OP01-L002', name: 'Zoro', type: 'leader', cost: 0, power: 3000, color: 'green' },
  ...Array.from({ length: 25 }, (_, i) => ({
    id: `OP02-00${i + 1}`,
    name: `Enemy Character ${i + 1}`,
    type: 'character',
    cost: Math.floor(i / 5) + 1,
    power: (i % 5 + 1) * 1000,
    color: 'green'
  })),
  ...Array.from({ length: 24 }, (_, i) => ({
    id: `OP02-E0${i + 1}`,
    name: `Enemy Event ${i + 1}`,
    type: 'event',
    cost: 1,
    power: 0,
    color: 'green'
  }))
]

function startLocalDuel() {
  duelStore.initDuel(
    testDeck,
    testDeck2,
    'OP01-L001', // Luffy as P1 leader
    'OP01-L002'  // Zoro as P2 leader
  )
  duelStore.startGame()
}

function resetDuel() {
  duelStore.resetDuel()
}
</script>

<style scoped>
.duel-initializer {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f141d 0%, #1a1f2e 100%);
  color: #fff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.init-panel {
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 40px;
  border-radius: 12px;
  border: 2px solid #f59e0b;
}

.init-panel h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.init-panel p {
  font-size: 1.1rem;
  color: #cbd5e1;
  margin-bottom: 30px;
}

.init-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.start-btn {
  padding: 12px 30px;
  background: #f59e0b;
  color: #000;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.start-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px #f59e0b;
}

.duel-info {
  width: 90%;
  max-width: 1200px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 15px;
}

.turn-info h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #f59e0b;
}

.turn-info p {
  margin: 5px 0 0 0;
  color: #cbd5e1;
  font-size: 0.9rem;
}

.resources {
  display: flex;
  gap: 20px;
}

.resource {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 12px;
  border-radius: 6px;
}

.resource .label {
  color: #94a3b8;
  font-weight: 600;
}

.resource .value {
  color: #f59e0b;
  font-weight: bold;
}

.combat-log {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 15px;
  max-height: 300px;
  overflow-y: auto;
}

.combat-log h3 {
  margin-top: 0;
  color: #cbd5e1;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.log-entry {
  font-size: 0.85rem;
  color: #cbd5e1;
  padding: 5px;
  border-left: 2px solid #f59e0b;
  padding-left: 10px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.action-buttons button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.phase-btn {
  background: #3b82f6;
  color: #fff;
}

.phase-btn:hover {
  background: #2563eb;
}

.turn-btn {
  background: #10b981;
  color: #fff;
}

.turn-btn:hover {
  background: #059669;
}

.concede-btn {
  background: #ef4444;
  color: #fff;
}

.concede-btn:hover {
  background: #dc2626;
}

.game-over {
  text-align: center;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #f59e0b;
  border-radius: 8px;
  padding: 20px;
}

.game-over h2 {
  font-size: 2rem;
  margin: 0 0 10px 0;
}

.game-over p {
  color: #cbd5e1;
  margin: 0 0 15px 0;
}

.reset-btn {
  padding: 10px 30px;
  background: #f59e0b;
  color: #000;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
}

.reset-btn:hover {
  transform: scale(1.05);
}
</style>
