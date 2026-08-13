// src/engine/CardAbilities.js
import { Abilities } from './AbilityHelpers'

export const CARD_ABILITIES = {
  // USOAPP (ST01-002) - Trigger: Jouer la carte
  'ST01-002': {
    trigger: Abilities.triggerPlayCard()
  },

  // MONKEY D. LUFFY (ST01-001) - Exemple d'effet
  'ST01-001': {
    onAttack: (engine, card) => {
      if (card.attachedDon.length >= 1) {
        engine.gameState.logAction(`📜 [On Attack] Luffy : Donne un bonus d'attaque !`)
      }
    }
  }
}