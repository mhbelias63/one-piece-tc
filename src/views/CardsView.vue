<template>
  <div class="collection-shell">
    <div class="main-panel">
      <!-- HEADER DE LA PAGE -->
      <div class="page-header">
        <div>
          <h1>{{ isRecentMode ? 'CARTES RÉCENTES' : 'MA COLLECTION' }}</h1>
          <p class="header-subtitle">
            {{ isRecentMode ? 'Derniers tirages' : (viewMode === 'sets' ? 'Progression par extension' : (selectedSet === 'ALL' ? 'Toutes les cartes' : `Set ${selectedSet}`)) }}
            <span>• {{ viewMode === 'sets' ? `${allSetsStats.length} sets` : `${filteredCards.length} cartes` }}</span>
          </p>
        </div>

        <div class="progress-card">
          <div class="progress-copy">
            <div class="progress-title-row">
              <strong>Progression globale</strong>
              <button class="toggle-view-btn" @click="toggleViewMode">
                {{ viewMode === 'grid' ? 'Par set' : 'Toutes' }}
              </button>
            </div>
            <span>{{ collectionLabel }}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>
          <small>{{ progressPercent }}%</small>
        </div>
      </div>

      <!-- VUE 1 : PROGRESSION PAR SETS -->
      <div v-if="viewMode === 'sets'" class="sets-progress-container">
        <div v-if="loadingSets" class="loading">Calcul de la progression des sets...</div>
        
        <div v-else class="sets-grid">
          <div 
            v-for="setItem in allSetsStats" 
            :key="setItem.setId" 
            class="set-progress-card"
            @click="filterBySet(setItem.setId)"
          >
            <div class="set-card-header">
              <h3>{{ setItem.setId }}</h3>
              <span class="set-count-badge">{{ setItem.owned }} / {{ setItem.total }} cartes</span>
            </div>

            <div class="progress-track">
              <div 
                class="progress-fill" 
                :style="{ width: `${setItem.percent}%` }"
              ></div>
            </div>

            <div class="set-card-footer">
              <small>{{ setItem.percent }}% complété</small>
              <span class="open-link">Voir les cartes →</span>
            </div>
          </div>
        </div>
      </div>

      <!-- VUE 2 : CATALOGUE DE CARTES -->
      <template v-else>
        <!-- FILTRES PRINCIPAUX -->
        <div class="filter-bar">
          <div class="search-box">
            <span class="search-icon">⌕</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher nom, effet..."
              class="search-input"
            />
            <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">×</button>
          </div>

          <div class="selects-row">
            <select v-model="sortMode" class="select-field">
              <option value="id">Trier par numéro</option>
              <option value="recent">Plus récentes d'abord</option>
              <option value="name">Trier par nom</option>
              <option value="rarity">Trier par rareté</option>
              <option value="cost">Trier par coût</option>
            </select>

            <select v-model="selectedType" class="select-field mobile-only-select">
              <option value="all">Tous les styles</option>
              <option value="standard">Classiques</option>
              <option value="parallel">Alternatives</option>
            </select>

            <!-- BOUTON ACCORDÉON DE FILTRES POUR MOBILE -->
            <button class="mobile-filter-toggle-btn" @click="showMobileFilters = !showMobileFilters">
              <span>Filtres</span>
              <span>{{ showMobileFilters ? '▲' : '▼' }}</span>
            </button>
          </div>

          <div class="filter-group desktop-only-flex">
            <button @click="selectedType = 'all'" :class="['filter-btn', { active: selectedType === 'all' }]">Tous les styles</button>
            <button @click="selectedType = 'standard'" :class="['filter-btn', { active: selectedType === 'standard' }]">Classiques</button>
            <button @click="selectedType = 'parallel'" :class="['filter-btn', { active: selectedType === 'parallel' }]">Alternatives</button>
          </div>
        </div>

        <!-- FILTRES SECONDAIRES (MASQUÉS SUR MOBILE SAUF SI CLIQUÉ) -->
        <div class="secondary-filters" :class="{ 'mobile-hidden': !showMobileFilters }">
          <!-- FILTRE DE POSSESSION -->
          <div class="filter-scroll-row">
            <button @click="setOwnershipFilter('all')" :class="['chip', { active: selectedOwnership === 'all' && !isRecentMode }]">Toutes</button>
            <button @click="setOwnershipFilter('owned')" :class="['chip', 'highlight-owned', { active: selectedOwnership === 'owned' && !isRecentMode }]">Possédées</button>
            <button @click="setOwnershipFilter('unowned')" :class="['chip', { active: selectedOwnership === 'unowned' && !isRecentMode }]">Non possédées</button>
            <button @click="switchToRecentMode" :class="['chip', 'chip-recent', { active: isRecentMode }]">🕒 Récents (290)</button>
          </div>

          <!-- MULTI-SÉLECTION COULEURS -->
          <div class="filter-scroll-row">
            <button @click="resetColors" :class="['chip', { active: selectedColors.length === 0 }]">Toutes couleurs</button>
            <button @click="toggleColor('red')" :class="['chip', { active: selectedColors.includes('red') }]">Rouge</button>
            <button @click="toggleColor('blue')" :class="['chip', { active: selectedColors.includes('blue') }]">Bleu</button>
            <button @click="toggleColor('green')" :class="['chip', { active: selectedColors.includes('green') }]">Vert</button>
            <button @click="toggleColor('purple')" :class="['chip', { active: selectedColors.includes('purple') }]">Violet</button>
            <button @click="toggleColor('yellow')" :class="['chip', { active: selectedColors.includes('yellow') }]">Jaune</button>
            <button @click="toggleColor('black')" :class="['chip', { active: selectedColors.includes('black') }]">Noir</button>
          </div>

          <!-- MULTI-SÉLECTION RARETÉS + MENU OPTIONS À DROITE -->
          <div class="rarity-options-row">
            <div class="filter-scroll-row">
              <button @click="resetRarities" :class="['chip', { active: selectedRarities.length === 0 }]">Toutes raretés</button>
              <button @click="toggleRarity('SEC')" :class="['chip', { active: selectedRarities.includes('SEC') }]">SEC</button>
              <button @click="toggleRarity('SR')" :class="['chip', { active: selectedRarities.includes('SR') }]">SR</button>
              <button @click="toggleRarity('R')" :class="['chip', { active: selectedRarities.includes('R') }]">R</button>
              <button @click="toggleRarity('UC')" :class="['chip', { active: selectedRarities.includes('UC') }]">UC</button>
              <button @click="toggleRarity('C')" :class="['chip', { active: selectedRarities.includes('C') }]">C</button>
              <button @click="toggleRarity('L')" :class="['chip', { active: selectedRarities.includes('L') }]">L</button>
            </div>

            <!-- BOUTON ICÔNE FLATICON À DROITE -->
            <div class="display-menu-wrapper">
              <button 
                class="settings-icon-btn" 
                :class="{ active: isListDisplay || showAllPages }"
                @click="showOptionsMenu = !showOptionsMenu" 
                title="Options d'affichage"
              >
                <i class="fi fi-rr-apps"></i>
              </button>

              <div v-if="showOptionsMenu" class="display-options-dropdown">
                <button 
                  class="dropdown-option-btn" 
                  :class="{ active: isListDisplay }"
                  @click="isListDisplay = !isListDisplay"
                >
                  <span class="check-mark">{{ isListDisplay ? '✓' : '' }}</span>
                  Afficher en liste
                </button>
                <button 
                  class="dropdown-option-btn" 
                  :class="{ active: showAllPages }"
                  @click="showAllPages = !showAllPages"
                >
                  <span class="check-mark">{{ showAllPages ? '✓' : '' }}</span>
                  Afficher toutes les cartes
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="loading" class="loading">Chargement de la collection...</div>

        <div v-else-if="displayedCards.length === 0" class="empty-state">
          Aucune carte ne correspond à tes filtres.
        </div>

        <!-- AFFICHAGE EN VUE LISTE -->
        <div v-else-if="isListDisplay" class="card-list-view">
          <article
            v-for="card in displayedCards"
            :key="card.drawUniqueKey || card.id"
            class="card-list-item"
            :class="{ 'unowned-card': !ownedCardIds.has(card.id) }"
            @click="openCardModal(card)"
          >
            <div class="list-thumb">
              <img 
                v-if="card.image_url" 
                :src="card.image_url" 
                :alt="card.name"
                @error="handleImageError"
              />
              <div class="placeholder-art" :style="{ display: card.image_url ? 'none' : 'grid' }">?</div>
            </div>

            <div class="list-card-info">
              <span class="list-card-name">{{ card.name }}</span>
              <span class="list-card-set">{{ card.id }} • Set : {{ card.set_id || 'OP' }}</span>
            </div>

            <div class="list-card-meta">
              <span class="rarity-tag" :style="{ color: getRarityColor(card.rarity) }">
                {{ card.rarity || 'N/A' }}
              </span>
              <span v-if="!ownedCardIds.has(card.id)" class="unowned-text">Non possédée</span>
              <span v-else class="owned-count-pill">x{{ getOwnedCount(card) }}</span>
            </div>
          </article>
        </div>

        <!-- AFFICHAGE EN GRILLE NORMALE -->
        <div v-else class="card-grid">
          <article
            v-for="card in displayedCards"
            :key="card.drawUniqueKey || card.id"
            class="card-item"
            :class="{ 'unowned-card': !ownedCardIds.has(card.id) }"
            @click="openCardModal(card)"
          >
            <div class="card-art">
              <img 
                v-if="card.image_url" 
                :src="card.image_url" 
                :alt="card.name"
                @error="handleImageError"
              />
              <div class="placeholder-art" :style="{ display: card.image_url ? 'none' : 'grid' }">?</div>
              <div v-if="!ownedCardIds.has(card.id)" class="unowned-badge">Non possédée</div>
              <div v-else-if="getOwnedCount(card) > 1" class="owned-count-badge">x{{ getOwnedCount(card) }}</div>
            </div>

            <div class="card-footer">
              <h3 class="card-title-centered">{{ card.name }}</h3>
              
              <div class="card-meta-row">
                <span class="card-code">{{ card.id }}</span>
                <span class="rarity-tag" :style="{ color: getRarityColor(card.rarity) }">
                  {{ card.rarity || 'N/A' }}
                </span>
              </div>
            </div>
          </article>
        </div>

        <!-- BOUTON CHARGER PLUS -->
        <div v-if="!showAllPages && filteredCards.length > displayedCards.length" class="load-more-row">
          <button class="load-more-btn" @click="visibleCount += 24">Charger plus de cartes</button>
          <span>Affichage de {{ displayedCards.length }} sur {{ filteredCards.length }} cartes</span>
        </div>
      </template>
    </div>

    <!-- PANNEAU LATÉRAL -->
    <aside class="side-panel">
      <div class="profile-card">
        <div class="avatar">
          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=EliasGP" alt="Avatar" />
        </div>
        <div class="profile-info">
          <h3>EliasGP</h3>
          <p>Niveau 24</p>
          <div class="xp-bar">
            <div class="xp-progress"></div>
          </div>
        </div>
      </div>

      <div class="widget-card">
        <div class="widget-title-row">
          <h3>Amis</h3>
          <span class="widget-link">Voir tout</span>
        </div>
        <div v-for="friend in friends" :key="friend.name" class="friend-item">
          <div class="friend-avatar">
            <img :src="`https://api.dicebear.com/7.x/bottts/svg?seed=${friend.name}`" alt="" />
          </div>
          <div class="friend-meta">
            <h4>{{ friend.name }}</h4>
            <div class="status-line">
              <span class="status-dot-indicator" :class="getStatusClass(friend.status)"></span>
              <span>{{ friend.status }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="widget-card missions-card">
        <div class="widget-title-row">
          <h3>Missions Quotidiennes</h3>
        </div>

        <div v-for="mission in missions" :key="mission.label" class="mission-item">
          <div class="mission-row">
            <span>{{ mission.label }}</span>
            <strong>{{ mission.count }}</strong>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: mission.progress + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="widget-card event-card">
        <h3>Événement en Cours</h3>
        <div class="event-banner">
          <h4>Championnat des pirates</h4>
          <button type="button">Participer</button>
        </div>
      </div>
    </aside>

    <CardModal 
      v-if="selectedCard"
      :card="selectedCard" 
      :ownedCount="getOwnedCount(selectedCard)"
      @close="selectedCard = null" 
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import CardModal from '../components/CardModal.vue'

const route = useRoute()
const router = useRouter()

const viewMode = ref('grid')
const allCatalogCards = ref([])
const recentCardsList = ref([])
const loading = ref(true)
const loadingSets = ref(false)
const selectedSet = ref('ALL')
const selectedCard = ref(null)
const visibleCount = ref(24)
const isRecentMode = ref(false)

const showOptionsMenu = ref(false)
const showMobileFilters = ref(false)
const isListDisplay = ref(false)
const showAllPages = ref(false)

const ownedCardIds = ref(new Set())
const cardQuantities = ref(new Map())
const allSetsStats = ref([])

const selectedOwnership = ref('all')
const selectedType = ref('all')
const searchQuery = ref('')
const selectedColors = ref([])
const selectedRarities = ref([])
const sortMode = ref('id')

const friends = [
  { name: 'Zoro_IM', status: 'En ligne' },
  { name: 'Nami_Swan', status: 'En ligne' },
  { name: 'FireFistLeg', status: 'En combat' },
  { name: 'LowB..', status: 'Hors-ligne' },
  { name: 'ShanksLeRoux', status: 'En ligne' }
]

const missions = [
  { label: 'Ouvrir 2 boosters', count: '1/2', progress: 50 },
  { label: 'Gagner 3 combats', count: '0/3', progress: 0 },
  { label: 'Collectionner 3 cartes', count: '2/3', progress: 66 }
]

function toggleColor(color) {
  const index = selectedColors.value.indexOf(color)
  if (index > -1) {
    selectedColors.value.splice(index, 1)
  } else {
    selectedColors.value.push(color)
  }
}

function resetColors() {
  selectedColors.value = []
}

function toggleRarity(rarity) {
  const index = selectedRarities.value.indexOf(rarity)
  if (index > -1) {
    selectedRarities.value.splice(index, 1)
  } else {
    selectedRarities.value.push(rarity)
  }
}

function resetRarities() {
  selectedRarities.value = []
}

function setOwnershipFilter(type) {
  isRecentMode.value = false
  selectedOwnership.value = type
  if (sortMode.value === 'recent') sortMode.value = 'id'
}

function switchToRecentMode() {
  isRecentMode.value = true
  selectedOwnership.value = 'owned'
  sortMode.value = 'recent'
  fetch290RecentCards()
}

function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'sets' : 'grid'
}

