<template>
  <div class="card-fan-group" @click="$emit('click')">
    <div class="fan-stack">
      <!-- Affiche chaque version spécifique dans la pile -->
      <div 
        v-for="(skinUrl, idx) in cardSkins" 
        :key="idx" 
        class="fan-card"
        :style="{ transform: `translateY(${idx * 18}px) scale(${1 - idx * 0.02})`, zIndex: idx + 1 }"
      >
        <img :src="skinUrl" :alt="card.name" />
      </div>
    </div>
    <div class="fan-meta">
      <span class="fan-count-badge">{{ totalCount }}x</span>
      <span class="fan-name">{{ card.name }}</span>
      <button class="remove-btn" type="button" @click.stop="$emit('remove')">×</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: Object,
  versions: Array // Reçoit le tableau des cartes présentes dans cette pile [{ card, count }]
})

defineEmits(['click', 'remove'])

// Calcule le total cumulé de la pile (ex: 2 originales + 1 alt = 3x)
const totalCount = computed(() => {
  if (!props.versions) return 1
  return props.versions.reduce((sum, v) => sum + (v.count || 1), 0)
})

// Génère la liste des URLs d'images à empiler dans l'ordre d'ajout
const cardSkins = computed(() => {
  if (!props.versions) return [props.card?.image_url]
  
  const urls = []
  props.versions.forEach(v => {
    const img = v.card?.image_url || v.image_url
    const qty = v.count || 1
    for (let i = 0; i < qty; i++) {
      urls.push(img)
    }
  })
  return urls
})
</script>

<style scoped>
.card-fan-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}
.fan-stack {
  position: relative;
  width: 100px;
  height: 180px;
}
.fan-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100px;
  height: 140px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.15);
}
.fan-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.fan-meta {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.fan-count-badge {
  background: #f59e0b;
  color: #111827;
  font-weight: 800;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 6px;
}
.fan-name {
  font-size: 0.75rem;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70px;
}
.remove-btn {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  font-weight: 700;
}
</style>