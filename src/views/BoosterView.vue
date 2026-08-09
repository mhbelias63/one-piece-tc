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
                    <h1>Entre New World</h1>
                    <p class="subtitle">Ouvre tes cartes et découvre les secrets du chapitre.</p>
                </div>

                <div class="pack-stage">
                    <div class="pack-shiny-glow"></div>
                    <button class="pack-card" type="button" @click="openPack">
                        <img :src="currentPackImage" alt="Booster" class="pack-image" />
                    </button>
                </div>

                <div class="cta-block">
                    <button class="open-btn" type="button" @click="openPack">
                        <img src="/gem.png" alt="Gem" class="gem-icon" />
                        {{ selectedView === 'booster' ? 100 : 2400 }}
                    </button>
                    <span>Cliquer pour ouvrir</span>
                </div>

                <div class="set-selector">
                    <p>Choisir un set</p>
                    <div class="set-pills">
                        <button v-for="set in sets" :key="set" class="set-pill-option"
                            :class="{ active: set === selectedSetCode }" type="button" @click="selectedSetCode = set">
                            {{ set }}
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
                                <!-- FACE AVANT -->
                                <div class="card-front" :class="frontClass(card)">
                                    <img :src="card.image_url" :alt="card.name" />


                                    <!-- PARTICULES (affichées uniquement sur la carte du dessus) -->
                                    <template v-if="index === 0 && !showBack">
                                        <!-- 1. SEC + Alternative : Iridescent Ultra x2 (Priorité ultime) -->
                                        <div v-if="card?.rarity === 'SEC' && isAlternative(card)"
                                            class="particles-container iridescent-ultra">
                                            <div class="iridescent-aura ultra"></div>
                                            <span v-for="p in 32" :key="`sec-alt-${p}`" class="p-dot"></span>
                                        </div>

                                        <!-- 2. SEC classique (Non-alternative) : Doré strict -->
                                        <div v-else-if="card?.rarity === 'SEC'" class="particles-container gold">
                                            <div class="gold-aura"></div>
                                            <span v-for="p in 16" :key="`sec-${p}`" class="p-dot"></span>
                                        </div>

                                        <!-- 3. SR classique (Non-alternative) : Bleu strict -->
                                        <div v-else-if="card?.rarity === 'SR' && !isAlternative(card)"
                                            class="particles-container blue">
                                            <span v-for="p in 12" :key="`sr-${p}`" class="p-dot"></span>
                                        </div>

                                        <!-- 4. Autres Alternatives (R, UC, C, etc.) : Iridescent Standard -->
                                        <div v-else-if="isAlternative(card)" class="particles-container iridescent">
                                            <div class="iridescent-aura"></div>
                                            <span v-for="p in 16" :key="`alt-${p}`" class="p-dot"></span>
                                        </div>
                                    </template>
                                </div>

                                <!-- DOS DE LA CARTE -->
                                <div class="card-back">
                                    <img :src="getCardBack(card)" alt="Dos de carte" class="card-back-image" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <p class="hint-text">Clique sur la carte pour révéler la suivante</p>
            </div>

            <!-- 3. ÉTAPE RÉCAPITULATIF (TRIÉ DU PLUS RARE AU MOINS RARE) -->
            <div v-else-if="step === 'summary'" class="summary-stage">
                <div class="reveal-topbar">
                    <div>
                        <p class="eyebrow">Résultat de l'ouverture</p>
                        <h2>Cartes obtenues ({{ sortedDrawnCards.length }}) • Du plus rare au moins rare</h2>
                    </div>
                    <button class="ghost-btn" type="button" @click="resetToSelect">Retour</button>
                </div>

                <div class="summary-grid">
                    <div v-for="(card, index) in sortedDrawnCards" :key="index" class="summary-card"
                        @click="hoveredCard = card">
                        <img :src="card.image_url" :alt="card.name" />
                        <div v-if="card?.rarity === 'SR'" class="badge-tag sr">SR</div>
                        <div v-if="card?.rarity === 'SEC'" class="badge-tag sec">SEC</div>
                        <div v-if="isAlternative(card)" class="badge-tag alt">ALT</div>
                    </div>
                </div>

                <div class="reveal-actions">
                    <button class="open-btn" type="button" @click="resetToSelect">Terminer</button>
                </div>
            </div>

        </div>

        <!-- OVERLAY ZOOM -->
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
import { ref, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
)

