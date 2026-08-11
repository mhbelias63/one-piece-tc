<template>
  <Transition name="fade">
    <div v-if="show" class="set-modal-backdrop" @click.self="$emit('close')">
      <div class="set-modal">
        <div class="set-modal-header">
          <h3>Sélectionner un set</h3>
          <button class="close-btn" type="button" @click="$emit('close')">✕</button>
        </div>
        <div class="set-grid">
          <button
            v-for="b in boosterList"
            :key="b.setCode"
            class="set-card-option"
            :class="{ active: b.setCode === selectedSetCode }"
            type="button"
            @click="$emit('select-set', b.setCode)"
          >
            <img :src="b.imageUrl" :alt="b.title" class="set-thumb" />
            <div class="set-info">
              <strong>{{ b.setCode }}</strong>
              <span>{{ b.title }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  show: Boolean,
  boosterList: Array,
  selectedSetCode: String
})

defineEmits(['close', 'select-set'])
</script>

<style scoped>
.set-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.85);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  z-index: 2000;
  padding: 16px;
}

.set-modal {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  width: min(700px, 100%);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.set-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: #f8fafc;
}

.close-btn { background: transparent; border: none; color: #cbd5e1; font-size: 1.2rem; cursor: pointer; }

.set-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  overflow-y: auto;
}

.set-card-option {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 8px;
  cursor: pointer;
  text-align: left;
}

.set-card-option.active, .set-card-option:hover {
  background: rgba(245, 158, 11, 0.15);
  border-color: #f59e0b;
}

.set-thumb { width: 36px; height: 50px; object-fit: contain; }
.set-info { display: flex; flex-direction: column; }
.set-info strong { color: #f8fafc; font-size: 0.8rem; }
.set-info span { color: #94a3b8; font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; }
</style>