import fs from 'fs';
import { Card, CardZone, DuelEngine } from './src/engine/DuelEngine.js';
import { compileEffectAst } from './src/engine/effectCompiler.js';

const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));
const failures = [];
let cardsTested = 0;
let effectsTested = 0;
let actionsTested = 0;
let pendingChoices = 0;

function filler(id, type = 'Character', power = 5000, cost = 3) {
    return new Card({ id, name: id, type, power, cost, effect: '' });
}

for (const [cardId, cardData] of Object.entries(effects)) {
    if (!Array.isArray(cardData.ast) || cardData.ast.length === 0) continue;
    cardsTested++;

    const engine = new DuelEngine();
    const player = engine.gameState.players[0];
    const opponent = engine.gameState.players[1];
    const source = new Card({
        id: cardId,
        name: cardData.name,
        type: cardData.type || 'Character',
        power: cardData.power || 5000,
        cost: cardData.cost || 3,
        effect: cardData.effect || '',
        effects: cardData.ast
    });

    player.addCardToZone(source, CardZone.DEPLOY);
    player.addCardToZone(filler(`${cardId}-leader`, 'Leader', 5000, 0), CardZone.LEADER);
    opponent.addCardToZone(filler(`${cardId}-opponent`, 'Character', 3000, 2), CardZone.DEPLOY);
    for (let index = 0; index < 8; index++) {
        player.addCardToZone(filler(`${cardId}-deck-${index}`), CardZone.DECK);
        player.addCardToZone(filler(`${cardId}-hand-${index}`), CardZone.HAND);
        player.addCardToZone(filler(`${cardId}-life-${index}`), CardZone.LIFE);
        opponent.addCardToZone(filler(`${cardId}-opp-deck-${index}`), CardZone.DECK);
        opponent.addCardToZone(filler(`${cardId}-opp-hand-${index}`), CardZone.HAND);
        opponent.addCardToZone(filler(`${cardId}-opp-life-${index}`), CardZone.LIFE);
    }
    player.lifeCount = player.zones[CardZone.LIFE].length;
    opponent.lifeCount = opponent.zones[CardZone.LIFE].length;
    for (let index = 0; index < 10; index++) {
        const don = filler(`${cardId}-don-${index}`, 'don', 0, 0);
        player.addCardToZone(don, CardZone.DON_COST);
    }

    for (let effectIndex = 0; effectIndex < cardData.ast.length; effectIndex++) {
        const ast = cardData.ast[effectIndex];
        if (!ast || ['explanation', 'metadata', 'unlimited_copies'].includes(ast.type)) continue;
        const compiled = compileEffectAst(ast);
        if (!compiled) continue;
        effectsTested++;
        actionsTested += compiled.actions?.length || 0;
        const context = { previous: null, selected: [], revealed: [] };
        try {
            engine.executeCompiledEffect(compiled, source, player);
            if (engine.choiceState.active) pendingChoices++;
        } catch (error) {
            failures.push({ cardId, effectIndex, type: ast.type, message: error.message });
        }
    }
}

console.log('ALL CARDS EXECUTION TEST');
console.log('=========================');
console.log(`Cards with AST tested: ${cardsTested}`);
console.log(`AST effects tested:    ${effectsTested}`);
console.log(`Actions executed:      ${actionsTested}`);
console.log(`Pending choices:       ${pendingChoices}`);
console.log(`Runtime failures:      ${failures.length}`);
failures.slice(0, 50).forEach(failure => console.log(JSON.stringify(failure)));

if (failures.length > 0) process.exitCode = 1;
