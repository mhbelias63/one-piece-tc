/**
 * DUEL ENGINE - Core game data structures and state management
 * Architecture inspired by OPTCGSim with Vue 3 reactivity
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const GameplayPhase = {
  DRAW: 'draw',
  MAIN: 'main',
  ATTACK: 'attack',
  BLOCK: 'block',
  END: 'end'
}

export const CardZone = {
  HAND: 'hand',
  DECK: 'deck',
  DEPLOY: 'deploy',
  STAGE: 'stage',
  DON_COST: 'don_cost',
  DON_ACTIVE: 'don_active',
  DON_RESTED: 'don_rested',
  TRASH: 'trash',
  LIFE: 'life',
  LEADER: 'leader'
}

export const CardState = {
  ACTIVE: 'active',
  RESTED: 'rested',
  TAPPED: 'tapped'
}

export const GameStyle = {
  LOCAL: 'local',
  MULTIPLAYER: 'multiplayer',
  OBSERVER: 'observer'
}

export const GAME_CONSTANTS = {
  DECK_SIZE: 50,
  DON_SIZE: 10,
  MAX_DEPLOY: 5,
  NUM_PLAYERS: 2,
  STARTING_LIFE: 5,
  MAX_HAND_SIZE: 10
}

// ============================================================================
// CARD OBJECT
// ============================================================================

export class Card {
  constructor(cardData) {
    this.id = cardData.id // Unique identifier (e.g., "OP01-001")
    this.name = cardData.name
    this.cost = cardData.cost || 0
    this.power = cardData.power || 0
    this.type = cardData.type // 'character', 'event', 'stage', 'leader'
    this.color = cardData.color
    this.rarity = cardData.rarity
    this.image_url = cardData.image_url

    // State during duel
    this.uniqueInstanceId = Math.random().toString(36).substr(2, 9) // Per-copy unique ID
    this.state = CardState.ACTIVE
    this.isFaceUp = true
    this.powerModifier = 0 // Buffs/debuffs
    this.attachedDon = [] // Don cards attached to this character
    this.canAttack = true
    this.canRest = true
    this.effectImmune = false
    this.restrictions = {} // e.g., { cantPlayOriginalCostOrMore: 5 }

    // Effect tracking
    this.abilitiesUsed = new Set() // Track used abilities (for once per turn)
  }

  getCurrentPower() {
    return Math.max(0, this.power + this.powerModifier)
  }

  hasAbilityUsed(abilityIndex) {
    return this.abilitiesUsed.has(abilityIndex)
  }

  markAbilityUsed(abilityIndex) {
    this.abilitiesUsed.add(abilityIndex)
  }

  resetAbilitiesForTurn() {
    this.abilitiesUsed.clear()
  }
}

// ============================================================================
// PLAYER STATE
// ============================================================================

export class PlayerState {
  constructor(playerId, playerName = '') {
    this.id = playerId // 0 or 1
    this.name = playerName
    this.isLocalPlayer = playerId === 0

    // Zones (arrays of Card objects)
    this.zones = {
      [CardZone.HAND]: [],
      [CardZone.DECK]: [],
      [CardZone.DEPLOY]: [], // Max 5 characters
      [CardZone.STAGE]: [], // Max 1 (usually unique)
      [CardZone.DON_COST]: [], // Don cards in cost area
      [CardZone.DON_ACTIVE]: [], // Active don pile (untapped)
      [CardZone.DON_RESTED]: [], // Rested don pile (tapped)
      [CardZone.TRASH]: [],
      [CardZone.LIFE]: [], // Life deck - takes damage here
      [CardZone.LEADER]: [] // Max 1 leader
    }

    // Game state
    this.lifeCount = GAME_CONSTANTS.STARTING_LIFE
    this.lifeCards = [] // Actual life card objects (face up/down)
    this.donCount = GAME_CONSTANTS.DON_SIZE // Total don in deck
    this.activeDonCount = 0 // Don untapped
    this.restedDonCount = 0 // Don tapped

    // Global effects (field-level)
    this.globalEffects = {
      cantDrawFromLife: false,
      cantUseOnPlay: false,
      cantPlayAnyCharacters: false,
      cantPlayAnyFromHand: false,
      fieldUnblockable: false,
      fieldEffectImmune: false,
      fieldCantAttackLeader: false
    }

    // Turn tracking
    this.handTrashedThisTurn = false
    this.turnEndActiveDon = 0
    this.turnEndGainActiveDon = 0
  }

  getZone(zoneName) {
    return this.zones[zoneName] || []
  }

  addCardToZone(card, zoneName) {
    if (!this.zones[zoneName]) {
      console.warn(`Invalid zone: ${zoneName}`)
      return false
    }
    this.zones[zoneName].push(card)
    return true
  }

  removeCardFromZone(card, zoneName) {
    const zone = this.zones[zoneName]
    const index = zone.findIndex(c => c.uniqueInstanceId === card.uniqueInstanceId)
    if (index > -1) {
      zone.splice(index, 1)
      return true
    }
    return false
  }

  findCardInZone(cardId, zoneName) {
    return this.zones[zoneName].find(c => c.uniqueInstanceId === cardId)
  }

  canDeployCharacter() {
    return this.zones[CardZone.DEPLOY].length < GAME_CONSTANTS.MAX_DEPLOY
  }

  getAvailableDon() {
    return this.activeDonCount
  }

  getRestedDon() {
    return this.restedDonCount
  }

  resetTurnState() {
    this.handTrashedThisTurn = false
    this.turnEndActiveDon = 0
    this.turnEndGainActiveDon = 0
    
    // Reset ability tracking for all cards on field
    this.zones[CardZone.DEPLOY].forEach(card => card.resetAbilitiesForTurn())
    this.zones[CardZone.STAGE].forEach(card => card.resetAbilitiesForTurn())
    this.zones[CardZone.LEADER].forEach(card => card.resetAbilitiesForTurn())
  }
}

// ============================================================================
// ACTION SYSTEM (V3 - Effect Steps)
// ============================================================================

export class CardAction {
  constructor(cardId, actionIndex = 0) {
    this.cardId = cardId // Which card triggered this
    this.actionIndex = actionIndex // Which ability on the card
    this.currentStep = 0 // Which step of the effect we're on
    
    // Targets for this action
    this.targetIds = [] // 2D array of target card IDs per step
    
    // State tracking
    this.savedValue = 0 // For conditional effects
    this.savedCards = [] // Saved card selections
    this.donSpent = 0 // Track don cost
    this.isOpponentReacting = false // Is opponent resolving this?
    this.isComplete = false
  }
}

export class ActionQueue {
  constructor() {
    this.queue = [] // CardAction[]
    this.currentAction = null
    this.isResolving = false
  }

  enqueue(action) {
    this.queue.push(action)
  }

  dequeue() {
    return this.queue.shift()
  }

  peek() {
    return this.queue[0] || null
  }

  clear() {
    this.queue = []
    this.currentAction = null
  }

  isEmpty() {
    return this.queue.length === 0
  }

  size() {
    return this.queue.length
  }
}

// ============================================================================
// GAME STATE
// ============================================================================

export class GameState {
  constructor(style = GameStyle.LOCAL) {
    this.gameStyle = style
    this.currentPhase = GameplayPhase.DRAW
    this.currentPlayerTurnId = 0 // 0 or 1
    this.turnCount = 0
    this.roundCount = 1

    // Players
    this.players = [
      new PlayerState(0, 'Player 1'),
      new PlayerState(1, 'Player 2')
    ]

    // Combat
    this.attackerId = null // Card ID of attacker
    this.defenderId = null // Card ID of defender
    this.isInCombat = false

    // Action queue
    this.actionQueue = new ActionQueue()
    this.triggerQueue = new ActionQueue() // For triggered abilities

    // Game outcome
    this.isGameEnded = false
    this.winner = null // 0 or 1
    this.defeatReason = '' // 'life_zero', 'deck_empty', 'concede', etc.

    // Chat/logging
    this.combatLog = [] // String[]
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerTurnId]
  }

  getOpponentPlayer() {
    return this.players[1 - this.currentPlayerTurnId]
  }

  switchTurn() {
    this.currentPlayerTurnId = 1 - this.currentPlayerTurnId
    this.turnCount++
    this.getCurrentPlayer().resetTurnState()
  }

  changePhase(newPhase) {
    this.currentPhase = newPhase
  }

  logAction(message) {
    this.combatLog.push(`[Turn ${this.turnCount}] ${message}`)
  }

  startCombat(attacker, defender) {
    this.isInCombat = true
    this.attackerId = attacker.uniqueInstanceId
    this.defenderId = defender.uniqueInstanceId
    this.logAction(`Combat: ${attacker.name} attacks ${defender.name}`)
  }

  endCombat() {
    this.isInCombat = false
    this.attackerId = null
    this.defenderId = null
  }
}

// ============================================================================
// DUEL ENGINE CLASS
// ============================================================================

export class DuelEngine {
  constructor(style = GameStyle.LOCAL) {
    this.gameState = new GameState(style)
    this.initialized = false
  }

  /**
   * Initialize the duel with two decks
   * @param {Card[]} deck1 - Player 1's deck
   * @param {Card[]} deck2 - Player 2's deck
   * @param {string} leader1 - Player 1's leader card ID
   * @param {string} leader2 - Player 2's leader card ID
   */
  initializeDuel(deck1, deck2, leader1, leader2) {
    const p1 = this.gameState.players[0]
    const p2 = this.gameState.players[1]

    // Shuffle and set decks
    this.setPlayerDeck(p1, deck1, leader1)
    this.setPlayerDeck(p2, deck2, leader2)

    // Mulligan phase (not implemented here, simplified)
    // For now, draw starting hand
    this.drawStartingHand(p1)
    this.drawStartingHand(p2)

    // Setup don decks
    this.initializeDonDecks(p1)
    this.initializeDonDecks(p2)

    // Setup life decks
    this.initializeLifeDecks(p1)
    this.initializeLifeDecks(p2)

    this.initialized = true
  }

  setPlayerDeck(player, deckList, leaderId) {
    // Shuffle deck
    const shuffled = [...deckList].sort(() => Math.random() - 0.5)
    
    // Set leader
    const leaderCard = new Card(shuffled.find(c => c.id === leaderId))
    player.addCardToZone(leaderCard, CardZone.LEADER)

    // Add deck cards
    shuffled.forEach(cardData => {
      if (cardData.id !== leaderId) {
        const card = new Card(cardData)
        player.addCardToZone(card, CardZone.DECK)
      }
    })
  }

  drawStartingHand(player) {
    const handSize = 4 // TODO: Configurable
    for (let i = 0; i < handSize && player.zones[CardZone.DECK].length > 0; i++) {
      const card = player.zones[CardZone.DECK].shift()
      player.addCardToZone(card, CardZone.HAND)
    }
  }

  initializeDonDecks(player) {
    // Create 10 don cards (generic)
    for (let i = 0; i < GAME_CONSTANTS.DON_SIZE; i++) {
      const donCard = new Card({
        id: `don_${player.id}_${i}`,
        name: 'Don Card',
        type: 'don',
        cost: 0,
        power: 0
      })
      player.addCardToZone(donCard, CardZone.DON_ACTIVE)
    }
    player.activeDonCount = GAME_CONSTANTS.DON_SIZE
    player.restedDonCount = 0
  }

  initializeLifeDecks(player) {
    // Create 5 life cards (generic)
    for (let i = 0; i < GAME_CONSTANTS.STARTING_LIFE; i++) {
      const lifeCard = new Card({
        id: `life_${player.id}_${i}`,
        name: 'Life Card',
        type: 'life',
        cost: 0,
        power: 0
      })
      lifeCard.isFaceUp = false // Face down by default
      player.addCardToZone(lifeCard, CardZone.LIFE)
    }
    player.lifeCount = GAME_CONSTANTS.STARTING_LIFE
  }

  // ========== TURN FLOW ==========

 startTurn() {
  const currentPlayer = this.gameState.getCurrentPlayer()
  this.gameState.changePhase(GameplayPhase.DRAW)
  
  // En Draw Phase : piocher 1 carte du DECK (et pas de la Life)
  this.drawFromDeck(currentPlayer)
  
  // Activer 2 Don au début du tour
  this.activateTurnStartDon(currentPlayer)
}

