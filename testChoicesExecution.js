import fs from 'fs';
import { Card, CardZone, DuelEngine } from './src/engine/DuelEngine.js';
import { compileEffectAst } from './src/engine/effectCompiler.js';

const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));
const failures = [];
let choiceCards = 0;
let choicesTested = 0;

function filler(id, type = 'Character') {
    return new Card({ id, name: id, type, power: 5000, cost: 3 });
}

function walk(node, visit) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
        node.forEach(child => walk(child, visit));
        return;
    }
    visit(node);
    Object.values(node).forEach(value => walk(value, visit));
}

for (const [cardId, cardData] of Object.entries(effects)) {
    const choiceNodes = [];
    walk(cardData.ast, node => {
        if ((node.type === 'choice' || node.type === 'choose_one') && Array.isArray(node.options)) choiceNodes.push(node);
    });
    if (choiceNodes.length === 0) continue;
    choiceCards++;

    for (const choiceNode of choiceNodes) {
        for (let optionIndex = 0; optionIndex < choiceNode.options.length; optionIndex++) {
            const engine = new DuelEngine();
            const player = engine.gameState.players[0];
            const source = new Card({ id: cardId, name: cardData.name, type: 'Character', power: 5000, effects: cardData.ast, effect: cardData.effect || '' });
            player.addCardToZone(source, CardZone.DEPLOY);
            player.addCardToZone(filler(`${cardId}-leader`, 'Leader'), CardZone.LEADER);
            player.addCardToZone(filler(`${cardId}-opponent`), CardZone.DEPLOY);
            for (let index = 0; index < 8; index++) {
                player.addCardToZone(filler(`${cardId}-deck-${index}`), CardZone.DECK);
                player.addCardToZone(filler(`${cardId}-hand-${index}`), CardZone.HAND);
            }
            for (let index = 0; index < 10; index++) player.addCardToZone(filler(`${cardId}-don-${index}`, 'don'), CardZone.DON_COST);

            try {
                const compiled = compileEffectAst({ proc: 'main', type: 'choice', options: choiceNode.options });
                engine.executeCompiledEffect(compiled, source, player);
                if (!engine.choiceState.active) throw new Error('choice did not become active');
                if (!engine.chooseEffectOption(optionIndex)) throw new Error(`option ${optionIndex} was not accepted`);
                choicesTested++;
            } catch (error) {
                failures.push({ cardId, optionIndex, message: error.message });
            }
        }
    }
}

console.log('CHOICE EXECUTION TEST');
console.log('======================');
console.log(`Cards with choices: ${choiceCards}`);
console.log(`Options tested:     ${choicesTested}`);
console.log(`Failures:           ${failures.length}`);
failures.slice(0, 50).forEach(failure => console.log(JSON.stringify(failure)));

if (failures.length > 0) process.exitCode = 1;
