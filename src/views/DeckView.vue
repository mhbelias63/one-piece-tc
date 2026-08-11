<template>
    <div class="deck-page">
        <header class="deck-hero">
            <div>
                <p class="eyebrow">Decks</p>
                <h1>Gestion de vos decks</h1>
                <p class="hero-copy">Organise tes decks, choisis un leader et prépare ton prochain combat.</p>
            </div>
            <div class="search-actions">
                <div class="search-box">
                    <span class="search-icon">⌕</span>
                    <input v-model="searchDecks" type="text" placeholder="Rechercher un deck..." class="search-input" />
                </div>

                <button class="secondary-btn" type="button" @click="toggleSelectionMode">
                    {{ isSelectionMode ? 'Annuler' : 'Sélectionner' }}
                </button>

                <button 
                    v-if="isSelectionMode" 
                    class="delete-btn" 
                    type="button" 
                    :disabled="selectedDeckIds.length === 0"
                    @click="showBatchDeleteModal = true"
                >
                    Supprimer ({{ selectedDeckIds.length }})
                </button>

                <button v-else class="primary-btn" type="button" @click="showCreateModal = true">Créer un deck</button>
            </div>
        </header>

        <!-- 1. DASHBOARD DES DECKS -->
        <section v-if="!editingDeckId" class="deck-dashboard">
            <div class="deck-grid">
                <div 
                    v-for="deck in filteredDecks" 
                    :key="deck.id" 
                    class="deck-card-wrapper"
                    :class="{ 'selectable': isSelectionMode, 'selected': selectedDeckIds.includes(deck.id) }"
                    @click="handleDeckClick(deck)"
                >
                    <div v-if="isSelectionMode" class="checkbox-badge">
                        <input 
                            type="checkbox" 
                            :checked="selectedDeckIds.includes(deck.id)" 
                            @click.stop="toggleDeckSelection(deck.id)"
                        />
                    </div>

                    <DeckCard 
                        :deck="deck" 
                        :count="deckCardCount(deck)"
                        @click="handleDeckClick(deck)" 
                        @delete="deckToDelete = $event" 
                    />
                </div>

                <article v-if="!isSelectionMode" class="deck-card-empty" @click="showCreateModal = true">
                    <div class="empty-state-inner">
                        <span class="empty-icon">+</span>
                        <p>Créer un nouveau deck</p>
                    </div>
                </article>
            </div>
        </section>

        <!-- 2. ÉDITEUR DE DECK -->
        <section v-else class="deck-editor">
            <div class="editor-header">
                <button class="secondary-btn" type="button" @click="exitEditor">← Retour</button>
                <div>
                    <h2>Éditeur : {{ activeDeck?.name }}</h2>
                    <p>{{ activeDeck ? deckCardCount(activeDeck) : 0 }} / 50 cartes (hors Leader)</p>
                </div>
            </div>

            <div class="editor-body" v-if="activeDeck">
                <div class="deck-current-panel">
                    <!-- LEADER -->
                    <div class="leader-panel">
                        <div class="panel-title">Leader</div>
                        <div class="leader-slot" @click="activateLeaderSelection">
                            <template v-if="activeDeck.leader">
                                <div class="leader-img-wrapper">
                                    <img v-if="activeDeck.leader.image_url" :src="activeDeck.leader.image_url"
                                        :alt="activeDeck.leader.name" />
                                </div>
                                <div class="leader-info">
                                    <strong>{{ activeDeck.leader.name }}</strong>
                                    <span class="badge rarity">{{ activeDeck.leader.rarity || 'L' }}</span>
                                </div>
                            </template>
                            <template v-else>
                                <div class="leader-placeholder">Choisir un leader</div>
                            </template>
                        </div>
                    </div>

                    <!-- ÉVENTAIL CARTES -->
                    <div class="cards-panel">
                        <div class="panel-title">Cartes du deck ({{ groupedDeckCards.length }} types)</div>
                        <div class="deck-cards-fan-container">
                            <template v-if="groupedDeckCards.length">
                                <DeckFanStack v-for="group in groupedDeckCards" :key="group.baseId"
                                    :card="group.mainCard" :versions="group.versions"
                                    @click="openCardModal(group.mainCard)"
                                    @remove="removeLastVersionOfGroup(group)" />
                            </template>
                            <div v-else class="empty-list">Aucune carte ajoutée. Sélectionne une carte compatible dans le catalogue.</div>
                        </div>
                    </div>
                </div>

                <!-- CATALOGUE -->
                <div class="catalog-panel">
                    <div class="catalog-header">
                        <div>
                            <h3>Catalogue</h3>
                            <p v-if="activeDeck.leader">Cartes compatibles avec {{ activeDeck.leader.name }}</p>
                            <p v-else>Sélectionne d'abord un Leader pour afficher les cartes compatibles.</p>
                        </div>
                        <button class="secondary-btn" type="button" @click="showLeaderSelection = !showLeaderSelection">
                            {{ showLeaderSelection ? 'Voir toutes' : 'Voir leaders' }}
                        </button>
                    </div>

                    <div class="search-box catalog-search">
                        <span class="search-icon">⌕</span>
                        <input v-model="searchCatalog" type="text" placeholder="Rechercher une carte..."
                            class="search-input" />
                    </div>

                    <div class="card-catalog-grid">
                        <DeckCatalogCard v-for="card in filteredCatalogCards" :key="card.id" :card="card"
                            :count="cardCount(card)" :isLeader="isLeaderCard(card)" :isDisabled="isCardDisabled(card)"
                            @click="openCardModal(card)" />
                    </div>
                </div>
            </div>
        </section>

        <!-- MODALES -->
        <CreateDeckModal v-if="showCreateModal" title="Nouveau deck"
            description="Donne un nom à ton deck et commence l’édition." placeholder="Nom du deck" confirmText="Créer"
            @close="showCreateModal = false" @confirm="createDeck" />

        <CreateDeckModal v-if="deckToDelete" title="Supprimer le deck"
            :description="`Es-tu sûr de vouloir supprimer '${deckToDelete.name}' ?`" :isInput="false" :isDanger="true"
            cancelText="Non, annuler" confirmText="Oui, supprimer" @close="deckToDelete = null"
            @confirm="deleteDeckConfirmed" />

        <CreateDeckModal v-if="showBatchDeleteModal" title="Suppression multiple"
            :description="`Es-tu sûr de vouloir supprimer définitivement ces ${selectedDeckIds.length} decks ?`" :isInput="false" :isDanger="true"
            cancelText="Annuler" confirmText="Oui, tout supprimer" @close="showBatchDeleteModal = false"
            @confirm="deleteSelectedDecks" />

        <DeckCardModal v-if="selectedModalCard" :card="selectedModalCard" :alternatives="allAlternativeSkins"
            :count="cardCount(selectedModalCard)" :isLeader="isLeaderCard(selectedModalCard)"
            :isDisabled="isCardDisabled(selectedModalCard)" @close="selectedModalCard = null" @add="addCardFromModal" />
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '../supabase'
import { fetchUserDecks, saveUserDeck } from '../services/playerService'

