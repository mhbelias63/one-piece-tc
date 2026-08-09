<template>
  <div class="mobile-viewport">
    <!-- TOPBAR MOBILE -->
    <header class="mobile-topbar">
      <div class="user-profile">
        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=EliasGP" alt="Avatar" class="avatar" />
        <div class="user-info">
          <span class="username">Elias</span>
          <div class="level-row">
            <span class="level">Niveau 24</span>
            <div class="xp-bar"><div class="xp-fill"></div></div>
          </div>
        </div>
      </div>

      <div class="wallet">
        <div class="badge-curr gold">
          <span class="icon">🪙</span>
          <span>125 430</span>
        </div>
        <div class="badge-curr gem">
          <img src="/gem.png" alt="Gem" />
          <span>3 210</span>
          <button class="plus-btn">+</button>
        </div>
      </div>
    </header>

    <!-- ZONE DE CONTENU (Seule zone scrollable) -->
    <main class="mobile-body">
      <slot />
    </main>

    <!-- BOTTOM BAR ÉPURÉE & ARRONDIE -->
    <nav class="mobile-bottom-nav">
      <router-link to="/" class="nav-item" :class="{ active: $route.path === '/' }">
        <span class="nav-icon">🏴‍☠️</span>
        <span class="nav-label">Accueil</span>
      </router-link>

      <router-link to="/cards" class="nav-item" :class="{ active: $route.path === '/cards' }">
        <span class="nav-icon">📖</span>
        <span class="nav-label">Collection</span>
      </router-link>

      <router-link to="/decks" class="nav-item" :class="{ active: $route.path === '/decks' }">
        <span class="nav-icon">🎴</span>
        <span class="nav-label">Deck</span>
      </router-link>

      <router-link to="/gacha" class="nav-item" :class="{ active: $route.path === '/gacha' }">
        <span class="nav-icon">📦</span>
        <span class="nav-label">Booster</span>
      </router-link>

      <router-link to="/shop" class="nav-item" :class="{ active: $route.path === '/shop' }">
        <span class="nav-icon">🏪</span>
        <span class="nav-label">Boutique</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
/* Empêche tout débordement de l'écran */
.mobile-viewport {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: #090d16;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* TOPBAR */
.mobile-topbar {
  height: 60px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(13, 17, 23, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  z-index: 100;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #1e293b;
  border: 2px solid #eab308;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.username {
  font-size: 0.85rem;
  font-weight: 800;
}

.level-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.level {
  font-size: 0.65rem;
  color: #94a3b8;
}

.xp-bar {
  width: 45px;
  height: 4px;
  background: #1e293b;
  border-radius: 2px;
  overflow: hidden;
}

.xp-fill {
  width: 60%;
  height: 100%;
  background: #eab308;
}

.wallet {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge-curr {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(22, 27, 34, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
}

.badge-curr img {
  width: 14px;
  height: 14px;
}

.plus-btn {
  background: #eab308;
  border: none;
  color: #000;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 900;
  display: grid;
  place-items: center;
  margin-left: 2px;
  cursor: pointer;
}

/* CONTENU PRINCIPAL SCROLLABLE */
.mobile-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  padding-bottom: 90px; /* Dégage la bottom bar */
  -webkit-overflow-scrolling: touch;
}

/* BOTTOM BAR ÉPURÉE EXACTEMENT PAR PAREIL QUE LA MAQUETTE */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 68px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  background: rgba(13, 17, 23, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  z-index: 1000;
  box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.5);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: #64748b;
  text-decoration: none;
  font-size: 0.68rem;
  font-weight: 700;
  transition: all 0.2s ease;
}

.nav-icon {
  font-size: 1.25rem;
  transition: transform 0.2s ease;
}

.nav-item.active {
  color: #eab308;
}

.nav-item.active .nav-icon {
  transform: translateY(-2px) scale(1.15);
}
</style>