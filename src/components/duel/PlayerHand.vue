<template>
  <div 
    class="player-hand-move-wrapper"
    :style="{ transform: `translateX(calc(-50% + ${handOffsetX}px))` }"
    @mousedown="startDrag"
    @mouseleave="stopDrag"
    @mouseup="stopDrag"
    @mousemove="onDrag"
    @wheel="onWheel"
  >
    <div 
      v-for="(card, index) in hand" 
      :key="card.uniqueInstanceId || card.id" 
      class="hand-card-wrapper"
      :style="getCardStyle(index)"
      @click="handleCardClick(card)"
      @contextmenu.prevent="$emit('inspect-card', card)"
    >
      <img 
  :src="card.image_url || card.image || '/CardBackRegular.png'" 
  :alt="card.name || 'Carte en main'" 
  class="hand-card-img" 
  draggable="false" 
/>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  hand: {
    type: Array,
    default: () => []
  }
})

// Déclarer play-card et inspect-card
const emit = defineEmits(['play-card', 'inspect-card'])

const handOffsetX = ref(0)
const isDragging = ref(false)
let startX = 0
let initialOffset = 0

function handleCardClick(card) {
  const type = card.type?.toLowerCase()

  // On autorise la pose si c'est un Personnage, un Event OU un Stage
  if (type === 'character' || type === 'event' || type === 'stage') {
    emit('play-card', card.uniqueInstanceId || card.id)
  }
}
function startDrag(e) {
  isDragging.value = true
  startX = e.clientX
  initialOffset = handOffsetX.value
}

function stopDrag() {
  isDragging.value = false
}

function onDrag(e) {
  if (!isDragging.value) return
  e.preventDefault()
  const deltaX = e.clientX - startX
  handOffsetX.value = Math.max(-280, Math.min(280, initialOffset + deltaX))
}

function onWheel(e) {
  e.preventDefault()
  const newOffset = handOffsetX.value - e.deltaY * 0.8
  handOffsetX.value = Math.max(-280, Math.min(280, newOffset))
}

function getCardStyle(index) {
  return {
    marginLeft: index === 0 ? '0px' : '-22px',
    zIndex: index + 1
  }
}
</script>

<style scoped>
.player-hand-move-wrapper {
  position: absolute;
  bottom: 12px; /* Rehaussé pour décoller de la zone Life/Stage */
  left: 50%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 500; /* Priorité d'affichage au-dessus des cases */
  pointer-events: auto;
  cursor: grab;
  user-select: none;
  transition: transform 0.05s linear;
  padding-bottom: 5px;
}

.player-hand-move-wrapper:active {
  cursor: grabbing;
}

.hand-card-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 76px;
  height: 106px;
  transition: transform 0.2s ease, margin 0.2s ease;
  animation: draw-fly 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.27) forwards;
}

.hand-card-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 5px;
  box-shadow: -2px 4px 10px rgba(0, 0, 0, 0.7);
  pointer-events: none;
}

.hand-card-wrapper:hover {
  transform: translateY(-30px) scale(1.22);
  z-index: 100 !important;
}

@keyframes draw-fly {
  from {
    opacity: 0;
    transform: translate(120px, -80px) scale(0.6);
  }
  to {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
}
</style>