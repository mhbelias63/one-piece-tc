<template>
    <div class="booster-page">
        <div class="booster-shell">

            <!-- 1. ÉTAPE DE SÉLECTION -->
            <div v-if="step === 'select'" class="select-stage">
                <div class="hero-topbar">
                    <div class="view-switch">
                        <button type="button" class="switch-btn" :class="{ active: selectedView === 'booster' }"
                            @click="selectedView = 'booster'">
                            Booster
                        </button>
                        <button type="button" class="switch-btn" :class="{ active: selectedView === 'display' }"
                            @click="selectedView = 'display'">
                            Display
                        </button>
                    </div>

                    <div class="status-pill">
                        {{ selectedView === 'booster' ? '12 cartes' : '24 boosters (288 cartes)' }}
                    </div>
                </div>

                <div class="hero-copy">
                    <p class="eyebrow">Nouveau set • Booster premium</p>
                    <h1>{{ currentBoosterMeta.title }}</h1>
                    <p class="subtitle">Ouvre tes cartes et découvre les secrets du chapitre.</p>
                </div>

                <!-- CARROUSEL BOOSTER AVEC FLÈCHES -->
                <div class="pack-stage">
                    <button class="nav-arrow left" type="button" @click="prevSet" title="Set précédent">‹</button>

                    <div class="pack-container">
                        <div class="pack-shiny-glow"></div>
                        <button class="pack-card" type="button" :disabled="opening || isCurrentSetEmpty" @click="openPack">
                            <img v-if="currentPackImage" :src="currentPackImage" :alt="currentBoosterMeta.title" class="pack-image" />
                            <div v-else class="placeholder-pack">Image non disponible</div>
                        </button>

                        <!-- CODE DU SET SOUS LE BOOSTER -->
                        <div class="set-code-badge">
                            {{ currentBoosterMeta.setCode }}
                        </div>
                    </div>

                    <button class="nav-arrow right" type="button" @click="nextSet" title="Set suivant">›</button>
                </div>

                <div class="bottom-actions-group">
                    <div class="cta-block">
                        <button class="open-btn" type="button" :disabled="opening || isCurrentSetEmpty" @click="openPack">
                            <img src="/gem.png" alt="Gem" class="gem-icon" />
                            {{ selectedView === 'booster' ? 100 : 2400 }}
                        </button>
                        <span v-if="isCurrentSetEmpty" class="empty-warning">Ce set n'a pas encore de cartes disponibles</span>
                        <span v-else>{{ opening ? 'Traitement en cours...' : 'Cliquer pour ouvrir' }}</span>
                    </div>

                    <!-- BOUTON MODALE SETS -->
                    <div class="set-selector">
                        <button class="secondary-btn" type="button" @click="showSetModal = true">
                            🔍 Voir tous les sets
                        </button>
                    </div>
                </div>
            </div>

            <!-- 2. ÉTAPE DE RÉVÉLATION -->
            <div v-else-if="step === 'reveal'" class="reveal-stage">
                <div class="reveal-topbar">
                    <div>
                        <p class="eyebrow">Révélation en cours</p>
                        <h2>Carte {{ currentIndex + 1 }} sur {{ drawnCards.length }}</h2>
                    </div>
                    <button class="ghost-btn" type="button" @click="finishOpening">Passer la suite</button>
                </div>

                <div class="reveal-control">
                    <button class="toggle-btn" type="button" @click="showBack = !showBack">
                        {{ showBack ? 'Montrer les faces' : 'Montrer les dos' }}
                    </button>
                </div>

                <div class="stack-viewport">
                    <div class="cards-stack">
                        <div v-for="(card, index) in visibleStack" :key="card.drawId" class="stack-card-flipper" :class="{
                            flipped: showBack,
                            'is-top': index === 0,
                            'is-swiping': index === 0 && isSwiping
                        }" :style="getStackDepthStyle(index)" @click="nextCard">
                            <div class="card-inner">
                                <div class="card-front" :class="frontClass(card)">
                                    <img :src="card.image_url" :alt="card.name" @error="onImageError($event)" />

                                    <!-- PARTICULES RESTRUCTURÉES POUR LES EFFETS -->
                                    <template v-if="index === 0 && !showBack">
                                        <!-- MANGA OU SEC + ALTERNATIVE (ULTRA) -->
                                        <div v-if="card.is_manga || (getRarity(card) === 'SEC' && isAlternative(card))"
                                            class="particles-container iridescent-ultra">
                                            <div class="iridescent-aura ultra"></div>
                                            <span v-for="p in 32" :key="`manga-alt-${p}`" class="p-dot"></span>
                                        </div>

                                        <!-- SP CARD (GOLD & PURPLE) -->
                                        <div v-else-if="card.is_sp" class="particles-container gold">
                                            <div class="gold-aura"></div>
                                            <span v-for="p in 24" :key="`sp-${p}`" class="p-dot"></span>
                                        </div>

                                        <!-- SEC SIMPLE (GOLD) -->
                                        <div v-else-if="getRarity(card) === 'SEC'" class="particles-container gold">
                                            <div class="gold-aura"></div>
                                            <span v-for="p in 16" :key="`sec-${p}`" class="p-dot"></span>
                                        </div>

                                        <!-- SR SIMPLE (BLUE) -->
                                        <div v-else-if="getRarity(card) === 'SR' && !isAlternative(card)"
                                            class="particles-container blue">
                                            <span v-for="p in 12" :key="`sr-${p}`" class="p-dot"></span>
                                        </div>

                                        <!-- ALTERNATIVE SIMPLE (IRIDESCENT) -->
                                        <div v-else-if="isAlternative(card)" class="particles-container iridescent">
                                            <div class="iridescent-aura"></div>
                                            <span v-for="p in 16" :key="`alt-${p}`" class="p-dot"></span>
                                        </div>
                                    </template>
                                </div>

                                <div class="card-back">
                                    <img :src="getCardBack(card)" alt="Dos de carte" class="card-back-image" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <p class="hint-text">Clique sur la carte pour révéler la suivante</p>
            </div>

            <!-- 3. ÉTAPE RÉCAPITULATIF -->
            <div v-else-if="step === 'summary'" class="summary-stage">
                <div class="reveal-topbar">
                    <div>
                        <p class="eyebrow">Résultat de l'ouverture</p>
                        <h2>Cartes obtenues ({{ sortedDrawnCards.length }}) • Du plus rare au moins rare</h2>
                    </div>
                    <button class="ghost-btn" type="button" @click="resetToSelect">Retour</button>
                </div>

                <div class="summary-grid">
                    <div v-for="(card, index) in sortedDrawnCards" :key="card.drawId || index" class="summary-card"
                        @click="hoveredCard = card">
                        <img :src="card.image_url" :alt="card.name" @error="onImageError($event)" />
                        
                        <!-- AFICHAGE DES BADGES ÉPURÉS -->
                        <div v-if="card.is_manga" class="badge-tag manga">MR</div>
                        <div v-else-if="card.is_sp" class="badge-tag sp">SP</div>
                        <div v-else-if="getRarity(card) === 'SEC'" class="badge-tag sec">SEC</div>
                        <div v-else-if="getRarity(card) === 'SR'" class="badge-tag sr">SR</div>
                        <div v-else-if="isAlternative(card)" class="badge-tag alt">ALT</div>
                    </div>
                </div>

                <div class="reveal-actions">
                    <button class="open-btn" type="button" @click="resetToSelect">Terminer</button>
                </div>
            </div>

        </div>

        <!-- MODALE SÉLECTION SETS -->
        <Transition name="fade">
            <div v-if="showSetModal" class="set-modal-backdrop" @click.self="showSetModal = false">
                <div class="set-modal">
                    <div class="set-modal-header">
                        <h3>Sélectionner un set</h3>
                        <button class="close-btn" type="button" @click="showSetModal = false">✕</button>
                    </div>
                    <div class="set-grid">
                        <button 
                            v-for="b in boosterList" 
                            :key="b.setCode" 
                            class="set-card-option"
                            :class="{ active: b.setCode === selectedSetCode }"
                            type="button" 
                            @click="selectSetFromModal(b.setCode)"
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

        <!-- OVERLAY ZOOM CARTE -->
        <Transition name="fade">
            <div v-if="hoveredCard" class="card-preview-overlay" @click="hoveredCard = null">
                <div class="preview-card-wrapper">
                    <img :src="hoveredCard.image_url" :alt="hoveredCard.name" class="preview-image" />
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabase'

