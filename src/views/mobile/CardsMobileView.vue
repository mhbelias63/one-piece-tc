<template>
  <div class="cards-mobile-page">
    <!-- RECHERCHE ET FILTRES RAPIDES -->
    <div class="search-section">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Rechercher une carte..." 
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">×</button>
      </div>

      <div class="filter-pills">
        <button 
          v-for="rarity in rarities" 
          :key="rarity"
          class="pill-btn"
          :class="{ active: selectedRarity === rarity }"
          @click="selectedRarity = selectedRarity === rarity ? '' : rarity"
        >
          {{ rarity || 'Toutes' }}
        </button>
      </div>
    </div>

    <!-- ÉTAT DE CHARGEMENT / VIDE -->
    <div v-if="loading" class="state-msg">Chargement des cartes...</div>
    <div v-else-if="filteredCards.length === 0" class="state-msg">Aucune carte trouvée.</div>

    <!-- GRILLE 3 COLONNES STYLE MOBILE -->
    <div v-else class="mobile-cards-grid">
      <div 
        v-for="card in filteredCards" 
        :key="card.id" 
        class="card-thumb"
        @click="selectedCard = card"
      >
        <img v-if="card.image_url" :src="card.image_url" :alt="card.name" loading="lazy" />
        <div v-else class="placeholder">?</div>
      </div>
    </div>

    <!-- MODAL DE DÉTAILS CARTE -->
    <CardModal 
      v-if="selectedCard" 
      :card="selectedCard" 
      @close="selectedCard = null" 
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../supabase'
import CardModal from '../../components/CardModal.vue'

const cards = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedRarity = ref('')
const selectedCard = ref(null)

const rarities = ['', 'L', 'SEC', 'SR', 'R', 'UC', 'C']

async function fetchCards() {
  loading.value = true
  const { data, error } = await supabase.from('cards').select('*')
  if (!error && data) {
    cards.value = data
  }
  loading.value = false
}

const filteredCards = computed(() => {
  return cards.value.filter(card => {
    if (selectedRarity.value && card.rarity !== selectedRarity.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const matchName = (card.name || '').toLowerCase().includes(q)
      const matchId = (card.id || '').toLowerCase().includes(q)
      return matchName || matchId
    }
    return true
  })
})

onMounted(fetchCards)
</script>

<style scoped>
.cards-mobile-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: #090d16;
  padding-bottom: 6px;
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 0.9rem;
  color: #64748b;
}

.search-bar input {
  width: 100%;
  background: #111827;
  border: 1px solid #273447;
  border-radius: 12px;
  padding: 10px 36px;
  color: #fff;
  font-size: 0.85rem;
  outline: none;
}

.clear-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
}

.filter-pills {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.pill-btn {
  background: #111827;
  border: 1px solid #273447;
  color: #cbd5e1;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.pill-btn.active {
  background: #eab308;
  color: #000;
  border-color: #eab308;
}

.state-msg {
  text-align: center;
  padding: 40px;
  color: #64748b;
  font-size: 0.85rem;
}

/* GRILLE 3 COLONNES DENSE PARFAITE POUR MOBILE */
.mobile-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.card-thumb {
  aspect-ratio: 4 / 5.5;
  border-radius: 8px;
  overflow: hidden;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  color: #64748b;
  font-weight: 800;
}
</style>