<template>
  <div class="home-shell">
    <div class="main-panel">
      <!-- 1. HERO BANNER EN CARROUSEL -->
      <section 
        class="hero-card" 
        @mouseenter="stopAutoPlay" 
        @mouseleave="startAutoPlay"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <div 
          class="carousel-track" 
          :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
        >
          <div 
            v-for="(slide, index) in slides" 
            :key="index" 
            class="slide-item"
            :style="{ backgroundImage: `url(${slide.bgImage})` }"
          >
            <div class="hero-background-overlay"></div>
            
            <div v-if="slide.packImage" class="pack-illustration">
              <img :src="slide.packImage" :alt="slide.title" class="booster-pack-img" />
            </div>

            <div class="hero-copy">
              <span class="badge">{{ slide.badge }}</span>
              <h2>{{ slide.title }}</h2>
              <p>{{ slide.description }}</p>
              <div class="hero-actions">
                <router-link :to="slide.primaryBtnTo" class="btn btn-primary">
                  {{ slide.primaryBtnText }}
                </router-link>

                <button 
                  v-if="slide.isModalTrigger"
                  type="button" 
                  class="btn btn-secondary"
                  @click="handleSecondaryAction(slide)"
                >
                  {{ slide.secondaryBtnText }}
                </button>
                <router-link 
                  v-else
                  :to="slide.secondaryBtnTo" 
                  class="btn btn-secondary"
                >
                  {{ slide.secondaryBtnText }}
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <button class="nav-arrow prev-arrow" @click="prevSlide" aria-label="Précédent">‹</button>
        <button class="nav-arrow next-arrow" @click="nextSlide" aria-label="Suivant">›</button>

        <div class="dots-indicators">
          <span 
            v-for="(_, index) in slides" 
            :key="index" 
            class="dot" 
            :class="{ active: currentSlide === index }"
            @click="goToSlide(index)"
          ></span>
        </div>
      </section>

      <!-- 2. CARTES RÉCENTES -->
      <section class="section-block">
        <div class="section-header">
          <h3>Cartes Récentes</h3>
          <router-link to="/cards?filter=recent" class="section-link">VOIR TOUT</router-link>
        </div>

        <div class="cards-grid">
          <template v-if="recentCards.length">
            <article 
              v-for="(card, index) in recentCards" 
              :key="card.recentUniqueId || index" 
              class="card-item clickable-card"
              @click="openCardModal(card)"
            >
              <div class="card-art">
                <img 
                  v-if="card.image_url" 
                  :src="card.image_url" 
                  :alt="card.name" 
                  class="card-img" 
                  @error="handleImageError"
                />
                <div class="placeholder-art" :style="{ display: card.image_url ? 'none' : 'grid' }">?</div>
              </div>
              
              <div class="card-footer">
                <h4>{{ card.name }}</h4>
                <p>{{ card.rarity || 'Carte' }}</p>
              </div>
            </article>
          </template>

          <div v-else class="empty-block">
            Aucune carte récente. Ouvre un booster pour en obtenir !
          </div>
        </div>
      </section>

      <!-- 3. MES DECKS -->
      <section class="section-block">
        <div class="section-header">
          <h3>Mes Decks</h3>
          <router-link to="/decks" class="section-link">VOIR TOUT</router-link>
        </div>

        <div class="decks-grid">
          <article 
            v-for="deck in decks" 
            :key="deck.id" 
            class="deck-card"
            :style="deck.leader?.image_url ? { backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.4) 0%, rgba(15,23,42,0.9) 100%), url(${deck.leader.image_url})` } : {}"
            @click="$router.push('/decks')"
          >
            <div class="deck-info">
              <h4>{{ deck.name }}</h4>
              <div class="deck-meta">
                <img :src="imgWalletCards" alt="" class="small-icon" />
                <span>{{ getDeckCount(deck) }} / 50</span>
              </div>
            </div>
          </article>

          <router-link to="/decks" class="deck-card deck-create">
            <span class="plus-icon">+</span>
            <span>NOUVEAU DECK</span>
          </router-link>
        </div>
      </section>

      <!-- 4. LIENS RAPIDES -->
      <section class="quick-links-grid">
        <router-link v-for="link in quickLinks" :key="link.title" :to="link.to" class="quick-link-card">
          <div class="quick-link-icon">
            <img :src="link.icon" alt="" class="icon" />
          </div>
          <div class="quick-link-text">
            <h4>{{ link.title }}</h4>
            <p>{{ link.subtitle }}</p>
          </div>
        </router-link>
      </section>
    </div>

    <!-- 5. PANNEAU LATÉRAL -->
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

    <!-- MODALES -->
    <SetPreviewModal 
      v-if="showSetPreview" 
      :setId="selectedSetId" 
      @close="showSetPreview = false" 
    />

    <!-- LA PROPRIÉTÉ ownedCount EST À PRÉSENT DYNAMIQUE -->
    <CardModal 
      v-if="selectedCard"
      :card="selectedCard" 
      :ownedCount="getOwnedCount(selectedCard)"
      @close="selectedCard = null" 
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabase'
import { fetchCardsCached } from '../services/playerService'
import op09PackImg from '../assets/images/booster/EMPERORS IN THE NEW WORLD- [OP-09].webp'
import SetPreviewModal from '../components/SetPreviewModal.vue'
import CardModal from '../components/CardModal.vue'

