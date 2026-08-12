// Configuration des coordonnées et dimensions des zones du plateau (%)
// Calculé d'après les dimensions exactes Photopea (1600x935 px)
export const PLAYMAT_SLOTS = {
  // JOUEUR DU BAS (P1 - JOUEUR PRINCIPAL)
  playerBottom: {
    // 1. TRASH
    trash: {
      left: '89.25%',
      bottom: '38.69%',
      width: '9.13%',
      height: '21.94%'
    },

    // 2. DECK
    deck: {
      left: '78.75%',
      bottom: '38.69%',
      width: '9.13%',
      height: '21.94%'
    },

    // 3. DON REST
    donRest: {
      left: '23.44%',
      bottom: '7.62%',
      width: '11.05%',
      height: '13.46%'
    },

    // 4. DON ACTIVE / SET
    donSet: {
      left: '14.88%',
      bottom: '7.62%',
      width: '7.86%',
      height: '18.90%'
    },

    // 5. LEADER
    leader: {
      left: '45.38%',
      bottom: '38.69%',
      width: '9.13%',
      height: '21.94%'
    },

    // 6. STAGE
    stage: {
      left: '2.93%',
      bottom: '38.69%',
      width: '9.13%',
      height: '21.94%'
    },

    // 7. CHARACTER AREA (Mise à jour d'après tes nouvelles mesures)
    characterArea: {
      left: '13.19%',
      bottom: '73.80%',
      width: '73.63%',
      height: '22.89%'
    },

    // 8. LIFE
    life: {
      left: '2.88%',
      bottom: '7.83%',
      width: '9.13%',
      height: '21.94%'
    }
  },

  // JOUEUR DU HAUT (P2 - ADVERSAIRE)
  playerTop: {
    trash: {
      left: '89.25%',
      bottom: '38.69%',
      width: '9.13%',
      height: '21.94%'
    },
    deck: {
      left: '78.75%',
      bottom: '38.69%',
      width: '9.13%',
      height: '21.94%'
    },
    donRest: {
      left: '23.44%',
      bottom: '7.62%',
      width: '11.05%',
      height: '13.46%'
    },
    donSet: {
      left: '14.88%',
      bottom: '7.62%',
      width: '7.86%',
      height: '18.90%'
    },
    leader: {
      left: '45.38%',
      bottom: '38.69%',
      width: '9.13%',
      height: '21.94%'
    },
    stage: {
      left: '2.93%',
      bottom: '38.69%',
      width: '9.13%',
      height: '21.94%'
    },
    characterArea: {
      left: '13.19%',
      bottom: '73.80%',
      width: '73.63%',
      height: '22.89%'
    },
    life: {
      left: '2.88%',
      bottom: '7.83%',
      width: '9.13%',
      height: '21.94%'
    }
  }
}