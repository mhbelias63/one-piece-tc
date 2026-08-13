// Dimensions fixes des emplacements
export const CARD_DIMENSIONS = {
  standard: {
    width: '76px',
    height: '106px'
  },
  donRest: {
    width: '96px',
    height: '68px'
  },
  characterArea: {
    width: '610px',
    height: '110px'
  }
}

// Emplacements avec positions ancrées
export const PLAYMAT_SLOTS = {
  // JOUEUR DU BAS (P1)
  playerBottom: {
    // Ancrage depuis la droite pour Trash/Deck pour garder un gap fixe
    trash: { right: '30px', bottom: '38.69%' },
    deck: { right: '120px', bottom: '38.69%' }, // 90px de décalage fixe = gap toujours identique

    // Ancrage depuis la gauche pour Stage/Life/Don
    stage: { left: '30px', bottom: '42%' },
    life: { left: '30px', bottom: '7.83%' },
    donSet: { left: '120px', bottom: '7.62%' },
    donRest: { left: '210px', bottom: '7.62%' }, // Gap fixe de 90px

    // Ancrage central pour le plateau principal
    leader: { left: '50%', bottom: '38.69%' },
    characterArea: { left: '50%', bottom: '70%' }
  },

  // JOUEUR DU HAUT (P2)
  playerTop: {
    trash: { right: '30px', bottom: '38.69%' },
    deck: { right: '120px', bottom: '38.69%' },

    stage: { left: '30px', bottom: '42%' },
    life: { left: '30px', bottom: '7.83%' },
    donSet: { left: '120px', bottom: '7.62%' },
    donRest: { left: '210px', bottom: '10.62%' },

    leader: { left: '50%', bottom: '38.69%' },
    characterArea: { left: '50%', bottom: '70%' }
  }
}