const showSetPreview = ref(false)
const selectedSetId = ref('OP-09')
const selectedCard = ref(null)

const imgWalletCards = 'https://www.figma.com/api/mcp/asset/c7cd2cb8-14bc-4da0-ba3c-84c2275b5cee.svg'
const imgStore = 'https://www.figma.com/api/mcp/asset/1051881f-63f5-4e9d-8d45-2cff40d5d671.svg'
const imgRefreshCcw = 'https://www.figma.com/api/mcp/asset/844d043a-bab6-4e3c-bd52-fdf7536b1122.svg'
const imgAward1 = 'https://www.figma.com/api/mcp/asset/fabfc9da-13fb-4c3c-8bd9-c8f72034f5f6.svg'
const imgTrophy = 'https://www.figma.com/api/mcp/asset/d74cc36a-b71b-4b50-b47b-fc561524ef6d.svg'

const currentSlide = ref(0)
let timer = null

const slides = [
  {
    badge: 'NOUVEAU BOOSTER [OP-09]',
    title: 'EMPERORS IN THE NEW WORLD',
    description: 'Les Empereurs du Nouveau Monde débarquent ! Débloque des cartes Secrètes et Alternatives rares.',
    bgImage: 'https://images8.alphacoders.com/128/thumb-1920-1286602.jpg',
    packImage: op09PackImg,
    primaryBtnText: 'OUVRIR UN BOOSTER',
    primaryBtnTo: '/gacha',
    secondaryBtnText: 'APERÇU DES CARTES',
    secondaryBtnTo: '/cards',
    isModalTrigger: true,
    setId: 'OP-09'
  },
  {
    badge: 'ÉVÉNEMENT SPÉCIAL',
    title: 'CHAMPIONNAT DES PIRATES',
    description: 'Affronte les meilleurs joueurs du serveur et tente de remporter des boosters exclusifs et des coffres de pièces.',
    bgImage: 'https://images2.alphacoders.com/133/thumb-1920-1338870.png',
    packImage: null,
    primaryBtnText: 'PARTICIPER',
    primaryBtnTo: '/gacha',
    secondaryBtnText: 'EN SAVOIR PLUS',
    secondaryBtnTo: '/cards',
    isModalTrigger: false
  },
  {
    badge: 'CONSTRUCTEUR DE DECK',
    title: 'PRÉPARE TON ÉQUIPAGE',
    description: 'Associe un Leader puissant à tes meilleures cartes d’action pour écraser tes adversaires.',
    bgImage: 'https://images5.alphacoders.com/133/thumb-1920-1338872.png',
    packImage: null,
    primaryBtnText: 'CRÉER UN DECK',
    primaryBtnTo: '/decks',
    secondaryBtnText: 'MON CATALOGUE',
    secondaryBtnTo: '/cards',
    isModalTrigger: false
  }
]

function handleSecondaryAction(slide) {
  if (slide.isModalTrigger) {
    selectedSetId.value = slide.setId || 'OP-09'
    showSetPreview.value = true
  }
}

let touchStartX = 0

function handleTouchStart(e) {
  touchStartX = e.touches[0].clientX
}

function handleTouchEnd(e) {
  const touchEndX = e.changedTouches[0].clientX
  const diff = touchStartX - touchEndX
  if (Math.abs(diff) > 40) {
    if (diff > 0) nextSlide()
    else prevSlide()
  }
}

function nextSlide() {
  currentSlide.value = (currentSlide.value + 1) % slides.length
}

