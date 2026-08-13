import { ref } from 'vue'
import { useDuelStore } from '../stores/duelStore'

export function useDonManager() {
  const duel = useDuelStore()
  const isDonSelected = ref(false)

  function selectDon() {
    if (duel.currentPhase !== 'main') {
      alert("Vous ne pouvez attacher des Don!! que durant la Main Phase !")
      return
    }

    if (duel.playerActiveDon <= 0) {
      alert("Vous n'avez pas de Don!! Active disponible !")
      return
    }

    // Bascule la sélection
    isDonSelected.value = !isDonSelected.value
  }

  function attachDonTo(targetCard) {
    if (!isDonSelected.value) return false

    // Seules nos cartes sur le terrain (Leader ou Personnages) peuvent recevoir du Don!!
    const success = duel.engine.attachDonToCard(targetCard.uniqueInstanceId)
    
    // Réinitialise la sélection
    isDonSelected.value = false
    return success
  }

  function cancelDonSelection() {
    isDonSelected.value = false
  }

  return {
    isDonSelected,
    selectDon,
    attachDonTo,
    cancelDonSelection
  }
}