const emit = defineEmits(['spend-gems'])

const step = ref('select')
const selectedView = ref('booster')
const showBack = ref(false)
const drawnCards = ref([])
const currentIndex = ref(0)
const isSwiping = ref(false)
const hoveredCard = ref(null)
const opening = ref(false)
const showSetModal = ref(false)
const allDatabaseCards = ref([])

const selectedSetCode = ref('OP-01')

const boosterModules = import.meta.glob('../assets/images/booster/*.{webp,png,jpg,jpeg}', { eager: true, import: 'default' })

const boosterList = computed(() => {
    const list = []
    
    for (const path in boosterModules) {
        const filename = path.split('/').pop().replace(/\.(webp|png|jpg|jpeg)$/i, '')
        
        const dashIndex = filename.indexOf('-')
        if (dashIndex === -1) continue

        const title = filename.substring(0, dashIndex).trim()
        const matchBracket = filename.match(/\[(.*?)\]/)
        const setCode = matchBracket ? matchBracket[1].trim() : ''

        if (setCode) {
            const numberMatch = setCode.match(/OP-?(\d+)/i)
            const setNumber = numberMatch ? parseInt(numberMatch[1], 10) : 999

            list.push({
                title,
                setCode,
                setNumber,
                imageUrl: boosterModules[path]
            })
        }
    }

    return list.sort((a, b) => a.setNumber - b.setNumber)
})

