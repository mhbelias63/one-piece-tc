import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase'

import AuthView from '../views/AuthView.vue'
import CardsView from '../views/CardsView.vue'
import BoosterView from '../views/BoosterView.vue'

const routes = [
  {
    path: '/',
    redirect: '/auth'
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
    path: '/booster',
    name: 'booster',
    component: BoosterView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Visiteur NON connecté tentant d'accéder à une page protégée
  if (to.meta.requiresAuth && !user) {
    return next('/auth')
  }

  // 2. Utilisateur DÉJÀ connecté tentant d'aller sur la page d'authentification
  if (to.path === '/auth' && user) {
    return next('/cards')
  }

  next()
})

export default router