import DeckCard from '../components/deck/DeckCard.vue'
import DeckFanStack from '../components/deck/DeckFanStack.vue'
import DeckCatalogCard from '../components/deck/DeckCatalogCard.vue'
import DeckCardModal from '../components/deck/DeckCardModal.vue'
import CreateDeckModal from '../components/deck/CreateDeckModal.vue'

const decks = ref([])
const cards = ref([])
const loading = ref(true)
const searchDecks = ref('')
const searchCatalog = ref('')
const showCreateModal = ref(false)
const showLeaderSelection = ref(false)
const editingDeckId = ref(null)
const selectedModalCard = ref(null)
const deckToDelete = ref(null)

const isSelectionMode = ref(false)
const selectedDeckIds = ref([])
const showBatchDeleteModal = ref(false)

function toggleSelectionMode() {
    isSelectionMode.value = !isSelectionMode.value
    selectedDeckIds.value = []
}

function toggleDeckSelection(deckId) {
    const index = selectedDeckIds.value.indexOf(deckId)
    if (index === -1) {
        selectedDeckIds.value.push(deckId)
    } else {
        selectedDeckIds.value.splice(index, 1)
    }
}

function handleDeckClick(deck) {
    if (isSelectionMode.value) {
        toggleDeckSelection(deck.id)
    } else {
        openEditor(deck.id)
    }
}

async function deleteSelectedDecks() {
    if (selectedDeckIds.value.length === 0) return

    const idsToDelete = [...selectedDeckIds.value]
    decks.value = decks.value.filter(d => !idsToDelete.includes(d.id))

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await supabase.from('user_decks').delete().in('id', idsToDelete).eq('user_id', user.id)
    }

    persistLocalDecks()
    selectedDeckIds.value = []
    isSelectionMode.value = false
    showBatchDeleteModal.value = false
}