const emit = defineEmits(['spend-gems'])

const step = ref('select')
const selectedView = ref('booster')
const showBack = ref(false)
const drawnCards = ref([])
const currentIndex = ref(0)
const isSwiping = ref(false)
const hoveredCard = ref(null)

const selectedSetCode = ref('OP09')
const sets = ['OP01', 'OP02', 'OP03', 'OP04', 'OP05', 'OP06', 'OP07', 'OP08', 'OP09']

const currentPackImage = computed(() => {
    const folder = selectedView.value === 'booster' ? 'booster' : 'display'
    const ext = selectedView.value === 'booster' ? 'png' : 'webp'
    try {
        return new URL(`../assets/images/${folder}/op09.${ext}`, import.meta.url).href
    } catch (e) {
        return ''
    }
})

const visibleStack = computed(() => {
    return drawnCards.value.slice(currentIndex.value)
})

const sortedDrawnCards = computed(() => {
    const rarityRank = {
        'SEC_ALT': 1,
        'ALT': 2,
        'SEC': 3,
        'SR': 4,
        'R': 5,
        'UC': 6,
        'C': 7,
        'L': 8
    }

    return [...drawnCards.value].sort((a, b) => {
        const getRank = (card) => {
            const alt = isAlternative(card)
            if (card?.rarity === 'SEC' && alt) return rarityRank['SEC_ALT']
            if (alt) return rarityRank['ALT']
            return rarityRank[card?.rarity] || 99
        }
        return getRank(a) - getRank(b)
    })
})

async function openPack() {
    const { data: allCards, error } = await supabase.from('cards').select('*')
    if (error || !allCards || allCards.length === 0) return

    const available = allCards.filter(card => card.set_id === selectedSetCode.value)
    const cardsToDrawFrom = available.length > 0 ? available : allCards

    const totalToDraw = selectedView.value === 'booster' ? 12 : 288
    const pack = []

    for (let i = 0; i < totalToDraw; i++) {
        const randomIndex = Math.floor(Math.random() * cardsToDrawFrom.length)
        pack.push({
            ...cardsToDrawFrom[randomIndex],
            drawId: `card-${i}-${Date.now()}`
        })
    }

    drawnCards.value = pack
    currentIndex.value = 0
    showBack.value = false
    step.value = 'reveal'

    emit('spend-gems', selectedView.value === 'booster' ? 100 : 2400)
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
    }, 300)
}

function finishOpening() {
    step.value = 'summary'
}

function resetToSelect() {
    step.value = 'select'
    hoveredCard.value = null
    currentIndex.value = 0
}

function frontClass(card) {
    return {
        sr: card?.rarity === 'SR',
        sec: card?.rarity === 'SEC',
        alt: isAlternative(card)
    }
}

function isAlternative(card) {
    return card?.id?.includes('_ALT_') ||
        card?.name?.toLowerCase().includes('(parallel)') ||
        card?.name?.toLowerCase().includes('alternative')
}

function getCardBack(card) {
    if (!card) return '/CardBackRegular.png'
    const isLeader =
        (card?.type && card.type.toLowerCase().includes('leader')) ||
        (card?.category && card.category.toLowerCase().includes('leader'))
    return isLeader ? '/CardBackLeader.png' : '/CardBackRegular.png'
}

function getStackDepthStyle(index) {
    if (index > 4) return { display: 'none' }
    return {
        transform: `translateY(${index * -3}px) scale(${1 - index * 0.02})`,
        zIndex: 100 - index
    }
}
</script>

<style scoped>
.booster-page {
    width: 100%;
}

