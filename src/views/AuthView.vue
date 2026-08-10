<template>
  <div class="auth-fullscreen">
    <main class="auth-container">
      <!-- 1. COLONNE GAUCHE : MARQUE / LOGO (PC uniquement) -->
      <section class="brand-side">
        <div class="brand-content">
          <div class="logo-wrapper">
            <img src="/icon-title.png" alt="ONE PIECE Treasure Cards Logo" class="brand-title-logo" />
          </div>
          <h1>L'aventure TCG commence ici</h1>
          <p class="brand-sub">
            Collectionne tes cartes préférées, fabrique tes meilleurs decks et affronte tes proches dans une expérience 100% passionnée.
          </p>
        </div>
      </section>

      <!-- 2. COLONNE DROITE : FORMULAIRE -->
      <section class="form-side">
        <div class="auth-card">
          <!-- LOGO VISIBLE EN MOBILE UNIQUEMENT -->
          <div class="mobile-logo-header">
            <img src="/icon-title.png" alt="ONE PIECE Treasure Cards Logo" class="mobile-brand-logo" />
          </div>

          <div class="card-header">
            <h2>{{ isSignUp ? 'Créer un compte' : 'Connexion' }}</h2>
            <p>{{ isSignUp ? 'Rejoins l’équipage en quelques secondes' : 'Rentre tes identifiants pour continuer' }}</p>
          </div>

          <form @submit.prevent="handleSubmit" class="auth-form">
            <div v-if="isSignUp" class="form-group">
              <label for="username">Pseudo de pirate</label>
              <input
                id="username"
                v-model="username"
                type="text"
                placeholder="Ex: MonkeyD_Elias"
                required
              />
            </div>

            <div class="form-group">
              <label for="email">Adresse email</label>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="pirate@grandline.com"
                required
              />
            </div>

            <div class="form-group">
              <label for="password">Mot de passe</label>
              <input
                id="password"
                v-model="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" class="submit-btn" :disabled="loading">
              {{ loading ? 'Chargement...' : (isSignUp ? "S'INSCRIRE" : 'SE CONNECTER') }}
            </button>
          </form>

          <div class="card-footer-toggle">
            <p>
              {{ isSignUp ? 'Déjà membre de l’équipage ?' : 'Pas encore de compte ?' }}
              <button type="button" class="toggle-btn" @click="isSignUp = !isSignUp">
                {{ isSignUp ? 'Se connecter' : "S'inscrire" }}
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>

    <!-- 3. FOOTER LEGAL & DISCLAIMER -->
    <footer class="auth-disclaimer-footer">
      <p>
        <strong>Avertissement :</strong> Ce site web est un projet strictly personnel, récréatif et non lucratif. 
        Aucun contenu n'est monétisé et aucune transaction financière n'y est effectuée. 
        Ce projet n'est en aucun cas affilié, associé, approuvé ou soutenu par <strong>Bandai Namco</strong>, <strong>Shueisha</strong>, <strong>Toei Animation</strong> ou la franchise <strong>One Piece</strong>. 
        Toutes les illustrations, marques et droits d'auteur appartiennent exclusivement à leurs propriétaires respectifs.
      </p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

const router = useRouter()

const isSignUp = ref(false)
const loading = ref(false)
const email = ref('')
const password = ref('')
const username = ref('')

async function handleSubmit() {
  loading.value = true
  
  if (isSignUp.value) {
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: { username: username.value }
      }
    })

    if (error) {
      alert(`Erreur d'inscription : ${error.message}`)
    } else {
      alert('Compte créé avec succès ! Tu peux maintenant te connecter.')
      isSignUp.value = false
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) {
      alert(`Erreur de connexion : ${error.message}`)
    } else {
      await router.push('/cards')
    }
  }

  loading.value = false
}
</script>

<style scoped>
.auth-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #0b0f19;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow-y: auto;
}

.auth-container {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: calc(100vh - 80px);
}

/* COLONNE GAUCHE AVEC ARRIÈRE-PLAN DYNAMIQUE (PC) */
.brand-side {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(11, 15, 25, 0.75) 100%),
              url('/bg_auth.png') center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-content {
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.logo-wrapper {
  display: flex;
  align-items: flex-start;
}

.brand-title-logo {
  max-width: 320px;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.brand-content h1 {
  font-size: 2.5rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.2;
}

.brand-sub {
  color: #94a3b8;
  font-size: 1.05rem;
  line-height: 1.6;
}

.form-side {
  display: grid;
  place-items: center;
  padding: 40px 20px;
  background: #0b0f19;
}

.auth-card {
  width: min(420px, 100%);
  background: rgba(17, 24, 39, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid #273447;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

/* Masqué par défaut sur PC */
.mobile-logo-header {
  display: none;
}

.card-header {
  margin-bottom: 28px;
}

.card-header h2 {
  font-size: 1.8rem;
  font-weight: 800;
  color: #f8fafc;
  margin-bottom: 6px;
}

.card-header p {
  color: #94a3b8;
  font-size: 0.9rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #cbd5e1;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  background: #0d111a;
  border: 1px solid #273447;
  color: #f8fafc;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-group input:focus {
  border-color: #f59e0b;
}

.submit-btn {
  margin-top: 10px;
  padding: 14px;
  background: linear-gradient(90deg, #f59e0b, #fb923c);
  border: none;
  border-radius: 12px;
  color: #111827;
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.3);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.card-footer-toggle {
  margin-top: 24px;
  text-align: center;
  font-size: 0.88rem;
  color: #94a3b8;
}

.toggle-btn {
  background: none;
  border: none;
  color: #f59e0b;
  font-weight: 800;
  cursor: pointer;
  margin-left: 6px;
  font-size: 0.88rem;
}

.auth-disclaimer-footer {
  background: rgba(7, 10, 18, 0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: 16px 24px;
  text-align: center;
}

.auth-disclaimer-footer p {
  max-width: 1100px;
  margin: 0 auto;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.5;
}

.auth-disclaimer-footer strong {
  color: #94a3b8;
}

/* MODIFICATIONS MOBILE (< 900px) */
@media (max-width: 900px) {
  .auth-container {
    grid-template-columns: 1fr;
  }

  .brand-side {
    display: none;
  }

  /* Image de fond sur mobile */
  .form-side {
    padding: 24px 16px;
    background: linear-gradient(135deg, rgba(11, 15, 25, 0.85) 0%, rgba(15, 23, 42, 0.9) 100%),
                url('/bg_auth.png') center/cover no-repeat;
  }

  /* Affichage du logo sur mobile */
  .mobile-logo-header {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }

  .mobile-brand-logo {
    max-width: 220px;
    width: 100%;
    height: auto;
    object-fit: contain;
  }

  .auth-card {
    padding: 28px 20px;
  }
}
</style>