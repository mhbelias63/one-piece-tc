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
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 4px;
  cursor: pointer;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}

.catalog-card:hover {
  border-color: rgba(245, 158, 11, 0.5);
}

.catalog-card.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.catalog-art {
  width: 100%;
  aspect-ratio: 0.71;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 4px;
  background: rgba(0, 0, 0, 0.3);
}

.catalog-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.placeholder-art {
  display: grid;
  place-items: center;
  height: 100%;
  color: #94a3b8;
  font-size: 0.8rem;
}

.catalog-info {
  width: 100%;
  text-align: center;
}

.catalog-info strong {
  display: block;
  font-size: 0.68rem;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.catalog-info span {
  color: #94a3b8;
  font-size: 0.6rem;
}

.leader-tag {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(245, 158, 11, 0.95);
  color: #111827;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 0.55rem;
}

.card-count {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: #f59e0b;
  color: #111827;
  font-weight: 800;
  border-radius: 999px;
  padding: 1px 5px;
  font-size: 0.65rem;
}
</style>