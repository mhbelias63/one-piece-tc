import cardEffects from './card_effects.json';

// 1. Types de base pour le duel
interface Card {
  instanceId: string;
  code: string;
  power: number;
  cost: number;
}

interface PlayerState {
  id: string;
  board: Card[];
  trash: Card[];
  hand: Card[];
}

interface GameState {
  activePlayer: PlayerState;
  opponent: PlayerState;
}

// 2. Interprète basique pour le test
function executeOnPlayEffect(playedCard: Card, state: GameState) {
  // Récupération de l'AST dans le JSON
  const ast = (cardEffects as Record<string, any>)[playedCard.code];

  if (!ast || !ast.effects) {
    console.log(`[INFO] Aucun effet trouvé pour la carte ${playedCard.code}`);
    return;
  }

  console.log(`\n--- Résolution de l'effet "On Play" pour ${playedCard.code} (Statut AST : ${ast.source}) ---`);

  for (const effect of ast.effects) {
    if (effect.proc === 'onPlay') {
      for (const action of effect.actions) {
        switch (action.type) {
          case 'boost_power':
            playedCard.power += action.value ?? 0;
            console.log(`[ACTION] Power augmentée de +${action.value}. Nouvelle puissance : ${playedCard.power}`);
            break;

          case 'knockout':
            const maxCost = action.target?.maxCost ?? 99;
            // Recherche d'une cible adverse valide
            const targetIdx = state.opponent.board.findIndex(c => c.cost <= maxCost);

            if (targetIdx !== -1) {
              const [koCard] = state.opponent.board.splice(targetIdx, 1);
              state.opponent.trash.push(koCard);
              console.log(`[ACTION] Carte adverse ${koCard.code} (Coût : ${koCard.cost}) envoyée au K.O. !`);
            } else {
              console.log(`[ACTION] Aucune cible valide trouvée avec un coût <= ${maxCost}`);
            }
            break;

          default:
            console.log(`[ACTION non gérée] Type : ${action.type}`);
        }
      }
    }
  }
}

// 3. Scénario de test
function runTest() {
  // Initialisation du plateau
  const state: GameState = {
    activePlayer: {
      id: 'Joueur_1',
      hand: [{ instanceId: 'card_p1_1', code: 'OP02-093', power: 5000, cost: 4 }],
      board: [],
      trash: []
    },
    opponent: {
      id: 'Joueur_2',
      hand: [],
      board: [{ instanceId: 'card_p2_1', code: 'OP02-003', power: 3000, cost: 2 }],
      trash: []
    }
  };

  console.log('=== ÉTAT INITIAL ===');
  console.log('Plateau adverse :', state.opponent.board.map(c => `${c.code} (Coût : ${c.cost})`));

  // Jouer la carte de la main vers le terrain
  const playedCard = state.activePlayer.hand.pop()!;
  state.activePlayer.board.push(playedCard);
  console.log(`\nJoueur 1 pose ${playedCard.code} sur le terrain.`);

  // Déclenchement de l'effet
  executeOnPlayEffect(playedCard, state);

  console.log('\n=== ÉTAT FINAL ===');
  console.log('Terrain Joueur 1 :', state.activePlayer.board.map(c => `${c.code} (Power : ${c.power})`));
  console.log('Terrain Adverse  :', state.opponent.board.map(c => `${c.code}`));
  console.log('Cimetière Adverse :', state.opponent.trash.map(c => `${c.code}`));
}

runTest();