function prevSlide() {
  currentSlide.value = (currentSlide.value - 1 + slides.length) % slides.length
}

function goToSlide(index) {
  currentSlide.value = index
}

function startAutoPlay() {
  stopAutoPlay()
  timer = setInterval(() => {
    nextSlide()
  }, 5000)
}

function stopAutoPlay() {
  if (timer) clearInterval(timer)
}

const rawDecks = ref([])
const recentCards = ref([])
const cardQuantities = ref(new Map())

function loadUserDecks() {
  const raw = window.localStorage.getItem('onepiece-decks')
  if (raw) {
    try { rawDecks.value = JSON.parse(raw) } catch { rawDecks.value = [] }
  }
}

// OPTIMISATION 1 : getSession() pour la collection
async function loadUserCollectionFromSupabase(user) {
  if (!user) {
    cardQuantities.value = new Map()
    return
  }

  const { data, error } = await supabase
    .from('user_cards')
    .select('card_id')
    .eq('user_id', user.id)

  if (error || !data) return

  const qMap = new Map()
  data.forEach(item => {
    qMap.set(item.card_id, (qMap.get(item.card_id) || 0) + 1)
  })

  cardQuantities.value = qMap
}

function getOwnedCount(card) {
  if (!card || !card.id) return 0
  return cardQuantities.value.get(card.id) || 0
}

// OPTIMISATION 2 : getSession() + Utilisation du cache global fetchCardsCached
async function loadUserRecentCards(user) {
  if (!user) return

  const { data: userCardsData, error: ucError } = await supabase
    .from('user_cards')
    .select('id, card_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  if (ucError || !userCardsData || userCardsData.length === 0) {
    recentCards.value = []
    return
  }

  // Utilisation du cache des cartes au lieu d'une requête Supabase
  const allCards = await fetchCardsCached()
  const cardsMap = new Map(allCards.map(c => [c.id, c]))

  recentCards.value = userCardsData
    .map(uc => {
      const cardDetails = cardsMap.get(uc.card_id)
      if (!cardDetails) return null
      return {
        ...cardDetails,
        recentUniqueId: uc.id
      }
    })
    .filter(Boolean)
}

function openCardModal(card) {
  selectedCard.value = card
}

const decks = computed(() => rawDecks.value.slice(0, 3))

function getDeckCount(deck) {
  if (!deck || !deck.cards) return 0
  return deck.cards.reduce((sum, item) => sum + (item.count || 1), 0)
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

const quickLinks = [
  { title: 'Boutique', subtitle: 'Acheter des packs', to: '/gacha', icon: imgStore },
  { title: 'Échange', subtitle: 'Échanger des cartes', to: '/cards', icon: imgRefreshCcw },
  { title: 'Événements', subtitle: 'Tournois en cours', to: '/gacha', icon: imgAward1 },
  { title: 'Classements', subtitle: 'Meilleurs joueurs', to: '/cards', icon: imgTrophy }
]

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

onMounted(async () => {
  loadUserDecks()
  startAutoPlay()

  // Récupération unique de la session
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  if (user) {
    await Promise.all([
      loadUserCollectionFromSupabase(user),
      loadUserRecentCards(user)
    ])
  }
})

onUnmounted(() => {
  stopAutoPlay()
})
</script>

<style scoped>
.clickable-card {
  cursor: pointer;
}

.home-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 24px;
  align-items: start;
}

.main-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.hero-card {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  min-height: 260px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.4);
}

.carousel-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
}

.slide-item {
  min-width: 100%;
  background-size: cover;
  background-position: center;
  padding: 32px;
  display: flex;
  gap: 28px;
  align-items: center;
  position: relative;
  box-sizing: border-box;
}

.hero-background-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.65) 100%);
  z-index: 1;
}

.pack-illustration {
  position: relative;
  z-index: 2;
  width: 140px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1000px;
  flex-shrink: 0;
}

.booster-pack-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: rotate(-8deg) rotateY(-10deg) scale(1.05);
  filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.6));
  transition: transform 0.3s ease;
}

.pack-illustration:hover .booster-pack-img {
  transform: rotate(-2deg) scale(1.1);
}

.hero-copy {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: white;
  min-width: 0;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 6px;
  background: #eab308;
  color: #111827;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.hero-copy h2 {
  font-size: 30px;
  font-weight: 900;
  line-height: 1.1;
  text-shadow: 0 2px 8px rgba(0,0,0,0.8);
}

