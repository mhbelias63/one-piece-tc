import { SimpleDuelBot } from './duelBot.js'

export class TrainingBotController {
  constructor() {
    this.enabled = false
    this.humanPlayerId = 0
    this.bot = null
    this.timer = null
    this.store = null
  }

  configure({ enabled = false, humanPlayerId = 0 } = {}) {
    this.enabled = Boolean(enabled)
    this.humanPlayerId = Number(humanPlayerId) === 1 ? 1 : 0
    const botPlayerId = this.humanPlayerId === 0 ? 1 : 0
    this.bot = new SimpleDuelBot({ playerId: botPlayerId, difficulty: 'normal' })
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  isBotChoicePending(engine) {
    return engine?.choiceState?.active && engine.choiceState.player?.id === this.bot?.playerId
  }

  isBotCombatResponsePending(engine) {
    if (!engine?.gameState?.isInCombat) return false
    const defender = engine.findCard(engine.gameState.defenderId)
    return engine.findCardOwner(defender)?.id === this.bot?.playerId
  }

  schedule(store) {
    this.store = store
    this.clearTimer()

    if (!this.enabled || !store?.getEngine || !store.isGameActive) {
      return
    }

    const engine = store.getEngine()
    if (!engine?.gameState) return

    const botPlayerId = this.humanPlayerId === 0 ? 1 : 0
    const currentPlayerId = engine.gameState.currentPlayerTurnId
    const botOwnsAction = engine.gameState.isInCombat
      ? this.isBotCombatResponsePending(engine)
      : currentPlayerId === botPlayerId
        || this.isBotChoicePending(engine)
        || engine.targetingState?.sourceCard
          && engine.findCardOwner(engine.targetingState.sourceCard)?.id === botPlayerId

    if (!botOwnsAction || engine.gameState.isGameEnded) {
      return
    }

    this.timer = setTimeout(() => {
      const activeEngine = store.getEngine?.()
      if (!activeEngine || activeEngine.gameState.isGameEnded) return
      const botTurn = this.bot.runTurn(activeEngine)
      this.schedule(store)
    }, 700)
  }
}
