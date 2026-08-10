import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CardsView from '../views/CardsView.vue'
import BoosterView from '../views/BoosterView.vue'
import DeckView from '../views/DeckView.vue'
import AuthView from '../views/AuthView.vue'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/cards', name: 'Cards', component: CardsView },
  { path: '/gacha', name: 'Gacha', component: BoosterView },
  { path: '/decks', name: 'Decks', component: DeckView },
  { path: '/auth', name: 'auth', component: AuthView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router