import { compileEffectAst } from './effectCompiler.js'

/**
 * DUEL ENGINE - Core game data structures and state management
 * Architecture inspirée du système ActV3 d'OPTCGSim avec ciblage et gestion Stage/Event
 */

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
// CARD OBJECT (Format ActV3 Data-Driven)
// ============================================================================

export class Card {
    constructor(cardData) {
        this.id = cardData.id
        this.name = cardData.name
        const rawCost = Number(cardData.cost || 0)
        this.cost = rawCost > 10 && rawCost % 10 === 0 ? rawCost / 10 : rawCost
        this.costModifier = 0
        this.power = cardData.power || 0
        this.type = cardData.type
        this.cardType = cardData.cardType || cardData.subtype || cardData.sub_types || cardData.traits
        this.color = cardData.color
        this.rarity = cardData.rarity
        this.image_url = cardData.image_url || cardData.image || '/CardBackRegular.png'

        this.counterPower = cardData.counterPower || cardData.counter_power || cardData.counter || 0

        const effectText = (cardData.effect || '').toLowerCase()
        this.isBlocker = cardData.isBlocker || cardData.is_blocker || /(?:^|\])\s*\[blocker\]/i.test(effectText)
        this.hasRush = cardData.hasRush || /(?:^|\])\s*\[rush\]/i.test(effectText)
        this.keywords = new Set(cardData.keywords || [])
        if (this.isBlocker) this.keywords.add('blocker')
        if (this.hasRush) this.keywords.add('rush')
        this.printedKeywords = new Set(this.keywords)

        
        // Tableau d'effets (Support AST Parser & ActV3)