.booster-shell {
    position: relative;
    width: 100%;
    min-height: 760px;
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
        radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.18), transparent 34%),
        linear-gradient(135deg, #060816 0%, #0c1429 100%);
    overflow: hidden;
    padding: 28px 32px 40px;
}

.hero-topbar,
.reveal-topbar {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
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
    padding: 10px 18px;
    border-radius: 999px;
    cursor: pointer;
    font-weight: 700;
    transition: background 0.2s ease, color 0.2s ease;
}

.switch-btn.active {
    background: rgba(245, 158, 11, 0.18);
    color: #f8fafc;
}

.status-pill {
    padding: 8px 16px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: #cbd5e1;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.8rem;
}

.hero-copy {
    text-align: center;
    margin-top: 30px;
}

.eyebrow {
    color: #f59e0b;
    font-size: 0.8rem;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    margin-bottom: 10px;
}

.hero-copy h1 {
    font-size: clamp(2.2rem, 3.3vw, 3.2rem);
    font-weight: 800;
    color: #f8fafc;
    margin-bottom: 10px;
}

.subtitle {
    color: #94a3b8;
    font-size: 1rem;
    max-width: 540px;
    margin: 0 auto;
}

/* PACKS */
.pack-stage {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 34px;
    width: 100%;
    min-height: 400px;
}

.pack-shiny-glow {
    position: absolute;
    width: 320px;
    height: 420px;
    border-radius: 50%;
    background: radial-gradient(circle,
            rgba(250, 204, 21, 0.45) 0%,
            rgba(245, 158, 11, 0.25) 45%,
            transparent 70%);
    filter: blur(40px);
    animation: shinyPulse 3s infinite alternate ease-in-out;
    pointer-events: none;
}

@keyframes shinyPulse {
    0% {
        transform: scale(0.9);
        opacity: 0.6;
    }

    100% {
        transform: scale(1.15);
        opacity: 1;
    }
}

.pack-card {
    position: relative;
    width: 280px;
    height: 390px;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.3s ease;
    z-index: 2;
}

.pack-card:hover {
    transform: translateY(-8px) scale(1.02);
}

.pack-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.6));
}

.cta-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-top: 28px;
}

.open-btn,
.ghost-btn,
.toggle-btn {
    border: none;
    border-radius: 999px;
    padding: 12px 24px;
    font-weight: 700;
    cursor: pointer;
}

.open-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(90deg, #f59e0b, #fb923c);
    color: #111827;
    box-shadow: 0 8px 28px rgba(245, 158, 11, 0.24);
}

.open-btn .gem-icon {
    width: 20px;
    height: 20px;
}

.ghost-btn,
.toggle-btn {
    background: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
}

.set-selector {
    margin-top: 34px;
    text-align: center;
}

.set-pills {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
}

.set-pill-option {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #e2e8f0;
    padding: 10px 14px;
    border-radius: 999px;
    cursor: pointer;
}

.set-pill-option.active {
    background: rgba(245, 158, 11, 0.16);
    color: #fcd34d;
    border-color: rgba(245, 158, 11, 0.4);
}

/* RÉVÉLATION & PILE 3D */
.stack-viewport {
    width: 100%;
    height: 450px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 20px;
}

.cards-stack {
    position: relative;
    width: 260px;
    height: 370px;
}

.stack-card-flipper {
    position: absolute;
    inset: 0;
    perspective: 1000px;
    cursor: pointer;
    transition: transform 0.3s ease, opacity 0.3s ease;
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
    border-radius: 16px;
    overflow: visible;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.15);
}

.card-front img,
.card-back-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 16px;
}

.card-back {
    transform: rotateY(180deg);
    background: #121826;
    overflow: hidden;
}

/* SYSTÈME DE PARTICULES (EXTÉRIEUR UNIQUEMENT) */
.particles-container {
    position: absolute;
    inset: -60px;
    pointer-events: none;
    z-index: 20;
    overflow: visible;
}

.p-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 14px;
    height: 14px;
    clip-path: polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%);
    animation: starTwinkle 1.2s infinite ease-in-out;
}

