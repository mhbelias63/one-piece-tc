<template>
  <article
    class="deck-card"
    :style="deck.leader?.image_url ? { backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.85) 100%), url(${deck.leader.image_url})` } : {}"
    @click="$emit('click')"
  >
    <div class="deck-card-header">
      <span class="deck-name">{{ deck.name }}</span>
      <div class="deck-header-right">
        <span class="deck-count">{{ count }} / 50</span>
        <button 
          class="delete-deck-btn" 
          type="button" 
          title="Supprimer ce deck"
          @click.stop="$emit('delete', deck)"
        >
          🗑️
        </button>
      </div>
    </div>
    <div class="deck-card-footer">
      <span class="leader-name-tag" v-if="deck.leader">Leader : {{ deck.leader.name }}</span>
      <span v-else class="no-leader-tag">Sans Leader</span>
    </div>
  </article>
</template>

<script setup>
defineProps({
  deck: Object,
  count: Number
})
defineEmits(['click', 'delete'])
</script>

<style scoped>
.deck-card {
  position: relative;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px;
  padding: 20px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 260px;
  background-size: cover;
  background-position: center top;
  background-color: rgba(15, 23, 42, 0.6);
  overflow: hidden;
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.deck-card:hover {
  transform: translateY(-4px);
  border-color: rgba(245,158,11,0.5);
}
.deck-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 2;
}
.deck-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.delete-deck-btn {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s ease;
}
.delete-deck-btn:hover {
  background: rgba(239, 68, 68, 0.8);
}
.deck-name {
  font-size: 1.2rem;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
}
.deck-count {
  background: rgba(15, 23, 42, 0.8);
  padding: 4px 10px;
  border-radius: 999px;
  color: #fcd34d;
  font-size: 0.85rem;
  font-weight: 700;
  border: 1px solid rgba(245,158,11,0.3);
}
.deck-card-footer {
  z-index: 2;
}
.leader-name-tag {
  color: #cbd5e1;
  font-size: 0.85rem;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}
.no-leader-tag {
  color: #94a3b8;
  font-size: 0.85rem;
}
</style>