<template>
  <div class="summary-stage">
    <div class="reveal-topbar">
      <div>
        <p class="eyebrow">Résultat de l'ouverture</p>
        <h2>Cartes obtenues ({{ sortedDrawnCards.length }}) • Du plus rare au moins rare</h2>
      </div>
      <button class="ghost-btn" type="button" @click="$emit('reset')">Retour</button>
    </div>

    <div class="summary-grid">
      <div
        v-for="(card, index) in sortedDrawnCards"
        :key="card.drawId || index"
        class="summary-card"
        @click="hoveredCard = card"
      >
        <img :src="card.image_url" :alt="card.name" @error="onImageError" />

        <div v-if="card.is_manga" class="badge-tag manga">MR</div>
        <div v-else-if="card.is_sp" class="badge-tag sp">SP</div>
        <div v-else-if="getRarity(card) === 'SEC'" class="badge-tag sec">SEC</div>
        <div v-else-if="getRarity(card) === 'SR'" class="badge-tag sr">SR</div>
        <div v-else-if="isAlternative(card)" class="badge-tag alt">ALT</div>
      </div>
    </div>

    <div class="reveal-actions">
      <button class="open-btn" type="button" @click="$emit('reset')">Terminer</button>
    </div>

    <Transition name="fade">
      <div v-if="hoveredCard" class="card-preview-overlay" @click="hoveredCard = null">
        <div class="preview-card-wrapper">
          <img :src="hoveredCard.image_url" :alt="hoveredCard.name" class="preview-image" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  drawnCards: {
    type: Array,
    default: () => []
  }
})

defineEmits(['reset'])

const hoveredCard = ref(null)

function getRarity(card) {
  return card?.rarity ? String(card.rarity).trim().toUpperCase() : ''
}

function isAlternative(card) {
  if (!card) return false
  if (card.is_alt || card.is_alternative) return true
  const str = `${card.id || ''} ${card.name || ''}`.toUpperCase()
  return str.includes('_ALT_') || str.includes('-ALT') || str.includes('PARALLEL') || str.includes('ALTERNATIVE')
}

const sortedDrawnCards = computed(() => {
  return [...props.drawnCards].sort((a, b) => {
    const getRank = (card) => {
      const alt = isAlternative(card)
      const rarity = getRarity(card)

      if (card.is_manga) return 1
      if (card.is_sp) return 2
      if (rarity === 'SEC' && alt) return 3
      if (rarity === 'SEC') return 4
      if (rarity === 'SR' && alt) return 5
      if (rarity === 'L' && alt) return 6
      if (alt) return 7
      if (rarity === 'SR') return 8
      if (rarity === 'R') return 9
      if (rarity === 'UC') return 10
      if (rarity === 'C') return 11
      if (rarity === 'L') return 12
      return 13
    }
    return getRank(a) - getRank(b)
  })
})

function onImageError(event) {
  event.target.src = '/CardBackRegular.png'
}
</script>

<style scoped>
.summary-stage {
  width: 100%;
}

.reveal-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.eyebrow {
  color: #f59e0b;
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.ghost-btn,
.open-btn {
  border: none;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  padding: 8px 18px;
}

.open-btn {
  background: linear-gradient(90deg, #f59e0b, #fb923c);
  color: #111827;
  padding: 8px 18px;
  font-size: 0.95rem;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.24);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
  margin-top: 12px;
  max-height: 420px;
  overflow-y: auto;
  padding: 4px;
}

.summary-card {
  position: relative;
  aspect-ratio: 5/7;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}

.summary-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.badge-tag {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.badge-tag.manga { background: #ffffff; color: #000000; }
.badge-tag.sp { background: #a855f7; color: #ffffff; }
.badge-tag.sec { background: #facc15; color: #000000; }
.badge-tag.sr { background: #38bdf8; color: #000000; }
.badge-tag.alt { background: #e879f9; color: #000000; }

.reveal-actions {
  display: flex;
  justify-content: center;
  margin-top: 14px;
}

.card-preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.88);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.preview-card-wrapper {
  max-width: 340px;
  width: 85vw;
}

.preview-image {
  width: 100%;
  height: auto;
  border-radius: 16px;
}
</style>