/* 1. SR : Bleues */
.particles-container.blue .p-dot {
    background: #38bdf8;
    box-shadow: 0 0 10px #38bdf8, 0 0 20px #0284c7;
}

/* 2. SEC : Dorées */
.particles-container.gold .p-dot {
    background: #facc15;
    box-shadow: 0 0 12px #facc15, 0 0 24px #eab308;
}

.gold-aura {
    position: absolute;
    inset: -15px;
    border-radius: 24px;
    background: radial-gradient(circle, rgba(250, 204, 21, 0.45) 0%, transparent 75%);
    filter: blur(16px);
    animation: auraGlow 1.2s infinite alternate ease-in-out;
}

/* 3. ALTERNATIVE : Iridescent Standard */
.particles-container.iridescent .p-dot {
    background: linear-gradient(135deg, #f472b6, #38bdf8, #facc15);
    box-shadow: 0 0 12px #e879f9, 0 0 24px #38bdf8;
}

.iridescent-aura {
    position: absolute;
    inset: -20px;
    border-radius: 28px;
    background: radial-gradient(circle, rgba(232, 121, 249, 0.4) 0%, rgba(56, 189, 248, 0.3) 50%, transparent 75%);
    filter: blur(18px);
    animation: auraGlow 1s infinite alternate ease-in-out;
}

/* 4. SEC + ALTERNATIVE : Iridescent Ultra x2 */
.particles-container.iridescent-ultra .p-dot {
    width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #ffffff, #f472b6, #38bdf8, #facc15);
    box-shadow: 0 0 16px #ffffff, 0 0 28px #e879f9, 0 0 36px #38bdf8;
    animation: starTwinkle 0.8s infinite ease-in-out;
}

.iridescent-aura.ultra {
    inset: -35px;
    border-radius: 32px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(232, 121, 249, 0.6) 40%, rgba(56, 189, 248, 0.4) 70%, transparent 85%);
    filter: blur(22px);
    animation: auraGlow 0.6s infinite alternate ease-in-out;
}

/* POSITIONS STRICTEMENT À L'EXTÉRIEUR DU CADRE */
.p-dot:nth-child(1) {
    transform: translate(-155px, -180px) scale(0.9);
    animation-delay: 0s;
}

.p-dot:nth-child(2) {
    transform: translate(155px, -170px) scale(1.2);
    animation-delay: 0.2s;
}

.p-dot:nth-child(3) {
    transform: translate(-165px, 160px) scale(1);
    animation-delay: 0.4s;
}

.p-dot:nth-child(4) {
    transform: translate(160px, 175px) scale(0.8);
    animation-delay: 0.1s;
}

.p-dot:nth-child(5) {
    transform: translate(-70px, -210px) scale(1.3);
    animation-delay: 0.3s;
}

.p-dot:nth-child(6) {
    transform: translate(-185px, -40px) scale(0.9);
    animation-delay: 0.5s;
}

.p-dot:nth-child(7) {
    transform: translate(185px, 30px) scale(1.1);
    animation-delay: 0.15s;
}

.p-dot:nth-child(8) {
    transform: translate(60px, 210px) scale(0.8);
    animation-delay: 0.35s;
}

.p-dot:nth-child(9) {
    transform: translate(-120px, -200px) scale(1.1);
    animation-delay: 0.25s;
}

.p-dot:nth-child(10) {
    transform: translate(130px, -190px) scale(0.7);
    animation-delay: 0.45s;
}

.p-dot:nth-child(11) {
    transform: translate(-140px, 190px) scale(1.2);
    animation-delay: 0.05s;
}

.p-dot:nth-child(12) {
    transform: translate(145px, 160px) scale(0.9);
    animation-delay: 0.3s;
}

.p-dot:nth-child(13) {
    transform: translate(-180px, 80px) scale(0.8);
    animation-delay: 0.5s;
}

.p-dot:nth-child(14) {
    transform: translate(175px, -90px) scale(1.1);
    animation-delay: 0.2s;
}