const activeDeck = computed(() => decks.value.find(deck => deck.id === editingDeckId.value) || null)

const filteredDecks = computed(() => {
    const query = searchDecks.value.trim().toLowerCase()
    if (!query) return decks.value
    return decks.value.filter(deck => deck.name && deck.name.toLowerCase().includes(query))
})

function isAlternative(card) {
    if (!card || !card.id) return false
    return String(card.id).toUpperCase().includes('_ALT_') || String(card.id).toUpperCase().includes('-ALT')
}

function getBaseCardId(card) {
    if (!card) return ''
    const idStr = typeof card === 'string' ? card : (card.id || '')
    return String(idStr).split(/_ALT/i)[0].split(/-ALT/i)[0]
}

const groupedDeckCards = computed(() => {
    if (!activeDeck.value || !activeDeck.value.cards) return []

    const groups = {}

    activeDeck.value.cards.forEach(entry => {
        const cardObj = entry.card || entry
        const baseId = getBaseCardId(cardObj)

        if (!groups[baseId]) {
            groups[baseId] = {
                baseId,
                mainCard: cardObj,
                versions: []
            }
        }
        groups[baseId].versions.push(entry)
    })

    return Object.values(groups)
})

function cardCount(card) {
    if (!activeDeck.value || !card || !activeDeck.value.cards) return 0
    const targetBaseId = getBaseCardId(card)

    return activeDeck.value.cards.reduce((sum, entry) => {
        const entryCard = entry.card || entry
        if (getBaseCardId(entryCard) === targetBaseId) {
            return sum + (entry.count || 1)
        }
        return sum
    }, 0)
}

function isCardDisabled(card) {
    if (!activeDeck.value || !card) return true
    if (showLeaderSelection.value || !activeDeck.value.leader) return !isLeaderCard(card)
    if (isLeaderCard(card)) return getBaseCardId(activeDeck.value.leader) === getBaseCardId(card)
    if (!isColorCompatible(card, activeDeck.value.leader)) return true
    if (deckCardCount(activeDeck.value) >= 50) return true

    return cardCount(card) >= 4
}

function selectCard(card) {
    if (!activeDeck.value || isCardDisabled(card)) return
    const targetDeck = activeDeck.value
    if (!targetDeck) return

    if (!targetDeck.cards) targetDeck.cards = []

    if (showLeaderSelection.value || !targetDeck.leader) {
        targetDeck.leader = card
        targetDeck.cards = targetDeck.cards.filter(item => isColorCompatible(item.card || item, card))
        showLeaderSelection.value = false
        saveActiveDeck()
        return
    }

    if (isLeaderCard(card)) return

    const totalCards = deckCardCount(targetDeck)
    const currentBaseCount = cardCount(card)

    if (currentBaseCount >= 4 || totalCards >= 50) return

    const existingItem = targetDeck.cards.find(entry => {
        const entryCard = entry.card || entry
        return entryCard.id === card.id
    })

    if (existingItem) {
        existingItem.count = (existingItem.count || 1) + 1
    } else {
        targetDeck.cards.push({ card, count: 1 })
    }

    saveActiveDeck()
}

function removeLastVersionOfGroup(group) {
    if (!group || !group.versions || !group.versions.length) return
    const lastVersionEntry = group.versions[group.versions.length - 1]
    const targetCard = lastVersionEntry.card || lastVersionEntry
    removeCard(targetCard)
}

function removeCard(card) {
    const targetDeck = activeDeck.value
    if (!targetDeck || !targetDeck.cards) return

    const index = targetDeck.cards.findIndex(entry => {
        const entryCard = entry.card || entry
        return entryCard.id === card.id
    })
    if (index === -1) return

    const entry = targetDeck.cards[index]
    if ((entry.count || 1) > 1) {
        entry.count -= 1
    } else {
        targetDeck.cards.splice(index, 1)
    }

    saveActiveDeck()
}

async function saveActiveDeck() {
    if (!activeDeck.value) return
    await saveUserDeck(activeDeck.value)
    persistLocalDecks()
}

function getCardColors(card) {
    if (!card || !card.color) return []
    if (Array.isArray(card.color)) return card.color.map(c => String(c).trim().toLowerCase())
    return String(card.color).toLowerCase().split(/[\s\/\,\-]+/).map(c => c.trim()).filter(Boolean)
}

