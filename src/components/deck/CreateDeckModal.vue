<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      
      <input
        v-if="isInput"
        v-model="inputValue"
        type="text"
        :placeholder="placeholder"
        @keyup.enter="handleConfirm"
      />

      <div class="modal-actions">
        <button class="secondary-btn" type="button" @click="$emit('close')">
          {{ cancelText }}
        </button>
        <button 
          :class="isDanger ? 'delete-confirm-btn' : 'primary-btn'" 
          type="button" 
          @click="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: String,
  description: String,
  placeholder: String,
  isInput: { type: Boolean, default: true },
  isDanger: { type: Boolean, default: false },
  cancelText: { type: String, default: 'Annuler' },
  confirmText: { type: String, default: 'Créer' }
})

const emit = defineEmits(['close', 'confirm'])
const inputValue = ref('')

function handleConfirm() {
  if (props.isInput && !inputValue.value.trim()) return
  emit('confirm', inputValue.value.trim())
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.88);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  z-index: 2000;
}
.modal-card {
  width: min(460px, 90vw);
  background: #0d1117;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px;
  padding: 28px;
  display: grid;
  gap: 18px;
}
.modal-card h2 {
  color: #f8fafc;
}
.modal-card p {
  color: #94a3b8;
}
.modal-card input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  color: #f8fafc;
  outline: none;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.primary-btn, .secondary-btn, .delete-confirm-btn {
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
}
.primary-btn {
  background: linear-gradient(90deg, #f59e0b, #fb923c);
  color: #111827;
  padding: 12px 24px;
}
.secondary-btn {
  background: rgba(255,255,255,0.08);
  color: #f8fafc;
  padding: 10px 18px;
}
.delete-confirm-btn {
  background: #ef4444;
  color: #ffffff;
  padding: 10px 18px;
}
</style>