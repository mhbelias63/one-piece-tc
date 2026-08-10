<template>
  <router-view v-if="isAuthPage" />

  <div v-else class="app-layout" :class="{ 'light-theme': isLightTheme }">
    <!-- SIDEBAR PC / BARRE BASSE MOBILE -->
    <aside class="navigation-sidebar">
      <div class="brand-header">
        <img src="/title-logo.png" alt="Logo" class="brand-logo" />
      </div>

      <nav class="nav-links">
        <router-link to="/" class="nav-item">
          <span class="icon">🏴‍☠️</span>
          <span class="label">Accueil</span>
        </router-link>
        <router-link to="/cards" class="nav-item">
          <span class="icon">🎴</span>
          <span class="label">Collection</span>
        </router-link>
        <router-link to="/decks" class="nav-item">
          <span class="icon">⚔️</span>
          <span class="label">Decks</span>
        </router-link>
        <router-link to="/gacha" class="nav-item">
          <span class="icon">📦</span>
          <span class="label">Boosters</span>
        </router-link>
        <button class="nav-item disabled">
          <span class="icon">🏪</span>
          <span class="label">Boutique</span>
        </button>
      </nav>
    </aside>

    <!-- WORKSPACE PRINCIPAL -->
    <div class="main-wrapper">
      <header class="topbar">
        <!-- USER PROFILE BADGE & DROPDOWN -->
        <div class="profile-dropdown-wrapper" ref="dropdownRef">
          <div class="user-badge" @click="menuOpen = !menuOpen">
            <img :src="profile.avatar_url" alt="Avatar" class="avatar" />
            <div class="user-info">
              <strong>{{ profile.username }}</strong>
              <small>Niveau 24</small>
            </div>
            <span class="dropdown-arrow">▾</span>
          </div>

          <!-- DROPDOWN MENU -->
          <div v-if="menuOpen" class="profile-menu">
            <button class="menu-item" @click="openProfileModal">
              <span class="icon">✏️</span> Modifier le profil
            </button>
            <button class="menu-item" @click="toggleTheme">
              <span class="icon">{{ isLightTheme ? '🌙' : '☀️' }}</span> Mode {{ isLightTheme ? 'Sombre' : 'Clair' }}
            </button>
            <hr class="menu-divider" />
            <button class="menu-item logout-btn" @click="handleLogout">
              <span class="icon">🚪</span> Déconnexion
            </button>
          </div>
        </div>

        <div class="spacer"></div>

        <div class="currency-group">
          <div class="currency-badge">
            <span class="icon">🪙</span>
            <span class="amount">12 450</span>
          </div>
          <div class="currency-badge">
            <img src="/gem.png" alt="Gem" class="gem-icon" />
            <span class="amount">2 480</span>
            <button class="add-btn">+</button>
          </div>
        </div>
      </header>

      <main class="content-body">
        <router-view />
      </main>
    </div>

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
  username_updated_at: null
})

async function fetchUserProfile() {
  const { data: { user } } = await supabase.auth.getUser()
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
* { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
body { background-color: #0b0f19; color: #f8fafc; overflow-x: hidden; }

.app-layout { display: flex; min-height: 100vh; }

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
  left: 0;
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

/* SIDEBAR PC & TOPBAR */
.navigation-sidebar {
  width: 240px;
  background-color: #111827;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  position: fixed;
  top: 0; bottom: 0; left: 0;
  z-index: 100;
}

.brand-header { padding: 10px; margin-bottom: 20px; text-align: center; }
.brand-logo { max-width: 100%; height: 40px; object-fit: contain; }

.nav-links { display: flex; flex-direction: column; gap: 6px; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.nav-item:hover:not(.disabled) { background: rgba(255, 255, 255, 0.05); color: #ffffff; }
.nav-item.router-link-active { background: #f59e0b; color: #111827; }
.nav-item.disabled { opacity: 0.35; cursor: not-allowed; }

.main-wrapper { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-width: 0; }

.topbar {
  height: 60px;
  background: rgba(11, 15, 25, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 90;
}

.spacer { flex: 1; }

.currency-group { display: flex; align-items: center; gap: 10px; }
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

.content-body { padding: 24px; }

/* THEME CLAIR */
.app-layout.light-theme { background-color: #f1f5f9; color: #0f172a; }
.app-layout.light-theme .navigation-sidebar { background-color: #ffffff; border-right-color: #e2e8f0; }
.app-layout.light-theme .topbar { background-color: rgba(255, 255, 255, 0.9); border-bottom-color: #e2e8f0; }
.app-layout.light-theme .nav-item { color: #64748b; }
.app-layout.light-theme .user-badge, .app-layout.light-theme .currency-badge { background: #f8fafc; border-color: #cbd5e1; }

@media (max-width: 768px) {
  .navigation-sidebar {
    width: 100vw; height: 66px; top: auto; bottom: 0; left: 0; right: 0;
    flex-direction: row; padding: 0 10px; border-right: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(13, 17, 23, 0.95); z-index: 1000;
  }
  .brand-header { display: none; }
  .nav-links { flex-direction: row; width: 100%; justify-content: space-around; align-items: center; }
  .nav-item { flex-direction: column; justify-content: center; padding: 6px; gap: 2px; font-size: 0.68rem; width: auto; }
  .main-wrapper { margin-left: 0; padding-bottom: 70px; }
}
</style>