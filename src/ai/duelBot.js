export class SimpleDuelBot {
  constructor({ playerId = 1, difficulty = 'normal' } = {}) {
    this.playerId = playerId
    this.difficulty = difficulty
  }

  isBotTurn(engine) {
    if (!engine?.gameState) return false
    if (engine.gameState.isGameEnded) return false
    if (engine.gameState.isInCombat) {
      const defender = engine.findCard(engine.gameState.defenderId)
      return engine.findCardOwner(defender)?.id === this.playerId
    }

    if (engine.choiceState?.player?.id === this.playerId) return true
    if (engine.targetingState?.sourceCard
      && engine.findCardOwner(engine.targetingState.sourceCard)?.id === this.playerId) return true
    return engine.gameState.currentPlayerTurnId === this.playerId
  }

  getPlayableCards(player) {
    if (!player) return []
    return (player.zones?.hand || []).filter(card => {
      const cost = Number(card.cost || 0)
      return cost <= (player.activeDonCount || 0) && !card.isLeader
    })
  }

  pickBestCardToPlay(player) {
    const playable = this.getPlayableCards(player)
    if (!playable.length) return null

    return playable.sort((a, b) => {
      const scoreA = Number(a.power || 0) + Number(a.cost || 0) * 100
      const scoreB = Number(b.power || 0) + Number(b.cost || 0) * 100
      return scoreB - scoreA
    })[0]
  }

  pickBestAttack(player, opponent) {
    if (!player || !opponent) return null

    const attackers = (player.zones?.deploy || []).filter(card => card.state !== 'rested')
    if (!attackers.length) return null

    const defenders = (opponent.zones?.deploy || []).filter(card => card.state !== 'rested')
    if (!defenders.length) {
      const leader = (opponent.zones?.leader || [])[0]
      if (leader) return { attacker: attackers[0], defender: leader }
      return null
    }

    const strongestAttacker = attackers.sort((a, b) => {
      return (b.getCurrentPower ? b.getCurrentPower() : Number(b.power || 0)) - (a.getCurrentPower ? a.getCurrentPower() : Number(a.power || 0))
    })[0]

    const weakestDefender = defenders.sort((a, b) => {
      return (a.getCurrentPower ? a.getCurrentPower() : Number(a.power || 0)) - (b.getCurrentPower ? b.getCurrentPower() : Number(b.power || 0))
    })[0]

    return { attacker: strongestAttacker, defender: weakestDefender }
  }

  pickBlocker(player) {
    return (player?.zones?.deploy || [])
      .filter(card => card.state !== 'rested' && card.isBlocker)
      .sort((a, b) => Number(a.power || 0) - Number(b.power || 0))[0] || null
  }

  pickCounterCard(player) {
    return (player?.zones?.hand || [])
      .filter(card => Number(card.counterPower || 0) > 0
        || card.effects?.some(effect => effect.proc === 'counter'))
      .filter(card => Number(card.counterPower || 0) > 0
        || Number(card.getEffectiveCost?.(0) || card.cost || 0) <= (player.activeDonCount || 0))
      .sort((a, b) => Number(b.counterPower || 0) - Number(a.counterPower || 0))[0] || null
  }

  resolveBotChoice(engine) {
    const choiceState = engine?.choiceState
    if (!choiceState?.active || choiceState.player?.id !== this.playerId) return false
    if (choiceState.context?.type === 'look_and_place') {
      const revealed = choiceState.context.revealed || []
      const card = revealed[0]
      return card ? engine.chooseLookAndPlace(card.uniqueInstanceId, 'bottom') : false
    }
    return engine.chooseEffectOption(0)
  }

  resolveBotTarget(engine) {
    const targetingState = engine?.targetingState
    if (!targetingState?.active || targetingState.sourceCard && engine.findCardOwner(targetingState.sourceCard)?.id !== this.playerId) return false
    const target = targetingState.validTargets?.[0]
    return target ? engine.selectTarget(target) : false
  }

  resolveCombat(engine) {
    const state = engine?.gameState
    if (!state?.isInCombat) return false

    const defender = engine.findCard(state.defenderId)
    const defenderOwner = defender && engine.findCardOwner(defender)
    if (defenderOwner?.id !== this.playerId) return false

    const blocker = this.pickBlocker(defenderOwner)
    if (blocker && blocker.uniqueInstanceId !== state.defenderId) {
      engine.declareBlocker(blocker.uniqueInstanceId)
      return true
    }

    const counter = this.pickCounterCard(defenderOwner)
    if (counter) {
      if (Number(counter.counterPower || 0) > 0) {
        return engine.applyCounterFromHand(counter.uniqueInstanceId)
      }
      return engine.activateCounterFromHand(counter.uniqueInstanceId)
    }

    return engine.resolveCombat()
  }

  runTurn(engine) {
    if (!engine || !this.isBotTurn(engine)) return false

    const state = engine.gameState
    const player = state.getCurrentPlayer()
    const opponent = state.getOpponentPlayer()

    if (state.isGameEnded) return false

    if (state.isInCombat) return this.resolveCombat(engine)
    if (this.resolveBotChoice(engine) || this.resolveBotTarget(engine)) return true

    const bestCard = this.pickBestCardToPlay(player)
    if (state.currentPhase === 'main' && bestCard) {
      const played = engine.playCardFromHand(bestCard.uniqueInstanceId || bestCard.id)
      if (played) {
        return true
      }
    }

    if (state.currentPhase === 'attack' && !state.isInCombat) {
      const attack = this.pickBestAttack(player, opponent)
      if (attack && attack.attacker && attack.defender) {
        const result = engine.declareAttack(attack.attacker.uniqueInstanceId || attack.attacker.id, attack.defender.uniqueInstanceId || attack.defender.id)
        if (result) {
          return true
        }
      }
    }

    const canAdvance = engine.nextPhase()
    if (canAdvance !== false) return true

    return false
  }
}