async function loadFullCatalog() {
  loading.value = true
  const { data, error } = await supabase.from('cards').select('*')
  if (!error && data) {
    allCatalogCards.value = data
  } else {
    allCatalogCards.value = []
  }
  loading.value = false
}

async function loadUserCollection() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    ownedCardIds.value = new Set()
    cardQuantities.value = new Map()
    return
  }

  const { data, error } = await supabase
    .from('user_cards')
    .select('card_id')
    .eq('user_id', user.id)

  if (error || !data) return

  const uniqueIds = new Set()
  const qMap = new Map()

  data.forEach(item => {
    uniqueIds.add(item.card_id)
    qMap.set(item.card_id, (qMap.get(item.card_id) || 0) + 1)
  })

  ownedCardIds.value = uniqueIds
  cardQuantities.value = qMap
}

async function fetch290RecentCards() {
  loading.value = true
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    loading.value = false
    return
  }

  const { data: userCardsData, error: ucError } = await supabase
    .from('user_cards')
    .select('id, card_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(290)

  if (ucError || !userCardsData || userCardsData.length === 0) {
    recentCardsList.value = []
    loading.value = false
    return
  }

  const cardsMap = new Map(allCatalogCards.value.map(c => [c.id, c]))

  recentCardsList.value = userCardsData
    .map(uc => {
      const cardDetails = cardsMap.get(uc.card_id)
      if (!cardDetails) return null
      return {
        ...cardDetails,
        drawUniqueKey: `${uc.id}-${uc.created_at}`,
        created_at: uc.created_at
      }
    })
    .filter(Boolean)

  loading.value = false
}

