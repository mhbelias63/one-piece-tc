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
  border-radius: 16px;
  padding: 10px;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease;
}
.catalog-card:hover {
  transform: translateY(-4px);
  border-color: rgba(245,158,11,0.4);
}
.catalog-card.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.catalog-art {
  width: 100%;
  height: 150px;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 8px;
}
.catalog-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.placeholder-art {
  display: grid;
  place-items: center;
  height: 100%;
  color: #94a3b8;
}
.catalog-info strong {
  display: block;
  font-size: 0.85rem;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.catalog-info span {
  color: #94a3b8;
  font-size: 0.75rem;
}
.leader-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(245,158,11,0.9);
  color: #111827;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.65rem;
}
.card-count {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: #f59e0b;
  color: #111827;
  font-weight: 800;
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 0.75rem;
}
</style>