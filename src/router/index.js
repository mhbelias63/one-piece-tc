import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CardsView from '../views/CardsView.vue'
import BoosterView from '../views/BoosterView.vue'
import DeckView from '../views/DeckView.vue'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/cards', name: 'Cards', component: CardsView },
  { path: '/gacha', name: 'Gacha', component: BoosterView },
  { path: '/decks', name: 'Decks', component: DeckView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router