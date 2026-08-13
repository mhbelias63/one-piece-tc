// src/engine/AbilityHelpers.js

export const Abilities = {
  // 1. Piocher X cartes (ex: Nami, effets On Play / Trigger)
  draw: (amount = 1) => (engine, player) => {
    for (let i = 0; i < amount; i++) {
      engine.drawFromDeck(player)
    }
  },

  // 2. Booster le Power d'une carte (ex: Event Counter / Effet On Attack)
  boostPower: (targetCard, amount, duration = 'turn') => (engine) => {
    if (!targetCard) return
    targetCard.tempCounterPower = (targetCard.tempCounterPower || 0) + amount
    engine.gameState.logAction(`⚡ ${targetCard.name} gagne +${amount} Power (${duration}).`)
  },

  // 3. Trigger : Jouer la carte gratuitement depuis la Vie (ex: Usopp, Chopper)
  triggerPlayCard: () => (engine, player, triggerCard) => {
    if (!triggerCard) return
    
    // Si c'est un Personnage et que la zone n'est pas pleine
    if (triggerCard.type?.toLowerCase() === 'character') {
      if (player.canDeployCharacter()) {
        player.addCardToZone(triggerCard, 'deploy')
        engine.gameState.logAction(`⚡ [TRIGGER] ${triggerCard.name} est joué directement sur le terrain !`)
      } else {
        player.addCardToZone(triggerCard, 'trash')
        engine.gameState.logAction(`⚡ [TRIGGER] Zone pleine : ${triggerCard.name} va en Défausse.`)
      }
    }
  }
}