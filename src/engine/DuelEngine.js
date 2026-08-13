/**
 * DUEL ENGINE - Core game data structures and state management
 * Architecture inspired by OPTCGSim with Vue 3 reactivity
 */

import { CARD_ABILITIES } from './CardAbilities'

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
    this.id = cardData.id
    this.name = cardData.name
    this.cost = cardData.cost || 0
    this.power = cardData.power || 0
    this.type = cardData.type
    this.color = cardData.color
    this.rarity = cardData.rarity
    this.image_url = cardData.image_url

    this.counterPower = cardData.counterPower || cardData.counter_power || cardData.counter || 0

    const effectText = (cardData.effect || '').toLowerCase()
    this.isBlocker = 
      cardData.isBlocker || 
      cardData.is_blocker || 
      effectText.includes('blocker') || 
      effectText.includes('bloqueur')

    this.uniqueInstanceId = Math.random().toString(36).substr(2, 9)
    this.state = CardState.ACTIVE
    this.isFaceUp = true
    this.powerModifier = 0
    this.tempCounterPower = 0
    this.attachedDon = []
    this.canAttack = true
    this.canRest = true
    this.effectImmune = false
    this.restrictions = {}

    this.abilitiesUsed = new Set()
  }

  getCurrentPower() {
    const donBonus = (this.attachedDon || []).length * 1000
    const counterBonus = this.tempCounterPower || 0
    return Math.max(0, this.power + this.powerModifier + donBonus + counterBonus)
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
    this.id = playerId
    this.name = playerName
    this.isLocalPlayer = playerId === 0

    this.zones = {
      [CardZone.HAND]: [],
      [CardZone.DECK]: [],
      [CardZone.DEPLOY]: [],
      [CardZone.STAGE]: [],
      [CardZone.DON_COST]: [],
      [CardZone.DON_ACTIVE]: [],
      [CardZone.DON_RESTED]: [],
      [CardZone.TRASH]: [],
      [CardZone.LIFE]: [],
      [CardZone.LEADER]: []
    }

    this.lifeCount = GAME_CONSTANTS.STARTING_LIFE
    this.lifeCards = []
    this.donCount = GAME_CONSTANTS.DON_SIZE
    this.activeDonCount = 0
    this.restedDonCount = 0

    this.globalEffects = {
      cantDrawFromLife: false,
      cantUseOnPlay: false,
      cantPlayAnyCharacters: false,
      cantPlayAnyFromHand: false,
      fieldUnblockable: false,
      fieldEffectImmune: false,
      fieldCantAttackLeader: false
    }

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
    
    this.zones[CardZone.DEPLOY].forEach(card => card.resetAbilitiesForTurn())
    this.zones[CardZone.STAGE].forEach(card => card.resetAbilitiesForTurn())
    this.zones[CardZone.LEADER].forEach(card => card.resetAbilitiesForTurn())
  }
}

// ============================================================================
// GAME STATE
// ============================================================================

