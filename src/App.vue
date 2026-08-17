<template>
  <router-view v-if="isAuthPage" />

  <div v-else class="app-layout" :class="{ 'light-theme': isLightTheme }">
    <!-- NAVIGATION BARRE SUPÉRIEURE (TOPBAR UNIFIÉE) -->
    <header class="topbar">
      <!-- LOGO / BRAND -->
      <router-link to="/" class="brand-link">
        <img src="/icon-title.png" alt="Logo" class="brand-logo" />
      </router-link>

      <!-- MENU DE NAVIGATION HORIZONTAL -->
      <nav class="nav-links-top">
        <router-link to="/" class="nav-item">
          <i class="pi pi-compass nav-icon"></i>
          <span class="label">Accueil</span>
        </router-link>
        <router-link to="/cards" class="nav-item">
          <i class="pi pi-th-large nav-icon"></i>
          <span class="label">Collection</span>
        </router-link>
        <router-link to="/decks" class="nav-item">
          <i class="pi pi-clone nav-icon"></i>
          <span class="label">Decks</span>
        </router-link>
        <router-link to="/gacha" class="nav-item">
          <i class="pi pi-gift nav-icon"></i>
          <span class="label">Boosters</span>
        </router-link>
        
        <!-- ⚔️ BOUTON ARENA DUEL (PC) -->
        <router-link to="/lobby" class="nav-item duel-btn">
          <i class="pi pi-bolt nav-icon"></i>
          <span class="label">Arena Duel</span>
        </router-link>

        <button class="nav-item disabled">
          <i class="pi pi-shop nav-icon"></i>
          <span class="label">Boutique</span>
        </button>
      </nav>

      <div class="spacer"></div>

      <!-- PROFIL UTILISATEUR ET GEMMES -->
      <div class="user-area">
        <!-- USER PROFILE BADGE & DROPDOWN -->
        <div class="profile-dropdown-wrapper" ref="dropdownRef">
          <div class="user-badge" @click="menuOpen = !menuOpen">
            <img :src="profile.avatar_url" alt="Avatar" class="avatar" />
            <div class="user-info">
              <strong>{{ profile.username }}</strong>
              <small class="user-level">Niveau 24</small>
            </div>
            <span class="dropdown-arrow">▾</span>
          </div>

          <!-- DROPDOWN MENU -->
          <div v-if="menuOpen" class="profile-menu">
            <button class="menu-item" @click="openProfileModal">
              <i class="pi pi-user-edit menu-icon"></i> Modifier le profil
            </button>
            <button class="menu-item" @click="toggleTheme">
              <i class="pi" :class="isLightTheme ? 'pi-moon' : 'pi-sun'"></i> Mode {{ isLightTheme ? 'Sombre' : 'Clair' }}
            </button>
            <hr class="menu-divider" />
            <button class="menu-item logout-btn" @click="handleLogout">
              <i class="pi pi-sign-out menu-icon"></i> Déconnexion
            </button>
          </div>
        </div>

        <!-- GEMMES -->
        <div class="currency-group">
          <div class="currency-badge">
            <img src="/gem.png" alt="Gem" class="gem-icon" />
            <span class="amount">{{ profile.gems ?? 2400 }}</span>
            <button class="add-btn">+</button>
          </div>
        </div>
      </div>
    </header>

    <!-- WORKSPACE PRINCIPAL -->
    <main class="content-body">
      <router-view :userGems="profile.gems" @spend-gems="fetchUserProfile" />
    </main>

    <!-- MODAL DE MODIFICATION DE PROFIL -->
    <ProfileModal 
      v-if="showModal" 
      :profile="profile" 
      @close="showModal = false" 
      @updated="fetchUserProfile" 
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from './supabase'
import ProfileModal from './components/ProfileModal.vue'

const route = useRoute()
const router = useRouter()

const isAuthPage = computed(() => route.path === '/auth')
const menuOpen = ref(false)
const showModal = ref(false)
const isLightTheme = ref(false)
const dropdownRef = ref(null)

const profile = ref({
  id: '',
  username: 'Chargement...',
  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Luffy',
  gems: 2400
})

async function fetchUserProfile() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (data && !error) {
    profile.value = data
  }
}

function openProfileModal() {
  menuOpen.value = false
  showModal.value = true
}

function toggleTheme() {
  isLightTheme.value = !isLightTheme.value
  menuOpen.value = false
}

