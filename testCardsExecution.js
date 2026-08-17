import fs from 'fs';
import { Card, CardZone, CardState, DuelEngine } from './src/engine/DuelEngine.js';

const canonical = JSON.parse(fs.readFileSync('./canonical_cards.json', 'utf8'));
const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));

function makeCard(id) {
    const base = canonical.find(card => card.baseCode === id) || { baseCode: id, name: id, type: 'Character' };
    const effectData = effects[id] || {};
    return new Card({
        ...base,
        id,
        effect: effectData.effect || base.effect || '',
        effects: effectData.ast || []
    });
}

function addCards(player, zone, count, prefix) {
    for (let index = 0; index < count; index++) {
        player.addCardToZone(new Card({ id: `${prefix}-${index}`, name: `${prefix}-${index}`, type: 'Character', power: 3000 }), zone);
    }
}

const engine = new DuelEngine();
const player = engine.gameState.players[0];
const opponent = engine.gameState.players[1];

// OP15-056 must affect the named Lucy Leader, not the Event card itself.
const lucy = new Card({ id: 'lucy-leader', name: 'Lucy', type: 'Leader', power: 5000 });
player.addCardToZone(lucy, CardZone.LEADER);
const lucyEvent = makeCard('OP15-056');
engine.triggerActV3Actions(lucyEvent, 'main', player);
if (!engine.hasKeyword(lucy, 'double attack')) throw new Error('OP15-056 did not target the Lucy Leader');
if (lucy.getCurrentPower() !== 8000) throw new Error('OP15-056 did not give Lucy +3000 power');
if (engine.hasKeyword(lucyEvent, 'double attack')) throw new Error('OP15-056 incorrectly buffed the Event source');

// OP15-056: Draw 2 and gain temporary Double Attack.
const event = makeCard('OP15-056');
addCards(player, CardZone.DECK, 3, 'draw-target');
engine.triggerActV3Actions(event, 'main', player);
if (player.zones[CardZone.HAND].length !== 2) throw new Error('OP15-056 did not draw 2 cards');

// OP14-064: Add 1 rested DON and K.O. an opponent Character with 0 power.
const koSource = makeCard('OP14-064');
const zeroPower = new Card({ id: 'zero-power', name: 'Zero Power', type: 'Character', power: 0 });
player.addCardToZone(koSource, CardZone.DEPLOY);
player.addCardToZone(new Card({ id: 'don-test', name: 'DON!!', type: 'don' }), CardZone.DON_COST);
opponent.addCardToZone(zeroPower, CardZone.DEPLOY);
engine.triggerActV3Actions(koSource, 'onKO', player);
if (player.zones[CardZone.DON_RESTED].length !== 1) throw new Error('OP14-064 did not add rested DON');
if (!opponent.zones[CardZone.TRASH].includes(zeroPower)) throw new Error('OP14-064 did not K.O. the zero-power Character');

// Direct compiled BuffPower: a temporary +2000 must affect current power and expire.
const powerCard = new Card({ id: 'power-test', name: 'Power Test', type: 'Character', power: 4000 });
player.addCardToZone(powerCard, CardZone.DEPLOY);
engine.executeCompiledAction({ kind: 'BuffPower', target: { reference: 'self' }, value: 2000, duration: 'turn' }, powerCard, player, { previous: null, selected: [], revealed: [] });
if (powerCard.getCurrentPower() !== 6000) throw new Error('BuffPower did not update current power');
engine.executeCompiledAction({ kind: 'GainKeyword', keyword: 'double attack', duration: 'turn' }, powerCard, player, { previous: null, selected: [], revealed: [] });
if (!engine.hasKeyword(powerCard, 'double attack')) throw new Error('Temporary Double Attack was not applied');
player.resetTurnState(3);
if (powerCard.getCurrentPower() !== 4000) throw new Error('BuffPower did not expire at turn reset');
if (engine.hasKeyword(powerCard, 'double attack')) throw new Error('Temporary Double Attack did not expire');

// OP08-045: replace removal with trashing this Character and drawing 1.
const replacementEngine = new DuelEngine();
const replacementPlayer = replacementEngine.gameState.players[0];
const replacementCard = makeCard('OP08-045');
replacementPlayer.addCardToZone(replacementCard, CardZone.DEPLOY);
replacementPlayer.addCardToZone(new Card({ id: 'replacement-draw', name: 'Draw Target', type: 'Character' }), CardZone.DECK);
replacementEngine.registerPassiveEffects(replacementCard, replacementPlayer);
if (replacementEngine.knockOutCard(replacementCard, 'effect')) throw new Error('OP08-045 replacement did not intercept the K.O.');
if (!replacementPlayer.zones[CardZone.TRASH].includes(replacementCard)) throw new Error('OP08-045 did not trash itself');
if (replacementPlayer.zones[CardZone.HAND].length !== 1) throw new Error('OP08-045 did not draw 1 card');

