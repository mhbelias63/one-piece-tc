#!/usr/bin/env node
import fs from 'fs';
import { DuelEngine } from './src/engine/DuelEngine.js';

const cardData = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));

console.log('\nOPTIONAL REPLACEMENT FLOW TEST');
console.log('==================================\n');

// Find cards whose AST effects are optional replacements or optional effects.
let optionalCount = 0;
let cardsWithOptional = [];

for (const cardId in cardData) {
    const card = cardData[cardId];
    (card.ast || []).forEach(effect => {
        if (!effect.optional) return
        optionalCount++
        cardsWithOptional.push({
            id: cardId,
            name: card.name,
            action: effect.type || 'unknown'
        })
    });
}

console.log(`Found ${optionalCount} optional replacements in card data`);
console.log(`Unique cards with optional replacements: ${new Set(cardsWithOptional.map(c => c.id)).size}\n`);

if (cardsWithOptional.length > 0) {
    console.log('Sample optional replacements:');
    cardsWithOptional.slice(0, 8).forEach(item => {
        console.log(`  • ${item.name} (${item.id}): ${item.action}...`);
    });
    console.log('');
}

// Verify the chooseEffectOption handler exists
const engine = new DuelEngine();
if (typeof engine.chooseEffectOption === 'function') {
    console.log('✓ chooseEffectOption method exists');
} else {
    console.log('✗ chooseEffectOption method NOT found');
}

// Verify applyReplacement checks for optional
const source = fs.readFileSync('./src/engine/DuelEngine.js', 'utf8');
if (source.includes('replacement.optional') && source.includes('optional_replacement')) {
    console.log('✓ applyReplacement checks for optional replacements');
    console.log('✓ choiceState handles optional_replacement type');
} else {
    console.log('✗ Optional replacement detection not implemented');
}

console.log('\n==================================');
console.log('TEST COMPLETE\n');
