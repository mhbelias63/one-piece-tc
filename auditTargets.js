import fs from 'fs';

const effects = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));
const findings = [];

function walk(node, path, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((child, index) => walk(child, [...path, index], visit));
    return;
  }
  visit(node, path);
  Object.entries(node).forEach(([key, value]) => walk(value, [...path, key], visit));
}

for (const [id, card] of Object.entries(effects)) {
  const text = String(card.effect || '');
  walk(card.ast, [], (node, path) => {
    if (!['gain_keyword', 'give_power', 'boost_power', 'set_active', 'rest_card', 'knockout', 'play_card'].includes(node.type)) return;
    const hasExplicitTarget = node.target !== undefined || node.targets !== undefined || node.options !== undefined;
    const mentionsLeader = /your (?:\[[^\]]+\] )?Leader/i.test(text);
    const mentionsOpponent = /your opponent/i.test(text);
    const targetText = JSON.stringify(node.target || node.targets || '');
    if (!hasExplicitTarget && (mentionsLeader || mentionsOpponent)) {
      findings.push({ id, name: card.name, type: node.type, path, reason: 'text names a leader/opponent but AST has no target', effect: text.slice(0, 180) });
    } else if (node.target === 'self' && mentionsLeader && !/this Character/i.test(text)) {
      findings.push({ id, name: card.name, type: node.type, path, reason: 'self target may conflict with Leader wording', target: node.target, effect: text.slice(0, 180) });
    }
  });
}

console.log(`Potential target findings: ${findings.length}`);
findings.slice(0, 100).forEach(item => console.log(JSON.stringify(item)));
