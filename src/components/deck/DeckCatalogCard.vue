<template>
  <article
    class="catalog-card"
    :class="{ disabled: isDisabled }"
    @click="$emit('click')"
  >
    <div class="catalog-art">
      <img v-if="card.image_url" :src="card.image_url" :alt="card.name" />
      <div v-else class="placeholder-art">?</div>
    </div>
    <div class="catalog-info">
      <strong>{{ card.name }}</strong>
      <span>{{ card.rarity || 'N/A' }}</span>
    </div>
    <div v-if="isLeader" class="leader-tag">Leader</div>
    <div v-if="count > 0" class="card-count">{{ count }}</div>
  </article>
</template>

<script setup>
defineProps({
  card: Object,
  count: Number,
  isLeader: Boolean,
  isDisabled: Boolean
})
defineEmits(['click'])
</script>

<style scoped>
.catalog-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 6px;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}

.catalog-card:hover {
  transform: translateY(-2px);
  border-color: rgba(245,158,11,0.4);
}

.catalog-card.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.catalog-art {
  width: 100%;
  aspect-ratio: 0.71;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 6px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.catalog-art img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.placeholder-art {
  display: grid;
  place-items: center;
  height: 100%;
  color: #94a3b8;
}

.catalog-info {
  width: 100%;
  text-align: center;
}

.catalog-info strong {
  display: block;
  font-size: 0.75rem;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.catalog-info span {
  color: #94a3b8;
  font-size: 0.68rem;
}

.leader-tag {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(245,158,11,0.9);
  color: #111827;
  font-weight: 800;
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.6rem;
}

.card-count {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: #f59e0b;
  color: #111827;
  font-weight: 800;
  border-radius: 999px;
  padding: 1px 6px;
  font-size: 0.7rem;
}
</style>