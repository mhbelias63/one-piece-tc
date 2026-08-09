<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="card-detail-modal">
      <button class="close-modal-btn" @click="$emit('close')">×</button>
      
      <div class="card-modal-content">
        <div class="card-modal-image-area">
          <img :src="activeSkin.image_url || card.image_url" :alt="card.name" />
          
          <div v-if="alternatives.length > 1" class="alt-selector-group">
            <button
              v-for="(skin, idx) in alternatives"
              :key="skin.id"
              class="shiny-toggle-btn"
              :class="{ active: activeSkinIndex === idx }"
              @click="activeSkinIndex = idx"
            >
              ✨ {{ idx === 0 ? 'Originale' : `Alt ${idx}` }}
            </button>
          </div>
        </div>

        <div class="card-modal-info">
          <h2>{{ activeSkin.name }}</h2>
          
          <div class="card-badges">
            <span class="badge type">{{ activeSkin.type || 'Character' }}</span>
            <span class="badge rarity">{{ activeSkin.rarity || 'C' }}</span>
            <span v-if="activeSkin.cost !== undefined && activeSkin.cost !== null" class="badge cost">Coût : {{ activeSkin.cost }}</span>
            <span v-if="activeSkin.power" class="badge power">Power : {{ activeSkin.power }}</span>
          </div>

          <!-- EFFET PRINCIPAL -->
          <div 
            class="card-effect" 
            v-if="hasValidEffect(parsedEffects.mainEffect)"
            v-html="formatEffectText(parsedEffects.mainEffect)"
          ></div>

          <!-- TRIGGER STYLISÉ -->
          <div class="trigger-container" v-if="parsedEffects.triggerEffect">
            <div class="trigger-badge">
              <span>Trigger</span>
            </div>
            <div class="trigger-box">
              <div class="effect-text" v-html="formatEffectText(parsedEffects.triggerEffect)"></div>
            </div>
          </div>

          <div class="modal-card-actions">
            <button 
              class="primary-btn" 
              :disabled="isDisabled" 
              @click="$emit('add', activeSkin)"
            >
              + Ajouter au deck ({{ count }}/{{ isLeader ? 1 : 4 }})
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  card: Object,
  alternatives: Array,
  count: Number,
  isLeader: Boolean,
  isDisabled: Boolean
})

defineEmits(['close', 'add'])

const activeSkinIndex = ref(0)

const activeSkin = computed(() => {
  if (props.alternatives && props.alternatives.length > 0 && props.alternatives[activeSkinIndex.value]) {
    return props.alternatives[activeSkinIndex.value]
  }
  return props.card
})

const parsedEffects = computed(() => {
  if (!activeSkin.value) return { mainEffect: '', triggerEffect: '' }
  
  const rawText = activeSkin.value.effect || activeSkin.value.description || ''
  
  // 1. Nettoyage du disclaimer
  const text = cleanCardEffect(rawText)
  if (!text) return { mainEffect: '', triggerEffect: '' }

  // 2. Extraction du Trigger
  const triggerMatch = text.match(/(?:\[Trigger\]|Trigger:?)\s*(.*)/i)

  if (triggerMatch) {
    return {
      mainEffect: text.substring(0, triggerMatch.index).trim(),
      triggerEffect: triggerMatch[1].trim()
    }
  }

  return { mainEffect: text, triggerEffect: '' }
})

