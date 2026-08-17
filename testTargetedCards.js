import fs from 'fs';
import { Card, CardZone, DuelEngine } from './src/engine/DuelEngine.js';
import { compileEffectAst } from './src/engine/effectCompiler.js';

const canonical = JSON.parse(fs.readFileSync('./canonical_cards.json', 'utf8'));
const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));

function makeCard(id, overrides = {}) {
    const base = canonical.find(card => card.baseCode === id) || { baseCode: id, name: id, type: 'Character' };
    return new Card({ ...base, ...overrides, id, effect: effects[id]?.effect || base.effect || '', effects: effects[id]?.ast || [] });
}

function run(id, proc, source, leader, extra) {
    const engine = new DuelEngine();
    const player = engine.gameState.players[0];
    player.addCardToZone(leader, CardZone.LEADER);
    player.addCardToZone(source, CardZone.DEPLOY);
    if (extra) player.addCardToZone(extra, CardZone.DEPLOY);
    engine.triggerActV3Actions(source, proc, player);
    return { engine, player };
}

const op03Leader = makeCard('leader-ace', { name: 'Portgas.D.Ace', type: 'Leader', power: 5000 });
const op03 = makeCard('OP03-016');
const op03Result = run('OP03-016', 'main', op03, op03Leader);
if (!op03Result.engine.hasKeyword(op03Leader, 'double attack') || op03Leader.getCurrentPower() !== 8000) throw new Error('OP03-016 did not target the Leader');
if (op03Result.engine.hasKeyword(op03, 'double attack')) throw new Error('OP03-016 incorrectly targeted the source');

const op16Leader = makeCard('leader-whitebeard', { name: 'Edward.Newgate', type: 'Leader', power: 5000 });
const op16 = makeCard('OP16-003');
const op16Result = run('OP16-003', 'yourTurn', op16, op16Leader);
if (!op16Result.engine.hasKeyword(op16Leader, 'double attack') || op16Leader.getCurrentPower() !== 7000) throw new Error('OP16-003 did not target the Leader');

const buggyLeader = makeCard('leader-buggy', { name: 'Buggy', type: 'Leader', power: 5000 });
const buggy = makeCard('EB02-018');
const buggyResult = run('EB02-018', 'onPlay', buggy, buggyLeader);
if (!buggyResult.engine.hasKeyword(buggyLeader, 'double attack')) throw new Error('EB02-018 did not target the Leader');

const wanoLeader = makeCard('leader-wano', { name: 'Wano', type: 'Leader', power: 5000 });
const wanoCharacter = makeCard('wano-character', { name: 'Wano Character', type: 'Character', cardType: 'Land of Wano', power: 5000 });
const gun = makeCard('OP04-115');
const gunResult = run('OP04-115', 'main', gun, wanoLeader, wanoCharacter);
if (!gunResult.engine.hasKeyword(wanoCharacter, 'double attack')) throw new Error('OP04-115 did not target the Land of Wano Character');

const dressrosaLeader = makeCard('leader-dressrosa', { name: 'Dressrosa Leader', type: 'Leader', power: 5000 });
const dressrosaCharacter = makeCard('dressrosa-character', { name: 'Dressrosa Character', type: 'Character', cardType: 'Dressrosa', power: 4000 });
const kingKongGun = makeCard('OP04-093');
const gunEngine = new DuelEngine();
const gunPlayer = gunEngine.gameState.players[0];
gunPlayer.addCardToZone(dressrosaLeader, CardZone.LEADER);
gunPlayer.addCardToZone(dressrosaCharacter, CardZone.DEPLOY);
gunPlayer.zones[CardZone.TRASH].push(...Array.from({ length: 15 }, (_, index) => new Card({ id: `trash-${index}`, name: `Trash ${index}` })));
const compiledGun = compileEffectAst(effects['OP04-093'].ast[0]);
gunEngine.executeCompiledEffect(compiledGun, kingKongGun, gunPlayer);
if (dressrosaCharacter.getCurrentPower() !== 10000) throw new Error('OP04-093 did not target Dressrosa Character');
if (!gunEngine.hasKeyword(dressrosaCharacter, 'double attack')) throw new Error('OP04-093 did not target the previously selected card');

const jinbeEngine = new DuelEngine();
const jinbePlayer = jinbeEngine.gameState.players[0];
const jinbeLeader = makeCard('leader-jinbe', { name: 'ST01 Leader', type: 'Leader', power: 5000 });
const jinbe = makeCard('ST01-005', { power: 5000 });
const jinbeOther = makeCard('jinbe-other', { name: 'Other Character', type: 'Character', power: 3000 });
jinbePlayer.addCardToZone(jinbeLeader, CardZone.LEADER);
jinbePlayer.addCardToZone(jinbe, CardZone.DEPLOY);
jinbePlayer.addCardToZone(jinbeOther, CardZone.DEPLOY);
jinbe.attachedDon = [new Card({ id: 'jinbe-don', name: 'DON!!', type: 'don' })];
jinbeEngine.triggerActV3Actions(jinbe, 'onAttack', jinbePlayer);
if (!jinbeEngine.targetingState.active) throw new Error('ST01-005 did not open target selection');
if (jinbeEngine.targetingState.validTargets.includes(jinbe)) throw new Error('ST01-005 incorrectly allowed targeting itself');
jinbeEngine.selectTarget(jinbeOther);
if (jinbeOther.getCurrentPower() !== 4000) throw new Error('ST01-005 did not buff the selected character');
if (jinbe.getCurrentPower() !== 6000) throw new Error('ST01-005 changed Jinbe power unexpectedly');
jinbeEngine.clearCombatTempModifiers();
if (jinbeOther.getCurrentPower() !== 4000) throw new Error('ST01-005 turn bonus was cleared at combat end');
jinbePlayer.resetTurnState(2);
if (jinbeOther.getCurrentPower() !== 3000) throw new Error('ST01-005 turn bonus did not expire at turn end');

const sunnyEngine = new DuelEngine();
const sunnyPlayer = sunnyEngine.gameState.players[0];
const sunny = makeCard('ST01-017');
const sunnyLeader = makeCard('sunny-leader', { name: 'Luffy', type: 'Leader', cardType: 'Straw Hat Crew', power: 5000 });
const sunnyCharacter = makeCard('sunny-character', { name: 'Crew', type: 'Character', power: 3000 });
sunnyPlayer.addCardToZone(sunnyLeader, CardZone.LEADER);
sunnyPlayer.addCardToZone(sunny, CardZone.STAGE);
sunnyPlayer.addCardToZone(sunnyCharacter, CardZone.DEPLOY);
sunnyEngine.gameState.changePhase('main');
if (!sunnyEngine.activateMainEffect(sunny.id)) throw new Error('ST01-017 did not activate');
sunnyEngine.selectTarget(sunnyCharacter);
if (sunnyEngine.activateMainEffect(sunny.id)) throw new Error('ST01-017 activated twice while rested');

console.log('TARGETED CARD TEST PASSED');