.p-dot:nth-child(15) {
    transform: translate(-180px, -110px) scale(0.8);
    animation-delay: 0.4s;
}

.p-dot:nth-child(16) {
    transform: translate(180px, -110px) scale(1.3);
    animation-delay: 0.1s;
}

/* Coordonnées supplémentaires (mode Ultra) */
.p-dot:nth-child(17) {
    transform: translate(-80px, 210px) scale(1.2);
    animation-delay: 0.08s;
}

.p-dot:nth-child(18) {
    transform: translate(90px, -210px) scale(1);
    animation-delay: 0.18s;
}

.p-dot:nth-child(19) {
    transform: translate(-195px, 0px) scale(1.1);
    animation-delay: 0.28s;
}

.p-dot:nth-child(20) {
    transform: translate(195px, -30px) scale(1.4);
    animation-delay: 0.38s;
}

.p-dot:nth-child(21) {
    transform: translate(-140px, -170px) scale(0.7);
    animation-delay: 0.48s;
}

.p-dot:nth-child(22) {
    transform: translate(140px, -160px) scale(1.3);
    animation-delay: 0.12s;
}

.p-dot:nth-child(23) {
    transform: translate(-170px, 130px) scale(0.9);
    animation-delay: 0.22s;
}

.p-dot:nth-child(24) {
    transform: translate(170px, 120px) scale(1.1);
    animation-delay: 0.32s;
}

.p-dot:nth-child(25) {
    transform: translate(0px, -220px) scale(1.4);
    animation-delay: 0.02s;
}

.p-dot:nth-child(26) {
    transform: translate(0px, 220px) scale(1.2);
    animation-delay: 0.14s;
}

.p-dot:nth-child(27) {
    transform: translate(-190px, -140px) scale(1);
    animation-delay: 0.24s;
}

.p-dot:nth-child(28) {
    transform: translate(190px, -140px) scale(0.8);
    animation-delay: 0.34s;
}

.p-dot:nth-child(29) {
    transform: translate(-190px, 140px) scale(1.3);
    animation-delay: 0.44s;
}

.p-dot:nth-child(30) {
    transform: translate(190px, 140px) scale(1.1);
    animation-delay: 0.06s;
}

.p-dot:nth-child(31) {
    transform: translate(-30px, -215px) scale(0.9);
    animation-delay: 0.16s;
}

.p-dot:nth-child(32) {
    transform: translate(30px, 215px) scale(1.2);
    animation-delay: 0.26s;
}

@keyframes starTwinkle {
    0% {
        opacity: 0;
        transform: scale(0.2) rotate(0deg);
    }

    50% {
        opacity: 1;
        transform: scale(1.4) rotate(90deg);
    }

    100% {
        opacity: 0;
        transform: scale(0.2) rotate(180deg);
    }
}

@keyframes auraGlow {
    0% {
        opacity: 0.4;
        transform: scale(0.98);
    }

    100% {
        opacity: 0.9;
        transform: scale(1.05);
    }
}

.hint-text {
    text-align: center;
    color: #94a3b8;
    font-size: 0.9rem;
    margin-top: 20px;
}

/* RÉCAPITULATIF */
.summary-stage {
    width: 100%;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 16px;
    margin-top: 24px;
    max-height: 520px;
    overflow-y: auto;
    padding: 10px;
}

.summary-card {
    position: relative;
    aspect-ratio: 5/7;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: transform 0.2s ease;
}

.summary-card:hover {
    transform: scale(1.05);
}

.summary-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.badge-tag {
    position: absolute;
    top: 6px;
    right: 6px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 900;
    color: #000;
}

.badge-tag.sr {
    background: #38bdf8;
}

.badge-tag.sec {
    background: #facc15;
}

.badge-tag.alt {
    background: #e879f9;
}

.reveal-actions {
    display: flex;
    justify-content: center;
    margin-top: 30px;
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
    max-width: 380px;
    width: 85vw;
}

.preview-image {
    width: 100%;
    height: auto;
    border-radius: 18px;
}
</style>