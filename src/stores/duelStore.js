import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import DuelEngine, { GameplayPhase, CardZone, GameStyle } from '../engine/DuelEngine'

export const useDuelStore = defineStore('duel', () => {
  // State
  const engine = ref(null)
  const gameState = computed(() => engine.value?.getGameState())
  const isGameActive = ref(false)
  const isInitialized = ref(false)

  // Computed properties for reactive UI
  const currentPlayer = computed(() => gameState.value?.getCurrentPlayer())
  const opponentPlayer = computed(() => gameState.value?.getOpponentPlayer())
  const currentPhase = computed(() => gameState.value?.currentPhase)
  const turnCount = computed(() => gameState.value?.turnCount)
  const combatLog = computed(() => gameState.value?.combatLog || [])

  // Player-specific computed properties
  const playerHand = computed(() => currentPlayer.value?.zones[CardZone.HAND] || [])
  const playerDeploy = computed(() => currentPlayer.value?.zones[CardZone.DEPLOY] || [])
  const playerStage = computed(() => currentPlayer.value?.zones[CardZone.STAGE] || [])
  const playerLeader = computed(() => currentPlayer.value?.zones[CardZone.LEADER] || [])
  const playerDonActive = computed(() => currentPlayer.value?.zones[CardZone.DON_ACTIVE] || [])
  const playerDonRested = computed(() => currentPlayer.value?.zones[CardZone.DON_RESTED] || [])
  const playerTrash = computed(() => currentPlayer.value?.zones[CardZone.TRASH] || [])
  const playerLife = computed(() => currentPlayer.value?.zones[CardZone.LIFE] || [])
  const playerDeck = computed(() => currentPlayer.value?.zones[CardZone.DECK] || [])

  // Opponent zones
  const opponentHand = computed(() => opponentPlayer.value?.zones[CardZone.HAND] || [])
  const opponentDeploy = computed(() => opponentPlayer.value?.zones[CardZone.DEPLOY] || [])
  const opponentStage = computed(() => opponentPlayer.value?.zones[CardZone.STAGE] || [])
  const opponentLeader = computed(() => opponentPlayer.value?.zones[CardZone.LEADER] || [])
  const opponentDonActive = computed(() => opponentPlayer.value?.zones[CardZone.DON_ACTIVE] || [])
  const opponentDonRested = computed(() => opponentPlayer.value?.zones[CardZone.DON_RESTED] || [])
  const opponentTrash = computed(() => opponentPlayer.value?.zones[CardZone.TRASH] || [])
  const opponentLife = computed(() => opponentPlayer.value?.zones[CardZone.LIFE] || [])
  const opponentDeck = computed(() => opponentPlayer.value?.zones[CardZone.DECK] || [])

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

  // Resource tracking
  const playerActiveDon = computed(() => currentPlayer.value?.activeDonCount || 0)
  const playerRestedDon = computed(() => currentPlayer.value?.restedDonCount || 0)
  const playerLifeRemaining = computed(() => currentPlayer.value?.lifeCount || 0)

  const opponentActiveDon = computed(() => opponentPlayer.value?.activeDonCount || 0)
  const opponentRestedDon = computed(() => opponentPlayer.value?.restedDonCount || 0)
  const opponentLifeRemaining = computed(() => opponentPlayer.value?.lifeCount || 0)

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Initialize a new duel
   * @param {Card[]} deck1 - Player 1's deck
   * @param {Card[]} deck2 - Player 2's deck
   * @param {string} leader1 - Player 1's leader ID
   * @param {string} leader2 - Player 2's leader ID
   * @param {string} style - Game style (LOCAL, MULTIPLAYER, OBSERVER)
   */
  function initDuel(deck1, deck2, leader1, leader2, style = GameStyle.LOCAL) {
    try {
      engine.value = new DuelEngine(style)
      engine.value.initializeDuel(deck1, deck2, leader1, leader2)
      isInitialized.value = true
      isGameActive.value = true
      return true
    } catch (error) {
      console.error('Failed to initialize duel:', error)
      return false
    }
  }

  /**
   * Start the game (first turn)
   */
  function startGame() {
    if (!isInitialized.value || !engine.value) return false

    engine.value.startTurn()
    return true
  }

  /**
   * Play a card from hand
   * @param {string} cardId - Card's unique instance ID
   */
  function playCard(cardId) {
    if (!engine.value) return false
    return engine.value.playCardFromHand(cardId)
  }

  /**
   * Declare an attack
   * @param {string} attackerCardId - Attacker's card ID
   * @param {string} defenderCardId - Target card ID (opponent's card or leader)
   */
  function declareAttack(attackerCardId, defenderCardId) {
    if (!engine.value) return false
    return engine.value.declareAttack(attackerCardId, defenderCardId)
  }

  /**
   * Declare a blocker
   * @param {string} blockerCardId - Blocker's card ID
   */
  function declareBlocker(blockerCardId) {
    if (!engine.value) return false
    return engine.value.declareBlocker(blockerCardId)
  }

  /**
   * Resolve combat
   */
  function resolveCombat() {
    if (!engine.value) return false
    engine.value.resolveCombat()
    return true
  }

  /**
   * Advance to next phase
   */
  function nextPhase() {
    if (!engine.value) return false
    engine.value.nextPhase()
    return true
  }

  /**
   * End current player's turn
   */
  function endTurn() {
    if (!engine.value) return false
    engine.value.endTurn()
    engine.value.gameState.switchTurn()
    engine.value.startTurn()
    return true
  }

  /**
   * Concede the game
   */
  function concede() {
    if (!engine.value) return false
    const currentPlayerId = gameState.value.currentPlayerTurnId
    const winnerId = currentPlayerId === 0 ? 1 : 0
    engine.value.endGame(winnerId, 'concede')
    isGameActive.value = false
    return true
  }

  /**
   * Get the game engine instance (for debugging)
   */
  function getEngine() {
    return engine.value
  }

  /**
   * Reset the duel state
   */
  function resetDuel() {
    engine.value = null
    isInitialized.value = false
    isGameActive.value = false
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Find a card by its unique instance ID
   */
  function findCard(cardId) {
    if (!engine.value) return null
    return engine.value.findCard(cardId)
  }

  /**
   * Get player's available don (untapped)
   */
  function getAvailableDon(playerId = 0) {
    if (!engine.value) return 0
    return engine.value.getPlayerState(playerId).getAvailableDon()
  }

  /**
   * Get player's rested don (tapped)
   */
  function getRestedDon(playerId = 0) {
    if (!engine.value) return 0
    return engine.value.getPlayerState(playerId).getRestedDon()
  }

  /**
   * Check if player can deploy a character
   */
  function canDeployCharacter(playerId = 0) {
    if (!engine.value) return false
    return engine.value.getPlayerState(playerId).canDeployCharacter()
  }

  /**
   * Get cards in a specific zone for a player
   */
  function getZone(playerId, zoneName) {
    if (!engine.value) return []
    return engine.value.getPlayerState(playerId).getZone(zoneName)
  }

  /**
   * Get phase display name
   */
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
    currentPhase,
    turnCount,
    combatLog,

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
    playCard,
    declareAttack,
    declareBlocker,
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