this.effects = cardData.effects || cardData.actionV3s || cardData.actions || []
this.actionV3s = this.effects

        this.uniqueInstanceId = Math.random().toString(36).substr(2, 9)
        this.state = CardState.ACTIVE
        this.isFaceUp = true
        this.powerModifier = 0
        this.tempPowerModifier = 0
        this.combatPowerModifier = 0
        this.tempBasePowerOverride = null
        this.tempCounterPower = 0
        this.attachedDon = []
        this.isSummonSick = true
        this.frozenUntilTurn = 0
        this.canAttackActive = false
        this.protections = []
        this.restrictions = []
        this.replacements = []
        this.blockerDisabledUntilTurn = 0
        this.cannotActivateBlockerUntilTurn = 0
        this.silencedUntilTurn = 0
        this.cannotBeRestedUntilTurn = 0
        this.activationConditions = []
        this.extraTurns = 0
        this.lastTrashCount = 0
        this.abilitiesUsed = new Set()
        this.passiveApplied = new Set()
        this.passiveContributions = []
    }

    getEffectiveCost(currentTurn = Infinity) {
        const modifier = this.costModifierExpiresAt && this.costModifierExpiresAt <= currentTurn
            ? 0
            : this.costModifier
        return Math.max(0, this.cost + modifier)
    }

    getCurrentPower() {
        const donBonus = (this.attachedDon || []).length * 1000
        const counterBonus = this.tempCounterPower || 0
        const basePower = this.tempBasePowerOverride ?? this.power
        return Math.max(0, basePower + this.powerModifier + this.tempPowerModifier + this.combatPowerModifier + donBonus + counterBonus)
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

    clearExpiredKeywords(currentTurn) {
        const active = (this.temporaryKeywords || []).filter(entry => entry.untilTurn > currentTurn)
        this.temporaryKeywords = active
        this.keywords = new Set([...(this.printedKeywords || []), ...active.map(entry => entry.keyword)])
        this.hasRush = this.keywords.has('rush')
        this.isBlocker = this.keywords.has('blocker')
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
        this.activeDonCount = 0
        this.restedDonCount = 0
        this.nextPlayCostReduction = null

        this.globalEffects = {
            cantDrawFromLife: false,
            cantUseOnPlay: false,
            cantPlayAnyCharacters: false,
            cantPlayAnyFromHand: false,
            fieldUnblockable: false,
            fieldEffectImmune: false,
            fieldCantAttackLeader: false
        }
        this.passiveReplacements = []
    }

    getZone(zoneName) {
        return this.zones[zoneName] || []
    }

    addCardToZone(card, zoneName) {
        if (!this.zones[zoneName]) return false
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
        return this.zones[zoneName].find(c => c.uniqueInstanceId === cardId || c.id === cardId)
    }

    canDeployCharacter() {
        return this.zones[CardZone.DEPLOY].length < GAME_CONSTANTS.MAX_DEPLOY
    }

    resetTurnState(currentTurn = Infinity) {
        this.zones[CardZone.DEPLOY].forEach(card => {
            card.isSummonSick = false
            card.resetAbilitiesForTurn()
            card.clearExpiredKeywords(currentTurn)
            card.tempPowerModifier = 0
        })
        this.zones[CardZone.STAGE].forEach(card => {
            card.resetAbilitiesForTurn()
            card.clearExpiredKeywords(currentTurn)
            card.tempPowerModifier = 0
        })
        this.zones[CardZone.LEADER].forEach(card => {
            card.resetAbilitiesForTurn()
            card.clearExpiredKeywords(currentTurn)
            card.tempPowerModifier = 0
        })
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
        this.getCurrentPlayer().resetTurnState(this.turnCount)
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
// DUEL ENGINE CLASS WITH TARGETING SYSTEM & STAGE/EVENT SUPPORT
// ============================================================================

export class DuelEngine {
    constructor(style = GameStyle.LOCAL) {
        this.gameState = new GameState(style)
        this.initialized = false
        this.deferredEffects = []

        // État du ciblage interactif
        this.targetingState = {
            active: false,
            action: null,
            sourceCard: null,
            player: null,
            validTargets: [],
            oncePerTurnCard: null,
            oncePerTurnIndex: null
        }
        this.choiceState = {
            active: false,
            options: [],
            sourceCard: null,
            player: null,
            effect: null,
            context: null
        }
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

        for (const player of [p1, p2]) {
            for (const zone of [CardZone.LEADER, CardZone.DEPLOY, CardZone.STAGE]) {
                player.zones[zone].forEach(card => this.registerDeferredEffects(card, player))
            }
        }

        this.initialized = true
        this.startTurn()
    }

    setPlayerDeck(player, deckList, leaderId) {
        const shuffled = [...deckList].sort(() => Math.random() - 0.5)
        const leaderCard = new Card(shuffled.find(c => c.id === leaderId) || { id: leaderId, name: 'Leader' })
        player.addCardToZone(leaderCard, CardZone.LEADER)

        shuffled.forEach(cardData => {
            if (cardData.id !== leaderId) {
                player.addCardToZone(new Card(cardData), CardZone.DECK)
            }
        })
    }

    drawStartingHand(player) {
        for (let i = 0; i < 4 && player.zones[CardZone.DECK].length > 0; i++) {
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
            player.addCardToZone(new Card({ id: `don_${player.id}_${i}`, name: 'Don Card', type: 'don' }), CardZone.DON_COST)
        }
    }

    initializeLifeDecks(player) {
        const deck = player.zones[CardZone.DECK]
        for (let i = 0; i < GAME_CONSTANTS.STARTING_LIFE && deck.length > 0; i++) {
            const lifeCard = deck.shift()
            lifeCard.isFaceUp = false
            player.addCardToZone(lifeCard, CardZone.LIFE)
        }
        player.lifeCount = player.zones[CardZone.LIFE].length
    }

    // ========== TARGETING SYSTEM ==========

    startTargetSelection(action, sourceCard, player, validTargets) {
        if (!validTargets || validTargets.length === 0) {
            this.gameState.logAction(`⚡ [ActV3] ${sourceCard.name} : Aucune cible valide.`)
            return
        }

        this.targetingState = {
            active: true,
            action,
            sourceCard,
            player,
            validTargets,
            oncePerTurnCard: null,
            oncePerTurnIndex: null
        }

        this.gameState.logAction(`🎯 Sélectionnez une cible pour l'effet de ${sourceCard.name}.`)
    }

    selectTarget(targetCard) {
        if (!this.targetingState.active) return false

        const isValid = this.targetingState.validTargets.some(
            c => c.uniqueInstanceId === targetCard.uniqueInstanceId
        )

        if (!isValid) {
            this.gameState.logAction(`⚠️ Cible invalide.`)
            return false
        }

        const { action, sourceCard, player } = this.targetingState

        if (action.type === 'trash_hand_after_draw') {
            player.removeCardFromZone(targetCard, CardZone.HAND)
            player.addCardToZone(targetCard, CardZone.TRASH)
            player.lastTrashCount = (player.lastTrashCount || 0) + 1
            action.remaining -= 1
            if (action.remaining > 0) {
                this.targetingState.validTargets = player.zones[CardZone.HAND]
                if (this.targetingState.validTargets.length === 0) this.cancelTargetSelection()
                return true
            }
            this.cancelTargetSelection()
            return true
        }

        if (action.type === 'look_and_place_card') {
            return this.chooseLookAndPlace(targetCard.uniqueInstanceId, action.placement)
        }

        if (action.type === 'multi_select_target') {
            if (!action.selected.some(card => card.uniqueInstanceId === targetCard.uniqueInstanceId)) {
                action.selected.push(targetCard)
            }
            action.remaining -= 1
            if (action.remaining > 0) {
                this.targetingState.validTargets = this.targetingState.validTargets.filter(card => card !== targetCard)
                return true
            }
            const continuation = this.targetingState.continuation
            const selected = [...action.selected]
            this.cancelTargetSelection()
            if (continuation) {
                const context = continuation.executionContext
                context.selected = selected
                this.executeCompiledEffect(continuation.effect, continuation.card, continuation.player, context, continuation.nextIndex)
            }
            return true
        }

        if (action.type === 'replace_effect_character') {
            const cardToPlay = action.cardToPlay
            const continuation = this.targetingState.continuation
            this.discardForRule(targetCard, player)
            Object.values(CardZone).forEach(zone => player.removeCardFromZone(cardToPlay, zone))
            cardToPlay.state = action.endState === 'rested' ? CardState.RESTED : CardState.ACTIVE
            cardToPlay.isSummonSick = !cardToPlay.hasRush
            player.addCardToZone(cardToPlay, CardZone.DEPLOY)
            this.registerPassiveEffects(cardToPlay, player)
            this.registerDeferredEffects(cardToPlay, player)
            this.applyPassiveEffects(player)
            this.triggerActV3Actions(cardToPlay, 'onPlay', player)
            this.cancelTargetSelection()
            if (continuation) {
                this.executeCompiledEffect(continuation.effect, continuation.card, continuation.player, continuation.executionContext, continuation.nextIndex)
            }
            return true
        }

        if (action.type === 'pay_cost_target') {
            const effect = action.effect
            const selectedTarget = targetCard
            const targetOwner = action.targetOwner || player
            Object.values(CardZone).forEach(zone => targetOwner.removeCardFromZone(selectedTarget, zone))
            targetOwner.zones[CardZone.DECK].push(selectedTarget)
            if (effect.cost) this.payEffectCost(effect.cost, player, sourceCard)
            this.gameState.logAction(`💰 [Coût] ${sourceCard.name} place ${selectedTarget.name} au fond du deck.`)
            this.commitTargetedOncePerTurn()
            this.cancelTargetSelection()
            const compiledEffect = compileEffectAst(effect)
            this.executeCompiledEffect(compiledEffect, sourceCard, player)
            return true
        }

        if (action.type === 'pay_give_don_target') {
            const amount = Number(action.cost.amount || 1)
            const targetOwner = action.opponent ? this.gameState.getOpponentPlayer() : player
            for (let index = 0; index < amount; index++) {
                const don = action.opponent
                    ? targetOwner.zones[CardZone.DON_RESTED].pop()
                    : player.zones[CardZone.DON_ACTIVE].pop()
                if (!don) break
                don.state = action.opponent ? CardState.RESTED : CardState.ACTIVE
                targetCard.attachedDon = targetCard.attachedDon || []
                targetCard.attachedDon.push(don)
            }
            this.commitTargetedOncePerTurn()
            this.cancelTargetSelection()
            this.executeCompiledEffect(compileEffectAst(action.effect), sourceCard, player)
            return true
        }

        if (action.type === 'pay_rest_typed_target') {
            targetCard.state = CardState.RESTED
            this.commitTargetedOncePerTurn()
            this.cancelTargetSelection()
            this.executeCompiledEffect(compileEffectAst(action.effect), sourceCard, player)
            return true
        }

        if (action.type === 'pay_self_named_target') {
            const target = targetCard
            Object.values(CardZone).forEach(zone => player.removeCardFromZone(target, zone))
            Object.values(CardZone).forEach(zone => player.removeCardFromZone(sourceCard, zone))
            player.zones[CardZone.DECK].push(sourceCard, target)
            this.commitTargetedOncePerTurn()
            this.cancelTargetSelection()
            this.executeCompiledEffect(compileEffectAst(action.effect), sourceCard, player)
            return true
        }

        if (action.type === 'pay_trash_character_target') {
            Object.values(CardZone).forEach(zone => player.removeCardFromZone(targetCard, zone))
            player.addCardToZone(targetCard, CardZone.TRASH)
            this.commitTargetedOncePerTurn()
            this.cancelTargetSelection()
            this.executeCompiledEffect(compileEffectAst(action.effect), sourceCard, player)
            return true
        }

        if (action.kind) {
            const context = { previous: null, selected: [targetCard], revealed: [] }
            this.executeCompiledAction(action, sourceCard, player, context)
            this.gameState.logAction(`🎯 [Effet] ${sourceCard.name} cible ${targetCard.name}.`)
            const continuation = this.targetingState.continuation
            this.commitTargetedOncePerTurn()
            this.cancelTargetSelection()
            if (continuation) {
                this.executeCompiledEffect(
                    continuation.effect,
                    continuation.card,
                    continuation.player,
                    context,
                    continuation.nextIndex
                )
            }
            return true
        }

        if (action.type === 'knockout_max_cost') {
            this.knockOutCard(targetCard)
            this.gameState.logAction(`💥 [ActV3] ${sourceCard.name} met K.O. ${targetCard.name} !`)
        } else if (action.type === 'rest_opponent_character') {
            targetCard.state = CardState.RESTED
            this.gameState.logAction(`💤 [ActV3] ${sourceCard.name} incline ${targetCard.name} !`)
        } else if (action.type === 'replace_character') {
            const { cardToPlay } = action
            
            // 1. Défausse le personnage sélectionné
            this.discardForRule(targetCard, player)
            this.gameState.logAction(`🗑️ ${targetCard.name} est envoyé au Trash pour libérer de la place.`)

            // 2. Pose le nouveau personnage depuis la main
            player.removeCardFromZone(cardToPlay, CardZone.HAND)
            cardToPlay.state = CardState.ACTIVE
            cardToPlay.isSummonSick = !cardToPlay.hasRush
            player.addCardToZone(cardToPlay, CardZone.DEPLOY)
            this.payDonCost(player, cardToPlay.getEffectiveCost(this.gameState.turnCount))

            this.gameState.logAction(`✨ ${player.name} pose ${cardToPlay.name} à la place !`)
            this.triggerActV3Actions(cardToPlay, 'onPlay', player)
        }

        this.cancelTargetSelection()
        return true
    }

    cancelTargetSelection() {
        this.targetingState = {
            active: false,
            action: null,
            sourceCard: null,
            player: null,
            validTargets: [],
            oncePerTurnCard: null,
            oncePerTurnIndex: null
        }
    }

    commitTargetedOncePerTurn() {
        const { oncePerTurnCard, oncePerTurnIndex } = this.targetingState
        if (oncePerTurnCard && oncePerTurnIndex !== null) {
            oncePerTurnCard.markAbilityUsed(oncePerTurnIndex)
        }
    }

    chooseEffectOption(index) {
        if (!this.choiceState.active) return false
        const { options, sourceCard, player, context } = this.choiceState
        const option = options[index]
        if (option === undefined) return false

        if (option.type === 'ko_choice') {
            const choiceAction = option.action
            this.choiceState = { active: false, options: [], sourceCard: null, player: null, effect: null, context: null, triggerCard: null }
            const targetOwner = this.gameState.getOpponentPlayer()
            const zone = choiceAction.zone === CardZone.STAGE ? CardZone.STAGE : CardZone.DEPLOY
            const validTargets = zone === CardZone.STAGE
                ? targetOwner.zones[CardZone.STAGE].filter(target => this.matchesCompiledFilter(target, choiceAction.target))
                : targetOwner.zones[CardZone.DEPLOY].filter(target => this.matchesCompiledFilter(target, choiceAction.target))
            if (validTargets.length === 0) return false
            this.startTargetSelection({ kind: choiceAction.kind, target: choiceAction.target }, sourceCard, player, validTargets)
            return true
        }

        if (option.type === 'ko_or_rest') {
            const actionKind = option.action === 'rest' ? 'Rest' : 'KOCard'
            this.choiceState = { active: false, options: [], sourceCard: null, player: null, effect: null, context: null, triggerCard: null }
            const targetOwner = this.gameState.getOpponentPlayer()
            const validTargets = targetOwner.zones[CardZone.DEPLOY].filter(target => this.matchesCompiledFilter(target, context.target))
            if (validTargets.length === 0) return false
            this.startTargetSelection({ kind: actionKind, target: context.target }, sourceCard, player, validTargets)
            return true
        }

        if (option.type === 'optional_replacement') {
            const { replacement, cause, koCard } = context
            this.choiceState = { active: false, options: [], sourceCard: null, player: null, effect: null, context: null, triggerCard: null }
            
            if (index === 0) {
                this.gameState.logAction(`✅ ${player.name} active le remplacement optionnel de ${koCard.name}.`)
                const action = replacement.action
                if (!action) return false
                if (action === 'trash_to_bottom_deck' || action.type === 'bottom_deck') {
                    Object.values(CardZone).forEach(zone => player.removeCardFromZone(koCard, zone))
                    player.zones[CardZone.DECK].push(koCard)
                } else if (action === 'return_don' || action.type === 'return_don') {
                    const dons = koCard.attachedDon || []
                    while (dons.length > 0) {
                        const don = dons.pop()
                        don.state = CardState.RESTED
                        player.addCardToZone(don, CardZone.DON_RESTED)
                        player.restedDonCount++
                    }
                } else if (action === 'trash_self' || action.type === 'trash_self') {
                    const replacementSource = replacement.sourceCard || koCard
                    Object.values(CardZone).forEach(zone => player.removeCardFromZone(replacementSource, zone))
                    player.addCardToZone(replacementSource, CardZone.TRASH)
                } else if (action.type === 'rest_self') {
                    koCard.state = CardState.RESTED
                } else if (action.type === 'rest_don' && action.amount) {
                    for (let i = 0; i < action.amount; i++) {
                        const don = player.zones[CardZone.DON_ACTIVE].pop()
                        if (!don) break
                        don.state = CardState.RESTED
                        player.zones[CardZone.DON_RESTED].push(don)
                        player.activeDonCount = Math.max(0, player.activeDonCount - 1)
                        player.restedDonCount++
                    }
                } else if (action.type === 'give_power') {
                    const leader = player.zones[CardZone.LEADER][0]
                    if (leader) leader.tempPowerModifier += action.value || 0
                } else if (action.type === 'rest_card') {
                    const targets = player.zones[CardZone.DEPLOY]
                        .filter(target => target.state === CardState.ACTIVE)
                        .slice(0, action.amount || 1)
                    targets.forEach(target => { target.state = CardState.RESTED })
                } else if (action === 'turn_life_faceup' || action.type === 'turn_life_faceup') {
                    const lifeCard = player.zones[CardZone.LIFE][player.zones[CardZone.LIFE].length - 1]
                    if (lifeCard) lifeCard.isFaceUp = true
                } else if (action.type === 'add_to_life_facedown') {
                    Object.values(CardZone).forEach(zone => player.removeCardFromZone(koCard, zone))
                    koCard.isFaceUp = false
                    player.addCardToZone(koCard, CardZone.LIFE)
                    player.lifeCount = player.zones[CardZone.LIFE].length
                } else if (action.type === 'multi' && Array.isArray(action.actions)) {
                    for (const nested of action.actions) {
                        if (nested.type === 'trash_self') {
                            const replacementSource = replacement.sourceCard || koCard
                            Object.values(CardZone).forEach(zone => player.removeCardFromZone(replacementSource, zone))
                            player.addCardToZone(replacementSource, CardZone.TRASH)
                        } else if (nested.type === 'draw') {
                            for (let i = 0; i < (nested.amount || 1); i++) this.drawFromDeck(player)
                        }
                    }
                } else {
                    return false
                }
                if (replacement.oncePerTurn) replacement.usedTurn = this.gameState.turnCount
                else {
                    if (koCard.replacements) koCard.replacements = koCard.replacements.filter(r => r !== replacement)
                    if (player.passiveReplacements) player.passiveReplacements = player.passiveReplacements.filter(r => r !== replacement)
                }
                return true
            } else {
                this.gameState.logAction(`❌ ${player.name} refuse le remplacement optionnel de ${koCard.name}.`)
                Object.values(CardZone).forEach(zone => player.removeCardFromZone(koCard, zone))
                player.addCardToZone(koCard, CardZone.TRASH)
                player.lastTrashCount = 1
                this.triggerActV3Actions(koCard, 'onKO', player)
                return true
            }

        }

        if (option.type === 'activate_trigger' || option.type === 'take_life_card') {
            const triggerCard = this.choiceState.triggerCard
            this.choiceState = {
                active: false,
                options: [],
                sourceCard: null,
                player: null,
                effect: null,
                context: null,
                triggerCard: null
            }
            if (!triggerCard) return false
            if (option.type === 'activate_trigger') {
                this.gameState.logAction(`⚡ ${player.name} active le Trigger de ${triggerCard.name}.`)
                this.triggerActV3Actions(triggerCard, 'trigger', player)
                player.addCardToZone(triggerCard, CardZone.TRASH)
            } else {
                player.addCardToZone(triggerCard, CardZone.HAND)
                this.gameState.logAction(`💔 ${player.name} ajoute ${triggerCard.name} à sa main sans activer le Trigger.`)
            }
            return true
        }

        this.choiceState = {
            active: false,
            options: [],
            sourceCard: null,
            player: null,
            effect: null,
            context: null,
            triggerCard: null
        }

        const action = typeof option === 'object' ? option : this.parseChoiceText(option)
        if (!action) {
            this.gameState.logAction(`⚠️ Choix non exécutable : ${String(option)}`)
            return false
        }
        const compiled = compileEffectAst({ type: 'multi', actions: [action] })
        this.executeCompiledEffect(compiled, sourceCard, player)
        return true
    }

    chooseLookAndPlace(cardId, placement) {
        const context = this.choiceState.context
        if (!this.choiceState.active || context?.type !== 'look_and_place') return false
        if (!['top', 'bottom'].includes(placement)) return false

        const cardIndex = context.revealed.findIndex(card => card.uniqueInstanceId === cardId)
        if (cardIndex < 0) return false
        const [selected] = context.revealed.splice(cardIndex, 1)
        selected.isFaceUp = false
        context[placement].push(selected)

        if (context.revealed.length > 0) return true

        this.choiceState = { active: false, options: [], sourceCard: null, player: null, effect: null, context: null, triggerCard: null }
        context.player.zones[CardZone.DECK].unshift(...[...context.top].reverse())
        context.player.zones[CardZone.DECK].push(...context.bottom)

        if (context.continuation) {
            this.executeCompiledEffect(
                context.continuation.effect,
                context.continuation.card,
                context.continuation.player,
                context.continuation.executionContext,
                context.continuation.nextIndex
            )
        }
        return true
    }

    parseChoiceText(option) {
        const text = String(option).toLowerCase()
        const drawMatch = text.match(/draw (\d+) cards?/) 
        if (drawMatch) return { type: 'draw', amount: Number(drawMatch[1]) }
        const costMatch = text.match(/cost of (\d+) or less/)
        const powerMatch = text.match(/(-?\d+) power/)
        if (text.includes('k.o.') || text.includes('k.o ')) {
            return { type: 'knockout', amount: 1, target: { targetType: 'character', opponent: true, ...(costMatch ? { maxCost: Number(costMatch[1]) } : {}), ...(powerMatch ? { maxPower: Number(powerMatch[1]) } : {}) } }
        }
        if (text.includes('trash up to') && text.includes("opponent's characters")) {
            return { type: 'trash_card', amount: 1, target: { targetType: 'character', opponent: true, ...(costMatch ? { maxCost: Number(costMatch[1]) } : {}) } }
        }
        if (text.includes('rest up to') && text.includes("opponent's characters")) {
            return { type: 'rest_card', amount: 1, target: { targetType: 'character', opponent: true, ...(costMatch ? { maxCost: Number(costMatch[1]) } : {}) } }
        }
        if (text.includes('rest up to') && text.includes('don')) return { type: 'rest_opp_don', amount: 1 }
        if (text.includes('return up to') && text.includes("owner's hand")) {
            return { type: 'return_to_hand', amount: 1, target: { targetType: 'character', opponent: true, ...(costMatch ? { maxCost: Number(costMatch[1]) } : {}) } }
        }
        if (text.includes('give up to') && text.includes('cost during')) {
            const valueMatch = text.match(/(\d+) cost/)
            return { type: 'give_cost', target: { targetType: 'character', opponent: true, ...(costMatch ? { maxCost: Number(costMatch[1]) } : {}) }, value: -Number(valueMatch?.[1] || 1), duration: 'turn' }
        }
        if (text.includes('give up to') && text.includes('power')) {
            return { type: 'give_power', target: { targetType: 'character', opponent: true }, value: Number(powerMatch?.[1] || 0), duration: 'turn' }
        }
        if (text.includes('gains [blocker]')) return { type: 'gain_keyword', target: { targetType: 'character', cardType: 'Dressrosa' }, keyword: 'blocker', duration: 'until_opp_next_end_phase' }
        if (text.includes('cannot be rested')) return { type: 'cannot_be_rested', target: { targetType: 'character', opponent: true }, duration: 'until_opp_next_end_phase' }
        if (text.includes('trash 1 card from their hand') || text.includes('trashes 1 card from their hand')) return { type: 'trash_hand', amount: 1 }
        if (text.includes('places 3 cards from their trash at bottom of their deck')) return { type: 'opponent_place_trash_to_deck', amount: 3 }
        if (text.includes('look at all of your opponent\'s life cards')) return { type: 'look_at_life_all', target: 'opponent' }
        if (text.includes('turn all of your life cards face-down')) return { type: 'turn_life_facedown', amount: 99 }
        if (text.includes('deal 1 damage')) return { type: 'take_damage', target: 'opponent', amount: 1 }
        if (text.includes('rest this character')) return { type: 'rest_self' }
        if (text.includes('set') && text.includes('active')) return { type: 'set_active', target: 'self' }
        if (text.includes('return') && text.includes('owner')) return { type: 'return_to_hand', target: 'opponent_character' }
        return null
    }

    // ========== SYSTEM ACTV3 ==========

    // ========== SYSTEME DE DECLENCHEMENT AST & ACTV3 ==========

    /**
     * Déclenche tous les effets associés à un timing précis (procType) pour une carte.
     */
    triggerActV3Actions(card, procType, ownerPlayer) {
        if (!card) return;
        if (card.silencedUntilTurn > this.gameState.turnCount) return;

        // On supporte aussi bien 'effects' (du parser) que 'actionV3s' (ancien format)
        const effectsToEvaluate = card.effects || card.actionV3s || [];
        if (effectsToEvaluate.length === 0) return;

        const matchingEffects = effectsToEvaluate.filter(eff => eff.proc === procType);

        matchingEffects.forEach((effect, index) => {
            // 1. Vérification DON!! requis
            if (effect.donReq && (card.attachedDon || []).length < effect.donReq) {
                this.gameState.logAction(`⚠️ [Effet] ${card.name} : DON!! x${effect.donReq} requis non atteint.`);
                return;
            }

            if (effect.oncePerTurn && card.hasAbilityUsed(index)) {
                return
            }
            const effectCosts = Array.isArray(effect.cost) ? effect.cost : (effect.cost ? [effect.cost] : [])
            const selectableCost = effectCosts.find(cost => ['place_own_char_bottom_deck', 'place_own_bottom_deck', 'place_owner_deck'].includes(cost?.type))
            if (selectableCost) {
                const target = selectableCost.target || {}
                const targetOwner = selectableCost.type === 'place_owner_deck' && target.targetType === 'character'
                    ? this.gameState.getOpponentPlayer()
                    : ownerPlayer
                const sourceZone = target.targetType === 'stage' ? CardZone.STAGE : CardZone.DEPLOY
                const validTargets = targetOwner.zones[sourceZone].filter(candidate => {
                    if (target.targetType === 'character' && candidate.type?.toLowerCase() !== 'character') return false
                    if (target.exactPower !== undefined && candidate.getCurrentPower() !== target.exactPower) return false
                    if (target.maxCost !== undefined && candidate.cost > target.maxCost) return false
                    return candidate !== card
                })
                if (validTargets.length === 0) return
                this.startTargetSelection({ type: 'pay_cost_target', effect, targetOwner }, card, ownerPlayer, validTargets)
                return
            }
            const giveDonCost = effectCosts.find(cost => ['give_don_cost', 'give_opp_don_cost'].includes(cost?.type))
            if (giveDonCost) {
                const opponent = giveDonCost.type === 'give_opp_don_cost'
                const targetOwner = opponent ? this.gameState.getOpponentPlayer() : ownerPlayer
                const rawTarget = String(giveDonCost.target || '')
                const nameMatch = rawTarget.match(/\[([^\]]+)\]/)
                const validTargets = [...targetOwner.zones[CardZone.LEADER], ...targetOwner.zones[CardZone.DEPLOY]]
                    .filter(candidate => !nameMatch || candidate.name?.toLowerCase().includes(nameMatch[1].toLowerCase()))
                const availableDon = opponent ? targetOwner.zones[CardZone.DON_RESTED].length : ownerPlayer.zones[CardZone.DON_ACTIVE].length
                if (validTargets.length === 0 || availableDon < Number(giveDonCost.amount || 1)) return
                this.startTargetSelection({ type: 'pay_give_don_target', effect, cost: giveDonCost, opponent }, card, ownerPlayer, validTargets)
                return
            }
            const restTypedCost = effectCosts.find(cost => cost?.type === 'rest_typed_leader_or_stage')
            if (restTypedCost) {
                const validTargets = [
                    ...ownerPlayer.zones[CardZone.LEADER],
                    ...ownerPlayer.zones[CardZone.STAGE]
                ].filter(candidate => {
                    const traits = String(candidate.cardType || candidate.traits || '').toLowerCase()
                    return candidate.state === CardState.ACTIVE
                        && (!traits || traits.includes(String(restTypedCost.cardType || '').toLowerCase()))
                })
                if (validTargets.length === 0) return
                this.startTargetSelection({ type: 'pay_rest_typed_target', effect }, card, ownerPlayer, validTargets)
                return
            }
            const selfNamedCost = effectCosts.find(cost => cost?.type === 'place_self_and_named_bottom_deck')
            if (selfNamedCost) {
                const validTargets = ownerPlayer.zones[CardZone.TRASH].filter(candidate => {
                    const normalizeName = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                    return (!selfNamedCost.name || normalizeName(candidate.name).includes(normalizeName(selfNamedCost.name)))
                        && (selfNamedCost.power === undefined || candidate.power === selfNamedCost.power)
                })
                if (validTargets.length === 0) return
                this.startTargetSelection({ type: 'pay_self_named_target', effect }, card, ownerPlayer, validTargets)
                return
            }
            const trashCharacterCost = effectCosts.find(cost => cost?.type === 'trash_character')
            if (trashCharacterCost) {
                const minPower = Number(trashCharacterCost.powerCond?.minPower || 0)
                const validTargets = ownerPlayer.zones[CardZone.DEPLOY].filter(candidate => {
                    return candidate.type?.toLowerCase() === 'character'
                        && candidate.getCurrentPower() >= minPower
                })
                if (validTargets.length === 0) return
                this.startTargetSelection({ type: 'pay_trash_character_target', effect }, card, ownerPlayer, validTargets)
                return
            }
            if (effect.cost && !this.canPayEffectCost(effect.cost, ownerPlayer, card)) {
                this.gameState.logAction(`⚠️ [Effet] ${card.name} : coût de résolution non disponible.`)
                return
            }
            if (effect.cost) {
                this.payEffectCost(effect.cost, ownerPlayer, card)
                const costs = Array.isArray(effect.cost) ? effect.cost : [effect.cost]
                if (costs.some(cost => (cost?.kind || cost?.type) === 'rest_self')) card.state = CardState.RESTED
            }

            if (effect.type === 'give_don'
                && effect.state === 'rested'
                && ownerPlayer.zones[CardZone.DON_RESTED].length < Number(effect.amount || 1)) {
                this.gameState.logAction(`⚠️ [Effet] ${card.name} : aucun DON!! reposé disponible.`)
                return
            }

            // Exécution : les cartes issues du parser passent par l’IR normalisé.
            const compiledEffect = effect.kind || effect.actions?.some(action => action.kind)
                ? effect
                : compileEffectAst(effect)
            this.gameState.logAction(`⚡ [Effet] ${card.name} déclenche ${procType}${effect.oncePerTurn ? ' (une fois par tour)' : ''}.`)
            const executionResult = this.executeCompiledEffect(compiledEffect, card, ownerPlayer)

            if (effect.oncePerTurn && executionResult?.skipped) {
                return
            }
            if (effect.oncePerTurn && this.targetingState.active) {
                this.targetingState.oncePerTurnCard = card
                this.targetingState.oncePerTurnIndex = index
            } else if (effect.oncePerTurn) {
                card.markAbilityUsed(index);
            }
        });
    }

    registerDeferredEffects(card, ownerPlayer) {
        if (!card || !ownerPlayer) return
        for (const effect of card.effects || card.actionV3s || []) {
            const text = String(effect.condition?.text || effect.triggerCondition || '').toLowerCase()
            const eventType = text.includes('opponent activates an event') ? 'event_activated'
                : text.includes('character attacks') || text.includes('character attack') ? 'character_attacked'
                    : text.includes('when a card is removed') || text.includes('would leave the field') ? 'leave_field'
                        : text.includes('is k.o') || text.includes("is k.o'd") ? 'character_ko'
                            : text.includes('given a don') || text.includes('don!! card is given') ? 'don_given'
                        : text.includes('when you play a character') || text.includes('next time you play') ? 'card_played'
                            : text.includes('at the end of this turn') || text.includes('end of your turn') ? 'end_turn'
                            : effect.condition?.typeCond === 'character_removed' ? 'character_removed'
                                : null
            if (!eventType) continue
            if (this.deferredEffects.some(entry => entry.card === card && entry.effect === effect)) continue
            this.deferredEffects.push({ card, owner: ownerPlayer, effect, eventType, usedTurn: null })
        }
    }

    emitGameEvent(type, event = {}) {
        const pending = [...this.deferredEffects]
        for (const entry of pending) {
            if (entry.eventType !== type) continue
            if (entry.effect.oncePerTurn && entry.usedTurn === this.gameState.turnCount) continue
            const eventContext = { event: { type, ...event } }
            if (!this.evaluateCompiledCondition(entry.effect.condition, entry.card, entry.owner, eventContext)) continue
            if (entry.effect.triggerCondition && !this.evaluateDeferredTrigger(entry.effect.triggerCondition, entry.card, entry.owner, eventContext)) continue
            const compiled = compileEffectAst(entry.effect)
            const result = this.executeCompiledEffect(compiled, entry.card, entry.owner, { event: { type, ...event }, selected: [], revealed: [] })
            if (result?.pendingChoice) continue
            if (entry.effect.oncePerTurn) entry.usedTurn = this.gameState.turnCount
        }
    }

    evaluateDeferredTrigger(triggerCondition, card, player, context) {
        const text = String(triggerCondition || '').toLowerCase()
        if (text.includes('given a don') || text.includes('don!! card is given')) return context.event.type === 'don_given'
        if (text.includes('is k.o') || text.includes("is k.o'd")) return context.event.type === 'character_ko'
        if (text.includes('character attacks')) return context.event.type === 'character_attacked'
        if (text.includes('activates an event')) return context.event.type === 'event_activated'
        if (text.includes('next time you play')) return context.event.type === 'card_played'
        return false
    }

    triggerPlayerTiming(player, procType) {
        const field = [
            ...player.zones[CardZone.LEADER],
            ...player.zones[CardZone.DEPLOY],
            ...player.zones[CardZone.STAGE]
        ]
        field.forEach(card => this.triggerActV3Actions(card, procType, player))
    }

    evaluatePassiveCondition(condition, card, player) {
        if (!condition) return true
        if (condition.typeCond === 'life_max') return player.lifeCount <= Number(condition.max ?? Infinity)
        if (condition.typeCond === 'hand_max') return player.zones[CardZone.HAND].length <= Number(condition.max ?? Infinity)
        if (condition.typeCond === 'opp_life_max') return this.gameState.getOpponentPlayer().lifeCount <= Number(condition.max ?? Infinity)
        if (condition.typeCond === 'opp_life_min') return this.gameState.getOpponentPlayer().lifeCount >= Number(condition.min ?? 0)
        if (condition.typeCond === 'life_and_leader') {
            const leader = player.zones[CardZone.LEADER][0]
            return player.lifeCount <= Number(condition.lifeMax ?? Infinity)
                && String(leader?.cardType || leader?.traits || '').toLowerCase().includes(String(condition.leaderIncludes || '').toLowerCase())
        }
        if (condition.typeCond === 'generic') {
            const text = String(condition.text || '').toLowerCase()
            if (text.includes('opponent has 2 or more rested characters')) {
                return this.gameState.getOpponentPlayer().zones[CardZone.DEPLOY].filter(target => target.state === CardState.RESTED).length >= 2
            }
        }
        if (condition.typeCond === 'leader_has') {
            const leader = player.zones[CardZone.LEADER][0]
            return String(leader?.cardType || leader?.traits || '').toLowerCase().includes(String(condition.value || '').toLowerCase())
        }
        if (condition.typeCond === 'and') {
            return this.evaluatePassiveCondition(condition.c1, card, player)
                && this.evaluatePassiveCondition(condition.c2, card, player)
        }
        return this.evaluateCompiledCondition(condition, card, player)
    }

    applyPassiveEffects(player) {
        const field = [...player.zones[CardZone.LEADER], ...player.zones[CardZone.DEPLOY], ...player.zones[CardZone.STAGE]]
        field.forEach(card => {
            for (const contribution of card.passiveContributions || []) {
                if (contribution.type === 'power') card.powerModifier -= contribution.value
                if (contribution.type === 'cost') card.costModifier -= contribution.value
                if (contribution.type === 'keyword' && !card.printedKeywords.has(contribution.value)) {
                    card.keywords.delete(contribution.value)
                }
                if (contribution.type === 'can_attack_active') card.canAttackActive = false
                if (contribution.type === 'protection') {
                    card.protections = card.protections.filter(protection => protection.passiveKey !== contribution.key)
                }
            }
            card.passiveContributions = []
            card.passiveApplied.clear()
            card.hasRush = card.printedKeywords.has('rush')
            card.isBlocker = card.printedKeywords.has('blocker')
        })
        field.forEach(card => {
            const effects = card.effects || card.actionV3s || []
            effects.filter(effect => effect.proc === 'passive').forEach(effect => {
                if (effect.donReq && (card.attachedDon || []).length < effect.donReq) return
                if (!this.evaluatePassiveCondition(effect.condition, card, player)) return
                const key = JSON.stringify(effect)
                const targetSpec = effect.target
                let targets = []
                if (effect.target === 'self' || !effect.target || /this character/i.test(String(effect.target))) targets = [card]
                else if (targetSpec?.targetType === 'all_characters' || targetSpec?.targetType === 'your_characters') {
                    targets = player.zones[CardZone.DEPLOY]
                } else if (targetSpec?.targetType === 'leader_and_all_characters') {
                    targets = [...player.zones[CardZone.LEADER], ...player.zones[CardZone.DEPLOY]]
                }

                targets.filter(target => this.matchesPassiveTarget(target, targetSpec)).forEach(target => {
                    const targetKey = `${key}:${target.uniqueInstanceId}`
                    if (effect.type === 'gain_keyword') {
                        const keyword = String(effect.keyword).toLowerCase()
                        target.keywords.add(keyword)
                        target.passiveContributions.push({ type: 'keyword', value: keyword, key: targetKey })
                        if (effect.keyword === 'rush') target.hasRush = true
                    } else if (effect.type === 'can_attack_active' && !target.passiveApplied.has(targetKey)) {
                        target.canAttackActive = true
                        target.passiveContributions.push({ type: 'can_attack_active', key: targetKey })
                    } else if (effect.type === 'boost_power' && !target.passiveApplied.has(targetKey)) {
                        const value = Number(effect.value || effect.amount || 0)
                        target.powerModifier += value
                        target.passiveContributions.push({ type: 'power', value, key: targetKey })
                    } else if ((effect.type === 'gain_cost' || effect.type === 'give_cost') && !target.passiveApplied.has(targetKey)) {
                        const value = Number(effect.value || effect.amount || 0)
                        target.costModifier += value
                        target.passiveContributions.push({ type: 'cost', value, key: targetKey })
                    } else if (effect.type === 'protection' && !target.passiveApplied.has(targetKey)) {
                        target.protections.push({ kind: effect.kind, by: effect.by || 'effect', passiveKey: targetKey })
                        target.passiveContributions.push({ type: 'protection', key: targetKey })
                    }
                    target.passiveApplied.add(targetKey)
                })
            })
        })
    }

    matchesPassiveTarget(card, target) {
        if (!target || typeof target !== 'object') return true
        const cardTypes = target.cardTypes || target.cardType
        if (cardTypes && !this.matchesCardType(card.cardType || card.traits, cardTypes)) return false
        if (target.color && !String(card.color || '').toLowerCase().includes(String(target.color).toLowerCase())) return false
        if (target.minCost !== undefined && card.cost < target.minCost) return false
        if (target.maxCost !== undefined && card.cost > target.maxCost) return false
        return true
    }

    activateMainEffect(cardId) {
        if (this.gameState.currentPhase !== GameplayPhase.MAIN) return false
        const player = this.gameState.getCurrentPlayer()
        const card = this.findCard(cardId)
        if (!card || !player.zones[CardZone.STAGE].includes(card) && !player.zones[CardZone.DEPLOY].includes(card) && !player.zones[CardZone.LEADER].includes(card)) return false
        const effects = (card.effects || card.actionV3s || []).filter(effect => effect.proc === 'main')
        if (effects.length === 0) return false
        if (effects.some(effect => Array.isArray(effect.cost)
            ? effect.cost.some(cost => (cost?.kind || cost?.type) === 'rest_self')
            : (effect.cost?.kind || effect.cost?.type) === 'rest_self') && card.state !== CardState.ACTIVE) {
            this.gameState.logAction(`⚠️ ${card.name} est déjà reposée: son effet Main ne peut plus être activé.`)
            return false
        }
        this.triggerActV3Actions(card, 'main', player)
        return true
    }

    canPayEffectCost(cost, player, sourceCard = null) {
        const costs = Array.isArray(cost) ? cost : [cost]
        return costs.every(entry => {
            if (!entry || typeof entry !== 'object') return true
            const kind = entry.kind || entry.type
            const entryAmount = entry.amount ?? entry.donAmount
            if (kind === 'rest_self') return sourceCard?.state === CardState.ACTIVE
            if (kind === 'rest_don_and_self') {
                return sourceCard?.state === CardState.ACTIVE
                    && player.zones[CardZone.DON_ACTIVE].length >= Number(entryAmount || 0)
            }
            if (kind === 'add_life_to_hand') return player.zones[CardZone.LIFE].length >= Number(entry.amount || 1)
            if (kind === 'trash_self') return sourceCard && this.findCardOwner(sourceCard) === player
            if (kind === 'give_own_power_cost') {
                const leader = player.zones[CardZone.LEADER][0]
                return Boolean(leader && leader.state === CardState.ACTIVE)
            }
            if (kind === 'turn_life_faceup') return player.zones[CardZone.LIFE].length >= Number(entry.amount || 1)
            if (kind === 'return_don_field') return player.zones[CardZone.DON_ACTIVE].length + player.zones[CardZone.DON_RESTED].length >= Number(entry.amount || 1)
            if (kind === 'trash_to_bottom_deck') return player.zones[CardZone.TRASH].length >= Number(entry.amount || 1)
            if (kind === 'place_self_bottom_deck') return sourceCard && this.findCardOwner(sourceCard) === player
            if (kind === 'rest_don_cost' || kind === 'rest_don') {
                return player.zones[CardZone.DON_ACTIVE].length >= Number(entry.amount || 0)
            }
            if (kind === 'return_don') {
                return player.zones[CardZone.DON_ACTIVE].length + player.zones[CardZone.DON_RESTED].length >= Number(entry.amount || 0)
            }
            if (kind === 'trash_hand_target' || kind === 'reveal_hand_cost') {
                const target = entry.target || {}
                return player.zones[CardZone.HAND].filter(card => this.matchesCostTarget(card, target)).length >= Number(entry.amount || 1)
            }
            if (kind === 'rest_characters_cost') {
                return player.zones[CardZone.DEPLOY].filter(card => card.state === CardState.ACTIVE).length >= Number(entry.amount || 1)
            }
            return true
        })
    }

    payEffectCost(cost, player, sourceCard = null) {
        const costs = Array.isArray(cost) ? cost : [cost]
        costs.forEach(entry => {
            if (!entry || typeof entry !== 'object') return
            const kind = entry.kind || entry.type
            const amount = Number(entry.amount ?? entry.donAmount ?? 0)
            if (kind === 'rest_don_cost' || kind === 'rest_don') {
                for (let index = 0; index < amount; index++) {
                    const don = player.zones[CardZone.DON_ACTIVE].pop()
                    if (!don) break
                    don.state = CardState.RESTED
                    player.zones[CardZone.DON_RESTED].push(don)
                    player.activeDonCount = Math.max(0, player.activeDonCount - 1)
                    player.restedDonCount++
                }
            } else if (kind === 'rest_don_and_self') {
                for (let index = 0; index < amount; index++) {
                    const don = player.zones[CardZone.DON_ACTIVE].pop()
                    if (!don) break
                    don.state = CardState.RESTED
                    player.zones[CardZone.DON_RESTED].push(don)
                    player.activeDonCount = Math.max(0, player.activeDonCount - 1)
                    player.restedDonCount++
                }
                if (sourceCard) sourceCard.state = CardState.RESTED
            } else if (kind === 'add_life_to_hand') {
                for (let index = 0; index < amount; index++) {
                    const lifeCard = player.zones[CardZone.LIFE].pop()
                    if (!lifeCard) break
                    lifeCard.isFaceUp = true
                    player.addCardToZone(lifeCard, CardZone.HAND)
                }
                player.lifeCount = player.zones[CardZone.LIFE].length
            } else if (kind === 'trash_self') {
                if (sourceCard) {
                    Object.values(CardZone).forEach(zone => player.removeCardFromZone(sourceCard, zone))
                    player.addCardToZone(sourceCard, CardZone.TRASH)
                }
            } else if (kind === 'give_own_power_cost') {
                const leader = player.zones[CardZone.LEADER][0]
                if (leader) leader.tempPowerModifier += Number(entry.value || 0)
            } else if (kind === 'turn_life_faceup') {
                player.zones[CardZone.LIFE].slice(-(amount || 1)).forEach(card => { card.isFaceUp = true })
            } else if (kind === 'return_don_field') {
                for (let index = 0; index < amount; index++) {
                    const don = player.zones[CardZone.DON_ACTIVE].pop() || player.zones[CardZone.DON_RESTED].pop()
                    if (!don) break
                    if (don.state === CardState.ACTIVE) player.activeDonCount = Math.max(0, player.activeDonCount - 1)
                    else player.restedDonCount = Math.max(0, player.restedDonCount - 1)
                    player.zones[CardZone.DON_COST].push(don)
                }
            } else if (kind === 'trash_to_bottom_deck') {
                const moved = player.zones[CardZone.TRASH].splice(0, amount)
                player.zones[CardZone.DECK].push(...moved)
            } else if (kind === 'place_self_bottom_deck') {
                if (sourceCard) {
                    Object.values(CardZone).forEach(zone => player.removeCardFromZone(sourceCard, zone))
                    player.zones[CardZone.DECK].push(sourceCard)
                }
            } else if (kind === 'return_don') {
                for (let index = 0; index < amount; index++) {
                    const don = player.zones[CardZone.DON_ACTIVE].pop() || player.zones[CardZone.DON_RESTED].pop()
                    if (!don) break
                    if (don.state === CardState.ACTIVE) player.activeDonCount = Math.max(0, player.activeDonCount - 1)
                    else player.restedDonCount = Math.max(0, player.restedDonCount - 1)
                    player.zones[CardZone.DON_COST].push(don)
                }
            } else if (kind === 'trash_hand_target') {
                const target = entry.target || {}
                const matching = player.zones[CardZone.HAND].filter(card => this.matchesCostTarget(card, target)).slice(0, amount)
                matching.forEach(card => {
                    player.removeCardFromZone(card, CardZone.HAND)
                    player.addCardToZone(card, CardZone.TRASH)
                })
                player.lastTrashCount = matching.length
            } else if (kind === 'rest_characters_cost') {
                player.zones[CardZone.DEPLOY].filter(card => card.state === CardState.ACTIVE).slice(0, amount)
                    .forEach(card => { card.state = CardState.RESTED })
            }
        })
    }

    matchesCostTarget(card, target) {
        if (!target) return true
        if (target.targetType === 'character' && card.type?.toLowerCase() !== 'character') return false
        if (target.cardType && !this.matchesCardType(card.cardType || card.traits || card.type, target.cardType)) return false
        if (target.exactPower !== undefined && card.getCurrentPower() !== target.exactPower) return false
        return true
    }

    registerPassiveEffects(card, ownerPlayer) {
        if (!card || !ownerPlayer) return
        const effects = card.effects || card.actionV3s || []
        effects.forEach(effect => {
            if (effect.proc && effect.proc !== 'passive') return
            if (effect.type === 'replacement_action') {
                const replacement = { action: effect.action, optional: effect.optional, oncePerTurn: effect.oncePerTurn, owner: ownerPlayer, sourceCard: card, condition: effect.condition }
                if (effect.scope === 'player') ownerPlayer.passiveReplacements.push(replacement)
                else card.replacements.push(replacement)
            }
        })
    }

    /**
     * Résout un effet ou un bloc d'actions parsé par la grammaire.
     */
    executeActV3(action, card, player) {
        const opponent = this.gameState.getOpponentPlayer();

        // Si c'est un effet "multi" (ex: "Draw 1 card and give +1000 power")
        if (action.type === 'multi' && Array.isArray(action.actions)) {
            action.actions.forEach(subAction => this.executeActV3(subAction, card, player));
            return;
        }

        switch (action.type) {
            case 'draw': {
                const amount = action.value || action.amount || 1;
                for (let i = 0; i < amount; i++) this.drawFromDeck(player);
                this.gameState.logAction(`⚡ [Effet] ${card.name} : Pioche ${amount} carte(s).`);
                break;
            }

            case 'boost_power':
            case 'give_power': {
                const powerBonus = action.value || 1000;
                // Si la cible est "self" ou non spécifiée, c'est la carte elle-même
                const isTargetOpponent = action.opponent || false;
                
                if (action.target === 'self' || action.target === 'self_leader' || !action.target) {
                    card.tempCounterPower = (card.tempCounterPower || 0) + powerBonus;
                    this.gameState.logAction(`⚡ [Effet] ${card.name} gagne +${powerBonus} Power !`);
                } else if (isTargetOpponent) {
                    // Ciblage adverse (déclenche le sélecteur si besoin)
                    const targets = opponent.zones[CardZone.DEPLOY];
                    if (targets.length > 0) {
                        this.startTargetSelection(action, card, player, targets);
                    }
                }
                break;
            }

            case 'knockout':
            case 'knockout_max_cost': {
                // Le parser extrait `target.maxCost`
                const maxCost = action.target?.maxCost || action.maxCost || 99;
                const validTargets = opponent.zones[CardZone.DEPLOY].filter(c => c.cost <= maxCost);

                if (validTargets.length > 0) {
                    this.startTargetSelection(action, card, player, validTargets);
                } else {
                    this.gameState.logAction(`⚡ [Effet] ${card.name} : Aucune cible adverse valide (Coût <= ${maxCost}).`);
                }
                break;
            }

            case 'add_don':
            case 'gain_don': {
                const donAmount = action.amount || action.value || 1;
                const donDeck = player.zones[CardZone.DON_COST];
                for (let i = 0; i < donAmount && donDeck.length > 0; i++) {
                    const don = donDeck.pop();
                    don.state = action.state === 'rested' ? CardState.RESTED : CardState.ACTIVE;
                    const targetZone = don.state === CardState.RESTED ? CardZone.DON_RESTED : CardZone.DON_ACTIVE;
                    
                    player.addCardToZone(don, targetZone);
                    if (don.state === CardState.ACTIVE) player.activeDonCount++;
                    else player.restedDonCount++;
                }
                this.gameState.logAction(`⚡ [Effet] ${card.name} ajoute +${donAmount} DON!!.`);
                break;
            }

            case 'rest_card':
            case 'rest_opponent_character': {
                const restTargets = opponent.zones[CardZone.DEPLOY].filter(c => c.state === CardState.ACTIVE);
                if (restTargets.length > 0) {
                    this.startTargetSelection(action, card, player, restTargets);
                } else {
                    this.gameState.logAction(`⚡ [Effet] ${card.name} : Aucun personnage adverse à incliner.`);
                }
                break;
            }

            case 'play_self': {
                if (card.type?.toLowerCase() === 'character' && player.canDeployCharacter()) {
                    player.addCardToZone(card, CardZone.DEPLOY);
                    card.isSummonSick = !card.hasRush;
                    this.gameState.logAction(`⚡ [Effet] ${card.name} est invoqué !`);
                }
                break;
            }

            case 'keyword': {
                if (action.keyword === 'blocker') card.isBlocker = true;
                if (action.keyword === 'rush') card.hasRush = true;
                this.gameState.logAction(`⚡ [Effet] ${card.name} obtient [${action.keyword.toUpperCase()}].`);
                break;
            }

            default:
                console.warn(`[Engine] Action AST non gérée : ${action.type}`, action);
        }
    }

    executeCompiledEffect(effect, card, player, existingContext = null, startIndex = 0) {
        if (!effect || !Array.isArray(effect.actions)) return {}

        const context = existingContext || { previous: null, selected: [], revealed: [] }
        let resolvedAction = false
        for (let index = startIndex; index < effect.actions.length; index++) {
            const action = effect.actions[index]
            if (action.condition && !this.evaluateCompiledCondition(action.condition, card, player, context)) continue
            const targetSelection = this.prepareInteractiveTarget(action, card, player, context)
            if (targetSelection === 'pending') {
                this.targetingState.continuation = {
                    effect,
                    card,
                    player,
                    executionContext: context,
                    nextIndex: index + 1
                }
                return { pendingChoice: true }
            }
            if (targetSelection === 'skipped') continue
            const result = this.executeCompiledAction(action, card, player, context)
            if (result?.skipped) continue
            resolvedAction = true
            if (result?.previous) context.previous = result.previous
            if (result?.selected) context.selected = result.selected
            if (result?.pendingChoice) {
                if (this.choiceState.active) {
                    this.choiceState.context.continuation = {
                        effect,
                        card,
                        player,
                        executionContext: context,
                        nextIndex: index + 1
                    }
                }
                if (this.targetingState.active) {
                    this.targetingState.continuation = {
                        effect,
                        card,
                        player,
                        executionContext: context,
                        nextIndex: index + 1
                    }
                }
                return { pendingChoice: true }
            }
        }
        return resolvedAction ? {} : { skipped: true }
    }

    prepareInteractiveTarget(action, card, player, context) {
        const target = action?.target
        if (!target || context.selected?.length) return false
        if (action.kind === 'SelectTarget') return false
        if (target.from === 'trash' || target.from === 'hand') return false
        if (target.from === 'deck' && action.kind !== 'DeployCharacter') return false
        if (target.reference && !['leader_or_character'].includes(target.reference)) return false

        const targetType = target.targetType
        const fieldTargetTypes = ['character', 'stage', 'leader', 'leader_or_character', 'typed_leader_or_character', 'named_card']
        if (!fieldTargetTypes.includes(targetType) && target.reference !== 'leader_or_character') return false

        const opponentTarget = target.opponent === true
            || targetType === 'opponent_character'
            || targetType === 'opponent_cards'
            || ['KOCard', 'KOChoice', 'KOMultiple', 'Rest', 'SendToDeckBottom', 'SendToHand', 'TrashCard', 'Silence'].includes(action.kind)
        const owner = opponentTarget ? this.gameState.getOpponentPlayer() : player
        const zones = target.from === 'deck'
            ? [CardZone.DECK]
            : targetType === 'stage'
            ? [CardZone.STAGE]
            : targetType === 'leader'
                ? [CardZone.LEADER]
                : targetType === 'leader_or_character' || targetType === 'typed_leader_or_character' || target.reference === 'leader_or_character'
                    ? [CardZone.LEADER, CardZone.DEPLOY]
                    : [CardZone.DEPLOY]
        const validTargets = zones
            .flatMap(zone => owner.zones[zone])
            .filter(candidate => candidate !== card && this.matchesCompiledFilter(candidate, target))

        if (validTargets.length === 0) return 'skipped'
        if (validTargets.length === 1) {
            context.selected = validTargets
            return false
        }
        this.startTargetSelection(action, card, player, validTargets)
        return 'pending'
    }

    evaluateCompiledCondition(condition, card, player, context = null) {
        if (!condition) return true
        if (typeof condition === 'string') return true
        if (condition.all) return condition.all.every(item => this.evaluateCompiledCondition(item, card, player, context))
        if (condition.type === 'has_don') return (card.attachedDon || []).length >= (condition.amount || 1)
        const type = condition.typeCond || condition.type
        const leader = player.zones[CardZone.LEADER][0]
        const leaderTraits = leader?.cardType || leader?.traits || leader?.sub_types || ''
        if (type === 'leader_includes' || type === 'leader_has') return this.matchesCardType(leaderTraits, condition.value)
        if (type === 'leader_is') return String(leader?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
            === String(condition.value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        if (type === 'life_and_leader') return player.lifeCount <= Number(condition.lifeMax ?? Infinity)
            && this.matchesCardType(leaderTraits, condition.leaderIncludes)
        if (type === 'has_card_name') return [...player.zones[CardZone.HAND], ...player.zones[CardZone.DEPLOY]]
            .some(item => String(item.name || '').toLowerCase() === String(condition.value || '').toLowerCase())
        if (type === 'char_max') return player.zones[CardZone.DEPLOY].length <= Number(condition.max ?? Infinity)
        if (type === 'trash_min') return player.zones[CardZone.TRASH].length >= Number(condition.min ?? 0)
        if (type === 'total_life') return player.lifeCount + this.gameState.getOpponentPlayer().lifeCount <= Number(condition.max ?? Infinity)
        if (type === 'opp_rested_cards_min') return this.gameState.getOpponentPlayer().zones[CardZone.DEPLOY]
            .filter(target => target.state === CardState.RESTED).length >= Number(condition.min ?? 0)
        if (type === 'self_power_min') return card.getCurrentPower() >= Number(condition.min ?? 0)
        if (type === 'all_don_rested') return player.zones[CardZone.DON_ACTIVE].length === 0
        if (type === 'has_character') return player.zones[CardZone.DEPLOY]
            .some(item => String(item.name || '').toLowerCase() === String(condition.name || '').toLowerCase())
        if (type === 'has_card_in_hand') return player.zones[CardZone.HAND]
            .some(item => this.matchesCardType(item.cardType || item.traits || item.type, condition.cardType))
        if (type === 'don_min') return player.zones[CardZone.DON_ACTIVE].length + player.zones[CardZone.DON_RESTED].length >= Number(condition.amount ?? 0)
        if (type === 'has_target') return (context?.selected || []).some(target => this.matchesCompiledFilter(target, condition.value))
        if (type === 'selected_card_attacks') return Boolean(context?.selected?.[0]?.uniqueInstanceId === this.gameState.attackerId)
        if (type === 'revealed_card_cost_min') return (context?.revealed || context?.selected || [])
            .some(target => target.cost >= Number(condition.minCost ?? 0))
        if (type === 'revealed_card_character_power_min') return (context?.revealed || []).some(target => {
            return target.type?.toLowerCase() === 'character' && target.getCurrentPower() >= Number(condition.minPower ?? 0)
        })
        if (type === 'only_characters_type') return player.zones[CardZone.DEPLOY]
            .every(target => this.matchesCardType(target.cardType || target.traits || target.type, condition.value))
        if (type === 'char_power_type') return player.zones[CardZone.DEPLOY]
            .some(target => target.getCurrentPower() >= Number(condition.minPower ?? 0)
                && this.matchesCardType(target.cardType || target.traits || target.type, condition.typeIncludes))
        if (type === 'no_char_type_cost') return !player.zones[CardZone.DEPLOY]
            .some(target => target.cost >= Number(condition.minCost ?? 0)
                && this.matchesCardType(target.cardType || target.traits || target.type, condition.typeIncludes))
        if (type === 'opponent_character_max') return this.gameState.getOpponentPlayer().zones[CardZone.DEPLOY].length <= Number(condition.max ?? Infinity)
        if (type === 'not_have') return ![...player.zones[CardZone.HAND], ...player.zones[CardZone.DEPLOY], ...player.zones[CardZone.STAGE]]
            .some(target => String(target.name || '').toLowerCase() === String(condition.card || '').toLowerCase())
        if (type === 'life_max') return player.lifeCount <= Number(condition.max ?? Infinity)
        if (type === 'hand_max') return player.zones[CardZone.HAND].length <= Number(condition.max ?? Infinity)
        if (type === 'opp_life_max') return this.gameState.getOpponentPlayer().lifeCount <= Number(condition.max ?? Infinity)
        if (type === 'opp_life_min') return this.gameState.getOpponentPlayer().lifeCount >= Number(condition.min ?? 0)
        if (type === 'generic') {
            const text = String(condition.text || '').toLowerCase()
            const restedMatch = text.match(/opponent has (\d+) or more rested characters/)
            if (restedMatch) return this.gameState.getOpponentPlayer().zones[CardZone.DEPLOY]
                .filter(target => target.state === CardState.RESTED).length >= Number(restedMatch[1])
            const noOtherMatch = text.match(/you have no other \[([^\]]+)\] characters?/)
            if (noOtherMatch) return !player.zones[CardZone.DEPLOY].some(target => {
                return target !== card && String(target.name || '').toLowerCase().includes(noOtherMatch[1].toLowerCase())
            })
            if (text.includes('all of your don') && text.includes('rested')) return player.zones[CardZone.DON_ACTIVE].length === 0
            if (text.includes('activates an event')) return context?.event?.type === 'event_activated'
            if (text.includes('character attacks') || text.includes('character attack')) return context?.event?.type === 'character_attacked'
            if (text.includes('at the end of this turn') || text.includes('end of your turn')) return context?.event?.type === 'end_turn'
            if (text.includes('this character would leave the field')) return Boolean(context?.event?.type === 'leave_field')
            if (text.includes('would be k.o')) return Boolean(context?.event?.type === 'would_ko')
            if (text.includes('would be removed')) return Boolean(context?.event?.type === 'leave_field' || context?.event?.type === 'would_ko')
            return false
        }
        if (type === 'opp_rested_cards_min') return this.gameState.getOpponentPlayer().zones[CardZone.DEPLOY]
            .filter(target => target.state === CardState.RESTED).length >= Number(condition.min ?? 0)
        if (type === 'character_removed') return Boolean((context?.event?.type === 'leave_field' || context?.event?.type === 'character_removed')
            && (!condition.cardType || this.matchesCardType(context.event.card?.cardType || context.event.card?.traits, condition.cardType)))
        if (type === 'activation_condition') return false
        this.gameState.logAction(`⚠️ Condition non supportée ignorée: ${type || 'unknown'}.`)
        return false
        
    }

    executeCompiledAction(action, card, player, context) {
        const opponent = this.gameState.getOpponentPlayer()
        const amount = action.amount || action.value || 1

        switch (action.kind) {
            case 'GainActiveDon': {
                const don = player.zones[CardZone.DON_COST].pop()
                if (!don) return {}
                don.state = action.state === 'rested' ? CardState.RESTED : CardState.ACTIVE
                player.addCardToZone(don, don.state === CardState.RESTED ? CardZone.DON_RESTED : CardZone.DON_ACTIVE)
                if (don.state === CardState.RESTED) player.restedDonCount++
                else player.activeDonCount++
                return { previous: don, selected: [don] }
            }

            case 'BuffPower': {
                if ((['leader_or_character', 'typed_leader_or_character'].includes(action.target?.targetType) || action.target?.reference === 'leader_or_character')
                    && !context.selected?.length) {
                    const validTargets = [
                        ...player.zones[CardZone.LEADER],
                        ...player.zones[CardZone.DEPLOY]
                    ].filter(target => {
                        if (target === card || target === action.target?.exclude) return false
                        if (action.target.targetType === 'typed_leader_or_character') {
                            const traits = String(target.cardType || target.traits || '').toLowerCase()
                            if (!traits) return true
                            return traits.includes(String(action.target.cardType || '').toLowerCase())
                        }
                        return true
                    })
                    if (validTargets.length > 0) {
                        this.startTargetSelection(action, card, player, validTargets)
                        return { pendingChoice: true }
                    }
                    return { skipped: true }
                }
                const target = action.target?.reference === 'self' || action.target?.reference === 'source'
                    ? card
                    : context.selected?.[0]
                    || this.resolveCompiledTarget(action, card, player, opponent, context)
                    || (action.opponent ? this.findCompiledOpponentTarget(action, opponent) : card)
                if (!target) return { skipped: true }
                const bonus = Number(action.value || action.amount || 0)
                if (action.duration === 'permanent') target.powerModifier += bonus
                else if (action.duration === 'battle') target.combatPowerModifier += bonus
                else target.tempPowerModifier += bonus
                return { previous: target, selected: [target] }
            }

            case 'SetBasePower': {
                const target = this.resolveCompiledTarget(action, card, player, opponent, context) || card
                target.tempBasePowerOverride = Number(action.value || action.amount || 0)
                return { previous: target, selected: [target] }
            }

            case 'SetBasePowerFromLeader': {
                const leader = opponent.zones[CardZone.LEADER][0]
                const target = this.resolveCompiledTarget(action, card, player, opponent, context) || card
                if (!leader) return {}
                target.tempBasePowerOverride = leader.getCurrentPower()
                return { previous: target, selected: [target] }
            }

            case 'GainKeyword': {
                const target = this.resolveCompiledTarget(action, card, player, opponent, context) || card
                const keyword = String(action.value || action.keyword || '').toLowerCase()
                if (!keyword) return {}
                if (action.duration && action.duration !== 'permanent') {
                    target.temporaryKeywords = target.temporaryKeywords || []
                    target.temporaryKeywords.push({ keyword, expires: action.duration, untilTurn: this.gameState.turnCount + 1 })
                } else {
                    target.keywords = target.keywords || new Set()
                    target.keywords.add(keyword)
                    target.printedKeywords = target.printedKeywords || new Set()
                    target.printedKeywords.add(keyword)
                }
                if (keyword === 'rush') {
                    target.hasRush = true
                    target.isSummonSick = false
                }
                if (keyword === 'blocker') target.isBlocker = true
                return { previous: target, selected: [target] }
            }

            case 'CantAttack': {
                const target = this.resolveCompiledTarget(action, card, player, opponent, context) || card
                target.restrictions.push({ rule: 'cannot_attack', untilTurn: this.gameState.turnCount + 1 })
                return { previous: target, selected: [target] }
            }

            case 'FlipLifeUp':
            case 'FlipLifeDown': {
                const count = Number(action.amount || 1)
                const life = player.zones[CardZone.LIFE].slice(-count)
                life.forEach(lifeCard => { lifeCard.isFaceUp = action.kind === 'FlipLifeUp' })
                return { selected: life }
            }

            case 'RevealHand': {
                player.zones[CardZone.HAND].forEach(handCard => { handCard.isFaceUp = true })
                return { selected: [...player.zones[CardZone.HAND]] }
            }

            case 'TrashSelf': {
                const owner = this.findCardOwner(card)
                if (!owner) return {}
                Object.values(CardZone).some(zone => owner.removeCardFromZone(card, zone))
                owner.addCardToZone(card, CardZone.TRASH)
                return { previous: card, selected: [card] }
            }

            case 'TrashCard': {
                const owner = action.opponent ? opponent : player
                const sourceZone = action.target?.from === 'hand' ? CardZone.HAND : CardZone.DEPLOY
                const amountToTrash = action.amount === 'any' ? owner.zones[sourceZone].length : Number(action.amount || 1)
                const trashed = owner.zones[sourceZone].splice(0, amountToTrash)
                trashed.forEach(target => owner.addCardToZone(target, CardZone.TRASH))
                owner.lastTrashCount = trashed.length
                return { previous: trashed[0], selected: trashed }
            }

            case 'TrashLife': {
                const owner = action.opponent ? opponent : player
                const count = Number(action.amount || 1)
                const trashed = []
                for (let index = 0; index < count; index++) {
                    const lifeCard = owner.zones[CardZone.LIFE].pop()
                    if (!lifeCard) break
                    owner.addCardToZone(lifeCard, CardZone.TRASH)
                    trashed.push(lifeCard)
                }
                owner.lifeCount = owner.zones[CardZone.LIFE].length
                return { previous: trashed[0], selected: trashed }
            }

            case 'TakeDamage': {
                const target = action.target === 'opponent' ? opponent : player
                this.drawFromLife(target)
                return {}
            }

            case 'SetPowerFromAttacker': {
                const attacker = this.gameState.attackerId ? this.findCard(this.gameState.attackerId) : null
                if (!attacker) return {}
                card.tempBasePowerOverride = attacker.getCurrentPower()
                return { previous: card, selected: [card] }
            }

            case 'DrawCards': {
                const drawAmount = action.sourceType === 'draw_and_trash'
                    ? Number(action.drawAmount ?? action.amount ?? 1)
                    : Number(amount)
                for (let index = 0; index < drawAmount; index++) this.drawFromDeck(player)
                this.gameState.logAction(`⚡ [Effet] ${card.name} : Pioche ${drawAmount} carte(s).`)

                const trashAmount = action.sourceType === 'draw_and_trash'
                    ? Number(action.trashAmount || 0)
                    : 0
                if (trashAmount > 0) {
                    const validTargets = [...player.zones[CardZone.HAND]]
                    if (validTargets.length === 0) return { skipped: true }
                    this.startTargetSelection({
                        type: 'trash_hand_after_draw',
                        remaining: Math.min(trashAmount, validTargets.length)
                    }, card, player, validTargets)
                    return { pendingChoice: true }
                }
                return {}
            }

            case 'DrawEqualTrashed': {
                const drawCount = player.lastTrashCount || 0
                for (let index = 0; index < drawCount; index++) this.drawFromDeck(player)
                return {}
            }

            case 'ExtraTurn':
                player.extraTurns = (player.extraTurns || 0) + 1
                return {}

            case 'SetAllDonActive': {
                while (player.zones[CardZone.DON_RESTED].length > 0) {
                    const don = player.zones[CardZone.DON_RESTED].pop()
                    don.state = CardState.ACTIVE
                    player.zones[CardZone.DON_ACTIVE].push(don)
                    player.restedDonCount = Math.max(0, player.restedDonCount - 1)
                    player.activeDonCount++
                }
                return {}
            }

            case 'SilenceField':
                ;[...player.zones[CardZone.LEADER], ...player.zones[CardZone.DEPLOY], ...player.zones[CardZone.STAGE]].forEach(target => {
                    target.silencedUntilTurn = this.gameState.turnCount + 1
                })
                return {}

            case 'SetBasePowerAll': {
                const targets = [...player.zones[CardZone.DEPLOY], ...player.zones[CardZone.LEADER]].filter(target => {
                    return this.matchesCardType(target.type, action.cardType)
                })
                targets.forEach(target => { target.tempBasePowerOverride = action.value || action.amount })
                return { selected: targets }
            }

            case 'AddOpponentLifeFaceDown': {
                const target = this.findCompiledOpponentTarget(action, opponent)
                if (!target) return { skipped: true }
                opponent.removeCardFromZone(target, CardZone.DEPLOY)
                target.isFaceUp = false
                opponent.addCardToZone(target, CardZone.LIFE)
                opponent.lifeCount = opponent.zones[CardZone.LIFE].length
                return { previous: target, selected: [target] }
            }

            case 'DrawUntilHand': {
                const targetHandSize = Number(action.target || action.value || 0)
                while (player.zones[CardZone.HAND].length < targetHandSize && player.zones[CardZone.DECK].length > 0) {
                    this.drawFromDeck(player)
                }
                return {}
            }

            case 'DrawReturnedCount': {
                const drawCount = context.returnedCount || 0
                for (let index = 0; index < drawCount; index++) this.drawFromDeck(player)
                return {}
            }

            case 'AddToLifeInsteadOfDraw': {
                const lifeCard = player.zones[CardZone.DECK].shift()
                if (!lifeCard) return {}
                lifeCard.isFaceUp = false
                player.addCardToZone(lifeCard, CardZone.LIFE)
                player.lifeCount = player.zones[CardZone.LIFE].length
                return { previous: lifeCard, selected: [lifeCard] }
            }

            case 'DrawOpponent':
                for (let index = 0; index < amount; index++) this.drawFromDeck(opponent)
                return {}

            case 'TakeLife': {
                const lifeCard = player.zones[CardZone.LIFE].pop()
                if (!lifeCard) {
                    this.endGame(player.id === 0 ? 1 : 0, 'life_zero')
                    return {}
                }
                lifeCard.isFaceUp = true
                player.lifeCount = player.zones[CardZone.LIFE].length
                player.addCardToZone(lifeCard, CardZone.HAND)
                return { previous: lifeCard, selected: [lifeCard] }
            }

            case 'AddToLife': {
                const lifeCard = player.zones[CardZone.DECK].shift()
                if (!lifeCard) return {}
                lifeCard.isFaceUp = false
                player.zones[CardZone.LIFE].push(lifeCard)
                player.lifeCount = player.zones[CardZone.LIFE].length
                return { previous: lifeCard, selected: [lifeCard] }
            }

            case 'AddToLifeFaceUp': {
                const target = this.findCompiledZoneTarget(player, CardZone.HAND, action.target)
                if (!target) return {}
                player.removeCardFromZone(target, CardZone.HAND)
                target.isFaceUp = true
                player.addCardToZone(target, CardZone.LIFE)
                player.lifeCount = player.zones[CardZone.LIFE].length
                return { previous: target, selected: [target] }
            }

            case 'AddOpponentLifeFaceUp': {
                const lifeCard = opponent.zones[CardZone.DECK].shift()
                if (!lifeCard) return {}
                lifeCard.isFaceUp = true
                opponent.zones[CardZone.LIFE].push(lifeCard)
                opponent.lifeCount = opponent.zones[CardZone.LIFE].length
                return { previous: lifeCard, selected: [lifeCard] }
            }

            case 'PlaceToOpponentLifeFaceUp': {
                const target = this.findCompiledOpponentTarget(action, opponent)
                if (!target) return {}
                opponent.removeCardFromZone(target, CardZone.DEPLOY)
                target.isFaceUp = true
                opponent.addCardToZone(target, CardZone.LIFE)
                opponent.lifeCount = opponent.zones[CardZone.LIFE].length
                return { previous: target, selected: [target] }
            }

            case 'RevealDeck': {
                const count = Math.min(action.amount || 1, player.zones[CardZone.DECK].length)
                context.revealed = player.zones[CardZone.DECK].slice(0, count)
                context.revealed.forEach(revealed => { revealed.isFaceUp = true })
                return { previous: context.revealed[0], selected: context.revealed }
            }

            case 'LookAtDeck': {
                const deckOwner = action.target?.reference === 'opponent' ? opponent : player
                const cards = deckOwner.zones[CardZone.DECK].slice(0, action.amount || 1)
                cards.forEach(deckCard => { deckCard.isFaceUp = true })
                return { previous: cards[0], selected: cards }
            }

            case 'OpponentTakeLife': {
                const lifeCard = opponent.zones[CardZone.LIFE].pop()
                if (!lifeCard) return {}
                lifeCard.isFaceUp = true
                opponent.lifeCount = opponent.zones[CardZone.LIFE].length
                opponent.addCardToZone(lifeCard, CardZone.HAND)
                return { previous: lifeCard, selected: [lifeCard] }
            }

            case 'TrashLifeUntil': {
                const targetCount = Number(action.target || action.amount || 0)
                while (player.zones[CardZone.LIFE].length > targetCount) {
                    const lifeCard = player.zones[CardZone.LIFE].pop()
                    player.addCardToZone(lifeCard, CardZone.TRASH)
                }
                player.lifeCount = player.zones[CardZone.LIFE].length
                return {}
            }

            case 'LookAtLife': {
                const cards = player.zones[CardZone.LIFE].slice(-(action.amount || 1))
                cards.forEach(lifeCard => { lifeCard.isFaceUp = true })
                return { previous: cards[0], selected: cards }
            }

            case 'OpponentHandToDeck': {
                const amountToMove = action.amount === 'all'
                    ? opponent.zones[CardZone.HAND].length
                    : Number(action.amount || 1)
                const moved = opponent.zones[CardZone.HAND].splice(0, amountToMove)
                if (action.position === 'top') opponent.zones[CardZone.DECK].unshift(...moved)
                else opponent.zones[CardZone.DECK].push(...moved)
                if (action.position === 'shuffle') opponent.zones[CardZone.DECK].sort(() => Math.random() - 0.5)
                return { previous: moved[0], selected: moved }
            }

            case 'ActivationCondition':
                card.activationConditions.push(action.activationCondition)
                return {}

            case 'ChooseOne':
                this.choiceState = {
                    active: true,
                    options: action.options || [],
                    sourceCard: card,
                    player,
                    effect: action,
                    context
                }
                return { pendingChoice: true }

            case 'HandToDeck': {
                const amountToMove = action.amount || 1
                const moved = player.zones[CardZone.HAND].splice(0, amountToMove)
                if (action.position === 'top') {
                    player.zones[CardZone.DECK].unshift(...moved)
                } else {
                    player.zones[CardZone.DECK].push(...moved)
                }
                return { previous: moved[0], selected: moved }
            }

            case 'ReturnHandToDeck': {
                const moved = player.zones[CardZone.HAND].splice(0)
                player.zones[CardZone.DECK].push(...moved)
                context.returnedCount = moved.length
                if (action.shuffle) player.zones[CardZone.DECK].sort(() => Math.random() - 0.5)
                return { previous: moved[0], selected: moved }
            }

            case 'ReturnSelfToHand': {
                Object.values(CardZone).forEach(zone => player.removeCardFromZone(card, zone))
                player.addCardToZone(card, CardZone.HAND)
                return { previous: card, selected: [card] }
            }

            case 'RestDon': {
                const amountToRest = action.amount || 1
                for (let index = 0; index < amountToRest; index++) {
                    const don = player.zones[CardZone.DON_ACTIVE].pop()
                    if (!don) break
                    don.state = CardState.RESTED
                    player.addCardToZone(don, CardZone.DON_RESTED)
                    player.activeDonCount = Math.max(0, player.activeDonCount - 1)
                    player.restedDonCount++
                }
                return {}
            }

            case 'SetActiveMulti': {
                const selected = []
                ;(action.directTargets || action.targets || []).forEach(targetSpec => {
                    if (targetSpec.targetType === 'don') {
                        const don = player.zones[CardZone.DON_RESTED].pop()
                        if (!don) return
                        don.state = CardState.ACTIVE
                        player.zones[CardZone.DON_ACTIVE].push(don)
                        player.restedDonCount = Math.max(0, player.restedDonCount - 1)
                        player.activeDonCount++
                        selected.push(don)
                        return
                    }
                    const target = this.findCompiledZoneTarget(player, CardZone.DEPLOY, targetSpec.filter || targetSpec)
                    if (!target) return
                    target.state = CardState.ACTIVE
                    selected.push(target)
                })
                return { previous: selected[0], selected }
            }

            case 'RestOpponentDon': {
                const amountToRest = action.amount || 1
                for (let index = 0; index < amountToRest; index++) {
                    const don = opponent.zones[CardZone.DON_ACTIVE].pop()
                    if (!don) break
                    don.state = CardState.RESTED
                    opponent.zones[CardZone.DON_RESTED].push(don)
                    opponent.activeDonCount = Math.max(0, opponent.activeDonCount - 1)
                    opponent.restedDonCount++
                }
                return {}
            }

            case 'RestEither': {
                const target = this.findCompiledZoneTarget(player, CardZone.DEPLOY, action.target)
                if (target) {
                    if (target.cannotBeRestedUntilTurn <= this.gameState.turnCount) target.state = CardState.RESTED
                    return { previous: target, selected: [target] }
                }
                return this.executeCompiledAction({ ...action, kind: 'RestDon' }, card, player, context)
            }

            case 'ReturnOpponentDon': {
                const amountToReturn = action.amount || 1
                for (let index = 0; index < amountToReturn; index++) {
                    const don = opponent.zones[CardZone.DON_ACTIVE].pop() || opponent.zones[CardZone.DON_RESTED].pop()
                    if (!don) break
                    if (don.state === CardState.ACTIVE) opponent.activeDonCount = Math.max(0, opponent.activeDonCount - 1)
                    else opponent.restedDonCount = Math.max(0, opponent.restedDonCount - 1)
                    opponent.zones[CardZone.DON_COST].push(don)
                }
                return {}
            }

            case 'CannotBeRested': {
                const target = this.resolveCompiledTarget(action, card, player, opponent, context)
                    || this.findCompiledZoneTarget(player, CardZone.DEPLOY, action.target)
                if (!target) return {}
                target.cannotBeRestedUntilTurn = this.gameState.turnCount + 1
                return { previous: target, selected: [target] }
            }

            case 'FlipLifeDownThen': {
                const count = action.amount || 1
                player.zones[CardZone.LIFE].slice(-count).forEach(lifeCard => { lifeCard.isFaceUp = false })
                if (action.nestedAction && typeof action.nestedAction === 'object') {
                    const nested = compileEffectAst({ type: 'multi', actions: [action.nestedAction] })
                    this.executeCompiledEffect(nested, card, player)
                }
                return {}
            }

            case 'ChangeCost': {
                const target = this.resolveCompiledTarget(action, card, player, opponent, context) || card
                target.costModifier = (target.costModifier || 0) + (action.value || action.amount || 0)
                if (action.duration === 'turn') target.costModifierExpiresAt = this.gameState.turnCount + 1
                return { previous: target, selected: [target] }
            }

            case 'Protection': {
                const target = this.resolveCompiledTarget(action, card, player, opponent, context) || card
                target.protections.push({ kind: action.protectionKind, by: action.protectionBy || `attribute_${action.attribute}` })
                return { previous: target, selected: [target] }
            }

            case 'Replacement': {
                const target = this.resolveCompiledTarget(action, card, player, opponent, context) || card
                target.replacements.push({ action: action.replacementAction, duration: action.duration })
                return { previous: target, selected: [target] }
            }

            case 'Restriction': {
                const target = this.resolveCompiledTarget(action, card, player, opponent, context) || card
                target.restrictions.push({ rule: action.rule, except: action.except, unless: action.unless, untilTurn: this.gameState.turnCount + 1 })
                return { previous: target, selected: [target] }
            }

            case 'CannotAttackExcept':
                card.restrictions.push({ rule: 'attack_except', except: action.except, untilTurn: this.gameState.turnCount + 1 })
                return { previous: card, selected: [card] }

            case 'ActivateEffect': {
                const procType = String(action.activatedEffect || '').toLowerCase().replace(/\s+/g, '')
                const proc = procType === 'onplay' ? 'onPlay' : procType
                if (proc) this.triggerActV3Actions(card, proc, player)
                return {}
            }

            case 'DisableBlocker': {
                const selectedTarget = context.selected?.[0]
                if (selectedTarget) {
                    selectedTarget.cannotActivateBlockerUntilTurn = this.gameState.turnCount + 1
                    return { previous: selectedTarget, selected: [selectedTarget] }
                }
                opponent.zones[CardZone.DEPLOY].forEach(target => {
                    const maxCost = action.costCond?.maxCost
                    if (maxCost === undefined || target.cost <= maxCost) target.blockerDisabledUntilTurn = this.gameState.turnCount + 1
                })
                return {}
            }

            case 'TrashHand': {
                const amountToTrash = action.amount || 1
                const trashed = opponent.zones[CardZone.HAND].splice(0, amountToTrash)
                trashed.forEach(handCard => opponent.addCardToZone(handCard, CardZone.TRASH))
                opponent.lastTrashCount = trashed.length
                return { previous: trashed[0], selected: trashed }
            }

            case 'TrashHandsUntil': {
                const handSize = Number(action.handSize || action.amount || 0)
                for (const owner of [player, opponent]) {
                    let trashCount = 0
                    while (owner.zones[CardZone.HAND].length > handSize) {
                        const handCard = owner.zones[CardZone.HAND].pop()
                        owner.addCardToZone(handCard, CardZone.TRASH)
                        trashCount++
                    }
                    owner.lastTrashCount = trashCount
                }
                return {}
            }

            case 'OpponentTrashLife': {
                for (let index = 0; index < (action.amount || 1); index++) {
                    const lifeCard = opponent.zones[CardZone.LIFE].pop()
                    if (!lifeCard) break
                    opponent.addCardToZone(lifeCard, CardZone.TRASH)
                }
                opponent.lifeCount = opponent.zones[CardZone.LIFE].length
                return {}
            }

            case 'TrashBothLife': {
                for (const owner of [player, opponent]) {
                    for (let index = 0; index < (action.amount || 1); index++) {
                        const lifeCard = owner.zones[CardZone.LIFE].pop()
                        if (!lifeCard) break
                        owner.addCardToZone(lifeCard, CardZone.TRASH)
                    }
                    owner.lifeCount = owner.zones[CardZone.LIFE].length
                }
                return {}
            }

            case 'KOCard': {
                const target = context.selected?.[0]
                    || this.resolveCompiledTarget(action, card, player, opponent, context)
                    || this.findCompiledOpponentTarget(action, opponent)
                if (!target) return {}
                const moved = this.knockOutCard(target, 'effect')
                return moved ? { previous: target, selected: [target] } : {}
            }

            case 'KOChoice': {
                this.choiceState = {
                    active: true,
                    options: [
                        { type: 'ko_choice', label: 'K.O. un personnage', action: { kind: 'KOCard', target: action.primary } },
                        { type: 'ko_choice', label: 'K.O. un Stage', action: { kind: 'KOCard', target: action.secondary, zone: CardZone.STAGE } }
                    ],
                    sourceCard: card,
                    player,
                    effect: action,
                    context
                }
                return { pendingChoice: true }
            }

            case 'KOMultiple': {
                const selected = []
                ;(action.targets || []).forEach(targetSpec => {
                    const target = this.findCompiledOpponentTarget({ target: targetSpec.target }, opponent)
                    if (target && this.knockOutCard(target, 'effect')) selected.push(target)
                })
                return { previous: selected[0], selected }
            }

            case 'Silence': {
                const target = this.resolveCompiledTarget(action, card, player, opponent, context)
                    || this.findCompiledOpponentTarget(action, opponent)
                if (!target) return {}
                target.silencedUntilTurn = this.gameState.turnCount + 1
                return { previous: target, selected: [target] }
            }

            case 'SelectTarget': {
                const owner = action.opponent ? opponent : player
                const targets = this.findCompiledTargets(action, owner)
                const amountToSelect = Math.min(Number(action.amount || 1), targets.length)
                if (amountToSelect === 0) return { skipped: true }
                if (amountToSelect === 1) return { previous: targets[0], selected: [targets[0]] }
                this.startTargetSelection({ type: 'multi_select_target', remaining: amountToSelect, selected: [] }, card, player, targets)
                return { pendingChoice: true }
            }

            case 'SwapPower': {
                const selected = context.selected || []
                if (selected.length < 2) return {}
                const firstPower = selected[0].power
                selected[0].tempBasePowerOverride = selected[1].power
                selected[1].tempBasePowerOverride = firstPower
                return { previous: selected[0], selected }
            }

            case 'SearchDeck': {
                const lookCount = Math.min(action.look || 1, player.zones[CardZone.DECK].length)
                context.revealed = player.zones[CardZone.DECK].splice(0, lookCount)
                const matchIndex = context.revealed.findIndex(candidate => this.matchesCompiledFilter(candidate, action.target))
                if (matchIndex < 0) {
                    context.revealed.forEach(revealed => {
                        revealed.isFaceUp = false
                        player.zones[CardZone.DECK].push(revealed)
                    })
                    context.revealed = []
                    return { previous: null, selected: [] }
                }

                const selected = context.revealed.splice(matchIndex, 1)[0]
                selected.isFaceUp = true
                if (action.searchAction === 'add_to_hand') {
                    player.addCardToZone(selected, CardZone.HAND)
                } else if (action.searchAction === 'trash') {
                    player.addCardToZone(selected, CardZone.TRASH)
                } else if (action.searchAction === 'play') {
                    if (selected.type?.toLowerCase() === 'character' && !player.canDeployCharacter()) {
                        this.startTargetSelection({
                            type: 'replace_effect_character',
                            cardToPlay: selected,
                            endState: action.endState
                        }, card, player, player.zones[CardZone.DEPLOY])
                        return { pendingChoice: true }
                    }
                    player.addCardToZone(selected, CardZone.DEPLOY)
                    selected.isSummonSick = !selected.hasRush
                } else {
                    context.revealed.unshift(selected)
                }
                if (action.sourceType === 'look_reveal_add_place') {
                    context.revealed.forEach(revealed => {
                        revealed.isFaceUp = false
                        player.zones[CardZone.DECK].push(revealed)
                    })
                    context.revealed = []
                }
                return { previous: selected, selected: [selected] }
            }

            case 'PlaceRest':
                context.revealed.forEach(revealed => {
                    revealed.isFaceUp = false
                    player.zones[CardZone.DECK].push(revealed)
                })
                context.revealed = []
                return {}

            case 'SendToHand': {
                if (!context.selected?.length
                    && action.target?.targetType === 'character'
                    && action.target?.from !== 'trash'
                    && !action.target?.reference) {
                    const validTargets = opponent.zones[CardZone.DEPLOY].filter(target => {
                        return this.matchesCompiledFilter(target, action.target)
                    })
                    if (validTargets.length === 0) return { skipped: true }
                    this.startTargetSelection(action, card, player, validTargets)
                    return { pendingChoice: true }
                }

                const target = this.resolveCompiledTarget(action, card, player, opponent, context)
                    || context.selected?.[0]
                    || this.findCompiledZoneTarget(player, CardZone.TRASH, action.target)
                if (!target) return {}
                const owner = this.findCardOwner(target)
                if (!owner) return {}
                Object.values(CardZone).some(zone => owner.removeCardFromZone(target, zone))
                owner.addCardToZone(target, CardZone.HAND)
                target.isFaceUp = true
                return { previous: target, selected: [target] }
            }

            case 'SendToHandMulti': {
                const selected = []
                ;(action.targets || []).forEach(spec => {
                    const target = this.findCompiledOpponentTarget({ target: spec.target }, opponent)
                    if (!target) return
                    opponent.removeCardFromZone(target, CardZone.DEPLOY)
                    opponent.addCardToZone(target, CardZone.HAND)
                    selected.push(target)
                })
                return { previous: selected[0], selected }
            }

            case 'AddOwnerLifeFaceUp': {
                const target = this.findCompiledOpponentTarget(action, opponent)
                if (!target) return {}
                opponent.removeCardFromZone(target, CardZone.DEPLOY)
                target.isFaceUp = true
                opponent.addCardToZone(target, CardZone.LIFE)
                opponent.lifeCount = opponent.zones[CardZone.LIFE].length
                return { previous: target, selected: [target] }
            }

            case 'TrashToDeckBottom': {
                const owner = player
                const amountToMove = action.amount === 'any' ? owner.zones[CardZone.TRASH].length : (action.amount || 1)
                const moved = owner.zones[CardZone.TRASH].splice(0, amountToMove)
                owner.zones[CardZone.DECK].push(...moved)
                return { previous: moved[0], selected: moved }
            }

            case 'BottomDeckBattledCharacter': {
                const owner = this.findCardOwner(card)
                if (!owner || !owner.removeCardFromZone(card, CardZone.TRASH)) return {}
                owner.zones[CardZone.DECK].push(card)
                return { previous: card, selected: [card] }
            }

            case 'LookAndPlace': {
                const count = Math.min(action.look || action.amount || 1, player.zones[CardZone.DECK].length)
                const revealed = player.zones[CardZone.DECK].splice(0, count)
                revealed.forEach(lookedCard => { lookedCard.isFaceUp = true })
                if (revealed.length === 0) return { skipped: true }
                this.choiceState = {
                    active: true,
                    options: [],
                    sourceCard: card,
                    player,
                    effect: action,
                    context: { type: 'look_and_place', revealed, top: [], bottom: [], player }
                }
                return { pendingChoice: true }
            }

            case 'CostReductionNextPlay':
                player.nextPlayCostReduction = { amount: action.amount || action.value || 1, target: action.target }
                return {}

            case 'Freeze': {
                const maxTargets = action.amount || 1
                const requestedState = action.target?.state
                const targets = opponent.zones[CardZone.DEPLOY].filter(target => {
                    return (!requestedState || target.state === requestedState) && target.frozenUntilTurn <= this.gameState.turnCount
                }).slice(0, maxTargets)
                targets.forEach(target => { target.frozenUntilTurn = this.gameState.turnCount + 1 })
                return { previous: targets[0], selected: targets }
            }

            case 'CanAttackActive': {
                const targets = action.target?.reference === 'self'
                    ? [card]
                    : player.zones[CardZone.DEPLOY].slice(0, action.amount || 1)
                targets.forEach(target => { target.canAttackActive = true })
                return { previous: targets[0], selected: targets }
            }

            case 'SendToDeckBottom': {
                const target = this.resolveCompiledTarget(action, card, player, opponent, context)
                    || this.findCompiledOpponentTarget(action, opponent)
                if (!target) return {}
                const owner = this.findCardOwner(target)
                if (!owner) return {}
                Object.values(CardZone).some(zone => owner.removeCardFromZone(target, zone))
                owner.zones[CardZone.DECK].push(target)
                return { previous: target, selected: [target] }
            }

            case 'SendAllToDeckBottom': {
                const maxCost = action.maxCost ?? Infinity
                const excluded = action.target?.reference === 'self' || action.exclude === 'self' ? card : null
                const targets = opponent.zones[CardZone.DEPLOY].filter(target => {
                    if (target === excluded || target.cost > maxCost) return false
                    if (action.state && target.state !== action.state) return false
                    return true
                })
                targets.forEach(target => {
                    opponent.removeCardFromZone(target, CardZone.DEPLOY)
                    opponent.zones[CardZone.DECK].push(target)
                })
                return { previous: targets[0], selected: targets }
            }

            case 'DeployCharacter': {
                const target = action.sourceType === 'play_self'
                    ? card
                    : this.resolveCompiledTarget(action, card, player, opponent, context)
                if (!target || target.type?.toLowerCase() !== 'character') return {}
                if (!player.canDeployCharacter()) {
                    this.startTargetSelection({
                        type: 'replace_effect_character',
                        cardToPlay: target,
                        endState: action.endState
                    }, card, player, player.zones[CardZone.DEPLOY])
                    return { pendingChoice: true }
                }
                if (!player.zones[CardZone.DEPLOY].includes(target)) {
                    Object.values(CardZone).some(zone => player.removeCardFromZone(target, zone))
                    player.addCardToZone(target, CardZone.DEPLOY)
                }
                target.isSummonSick = !target.hasRush
                return { previous: target, selected: [target] }
            }

            case 'DeployCharacterFromTrash': {
                if (card.type?.toLowerCase() !== 'character' || !player.canDeployCharacter()) return {}
                player.removeCardFromZone(card, CardZone.TRASH)
                player.addCardToZone(card, CardZone.DEPLOY)
                card.isSummonSick = action.endState !== 'active' && !card.hasRush
                if (action.endState === 'active') card.state = CardState.ACTIVE
                return { previous: card, selected: [card] }
            }

            case 'GiveDon': {
                if (!context.selected?.length && action.target?.reference === 'leader_or_character') {
                    const validTargets = [
                        ...player.zones[CardZone.LEADER],
                        ...player.zones[CardZone.DEPLOY]
                    ]
                    if (validTargets.length === 0 || player.zones[CardZone.DON_RESTED].length === 0) return {}
                    this.startTargetSelection(action, card, player, validTargets)
                    return { pendingChoice: true }
                }

                const target = context.selected?.[0]
                    || this.resolveCompiledTarget(action, card, player, opponent, context)
                    || this.findCompiledZoneTarget(player, CardZone.DEPLOY, action.target)
                    || card
                const don = action.state === 'rested'
                    ? player.zones[CardZone.DON_RESTED].pop()
                    : player.zones[CardZone.DON_COST].pop()
                if (!don || !target) return {}
                don.state = action.state === 'rested' ? CardState.RESTED : CardState.ACTIVE
                target.attachedDon = target.attachedDon || []
                target.attachedDon.push(don)
                if (action.state === 'rested') player.restedDonCount = Math.max(0, player.restedDonCount - 1)
                else player.activeDonCount++
                this.emitGameEvent('don_given', { card: target, don, player })
                return { previous: target, selected: [target] }
            }

            case 'GiveDonOpponent': {
                const target = this.findCompiledZoneTarget(opponent, CardZone.DEPLOY, action.target)
                if (!target) return {}
                for (let index = 0; index < amount; index++) {
                    const don = opponent.zones[CardZone.DON_COST].pop()
                    if (!don) break
                    target.attachedDon = target.attachedDon || []
                    target.attachedDon.push(don)
                }
                return { previous: target, selected: [target] }
            }

            case 'DeckRule':
                card.deckRule = action.value || action.rawText || true
                return {}

            case 'KOAll': {
                const targets = opponent.zones[CardZone.DEPLOY].filter(target => {
                    return target !== card && (action.maxPower === undefined || target.getCurrentPower() <= action.maxPower)
                })
                targets.forEach(target => this.knockOutCard(target, 'effect'))
                return { selected: targets }
            }

            case 'WinGame':
                this.endGame(player.id, 'effect_win')
                return {}

            case 'SetActive': {
                const target = this.resolveCompiledTarget(action, card, player, opponent, context) || card
                target.state = CardState.ACTIVE
                return { previous: target, selected: [target] }
            }

            case 'Rest': {
                const maxCost = action.target?.maxCost ?? Infinity
                const validTargets = opponent.zones[CardZone.DEPLOY].filter(target => {
                    return target.state === CardState.ACTIVE && target.cost <= maxCost && target.cannotBeRestedUntilTurn <= this.gameState.turnCount
                })
                const target = context.selected?.[0] || validTargets[0]
                if (!target) return { skipped: true }
                target.state = CardState.RESTED
                this.gameState.logAction(`⚡ [Effet] ${card.name} : ${target.name} est incliné.`)
                return { previous: target, selected: [target] }
            }

            case 'RestSelf':
                if (card.cannotBeRestedUntilTurn <= this.gameState.turnCount) card.state = CardState.RESTED
                return { previous: card, selected: [card] }

            case 'ShuffleDeck':
                player.zones[CardZone.DECK].sort(() => Math.random() - 0.5)
                return {}

            case 'RevealCard': {
                const targetName = action.target?.name?.toLowerCase()
                const revealedIndex = targetName
                    ? player.zones[CardZone.DECK].findIndex(deckCard => deckCard.name?.toLowerCase() === targetName)
                    : 0
                const revealed = player.zones[CardZone.DECK][revealedIndex]
                if (!revealed) return {}
                revealed.isFaceUp = true
                this.gameState.logAction(`⚡ [Effet] ${card.name} révèle ${revealed.name}.`)
                if (action.sourceType === 'reveal_deck_add_hand') {
                    player.zones[CardZone.DECK].splice(revealedIndex, 1)
                    player.addCardToZone(revealed, CardZone.HAND)
                }
                return { previous: revealed, selected: [revealed] }
            }

            case 'SetActiveAll': {
                const targets = [...player.zones[CardZone.LEADER], ...player.zones[CardZone.DEPLOY], ...player.zones[CardZone.STAGE]]
                targets.forEach(target => { target.state = CardState.ACTIVE })
                return { selected: targets }
            }

            case 'SetPlayState': {
                const targets = [...player.zones[CardZone.DEPLOY]]
                targets.forEach(target => { target.state = action.state === 'rested' ? CardState.RESTED : CardState.ACTIVE })
                return { selected: targets }
            }

            case 'FreezeDon': {
                const targets = opponent.zones[CardZone.DON_RESTED].slice(0, action.amount || 1)
                targets.forEach(target => { target.frozenUntilTurn = this.gameState.turnCount + 1 })
                return { selected: targets }
            }

            case 'GiveDonMulti': {
                const targets = this.findCompiledTargets(action, player).slice(0, action.maxTargets || action.amount || 1)
                const selected = []
                targets.forEach(target => {
                    const don = player.zones[CardZone.DON_COST].pop()
                    if (!don) return
                    don.state = action.state === 'rested' ? CardState.RESTED : CardState.ACTIVE
                    target.attachedDon = target.attachedDon || []
                    target.attachedDon.push(don)
                    selected.push(target)
                })
                return { previous: selected[0], selected }
            }

            case 'GiveDonAll': {
                const targets = [...player.zones[CardZone.LEADER], ...player.zones[CardZone.DEPLOY]]
                return this.executeCompiledAction({ ...action, kind: 'GiveDonMulti', maxTargets: targets.length }, card, player, context)
            }

            case 'ReturnDonField': {
                const amountToReturn = action.amount || player.zones[CardZone.DON_ACTIVE].length
                for (let index = 0; index < amountToReturn; index++) {
                    const don = player.zones[CardZone.DON_ACTIVE].pop() || player.zones[CardZone.DON_RESTED].pop()
                    if (!don) break
                    player.zones[CardZone.DON_COST].push(don)
                }
                return {}
            }

            case 'SetBasePowerAll': {
                const targets = [...player.zones[CardZone.LEADER], ...player.zones[CardZone.DEPLOY]]
                targets.forEach(target => { target.tempBasePowerOverride = action.value || action.amount })
                return { selected: targets }
            }

            case 'SetCounter': {
                const targets = [...player.zones[CardZone.HAND], ...player.zones[CardZone.DEPLOY]]
                targets.filter(target => this.matchesCardType(target.type, action.target?.cardType))
                    .forEach(target => { target.counterModifier = action.value || action.amount })
                return { selected: targets }
            }

            case 'TreatNameAs':
                card.alternateNames = [...new Set([...(card.alternateNames || []), action.name || action.value])]
                return { previous: card, selected: [card] }

            case 'SetAttackTarget': {
                const target = context.selected?.[0]
                if (target) this.gameState.defenderId = target.uniqueInstanceId
                return { previous: target, selected: target ? [target] : [] }
            }

            case 'ChooseCostReveal':
                this.choiceState = { active: true, options: ['cost'], sourceCard: card, player, effect: action, context }
                return { pendingChoice: true }

            case 'KOOrRest':
                this.choiceState = {
                    active: true,
                    options: [
                        { type: 'ko_or_rest', label: 'K.O.', action: 'knockout' },
                        { type: 'ko_or_rest', label: 'Reposer', action: 'rest' }
                    ],
                    sourceCard: card,
                    player,
                    effect: action,
                    context: { ...context, target: action.target }
                }
                return { pendingChoice: true }

            case 'DeployOpponent': {
                const target = opponent.zones[CardZone.HAND][0]
                if (!target || !opponent.canDeployCharacter()) return {}
                opponent.removeCardFromZone(target, CardZone.HAND)
                opponent.addCardToZone(target, CardZone.DEPLOY)
                target.isSummonSick = !target.hasRush
                return { previous: target, selected: [target] }
            }

            case 'LookAtLifeAll': {
                const targets = player.zones[CardZone.LIFE]
                targets.forEach(target => { target.isFaceUp = true })
                return { selected: targets }
            }

            case 'TrashAllAndPlay': {
                const matching = player.zones[CardZone.TRASH].filter(target => {
                    return this.matchesCardType(target.type, action.target?.cardType)
                        && (!action.target?.exactPower || target.power === action.target.exactPower)
                })
                matching.forEach(target => {
                    player.removeCardFromZone(target, CardZone.TRASH)
                    if (player.canDeployCharacter()) player.addCardToZone(target, CardZone.DEPLOY)
                })
                return { selected: matching }
            }

            default:
                console.warn(`[Engine] Action compilée non gérée : ${action.kind}`, action)
                return {}
        }
    }

    resolveCompiledTarget(action, card, player, opponent, context) {
        const targetSpec = action.target
        if (context?.selected?.length && targetSpec && !targetSpec.reference) {
            return context.selected[0]
        }
        if (targetSpec?.targetType === 'leader') {
            return player.zones[CardZone.LEADER].find(target => {
                return !targetSpec.cardType || target.name?.toLowerCase() === String(targetSpec.cardType).toLowerCase()
            }) || null
        }
        if (targetSpec?.filter?.targetType === 'leader') {
            return player.zones[CardZone.LEADER][0] || null
        }
        if (targetSpec?.filter?.targetType === 'character') {
            const filter = targetSpec.filter
            return player.zones[CardZone.DEPLOY].find(target => {
                const targetTypes = String(target.cardType || target.traits || target.type || '').toLowerCase()
                return !filter.cardType || targetTypes.includes(String(filter.cardType).toLowerCase())
            }) || null
        }
        if (targetSpec?.targetType === 'leader_or_character') {
            return player.zones[CardZone.LEADER][0]
                || player.zones[CardZone.DEPLOY].find(target => {
                    return this.matchesCardType(target.type, targetSpec.cardType)
                })
                || null
        }
        if (targetSpec?.targetType === 'character') {
            if (!targetSpec.cardType) return null
            return player.zones[CardZone.DEPLOY].find(target => {
                const targetTypes = String(target.cardType || target.traits || target.type || '').toLowerCase()
                return this.matchesCardType(targetTypes, targetSpec.cardType)
            }) || null
        }
        const reference = action.target?.reference
        if (reference === 'previous' || reference === 'that_card' || reference === 'that_character') {
            return context.previous
        }
        if (reference === 'self' || reference === 'source') return card
        if (reference === 'opponent_character') return opponent.zones[CardZone.DEPLOY][0]
        if (reference === 'character') return player.zones[CardZone.DEPLOY][0]
        if (action.target?.targetType === 'leader') {
            const leader = player.zones[CardZone.LEADER][0]
            if (!leader) return null
            if (action.target.cardType && !leader.name?.toLowerCase().includes(String(action.target.cardType).toLowerCase())) return null
            return leader
        }
        if (action.target?.targetType === 'character' && action.target.cardType) {
            return player.zones[CardZone.DEPLOY].find(target => target.name?.toLowerCase().includes(String(action.target.cardType).toLowerCase())) || null
        }
        if (!action.target) return context.selected[0] || null
        return null
    }

    findCompiledOpponentTarget(action, opponent) {
        const target = action.target || {}
        const maxCost = target.maxCost ?? Infinity
        const maxPower = target.maxPower ?? Infinity
        return opponent.zones[CardZone.DEPLOY].find(candidate => {
            const cardTypes = candidate.cardType || candidate.traits || candidate.type
            return candidate.cost <= maxCost
                && candidate.getCurrentPower() <= maxPower
                && this.matchesCardType(cardTypes, target.cardType)
        }) || null
    }

    findCompiledTargets(action, owner) {
        const maxTargets = action.amount || action.target?.amount || 1
        const target = action.target || {}
        return owner.zones[CardZone.DEPLOY]
            .filter(candidate => this.matchesCompiledFilter(candidate, target))
            .slice(0, Math.max(maxTargets, 2))
    }

    findCompiledZoneTarget(player, zoneName, filter) {
        return player.zones[zoneName].find(target => this.matchesCompiledFilter(target, filter)) || null
    }

    matchesCompiledFilter(card, filter) {
        if (!filter) return true
        const cardTypes = card.cardType || card.traits || card.type
        if (filter.targetType === 'character' && card.type?.toLowerCase() !== 'character') return false
        if (filter.targetType === 'stage' && card.type?.toLowerCase() !== 'stage') return false
        if (filter.targetType === 'leader' && card.type?.toLowerCase() !== 'leader') return false
        const isBlockerFilter = typeof filter.cardType === 'string' && filter.cardType.toLowerCase() === 'blocker'
        if (isBlockerFilter) {
            if (!this.hasKeyword(card, 'blocker')) return false
        } else if (filter.cardType && !this.matchesCardType(cardTypes, filter.cardType)) return false
        if (filter.cardTypes && !filter.cardTypes.some(type => this.matchesCardType(cardTypes, type))) return false
        if (filter.state && card.state !== filter.state) return false
        if (filter.maxCost !== undefined && card.cost > filter.maxCost) return false
        if (filter.minCost !== undefined && card.cost < filter.minCost) return false
        if (filter.exactCost !== undefined && card.cost !== filter.exactCost) return false
        if (filter.maxPower !== undefined && card.getCurrentPower() > filter.maxPower) return false
        if (filter.minPower !== undefined && card.getCurrentPower() < filter.minPower) return false
        if (filter.exactPower !== undefined && card.getCurrentPower() !== filter.exactPower) return false
        if (filter.color && card.color?.toLowerCase() !== filter.color.toLowerCase()) return false
        if (filter.name && card.name?.toLowerCase() !== filter.name.toLowerCase()) return false
        if (filter.rawText) {
            const rawText = filter.rawText.toLowerCase()
            if (rawText.includes('character') && card.type?.toLowerCase() !== 'character') return false
            const costMatch = rawText.match(/cost of (\d+)/)
            if (costMatch && card.cost !== Number(costMatch[1])) return false
            const nameMatch = rawText.match(/\[([^\]]+)\]/)
            if (nameMatch && !card.name?.toLowerCase().includes(nameMatch[1].toLowerCase())) return false
        }
        return true
    }

    // ========== PHASES & DUELS ==========

    startTurn() {
        const currentPlayer = this.gameState.getCurrentPlayer()
        this.gameState.changePhase(GameplayPhase.DRAW)

        this.refreshAllCards(currentPlayer)

        const isFirstTurnP1 = this.gameState.turnCount === 1 && currentPlayer.id === 0
        if (!isFirstTurnP1) {
            this.drawFromDeck(currentPlayer)
        }
        this.addDonFromDonDeck(currentPlayer, isFirstTurnP1)
        this.triggerPlayerTiming(currentPlayer, 'yourTurn')
        this.triggerPlayerTiming(this.gameState.getOpponentPlayer(), 'oppTurn')
        this.applyPassiveEffects(currentPlayer)
        this.applyPassiveEffects(this.gameState.getOpponentPlayer())
    }

    addDonFromDonDeck(player, isFirstTurnP1) {
        const donToGain = isFirstTurnP1 ? 1 : 2
        const donDeck = player.zones[CardZone.DON_COST]

        for (let i = 0; i < donToGain && donDeck.length > 0; i++) {
            const don = donDeck.pop()
            don.state = CardState.ACTIVE
            player.addCardToZone(don, CardZone.DON_ACTIVE)
            player.activeDonCount++
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
    }

    drawFromLife(player) {
        const lifeZone = player.zones[CardZone.LIFE]
        if (lifeZone.length === 0) {
            this.endGame(player.id === 0 ? 1 : 0, 'life_zero')
            return
        }

        const drawnCard = lifeZone.pop()
        drawnCard.isFaceUp = true
        player.lifeCount = lifeZone.length

        const cardEffects = drawnCard.effects || drawnCard.actionV3s || []
        const hasTrigger = cardEffects.some(effect => effect.proc === 'trigger')

        if (hasTrigger) {
            this.gameState.logAction(`💔 ${player.name} subit 1 dégât et révèle [TRIGGER] : ${drawnCard.name}`)
            this.choiceState = {
                active: true,
                options: [
                    { type: 'activate_trigger' },
                    { type: 'take_life_card' }
                ],
                sourceCard: drawnCard,
                player,
                effect: null,
                context: null,
                triggerCard: drawnCard
            }
            this.gameState.logAction(`🎯 Choisissez: activer le Trigger de ${drawnCard.name} ou ajouter la carte à votre main.`)
        } else {
            player.addCardToZone(drawnCard, CardZone.HAND)
            this.gameState.logAction(`💔 ${player.name} ajoute ${drawnCard.name} à sa main.`)
        }
    }

    nextPhase() {
        if (this.gameState.isInCombat || this.targetingState.active || this.choiceState.active) {
            this.gameState.logAction('⚠️ Impossible de changer de phase: une résolution ou un choix est en attente.')
            return false
        }
        const phases = [GameplayPhase.DRAW, GameplayPhase.MAIN, GameplayPhase.ATTACK, GameplayPhase.BLOCK, GameplayPhase.END]
        const currentIndex = phases.indexOf(this.gameState.currentPhase)
        const nextPhase = phases[(currentIndex + 1) % phases.length]

        if (nextPhase === GameplayPhase.END) {
            this.triggerPlayerTiming(this.gameState.getCurrentPlayer(), 'onEndTurn')
            this.emitGameEvent('end_turn', { player: this.gameState.getCurrentPlayer() })
            this.gameState.changePhase(nextPhase)
            return true
        }

        if (nextPhase === GameplayPhase.DRAW) {
            this.endTurn()
            const currentPlayer = this.gameState.getCurrentPlayer()
            if (currentPlayer.extraTurns > 0) {
                currentPlayer.extraTurns--
                this.startTurn()
                return
            }
            this.gameState.switchTurn()
            this.startTurn()
        } else {
            this.gameState.changePhase(nextPhase)
        }
    }

    endTurn() {
        const player = this.gameState.getCurrentPlayer()
        this.detachAllDon(player)
    }

    playCardFromHand(cardId) {
        const player = this.gameState.getCurrentPlayer()
        const card = player.findCardInZone(cardId, CardZone.HAND)

        if (this.gameState.currentPhase !== GameplayPhase.MAIN) {
            this.gameState.logAction(`⚠️ Impossible de jouer une carte hors Main Phase.`)
            return false
        }
        if (!card) {
            this.gameState.logAction(`⚠️ Carte introuvable dans la main.`)
            return false
        }

        const baseEffectiveCost = card.getEffectiveCost(this.gameState.turnCount)
        const reduction = player.nextPlayCostReduction
        const reductionMatches = reduction && this.matchesCompiledFilter(card, reduction.target)
        const effectiveCost = Math.max(0, baseEffectiveCost - (reductionMatches ? Number(reduction.amount || 0) : 0))
        if (player.activeDonCount < effectiveCost) {
            this.gameState.logAction(`⚠️ ${card.name} nécessite ${effectiveCost} DON!! actif(s), disponibles: ${player.activeDonCount}.`)
            return false
        }

        const cardType = card.type?.toLowerCase()

        // 1. PERSONNAGES
        if (cardType === 'character') {
            // RÈGLE : Si le terrain est plein (5 cartes), ciblage pour remplacement
            if (!player.canDeployCharacter()) {
                const myDeployedCharacters = player.zones[CardZone.DEPLOY]
                const replaceAction = {
                    type: 'replace_character',
                    cardToPlay: card
                }

                this.startTargetSelection(replaceAction, card, player, myDeployedCharacters)
                this.gameState.logAction(`⚠️ Terrain plein ! Choisissez un personnage à envoyer au Trash pour poser ${card.name}.`)
                return true
            }

            player.removeCardFromZone(card, CardZone.HAND)
            card.state = CardState.ACTIVE
            card.isSummonSick = !card.hasRush
            player.addCardToZone(card, CardZone.DEPLOY)
            this.payDonCost(player, effectiveCost)

            this.gameState.logAction(`${player.name} pose le Personnage ${card.name}.`)
            this.registerPassiveEffects(card, player)
            this.registerDeferredEffects(card, player)
            this.applyPassiveEffects(player)
            this.triggerActV3Actions(card, 'onPlay', player)
            this.emitGameEvent('card_played', { card, cardType })
            if (reductionMatches) player.nextPlayCostReduction = null
            return true
        }

        // 2. ÉVÉNEMENTS (EVENT)
        else if (cardType === 'event') {
            player.removeCardFromZone(card, CardZone.HAND)
            player.addCardToZone(card, CardZone.TRASH)
            this.payDonCost(player, effectiveCost)

            this.gameState.logAction(`${player.name} joue l'Événement ${card.name}.`)
            this.registerPassiveEffects(card, player)
            this.registerDeferredEffects(card, player)
            this.applyPassiveEffects(player)
            const eventTiming = card.effects?.some(effect => effect.proc === 'main') ? 'main' : 'onPlay'
            this.triggerActV3Actions(card, eventTiming, player)
            this.emitGameEvent('event_activated', { card, player })
            if (reductionMatches) player.nextPlayCostReduction = null
            return true
        }

        // 3. TERRAINS (STAGE)
        else if (cardType === 'stage') {
            player.removeCardFromZone(card, CardZone.HAND)
            card.state = CardState.ACTIVE

            // Un seul Stage à la fois : défausse l'ancien s'il existe
            const currentStage = player.zones[CardZone.STAGE]
            if (currentStage.length > 0) {
                const oldStage = currentStage.pop()
                player.addCardToZone(oldStage, CardZone.TRASH)
                this.gameState.logAction(`🗑️ L'ancien Terrain ${oldStage.name} est envoyé au Trash.`)
            }

            player.addCardToZone(card, CardZone.STAGE)
            this.payDonCost(player, effectiveCost)

            this.gameState.logAction(`${player.name} active le Terrain ${card.name}.`)
            this.registerPassiveEffects(card, player)
            this.registerDeferredEffects(card, player)
            this.applyPassiveEffects(player)
            this.triggerActV3Actions(card, 'onPlay', player)
            if (reductionMatches) player.nextPlayCostReduction = null
            return true
        }

        this.gameState.logAction(`⚠️ Type de carte non jouable: ${card.type || 'inconnu'}.`)
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

    declareAttack(attackerCardId, defenderCardId) {
        const attacker = this.findCard(attackerCardId)
        const defender = this.findCard(defenderCardId)

        if (!attacker || !defender) return false
        if (attacker.frozenUntilTurn > this.gameState.turnCount) return false
        if (attacker.type?.toLowerCase() === 'character'
            && attacker.isSummonSick
            && !this.hasKeyword(attacker, 'rush')
            && !attacker.canAttackActive) return false
        if (attacker.restrictions.some(restriction => restriction.rule?.includes('attack') && restriction.untilTurn > this.gameState.turnCount)) return false
        if (attacker.restrictions.some(restriction => restriction.rule === 'attack_except' && restriction.except && defender.name !== restriction.except)) return false
        if (defender.type?.toLowerCase() === 'character' && defender.state === CardState.ACTIVE && !attacker.canAttackActive) return false

        attacker.state = CardState.RESTED
        this.gameState.startCombat(attacker, defender)
        this.emitGameEvent('character_attacked', { attacker, defender })

        this.triggerActV3Actions(attacker, 'onAttack', this.gameState.getCurrentPlayer())
        const defenderOwner = this.findCardOwner(defender)
        if (defenderOwner) this.triggerPlayerTiming(defenderOwner, 'onOpponentAttack')
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

        this.gameState.logAction(`⚔️ Résolution : ${attacker.name} (${attPower}) vs ${defender.name} (${defPower})`)

        if (attPower >= defPower) {
            if (defender.type?.toLowerCase() === 'leader') {
                const damageCount = this.hasKeyword(attacker, 'double attack') ? 2 : 1
                for (let index = 0; index < damageCount; index++) {
                    if (this.hasKeyword(attacker, 'banish')) this.banishLifeCard(defenderOwner)
                    else this.drawFromLife(defenderOwner)
                }
            } else if (defender.type?.toLowerCase() === 'character') {
                this.knockOutCard(defender, 'battle')
                this.gameState.logAction(`💥 ${defender.name} est K.O. et va au Trash !`)
            }
        } else {
            this.gameState.logAction(`🛡️ L'attaque de ${attacker.name} a été parée !`)
        }

        this.clearCombatTempModifiers()
        this.gameState.endCombat()
        return true
    }

    knockOutCard(card, cause = 'effect') {
        const owner = this.findCardOwner(card)
        if (!owner) return
        const replacementResult = this.applyReplacement(card, owner, cause)
        if (replacementResult === 'pending') return false
        if (replacementResult) return false
        if (this.isProtected(card, 'ko', cause)) {
            this.gameState.logAction(`🛡️ ${card.name} est protégé contre ce K.O.`)
            return false
        }

        Object.values(CardZone).forEach(zone => {
            owner.removeCardFromZone(card, zone)
        })
        owner.addCardToZone(card, CardZone.TRASH)
        owner.lastTrashCount = 1
        this.gameState.logAction(`💥 [Effet] ${card.name} est mis K.O. (${cause}).`)
        this.triggerActV3Actions(card, 'onKO', owner)
        this.emitGameEvent('leave_field', { card, cause })
        this.emitGameEvent('character_ko', { card, cause, owner })
        return true
    }

    discardForRule(card, owner = this.findCardOwner(card)) {
        if (!owner) return false
        Object.values(CardZone).forEach(zone => owner.removeCardFromZone(card, zone))
        owner.addCardToZone(card, CardZone.TRASH)
        owner.lastTrashCount = 0
        this.gameState.logAction(`🗑️ [Règle] ${card.name} est défaussé pour libérer une place.`)
        return true
    }

    replacementMatchesCondition(card, owner, replacement, cause) {
        const condition = replacement?.condition
        if (!condition) return true
        if (condition.typeCond === 'base_power_max') {
            return card.power <= Number(condition.max)
        }
        if (condition.typeCond !== 'generic') return true

        const text = String(condition.text || '').toLowerCase()
        if (text.includes("would be rested")) return false
        if (text.includes("would be k.o") && cause !== 'battle' && cause !== 'effect') return false
        if (text.includes("removed from the field") && cause !== 'effect') return false

        const sourceCard = replacement.sourceCard
        if (text.includes('other than this character') && sourceCard === card) return false
        const traitMatch = text.match(/(?:your|a) [\"{]?([^\"{}]+?)[\"}]? type character/)
        if (traitMatch && !this.matchesCardType(card.cardType || card.traits, traitMatch[1])) return false
        const powerAtLeast = text.match(/(\d+) power or more/)
        if (powerAtLeast && card.getCurrentPower() < Number(powerAtLeast[1])) return false
        const basePowerAtMost = text.match(/(\d+) base power or less/)
        if (basePowerAtMost && card.power > Number(basePowerAtMost[1])) return false
        const baseCostAtMost = text.match(/base cost of (\d+) or less/)
        if (baseCostAtMost && card.cost > Number(baseCostAtMost[1])) return false
        return true
    }

    applyReplacement(card, owner, cause) {
        if (cause !== 'effect' && cause !== 'battle') return false
        
        const optionalReplacement = card.replacements?.find(replacement => {
            return replacement.optional && (!replacement.oncePerTurn || replacement.usedTurn !== this.gameState.turnCount)
                && this.replacementMatchesCondition(card, owner, replacement, cause)
        })
        if (optionalReplacement) {
            this.choiceState = {
                active: true,
                options: [
                    { type: 'optional_replacement', label: 'Appliquer le remplacement' },
                    { type: 'optional_replacement', label: 'K.O. normalement' }
                ],
                sourceCard: card,
                player: owner,
                effect: optionalReplacement,
                context: { type: 'optional_replacement', replacement: optionalReplacement, cause, koCard: card }
            }
            this.gameState.logAction(`🎯 ${card.name} peut utiliser un remplacement optionnel.`)
            return 'pending'
        }
        
        const localReplacement = (card.replacements || []).find(replacement => {
            return (!replacement.oncePerTurn || replacement.usedTurn !== this.gameState.turnCount)
                && this.replacementMatchesCondition(card, owner, replacement, cause)
        })
        const teamReplacement = localReplacement ? null : (owner.passiveReplacements || []).find(replacement => {
            return this.replacementMatchesCondition(card, owner, replacement, cause)
                && (!replacement.oncePerTurn || replacement.usedTurn !== this.gameState.turnCount)
        })
        const replacement = localReplacement || teamReplacement
        if (!replacement) return false
        const action = replacement.action
        if (!action) return false

        if (action === 'trash_to_bottom_deck' || action.type === 'bottom_deck') {
            Object.values(CardZone).forEach(zone => owner.removeCardFromZone(card, zone))
            owner.zones[CardZone.DECK].push(card)
        } else if (action === 'return_don' || action.type === 'return_don') {
            const dons = card.attachedDon || []
            while (dons.length > 0) {
                const don = dons.pop()
                don.state = CardState.RESTED
                owner.addCardToZone(don, CardZone.DON_RESTED)
                owner.restedDonCount++
            }
        } else if (action === 'rest_self' || action.type === 'rest_self') {
            card.state = CardState.RESTED
        } else if (action === 'turn_life_faceup' || action.type === 'turn_life_faceup') {
            const lifeCard = owner.zones[CardZone.LIFE][owner.zones[CardZone.LIFE].length - 1]
            if (lifeCard) lifeCard.isFaceUp = true
        } else if (action.type === 'give_power') {
            const leader = owner.zones[CardZone.LEADER][0]
            if (!leader) return false
            leader.tempPowerModifier += action.value || 0
        } else if (action.type === 'add_to_life_facedown') {
            Object.values(CardZone).forEach(zone => owner.removeCardFromZone(card, zone))
            card.isFaceUp = false
            owner.addCardToZone(card, CardZone.LIFE)
            owner.lifeCount = owner.zones[CardZone.LIFE].length
        } else if (action === 'trash_self' || action.type === 'trash_self') {
            const replacementSource = replacement.sourceCard || card
            Object.values(CardZone).forEach(zone => owner.removeCardFromZone(replacementSource, zone))
            owner.addCardToZone(replacementSource, CardZone.TRASH)
        } else if (action.type === 'rest_card' && action.amount && action.target) {
            const targets = owner.zones[CardZone.DEPLOY].filter(candidate => {
                const cardTypes = candidate.cardType || candidate.traits || candidate.type
                return !action.target.cardType || this.matchesCardType(cardTypes, action.target.cardType)
            }).slice(0, action.amount)
            targets.forEach(target => { target.state = CardState.RESTED })
        } else if (action.type === 'rest_don' && action.amount) {
            for (let i = 0; i < action.amount; i++) {
                const don = owner.zones[CardZone.DON_ACTIVE].pop()
                if (!don) break
                don.state = CardState.RESTED
                owner.zones[CardZone.DON_RESTED].push(don)
                owner.activeDonCount = Math.max(0, owner.activeDonCount - 1)
                owner.restedDonCount++
            }
        } else if (action.type === 'multi' && Array.isArray(action.actions)) {
            for (const nested of action.actions || []) {
                if (nested.type === 'trash_self') {
                    const replacementSource = replacement.sourceCard || card
                    Object.values(CardZone).forEach(zone => owner.removeCardFromZone(replacementSource, zone))
                    owner.addCardToZone(replacementSource, CardZone.TRASH)
                } else if (nested.type === 'draw') {
                    for (let index = 0; index < (nested.amount || 1); index++) this.drawFromDeck(owner)
                }
            }
        } else {
            return false
        }

        if (replacement.oncePerTurn) replacement.usedTurn = this.gameState.turnCount
        else {
            if (card.replacements) card.replacements = card.replacements.filter(r => r !== replacement)
            if (owner.passiveReplacements) owner.passiveReplacements = owner.passiveReplacements.filter(r => r !== replacement)
        }
        return true
    }

    isProtected(card, kind, cause) {
        return (card.protections || []).some(protection => {
            if (protection.kind !== kind) return false
            const protectionCause = String(protection.by || '').toLowerCase()
            if (protectionCause.includes('battle')) return cause === 'battle'
            if (protectionCause.includes('effect')) return cause === 'effect'
            return true
        })
    }

    attachDonToCard(targetCardId) {
        const player = this.gameState.getCurrentPlayer()
        const targetCard = this.findCard(targetCardId)

        if (!targetCard || player.activeDonCount <= 0) return false

        const donCard = player.zones[CardZone.DON_ACTIVE].pop()
        player.activeDonCount--

        if (!targetCard.attachedDon) targetCard.attachedDon = []
        targetCard.attachedDon.push(donCard)

        this.gameState.logAction(`⚡ 1 Don!! attaché à ${targetCard.name}`)
        this.applyPassiveEffects(player)
        return true
    }

    detachAllDon(player) {
        const allFieldCards = [...player.zones[CardZone.DEPLOY], ...player.zones[CardZone.LEADER]]
        allFieldCards.forEach(card => {
            if (card.attachedDon) {
                while (card.attachedDon.length > 0) {
                    const don = card.attachedDon.pop()
                    don.state = CardState.RESTED
                    player.addCardToZone(don, CardZone.DON_RESTED)
                    player.restedDonCount++
                }
            }
        })
    }

    declareBlocker(blockerCardId) {
        if (!this.gameState.isInCombat) return false
        const blocker = this.findCard(blockerCardId)

        const attacker = this.findCard(this.gameState.attackerId)
        if (!blocker || blocker.state === CardState.RESTED || !this.hasKeyword(blocker, 'blocker')) return false
        if (attacker?.cannotActivateBlockerUntilTurn > this.gameState.turnCount) return false
        if (attacker && this.hasKeyword(attacker, 'unblockable')) return false
        if (blocker.blockerDisabledUntilTurn > this.gameState.turnCount) return false

        blocker.state = CardState.RESTED
        this.gameState.defenderId = blocker.uniqueInstanceId
        this.gameState.logAction(`🛡️ [BLOCKER] ${blocker.name} s'interpose !`)
        this.triggerActV3Actions(blocker, 'onBlock', this.findCardOwner(blocker))
        return true
    }

    hasKeyword(card, keyword) {
        const normalized = String(keyword).toLowerCase()
        return Boolean(card?.keywords?.has?.(normalized)
            || card?.temporaryKeywords?.some(entry => entry.keyword === normalized && entry.untilTurn > this.gameState.turnCount)
            || (normalized === 'rush' && card?.hasRush)
            || (normalized === 'blocker' && card?.isBlocker))
    }

    matchesCardType(value, expected) {
        if (!expected) return true
        const actual = String(value || '').toLowerCase()
        const expectedTypes = Array.isArray(expected) ? expected : [expected]
        return expectedTypes.some(type => actual.includes(String(type).toLowerCase()))
    }

    banishLifeCard(player) {
        const lifeCard = player.zones[CardZone.LIFE].pop()
        if (!lifeCard) {
            this.endGame(player.id === 0 ? 1 : 0, 'life_zero')
            return
        }
        lifeCard.isFaceUp = true
        player.lifeCount = player.zones[CardZone.LIFE].length
        player.addCardToZone(lifeCard, CardZone.TRASH)
        this.gameState.logAction(`💔 ${player.name} bannit ${lifeCard.name} depuis sa Life.`)
    }

    applyCounterFromHand(cardId) {
        if (!this.gameState.isInCombat) return false

        const defenderOwner = this.gameState.getOpponentPlayer()
        const counterCard = defenderOwner.findCardInZone(cardId, CardZone.HAND)
        const defenderCard = this.findCard(this.gameState.defenderId)

        if (!counterCard || !defenderCard) return false

        if (counterCard.counterPower > 0) {
            defenderOwner.removeCardFromZone(counterCard, CardZone.HAND)
            defenderOwner.addCardToZone(counterCard, CardZone.TRASH)

            defenderCard.tempCounterPower = (defenderCard.tempCounterPower || 0) + counterCard.counterPower
            this.gameState.logAction(`⚡ [COUNTER] ${counterCard.name} (+${counterCard.counterPower}) ! Nouvelle puissance : ${defenderCard.getCurrentPower()}`)
            return true
        }
        return false
    }

    activateCounterFromHand(cardId) {
        if (!this.gameState.isInCombat) return false
        const defender = this.gameState.getOpponentPlayer()
        const card = defender.findCardInZone(cardId, CardZone.HAND)
        if (!card || !card.effects?.some(effect => effect.proc === 'counter')) return false
        const cost = card.getEffectiveCost(this.gameState.turnCount)
        if (defender.activeDonCount < cost) {
            this.gameState.logAction(`⚠️ ${card.name} nécessite ${cost} DON!! actif(s) pour Counter.`)
            return false
        }
        defender.removeCardFromZone(card, CardZone.HAND)
        defender.addCardToZone(card, CardZone.TRASH)
        this.payDonCost(defender, cost)
        this.gameState.logAction(`⚡ [Counter] ${card.name} est activé.`)
        this.triggerActV3Actions(card, 'counter', defender)
        return true
    }

    clearCombatTempModifiers() {
        this.gameState.players.forEach(player => {
            [...player.zones[CardZone.DEPLOY], ...player.zones[CardZone.LEADER]].forEach(card => {
                card.tempCounterPower = 0
                card.combatPowerModifier = 0
                card.tempBasePowerOverride = null
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
                if (player.findCardInZone(card.uniqueInstanceId, zone)) return player
            }
        }
        return null
    }

    getGameState() {
        return this.gameState
    }

    getPlayerState(playerId) {
        return this.gameState.players[playerId]
    }

    endGame(winnerId, reason) {
        this.gameState.isGameEnded = true
        this.gameState.winner = winnerId
        this.gameState.defeatReason = reason
        this.gameState.logAction(`Game Over! Gagnant : Player ${winnerId + 1}`)
    }
}

export default DuelEngine