// OP15-009: a team replacement may protect another Character with base power <= 7000.
const teamEngine = new DuelEngine();
const teamPlayer = teamEngine.gameState.players[0];
const koby = makeCard('OP15-009');
const teamLeader = new Card({ id: 'team-leader', name: 'Team Leader', type: 'Leader', power: 5000 });
const protectedCharacter = new Card({ id: 'protected-character', name: 'Protected', type: 'Character', power: 6000 });
teamPlayer.addCardToZone(teamLeader, CardZone.LEADER);
teamPlayer.addCardToZone(koby, CardZone.DEPLOY);
teamPlayer.addCardToZone(protectedCharacter, CardZone.DEPLOY);
teamPlayer.addCardToZone(new Card({ id: 'team-draw', name: 'Team Draw', type: 'Character' }), CardZone.DECK);
teamEngine.registerPassiveEffects(koby, teamPlayer);
if (teamEngine.knockOutCard(protectedCharacter, 'effect')) throw new Error('OP15-009 team replacement did not intercept the K.O.');
if (protectedCharacter.getCurrentPower() !== 6000) throw new Error('OP15-009 unexpectedly removed the protected Character');
if (teamLeader.getCurrentPower() !== 3000) throw new Error('OP15-009 did not give the Leader -2000 power');

// Passive DON!! condition: ST01-004 gains Rush only with 2 attached DON.
const passiveEngine = new DuelEngine();
const passivePlayer = passiveEngine.gameState.players[0];
const passiveSanji = new Card({ id: 'ST01-004', name: 'Sanji', type: 'Character', power: 3000, effects: [{ proc: 'passive', donReq: 2, type: 'gain_keyword', keyword: 'rush', duration: 'permanent' }] });
passivePlayer.addCardToZone(passiveSanji, CardZone.DEPLOY);
passiveSanji.attachedDon = [new Card({ id: 'pd1', name: 'DON!!', type: 'don' }), new Card({ id: 'pd2', name: 'DON!!', type: 'don' })];
passiveEngine.applyPassiveEffects(passivePlayer);
if (!passiveEngine.hasKeyword(passiveSanji, 'rush')) throw new Error('ST01-004 passive Rush did not activate with 2 DON');
passiveSanji.attachedDon = [];
passiveEngine.applyPassiveEffects(passivePlayer);
if (passiveEngine.hasKeyword(passiveSanji, 'rush')) throw new Error('ST01-004 passive Rush did not deactivate after losing DON');

// Group passive: OP04-118 grants Rush to eligible red characters, excluding its source.
const groupEngine = new DuelEngine();
const groupPlayer = groupEngine.gameState.players[0];
const groupSource = new Card({ id: 'OP04-118', name: 'Vivi', type: 'Character', power: 4000, cost: 4, color: 'red', effects: [{ proc: 'passive', type: 'gain_keyword', target: { targetType: 'all_characters', color: 'red', minCost: 3 }, keyword: 'rush' }] });
const groupTarget = new Card({ id: 'group-target', name: 'Red Character', type: 'Character', power: 3000, cost: 3, color: 'red' });
groupPlayer.addCardToZone(groupSource, CardZone.DEPLOY);
groupPlayer.addCardToZone(groupTarget, CardZone.DEPLOY);
groupEngine.applyPassiveEffects(groupPlayer);
if (!groupEngine.hasKeyword(groupTarget, 'rush')) throw new Error('OP04-118 group passive did not grant Rush');

// Passive attack permission: Whitey Bay can attack an active Character with 1 DON.
const activeTargetEngine = new DuelEngine();
const activeTargetPlayer = activeTargetEngine.gameState.players[0];
const activeTargetOpponent = activeTargetEngine.gameState.players[1];
const activeLeader = new Card({ id: 'active-leader', name: 'Leader', type: 'Leader', power: 5000 });
const whiteyBay = new Card({ id: 'OP02-014', name: 'Whitey Bay', type: 'Character', power: 3000, effects: [{ proc: 'passive', donReq: 1, type: 'can_attack_active', target: 'self', duration: 'permanent' }] });
const activeCharacter = new Card({ id: 'active-target', name: 'Active Target', type: 'Character', power: 1000 });
activeTargetPlayer.addCardToZone(activeLeader, CardZone.LEADER);
activeTargetPlayer.addCardToZone(whiteyBay, CardZone.DEPLOY);
activeTargetOpponent.addCardToZone(new Card({ id: 'opp-leader', name: 'Opponent Leader', type: 'Leader', power: 5000 }), CardZone.LEADER);
activeTargetOpponent.addCardToZone(activeCharacter, CardZone.DEPLOY);
whiteyBay.attachedDon = [new Card({ id: 'wb-don', name: 'DON!!', type: 'don' })];
activeTargetEngine.applyPassiveEffects(activeTargetPlayer);
activeTargetEngine.gameState.startCombat(whiteyBay, activeCharacter);
if (!activeTargetEngine.declareAttack(whiteyBay.id, activeCharacter.id)) throw new Error('Whitey Bay could not attack an active Character');

