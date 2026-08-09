<template>
    <header class="header">
        <!-- Logo Icone + Logo Titre (Redirige vers l'accueil) -->
        <div class="brand" @click="goHome">
            <img src="/favicon.png" alt="Icon One Piece" class="logo-img" />
            <img src="/title-logo.png" alt="One Piece Treasure Cards" class="title-img" />
        </div>

        <!-- Navigation Principale -->
        <nav class="nav">
            <button class="nav-link" @click="goHome">Accueil</button>

            <!-- Menu Déroulant Extensions -->
            <div class="dropdown-container" @mouseenter="setsDropdown = true" @mouseleave="setsDropdown = false">
                <button class="nav-link">
                    Cartes & Extensions ▾
                </button>

                <div v-if="setsDropdown" class="dropdown-menu">
                    <div v-for="set in availableSets" :key="set.id" class="dropdown-item" @click="selectSet(set.id)">
                        {{ set.name }}
                    </div>
                </div>
            </div>

            <!-- Liens / Fonctionnalités à venir -->
            <router-link to="/gacha" class="nav-link">Boosters / Gacha</router-link>
            <button class="disabled-link">Decks (Bientôt)</button>
            <button class="disabled-link">Collection (Bientôt)</button>
        </nav>

        <!-- Zone Monnaie Joueur -->
        <div class="user-stats">
            <div class="coins-badge">
                <img src="/gem.png" alt="Coins" class="coin-icon" />
                <span>0</span>
            </div>
        </div>
    </header>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const setsDropdown = ref(false)

// Liste complète des extensions et boosters
const availableSets = [
    { id: 'ALL', name: 'Toutes les cartes' },

    // Section Boosters
    { id: 'OP01', name: 'OP01 - Romance Dawn' },
    { id: 'OP02', name: 'OP02 - Paramount War' },
    { id: 'OP03', name: 'OP03 - Pillars of Strength' },
    { id: 'OP04', name: 'OP04 - Kingdoms of Intrigue' },
    { id: 'OP05', name: 'OP05 - Awakening of the New Era' },
    { id: 'OP06', name: 'OP06 - Wings of the Captain' },
    { id: 'OP07', name: 'OP07 - 500 Years Into the Future' },
    { id: 'OP08', name: 'OP08 - Two Legends' },
    { id: 'OP09', name: 'OP09 - The New Four Emperors' },
    { id: 'OP10', name: 'OP10 - Royal Bloodline' },

    // Section Starter Decks
    { id: 'ST01', name: 'ST01 - Straw Hat Crew' },
    { id: 'ST02', name: 'ST02 - Worst Generation' },
    { id: 'ST03', name: 'ST03 - Seven Warlords of the Sea' },
    { id: 'ST04', name: 'ST04 - Animal Kingdom Pirates' },
    { id: 'ST10', name: 'ST10 - The Three Captains' }
]

function goHome() {
    router.push('/')
}

function selectSet(setId) {
    setsDropdown.value = false
    // Redirige vers /cards en passant le set dans l'URL (query param)
    router.push({ path: '/cards', query: { set: setId } })
}
</script>

<style scoped>
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 24px;
    background-color: #121212;
    color: #fff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    height: 60px;
}

.brand {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
}

.logo-img {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    object-fit: cover;
}

.title-img {
    height: 24px;
    object-fit: contain;
}

.nav {
    display: flex;
    gap: 16px;
    align-items: center;
}

.nav-link {
    background: none;
    border: none;
    color: #fff;
    font-size: 0.9rem;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.2s;
}

.nav-link:hover {
    color: #f59e0b;
}

.disabled-link {
    background: none;
    border: none;
    color: #666;
    font-size: 0.9rem;
    cursor: not-allowed;
    white-space: nowrap;
}

.dropdown-container {
    position: relative;
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background-color: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 6px 0;
    min-width: 250px;
    max-height: 350px;
    overflow-y: auto;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
    z-index: 100;
}

.dropdown-item {
    padding: 8px 14px;
    color: #ccc;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.2s, color 0.2s;
}

.dropdown-item:hover {
    background-color: #2a2a2a;
    color: #f59e0b;
}

.coins-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid #f59e0b;
  color: #f59e0b;
  padding: 4px 12px;
  border-radius: 16px;
  font-weight: bold;
  font-size: 0.85rem;
}

.coin-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}
</style>