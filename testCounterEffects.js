import { Card, CardZone, DuelEngine } from './src/engine/DuelEngine.js';

const engine = new DuelEngine();
const attacker = engine.gameState.players[0];
const defender = engine.gameState.players[1];
const attackerLeader = new Card({ id: 'attacker-leader', name: 'Attacker Leader', type: 'Leader', power: 5000 });
const defenderLeader = new Card({ id: 'defender-leader', name: 'Defender Leader', type: 'Leader', power: 5000 });
const event = new Card({
    id: 'counter-event',
    name: 'Counter Event',
    type: 'Event',
    cost: 1,
    effects: [{ proc: 'counter', type: 'boost_power', target: 'leader', value: 2000, duration: 'battle' }]
});

attacker.addCardToZone(attackerLeader, CardZone.LEADER);
defender.addCardToZone(defenderLeader, CardZone.LEADER);
defender.addCardToZone(event, CardZone.HAND);
defender.addCardToZone(new Card({ id: 'don-1', name: 'DON!!', type: 'don' }), CardZone.DON_ACTIVE);
defender.activeDonCount = 1;
engine.gameState.startCombat(attackerLeader, defenderLeader);
if (!engine.activateCounterFromHand(event.id)) throw new Error('Counter Event was not activated');
if (!defender.zones[CardZone.TRASH].includes(event)) throw new Error('Counter Event did not move to trash');
if (defenderLeader.tempPowerModifier !== 0 && defenderLeader.combatPowerModifier !== 2000) throw new Error('Counter Event did not apply its combat bonus');

console.log('COUNTER EVENT TEST PASSED');
