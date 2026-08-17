import { ref, watch } from 'vue'
import { useDuelStore } from '../stores/duelStore'

export function useCombatManager() {
  const duel = useDuelStore()
  const selectedAttacker = ref(null)
  
  const isBlockingPhase = ref(false)
  const availableBlockers = ref([])

  const isCounterPhase = ref(false) // Fenêtre de contre active
  const combatInteractionPending = ref(false)
  const combatWindow = ref('idle')

  function advanceCombatWindow() {
    if (!duel.engine?.gameState?.isInCombat) return
    if (duel.isTargetingActive || duel.isChoiceActive) {
      combatInteractionPending.value = true
      return
    }

    combatInteractionPending.value = false
    if (combatWindow.value === 'counter-effect') {
      combatWindow.value = 'counter'
      isCounterPhase.value = true
      return
    }

    combatWindow.value = 'blocking'
    const defender = duel.engine.findCard(duel.engine.gameState.defenderId)
    const defenderOwner = defender && duel.engine.findCardOwner(defender)
    const blockers = defenderOwner?.zones?.deploy?.filter(c => {
      const hasBlockerKeyword = c.keywords instanceof Set
        ? c.keywords.has('blocker')
        : c.keywords?.includes?.('blocker')
      return c.state === 'active' && (c.isBlocker || hasBlockerKeyword)
    }) || []

    if (blockers.length > 0) {
      availableBlockers.value = blockers
      isBlockingPhase.value = true
    } else {
      combatWindow.value = 'counter'
      isCounterPhase.value = true
    }
  }

  watch(
    [() => duel.isTargetingActive, () => duel.isChoiceActive],
    ([targetingActive, choiceActive], [wasTargetingActive, wasChoiceActive]) => {
      if ((wasTargetingActive || wasChoiceActive) && !targetingActive && !choiceActive) {
        advanceCombatWindow()
      }
    }
  )

  watch(() => duel.isInCombat, (inCombat, wasInCombat) => {
    if (inCombat && !wasInCombat) {
      advanceCombatWindow()
    }
    if (!inCombat && wasInCombat) {
      isBlockingPhase.value = false
      isCounterPhase.value = false
      availableBlockers.value = []
      combatWindow.value = 'idle'
    }
  })

  function handleCardClick(card, isOpponent = false) {
    if (!card) return { action: 'none' }
    if (duel.currentPhase !== 'attack' && duel.currentPhase !== 'main') return { action: 'inspect', card }

    if (!isOpponent && duel.currentPhase === 'main') {
      const hasMainEffect = card.effects?.some(effect => effect.proc === 'main')
      if (hasMainEffect && card.state === 'active') {
        const activated = duel.activateMainEffect(card.uniqueInstanceId || card.id)
        if (activated) return { action: 'main_effect', card }
      }
    }

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
        combatWindow.value = 'attack-effect'
      }
    }
    return { action: 'inspect', card }
  }

  function selectBlocker(blockerCard) {
    duel.engine.declareBlocker(blockerCard.uniqueInstanceId)
    combatWindow.value = 'counter'
    isBlockingPhase.value = false
    availableBlockers.value = []
    
    // Après le blocage, passage à l'étape de Contre
    isCounterPhase.value = true
  }

  function passBlock() {
    combatWindow.value = 'counter'
    isBlockingPhase.value = false
    availableBlockers.value = []
    
    // Si pas de blocage, passage à l'étape de Contre
    isCounterPhase.value = true
  }

  function useCounterCard(card) {
    combatWindow.value = 'counter-effect'
    if (card.counterPower > 0) duel.engine.applyCounterFromHand(card.uniqueInstanceId)
    else duel.engine.activateCounterFromHand(card.uniqueInstanceId)
  }

  function resolveCombatWithCounter() {
    if (duel.isTargetingActive || duel.isChoiceActive) return false
    isCounterPhase.value = false
    combatWindow.value = 'idle'
    duel.resolveCombat()
    duel.engine.clearCombatTempModifiers() // Réinitialise les bonus temporaires à la fin du combat (7-1-5)
    return true
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