function isColorCompatible(card, leader) {
    if (!leader) return true
    const leaderColors = getCardColors(leader)
    const cardColors = getCardColors(card)
    if (leaderColors.length === 0 || cardColors.length === 0) return true
    return cardColors.some(color => leaderColors.includes(color))
}

const filteredCatalogCards = computed(() => {
    const query = searchCatalog.value.trim().toLowerCase()
    let base = cards.value.filter(card => !isAlternative(card))

    if (showLeaderSelection.value || !activeDeck.value?.leader) {
        base = base.filter(card => isLeaderCard(card))
    } else {
        base = base.filter(card => !isLeaderCard(card) && isColorCompatible(card, activeDeck.value.leader))
    }

    return base.filter(card => {
        if (!query) return true
        return [card.name, card.rarity, card.type, card.category, card.id]
            .filter(Boolean)
            .some(value => value.toLowerCase().includes(query))
    })
})

const allAlternativeSkins = computed(() => {
    if (!selectedModalCard.value) return []
    const baseId = getBaseCardId(selectedModalCard.value)
    return cards.value.filter(c => getBaseCardId(c) === baseId)
})

function deckCardCount(deck) {
    if (!deck || !deck.cards) return 0
    return deck.cards.reduce((sum, item) => sum + (item.count || 1), 0)
}

function persistLocalDecks() {
    window.localStorage.setItem('onepiece-decks', JSON.stringify(decks.value))
}

async function loadDecks() {
    loading.value = true
    
    // 1. Charger les decks distants Supabase
    const remoteDecks = await fetchUserDecks()
    
    if (remoteDecks && remoteDecks.length > 0) {
        decks.value = remoteDecks
    } else {
        // 2. Si Supabase n'a rien, charger depuis le stockage local (ex: tes decks sur PC)
        const raw = window.localStorage.getItem('onepiece-decks')
        if (raw) {
            try { 
                decks.value = JSON.parse(raw) 
                
                // 3. SYNCHRONISATION AUTOMATIQUE : On envoie les decks locaux vers Supabase !
                const { data: { user } } = await supabase.auth.getUser()
                if (user && decks.value.length > 0) {
                    for (const localDeck of decks.value) {
                        await saveUserDeck(localDeck)
                    }
                    console.log("Decks locaux synchronisés avec Supabase !")
                }
            } catch { 
                decks.value = [] 
            }
        }
    }
    loading.value = false
}

async function deleteDeckConfirmed() {
    if (!deckToDelete.value) return
    const idToDelete = deckToDelete.value.id
    decks.value = decks.value.filter(d => d.id !== idToDelete)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await supabase.from('user_decks').delete().eq('id', idToDelete).eq('user_id', user.id)
    }

    persistLocalDecks()
    deckToDelete.value = null
}

function openEditor(deckId) {
    editingDeckId.value = deckId
    showLeaderSelection.value = !activeDeck.value?.leader
}

async function exitEditor() {
    if (activeDeck.value) {
        await saveActiveDeck()
    }
    editingDeckId.value = null
    showLeaderSelection.value = false
    searchCatalog.value = ''
    await loadDecks()
}

async function createDeck(name) {
    const newDeck = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        leader: null,
        cards: []
    }
    
    // Ajout local
    decks.value.push(newDeck)
    
    // Sauvegarde immédiate sur Supabase
    await saveUserDeck(newDeck)
    persistLocalDecks()
    
    showCreateModal.value = false
    openEditor(newDeck.id)
}

function isLeaderCard(card) {
    return !!(card?.type?.toLowerCase().includes('leader') || card?.category?.toLowerCase().includes('leader'))
}

function openCardModal(card) {
    selectedModalCard.value = card
}

function addCardFromModal(card) {
    selectCard(card)
    if (isLeaderCard(card) || deckCardCount(activeDeck.value) >= 50 || cardCount(card) >= 4) {
        selectedModalCard.value = null
    }
}

function activateLeaderSelection() {
    showLeaderSelection.value = true
    searchCatalog.value = ''
}

async function fetchCards() {
    loading.value = true
    const { data, error } = await supabase.from('cards').select('*')
    cards.value = error ? [] : (data || [])
    loading.value = false
}

onMounted(() => {
    loadDecks()
    fetchCards()
})
</script>

<style scoped>
.deck-page {
    max-width: 1280px;
    margin: 0 auto;
    padding: 24px 20px 40px;
    width: 100%;
}

.deck-hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 24px;
}