function getOwnedCount(card) {
  if (!card || !card.id) return 0
  return cardQuantities.value.get(card.id) || 0
}

async function fetchAllSetsStats() {
  loadingSets.value = true
  
  if (allCatalogCards.value.length === 0) {
    await loadFullCatalog()
  }

  const groups = {}
  allCatalogCards.value.forEach(card => {
    let sId = card.set_id || 'AUTRE'
    if (!groups[sId]) groups[sId] = []
    groups[sId].push(card.id)
  })

  const stats = Object.keys(groups).sort().map(setId => {
    const setCardIds = groups[setId]
    const totalInSet = setCardIds.length
    const ownedInSet = setCardIds.filter(id => ownedCardIds.value.has(id)).length
    const percent = totalInSet > 0 ? Math.round((ownedInSet / totalInSet) * 100) : 0

    return { setId, total: totalInSet, owned: ownedInSet, percent }
  })

  allSetsStats.value = stats
  loadingSets.value = false
}

function filterBySet(setId) {
  viewMode.value = 'grid'
  selectedSet.value = setId
  isRecentMode.value = false
  router.push({ path: '/cards', query: { set: setId } })
}

const filteredCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  let baseCards = isRecentMode.value ? recentCardsList.value : allCatalogCards.value

  if (!isRecentMode.value && selectedSet.value && selectedSet.value !== 'ALL') {
    baseCards = baseCards.filter(c => c.set_id === selectedSet.value || c.id.startsWith(`${selectedSet.value}-`))
  }

  return baseCards
    .filter(card => {
      const isOwned = ownedCardIds.value.has(card.id)
      if (selectedOwnership.value === 'owned' && !isOwned) return false
      if (selectedOwnership.value === 'unowned' && isOwned) return false

      const isParallel = card.id?.includes('_ALT_') || card.name?.toLowerCase().includes('(parallel)')
      if (selectedType.value === 'standard' && isParallel) return false
      if (selectedType.value === 'parallel' && !isParallel) return false

      if (selectedRarities.value.length > 0) {
        if (!selectedRarities.value.includes(card.rarity)) return false
      }

      if (selectedColors.value.length > 0) {
        const cardColor = String(card.color || '').toLowerCase()
        const hasMatchingColor = selectedColors.value.some(c => cardColor.includes(c))
        if (!hasMatchingColor) return false
      }

      if (query) {
        const name = (card.name || '').toLowerCase()
        const id = (card.id || '').toLowerCase()
        const effect = (card.effect || '').toLowerCase()
        if (!name.includes(query) && !id.includes(query) && !effect.includes(query)) return false
      }

      return true
    })
    .sort((a, b) => {
      switch (sortMode.value) {
        case 'recent':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0)
        case 'name':
          return (a.name || '').localeCompare(b.name || '')
        case 'rarity':
          return (a.rarity || '').localeCompare(b.rarity || '')
        case 'cost':
          return Number(a.cost || 0) - Number(b.cost || 0)
        default:
          return (a.id || '').localeCompare(b.id || '')
      }
    })
})

