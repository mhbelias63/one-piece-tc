<template>
  <div class="lobby-container">
    <div class="lobby-card">
      <header class="lobby-header">
        <h1>ONE PIECE TCG - BÊTA TEST</h1>
        <p>Environnement de test du moteur de jeu et des cartes</p>
      </header>

      <div class="modes-grid">
        <!-- MODE SANDBOX (ACTIF) -->
        <div class="mode-card active">
          <div class="badge">SANDBOX</div>
          <h2>Mode Entraînement</h2>
          <p>
            Affronte une IA passive ou joue les deux côtés pour tester les effets, 
            les attaques et la résolution du moteur.
          </p>

          <label class="deck-label" for="starter-deck">Starter Deck</label>
          <select id="starter-deck" v-model="selectedStarterDeck" class="deck-select">
            <option v-for="deck in starterDecks" :key="deck.id" :value="deck.id">
              {{ deck.name }}
            </option>
          </select>

          <div class="ai-settings">
            <label class="toggle-row">
              <input v-model="useAi" type="checkbox" />
              <span>Jouer contre l’IA</span>
            </label>

            <div v-if="useAi" class="player-choice">
              <label class="radio-row">
                <input v-model="humanPlayerId" type="radio" :value="0" />
                <span>Je suis P1</span>
              </label>
              <label class="radio-row">
                <input v-model="humanPlayerId" type="radio" :value="1" />
                <span>Je suis P2</span>
              </label>
            </div>

            <p v-else class="local-hint">Mode local : P1 vs P2</p>
          </div>

          <button class="btn btn-primary" @click="startPractice">
            {{ useAi ? 'Lancer le duel IA' : 'Lancer le test local' }} →
          </button>
        </div>

        <!-- MODE PVP (DESACTIVÉ POUR LE MOMENT) -->
        <div class="mode-card disabled">
          <div class="badge badge-off">BIENTÔT</div>
          <h2>Multijoueur En Ligne</h2>
          <p>
            La fonctionnalité PvP sera branchée une fois l'ensemble des effets de cartes validés.
          </p>
          <button class="btn" disabled>En développement</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { useDuelStore } from '../stores/duelStore'

const router = useRouter()
const duelStore = useDuelStore()
const starterDecks = [
  { id: 'ST01', name: 'ST01 - Straw Hat Crew' },
  { id: 'ST03', name: 'ST03 - The Seven Warlords of the Sea' }
]
const selectedStarterDeck = ref('ST01')
const useAi = ref(false)
const humanPlayerId = ref(0)

function startPractice() {
  duelStore.resetDuel()
  router.push({
    path: '/duel',
    query: {
      autoStart: 'true',
      starter: selectedStarterDeck.value,
      ai: String(useAi.value),
      humanPlayerId: String(humanPlayerId.value)
    }
  })
}
</script>

<style scoped>
.lobby-container {
  min-height: 100vh;
  background: #020617;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #fff;
}

.lobby-card {
  max-width: 800px;
  width: 100%;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 32px;
}

.lobby-header {
  text-align: center;
  margin-bottom: 32px;
}

.lobby-header h1 {
  color: #fbbf24;
  margin: 0 0 8px 0;
}

.lobby-header p {
  color: #94a3b8;
  margin: 0;
}

.modes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.mode-card {
  position: relative;
  background: #1e293b;
  border: 2px solid #334155;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.mode-card.active {
  border-color: #f59e0b;
}

.mode-card.disabled {
  opacity: 0.5;
}

.badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #f59e0b;
  color: #000;
  font-size: 0.65rem;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge-off {
  background: #475569;
  color: #ccc;
}

.mode-card h2 {
  margin: 0 0 8px 0;
  font-size: 1.2rem;
}

.mode-card p {
  color: #94a3b8;
  font-size: 0.85rem;
  flex-grow: 1;
  margin-bottom: 20px;
}

.deck-label {
  color: #cbd5e1;
  font-size: 0.78rem;
  font-weight: 800;
  margin-bottom: 6px;
}

.deck-select {
  width: 100%;
  margin-bottom: 16px;
  padding: 10px 12px;
  border: 1px solid #64748b;
  border-radius: 6px;
  background: #0f172a;
  color: #fff;
  font-weight: 700;
}

.ai-settings {
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toggle-row,
.radio-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.player-choice {
  display: flex;
  gap: 16px;
  padding: 8px 0;
}

.local-hint {
  margin: 0;
  color: #94a3b8;
  font-size: 0.8rem;
}

.btn {
  border: none;
  border-radius: 6px;
  padding: 10px 16px;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary {
  background: #f59e0b;
  color: #000;
}

.btn-primary:hover {
  background: #fbbf24;
}

.btn:disabled {
  background: #334155;
  color: #64748b;
  cursor: not-allowed;
}
</style>