.eyebrow {
    color: #f59e0b;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    margin-bottom: 6px;
    font-size: 0.85rem;
}

.deck-hero h1 {
    font-size: 2.2rem;
    color: #f8fafc;
    margin-bottom: 8px;
    line-height: 1.1;
}

.hero-copy {
    color: #cbd5e1;
    max-width: 640px;
    font-size: 0.95rem;
}

.search-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.search-box {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    padding: 8px 12px;
    flex: 1;
    min-width: 180px;
}

.search-icon {
    margin-right: 8px;
    color: #94a3b8;
}

.search-input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: #f8fafc;
    font-size: 0.9rem;
}

.primary-btn,
.secondary-btn,
.delete-btn {
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.88rem;
    white-space: nowrap;
}

.primary-btn {
    background: linear-gradient(90deg, #f59e0b, #fb923c);
    color: #111827;
    padding: 10px 18px;
}

.secondary-btn {
    background: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
    padding: 10px 16px;
}

.delete-btn {
    background: #ef4444;
    color: #ffffff;
    padding: 10px 16px;
}

.delete-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.deck-dashboard {
    margin-top: 14px;
    width: 100%;
}

.deck-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    width: 100%;
}

.deck-card-wrapper {
    position: relative;
    border-radius: 16px;
    transition: all 0.2s ease;
    width: 100%;
}

.deck-card-wrapper.selectable {
    cursor: pointer;
}

.deck-card-wrapper.selected {
    outline: 3px solid #ef4444;
    border-radius: 16px;
}

.checkbox-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 10;
    background: rgba(15, 23, 42, 0.9);
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.checkbox-badge input {
    width: 16px;
    height: 16px;
    accent-color: #ef4444;
    cursor: pointer;
}

.deck-card-empty {
    border: 1px dashed rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 180px;
    cursor: pointer;
}

.empty-state-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #f8fafc;
    font-size: 0.88rem;
}

.empty-icon {
    font-size: 2rem;
    color: #f59e0b;
}

.deck-editor {
    margin-top: 16px;
    width: 100%;
}

.editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    color: #f8fafc;
}

.editor-header h2 {
    font-size: 1.3rem;
}

.editor-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    width: 100%;
}

.deck-current-panel,
.catalog-panel {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 16px;
    width: 100%;
}

.panel-title {
    font-weight: 700;
    margin-bottom: 12px;
    color: #f8fafc;
    font-size: 0.95rem;
}

.leader-slot {
    min-height: 160px;
    border: 1px dashed rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.02);
    margin: 0 auto 16px auto;
    width: 100%;
}

.leader-img-wrapper {
    width: 110px;
    height: 154px;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
    margin-bottom: 8px;
}

.leader-img-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.leader-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    color: #f8fafc;
    font-size: 0.85rem;
}

.leader-placeholder {
    color: #94a3b8;
    font-size: 0.85rem;
}

.deck-cards-fan-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 12px;
    max-height: 480px;
    overflow-y: auto;
    padding-top: 6px;
    justify-items: center;
    width: 100%;
}

.empty-list {
    color: #94a3b8;
    font-size: 0.85rem;
    grid-column: 1 / -1;
    text-align: center;
}

.catalog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    color: #f8fafc;
}

.catalog-header h3 {
    font-size: 1.1rem;
}

.catalog-header p {
    font-size: 0.8rem;
    color: #94a3b8;
}

.catalog-search {
    margin-bottom: 14px;
}

/* GRILLE DU CATALOGUE PC */
.card-catalog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 12px;
    max-height: 520px;
    overflow-y: auto;
    width: 100%;
}

/* MOBILES (< 768px) */
@media (max-width: 768px) {
    .deck-page {
        padding: 8px 4px 80px 4px !important;
        width: 100% !important;
    }

    .deck-hero h1 {
        font-size: 1.4rem;
    }

    .search-actions {
        width: 100%;
        display: flex;
        gap: 6px;
    }

    .deck-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }

    .editor-body {
        grid-template-columns: 1fr;
        gap: 12px;
    }

    .deck-current-panel,
    .catalog-panel {
        padding: 8px;
        border-radius: 14px;
        width: 100%;
        box-sizing: border-box;
    }

    /* CATALOGUE FORCE EN 3 COLONNES SUR MOBILE */
    .card-catalog-grid {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 6px !important;
        width: 100% !important;
        padding: 0 !important;
        box-sizing: border-box !important;
    }
}
</style>