.hero-copy p {
  color: #cbd5e1;
  font-size: 14px;
  max-width: 540px;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  border: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn-primary {
  background: #eab308;
  color: #111827;
  box-shadow: 0 4px 12px rgba(234, 179, 8, 0.3);
}

.btn-secondary {
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  color: white;
}

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.nav-arrow:hover {
  background: #eab308;
  color: #111827;
  border-color: #eab308;
}

.prev-arrow { left: 14px; }
.next-arrow { right: 14px; }

.dots-indicators {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.dot.active {
  background: #eab308;
  width: 20px;
  border-radius: 4px;
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h3 {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 11px;
  font-weight: 700;
}

.empty-block {
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.card-item {
  min-height: 200px;
  border-radius: 12px;
  background: #1b2333;
  border: 1px solid #243041;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease;
}

.card-item:hover { transform: translateY(-4px); }

.card-art {
  flex: 1;
  height: 140px;
  overflow: hidden;
  background: #0d111a;
  position: relative;
}

.card-img { width: 100%; height: 100%; object-fit: cover; }

.placeholder-art {
  display: grid;
  place-items: center;
  height: 100%;
  color: #64748b;
  font-weight: 800;
}

.card-footer { background: #0d111a; padding: 8px; }

.card-footer h4 {
  color: white;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer p { color: #94a3b8; font-size: 9px; }

.decks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.deck-card {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-size: cover;
  background-position: center top;
  background-color: #1b2333;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 140px;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.deck-card:hover {
  transform: translateY(-3px);
  border-color: rgba(245, 158, 11, 0.5);
}

.deck-info h4 {
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 6px;
  text-shadow: 0 1px 4px rgba(0,0,0,0.9);
}

.deck-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fcd34d;
  font-size: 10px;
  font-weight: 700;
}

.small-icon { width: 12px; height: 12px; }

.deck-create {
  justify-content: center;
  align-items: center;
  color: #94a3b8;
  cursor: pointer;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.02);
}

.plus-icon { font-size: 24px; font-weight: 700; color: #f59e0b; }

.quick-links-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.quick-link-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: #1b2333;
  border: 1px solid #273447;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease;
}

.quick-link-card:hover {
  transform: translateY(-2px);
  border-color: rgba(245, 158, 11, 0.4);
}

.quick-link-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon { width: 20px; height: 20px; }

.quick-link-text h4 {
  color: #f8fafc;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.quick-link-text p { color: #94a3b8; font-size: 11px; margin-top: 2px; }

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
.friend-avatar { width: 28px; height: 28px; border-radius: 14px; background: #0d111a; overflow: hidden; flex-shrink: 0; }
.friend-meta h4 { color: white; font-size: 12px; font-weight: 600; }
.status-line { display: flex; align-items: center; gap: 6px; color: #94a3b8; font-size: 10px; margin-top: 2px; }
.status-dot-indicator { width: 6px; height: 6px; border-radius: 50%; }

.status-online { background-color: #22c55e; }
.status-ingame { background-color: #f59e0b; }
.status-offline { background-color: #64748b; }

.mission-item { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.mission-row { display: flex; justify-content: space-between; align-items: center; color: white; font-size: 11px; }

.progress-track { width: 100%; height: 6px; border-radius: 3px; background: #1e293b; overflow: hidden; }
.progress-fill { height: 100%; background: #eab308; border-radius: 3px; }

.event-card h3 { color: white; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; }
.event-banner { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.event-banner h4 { color: #ffffff; font-size: 12px; font-weight: 800; text-transform: uppercase; }
.event-banner button { align-self: flex-start; border: none; background: #0d111a; color: white; border-radius: 6px; padding: 6px 12px; font-size: 10px; font-weight: 700; cursor: pointer; }

@media (max-width: 1200px) {
  .home-shell { grid-template-columns: 1fr; }
  .side-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 900px) {
  .home-shell { grid-template-columns: 1fr; }
  .side-panel { display: none; }
  .cards-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .quick-links-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .slide-item { flex-direction: column; text-align: center; padding: 20px 16px 36px; gap: 16px; }
  .pack-illustration { width: 100px; height: 140px; }
  .hero-copy h2 { font-size: 1.3rem; }
  .hero-copy p { font-size: 0.8rem; }
  .hero-actions { justify-content: center; width: 100%; }
  .hero-actions .btn { flex: 1; padding: 10px 8px; font-size: 0.75rem; }
  .nav-arrow { width: 28px; height: 28px; font-size: 16px; }
  .cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>