drawFromDeck(player) {
  const deckZone = player.zones[CardZone.DECK]
  if (deckZone.length === 0) {
    this.endGame(player.id === 0 ? 1 : 0, 'deck_empty')
    return
  }

  const drawnCard = deckZone.shift() // Prend la première carte du deck
  player.addCardToZone(drawnCard, CardZone.HAND)
  this.gameState.logAction(`${player.name} pioche 1 carte (${deckZone.length} restantes dans le deck)`)
}

  activateTurnStartDon(player) {
    // Don cards from rested → active
    const toActivate = Math.min(2, player.restedDonCount) // Usually 2 per turn
    for (let i = 0; i < toActivate; i++) {
      if (player.zones[CardZone.DON_RESTED].length > 0) {
        const don = player.zones[CardZone.DON_RESTED].pop()
        don.state = CardState.ACTIVE
        player.addCardToZone(don, CardZone.DON_ACTIVE)
        player.activeDonCount++
        player.restedDonCount--
      }
    }
  }

  nextPhase() {
    const phases = [
      GameplayPhase.DRAW,
      GameplayPhase.MAIN,
      GameplayPhase.ATTACK,
      GameplayPhase.BLOCK,
      GameplayPhase.END
    ]
    const currentIndex = phases.indexOf(this.gameState.currentPhase)
    const nextPhase = phases[(currentIndex + 1) % phases.length]

    if (nextPhase === GameplayPhase.DRAW) {
      // End of turn for current player
      this.endTurn()
      this.gameState.switchTurn()
      this.startTurn()
    } else {
      this.gameState.changePhase(nextPhase)
    }
  }

  endTurn() {
    const player = this.gameState.getCurrentPlayer()
    
    // Execute end-of-turn effects
    if (player.turnEndActiveDon > 0) {
      this.activateEndOfTurnDon(player, player.turnEndActiveDon)
    }

    // Cleanup
    player.handTrashedThisTurn = false
    
    this.gameState.logAction(`${player.name}'s turn ends`)
  }

  activateEndOfTurnDon(player, amount) {
    const toActivate = Math.min(amount, player.restedDonCount)
    for (let i = 0; i < toActivate; i++) {
      if (player.zones[CardZone.DON_RESTED].length > 0) {
        const don = player.zones[CardZone.DON_RESTED].pop()
        don.state = CardState.ACTIVE
        player.addCardToZone(don, CardZone.DON_ACTIVE)
        player.activeDonCount++
        player.restedDonCount--
      }
    }
  }

  // ========== GAME ACTIONS ==========

  playCardFromHand(cardId) {
  const player = this.gameState.getCurrentPlayer()
  const card = player.findCardInZone(cardId, CardZone.HAND)

  if (!card) {
    console.warn(`Carte non trouvée en main : ${cardId}`)
    return false
  }

  // 1. Vérification du coût en Don!! actif
  if (player.activeDonCount < card.cost) {
    this.gameState.logAction(`Don insuffisant pour poser ${card.name} (Coût: ${card.cost}, Don disponible: ${player.activeDonCount})`)
    return false
  }

  // 2. Traitement selon le type de carte
  if (card.type?.toLowerCase() === 'character') {
    // Vérification de la limite de 5 personnages
    if (!player.canDeployCharacter()) {
      this.gameState.logAction(`Zone Personnage pleine (5 max) !`)
      return false
    }

    // Retrait de la main et déploiement
    player.removeCardFromZone(card, CardZone.HAND)
    player.addCardToZone(card, CardZone.DEPLOY)

    // Consommation du Don (passage de Active -> Rested)
    this.payDonCost(player, card.cost)

    this.gameState.logAction(`${player.name} pose ${card.name} sur le terrain.`)
    return true
  } 
  else if (card.type?.toLowerCase() === 'stage') {
    player.removeCardFromZone(card, CardZone.HAND)
    player.addCardToZone(card, CardZone.STAGE)
    this.payDonCost(player, card.cost)
    this.gameState.logAction(`${player.name} joue la carte Terrain : ${card.name}`)
    return true
  } 
  else if (card.type?.toLowerCase() === 'event') {
    player.removeCardFromZone(card, CardZone.HAND)
    player.addCardToZone(card, CardZone.TRASH)
    this.payDonCost(player, card.cost)
    this.gameState.logAction(`${player.name} joue l'Événement : ${card.name}`)
    return true
  }

  return false
}