const displayedCards = computed(() => {
  if (showAllPages.value) {
    return filteredCards.value
  }
  return filteredCards.value.slice(0, visibleCount.value)
})

const totalOwnedCount = computed(() => ownedCardIds.value.size)
const totalDbCardCount = computed(() => allCatalogCards.value.length || 1)
const progressPercent = computed(() => Math.min(100, Math.round((totalOwnedCount.value / totalDbCardCount.value) * 100)))
const collectionLabel = computed(() => `Ma collection : ${totalOwnedCount.value} / ${totalDbCardCount.value} cartes`)

function getRarityColor(rarityCode) {
  if (!rarityCode) return '#9ca3af'
  const code = String(rarityCode).trim().toUpperCase()
  const rarityColors = {
    C: '#9ca3af', UC: '#22c55e', R: '#3b82f6', SR: '#eab308',
    SEC: '#c084fc', L: '#ef4444', P: '#06b6d4'
  }
  return rarityColors[code] || '#eab308'
}

function handleImageError(event) {
  event.target.style.display = 'none'
  if (event.target.nextElementSibling) {
    event.target.nextElementSibling.style.display = 'grid'
  }
}

function getStatusClass(status) {
  if (status === 'En ligne') return 'status-online'
  if (status === 'En combat') return 'status-ingame'
  return 'status-offline'
}

