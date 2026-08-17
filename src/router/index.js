import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase'

import AuthView from '../views/AuthView.vue'
import HomeView from '../views/HomeView.vue'
import CardsView from '../views/CardsView.vue'
import BoosterView from '../views/BoosterView.vue'
import DeckView from '../views/DeckView.vue'
import DuelInitializer from '../components/DuelInitializer.vue'
import LobbyView from '../views/LobbyView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/auth',
    name: 'auth',
    component: AuthView
  },
  {
    path: '/cards',
    name: 'cards',
    component: CardsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/gacha',
    name: 'gacha',
    component: BoosterView,
    meta: { requiresAuth: true }
  },
  {
    path: '/booster',
    redirect: '/gacha'
  },
  {
    path: '/decks',
    name: 'decks',
    component: DeckView,
    meta: { requiresAuth: true }
  },
  {
    path: '/deck',
    redirect: '/decks'
  },

  {
    path: '/lobby',
    name: 'lobby',
    component: () => import('../views/LobbyView.vue'),
    meta: { requiresAuth: true }
  },

  {
    path: '/duel',
    name: 'Duel',
    component: () => import('../views/DuelView.vue')
  },
  {
    path: '/test-duel',
    name: 'TestDuel',
    component: DuelInitializer
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation Guard de sécurité
router.beforeEach(async (to, from, next) => {
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Bloque les visiteurs non connectés
  if (to.meta.requiresAuth && !user) {
    return next('/auth')
  }

  // 2. Redirige un utilisateur déjà connecté qui essaie d'aller sur /auth
  if (to.path === '/auth' && user) {
    return next('/')
  }

  next()
})

export default router