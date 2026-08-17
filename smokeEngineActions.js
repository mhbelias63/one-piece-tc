import { Card, CardZone, CardState, DuelEngine } from './src/engine/DuelEngine.js';

const engine = new DuelEngine();
const player = engine.gameState.players[0];
const opponent = engine.gameState.players[1];
const source = new Card({ id: 'TEST-001', name: 'Source', type: 'Character', power: 5000 });
const character = new Card({ id: 'TEST-002', name: 'Target', type: 'Character', power: 4000 });
const opponentDon = { state: CardState.RESTED, frozenUntilTurn: 0 };

player.addCardToZone(source, CardZone.DEPLOY);
player.addCardToZone(character, CardZone.DEPLOY);
character.state = CardState.RESTED;
opponent.zones[CardZone.DON_RESTED].push(opponentDon);

const context = { previous: null, selected: [], revealed: [] };
engine.executeCompiledAction({ kind: 'SetActiveAll' }, source, player, context);
if (character.state !== CardState.ACTIVE) throw new Error('SetActiveAll did not activate the character');

engine.executeCompiledAction({ kind: 'TreatNameAs', value: 'Alternate Name' }, source, player, context);
if (!source.alternateNames?.includes('Alternate Name')) throw new Error('TreatNameAs did not update alternate names');

engine.executeCompiledAction({ kind: 'SetBasePowerAll', value: 7000 }, source, player, context);
if (character.tempBasePowerOverride !== 7000) throw new Error('SetBasePowerAll did not update power');

engine.executeCompiledAction({ kind: 'GainKeyword', keyword: 'double attack' }, source, player, context);
if (!engine.hasKeyword(source, 'double attack')) throw new Error('GainKeyword did not add Double Attack');

engine.executeCompiledAction({ kind: 'GainKeyword', keyword: 'unblockable' }, source, player, context);
if (!engine.hasKeyword(source, 'unblockable')) throw new Error('GainKeyword did not add Unblockable');

engine.executeCompiledAction({ kind: 'GainKeyword', keyword: 'rush', duration: 'turn' }, source, player, context);
if (!engine.hasKeyword(source, 'rush')) throw new Error('Temporary Rush was not applied');
player.resetTurnState(2);
if (engine.hasKeyword(source, 'rush')) throw new Error('Temporary Rush did not expire');

engine.executeCompiledAction({ kind: 'FreezeDon', amount: 1 }, source, player, context);
if (opponentDon.frozenUntilTurn !== 2) throw new Error('FreezeDon did not freeze the DON');

console.log('ENGINE SMOKE TEST PASSED');
