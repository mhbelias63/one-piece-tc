import { ref } from 'vue'
import { useDuelStore } from '../stores/duelStore'

export function useCombatManager() {
  const duel = useDuelStore()
  const selectedAttacker = ref(null)
  
  const isBlockingPhase = ref(false)
  const availableBlockers = ref([])

  const isCounterPhase = ref(false) // Fenêtre de contre active

  function handleCardClick(card, isOpponent = false) {
    if (!card) return { action: 'none' }
    if (duel.currentPhase !== 'attack' && duel.currentPhase !== 'main') return { action: 'inspect', card }

    // Sélection attaquant
    if (!isOpponent) {
      if (card.state === 'rested') return { action: 'none' }
      selectedAttacker.value = card
      return { action: 'select_attacker', card }
    }

    // Ciblage adverse
    if (isOpponent && selectedAttacker.value) {
      const isCharacter = card.type?.toLowerCase() === 'character'
      if (isCharacter && card.state !== 'rested') {
        alert("Vous ne pouvez attaquer qu'un Personnage incliné (Rested) ou le Leader !")
        return { action: 'none' }
      }

      const attackDeclared = duel.declareAttack(selectedAttacker.value.uniqueInstanceId, card.uniqueInstanceId)

      if (attackDeclared) {
        selectedAttacker.value = null
        const defenderOwner = duel.engine.findCardOwner(card)
        const blockers = defenderOwner.zones['deploy'].filter(c => 
          c.state === 'active' && (c.isBlocker || c.keywords?.includes('blocker'))
        )

        if (blockers.length > 0) {
          availableBlockers.value = blockers
          isBlockingPhase.value = true
        } else {
          // Si pas de bloqueur, on passe directement à la phase de Contre
          isCounterPhase.value = true
        }
      }
    }
    return { action: 'inspect', card }
  }

  function selectBlocker(blockerCard) {
    duel.engine.declareBlocker(blockerCard.uniqueInstanceId)
    isBlockingPhase.value = false
    availableBlockers.value = []
    
    // Après le blocage, passage à l'étape de Contre
    isCounterPhase.value = true
  }

  function passBlock() {
    isBlockingPhase.value = false
    availableBlockers.value = []
    
    // Si pas de blocage, passage à l'étape de Contre
    isCounterPhase.value = true
  }

  function useCounterCard(card) {
    duel.engine.applyCounterFromHand(card.uniqueInstanceId)
  }

  function resolveCombatWithCounter() {
    isCounterPhase.value = false
    duel.resolveCombat()
    duel.engine.clearCombatTempModifiers() // Réinitialise les bonus temporaires à la fin du combat (7-1-5)
  }

  return {
    selectedAttacker,
    isBlockingPhase,
    availableBlockers,
    isCounterPhase,
    handleCardClick,
    selectBlocker,
    passBlock,
    useCounterCard,
    resolveCombatWithCounter
  }
}