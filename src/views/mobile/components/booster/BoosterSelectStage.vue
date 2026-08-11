<template>
  <div class="select-stage">
    <div class="hero-topbar">
      <div class="view-switch">
        <button
          type="button"
          class="switch-btn"
          :class="{ active: selectedView === 'booster' }"
          @click="$emit('update:selectedView', 'booster')"
        >
          Booster
        </button>
        <button
          type="button"
          class="switch-btn"
          :class="{ active: selectedView === 'display' }"
          @click="$emit('update:selectedView', 'display')"
        >
          Display
        </button>
      </div>

      <div class="status-pill">
        {{ selectedView === 'booster' ? '12 cartes' : '24 boosters (288 cartes)' }}
      </div>
    </div>

    <div class="hero-copy">
      <p class="eyebrow">Nouveau set • Booster premium</p>
      <h1>{{ boosterMeta.title }}</h1>
      <p class="subtitle">Ouvre tes cartes et découvre les secrets du chapitre.</p>
    </div>

    <!-- CARROUSEL BOOSTER -->
    <div class="pack-stage">
      <button class="nav-arrow left" type="button" @click="$emit('prev-set')" title="Set précédent">‹</button>

      <div class="pack-container">
        <div class="pack-shiny-glow"></div>
        <button
          class="pack-card"
          type="button"
          :disabled="opening || isSetEmpty"
          @click="$emit('open-pack')"
        >
          <img v-if="packImage" :src="packImage" :alt="boosterMeta.title" class="pack-image" />
          <div v-else class="placeholder-pack">Image non disponible</div>
        </button>
      </div>

      <button class="nav-arrow right" type="button" @click="$emit('next-set')" title="Set suivant">›</button>
    </div>

    <div class="bottom-actions-group">
      <div class="set-code-badge">
        {{ boosterMeta.setCode }}
      </div>

      <div class="cta-block">
        <button
          class="open-btn"
          type="button"
          :disabled="opening || isSetEmpty"
          @click="$emit('open-pack')"
        >
          <img src="/gem.png" alt="Gem" class="gem-icon" />
          {{ selectedView === 'booster' ? 100 : 2400 }}
        </button>
        <span v-if="isSetEmpty" class="empty-warning">Ce set n'a pas encore de cartes disponibles</span>
        <span v-else>{{ opening ? 'Traitement en cours...' : 'Cliquer pour ouvrir' }}</span>
      </div>

      <div class="set-selector">
        <button class="secondary-btn" type="button" @click="$emit('open-set-modal')">
          🔍 Voir tous les sets
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  selectedView: String,
  boosterMeta: Object,
  packImage: String,
  opening: Boolean,
  isSetEmpty: Boolean
})

defineEmits(['update:selectedView', 'prev-set', 'next-set', 'open-pack', 'open-set-modal'])
</script>

<style scoped>
.select-stage {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
  justify-content: space-between;
  align-items: center;
}

.hero-topbar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-switch {
  display: inline-flex;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
}

.switch-btn {
  border: none;
  background: transparent;
  color: #cbd5e1;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.8rem;
}

.switch-btn.active {
  background: rgba(245, 158, 11, 0.18);
  color: #f8fafc;
}

.status-pill {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  font-weight: 700;
  font-size: 0.72rem;
}

.hero-copy {
  text-align: center;
  margin-top: 4px;
}

.eyebrow {
  color: #f59e0b;
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.hero-copy h1 {
  font-size: 1.35rem;
  font-weight: 800;
  color: #f8fafc;
  margin-bottom: 2px;
  line-height: 1.1;
}

.subtitle {
  color: #94a3b8;
  font-size: 0.8rem;
}

.pack-stage {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  flex: 1;
  width: 100%;
  margin: 4px 0;
  min-height: 0;
}

.pack-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  max-height: 100%;
}

.nav-arrow {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.3rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  z-index: 10;
  flex-shrink: 0;
}

.pack-shiny-glow {
  position: absolute;
  width: 280px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(250, 204, 21, 0.35) 0%, rgba(245, 158, 11, 0.15) 45%, transparent 70%);
  filter: blur(35px);
  pointer-events: none;
}

.pack-card {
  position: relative;
  width: auto;
  height: 100%;
  max-height: 38vh;
  aspect-ratio: 3 / 4.2;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
}

.pack-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.65));
}

.bottom-actions-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  z-index: 10;
}

.set-code-badge {
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fcd34d;
  padding: 3px 14px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
}

.cta-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.open-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(90deg, #f59e0b, #fb923c);
  color: #111827;
  font-size: 0.95rem;
  border: none;
  border-radius: 999px;
  padding: 8px 18px;
  font-weight: 700;
  cursor: pointer;
}

.open-btn .gem-icon { width: 16px; height: 16px; }

.secondary-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.empty-warning { color: #ef4444; font-size: 0.78rem; font-weight: 700; }
</style>