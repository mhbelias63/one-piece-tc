import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router' // Import du router
import 'primeicons/primeicons.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia) // Utilisation de Pinia
app.use(router) // Utilisation du router
app.mount('#app')