async function handleLogout() {
  await supabase.auth.signOut()
  menuOpen.value = false
  router.push('/auth')
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  fetchUserProfile()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style>
* { 
  box-sizing: border-box; 
  margin: 0; 
  padding: 0; 
  font-family: system-ui, -apple-system, sans-serif; 
}

html, body { 
  background-color: #0b0f19; 
  color: #f8fafc; 
  overflow-x: hidden; 
  width: 100%;
}

.app-layout { 
  display: flex;
  flex-direction: column; 
  min-height: 100vh; 
  width: 100%;
  overflow-x: hidden;
}

/* TOPBAR HORIZONTALE */
.topbar {
  height: 80px;
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
}

.brand-link {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.brand-logo {
  height: 60px;
  max-width: 200px;
  object-fit: contain;
}

.brand-logo:hover {
  transform: scale(1.04);
}

/* NAVIGATION TOPBAR */
.nav-links-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.88rem;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-icon {
  font-size: 1.05rem;
}

.menu-icon {
  font-size: 0.95rem;
}

.nav-item:hover:not(.disabled) { background: rgba(255, 255, 255, 0.05); color: #ffffff; }
.nav-item.router-link-active { background: #f59e0b; color: #111827; }
.nav-item.disabled { opacity: 0.35; cursor: not-allowed; }

/* STYLE SPÉCIAL POUR LE BOUTON ARENA DUEL */
.nav-item.duel-btn {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(245, 158, 11, 0.2));
  border: 1px solid #ef4444;
  color: #fca5a5;
}

.nav-item.duel-btn:hover {
  background: #ef4444;
  color: #ffffff;
}

.nav-item.duel-btn.router-link-active {
  background: #ef4444;
  color: #ffffff;
}

.spacer { flex: 1; }

.user-area {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* DROPDOWN PROFIL */
.profile-dropdown-wrapper { position: relative; }

.user-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: #161b22;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.user-badge:hover { border-color: #f59e0b; }

.user-badge .avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #f59e0b;
}

.user-info { display: flex; flex-direction: column; font-size: 0.78rem; }
.user-info small { color: #94a3b8; font-size: 0.65rem; }
.dropdown-arrow { color: #94a3b8; font-size: 0.8rem; }

.profile-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #111827;
  border: 1px solid #273447;
  border-radius: 12px;
  padding: 6px;
  min-width: 180px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: none;
  border: none;
  color: #cbd5e1;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.menu-item:hover { background: rgba(255, 255, 255, 0.05); color: #ffffff; }
.menu-divider { border: none; border-top: 1px solid #273447; margin: 4px 0; }
.logout-btn { color: #ef4444; }
.logout-btn:hover { background: rgba(239, 68, 68, 0.1); }

/* GEMMES */
.currency-group { display: flex; align-items: center; }
.currency-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #161b22;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 800;
  font-size: 0.85rem;
}

.gem-icon { width: 16px; height: 16px; }
.add-btn {
  background: #f59e0b;
  border: none;
  color: #000;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-weight: 900;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.content-body { 
  padding: 24px; 
  width: 100%; 
  flex: 1;
}

/* THEME CLAIR */
.app-layout.light-theme { background-color: #f1f5f9; color: #0f172a; }
.app-layout.light-theme .topbar { background-color: rgba(255, 255, 255, 0.95); border-bottom-color: #e2e8f0; }
.app-layout.light-theme .nav-item { color: #64748b; }
.app-layout.light-theme .user-badge, .app-layout.light-theme .currency-badge { background: #f8fafc; border-color: #cbd5e1; }

/* ADAPTATIONS MOBILES (< 900px) */
@media screen and (max-width: 900px) {
  .topbar {
    padding: 0 12px;
    padding-top: env(safe-area-inset-top);
    height: calc(60px + env(safe-area-inset-top));
    gap: 8px;
    /* Le backdrop-filter crée un conteneur pour les éléments fixed enfants. */
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .brand-logo { height: 32px; }

  /* Sur mobile, le menu repasse en bas */
  .nav-links-top {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    height: calc(60px + env(safe-area-inset-bottom));
    background: rgba(13, 17, 23, 0.98);
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    justify-content: space-around;
    padding: 0 4px env(safe-area-inset-bottom);
    z-index: 1000;
    display: flex !important;
  }

  .nav-item {
    flex-direction: column;
    justify-content: center;
    padding: 4px;
    gap: 2px;
    font-size: 0.62rem;
    border-radius: 8px;
    width: 18%;
  }

  .nav-item .nav-icon { font-size: 1.15rem; }

  .content-body {
    padding: 12px;
    /* Empêche le contenu d'être masqué par la navigation fixe. */
    padding-bottom: calc(70px + env(safe-area-inset-bottom));
  }

  .user-badge { padding: 4px 6px; gap: 4px; }
  .user-badge .avatar { width: 26px; height: 26px; }
  .user-info { font-size: 0.7rem; }
  .user-level { display: none; }
  .currency-badge { padding: 4px 6px; font-size: 0.72rem; }
}
</style>
