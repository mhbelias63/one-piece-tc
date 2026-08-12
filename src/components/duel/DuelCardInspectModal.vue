<template>
  <div v-if="card" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      
      <!-- Bouton Fermer -->
      <button class="close-btn" @click="$emit('close')">×</button>

      <div class="modal-body">
        <!-- Visuel Carte -->
        <div class="image-container">
          <img :src="card.image_url || card.image" :alt="card.name" class="modal-image" />
        </div>

        <!-- Infos Carte -->
        <div class="details-container">
          <div class="card-header">
            <h2 class="card-title">{{ card.name }}</h2>
            <span class="card-type-badge">{{ formatCardType(card.type) || 'Character' }}</span>
          </div>

          <!-- Badges Stats -->
          <div class="quick-stats">
            <div class="stat-badge" v-if="card.cost !== undefined && card.cost !== null">
              <span class="stat-label">COÛT</span>
              <span class="stat-val cost-val">{{ card.cost }}</span>
            </div>

            <div class="stat-badge" v-if="card.power !== undefined && card.power !== null">
              <span class="stat-label">PUISSANCE</span>
              <span class="stat-val power-val">{{ card.power }}</span>
            </div>
          </div>

          <!-- Zone Effet avec Toggle Traduction -->
          <div class="effect-box" v-if="hasEffect(parsedEffects.mainEffect)">
            <div class="effect-header-row">
              <span class="effect-title">
                Effet 
                <span v-if="isTranslating" class="translating-indicator">(Traduction...)</span>
              </span>

              <!-- BOUTON BASCULE TRADUCTION -->
              <button 
                class="lang-toggle-btn" 
                :class="{ 'active-fr': showTranslation }"
                @click="showTranslation = !showTranslation"
                title="Basculer entre la VO et la traduction"
              >
                <span>EN</span>
                <span class="toggle-switch"></span>
                <span>FR</span>
              </button>
            </div>

            <!-- Affichage dynamique selon la langue choisie -->
            <div 
              class="effect-text" 
              v-html="showTranslation ? translatedMainEffect : parsedEffects.mainEffect"
            ></div>
          </div>

          <!-- Zone Trigger -->
          <div class="trigger-container" v-if="parsedEffects.triggerEffect">
            <div class="trigger-badge">
              <span>Déclenchement</span>
            </div>
            <div class="trigger-box">
              <div 
                class="effect-text" 
                v-html="showTranslation ? translatedTriggerEffect : parsedEffects.triggerEffect"
              ></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  card: Object
})

defineEmits(['close'])

// État du toggle (activé par défaut en FR)
const showTranslation = ref(true)

const translatedMainEffect = ref('')
const translatedTriggerEffect = ref('')
const isTranslating = ref(false)

