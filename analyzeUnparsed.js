import fs from 'fs';

// Groups unparsed_segments from partially_parsed_cards.json by NORMALIZED structure
// (numbers -> N, [X]/{X}/"X" -> placeholders) to reveal recurring patterns hidden
// behind literal text differences (card names, numeric values, etc).
// Run this after benchmarkPeggy.js to find the next grammar rules worth writing.

const data = JSON.parse(fs.readFileSync('needs_override.json', 'utf8'));
const entries = data.flatMap(card => card.unparsed_segments.map(segment => ({
  code: card.code,
  name: card.name,
  effect: card.effect,
  segment: segment.trim()
})));
const allSegs = entries.map(entry => entry.segment);

function normalize(s) {
  return s
    .replace(/\[[^\]]+\]/g, '[X]')
    .replace(/\{[^}]+\}/g, '{X}')
    .replace(/"[^"]+"/g, 'Q')
    .replace(/\d+/g, 'N')
    .toLowerCase();
}

const groups = {};
allSegs.forEach(s => {
  const n = normalize(s);
  (groups[n] ||= []).push(s);
});

const sorted = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);

function classify(segment) {
  const text = segment.toLowerCase();
  if (/^it gains|^that card gains|^that character gains|^it gets/.test(text)) return 'previous-target continuation';
  if (/^for every|for each of|same number of|equal to the number/.test(text)) return 'quantity-linked action';
  if (/^under the rules|take an extra turn|you lose|do not lose|cannot include/.test(text)) return 'game-rule effect';
  if (/cannot attack|cannot be k\.o|cannot be played|cannot activate|unless your opponent/.test(text)) return 'restriction/protection';
  if (/cost equal to or less than|number of don!!|number of life cards|cost of \d+ or less/.test(text)) return 'dynamic target constraint';
  if (/^place|at the bottom|at the top|from .*trash.*hand|from .*life area/.test(text)) return 'zone movement';
  if (/^give |^set |^all of your|base power|gains \[|gain \+|gain -/.test(text)) return 'stat/keyword modification';
  if (/^draw|^trash|trash .* from your hand|draw .* for each/.test(text)) return 'draw/trash action';
  if (/^then,?\s+(if|when|whenever)/.test(text)) return 'then conditional';
  if (/^if\b/.test(text)) return 'conditional action';
  if (/^you may[^:]*:/.test(text)) return 'optional cost then action';
  if (/^you may\b/.test(text)) return 'optional action';
  if (/^look at|^reveal|^choose|^activate up to/.test(text)) return 'look/reveal/choose';
  if (/\bplace\b.*\btrash\b|\bfrom your trash\b/.test(text)) return 'trash-to-field/deck';
  if (/\bplay\b.*\bfrom your (hand|trash)\b/.test(text)) return 'play from zone';
  if (/\bthen\b|\band then\b/.test(text)) return 'multi-action continuation';
  if (/errata|disclaimer|reprinted|copyright|artist credit/.test(text)) return 'metadata/errata';
  if (/power|cost|rush|blocker|banish|unblockable/.test(text)) return 'stat/keyword effect';
  return 'other';
}

const structures = {};
entries.forEach(entry => {
  const family = classify(entry.segment);
  (structures[family] ||= []).push(entry);
});
const sortedStructures = Object.entries(structures).sort((a, b) => b[1].length - a[1].length);

const structureReport = sortedStructures.map(([family, familyEntries]) => ({
  family,
  segmentCount: familyEntries.length,
  cardCount: new Set(familyEntries.map(entry => entry.code)).size,
  entries: familyEntries.map(entry => ({
    code: entry.code,
    name: entry.name,
    effect: entry.effect,
    segment: entry.segment
  }))
}));

fs.writeFileSync('unparsed_structure_report.json', JSON.stringify({
  generatedFrom: 'needs_override.json',
  totalSegments: allSegs.length,
  totalCards: new Set(entries.map(entry => entry.code)).size,
  families: structureReport
}, null, 2));

console.log(`Total segments: ${allSegs.length} | Normalized unique groups: ${sorted.length}`);
console.log(`\nTop 30 normalized groups (count | example):`);
sorted.slice(0, 30).forEach(([g, examples]) => {
  console.log(`${examples.length} | ${examples[0].slice(0, 110)}`);
});

console.log(`\nStructural families (segments | cards | family):`);
sortedStructures.forEach(([family, familyEntries]) => {
  const cards = [...new Set(familyEntries.map(entry => entry.code))];
  console.log(`${familyEntries.length} | ${cards.length} | ${family}`);
  familyEntries.slice(0, 3).forEach(entry => {
    console.log(`  ${entry.code} ${entry.name}: ${entry.segment.slice(0, 140)}`);
  });
});
