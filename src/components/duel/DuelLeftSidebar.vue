<template>
  <aside class="left-sidebar" :class="{ 'is-collapsed': collapsed }">
    <button 
      class="toggle-side-btn toggle-left" 
      @click="$emit('update:collapsed', !collapsed)"
      :title="collapsed ? 'Afficher le panneau gauche' : 'Masquer le panneau gauche'"
    >
      {{ collapsed ? '❯' : '❮' }}
    </button>

    <div class="sidebar-inner" v-show="!collapsed">
      <!-- Mon Profil (Joueur 1) -->
      <div class="player-profile-tag">
        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Luffy" class="mini-avatar" alt="P1" />
        <div class="player-info">
          <span class="player-name">Bayek (P1)</span>
          <span class="player-role">1er Joueur</span>
        </div>
      </div>

      <!-- Zone de Logs / Historique -->
      <div class="logs-container">
        <div class="logs-header">Historique du Duel</div>
        <div class="logs-content">
          <div class="log-entry system">Début de la partie</div>
          <div class="log-entry p1">P1 a pioché 5 cartes</div>
          <div class="log-entry p2">P2 a pioché 5 cartes</div>
          <div class="log-entry system">Phase de Mulligan</div>
        </div>
      </div>

      <!-- Outils Bas : Abandon, Plein Écran, Paramètres -->
      <div class="bottom-tools">
        <button class="tool-btn surrender-btn" title="Concéder la partie">
          🚩 Abandonner
        </button>
        <div class="icon-tools">
          <button class="tool-btn icon-btn" @click="toggleFullscreen" title="Plein écran">
            ⛶
          </button>
          <button class="tool-btn icon-btn" title="Paramètres">
            ⚙️
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  collapsed: Boolean
})
defineEmits(['update:collapsed'])

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Erreur Plein Écran: ${err.message}`)
    })
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    }
  }
}
</script>

<style scoped>
.left-sidebar {
  position: relative;
  background: #0f141d;
  height: 100vh;
  z-index: 10;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
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

.toggle-left { right: -24px; border-radius: 0 8px 8px 0; border-left: none; }

.player-profile-tag {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.4);
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.mini-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #3b82f6; }
.player-info { display: flex; flex-direction: column; }
.player-name { color: #fff; font-size: 0.9rem; font-weight: 700; }
.player-role { color: #3b82f6; font-size: 0.75rem; font-weight: 600; }

.logs-container {
  flex: 1;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.logs-header {
  background: rgba(255, 255, 255, 0.05);
  padding: 10px 12px;
  font-size: 0.8rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.logs-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.8rem;
}

.log-entry { color: #cbd5e1; }
.log-entry.system { color: #f59e0b; font-style: italic; }
.log-entry.p1 { color: #3b82f6; }
.log-entry.p2 { color: #ef4444; }

.bottom-tools { display: flex; flex-direction: column; gap: 10px; margin-top: auto; }

.surrender-btn {
  width: 100%;
  padding: 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  color: #ef4444;
  font-weight: 800;
  font-size: 0.85rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}
.surrender-btn:hover { background: rgba(239, 68, 68, 0.3); }

.icon-tools { display: flex; gap: 8px; }
.icon-btn {
  flex: 1;
  height: 40px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s ease;
}
.icon-btn:hover { background: rgba(255, 255, 255, 0.12); }
</style>