export class GameState {
  constructor(style = GameStyle.LOCAL) {
    this.gameStyle = style
    this.currentPhase = GameplayPhase.DRAW
    this.currentPlayerTurnId = 0
    this.turnCount = 1
    this.roundCount = 1

    this.players = [
      new PlayerState(0, 'Player 1'),
      new PlayerState(1, 'Player 2')
    ]

    this.attackerId = null
    this.defenderId = null
    this.isInCombat = false

    this.isGameEnded = false
    this.winner = null
    this.defeatReason = ''
    this.combatLog = []
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerTurnId]
  }

  getOpponentPlayer() {
    return this.players[1 - this.currentPlayerTurnId]
  }

  switchTurn() {
    this.currentPlayerTurnId = 1 - this.currentPlayerTurnId
    if (this.currentPlayerTurnId === 0) {
      this.turnCount++
    }
    this.getCurrentPlayer().resetTurnState()
  }

  changePhase(newPhase) {
    this.currentPhase = newPhase
  }

  logAction(message) {
    this.combatLog.push(`[Tour ${this.turnCount} - ${this.getCurrentPlayer().name}] ${message}`)
  }

  startCombat(attacker, defender) {
    this.isInCombat = true
    this.attackerId = attacker.uniqueInstanceId
    this.defenderId = defender.uniqueInstanceId
    this.logAction(`Combat: ${attacker.name} attaque ${defender.name}`)
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

  initializeDuel(deck1, deck2, leader1, leader2) {
    const p1 = this.gameState.players[0]
    const p2 = this.gameState.players[1]

    this.setPlayerDeck(p1, deck1, leader1)
    this.setPlayerDeck(p2, deck2, leader2)

    this.drawStartingHand(p1)
    this.drawStartingHand(p2)

    this.initializeDonDecks(p1)
    this.initializeDonDecks(p2)

    this.initializeLifeDecks(p1)
    this.initializeLifeDecks(p2)

    this.initialized = true
    this.startTurn()
  }

  setPlayerDeck(player, deckList, leaderId) {
    const shuffled = [...deckList].sort(() => Math.random() - 0.5)
    
    const leaderCard = new Card(shuffled.find(c => c.id === leaderId))
    player.addCardToZone(leaderCard, CardZone.LEADER)

    shuffled.forEach(cardData => {
      if (cardData.id !== leaderId) {
        const card = new Card(cardData)
        player.addCardToZone(card, CardZone.DECK)
      }
    })
  }

  drawStartingHand(player) {
    const handSize = 4
    for (let i = 0; i < handSize && player.zones[CardZone.DECK].length > 0; i++) {
      const card = player.zones[CardZone.DECK].shift()
      card.isFaceUp = true
      player.addCardToZone(card, CardZone.HAND)
    }
  }

  initializeDonDecks(player) {
    player.zones[CardZone.DON_COST] = []
    player.zones[CardZone.DON_ACTIVE] = []
    player.zones[CardZone.DON_RESTED] = []

    for (let i = 0; i < GAME_CONSTANTS.DON_SIZE; i++) {
      const donCard = new Card({
        id: `don_${player.id}_${i}`,
        name: 'Don Card',
        type: 'don',
        cost: 0,
        power: 0
      })
      player.addCardToZone(donCard, CardZone.DON_COST)
    }
    
    player.activeDonCount = 0
    player.restedDonCount = 0
  }

 initializeLifeDecks(player) {
    // Distribution normale : les Vies sont tirées depuis le dessus du deck
    const deck = player.zones[CardZone.DECK]

    for (let i = 0; i < GAME_CONSTANTS.STARTING_LIFE && deck.length > 0; i++) {
      const lifeCard = deck.shift()
      lifeCard.isFaceUp = false
      player.addCardToZone(lifeCard, CardZone.LIFE)
    }

    player.lifeCount = player.zones[CardZone.LIFE].length
  }

  // ========== TURN FLOW ==========

  startTurn() {
    const currentPlayer = this.gameState.getCurrentPlayer()
    this.gameState.changePhase(GameplayPhase.DRAW)
    
    this.refreshAllCards(currentPlayer)

    const isFirstTurnP1 = this.gameState.turnCount === 1 && currentPlayer.id === 0

    if (isFirstTurnP1) {
      this.gameState.logAction(`Premier tour : ${currentPlayer.name} ne pioche pas.`)
    } else {
      this.drawFromDeck(currentPlayer)
    }
    
    this.addDonFromDonDeck(currentPlayer, isFirstTurnP1)
  }

  addDonFromDonDeck(player, isFirstTurnP1) {
    const donToGain = isFirstTurnP1 ? 1 : 2
    let addedCount = 0
    const donDeck = player.zones[CardZone.DON_COST]

    for (let i = 0; i < donToGain; i++) {
      if (donDeck.length > 0) {
        const don = donDeck.pop()
        don.state = CardState.ACTIVE
        player.addCardToZone(don, CardZone.DON_ACTIVE)
        player.activeDonCount++
        addedCount++
      }
    }

    if (addedCount > 0) {
      this.gameState.logAction(`✨ ${player.name} reçoit ${addedCount} Don!! Active.`)
    }
  }

  refreshAllCards(player) {
    player.zones[CardZone.DEPLOY].forEach(card => card.state = CardState.ACTIVE)
    player.zones[CardZone.LEADER].forEach(card => card.state = CardState.ACTIVE)
    player.zones[CardZone.STAGE].forEach(card => card.state = CardState.ACTIVE)

    while (player.zones[CardZone.DON_RESTED].length > 0) {
      const don = player.zones[CardZone.DON_RESTED].pop()
      don.state = CardState.ACTIVE
      player.addCardToZone(don, CardZone.DON_ACTIVE)
      player.activeDonCount++
      player.restedDonCount--
    }

    this.gameState.logAction(`🔄 Cartes et Don!! de ${player.name} redressés.`)
  }

  drawFromDeck(player) {
    const deckZone = player.zones[CardZone.DECK]
    if (deckZone.length === 0) {
      this.endGame(player.id === 0 ? 1 : 0, 'deck_empty')
      return
    }

    const drawnCard = deckZone.shift()
    drawnCard.isFaceUp = true
    player.addCardToZone(drawnCard, CardZone.HAND)
    this.gameState.logAction(`${player.name} pioche 1 carte (${deckZone.length} restantes dans le deck).`)
  }

 drawFromLife(player) {
    const lifeZone = player.zones[CardZone.LIFE]
    if (lifeZone.length === 0) {
      this.endGame(player.id === 0 ? 1 : 0, 'life_zero')
      return
    }

    const drawnCard = lifeZone.pop()
    drawnCard.isFaceUp = true // Rend la carte visible quand elle arrive en main
    player.lifeCount = lifeZone.length

    // ⚡ GESTION DU TRIGGER (Règles 4-6-3 & 10-1-5)
    const ability = CARD_ABILITIES[drawnCard.id]
    const hasTrigger = ability && ability.trigger

    if (hasTrigger) {
      this.gameState.logAction(`💔 ${player.name} subit 1 dégât et révèle une carte avec [TRIGGER] : ${drawnCard.name} !`)
      ability.trigger(this, player, drawnCard)
    } else {
      player.addCardToZone(drawnCard, CardZone.HAND)
      this.gameState.logAction(`💔 ${player.name} subit 1 dégât et ajoute ${drawnCard.name} à sa main.`)
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
      this.endTurn()
      this.gameState.switchTurn()
      this.startTurn()
    } else {
      this.gameState.changePhase(nextPhase)
    }
  }

  endTurn() {
    const player = this.gameState.getCurrentPlayer()
    this.detachAllDon(player)
    player.handTrashedThisTurn = false
    this.gameState.logAction(`Fin du tour de ${player.name}.`)
  }

  // ========== GAME ACTIONS ==========

  playCardFromHand(cardId) {
    const player = this.gameState.getCurrentPlayer()
    const card = player.findCardInZone(cardId, CardZone.HAND)

    if (!card) return false

    if (player.activeDonCount < card.cost) {
      this.gameState.logAction(`Don insuffisant pour poser ${card.name} (Coût: ${card.cost}, Don disponible: ${player.activeDonCount}).`)
      return false
    }

    if (card.type?.toLowerCase() === 'character') {
      if (!player.canDeployCharacter()) {
        this.gameState.logAction(`Zone Personnage pleine (5 max) !`)
        return false
      }

      player.removeCardFromZone(card, CardZone.HAND)
      player.addCardToZone(card, CardZone.DEPLOY)
      this.payDonCost(player, card.cost)

      this.gameState.logAction(`${player.name} pose ${card.name} sur le terrain.`)

      const ability = CARD_ABILITIES[card.id]
      if (ability && ability.onPlay) {
        ability.onPlay(this, player, card)
      }

      return true
    } 
    else if (card.type?.toLowerCase() === 'stage') {
      player.removeCardFromZone(card, CardZone.HAND)
      player.addCardToZone(card, CardZone.STAGE)
      this.payDonCost(player, card.cost)
      this.gameState.logAction(`${player.name} joue le Terrain : ${card.name}.`)
      return true
    } 
    else if (card.type?.toLowerCase() === 'event') {
      player.removeCardFromZone(card, CardZone.HAND)
      player.addCardToZone(card, CardZone.TRASH)
      this.payDonCost(player, card.cost)
      this.gameState.logAction(`${player.name} joue l'Événement : ${card.name}.`)
      return true
    }

    return false
  }

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

  // ========== COMBAT SYSTEM ==========

  declareAttack(attackerCardId, defenderCardId) {
    const attacker = this.findCard(attackerCardId)
    const defender = this.findCard(defenderCardId)

    if (!attacker || !defender) return false

    attacker.state = CardState.RESTED
    this.gameState.startCombat(attacker, defender)

    const ability = CARD_ABILITIES[attacker.id]
    if (ability && ability.onAttack) {
      ability.onAttack(this, attacker)
    }

    return true
  }

  resolveCombat() {
    if (!this.gameState.isInCombat) return false

    const attacker = this.findCard(this.gameState.attackerId)
    const defender = this.findCard(this.gameState.defenderId)

    if (!attacker || !defender) return false

    const attPower = attacker.getCurrentPower()
    const defPower = defender.getCurrentPower()
    const defenderOwner = this.findCardOwner(defender)

    if (defender.type?.toLowerCase() === 'leader') {
      if (attPower >= defPower) {
        this.drawFromLife(defenderOwner)
      } else {
        this.gameState.logAction(`🛡️ Attaque bloquée ! (${attPower} vs ${defPower}).`)
      }
    } 
    else if (defender.type?.toLowerCase() === 'character') {
      if (attPower >= defPower) {
        this.knockOutCard(defender)
        this.gameState.logAction(`💥 ${defender.name} K.O. par ${attacker.name} !`)
      } else {
        this.gameState.logAction(`🛡️ ${defender.name} résiste à l'attaque (${attPower} vs ${defPower}).`)
      }
    }

    this.gameState.endCombat()
    return true
  }

  knockOutCard(card) {
    const owner = this.findCardOwner(card)
    if (!owner) return

    Object.values(CardZone).forEach(zone => {
      owner.removeCardFromZone(card, zone)
    })

    owner.addCardToZone(card, CardZone.TRASH)
  }

  // ========== DON ATTACHMENT SYSTEM ==========

  attachDonToCard(targetCardId) {
    const player = this.gameState.getCurrentPlayer()
    const targetCard = this.findCard(targetCardId)

    if (!targetCard) return false

    if (player.activeDonCount <= 0 || player.zones[CardZone.DON_ACTIVE].length === 0) {
      this.gameState.logAction(`Pas de Don!! Active disponible.`)
      return false
    }

    const donCard = player.zones[CardZone.DON_ACTIVE].pop()
    player.activeDonCount--

    if (!targetCard.attachedDon) {
      targetCard.attachedDon = []
    }
    targetCard.attachedDon.push(donCard)

    this.gameState.logAction(`⚡ 1 Don!! attaché à ${targetCard.name} (+1000 Power). Total Power: ${targetCard.getCurrentPower()}`)
    return true
  }

  detachAllDon(player) {
    const allFieldCards = [
      ...player.zones[CardZone.DEPLOY],
      ...player.zones[CardZone.LEADER]
    ]

    allFieldCards.forEach(card => {
      if (card.attachedDon && card.attachedDon.length > 0) {
        while (card.attachedDon.length > 0) {
          const don = card.attachedDon.pop()
          don.state = CardState.RESTED
          player.addCardToZone(don, CardZone.DON_RESTED)
          player.restedDonCount++
        }
      }
    })
  }

  // ========== BLOCKER SYSTEM ==========

  declareBlocker(blockerCardId) {
    if (!this.gameState.isInCombat) {
      console.warn('Aucun combat en cours.')
      return false
    }

    const blocker = this.findCard(blockerCardId)
    if (!blocker) return false

    const hasBlockerEffect = blocker.isBlocker || blocker.keywords?.includes('blocker')
    if (!hasBlockerEffect) {
      this.gameState.logAction(`⚠️ ${blocker.name} n'a pas la capacité Bloqueur.`)
      return false
    }

    if (blocker.state === CardState.RESTED) {
      this.gameState.logAction(`⚠️ ${blocker.name} est déjà incliné et ne peut pas bloquer.`)
      return false
    }

    blocker.state = CardState.RESTED

    const previousDefender = this.findCard(this.gameState.defenderId)
    this.gameState.defenderId = blocker.uniqueInstanceId

    this.gameState.logAction(`🛡️ [BLOCKER] ${blocker.name} s'interpose pour protéger ${previousDefender?.name || 'la cible'} !`)
    return true
  }

  applyCounterFromHand(cardId) {
    if (!this.gameState.isInCombat) return false

    const defenderOwner = this.gameState.getOpponentPlayer()
    const counterCard = defenderOwner.findCardInZone(cardId, CardZone.HAND)
    const defenderCard = this.findCard(this.gameState.defenderId)

    if (!counterCard || !defenderCard) return false

    if (counterCard.type?.toLowerCase() === 'character' && counterCard.counterPower > 0) {
      defenderOwner.removeCardFromZone(counterCard, CardZone.HAND)
      defenderOwner.addCardToZone(counterCard, CardZone.TRASH)

      defenderCard.tempCounterPower = (defenderCard.tempCounterPower || 0) + counterCard.counterPower
      this.gameState.logAction(`⚡ [COUNTER] ${counterCard.name} (+${counterCard.counterPower}) défaussé ! Nouveau Power : ${defenderCard.getCurrentPower()}`)
      return true
    }

    return false
  }

  // ========== UTILITIES ==========

  clearCombatTempModifiers() {
    this.gameState.players.forEach(player => {
      [...player.zones[CardZone.DEPLOY], ...player.zones[CardZone.LEADER]].forEach(card => {
        card.tempCounterPower = 0
      })
    })
  }

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
    this.gameState.logAction(`Game Over! Gagnant : Player ${winnerId + 1} (${reason})`)
  }

  getGameState() {
    return this.gameState
  }

  getPlayerState(playerId) {
    return this.gameState.players[playerId]
  }
}

export default DuelEngine