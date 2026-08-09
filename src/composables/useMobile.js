import { ref, onMounted, onUnmounted } from 'vue'

export function useMobile(breakpoint = 768) {
  const isMobile = ref(false)

  function checkScreen() {
    isMobile.value = window.innerWidth <= breakpoint
  }

  onMounted(() => {
    checkScreen()
    window.addEventListener('resize', checkScreen)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkScreen)
  })

  return { isMobile }
}