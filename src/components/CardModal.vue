<template>
    <div v-if="card" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">

            <!-- En-tête -->
            <div class="modal-header">
                <button class="back-btn" @click="$emit('close')">&larr;</button>

                <div class="header-titles">
                    <h2 class="card-title">{{ card.name }}</h2>
                    <div class="card-subtitle">
                        {{ formatCardType(card.type) || 'Leader' }}
                        <template v-if="card.attribute"> | {{ card.attribute }}</template>
                    </div>
                </div>

                <button class="favorite-btn" @click="isFavorite = !isFavorite">
                    <span :class="{ 'is-fav': isFavorite }">&#9733;</span>
                </button>
            </div>

            <div class="modal-body">
                <!-- Image principale -->
                <div class="image-container" @click="showZoom = true">
                    <img :src="card.image_url" :alt="card.name" class="modal-image" />
                    
                    <button class="zoom-btn" title="Agrandir la carte">
                        <svg class="zoom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            <line x1="11" y1="8" x2="11" y2="14"></line>
                            <line x1="8" y1="11" x2="14" y2="11"></line>
                        </svg>
                    </button>
                </div>

                <!-- Détails & Stats -->
                <div class="details-container">
                    <div class="stats-list">
                        <div class="stat-row" v-if="card.rarity">
                            <span class="stat-label">Rareté</span>
                            <span class="badge rarity-badge">{{ card.rarity }}</span>
                        </div>

                        <div class="stat-row" v-if="card.cost !== null">
                            <span class="stat-label">Coût</span>
                            <span class="stat-value">{{ card.cost }}</span>
                        </div>

                        <div class="stat-row" v-if="card.power !== null">
                            <span class="stat-label">Puissance</span>
                            <span class="stat-value">{{ card.power }}</span>
                        </div>

                        <div class="stat-row" v-if="card.type">
                            <span class="stat-label">Type</span>
                            <span class="stat-value">{{ formatCardType(card.type) }}</span>
                        </div>

                        <div class="stat-row" v-if="card.color">
                            <span class="stat-label">Couleur</span>
                            <div class="badge-row">
                                <span class="badge color-badge" :style="getColorStyle(card.color)">
                                    {{ card.color }}
                                </span>
                            </div>
                        </div>

                        <div class="stat-row" v-if="card.attribute">
                            <span class="stat-label">Attribut</span>
                            <div class="attribute-tag">
                                <img :src="getAttributeIconUrl(card.attribute)" :alt="card.attribute" class="attribute-icon" />
                                <span>{{ card.attribute }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="effect-box" v-if="hasEffect(parsedEffects.mainEffect)">
                        <div class="effect-title">Effet</div>
                        <div class="effect-text" v-html="formatEffectText(parsedEffects.mainEffect)"></div>
                    </div>

                    <div class="trigger-container" v-if="parsedEffects.triggerEffect">
                        <div class="trigger-badge">
                            <span>Trigger</span>
                        </div>
                        <div class="trigger-box">
                            <div class="effect-text" v-html="formatEffectText(parsedEffects.triggerEffect)"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer">
                <div class="owned-section">
                    <span class="footer-label">Possédés</span>
                    <div class="owned-count">
                        <span>{{ card.owned_count || 4 }} / 4</span>
                    </div>
                </div>

                <div class="quantity-selector">
                    <button class="qty-btn" @click="handleDecrease">-</button>
                    <span class="qty-value">{{ quantity }}</span>
                    <button class="qty-btn" @click="handleIncrease">+</button>
                </div>

                <div class="action-section">
                    <button class="add-deck-btn" @click="openDeckSelection">
                        Ajouter au deck
                    </button>
                </div>
            </div>

        </div>

        <!-- Sous-composant Zoom -->
        <CardZoomModal 
            v-if="showZoom" 
            :card="card" 
            :isAlternativeCard="isAlternativeCard"
            @close="showZoom = false" 
        />

        <!-- MODAL SÉLECTION DE DECK -->
        <div v-if="showDeckPicker" class="picker-overlay" @click.self="showDeckPicker = false">
            <div class="picker-modal">
                <div class="picker-header">
                    <h3>Choisir un deck</h3>
                    <button class="close-picker-btn" @click="showDeckPicker = false">×</button>
                </div>

                <div class="decks-picker-grid">
                    <div 
                        v-for="deck in userDecks" 
                        :key="deck.id" 
                        class="picker-deck-card"
                        :class="{ 'is-disabled': isDeckBlocked(deck) }"
                        :style="deck.leader?.image_url ? { backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.5), rgba(15,23,42,0.95)), url(${deck.leader.image_url})` } : {}"
                        @click="addCardToDeck(deck)"
                    >
                        <div class="picker-deck-info">
                            <h4>{{ deck.name || 'Deck sans nom' }}</h4>
                            <div class="picker-deck-count">
                                <span>{{ getDeckCardsCount(deck) }} / 50 cartes</span>
                                <small v-if="getCardCountInDeck(deck, card.id) + quantity > 4" class="err-msg">Max 4 ex.</small>
                                <small v-else-if="getDeckCardsCount(deck) + quantity > 50" class="err-msg">Plein !</small>
                            </div>
                        </div>
                    </div>

                    <div class="picker-deck-card create-card" @click="goToDecksPage">
                        <span class="plus-icon">+</span>
                        <span>Créer un nouveau deck</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { fetchUserDecks, saveUserDeck } from '../services/playerService'
import CardZoomModal from './CardZoomModal.vue'

const props = defineProps({
    card: Object
})
const emit = defineEmits(['close', 'add-to-deck'])
const router = useRouter()

const quantity = ref(1)
const isFavorite = ref(false)
const showZoom = ref(false)
const showDeckPicker = ref(false)
const userDecks = ref([])

const isAlternativeCard = computed(() => {
    if (!props.card?.id) return false
    const id = props.card.id.toLowerCase()
    return id.includes('_alt_') || id.includes('-alt') || id.includes('_alt')
})

const handleIncrease = () => {
    const max = props.card?.owned_count || 4
    if (quantity.value < max) quantity.value++
}

const handleDecrease = () => {
    if (quantity.value > 1) quantity.value--
}

async function openDeckSelection() {
    const loaded = await fetchUserDecks()
    if (loaded && loaded.length) {
        userDecks.value = loaded
    } else {
        const local = window.localStorage.getItem('onepiece-decks')
        userDecks.value = local ? JSON.parse(local) : []
    }
    showDeckPicker.value = true
}

function getDeckCardsCount(deck) {
    if (!deck || !deck.cards) return 0
    return deck.cards.reduce((sum, item) => sum + (item.count || 1), 0)
}

// Extraction de l'ID de base
function getBaseCardId(cardOrId) {
    const id = typeof cardOrId === 'string' ? cardOrId : cardOrId?.id
    if (!id) return ''
    return String(id).split(/_ALT/i)[0].split(/-ALT/i)[0]
}

// Compte la présence cumulée d'une carte dans un deck donné
function getCardCountInDeck(deck, cardId) {
    if (!deck || !deck.cards) return 0
    const targetBaseId = getBaseCardId(cardId)

    return deck.cards.reduce((sum, item) => {
        const itemCard = item.card || item
        if (getBaseCardId(itemCard) === targetBaseId) {
            return sum + (item.count || 1)
        }
        return sum
    }, 0)
}

function isDeckBlocked(deck) {
    const totalCount = getDeckCardsCount(deck)
    const cardBaseQty = getCardCountInDeck(deck, props.card.id)
    
    // Bloqué si le total dépasse 50 OU si le quota cumulé (original + alt) dépasse 4
    return (totalCount + quantity.value > 50) || (cardBaseQty + quantity.value > 4)
}

async function addCardToDeck(deck) {
    if (isDeckBlocked(deck)) return

    if (!deck.cards) deck.cards = []
    
    const existingIndex = deck.cards.findIndex(item => item.id === props.card.id)
    if (existingIndex > -1) {
        deck.cards[existingIndex].count = (deck.cards[existingIndex].count || 1) + quantity.value
    } else {
        deck.cards.push({
            ...props.card,
            count: quantity.value
        })
    }

    await saveUserDeck(deck)
    
    const localDecks = window.localStorage.getItem('onepiece-decks')
    if (localDecks) {
        try {
            const parsed = JSON.parse(localDecks)
            const idx = parsed.findIndex(d => d.id === deck.id)
            if (idx > -1) parsed[idx] = deck
            else parsed.push(deck)
            window.localStorage.setItem('onepiece-decks', JSON.stringify(parsed))
        } catch {
            window.localStorage.setItem('onepiece-decks', JSON.stringify([deck]))
        }
    }

    // Ajout fluide sans alerte pop-up
    emit('add-to-deck', { card: props.card, quantity: quantity.value, deck })
    showDeckPicker.value = false
    emit('close')
}

function goToDecksPage() {
    showDeckPicker.value = false
    emit('close')
    router.push('/decks')
}

function getColorStyle(colorInput) {
    if (!colorInput) return { backgroundColor: '#4b5563' }

    const palette = {
        red: '#dc2626',
        green: '#16a34a',
        blue: '#2563eb',
        purple: '#9333ea',
        black: '#18181b',
        yellow: '#eab308'
    }

    const colors = colorInput
        .toLowerCase()
        .split(/[\s\/,]+/)
        .map(c => c.trim())
        .filter(c => palette[c])

    if (colors.length === 0) return { backgroundColor: '#4b5563' }
    if (colors.length === 1) return { backgroundColor: palette[colors[0]] }

    return {
        background: `linear-gradient(135deg, ${palette[colors[0]]} 50%, ${palette[colors[1]]} 50%)`
    }
}

const parsedEffects = computed(() => {
    if (!props.card?.effect) return { mainEffect: '', triggerEffect: '' }

    const text = props.card.effect
    const triggerMatch = text.match(/(?:\[Trigger\]|Trigger:?)\s*(.*)/i)

    if (triggerMatch) {
        return {
            mainEffect: text.substring(0, triggerMatch.index).trim(),
            triggerEffect: triggerMatch[1].trim()
        }
    }

    return { mainEffect: text, triggerEffect: '' }
})

function formatEffectText(text) {
    if (!text) return ''

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

function formatCardType(typeInput) {
    if (!typeInput || typeInput.includes('/')) return typeInput || ''

    const knownSubtypes = ["Whitebeard Pirates", "Navy", "Straw Hat Crew", "Supernovas", "FILM", "Impel Down", "Cross Guild", "CP0", "Revolutionary Army"]
    let formatted = typeInput

    for (const sub of knownSubtypes) {
        const regex = new RegExp(`(?<=[a-zA-Z0-9])\\s+(${sub})`, 'g')
        if (regex.test(formatted)) {
            formatted = formatted.replace(regex, '/$1')
            break
        }
    }
    return formatted
}

function getAttributeIconUrl(attribute) {
    if (!attribute) return ''
    const formattedAttr = attribute.trim().charAt(0).toUpperCase() + attribute.trim().slice(1).toLowerCase()
    return `https://static.dotgg.gg/onepiece/icon/${formattedAttr}.webp`
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
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 20px;
    box-sizing: border-box;
}

.modal-content {
    background-color: #0b0f19;
    border-radius: 20px;
    width: 100%;
    max-width: 650px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9);
    border: 1px solid #1f293d;
    padding: 24px;
    color: #f3f4f6;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
}

.back-btn, .favorite-btn {
    background: none;
    border: none;
    color: #9ca3af;
    font-size: 1.5rem;
    cursor: pointer;
    transition: color 0.2s;
}

.back-btn:hover { color: #fff; }
.favorite-btn:hover { color: #facc15; }
.is-fav { color: #facc15; }

.header-titles { text-align: center; }

.card-title {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 700;
    color: #ffffff;
}

.card-subtitle {
    color: #9ca3af;
    font-size: 0.85rem;
    margin-top: 2px;
}

.modal-body {
    display: flex;
    gap: 24px;
}

.image-container {
    flex: 1;
    max-width: 250px;
    position: relative;
    cursor: pointer;
}

.modal-image {
    width: 100%;
    border-radius: 12px;
    border: 1px solid #1e293b;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
    display: block;
    transition: transform 0.2s;
}

.image-container:hover .modal-image { transform: scale(1.02); }

.zoom-btn {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, transform 0.2s;
}

.zoom-btn:hover {
    background: rgba(0, 0, 0, 0.75);
    transform: scale(1.1);
}

.zoom-icon {
    width: 18px;
    height: 18px;
    color: #ffffff;
}

.details-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.stats-list { display: flex; flex-direction: column; }

.stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.9rem;
}

.stat-label { color: #9ca3af; }
.stat-value { font-weight: 600; color: #ffffff; }

.rarity-badge {
    background-color: #ea580c;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 800;
    font-size: 0.75rem;
}

.badge-row { display: flex; gap: 6px; }

.color-badge {
    color: white;
    padding: 3px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 700;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

.attribute-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
}

.attribute-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
}

.effect-box {
    background-color: rgba(15, 23, 42, 0.6);
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 12px;
}

.effect-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #9ca3af;
    margin-bottom: 6px;
}

.effect-text {
    font-size: 0.85rem;
    line-height: 1.5;
    color: #e2e8f0;
}

:deep(.badge-orange-hexagon) {
    display: inline-block;
    background-color: #f97316;
    color: #fff;
    padding: 2px 14px;
    clip-path: polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%);
    font-weight: bold;
    font-size: 0.8rem;
    margin: 0 4px 2px 0;
}

.trigger-container {
    margin-top: 5px;
    position: relative;
}

.trigger-badge {
    display: inline-block;
    background-color: #eab308;
    color: #000;
    font-weight: 900;
    font-size: 0.9rem;
    padding: 2px 16px 2px 10px;
    transform: skewX(-15deg);
    margin-bottom: -5px;
    margin-left: 5px;
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
    padding: 12px;
    border-radius: 0 6px 6px 6px;
    position: relative;
    z-index: 1;
}

.modal-footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #1f293d;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.footer-label {
    display: block;
    font-size: 0.75rem;
    color: #9ca3af;
    margin-bottom: 4px;
}

.owned-count {
    font-weight: 700;
    font-size: 0.95rem;
    color: #f3f4f6;
}

.quantity-selector {
    display: flex;
    align-items: center;
    gap: 12px;
    background-color: #030712;
    border: 1px solid #1f293d;
    padding: 6px 12px;
    border-radius: 50px;
}

.qty-btn {
    background: none;
    border: none;
    color: #9ca3af;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
}

.qty-btn:hover { color: #fff; }

.qty-value {
    font-weight: 700;
    font-size: 0.9rem;
    min-width: 16px;
    text-align: center;
}

.action-section {
    flex: 1;
    max-width: 180px;
}

.add-deck-btn {
    width: 100%;
    background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(185, 28, 28, 0.3);
    transition: transform 0.1s, opacity 0.2s;
}

.add-deck-btn:hover { opacity: 0.95; }
.add-deck-btn:active { transform: scale(0.97); }

/* MODAL SELECTION DU DECK */
.picker-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
}

.picker-modal {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 20px;
    padding: 24px;
    width: 100%;
    max-width: 520px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9);
}

.picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.picker-header h3 {
    color: #ffffff;
    font-size: 1.2rem;
    font-weight: 800;
    margin: 0;
}

.close-picker-btn {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 1.5rem;
    cursor: pointer;
}

.decks-picker-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.picker-deck-card {
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background-size: cover;
    background-position: center top;
    background-color: #1e293b;
    padding: 16px;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    cursor: pointer;
    transition: transform 0.2s, border-color 0.2s;
}

.picker-deck-card:hover:not(.is-disabled) {
    transform: translateY(-3px);
    border-color: #f59e0b;
}

.picker-deck-card.is-disabled {
    opacity: 0.4;
    cursor: not-allowed;
    border-color: rgba(239, 68, 68, 0.4);
}

.picker-deck-info h4 {
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 800;
  margin: 0 0 4px 0;
  text-shadow: 0 1px 4px rgba(0,0,0,0.9);
}

.picker-deck-count {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #fcd34d;
    font-size: 0.8rem;
    font-weight: 700;
}

.err-msg {
    color: #ef4444;
    font-weight: 800;
}

.create-card {
    border: 1px dashed rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.02);
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #94a3b8;
    font-weight: 700;
    font-size: 0.85rem;
    text-align: center;
}

.create-card:hover {
    border-color: #f59e0b;
    color: #ffffff;
}

.plus-icon {
    font-size: 1.8rem;
    color: #f59e0b;
    line-height: 1;
}

@media (max-width: 640px) {
    .modal-body { flex-direction: column; }
    .image-container { max-width: 100%; display: flex; justify-content: center; }
    .modal-image { max-width: 200px; }
    .modal-footer { flex-direction: column; align-items: stretch; }
    .action-section { max-width: 100%; }
    .decks-picker-grid { grid-template-columns: 1fr; }
}
</style>