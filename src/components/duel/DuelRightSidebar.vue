<template>
  <aside class="right-sidebar" :class="{ 'is-collapsed': collapsed }">
    <button 
      class="toggle-side-btn toggle-right" 
      @click="$emit('update:collapsed', !collapsed)"
      :title="collapsed ? 'Afficher le panneau droit' : 'Masquer le panneau droit'"
    >
      {{ collapsed ? '❮' : '❯' }}
    </button>

    <div class="sidebar-inner" v-show="!collapsed">
      <!-- Profil Adversaire (Joueur 2) -->
      <div class="opponent-profile-tag">
        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Shanks" class="mini-avatar" alt="P2" />
        <div class="p2-info">
          <strong class="p2-name">{{ duel.opponentPlayer?.name || 'Adversaire' }}</strong>
          <span class="p2-role">2ème Joueur</span>
        </div>
      </div>

      <!-- État du Tour -->
      <div class="turn-card">
        <span class="turn-title">Tour {{ duel.turnCount }}</span>
        <span class="phase-pill">{{ currentPhaseName }}</span>
      </div>

      <!-- Annuler / Rétablir -->
      <div class="history-card">
        <button class="hist-btn">◄ Annuler</button>
        <span class="hist-counter">2 / 2</span>
        <button class="hist-btn">Rétablir ►</button>
      </div>

      <div class="spacer"></div>

      <!-- Panneau d'Actions Dynamique -->
      <div class="action-panel">
        <div class="action-header">Vos Actions</div>
        
        <div class="action-group">
          <!-- BOUTON PASSER LA PHASE -->
          <button @click="handleNextPhase" class="action-btn next-phase-btn">
            Passer la phase ({{ currentPhaseName }}) ➔
          </button>

          <!-- BOUTON FIN DE TOUR -->
          <button @click="handleEndTurn" class="action-btn end-turn-btn">
            Fin du tour
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  collapsed: Boolean,
  duel: {
    type: Object,
    required: true
  }
})

defineEmits(['update:collapsed'])

// Traduction ou nom lisible de la phase en cours
const currentPhaseName = computed(() => {
  if (!props.duel) return 'Attente'
  return props.duel.getPhaseDisplayName()
})

function handleNextPhase() {
  props.duel.nextPhase()
}

function handleEndTurn() {
  props.duel.endTurn()
}
</script>

<style scoped>
.right-sidebar {
  position: relative;
  background: #0f141d;
  height: 100vh;
  z-index: 10;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar-inner {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
}

.toggle-side-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f59e0b;
  font-size: 0.8rem;
  font-weight: 900;
  cursor: pointer;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-right { left: -24px; border-radius: 8px 0 0 8px; border-right: none; }

.opponent-profile-tag {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.4);
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.mini-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #ef4444; }
.p2-info { display: flex; flex-direction: column; }
.p2-name { color: #fff; font-size: 0.9rem; font-weight: 700; }
.p2-role { color: #ef4444; font-size: 0.75rem; font-weight: 600; }

.turn-card {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.turn-title { color: #fff; font-size: 1.1rem; font-weight: 900; }
.phase-pill {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.history-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 10px;
}
.hist-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.75rem;
  cursor: pointer;
}
.hist-counter { color: #94a3b8; font-size: 0.8rem; font-weight: 700; }

.spacer { flex: 1; }

.action-panel {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.action-header { color: #94a3b8; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; }

.action-group { display: flex; flex-direction: column; gap: 10px; }
.action-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.88rem;
  color: #fff;
  cursor: pointer;
  transition: transform 0.1s ease, opacity 0.2s ease;
}
.next-phase-btn { background: #f59e0b; color: #000; }
.end-turn-btn { background: #dc2626; }
.action-btn:hover { opacity: 0.9; transform: translateY(-1px); }
</style>