function openCardModal(card) {
  selectedCard.value = card
}

watch(viewMode, (newMode) => {
  if (newMode === 'sets') {
    fetchAllSetsStats()
  }
})

watch(
  () => route.query,
  async query => {
    if (allCatalogCards.value.length === 0) {
      await loadFullCatalog()
    }
    await loadUserCollection()

    if (query.filter === 'recent') {
      isRecentMode.value = true
      selectedOwnership.value = 'owned'
      sortMode.value = 'recent'
      await fetch290RecentCards()
    } else {
      isRecentMode.value = false
      selectedSet.value = query.set || 'ALL'
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (allCatalogCards.value.length === 0) {
    await loadFullCatalog()
  }
  await loadUserCollection()
})
</script>

<style scoped>
/* RANGER LES FILTRES SUR UNE SEULE LIGNE DÉROULANTE EN HORIZONTAL SUR MOBILE */
.filter-scroll-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  white-space: nowrap;
  padding-bottom: 4px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.filter-scroll-row::-webkit-scrollbar {
  display: none;
}

.rarity-options-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  width: 100%;
  overflow: hidden;
}

.display-menu-wrapper {
  position: relative;
  flex-shrink: 0;
}

.settings-icon-btn {
  background: #0d111a;
  border: 1px solid #273447;
  border-radius: 999px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.settings-icon-btn:hover, .settings-icon-btn.active {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #111827;
}

.display-options-dropdown {
  position: absolute;
  right: 0;
  top: 46px;
  background: #1b2333;
  border: 1px solid #273447;
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 100;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  min-width: 210px;
}

.dropdown-option-btn {
  background: transparent;
  border: none;
  color: #cbd5e1;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s ease;
}

.dropdown-option-btn:hover {
  background: #273447;
  color: #ffffff;
}

.dropdown-option-btn.active {
  color: #f59e0b;
}

.check-mark {
  width: 14px;
  font-weight: 900;
}

/* BOUTON TOGGLE FILTRES MOBILE */
.mobile-filter-toggle-btn {
  display: none;
  align-items: center;
  justify-content: space-between;
  background: #f59e0b;
  color: #111827;
  border: none;
  border-radius: 12px;
  padding: 0 14px;
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;
  height: 38px;
}

/* VUE EN LISTE */
.card-list-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-list-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #1b2333;
  border: 1px solid #243041;
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.card-list-item:hover {
  transform: translateX(4px);
  border-color: #f59e0b;
}

.list-thumb {
  width: 38px;
  height: 52px;
  border-radius: 4px;
  overflow: hidden;
  background: #0d111a;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.list-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.list-card-name {
  color: #f8fafc;
  font-size: 0.9rem;
  font-weight: 800;
}

.list-card-set {
  color: #94a3b8;
  font-size: 0.75rem;
}

.list-card-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.owned-count-pill {
  background: #f59e0b;
  color: #111827;
  font-size: 0.75rem;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 999px;
}

.unowned-text {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
}

.chip-recent.active {
  background: #a855f7 !important;
  border-color: #a855f7 !important;
  color: #ffffff !important;
}

.collection-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 24px;
  align-items: start;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;
}

