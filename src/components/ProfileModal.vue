<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Modifier le Profil</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- SELECTION D'AVATAR -->
        <div class="form-section">
          <label>Choisis ton Avatar</label>
          <div class="avatar-grid">
            <div 
              v-for="seed in presetAvatars" 
              :key="seed" 
              class="avatar-option"
              :class="{ selected: selectedAvatar === getAvatarUrl(seed) }"
              @click="selectedAvatar = getAvatarUrl(seed)"
            >
              <img :src="getAvatarUrl(seed)" alt="Avatar" />
            </div>
          </div>
        </div>

        <!-- MODIFICATION DU PSEUDO -->
        <div class="form-section">
          <label for="username-input">Pseudo de Pirate</label>
          <input 
            id="username-input"
            v-model="newUsername" 
            type="text" 
            class="text-input" 
            placeholder="Ton pseudo..."
          />
          <small v-if="!canChangeUsername" class="cooldown-notice">
            ⚠️ Tu as récemment changé ton pseudo. Prochain changement possible dans {{ daysRemaining }} jours.
          </small>
        </div>

        <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="$emit('close')">Annuler</button>
        <button class="save-btn" :disabled="saving" @click="saveProfile">
          {{ saving ? 'Enregistrement...' : 'Sauvegarder' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../supabase'

const props = defineProps({
  profile: { type: Object, required: true }
})

const emit = defineEmits(['close', 'updated'])

const newUsername = ref(props.profile.username || '')
const selectedAvatar = ref(props.profile.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=Luffy')
const saving = ref(false)
const errorMessage = ref('')

const presetAvatars = [
  'Luffy', 'Zoro', 'Nami', 'Usopp', 'Sanji', 'Chopper', 'Robin', 'Franky', 'Brook', 'Jinbe',
  'Shanks', 'Ace', 'Law', 'Kid', 'Kaido', 'BigMom', 'Buggy', 'Mihawk', 'Smoker', 'Sabo'
]

function getAvatarUrl(seed) {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`
}

const canChangeUsername = computed(() => {
  if (!props.profile.username_updated_at) return true
  const lastUpdate = new Date(props.profile.username_updated_at)
  const daysDiff = (new Date() - lastUpdate) / (1000 * 60 * 60 * 24)
  return daysDiff >= 7
})

const daysRemaining = computed(() => {
  if (!props.profile.username_updated_at) return 0
  const lastUpdate = new Date(props.profile.username_updated_at)
  const daysDiff = (new Date() - lastUpdate) / (1000 * 60 * 60 * 24)
  return Math.ceil(7 - daysDiff)
})

async function saveProfile() {
  errorMessage.value = ''
  saving.value = true

  const updates = {
    avatar_url: selectedAvatar.value
  }

  // Vérification de la modification du pseudo
  if (newUsername.value !== props.profile.username) {
    if (!canChangeUsername.value) {
      errorMessage.value = `Tu ne peux changer ton pseudo que tous les 7 jours.`
      saving.value = false
      return
    }
    updates.username = newUsername.value
    updates.username_updated_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', props.profile.id)

  if (error) {
    errorMessage.value = error.message.includes('unique') 
      ? 'Ce pseudo est déjà pris par un autre pirate !' 
      : error.message
  } else {
    emit('updated')
    emit('close')
  }

  saving.value = false
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 20px;
}

.modal-card {
  background: #111827;
  border: 1px solid #273447;
  border-radius: 20px;
  width: min(500px, 100%);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 { font-size: 1.3rem; color: #f8fafc; }

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
}

.modal-body { display: flex; flex-direction: column; gap: 20px; }

.form-section { display: flex; flex-direction: column; gap: 10px; }
.form-section label { font-size: 0.85rem; font-weight: 700; color: #cbd5e1; }

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
}

.avatar-option {
  width: 100%;
  aspect-ratio: 1;
  background: #0d111a;
  border: 2px solid #273447;
  border-radius: 12px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.avatar-option img { width: 100%; height: 100%; object-fit: cover; }

.avatar-option:hover { border-color: #f59e0b; }
.avatar-option.selected { border-color: #22c55e; background: rgba(34, 197, 94, 0.1); }

.text-input {
  width: 100%;
  padding: 12px 14px;
  background: #0d111a;
  border: 1px solid #273447;
  border-radius: 10px;
  color: #f8fafc;
}

.cooldown-notice { color: #f59e0b; font-size: 0.75rem; margin-top: 4px; }
.error-banner { color: #ef4444; font-size: 0.85rem; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 8px; }

.modal-footer { display: flex; justify-content: flex-end; gap: 12px; }

.cancel-btn, .save-btn {
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

.cancel-btn { background: #1e293b; color: #cbd5e1; border: none; }
.save-btn { background: #f59e0b; color: #111827; border: none; }
</style>