const parsedEffects = computed(() => {
  if (!props.card?.effect) return { mainEffect: '', triggerEffect: '' }
  let text = props.card.effect.replace(/\s*This card has been officially errata'd\.?/gi, '')
  const triggerMatch = text.match(/(?:\[Trigger\]|Trigger:?)\s*(.*)/i)

  if (triggerMatch) {
    return {
      mainEffect: text.substring(0, triggerMatch.index).trim(),
      triggerEffect: triggerMatch[1].trim()
    }
  }
  return { mainEffect: text, triggerEffect: '' }
})

const tcgDictionary = {
  "Blocker": "Bloqueur",
  "Rush": "Initiative",
  "Double Attack": "Double Attaque",
  "On Play": "Jouée",
  "When Attacking": "En attaquant",
  "On Your Opponent's Attack": "Attaque adverse",
  "Activate: Main": "Activation : Principale",
  "Your Turn": "Votre tour",
  "Once Per Turn": "Une fois par tour"
}

function formatTranslatedEffectText(text) {
  if (!text) return ''
  let formatted = text
  formatted = formatted.replace(/définissez\s+ce\s+personnage\s+comme\s+actif/gi, 'Redressez ce Personnage')

  const styleStandard = (bg) => `display: inline-block; background-color: ${bg}; color: #fff; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 0.78rem; margin: 0 4px 2px 0;`
  const styleDon = `display: inline-block; background-color: #000; color: #fff; border: 1px solid #fff; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 0.78rem; margin: 0 4px 2px 0;`

  formatted = formatted.replace(/\[?\s*DON\s*!\s*!\s*x\s*(\d+)\s*\]?/gi, `<span style="${styleDon}">DON!! x$1</span>`)
  formatted = formatted.replace(/\[Jouée\]/gi, `<span style="${styleStandard('#2563eb')}">Jouée</span>`)
  formatted = formatted.replace(/\[En attaquant\]/gi, `<span style="${styleStandard('#2563eb')}">En attaquant</span>`)
  formatted = formatted.replace(/\[\s*Activation\s*:\s*Principale\s*\]/gi, `<span style="${styleStandard('#2563eb')}">Activation : Principale</span>`)
  formatted = formatted.replace(/\[Une fois par tour\]/gi, `<span style="display: inline-block; background-color: #ec4899; color: #fff; padding: 2px 8px; border-radius: 50px; font-weight: bold; font-size: 0.75rem;">Une fois par tour</span>`)

  return formatted.trim()
}

async function translateText(englishText) {
  if (!englishText || englishText === '-') return englishText
  let protectedText = englishText
  for (const [en, fr] of Object.entries(tcgDictionary)) {
    const regex = new RegExp(`\\[${en}\\]`, 'gi')
    protectedText = protectedText.replace(regex, `[${fr}]`)
  }

  try {
    isTranslating.value = true
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(protectedText)}&langpair=en|fr`)
    const data = await response.json()
    if (data?.responseData?.translatedText) {
      return formatTranslatedEffectText(data.responseData.translatedText)
    }
  } catch (e) {
    console.error("Erreur de traduction:", e)
  } finally {
    isTranslating.value = false
  }
  return formatTranslatedEffectText(protectedText)
}

watch(() => props.card, async (newCard) => {
  if (newCard) {
    translatedMainEffect.value = formatTranslatedEffectText(parsedEffects.value.mainEffect)
    translatedTriggerEffect.value = formatTranslatedEffectText(parsedEffects.value.triggerEffect)

    if (hasEffect(parsedEffects.value.mainEffect)) {
      translatedMainEffect.value = await translateText(parsedEffects.value.mainEffect)
    }
    if (parsedEffects.value.triggerEffect) {
      translatedTriggerEffect.value = await translateText(parsedEffects.value.triggerEffect)
    }
  }
}, { immediate: true })

function formatCardType(typeInput) {
  if (!typeInput) return ''
  return typeInput.split('/')[0]
}

function hasEffect(effectText) {
  if (!effectText) return false
  const cleaned = effectText.trim().toUpperCase()
  return cleaned !== '' && cleaned !== 'NULL' && cleaned !== '-' && cleaned !== 'NONE'
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  background-color: #0b0f19;
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  position: relative;
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 20px;
  color: #f3f4f6;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 14px;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.6rem;
  cursor: pointer;
  z-index: 5;
}
.close-btn:hover { color: #fff; }

.modal-body {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.image-container {
  width: 190px;
  flex-shrink: 0;
}

.modal-image {
  width: 100%;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.6);
  display: block;
}

.details-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
  color: #ffffff;
  padding-right: 20px;
}

.card-type-badge {
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 600;
}

.quick-stats {
  display: flex;
  gap: 10px;
}

.stat-badge {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.65rem;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.05em;
}

.stat-val {
  font-size: 1.1rem;
  font-weight: 900;
  color: #fff;
}

.cost-val { color: #3b82f6; }
.power-val { color: #f59e0b; }

.effect-box {
  background-color: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px;
}

.effect-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.effect-title {
  font-size: 0.75rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
}

/* STYLE DU BOUTON BASCULE FR/EN */
.lang-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 2px 6px;
  cursor: pointer;
  font-size: 0.65rem;
  font-weight: 800;
  color: #94a3b8;
  transition: all 0.2s ease;
}

.toggle-switch {
  width: 14px;
  height: 14px;
  background: #64748b;
  border-radius: 50%;
  transition: transform 0.2s ease, background 0.2s ease;
}

.lang-toggle-btn.active-fr {
  color: #fff;
  border-color: #3b82f6;
}

.lang-toggle-btn.active-fr .toggle-switch {
  transform: translateX(10px);
  background: #3b82f6;
}

.translating-indicator {
  color: #f59e0b;
  font-style: italic;
  text-transform: none;
}

.effect-text {
  font-size: 0.82rem;
  line-height: 1.45;
  color: #e2e8f0;
}

.trigger-container { margin-top: 2px; }
.trigger-badge {
  display: inline-block;
  background-color: #eab308;
  color: #000;
  font-weight: 900;
  font-size: 0.75rem;
  padding: 2px 10px;
  transform: skewX(-12deg);
  margin-bottom: -4px;
  margin-left: 4px;
  position: relative;
  z-index: 2;
}

.trigger-badge span { display: inline-block; transform: skewX(12deg); }

.trigger-box {
  background-color: #000;
  border: 1px solid #333;
  padding: 8px;
  border-radius: 0 6px 6px 6px;
}
</style>