const currentBoosterMeta = computed(() => {
    const found = boosterList.value.find(b => b.setCode === selectedSetCode.value || b.setCode.replace('-', '') === selectedSetCode.value.replace('-', ''))
    return found || boosterList.value[0] || { title: 'Booster Premium', setCode: selectedSetCode.value, imageUrl: '' }
})

const currentPackImage = computed(() => {
    return currentBoosterMeta.value.imageUrl || ''
})

const isCurrentSetEmpty = computed(() => {
    if (!allDatabaseCards.value.length) return false
    const normalizedSelectedSet = selectedSetCode.value.replace('-', '').toLowerCase()
    
    const count = allDatabaseCards.value.filter(card => {
        if (!card || !card.set_id || !card.image_url) return false
        return String(card.set_id).replace('-', '').toLowerCase() === normalizedSelectedSet
    }).length

    return count === 0
})

async function loadCards() {
    const { data, error } = await supabase.from('cards').select('*')
    if (!error && data) {
        allDatabaseCards.value = data.filter(c => c && c.image_url && String(c.image_url).trim() !== '')
    }
}

onMounted(() => {
    loadCards()
})

function prevSet() {
    if (!boosterList.value.length) return
    const idx = boosterList.value.findIndex(b => b.setCode === currentBoosterMeta.value.setCode)
    const newIdx = (idx - 1 + boosterList.value.length) % boosterList.value.length
    selectedSetCode.value = boosterList.value[newIdx].setCode
}

function nextSet() {
    if (!boosterList.value.length) return
    const idx = boosterList.value.findIndex(b => b.setCode === currentBoosterMeta.value.setCode)
    const newIdx = (idx + 1) % boosterList.value.length
    selectedSetCode.value = boosterList.value[newIdx].setCode
}

function selectSetFromModal(code) {
    selectedSetCode.value = code
    showSetModal.value = false
}

const visibleStack = computed(() => drawnCards.value.slice(currentIndex.value))

const sortedDrawnCards = computed(() => {
    return [...drawnCards.value].sort((a, b) => {
        const getRank = (card) => {
            const alt = isAlternative(card)
            const rarity = getRarity(card)

            if (card.is_manga) return 1
            if (card.is_sp) return 2
            if (rarity === 'SEC' && alt) return 3
            if (rarity === 'SEC') return 4
            if (rarity === 'SR' && alt) return 5
            if (rarity === 'L' && alt) return 6
            if (alt) return 7
            if (rarity === 'SR') return 8
            if (rarity === 'R') return 9
            if (rarity === 'UC') return 10
            if (rarity === 'C') return 11
            if (rarity === 'L') return 12
            return 13
        }
        return getRank(a) - getRank(b)
    })
})

