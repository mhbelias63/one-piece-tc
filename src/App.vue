<template>
  <!-- Si on est sur /auth, on affiche uniquement la vue sans le layout global -->
  <router-view v-if="isAuthPage" />

  <!-- Sinon, on affiche l'application complète avec la navigation -->
  <div v-else class="app-layout">
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
        <div class="user-badge-mobile">
          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=EliasGP" alt="Avatar" class="avatar" />
          <div class="user-info">
            <strong>Elias</strong>
            <small>Niveau 24</small>
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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isAuthPage = computed(() => route.path === '/auth')
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, sans-serif;
}

body {
  background-color: #0b0f19;
  color: #f8fafc;
  overflow-x: hidden;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

/* DESKTOP SIDEBAR */
.navigation-sidebar {
  width: 240px;
  background-color: #111827;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
}

.brand-header {
  padding: 10px;
  margin-bottom: 20px;
  text-align: center;
}

.brand-logo {
  max-width: 100%;
  height: 40px;
  object-fit: contain;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

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

.nav-item:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.nav-item.router-link-active {
  background: #f59e0b;
  color: #111827;
}

.nav-item.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.main-wrapper {
  margin-left: 240px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

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

.user-badge-mobile {
  display: none;
}

.spacer { flex: 1; }

.currency-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

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
  margin-left: 2px;
}

.content-body {
  padding: 24px;
}

/* MOBILE ADAPTATION (< 768px) */
@media (max-width: 768px) {
  .navigation-sidebar {
    width: 100vw;
    height: 66px;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    flex-direction: row;
    padding: 0 10px;
    border-right: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(13, 17, 23, 0.95);
    backdrop-filter: blur(20px);
    z-index: 1000;
  }

  .brand-header { display: none; }

  .nav-links {
    flex-direction: row;
    width: 100%;
    justify-content: space-around;
    align-items: center;
  }

  .nav-item {
    flex-direction: column;
    justify-content: center;
    padding: 6px;
    gap: 2px;
    font-size: 0.68rem;
    border-radius: 8px;
    width: auto;
  }

  .nav-item .icon { font-size: 1.25rem; }

  .main-wrapper {
    margin-left: 0;
    padding-bottom: 70px;
  }

  .topbar {
    padding: 0 14px;
  }

  .user-badge-mobile {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .user-badge-mobile .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid #f59e0b;
  }

  .user-badge-mobile .user-info {
    display: flex;
    flex-direction: column;
    font-size: 0.75rem;
  }

  .user-badge-mobile small {
    color: #94a3b8;
    font-size: 0.65rem;
  }

  .content-body {
    padding: 14px;
  }
}
</style>