<template>
  <div class="reveal-stage">
    <div class="reveal-topbar">
      <div>
        <p class="eyebrow">Révélation en cours</p>
        <h2>Carte {{ currentIndex + 1 }} sur {{ drawnCards.length }}</h2>
      </div>
      <button class="ghost-btn" type="button" @click="$emit('finish')">Passer la suite</button>
    </div>

    <div class="reveal-control">
      <button class="toggle-btn" type="button" @click="showBack = !showBack">
        {{ showBack ? 'Montrer les faces' : 'Montrer les dos' }}
      </button>
    </div>

    <div class="stack-viewport">
      <div class="cards-stack">
        <div
          v-for="(card, index) in visibleStack"
          :key="card.drawId"
          class="stack-card-flipper"
          :class="{
            flipped: showBack,
            'is-top': index === 0,
            'is-swiping': index === 0 && isSwiping
          }"
          :style="getStackDepthStyle(index)"
          @click="$emit('next-card')"
        >
          <div class="card-inner">
            <div class="card-front" :class="frontClass(card)">
              <img :src="card.image_url" :alt="card.name" @error="onImageError" />

              <template v-if="index === 0 && !showBack">
                <div v-if="card.is_manga || (getRarity(card) === 'SEC' && isAlternative(card))" class="particles-container iridescent-ultra">
                  <div class="iridescent-aura ultra"></div>
                  <span v-for="p in 32" :key="`manga-alt-${p}`" class="p-dot"></span>
                </div>

                <div v-else-if="card.is_sp || getRarity(card) === 'SEC'" class="particles-container gold">
                  <div class="gold-aura"></div>
                  <span v-for="p in 24" :key="`sp-${p}`" class="p-dot"></span>
                </div>

                <div v-else-if="getRarity(card) === 'SR' && !isAlternative(card)" class="particles-container blue">
                  <span v-for="p in 12" :key="`sr-${p}`" class="p-dot"></span>
                </div>

                <div v-else-if="isAlternative(card)" class="particles-container iridescent">
                  <div class="iridescent-aura"></div>
                  <span v-for="p in 16" :key="`alt-${p}`" class="p-dot"></span>
                </div>
              </template>
            </div>

            <div class="card-back">
              <img src="/CardBackRegular.png" alt="Dos de carte" class="card-back-image" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="hint-text">Clique sur la carte pour révéler la suivante</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  drawnCards: Array,
  currentIndex: Number,
  isSwiping: Boolean
})

defineEmits(['next-card', 'finish'])

const showBack = ref(false)

const visibleStack = computed(() => props.drawnCards.slice(props.currentIndex))

function getRarity(card) {
  return card?.rarity ? String(card.rarity).trim().toUpperCase() : ''
}

function isAlternative(card) {
  if (!card) return false
  if (card.is_alt || card.is_alternative) return true
  const str = `${card.id || ''} ${card.name || ''}`.toUpperCase()
  return str.includes('_ALT_') || str.includes('-ALT') || str.includes('PARALLEL') || str.includes('ALTERNATIVE')
}

function frontClass(card) {
  const rarity = getRarity(card)
  return {
    sr: rarity === 'SR',
    sec: rarity === 'SEC',
    alt: isAlternative(card) || card.is_sp || card.is_manga
  }
}

function getStackDepthStyle(index) {
  if (index > 4) return { display: 'none' }
  return {
    transform: `translateY(${index * -3}px) scale(${1 - index * 0.02})`,
    zIndex: 100 - index
  }
}

function onImageError(event) {
  event.target.src = '/CardBackRegular.png'
}
</script>

<style scoped>
.reveal-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.reveal-topbar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.eyebrow { color: #f59e0b; font-size: 0.7rem; text-transform: uppercase; }

.ghost-btn, .toggle-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.stack-viewport {
  width: 100%;
  height: 380px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cards-stack {
  position: relative;
  width: 230px;
  height: 330px;
}

.stack-card-flipper {
  position: absolute;
  inset: 0;
  perspective: 1000px;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.stack-card-flipper.is-swiping {
  transform: translateX(-120%) rotate(-15deg) !important;
  opacity: 0;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.stack-card-flipper.flipped .card-inner { transform: rotateY(180deg); }

.card-front, .card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 14px;
  overflow: visible;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.card-front img, .card-back-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14px;
}

.card-back { transform: rotateY(180deg); background: #121826; }
.hint-text { color: #94a3b8; font-size: 0.8rem; text-align: center; }
</style>