async function openPack() {
    if (opening.value || isCurrentSetEmpty.value) return
    opening.value = true

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        alert("Tu dois être connecté pour ouvrir des boosters !")
        opening.value = false
        return
    }

    if (!allDatabaseCards.value.length) {
        await loadCards()
    }

    const normalizedSelectedSet = selectedSetCode.value.replace('-', '').toLowerCase()
    
    const available = allDatabaseCards.value.filter(card => {
        if (!card || !card.set_id || !card.image_url) return false
        return String(card.set_id).replace('-', '').toLowerCase() === normalizedSelectedSet
    })

    if (available.length === 0) {
        alert("Ce booster ne contient pas encore de cartes en base de données.")
        opening.value = false
        return
    }

    const price = selectedView.value === 'booster' ? 100 : 2400

    const { data: success, error: gemError } = await supabase.rpc('deduct_gems', {
        user_id: user.id,
        amount: price
    })

    if (gemError || !success) {
        alert("Tu n'as pas assez de gemmes pour cet achat !")
        opening.value = false
        return
    }

    const mangaPool = available.filter(c => c.is_manga === true)
    const spPool = available.filter(c => c.is_sp === true && !c.is_manga)
    
    const leaderPoolStandard = available.filter(c => getRarity(c) === 'L' && !isAlternative(c) && !c.is_manga && !c.is_sp)
    const leaderPoolAlt = available.filter(c => getRarity(c) === 'L' && isAlternative(c) && !c.is_manga && !c.is_sp)

    const altPool = available.filter(c => isAlternative(c) && !c.is_manga && !c.is_sp && getRarity(c) !== 'L')
    const standardPool = available.filter(c => !isAlternative(c) && !c.is_manga && !c.is_sp && getRarity(c) !== 'L')

    const getRandomCard = (cardsList) => {
        if (!cardsList || cardsList.length === 0) return available[Math.floor(Math.random() * available.length)]
        return cardsList[Math.floor(Math.random() * cardsList.length)]
    }

    const drawSpecialSlot = () => {
        const rand = Math.random() * 100

        if (rand < 0.1 && mangaPool.length > 0) return getRandomCard(mangaPool)
        if (rand < 1.6 && spPool.length > 0) return getRandomCard(spPool)

        if (rand < 5.1) {
            const secAlts = altPool.filter(c => getRarity(c) === 'SEC')
            if (secAlts.length > 0) return getRandomCard(secAlts)
        }

        if (rand < 20.1) {
            const srAlts = altPool.filter(c => getRarity(c) === 'SR')
            if (srAlts.length > 0) return getRandomCard(srAlts)
        }

        const allAlts = [...altPool, ...leaderPoolAlt]
        return getRandomCard(allAlts.length > 0 ? allAlts : standardPool)
    }

    const pack = []
    const dbInserts = []
    const numPacks = selectedView.value === 'booster' ? 1 : 24

    for (let p = 0; p < numPacks; p++) {
        const isGodPack = Math.random() * 100 < 0.1
        const hasLeader = Math.random() < 0.5
        const leaderSlotIndex = 5 

        for (let i = 0; i < 12; i++) {
            let drawnCard;

            if (isGodPack) {
                if (i === 11) {
                    drawnCard = mangaPool.length > 0 ? getRandomCard(mangaPool) : getRandomCard(altPool)
                } else if (i === 10) {
                    drawnCard = spPool.length > 0 ? getRandomCard(spPool) : getRandomCard(altPool)
                } else if (i === leaderSlotIndex && hasLeader && leaderPoolAlt.length > 0) {
                    drawnCard = getRandomCard(leaderPoolAlt)
                } else {
                    drawnCard = getRandomCard(altPool.length > 0 ? altPool : available)
                }
            } else {
                if (i === 11) {
                    drawnCard = drawSpecialSlot()
                } else if (i === 10) {
                    const rarePool = standardPool.filter(c => ['R', 'SR', 'SEC'].includes(getRarity(c)))
                    drawnCard = getRandomCard(rarePool.length > 0 ? rarePool : standardPool)
                } else if (i === leaderSlotIndex && hasLeader && leaderPoolStandard.length > 0) {
                    drawnCard = getRandomCard(leaderPoolStandard)
                } else {
                    const commonPool = standardPool.filter(c => ['C', 'UC'].includes(getRarity(c)))
                    drawnCard = getRandomCard(commonPool.length > 0 ? commonPool : standardPool)
                }
            }

            const drawIndex = pack.length
            pack.push({
                ...drawnCard,
                isGodPack: isGodPack,
                drawId: `card-${drawIndex}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
            })

            dbInserts.push({
                user_id: user.id,
                card_id: drawnCard.id
            })
        }
    }

    const { error: insertError } = await supabase.from('user_cards').insert(dbInserts)
    if (insertError) {
        console.error("Erreur d'enregistrement Supabase :", insertError)
    }

    drawnCards.value = pack
    currentIndex.value = 0
    showBack.value = false
    step.value = 'reveal'
    opening.value = false

    emit('spend-gems', price)
}

function nextCard() {
    if (isSwiping.value) return
    isSwiping.value = true

    setTimeout(() => {
        currentIndex.value++
        isSwiping.value = false

        if (currentIndex.value >= drawnCards.value.length) {
            step.value = 'summary'
        }
    }, 180)
}

function finishOpening() {
    step.value = 'summary'
}

function resetToSelect() {
    step.value = 'select'
    hoveredCard.value = null
    currentIndex.value = 0
}

function getRarity(card) {
    if (!card || !card.rarity) return ''
    return String(card.rarity).trim().toUpperCase()
}

function isAlternative(card) {
    if (!card) return false
    if (card.is_alt || card.is_alternative) return true
    
    const str = `${card.id || ''} ${card.name || ''}`.toUpperCase()
    return str.includes('_ALT_') || str.includes('-ALT') || str.includes('PARALLEL') || str.includes('ALTERNATIVE')
}

function frontClass(card) {
    const rarity = getRarity(card)
    return {
        sr: rarity === 'SR',
        sec: rarity === 'SEC',
        alt: isAlternative(card) || card.is_sp || card.is_manga
    }
}

function getCardBack(card) {
    return '/CardBackRegular.png'
}

function getStackDepthStyle(index) {
    if (index > 4) return { display: 'none' }
    return {
        transform: `translateY(${index * -3}px) scale(${1 - index * 0.02})`,
        zIndex: 100 - index
    }
}

function onImageError(event) {
    event.target.src = '/CardBackRegular.png'
}
</script>

<style scoped>
.booster-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.booster-shell {
    position: relative;
    width: 100%;
    height: 100%;
    flex: 1;
    min-height: 0;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
        radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.18), transparent 34%),
        linear-gradient(135deg, #060816 0%, #0c1429 100%);
    overflow: hidden;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
}

.select-stage {
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1;
    justify-content: space-between;
    align-items: center;
}

.hero-topbar,
.reveal-topbar {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.view-switch {
    display: inline-flex;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.03);
}

.switch-btn {
    border: none;
    background: transparent;
    color: #cbd5e1;
    padding: 6px 14px;
    border-radius: 999px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.8rem;
}

.switch-btn.active {
    background: rgba(245, 158, 11, 0.18);
    color: #f8fafc;
}

.status-pill {
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: #cbd5e1;
    font-weight: 700;
    font-size: 0.72rem;
}

.hero-copy {
    text-align: center;
    margin-top: 4px;
}

.eyebrow {
    color: #f59e0b;
    font-size: 0.7rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 2px;
}

.hero-copy h1 {
    font-size: 1.6rem;
    font-weight: 800;
    color: #f8fafc;
    margin-bottom: 2px;
    line-height: 1.1;
}

.subtitle {
    color: #94a3b8;
    font-size: 0.8rem;
}

/* ZONE DU CARROUSEL : ÉTIRÉE VERTICALEMENT SUR LE VIDE */
.pack-stage {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    flex: 1;
    width: 100%;
    margin: 8px 0;
    min-height: 0;
}

.pack-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    max-height: 100%;
}

.set-code-badge {
    margin-top: 8px;
    background: rgba(245, 158, 11, 0.16);
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #fcd34d;
    padding: 2px 14px;
    border-radius: 999px;
    font-weight: 800;
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    z-index: 5;
}

.nav-arrow {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #f8fafc;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    font-size: 1.5rem;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: all 0.2s ease;
    z-index: 10;
    flex-shrink: 0;
}

.nav-arrow:hover {
    background: rgba(245, 158, 11, 0.2);
    border-color: #f59e0b;
    color: #fcd34d;
    transform: scale(1.1);
}

.pack-shiny-glow {
    position: absolute;
    width: 320px;
    height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle,
            rgba(250, 204, 21, 0.35) 0%,
            rgba(245, 158, 11, 0.15) 45%,
            transparent 70%);
    filter: blur(35px);
    pointer-events: none;
}

.pack-card {
    position: relative;
    width: auto;
    height: 100%;
    max-height: 420px;
    aspect-ratio: 3 / 4.2;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.3s ease;
    z-index: 2;
}

.pack-card:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    filter: grayscale(0.5);
}

.pack-card:hover:not(:disabled) {
    transform: translateY(-4px) scale(1.02);
}

.pack-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.65));
}

.bottom-actions-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-top: auto;
    padding-bottom: 4px;
}

.cta-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.empty-warning {
    color: #ef4444;
    font-size: 0.78rem;
    font-weight: 700;
}

.open-btn,
.ghost-btn,
.toggle-btn,
.secondary-btn {
    border: none;
    border-radius: 999px;
    padding: 8px 18px;
    font-weight: 700;
    cursor: pointer;
}

.open-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(90deg, #f59e0b, #fb923c);
    color: #111827;
    font-size: 0.95rem;
    box-shadow: 0 4px 16px rgba(245, 158, 11, 0.24);
}

.open-btn:disabled {
    background: rgba(255, 255, 255, 0.1);
    color: #64748b;
    box-shadow: none;
    cursor: not-allowed;
}

.open-btn .gem-icon {
    width: 16px;
    height: 16px;
}

.secondary-btn {
    background: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.12);
    font-size: 0.8rem;
}

.secondary-btn:hover {
    background: rgba(255, 255, 255, 0.15);
}

.ghost-btn,
.toggle-btn {
    background: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
}

.set-selector {
    text-align: center;
}

/* MODALE SÉLECTION SETS */
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
}

.close-btn {
    background: transparent;
    border: none;
    color: #cbd5e1;
    font-size: 1.2rem;
    cursor: pointer;
}

.set-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
    overflow-y: auto;
    padding-right: 6px;
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
    transition: all 0.2s ease;
}

.set-card-option:hover,
.set-card-option.active {
    background: rgba(245, 158, 11, 0.15);
    border-color: #f59e0b;
}

.set-thumb {
    width: 40px;
    height: 56px;
    object-fit: contain;
}

.set-info {
    display: flex;
    flex-direction: column;
}

.set-info strong {
    color: #f8fafc;
    font-size: 0.85rem;
}

.set-info span {
    color: #94a3b8;
    font-size: 0.72rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 110px;
}

.stack-viewport {
    width: 100%;
    height: 380px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.cards-stack {
    position: relative;
    width: 230px;
    height: 330px;
}

.stack-card-flipper {
    position: absolute;
    inset: 0;
    perspective: 1000px;
    cursor: pointer;
    transition: transform 0.2s ease, opacity 0.2s ease;
}

.stack-card-flipper.is-swiping {
    transform: translateX(-120%) rotate(-15deg) !important;
    opacity: 0;
}

.card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transform-style: preserve-3d;
}

.stack-card-flipper.flipped .card-inner {
    transform: rotateY(180deg);
}

.card-front,
.card-back {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    border-radius: 14px;
    overflow: visible;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.15);
}

.card-front img,
.card-back-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 14px;
}

.card-back {
    transform: rotateY(180deg);
    background: #121826;
    overflow: hidden;
}

/* PARTICULES D'EFFETS VISUELS */
.particles-container {
    position: absolute;
    inset: -50px;
    pointer-events: none;
    z-index: 20;
    overflow: visible;
}

.p-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 12px;
    height: 12px;
    clip-path: polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%);
    animation: starTwinkle 1.2s infinite ease-in-out;
}

.particles-container.blue .p-dot {
    background: #38bdf8;
    box-shadow: 0 0 10px #38bdf8, 0 0 20px #0284c7;
}

.particles-container.gold .p-dot {
    background: #facc15;
    box-shadow: 0 0 12px #facc15, 0 0 24px #eab308;
}

.gold-aura {
    position: absolute;
    inset: -15px;
    border-radius: 20px;
    background: radial-gradient(circle, rgba(250, 204, 21, 0.45) 0%, transparent 75%);
    filter: blur(14px);
    animation: auraGlow 1.2s infinite alternate ease-in-out;
}

.particles-container.iridescent .p-dot {
    background: linear-gradient(135deg, #f472b6, #38bdf8, #facc15);
    box-shadow: 0 0 12px #e879f9, 0 0 24px #38bdf8;
}

.iridescent-aura {
    position: absolute;
    inset: -18px;
    border-radius: 24px;
    background: radial-gradient(circle, rgba(232, 121, 249, 0.4) 0%, rgba(56, 189, 248, 0.3) 50%, transparent 75%);
    filter: blur(16px);
    animation: auraGlow 1s infinite alternate ease-in-out;
}

.particles-container.iridescent-ultra .p-dot {
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, #ffffff, #f472b6, #38bdf8, #facc15);
    box-shadow: 0 0 16px #ffffff, 0 0 28px #e879f9, 0 0 36px #38bdf8;
    animation: starTwinkle 0.8s infinite ease-in-out;
}

.iridescent-aura.ultra {
    inset: -30px;
    border-radius: 28px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(232, 121, 249, 0.6) 40%, rgba(56, 189, 248, 0.4) 70%, transparent 85%);
    filter: blur(20px);
    animation: auraGlow 0.6s infinite alternate ease-in-out;
}

.p-dot:nth-child(1) { transform: translate(-130px, -150px) scale(0.9); animation-delay: 0s; }
.p-dot:nth-child(2) { transform: translate(130px, -140px) scale(1.2); animation-delay: 0.2s; }
.p-dot:nth-child(3) { transform: translate(-140px, 130px) scale(1); animation-delay: 0.4s; }
.p-dot:nth-child(4) { transform: translate(135px, 140px) scale(0.8); animation-delay: 0.1s; }
.p-dot:nth-child(5) { transform: translate(-60px, -170px) scale(1.3); animation-delay: 0.3s; }
.p-dot:nth-child(6) { transform: translate(-150px, -30px) scale(0.9); animation-delay: 0.5s; }
.p-dot:nth-child(7) { transform: translate(150px, 20px) scale(1.1); animation-delay: 0.15s; }
.p-dot:nth-child(8) { transform: translate(50px, 170px) scale(0.8); animation-delay: 0.35s; }

@keyframes starTwinkle {
    0% { opacity: 0; transform: scale(0.2) rotate(0deg); }
    50% { opacity: 1; transform: scale(1.3) rotate(90deg); }
    100% { opacity: 0; transform: scale(0.2) rotate(180deg); }
}

@keyframes auraGlow {
    0% { opacity: 0.4; transform: scale(0.98); }
    100% { opacity: 0.9; transform: scale(1.05); }
}

.summary-stage {
    width: 100%;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 10px;
    margin-top: 12px;
    max-height: 420px;
    overflow-y: auto;
    padding: 4px;
}

.summary-card {
    position: relative;
    aspect-ratio: 5/7;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
}

.summary-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* DESIGN DES BADGES DE RARETÉS */
.badge-tag {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 900;
    letter-spacing: 0.05em;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.badge-tag.manga { background: #ffffff; color: #000000; }
.badge-tag.sp { background: #a855f7; color: #ffffff; }
.badge-tag.sec { background: #facc15; color: #000000; }
.badge-tag.sr { background: #38bdf8; color: #000000; }
.badge-tag.alt { background: #e879f9; color: #000000; }

.reveal-actions {
    display: flex;
    justify-content: center;
    margin-top: 14px;
}

.card-preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.88);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

.preview-card-wrapper {
    max-width: 340px;
    width: 85vw;
}

.preview-image {
    width: 100%;
    height: auto;
    border-radius: 16px;
}

/* MEDIA QUERIES MOBILE : DÉPLOIEMENT À 100% DE LA HAUTEUR */
@media (max-width: 768px) {
    .booster-shell {
        height: 100%;
        max-height: 100%;
        padding: 12px 14px;
    }
    .pack-stage {
        margin: 4px 0;
    }
    .pack-card {
        max-height: 50vh;
    }
    .pack-shiny-glow {
        width: 280px;
        height: 360px;
    }
    .hero-copy h1 {
        font-size: 1.35rem;
    }
    .nav-arrow {
        width: 36px;
        height: 36px;
        font-size: 1.3rem;
    }
}
</style>