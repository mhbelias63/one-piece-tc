import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import DuelEngine, { GameplayPhase, CardZone, GameStyle } from '../engine/DuelEngine'
import { TrainingBotController } from '../ai/trainingBotController'
import cardEffects from '../../card_effects.json'

export const useDuelStore = defineStore('duel', () => {
  // State
  const engine = ref(null)
  const gameState = computed(() => engine.value?.getGameState())
  const isGameActive = ref(false)
  const isInitialized = ref(false)
  const isBotEnabled = ref(false)
  const botHumanPlayerId = ref(0)
  const botController = new TrainingBotController()

  // Computed properties for reactive UI
  const currentPlayer = computed(() => gameState.value?.getCurrentPlayer())
  const opponentPlayer = computed(() => gameState.value?.getOpponentPlayer())
  
  // For AI training mode: always show POV of human player
  const humanPlayer = computed(() => {
    if (!engine.value) return null
    return engine.value.getPlayerState(botHumanPlayerId.value)
  })
  const humanOpponent = computed(() => {
    if (!engine.value) return null
    const oppId = botHumanPlayerId.value === 0 ? 1 : 0
    return engine.value.getPlayerState(oppId)
  })
  
  // Viewed player depends on AI mode
  const viewedPlayer = computed(() => isBotEnabled.value ? humanPlayer.value : currentPlayer.value)
  const viewedOpponent = computed(() => isBotEnabled.value ? humanOpponent.value : opponentPlayer.value)
  
  const currentPhase = computed(() => gameState.value?.currentPhase)
  const turnCount = computed(() => gameState.value?.turnCount)
  const combatLog = computed(() => gameState.value?.combatLog || [])

  // Targeting computed properties
  const isTargetingActive = computed(() => engine.value?.targetingState?.active || false)
  const targetingSource = computed(() => engine.value?.targetingState?.sourceCard || null)
  const targetingOptions = computed(() => engine.value?.targetingState?.validTargets || [])
  const isCardTargetable = computed(() => (card) => {
    if (!isTargetingActive.value || !card) return false
    return engine.value.targetingState.validTargets.some(
      c => c.uniqueInstanceId === card.uniqueInstanceId
    )
  })
  const isChoiceActive = computed(() => engine.value?.choiceState?.active || false)
  const choiceOptions = computed(() => engine.value?.choiceState?.options || [])
  const choiceContext = computed(() => engine.value?.choiceState?.context || null)

  // Player-specific computed properties (using viewed player for fixed POV in AI mode)
  const playerHand = computed(() => viewedPlayer.value?.zones[CardZone.HAND] || [])
  const playerDeploy = computed(() => viewedPlayer.value?.zones[CardZone.DEPLOY] || [])
  const playerStage = computed(() => viewedPlayer.value?.zones[CardZone.STAGE] || [])
  const playerLeader = computed(() => viewedPlayer.value?.zones[CardZone.LEADER] || [])
  const playerDonActive = computed(() => viewedPlayer.value?.zones[CardZone.DON_ACTIVE] || [])
  const playerDonRested = computed(() => viewedPlayer.value?.zones[CardZone.DON_RESTED] || [])
  const playerTrash = computed(() => viewedPlayer.value?.zones[CardZone.TRASH] || [])
  const playerLife = computed(() => viewedPlayer.value?.zones[CardZone.LIFE] || [])
  const playerDeck = computed(() => viewedPlayer.value?.zones[CardZone.DECK] || [])

  // Opponent zones (using viewed opponent)
  const opponentDeploy = computed(() => viewedOpponent.value?.zones[CardZone.DEPLOY] || [])
  const opponentStage = computed(() => viewedOpponent.value?.zones[CardZone.STAGE] || [])
  const opponentLeader = computed(() => viewedOpponent.value?.zones[CardZone.LEADER] || [])
  const opponentDonActive = computed(() => viewedOpponent.value?.zones[CardZone.DON_ACTIVE] || [])
  const opponentDonRested = computed(() => viewedOpponent.value?.zones[CardZone.DON_RESTED] || [])
  const opponentTrash = computed(() => viewedOpponent.value?.zones[CardZone.TRASH] || [])

  function hiddenCard(card, zone) {
    return {
      uniqueInstanceId: card.uniqueInstanceId,
      name: zone === CardZone.LIFE && card.isFaceUp ? card.name : 'Carte face cachee',
      id: zone === CardZone.LIFE && card.isFaceUp ? card.id : null,
      image_url: zone === CardZone.LIFE && card.isFaceUp ? card.image_url : null,
      image: zone === CardZone.LIFE && card.isFaceUp ? card.image : null,
      isFaceUp: zone === CardZone.LIFE && card.isFaceUp,
      isHidden: !(zone === CardZone.LIFE && card.isFaceUp)
    }
  }

  const opponentHand = computed(() => (viewedOpponent.value?.zones[CardZone.HAND] || [])
    .map(card => hiddenCard(card, CardZone.HAND)))
  const opponentLife = computed(() => (viewedOpponent.value?.zones[CardZone.LIFE] || [])
    .map(card => hiddenCard(card, CardZone.LIFE)))
  const opponentDeck = computed(() => (viewedOpponent.value?.zones[CardZone.DECK] || [])
    .map(card => hiddenCard(card, CardZone.DECK)))

  // Combat state
  const attacker = computed(() => {
    if (!gameState.value?.attackerId) return null
    return engine.value?.findCard(gameState.value.attackerId)
  })
  const defender = computed(() => {
    if (!gameState.value?.defenderId) return null
    return engine.value?.findCard(gameState.value.defenderId)
  })
  const isInCombat = computed(() => gameState.value?.isInCombat || false)

  // Game outcome
  const isGameEnded = computed(() => gameState.value?.isGameEnded || false)
  const winner = computed(() => gameState.value?.winner)
  const defeatReason = computed(() => gameState.value?.defeatReason)

  // Resource tracking (using viewed players)
  const playerActiveDon = computed(() => viewedPlayer.value?.activeDonCount || 0)
  const playerRestedDon = computed(() => viewedPlayer.value?.restedDonCount || 0)
  const playerLifeRemaining = computed(() => viewedPlayer.value?.lifeCount || 0)

  const opponentActiveDon = computed(() => viewedOpponent.value?.activeDonCount || 0)
  const opponentRestedDon = computed(() => viewedOpponent.value?.restedDonCount || 0)
  const opponentLifeRemaining = computed(() => viewedOpponent.value?.lifeCount || 0)

  // ============================================================================
  // ACTIONS
  // ============================================================================

  function enrichDeckCards(deck) {
    return (deck || []).map(card => {
      const effectData = cardEffects[card.id]
      const ast = Array.isArray(card.effect_ast)
        ? card.effect_ast
        : effectData?.ast
      if (!ast) return card
      return {
        ...card,
        effect: card.effect ?? effectData?.effect,
        effects: card.effects ?? ast,
        actionV3s: card.actionV3s ?? ast
      }
    })
  }

  function initDuel(deck1, deck2, leader1, leader2, style = GameStyle.LOCAL) {
    try {
      engine.value = new DuelEngine(style)
      engine.value.initializeDuel(
        enrichDeckCards(deck1),
        enrichDeckCards(deck2),
        leader1,
        leader2
      )
      isInitialized.value = true
      isGameActive.value = true
      return true
    } catch (error) {
      console.error('Failed to initialize duel:', error)
      return false
    }
  }

  function startGame() {
    if (!isInitialized.value || !engine.value) return false
    engine.value.startTurn()
    scheduleBotTurn()
    return true
  }

  function configureBot({ enabled = false, humanPlayerId = 0 } = {}) {
    isBotEnabled.value = Boolean(enabled)
    botHumanPlayerId.value = Number(humanPlayerId) === 1 ? 1 : 0
    botController.configure({ enabled: isBotEnabled.value, humanPlayerId: botHumanPlayerId.value })
    scheduleBotTurn()
  }

  function scheduleBotTurn() {
    botController.schedule({
      getEngine,
      get isGameActive() {
        return isGameActive.value
      }
    })
  }

  function playCard(cardId) {
    if (!engine.value) return false
    return engine.value.playCardFromHand(cardId)
  }

  function declareAttack(attackerCardId, defenderCardId) {
    if (!engine.value) return false
    const result = engine.value.declareAttack(attackerCardId, defenderCardId)
    if (result) scheduleBotTurn()
    return result
  }

  function declareBlocker(blockerCardId) {
    if (!engine.value) return false
    return engine.value.declareBlocker(blockerCardId)
  }

  function selectTarget(targetCard) {
    if (!engine.value) return false
    return engine.value.selectTarget(targetCard)
  }

  function chooseEffectOption(index) {
    if (!engine.value) return false
    return engine.value.chooseEffectOption(index)
  }

  function chooseLookAndPlace(cardId, placement) {
    if (!engine.value) return false
    return engine.value.chooseLookAndPlace(cardId, placement)
  }

  function activateMainEffect(cardId) {
    if (!engine.value) return false
    return engine.value.activateMainEffect(cardId)
  }

  function cancelTargeting() {
    if (!engine.value) return
    engine.value.cancelTargetSelection()
  }

  function resolveCombat() {
    if (!engine.value) return false
    engine.value.resolveCombat()
    return true
  }

  function nextPhase() {
    if (!engine.value) return false
    const result = engine.value.nextPhase()
    scheduleBotTurn()
    return result
  }

  function endTurn() {
    if (!engine.value) return false
    engine.value.endTurn()
    engine.value.gameState.switchTurn()
    engine.value.startTurn()
    scheduleBotTurn()
    return true
  }

  function concede() {
    if (!engine.value) return false
    const currentPlayerId = gameState.value.currentPlayerTurnId
    const winnerId = currentPlayerId === 0 ? 1 : 0
    engine.value.endGame(winnerId, 'concede')
    isGameActive.value = false
    return true
  }

  function getEngine() {
    return engine.value
  }

  function resetDuel() {
    botController.clearTimer()
    engine.value = null
    isInitialized.value = false
    isGameActive.value = false
    isBotEnabled.value = false
    botHumanPlayerId.value = 0
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  function findCard(cardId) {
    if (!engine.value) return null
    return engine.value.findCard(cardId)
  }

  function getAvailableDon(playerId = 0) {
    if (!engine.value) return 0
    return engine.value.getPlayerState(playerId).getAvailableDon()
  }

  function getRestedDon(playerId = 0) {
    if (!engine.value) return 0
    return engine.value.getPlayerState(playerId).getRestedDon()
  }

  function canDeployCharacter(playerId = 0) {
    if (!engine.value) return false
    return engine.value.getPlayerState(playerId).canDeployCharacter()
  }

  function getZone(playerId, zoneName) {
    if (!engine.value) return []
    return engine.value.getPlayerState(playerId).getZone(zoneName)
  }

  function getPhaseDisplayName(phase = currentPhase.value) {
    const phaseNames = {
      [GameplayPhase.DRAW]: 'Draw Phase',
      [GameplayPhase.MAIN]: 'Main Phase',
      [GameplayPhase.ATTACK]: 'Attack Phase',
      [GameplayPhase.BLOCK]: 'Block Phase',
      [GameplayPhase.END]: 'End Phase'
    }
    return phaseNames[phase] || 'Unknown'
  }

  return {
    // State
    engine,
    gameState,
    isGameActive,
    isInitialized,
    isBotEnabled,
    botHumanPlayerId,
    currentPhase,
    turnCount,
    combatLog,

    // Targeting
    isTargetingActive,
    targetingSource,
    targetingOptions,
    isCardTargetable,
    isChoiceActive,
    choiceOptions,
    choiceContext,

    // Player zones
    playerHand,
    playerDeploy,
    playerStage,
    playerLeader,
    playerDonActive,
    playerDonRested,
    playerTrash,
    playerLife,
    playerDeck,
    playerActiveDon,
    playerRestedDon,
    playerLifeRemaining,

    // Opponent zones
    opponentHand,
    opponentDeploy,
    opponentStage,
    opponentLeader,
    opponentDonActive,
    opponentDonRested,
    opponentTrash,
    opponentLife,
    opponentDeck,
    opponentActiveDon,
    opponentRestedDon,
    opponentLifeRemaining,

    // Combat
    attacker,
    defender,
    isInCombat,

    // Game outcome
    isGameEnded,
    winner,
    defeatReason,

    // Actions
    initDuel,
    startGame,
    configureBot,
    scheduleBotTurn,
    playCard,
    declareAttack,
    declareBlocker,
    selectTarget,
    chooseEffectOption,
    chooseLookAndPlace,
    activateMainEffect,
    cancelTargeting,
    resolveCombat,
    nextPhase,
    endTurn,
    concede,
    resetDuel,

    // Helpers
    getEngine,
    findCard,
    getAvailableDon,
    getRestedDon,
    canDeployCharacter,
    getZone,
    getPhaseDisplayName
  }
})