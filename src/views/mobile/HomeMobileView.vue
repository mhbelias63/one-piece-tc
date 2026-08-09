<template>
  <div class="mobile-home">
    <!-- HERO BANNER LUFFY -->
    <div class="hero-card-mobile" style="background-image: url('https://images8.alphacoders.com/128/thumb-1920-1286602.jpg')">
      <div class="overlay"></div>
      <div class="hero-content">
        <span class="tag">Nouveau pack disponible !</span>
        <h2>Ouvrir un booster</h2>
        <div class="booster-thumb">
          <img src="/src/assets/images/booster/op09.png" alt="OP09" />
        </div>
      </div>
    </div>

    <!-- GRILLE D'ACCÈS RAPIDE (Missions, Événements, Arène) -->
    <div class="action-grid">
      <div class="action-card">
        <span class="icon">📜</span>
        <span>Missions</span>
      </div>
      <div class="action-card">
        <span class="icon">🏴‍☠️</span>
        <span>Événements</span>
      </div>
      <div class="action-card">
        <span class="icon">⚔️</span>
        <span>Arène</span>
      </div>
    </div>

    <!-- ÉVÉNEMENT EN COURS -->
    <div class="event-banner-mobile">
      <span class="event-tag">Événement en cours</span>
      <h3>BATTLE OF MARINEFORD</h3>
      <p class="timer">Fin dans 6j 12h</p>
    </div>
  </div>
</template>

<style scoped>
.mobile-home {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-card-mobile {
  position: relative;
  height: 220px;
  border-radius: 20px;
  overflow: hidden;
  background-size: cover;
  background-position: center top;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%);
}

.hero-content {
  position: relative;
  z-index: 2;
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.tag {
  color: #f59e0b;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
}

.hero-content h2 {
  font-size: 1.4rem;
  color: #fff;
  font-weight: 900;
}

.booster-thumb {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 80px;
  transform: rotate(-6deg);
}

.booster-thumb img {
  width: 100%;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.action-card {
  background: #111827;
  border: 1px solid #273447;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 800;
  color: #f8fafc;
}

.action-card .icon {
  font-size: 1.4rem;
}

.event-banner-mobile {
  background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%);
  border: 1px solid #ef4444;
  border-radius: 16px;
  padding: 16px;
  color: white;
}

.event-tag {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: #fca5a5;
  font-weight: 800;
}

.event-banner-mobile h3 {
  font-size: 1.1rem;
  font-weight: 900;
  margin-top: 2px;
}

.timer {
  font-size: 0.75rem;
  color: #f8fafc;
  margin-top: 4px;
}
</style>