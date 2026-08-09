<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <h2>Aperçu du set : {{ cleanSetId }}</h2>
          <p>{{ totalObtained }} / {{ setCards.length }} cartes débloquées dans ce booster</p>
        </div>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div v-if="loading" class="loading-state">
        Chargement des cartes du set...
      </div>

      <div v-else-if="setCards.length === 0" class="empty-state">
        Aucune carte trouvée pour le set {{ cleanSetId }}.
      </div>

      <div v-else class="rarity-sections">
        <div 
          v-for="rarity in rarityOrder" 
          :key="rarity" 
          class="rarity-block"
        >
          <template v-if="groupedCards[rarity] && groupedCards[rarity].length">
            <div class="rarity-divider">
              <span class="rarity-label" :class="`rarity-${rarity.toLowerCase()}`">{{ rarity }}</span>
              <span class="rarity-count">
                {{ getObtainedInRarity(rarity) }} / {{ groupedCards[rarity].length }}
              </span>
            </div>

            <div class="cards-grid">
              <div 
                v-for="card in groupedCards[rarity]" 
                :key="card.id" 
                class="preview-card"
                :class="{ 'is-owned': ownedMap[card.id] }"
                @click="openCardDetails(card)"
              >
                <div class="card-art-wrapper">
                  <img 
                    v-if="card.image_url" 
                    :src="card.image_url" 
                    :alt="card.name" 
                    class="card-art" 
                    loading="lazy"
                  />
                  <div v-else class="placeholder-art">?</div>
                  <div v-if="!ownedMap[card.id]" class="unowned-overlay"></div>
                  <div v-if="!ownedMap[card.id]" class="unowned-badge">Non possédée</div>
                </div>
                <div class="card-info">
                  <span class="card-code">{{ card.id }}</span>
                  <span class="card-name">{{ card.name }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Modal de détails -->
    <CardModal 
      v-if="selectedCard" 
      :card="selectedCard" 
      @close="selectedCard = null" 
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabase'
import CardModal from './CardModal.vue'

const props = defineProps({
  setId: { type: String, default: 'OP09' }
})
defineEmits(['close'])

const loading = ref(true)
const setCards = ref([])
const ownedCardIds = ref(new Set())
const selectedCard = ref(null)

const rarityOrder = ['TR', 'SP', 'SEC', 'L', 'SR', 'R', 'UC', 'C']

const cleanSetId = computed(() => {
  return String(props.setId || 'OP09').replace(/-/g, '').toUpperCase()
})

// Dictionnaire pré-calculé ultra rapide : { "OP09-001": true, "OP09-002": false }
const ownedMap = computed(() => {
  const map = {}
  setCards.value.forEach(card => {
    map[card.id] = ownedCardIds.value.has(card.id)
  })
  return map
})

async function fetchSetData() {
  loading.value = true
  const targetSet = cleanSetId.value

  const { data: cardsData, error } = await supabase
    .from('cards')
    .select('*')
    .or(`set_id.eq.${targetSet},id.ilike.${targetSet}-%`)

  if (error) {
    console.error('Erreur Supabase :', error)
    setCards.value = []
  } else {
    setCards.value = cardsData || []
  }

  // Charge la collection locale
  const rawCollection = window.localStorage.getItem('onepiece-collection')
  if (rawCollection) {
    try {
      const parsed = JSON.parse(rawCollection)
      ownedCardIds.value = new Set(parsed.map(c => c.id))
    } catch {
      ownedCardIds.value = new Set()
    }
  }

  loading.value = false
}

const groupedCards = computed(() => {
  const groups = {}
  rarityOrder.forEach(r => { groups[r] = [] })

  setCards.value.forEach(card => {
    const rarity = (card.rarity || 'C').toUpperCase()
    if (!groups[rarity]) groups[rarity] = []
    groups[rarity].push(card)
  })

  return groups
})

const totalObtained = computed(() => {
  return setCards.value.filter(c => ownedMap.value[c.id]).length
})

function getObtainedInRarity(rarity) {
  if (!groupedCards.value[rarity]) return 0
  return groupedCards.value[rarity].filter(c => ownedMap.value[c.id]).length
}

function openCardDetails(card) {
  selectedCard.value = {
    ...card,
    owned_count: ownedMap.value[card.id] ? 1 : 0
  }
}

onMounted(fetchSetData)
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.88);
  display: grid;
  place-items: center;
  z-index: 2000;
  padding: 20px;
}

.modal-card {
  width: min(900px, 95vw);
  max-height: 85vh;
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  color: #f8fafc;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 16px;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 800;
  color: #f8fafc;
}

.modal-header p {
  color: #94a3b8;
  font-size: 0.85rem;
}

.close-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #cbd5e1;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.4rem;
  cursor: pointer;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
}

/* OPTIMISATION SCROLL DU CONTENEUR */
.rarity-sections {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-right: 8px;
  will-change: scroll-position;
}

.rarity-divider {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
  margin-bottom: 12px;
}

.rarity-label {
  font-weight: 900;
  font-size: 0.9rem;
  padding: 2px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
}

.rarity-sec, .rarity-sp, .rarity-tr { background: rgba(192, 132, 252, 0.2); color: #c084fc; }
.rarity-sr { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
.rarity-r { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
.rarity-uc { background: rgba(34, 197, 94, 0.2); color: #86efac; }

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
}

/* CARTE OPTIMISÉE POUR FLUIDITÉ GPU */
.preview-card {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  will-change: transform;
  transition: transform 0.15s ease-out;
}

.preview-card:hover {
  transform: translateY(-4px) scale(1.03);
}

.card-art-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5.5;
  border-radius: 10px;
  overflow: hidden;
  background: #1e293b;
}

.card-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* OVERLAY SANS FILTRE CSS LOURD (Remplace grayscale/backdrop-filter pour soulager le GPU) */
.unowned-overlay {
  position: absolute;
  inset: 0;
  background: rgba(13, 17, 23, 0.75);
  pointer-events: none;
}

.placeholder-art {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #64748b;
  font-weight: 800;
}

.unowned-badge {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.9);
  color: #94a3b8;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.card-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.card-code {
  font-size: 0.68rem;
  color: #64748b;
  font-family: monospace;
}

.card-name {
  font-size: 0.72rem;
  font-weight: 700;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}
</style>