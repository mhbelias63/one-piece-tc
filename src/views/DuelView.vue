<template>
  <div 
    class="duel-fullscreen"
    :class="{ 
      'left-hidden': leftCollapsed, 
      'right-hidden': rightCollapsed 
    }"
  >
    <!-- 1. PANNEAU GAUCHE -->
    <DuelLeftSidebar v-model:collapsed="leftCollapsed" />

    <!-- 2. TAPIS CENTRAL -->
    <PlaymatBoard />

    <!-- 3. PANNEAU DROIT -->
    <DuelRightSidebar v-model:collapsed="rightCollapsed" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import DuelLeftSidebar from '../components/duel/DuelLeftSidebar.vue'
import PlaymatBoard from '../components/duel/PlaymatBoard.vue'
import DuelRightSidebar from '../components/duel/DuelRightSidebar.vue'

const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
</script>

<style scoped>
.duel-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: #080b11;
  display: grid;
  grid-template-columns: 320px 1fr 280px;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  user-select: none;
  font-family: system-ui, -apple-system, sans-serif;
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.duel-fullscreen.left-hidden { grid-template-columns: 0px 1fr 280px; }
.duel-fullscreen.right-hidden { grid-template-columns: 320px 1fr 0px; }
.duel-fullscreen.left-hidden.right-hidden { grid-template-columns: 0px 1fr 0px; }
</style>