function cleanCardEffect(rawEffect) {
  if (!rawEffect) return ''
  
  const text = String(rawEffect).trim()
  if (text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return ''

  // Tronque à partir de "Disclaimer" (avec ou sans ':', ' -', entre parenthèses ou crochets)
  const clean = text.replace(/(?:\(|\[)?\s*Disclaimer\s*:?.*/is, '').trim()

  return clean || ''
}

function hasValidEffect(text) {
  if (!text) return false
  const t = String(text).trim().toLowerCase()
  return t !== '' && t !== 'null' && t !== 'undefined'
}

function formatEffectText(text) {
  if (!text || text.toLowerCase() === 'null') return ''

  let formatted = text
  const allBadgesRegex = '\\[DON!![^\\]]+\\]|\\[On Play\\]|\\[When Attacking\\]|\\[On Your Opponent\'s Attack\\]|\\[Activate:?\\s*Main\\]|\\[Main\\]|\\[Your Turn\\]|\\[End of Your Turn\\]|\\[Opponent\'s Turn\\]|\\[On K\\.O\\.\\]|\\[Blocker\\]|\\[Rush\\]|\\[Double Attack\\]|\\[Counter\\]|\\[Once Per Turn\\]'

  formatted = formatted.replace(new RegExp(`(?<!^)(?<!(?:${allBadgesRegex})\\s*)\\s*(${allBadgesRegex})`, 'gi'), '<br><br>$1')

  const styleStandard = (bg, color = '#fff') =>
    `display: inline-block; background-color: ${bg}; color: ${color}; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; margin: 0 4px 2px 0; vertical-align: middle;`

  formatted = formatted.replace(/\[Blocker\]/gi, `<span class="badge-orange-hexagon">Blocker</span>`)
  formatted = formatted.replace(/\[Rush\]/gi, `<span class="badge-orange-hexagon">Rush</span>`)
  formatted = formatted.replace(/\[Double Attack\]/gi, `<span class="badge-orange-hexagon">Double Attack</span>`)

  formatted = formatted.replace(/\[On Play\]/gi, `<span style="${styleStandard('#2563eb')}">On Play</span>`)
  formatted = formatted.replace(/\[When Attacking\]/gi, `<span style="${styleStandard('#2563eb')}">When Attacking</span>`)
  formatted = formatted.replace(/\[On Your Opponent's Attack\]/gi, `<span style="${styleStandard('#2563eb')}">On Your Opponent's Attack</span>`)
  formatted = formatted.replace(/\[Activate:?\s*Main\]/gi, `<span style="${styleStandard('#2563eb')}">Activate: Main</span>`)
  formatted = formatted.replace(/\[Main\]/gi, `<span style="${styleStandard('#2563eb')}">Main</span>`)
  formatted = formatted.replace(/\[Your Turn\]/gi, `<span style="${styleStandard('#2563eb')}">Your Turn</span>`)
  formatted = formatted.replace(/\[End of Your Turn\]/gi, `<span style="${styleStandard('#2563eb')}">End of Your Turn</span>`)
  formatted = formatted.replace(/\[Opponent's Turn\]/gi, `<span style="${styleStandard('#2563eb')}">Opponent's Turn</span>`)
  formatted = formatted.replace(/\[On K\.O\.\]/gi, `<span style="${styleStandard('#2563eb')}">On K.O.</span>`)

  formatted = formatted.replace(/\[Counter\]/gi, `<span style="${styleStandard('#dc2626')}">Counter</span>`)
  formatted = formatted.replace(/\[Once Per Turn\]/gi, `<span style="display: inline-block; background-color: #ec4899; color: #fff; padding: 2px 10px; border-radius: 50px; font-weight: bold; font-size: 0.8rem; margin: 0 4px 2px 0; vertical-align: middle;">Once Per Turn</span>`)

  formatted = formatted.replace(/\[DON!! x(\d+)\]/gi, `<span style="${styleStandard('#000000', '#fff')}; border: 1px solid #444;">DON!! x$1</span>`)
  formatted = formatted.replace(/\[DON!! -(\d+)\]/gi, `<span style="${styleStandard('#000000', '#fff')}; border: 1px solid #444;">DON!! -$1</span>`)

  formatted = formatted.replace(/\(([^)]+)\)/g, '<em style="color: #aaa;">($1)</em>')

  return formatted
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
.card-detail-modal {
  position: relative;
  width: min(680px, 92vw);
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 28px;
}
.close-modal-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #cbd5e1;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
}
.card-modal-content {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
}
.card-modal-image-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card-modal-image-area img {
  width: 100%;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
}
.alt-selector-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.shiny-toggle-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f8fafc;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
  transition: all 0.2s ease;
}
.shiny-toggle-btn.active {
  background: rgba(245, 158, 11, 0.25);
  border-color: #f59e0b;
  color: #fcd34d;
}
.card-modal-info h2 {
  font-size: 1.4rem;
  color: #f8fafc;
  margin-bottom: 12px;
}
.card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.badge {
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}
.badge.rarity { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
.badge.cost { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
.badge.power { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }

.card-effect {
  color: #cbd5e1;
  font-size: 0.92rem;
  line-height: 1.6;
  margin-bottom: 16px;
}
.trigger-container {
  margin-top: 10px;
  position: relative;
}
.trigger-badge {
  display: inline-block;
  background-color: #eab308;
  color: #000;
  font-weight: 900;
  font-size: 0.85rem;
  padding: 2px 14px 2px 8px;
  transform: skewX(-15deg);
  margin-bottom: -4px;
  margin-left: 4px;
  position: relative;
  z-index: 2;
}
.trigger-badge span {
  display: inline-block;
  transform: skewX(15deg);
}
.trigger-box {
  background-color: #000;
  border: 1px solid #333;
  padding: 10px 12px;
  border-radius: 0 6px 6px 6px;
  position: relative;
  z-index: 1;
}
.effect-text {
  font-size: 0.85rem;
  line-height: 1.5;
  color: #e2e8f0;
}
:deep(.badge-orange-hexagon) {
  display: inline-block;
  background-color: #f97316;
  color: #ffffff;
  padding: 2px 12px;
  clip-path: polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%);
  font-weight: bold;
  font-size: 0.8rem;
  margin: 0 4px 2px 0;
}
.modal-card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
.primary-btn {
  background: linear-gradient(90deg, #f59e0b, #fb923c);
  color: #111827;
  padding: 12px 24px;
  border: none;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}
.primary-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
@media (max-width: 760px) {
  .card-modal-content {
    grid-template-columns: 1fr;
  }
}
</style>