// Passive protection: Vergo cannot be K.O.'d in battle while its DON condition is met.
const protectionEngine = new DuelEngine();
const protectionPlayer = protectionEngine.gameState.players[0];
const protectedVergo = new Card({ id: 'OP03-079', name: 'Vergo', type: 'Character', power: 4000, effects: [{ proc: 'passive', donReq: 1, type: 'protection', target: 'This Character', kind: 'ko', by: 'in battle', duration: 'permanent' }] });
protectedVergo.attachedDon = [new Card({ id: 'vergo-don', name: 'DON!!', type: 'don' })];
protectionPlayer.addCardToZone(protectedVergo, CardZone.DEPLOY);
protectionEngine.applyPassiveEffects(protectionPlayer);
if (!protectionEngine.isProtected(protectedVergo, 'ko', 'battle')) throw new Error('Vergo passive protection did not apply');
protectedVergo.attachedDon = [];
protectionEngine.applyPassiveEffects(protectionPlayer);
if (protectionEngine.isProtected(protectedVergo, 'ko', 'battle')) throw new Error('Vergo passive protection did not deactivate');

// Combined activation cost: 1 active DON and the source Character are both rested.
const combinedCostEngine = new DuelEngine();
const combinedPlayer = combinedCostEngine.gameState.players[0];
const combinedCard = new Card({ id: 'OP09-095', name: 'Laffitte', type: 'Character', power: 3000, effects: [{ proc: 'main', cost: [{ type: 'rest_don_and_self', donAmount: 1 }], type: 'draw', amount: 1 }] });
combinedPlayer.addCardToZone(combinedCard, CardZone.DEPLOY);
combinedPlayer.addCardToZone(new Card({ id: 'combined-don', name: 'DON!!', type: 'don' }), CardZone.DON_ACTIVE);
combinedPlayer.addCardToZone(new Card({ id: 'combined-deck', name: 'Deck Card', type: 'Character' }), CardZone.DECK);
combinedPlayer.activeDonCount = 1;
combinedCostEngine.gameState.changePhase('main');
combinedCostEngine.activateMainEffect(combinedCard.id);
if (combinedCard.state !== 'rested' || combinedPlayer.zones[CardZone.DON_RESTED].length !== 1) throw new Error('Combined rest DON/self cost did not resolve');

// Power cost: Igaram reduces the active Leader before resolving its effect.
const powerCostEngine = new DuelEngine();
const powerCostPlayer = powerCostEngine.gameState.players[0];
const powerCostLeader = new Card({ id: 'power-leader', name: 'Leader', type: 'Leader', power: 5000 });
const powerCostSource = new Card({ id: 'OP04-002', name: 'Igaram', type: 'Character', effects: [{ proc: 'main', cost: [{ type: 'give_own_power_cost', target: 'leader', value: -5000 }], type: 'draw', amount: 1 }] });
powerCostPlayer.addCardToZone(powerCostLeader, CardZone.LEADER);
powerCostPlayer.addCardToZone(powerCostSource, CardZone.DEPLOY);
powerCostPlayer.addCardToZone(new Card({ id: 'power-deck', name: 'Deck Card', type: 'Character' }), CardZone.DECK);
powerCostEngine.triggerActV3Actions(powerCostSource, 'main', powerCostPlayer);
if (powerCostLeader.getCurrentPower() !== 0) throw new Error('give_own_power_cost did not reduce the Leader');

// Life cost: Cavendish takes the top Life card before resolving Rush.
const lifeCostEngine = new DuelEngine();
const lifeCostPlayer = lifeCostEngine.gameState.players[0];
const lifeCostCard = new Card({ id: 'OP01-008', name: 'Cavendish', type: 'Character', power: 5000, effects: [{ proc: 'onPlay', cost: [{ type: 'add_life_to_hand', amount: 1 }], type: 'gain_keyword', keyword: 'rush', duration: 'turn' }] });
const lifeCard = new Card({ id: 'life-card', name: 'Life Card', type: 'Character' });
lifeCostPlayer.addCardToZone(lifeCostCard, CardZone.DEPLOY);
lifeCostPlayer.addCardToZone(lifeCard, CardZone.LIFE);
lifeCostPlayer.lifeCount = 1;
lifeCostEngine.triggerActV3Actions(lifeCostCard, 'onPlay', lifeCostPlayer);
if (!lifeCostPlayer.zones[CardZone.HAND].includes(lifeCard) || lifeCostPlayer.lifeCount !== 0) throw new Error('Life cost did not move the Life card to hand');

// Trigger from Life is optional: the player chooses Trigger or hand.
const triggerEngine = new DuelEngine();
const triggerPlayer = triggerEngine.gameState.players[0];
const triggerCard = new Card({ id: 'trigger-card', name: 'Trigger Card', type: 'Event', effects: [{ proc: 'trigger', type: 'draw', amount: 1 }] });
triggerPlayer.addCardToZone(triggerCard, CardZone.LIFE);
triggerPlayer.lifeCount = 1;
triggerEngine.drawFromLife(triggerPlayer);
if (!triggerEngine.choiceState.active) throw new Error('Life Trigger did not open a choice');
if (!triggerEngine.chooseEffectOption(1)) throw new Error('Life Trigger hand option was not accepted');
if (!triggerPlayer.zones[CardZone.HAND].includes(triggerCard)) throw new Error('Life Trigger card was not added to hand');

console.log('REAL CARD EXECUTION TEST PASSED');
