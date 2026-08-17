<template>
  <aside class="right-sidebar" :class="{ 'is-collapsed': collapsed }">
    <button 
      class="toggle-side-btn toggle-right" 
      @click="$emit('update:collapsed', !collapsed)"
      :title="collapsed ? 'Afficher le panneau droit' : 'Masquer le panneau droit'"
    >
      <i class="pi" :class="collapsed ? 'pi-angle-left' : 'pi-angle-right'"></i>
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
        <span class="phase-pill">
          <i class="pi" :class="phaseIcon"></i>
          {{ currentPhaseName }}
        </span>
        <span class="turn-owner" :class="isMyTurn ? 'is-mine' : 'is-theirs'">
          <i class="pi" :class="isMyTurn ? 'pi-user' : 'pi-android'"></i>
          {{ turnOwnerLabel }}
        </span>
      </div>

      <!-- Ressources en un coup d'œil -->
      <div class="stats-card">
        <div class="stat-row">
          <span class="stat-label"><i class="pi pi-heart-fill"></i> Vie</span>
          <span class="stat-values">
            <b class="mine">{{ duel.playerLifeRemaining }}</b>
            <span class="sep">/</span>
            <b class="theirs">{{ duel.opponentLifeRemaining }}</b>
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-label"><i class="pi pi-bolt"></i> DON!! actifs</span>
          <span class="stat-values">
            <b class="mine">{{ duel.playerActiveDon }}</b>
            <span class="sep">/</span>
            <b class="theirs">{{ duel.opponentActiveDon }}</b>
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-label"><i class="pi pi-inbox"></i> Main</span>
          <span class="stat-values">
            <b class="mine">{{ duel.playerHand.length }}</b>
            <span class="sep">/</span>
            <b class="theirs">{{ duel.opponentHand.length }}</b>
          </span>
        </div>
      </div>

      <div class="spacer"></div>

      <!-- Panneau d'Actions Dynamique -->
      <div class="action-panel">
        <div class="action-header">Vos Actions</div>

        <p v-if="blockedReason" class="action-hint">
          <i class="pi pi-info-circle"></i>
          {{ blockedReason }}
        </p>

        <div class="action-group">
          <button
            @click="handleNextPhase"
            class="action-btn next-phase-btn"
            :disabled="Boolean(blockedReason)"
            :title="blockedReason || `Passer la phase ${currentPhaseName}`"
          >
            <i class="pi pi-forward"></i>
            <span>Passer la phase</span>
          </button>

          <button
            @click="handleEndTurn"
            class="action-btn end-turn-btn"
            :disabled="Boolean(blockedReason)"
            :title="blockedReason || 'Terminer votre tour'"
          >
            <i class="pi pi-check-circle"></i>
            <span>Fin du tour</span>
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

const phaseIcons = {
  draw: 'pi-inbox',
  main: 'pi-sparkles',
  attack: 'pi-bolt',
  block: 'pi-shield',
  end: 'pi-flag'
}

const phaseIcon = computed(() => phaseIcons[props.duel?.currentPhase] || 'pi-circle')

// En mode IA, le joueur humain garde toujours le même côté.
const isMyTurn = computed(() => {
  if (!props.duel?.isBotEnabled) return true
  return props.duel.gameState?.currentPlayerTurnId === props.duel.botHumanPlayerId
})

const turnOwnerLabel = computed(() => (isMyTurn.value ? 'À vous de jouer' : "L'IA joue"))

const blockedReason = computed(() => {
  const duel = props.duel
  if (!duel) return 'Duel non initialisé'
  if (duel.isGameEnded) return 'La partie est terminée'
  if (!isMyTurn.value) return "L'IA est en train de jouer"
  if (duel.isInCombat) return 'Combat en cours à résoudre'
  if (duel.isTargetingActive) return 'Choisissez une cible pour continuer'
  if (duel.isChoiceActive) return 'Un choix d\'effet est en attente'
  return ''
})

function handleNextPhase() {
  if (blockedReason.value) return
  props.duel.nextPhase()
}

function handleEndTurn() {
  if (blockedReason.value) return
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
  font-size: 1rem;
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
  display: flex;
  align-items: center;
  gap: 6px;
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
.turn-owner {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
}
.turn-owner.is-mine { color: #4ade80; }
.turn-owner.is-theirs { color: #f87171; }

.stats-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px;
}
.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
}
.stat-label {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #94a3b8;
  font-weight: 700;
}
.stat-values { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; }
.stat-values .mine { color: #60a5fa; }
.stat-values .theirs { color: #f87171; }
.stat-values .sep { color: #475569; }
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

.action-hint {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid rgba(251, 191, 36, 0.35);
  border-radius: 8px;
  background: rgba(120, 53, 15, 0.3);
  color: #fbbf24;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.3;
}

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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
.action-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.action-btn:disabled {
  background: rgba(148, 163, 184, 0.15);
  color: #64748b;
  cursor: not-allowed;
  transform: none;
}
</style>