// Méthode utilitaire pour basculer le Don actif en Don reposé
payDonCost(player, cost) {
  for (let i = 0; i < cost; i++) {
    if (player.zones[CardZone.DON_ACTIVE].length > 0) {
      const don = player.zones[CardZone.DON_ACTIVE].pop()
      don.state = CardState.RESTED
      player.addCardToZone(don, CardZone.DON_RESTED)
      player.activeDonCount--
      player.restedDonCount++
    }
  }
}

  declareAttack(attackerCardId, defenderCardId) {
    const attacker = this.findCard(attackerCardId)
    const defender = this.findCard(defenderCardId)

    if (!attacker || !defender) {
      console.warn('Invalid attacker or defender')
      return false
    }

    // TODO: Validate attacker/defender can fight

    this.gameState.startCombat(attacker, defender)
    return true
  }

  declareBlocker(defenderCardId, blockerCardId) {
    const blocker = this.findCard(blockerCardId)
    
    if (!blocker) {
      console.warn('Invalid blocker')
      return false
    }

    // TODO: Validate blocker meets requirements

    this.gameState.defenderId = blockerCardId
    this.gameState.logAction(`Blocker declared: ${blocker.name}`)
    return true
  }

  resolveCombat() {
    if (!this.gameState.isInCombat) return

    const attacker = this.findCard(this.gameState.attackerId)
    const defender = this.findCard(this.gameState.defenderId)

    if (!attacker || !defender) return

    const attackerPower = attacker.getCurrentPower()
    const defenderPower = defender.getCurrentPower()

    if (attackerPower > defenderPower) {
      this.knockOutCard(defender)
      this.gameState.logAction(`${defender.name} KO'd!`)
    } else if (defenderPower > attackerPower) {
      this.knockOutCard(attacker)
      this.gameState.logAction(`${attacker.name} KO'd!`)
    } else {
      // Both KO
      this.knockOutCard(attacker)
      this.knockOutCard(defender)
      this.gameState.logAction('Double KO!')
    }

    this.gameState.endCombat()
  }

  knockOutCard(card) {
    const owner = this.findCardOwner(card)
    if (!owner) return

    // Remove from wherever it is
    Object.values(CardZone).forEach(zone => {
      owner.removeCardFromZone(card, zone)
    })

    // Send to trash
    owner.addCardToZone(card, CardZone.TRASH)
  }

  // ========== UTILITIES ==========

  findCard(cardId) {
    for (const player of this.gameState.players) {
      for (const zone of Object.values(CardZone)) {
        const card = player.findCardInZone(cardId, zone)
        if (card) return card
      }
    }
    return null
  }

  findCardOwner(card) {
    for (const player of this.gameState.players) {
      for (const zone of Object.values(CardZone)) {
        if (player.findCardInZone(card.uniqueInstanceId, zone)) {
          return player
        }
      }
    }
    return null
  }

  endGame(winnerId, reason) {
    this.gameState.isGameEnded = true
    this.gameState.winner = winnerId
    this.gameState.defeatReason = reason
    this.gameState.logAction(`Game Over! Winner: Player ${winnerId + 1} (${reason})`)
  }

  getGameState() {
    return this.gameState
  }

  getPlayerState(playerId) {
    return this.gameState.players[playerId]
  }
}

export default DuelEngine