.main-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.page-header h1 {
  font-size: 1.8rem;
  font-weight: 900;
  color: #f8fafc;
  letter-spacing: 0.04em;
}

.header-subtitle {
  color: #94a3b8;
  margin-top: 4px;
  font-size: 0.9rem;
}

.progress-card {
  background: #1b2333;
  border: 1px solid #273447;
  border-radius: 16px;
  padding: 14px 16px;
  min-width: 320px;
}

.progress-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #f8fafc;
  margin-bottom: 10px;
}

.progress-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.progress-title-row strong { font-size: 0.9rem; }

.toggle-view-btn {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid #f59e0b;
  color: #f59e0b;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-view-btn:hover {
  background: #f59e0b;
  color: #111827;
}

.progress-copy span { color: #94a3b8; font-size: 0.8rem; }

.progress-track {
  width: 100%;
  height: 8px;
  background: #1e293b;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #fb923c);
  border-radius: inherit;
  transition: width 0.4s ease;
}

.progress-card small { color: #f59e0b; font-weight: 800; }

.sets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.set-progress-card {
  background: #1b2333;
  border: 1px solid #273447;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.set-progress-card:hover {
  transform: translateY(-4px);
  border-color: #f59e0b;
}

.set-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.set-card-header h3 { font-size: 1.1rem; font-weight: 900; color: #f8fafc; }
.set-count-badge { font-size: 0.78rem; color: #94a3b8; font-weight: 700; }

.set-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.set-card-footer small { color: #f59e0b; font-weight: 800; }
.open-link { font-size: 0.78rem; color: #3b82f6; font-weight: 800; }

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  background: #1b2333;
  border: 1px solid #273447;
  border-radius: 16px;
  padding: 14px;
}

.search-box { position: relative; flex: 1; min-width: 200px; }

.search-input {
  width: 100%;
  background: #0d111a;
  border: 1px solid #273447;
  border-radius: 12px;
  padding: 10px 38px 10px 40px;
  color: #f8fafc;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.search-input:focus { outline: none; border-color: #eab308; }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #64748b; }

.clear-search {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.1rem;
  cursor: pointer;
}

.selects-row {
  display: flex;
  gap: 8px;
  flex: 1;
}

.select-field {
  background: #0d111a;
  border: 1px solid #273447;
  color: #f8fafc;
  border-radius: 12px;
  padding: 10px 12px;
  flex: 1;
  font-size: 0.85rem;
}

.filter-group { display: flex; flex-wrap: wrap; gap: 8px; }

.filter-btn, .chip {
  border: 1px solid #273447;
  background: #0d111a;
  color: #cbd5e1;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.filter-btn.active, .chip.active {
  background: #f59e0b;
  color: #111827;
  border-color: #f59e0b;
}

.chip.highlight-owned.active {
  background: #22c55e;
  border-color: #22c55e;
  color: #0d111a;
}

.secondary-filters { display: flex; flex-direction: column; gap: 10px; width: 100%; }

.mobile-only-select { display: none; }
.desktop-only-flex { display: flex; }

.loading, .empty-state {
  padding: 36px;
  text-align: center;
  color: #94a3b8;
  background: #1b2333;
  border: 1px solid #273447;
  border-radius: 16px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.card-item {
  background: #1b2333;
  border: 1px solid #243041;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
  display: flex;
  flex-direction: column;
}

.card-item:hover { transform: translateY(-4px); border-color: #f59e0b; }

.card-art {
  width: 100%;
  aspect-ratio: 4 / 5.5;
  background: #0d111a;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.card-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.3s ease;
}

.unowned-card .card-art img { filter: grayscale(100%) opacity(0.35); }
.unowned-card.card-list-item { opacity: 0.55; }

.unowned-badge {
  position: absolute;
  bottom: 8px;
  background: rgba(15, 23, 42, 0.88);
  color: #94a3b8;
  font-size: 0.68rem;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 700;
}

.owned-count-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #f59e0b;
  color: #111827;
  font-size: 0.72rem;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 6px;
}

.placeholder-art { color: #64748b; font-size: 0.9rem; font-weight: 800; }

.card-footer {
  background: #0d111a;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-title-centered {
  color: #f8fafc;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: center;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta-row { display: flex; justify-content: space-between; align-items: center; }
.card-code { color: #94a3b8; font-size: 0.75rem; font-weight: 600; font-family: monospace; }
.rarity-tag { font-size: 0.78rem; font-weight: 800; }

.load-more-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  color: #94a3b8;
  font-size: 0.85rem;
}

.load-more-btn {
  background: #f59e0b;
  color: #111827;
  border: none;
  border-radius: 999px;
  padding: 8px 16px;
  font-weight: 800;
  cursor: pointer;
}

.side-panel { display: flex; flex-direction: column; gap: 16px; }

.profile-card, .widget-card {
  background: #1b2333;
  border: 1px solid #273447;
  border-radius: 14px;
  padding: 16px;
}

.profile-card { display: flex; gap: 12px; align-items: center; }

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: #0d111a;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar img, .friend-avatar img { width: 100%; height: 100%; object-fit: cover; }
.profile-info h3 { color: white; font-size: 14px; font-weight: 700; }
.profile-info p { color: #64748b; font-size: 11px; margin-top: 2px; }

.xp-bar { width: 100%; height: 4px; background: #1e293b; border-radius: 2px; margin-top: 8px; }
.xp-progress { height: 4px; width: 65%; border-radius: 2px; background: #3b82f6; }

.widget-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.widget-title-row h3 { color: white; font-size: 12px; font-weight: 800; text-transform: uppercase; }
.widget-link { color: #64748b; font-size: 10px; }

.friend-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.friend-avatar {
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background: #0d111a;
  overflow: hidden;
  flex-shrink: 0;
}

.friend-meta h4 { color: white; font-size: 12px; font-weight: 600; }
.status-line { display: flex; align-items: center; gap: 6px; color: #94a3b8; font-size: 10px; margin-top: 2px; }
.status-dot-indicator { width: 6px; height: 6px; border-radius: 50%; }

.status-online { background-color: #22c55e; }
.status-ingame { background-color: #f59e0b; }
.status-offline { background-color: #64748b; }

.mission-item { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.mission-row { display: flex; justify-content: space-between; align-items: center; color: white; font-size: 11px; }

.progress-track { width: 100%; height: 6px; border-radius: 3px; background: #1e293b; overflow: hidden; }

.event-card h3 { color: white; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; }
.event-banner {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-banner h4 { color: #ffffff; font-size: 12px; font-weight: 800; text-transform: uppercase; }
.event-banner button {
  align-self: flex-start;
  border: none;
  background: #0d111a;
  color: white;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

/* MEDIA QUERIES SPÉCIFIQUES MOBILE */
@media (max-width: 1200px) {
  .collection-shell { grid-template-columns: 1fr; }
  .side-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: stretch; gap: 12px; }
  .page-header h1 { font-size: 1.4rem; }
  .progress-card { min-width: 0; width: 100%; padding: 10px 12px; }

  .filter-bar { padding: 10px; gap: 8px; }
  .search-box { min-width: 100%; }

  .desktop-only-flex { display: none !important; }
  .mobile-only-select { display: block !important; }
  .mobile-filter-toggle-btn { display: flex !important; }

  /* MASQUE TOUS LES PÂTÉS DE FILTRES SUR MOBILE PAR DÉFAUT */
  .secondary-filters.mobile-hidden {
    display: none !important;
  }

  .selects-row { width: 100%; gap: 6px; }

  .card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .side-panel { display: none; }
}
</style>