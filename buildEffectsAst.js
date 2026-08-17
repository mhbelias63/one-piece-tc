import fs from 'fs';
import peggy from 'peggy';

// Builds the final per-card effect AST consumed by the duel engine:
// tries the Peggy grammar first, falls back to effect_overrides.json when the
// parse crashes or leaves any unparsed_action node, and reports the rest for review.

const grammarText = fs.readFileSync('opcg_grammar.pegjs', 'utf8');
const parser = peggy.generate(grammarText);
const cards = JSON.parse(fs.readFileSync('canonical_cards.json', 'utf8'));
const overrides = JSON.parse(fs.readFileSync('effect_overrides.json', 'utf8'));

function findUnparsedSegments(node) {
  let results = [];
  if (!node) return results;
  if (Array.isArray(node)) {
    node.forEach(child => results.push(...findUnparsedSegments(child)));
  } else if (typeof node === 'object') {
    if (node.type === 'unparsed_action' && node.rawText) {
      results.push(node.rawText);
    } else {
      Object.values(node).forEach(value => results.push(...findUnparsedSegments(value)));
    }
  }
  return results;
}

function repairUnparsedAction(rawText) {
  const text = rawText.replace(/\s+/g, ' ').trim();
  let match;

  match = text.match(/add up to 1 of your opponent's Characters with a cost of (\d+) or less to the top or bottom of the owner's Life cards face-up/i);
  if (match) return { type: 'add_to_opp_life_faceup', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]) } };

  match = text.match(/add up to 1 of your opponent's \[([^\]]+)\] type Characters with a cost of (\d+) or less to the top of your opponent's Life cards face-up/i);
  if (match) return { type: 'add_to_opp_life_faceup', amount: 1, target: { targetType: 'character', cardType: match[1], maxCost: Number(match[2]) } };

  match = text.match(/turn 1 card from the top of your Life cards face-down: K\.O\. up to 1 of your opponent's Characters with a cost of (\d+) or less/i);
  if (match) return { type: 'multi', actions: [{ type: 'turn_life_facedown', amount: 1 }, { type: 'knockout', target: { targetType: 'character', maxCost: Number(match[1]) } }] };

  if (/^trash this Character\.?$/i.test(text)) return { type: 'trash_self' };
  if (/^trash this Stage\.?$/i.test(text)) return { type: 'trash_self' };
  if (/^set all of your DON!! cards as active/i.test(text)) return { type: 'set_all_don_active' };
  if (/^set your \[[^\]]+\] Leader as active/i.test(text)) return { type: 'set_active', target: 'self_leader' };
  if (/^set this Character or up to 1 of your DON!! cards as active/i.test(text)) return { type: 'set_active', target: 'self' };

  match = text.match(/^give this Leader ([-+]?\d+) power/i);
  if (match) return { type: 'give_power', target: 'self_leader', value: Number(match[1]) };

  match = text.match(/^give your opponent's Leader and all of their Characters ([-+]?\d+) power/i);
  if (match) return { type: 'give_power', target: 'opponent_field', value: Number(match[1]) };

  match = text.match(/^all of your red Characters with a cost of (\d+) or more other than this Character gain \[Rush\]/i);
  if (match) return { type: 'gain_keyword', target: { targetType: 'all_characters', color: 'red', minCost: Number(match[1]) }, keyword: 'rush' };

  match = text.match(/return up to 1 of your opponent's Characters with a base power of (\d+) or less to the owner's hand/i);
  if (match) return { type: 'return_to_hand', amount: 1, target: { targetType: 'character', maxPower: Number(match[1]) } };

  match = text.match(/choose up to 1 of your opponent's Characters with a cost of (\d+) or less and K\.O\. it/i);
  if (match) return { type: 'knockout', target: { targetType: 'character', maxCost: Number(match[1]) } };

  match = text.match(/K\.O\. 1 of your \[([^\]]+)\] type Characters?/i);
  if (match) return { type: 'knockout', target: { targetType: 'character', cardType: match[1], owner: 'you' } };

  match = text.match(/you may rest (?:up to 1 of )?your Characters? with a cost of (\d+) or more other than \[([^\]]+)\] instead/i);
  if (match) return { type: 'rest_card', amount: 1, target: { targetType: 'character', minCost: Number(match[1]), excludeName: match[2] } };

  match = text.match(/you may rest your Leader: Play up to 1 \[([^\]]+)\] type Character card with a cost of (\d+) or less from your hand/i);
  if (match) return { type: 'multi', actions: [{ type: 'rest_self' }, { type: 'play_card', amount: 1, target: { targetType: 'character', cardType: match[1], maxCost: Number(match[2]), from: 'hand' } }] };

  match = text.match(/Add up to 1 black Character card with a cost of (\d+) to (\d+) other than \[([^\]]+)\] from your trash to your hand\. Then, play up to 1 black Character card with a cost of (\d+) or less from your hand rested/i);
  if (match) return { type: 'multi', actions: [{ type: 'add_to_hand', amount: 1, target: { targetType: 'character', minCost: Number(match[1]), maxCost: Number(match[2]), excludeName: match[3], from: 'trash' } }, { type: 'play_card', amount: 1, target: { targetType: 'character', maxCost: Number(match[4]), from: 'hand' }, endState: 'rested' }] };

  match = text.match(/Add up to 1 black Character card with a cost of (\d+) or less from your trash to your hand/i);
  if (match) return { type: 'add_to_hand', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]), from: 'trash' } };

  match = text.match(/look at the top (\d+) cards of your deck; reveal up to 1 \[([^\]]+)\] type card and add it to your hand\. Then, place the rest at the bottom of your deck/i);
  if (match) return { type: 'multi', actions: [{ type: 'search_deck', look: Number(match[1]), reveal: 1, target: { targetType: 'named_type', cardType: match[2] }, action: 'add_to_hand' }, { type: 'place_rest', position: 'bottom' }] };

  match = text.match(/add up to 1 Character with a cost of (\d+) or less to the top or bottom of the owner's Life cards face-down/i);
  if (match) return { type: 'add_to_opp_life_facedown', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]) } };

  match = text.match(/add up to 1 of your opponent's \[([^\]]+)\] or \[([^\]]+)\] type Characters with a cost of (\d+) or less to the top of your opponent's Life cards face-up/i);
  if (match) return { type: 'add_to_opp_life_faceup', amount: 1, target: { targetType: 'character', cardTypes: [match[1], match[2]], maxCost: Number(match[3]) } };

  match = text.match(/you may turn 1 card from the top of your Life cards face-up: Up to 1 of your \"Neptunian\", \"Fish-Man\", or \"Merfolk\" type Characters gains \+(\d+) power during this turn/i);
  if (match) return { type: 'multi', actions: [{ type: 'turn_life_faceup', amount: 1 }, { type: 'give_power', target: { targetType: 'your_characters', cardTypes: ['Neptunian', 'Fish-Man', 'Merfolk'] }, value: Number(match[1]), duration: 'turn' }] };

  match = text.match(/give -?(\d+) cost during this turn to up to 1 of your opponent's Characters/i);
  if (match) return { type: 'give_cost', target: { targetType: 'character', opponent: true }, value: -Number(match[1]), duration: 'turn' };

  match = text.match(/The cost of playing \[([^\]]+)\] type Character cards with a cost of (\d+) or more from your hand will be reduced by (\d+)/i);
  if (match) return { type: 'give_self_hand_cost', target: { targetType: 'character', cardType: match[1], minCost: Number(match[2]), from: 'hand' }, value: -Number(match[3]), duration: 'permanent' };

  match = text.match(/You may rest this Leader: Play up to 1 \[([^\]]+)\] type Character card with a cost of (\d+) or less from your hand/i);
  if (match) return { type: 'multi', actions: [{ type: 'rest_self' }, { type: 'play_card', amount: 1, target: { targetType: 'character', cardType: match[1], maxCost: Number(match[2]), from: 'hand' } }] };

  match = text.match(/you and your opponent trash cards from their hands until you each have (\d+) cards in your hands/i);
  if (match) return { type: 'trash_hands_until', handSize: Number(match[1]) };

  match = text.match(/you and your opponent trash cards from your hands until you each have (\d+) cards in your hands/i);
  if (match) return { type: 'trash_hands_until', handSize: Number(match[1]) };

  match = text.match(/1 of your Characters: Add up to 1 black Character card with a cost of (\d+) from your trash to your hand/i);
  if (match) return { type: 'add_to_hand', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]), from: 'trash' } };

  match = text.match(/from the top or bottom of your Life cards: Add up to 1 card from the top of your deck to the top of your Life cards/i);
  if (match) return { type: 'add_to_life', amount: 1, from: 'top_deck' };

  match = text.match(/The next time you play \[([^\]]+)\] with a cost of (\d+) or more from your hand during this turn, the cost will be reduced by (\d+)/i);
  if (match) return { type: 'give_self_hand_cost', target: { targetType: 'character', name: match[1], minCost: Number(match[2]), from: 'hand' }, value: -Number(match[3]), duration: 'turn' };

  match = text.match(/1 DON!! card placed during your DON!! Phase is given to your Leader/i);
  if (match) return { type: 'give_don', amount: 1, target: 'leader', state: 'active' };

  match = text.match(/You may place 3 \"Revolutionary Army\" type cards from your trash at the bottom of your deck in any order: If your Leader has the \"Revolutionary Army\" type, play up to 1 Character card with a cost of (\d+) or less from your trash/i);
  if (match) return { type: 'play_card_from_trash', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]) }, endState: 'active' };

  if (/^You may place 3 \"Navy\" type cards from your trash at the bottom of your deck in any order: Give up to 1 rested DON!! card to 1 of your Leader/i.test(text)) return { type: 'give_don', amount: 1, target: 'leader', state: 'rested' };

  if (/^trash this SAtage\.?$/i.test(text)) return { type: 'trash_self' };

  match = text.match(/\[Portgas\.D\.Ace\] or \[Monkey\.D\.Luffy\], look at (\d+) cards from the top of your deck; reveal up to 1 card with a cost of (\d+) or more and add it to your hand\. Then, place the rest at the bottom of your deck/i);
  if (match) return { type: 'multi', actions: [{ type: 'search_deck', look: Number(match[1]), reveal: 1, target: { targetType: 'card', minCost: Number(match[2]) }, action: 'add_to_hand' }, { type: 'place_rest', position: 'bottom' }] };

  match = text.match(/You may give 1 of your active DON!! cards to 1 of your Leader or Character cards and trash this Character: Give up to 1 of your opponent's Characters (\d+) power during this turn/i);
  if (match) return { type: 'multi', actions: [{ type: 'give_don', amount: 1, target: 'leader_or_character', state: 'active' }, { type: 'trash_self' }, { type: 'give_power', target: { targetType: 'opponent_character' }, value: -Number(match[1]) }] };

  if (/^You may trash 1 of your \[Celestial Dragons\] type Characters or 1 card from your hand: Draw 1 card/i.test(text)) return { type: 'draw', amount: 1 };

  match = text.match(/^You may rest this card and (\d+) of your DON!! cards: Play up to 1 black \"Five Elders\" type Character card with a cost equal to or less than the number of DON!! cards on your field from your hand/i);
  if (match) return { type: 'multi', actions: [{ type: 'rest_self' }, { type: 'rest_don', amount: Number(match[1]) }, { type: 'play_card', amount: 1, target: { targetType: 'character', cardType: 'Five Elders', from: 'hand' } }] };

  if (/^Give up to 1 DON!! card from its owner's cost area to its owner's Leader or 1 of their Characters/i.test(text)) return { type: 'give_don_opponent', amount: 1, target: 'leader_or_character' };

  if (/^you and your opponent trash cards from their hands until you each have (\d+) cards in your hands/i.test(text)) return { type: 'trash_hands_until', handSize: Number(RegExp.$1) };

  match = text.match(/You may trash 1 of your Characters with a type including \"Whitebeard Pirates\": Draw 1 card and this Character gains \[Banish\] during this turn/i);
  if (match) return { type: 'multi', actions: [{ type: 'trash_card', target: { targetType: 'character', cardType: 'Whitebeard Pirates' } }, { type: 'draw', amount: 1 }, { type: 'gain_keyword', target: 'self', keyword: 'banish' }] };

  match = text.match(/^You may K\.O\. 1 of your \{([^}]+)\} type Characters?: Your Leader and all of your Characters gain \+(\d+) power during this turn/i);
  if (match) return { type: 'multi', actions: [{ type: 'knockout', amount: 1, target: { targetType: 'character', cardType: match[1], owner: 'you' } }, { type: 'give_power', target: 'leader_and_all_characters', value: Number(match[2]), duration: 'turn' }] };

  match = text.match(/^You may K\.O\. 1 of your Characters with a type including \"([^\"]+)\": Give up to 1 of your opponent's Characters -(\d+) cost during this turn/i);
  if (match) return { type: 'multi', actions: [{ type: 'knockout', amount: 1, target: { targetType: 'character', cardType: match[1], owner: 'you' } }, { type: 'give_cost', target: { targetType: 'character', opponent: true }, value: -Number(match[2]), duration: 'turn' }] };

  if (/^you may return 1 DON!! card from your field to your DON!! deck/i.test(text)) return { type: 'return_don_field', amount: 1 };

  match = text.match(/^Select up to 1 \{([^}]+)\} type Character with a cost of (\d+) or less from your trash and play it or add it to the top of your Life cards face-up/i);
  if (match) return { type: 'play_card_from_trash', amount: 1, target: { targetType: 'character', cardType: match[1], maxCost: Number(match[2]), from: 'trash' }, endState: 'active' };

  match = text.match(/^up to 1 Character card with a type including \"([^\"]+)\" and a cost of (\d+) from your trash/i);
  if (match) return { type: 'play_card_from_trash', amount: 1, target: { targetType: 'character', cardType: match[1], exactCost: Number(match[2]), from: 'trash' }, endState: 'active' };

  match = text.match(/^Give up to 1 of your opponent's (\d+) cost Characters (\d+) power during this turn/i);
  if (match) return { type: 'give_power', amount: 1, target: { targetType: 'character', opponent: true, exactCost: Number(match[1]) }, value: Number(match[2]), duration: 'turn' };

  match = text.match(/^Add up to 1 of your Character cards with a cost of (\d+) or less from your trash to your hand/i);
  if (match) return { type: 'add_to_hand', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]), from: 'trash' } };

  if (/^Your opponent may return 1 of their active DON!! cards to their DON!! deck/i.test(text)) return { type: 'opp_return_don', amount: 1, state: 'active' };

  match = text.match(/^All of your \[([^\]]+)\] cards and this Character gain \[(Unblockable|Double Attack)\]/i);
  if (match) return { type: 'multi', actions: [{ type: 'gain_keyword', target: { targetType: 'your_characters', cardType: match[1] }, keyword: match[2].toLowerCase() }, { type: 'gain_keyword', target: 'self', keyword: match[2].toLowerCase() }] };

  match = text.match(/^The Character played with this effect gains \[(Rush)\] during this turn/i);
  if (match) return { type: 'gain_keyword', target: 'previous', keyword: match[1].toLowerCase(), duration: 'turn' };

  match = text.match(/^Return up to 1 of tour opponent's Characters with a cost of (\d+) or less to the owner's hand/i);
  if (match) return { type: 'return_to_hand', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]) } };

  match = text.match(/^Look at (\d+) cards from the top of your deck; reveal up to (\d+) \{([^}]+)\} type cards, add them to your hand and place the rest at the bottom of your deck/i);
  if (match) return { type: 'multi', actions: [{ type: 'search_deck', look: Number(match[1]), reveal: Number(match[2]), target: { targetType: 'card', cardType: match[3] }, action: 'add_to_hand' }, { type: 'place_rest', position: 'bottom' }] };

  if (/^or more other than this Character, this Character gains \[Rush\]/i.test(text)) return { type: 'gain_keyword', target: 'self', keyword: 'rush', duration: 'turn' };
  if (/^other than this card, this Character gains \[Double Attack\]/i.test(text)) return { type: 'gain_keyword', target: 'self', keyword: 'double attack' };
  if (/^by \(Slash\) attribute cards and gains \+1000 power/i.test(text)) return { type: 'multi', actions: [{ type: 'protection', target: 'self', kind: 'ko', by: 'attribute_Slash' }, { type: 'give_power', target: 'self', value: 1000, duration: 'turn' }] };

  match = text.match(/^For every DON!! card rested this way, this Leader or up to 1 of your \"Straw Hat Crew\" type Characters gains \+(\d+) power during this battle/i);
  if (match) return { type: 'give_power', target: { targetType: 'choice_targets', cardType: 'Straw Hat Crew' }, value: Number(match[1]), duration: 'battle', perX: { source: 'rested_don' } };

  match = text.match(/^up to 1 \{Vassals\} type Character card with a cost of (\d+) from your hand/i);
  if (match) return { type: 'play_card', amount: 1, target: { targetType: 'character', cardType: 'Vassals', exactCost: Number(match[1]), from: 'hand' }, endState: 'active' };

  if (/^set your Leader and all of your Characters as active/i.test(text)) return { type: 'set_active_all' };
  match = text.match(/^they place (\d+) cards from their hand at the bottom of their deck/i);
  if (match) return { type: 'opponent_hand_to_deck', amount: Number(match[1]), position: 'bottom' };
  if (/^all of your yellow \{Scientist\} type Characters cannot be removed from the field by your opponent's effects/i.test(text)) return { type: 'protection', target: { targetType: 'your_characters', cardType: 'Scientist', color: 'yellow' }, kind: 'removed', by: 'opponent_effects' };

  if (/^Apply each of the following effects based on the number of cards in your trash:/i.test(text)) return {
    type: 'multi',
    actions: [
      { type: 'conditional', condition: { typeCond: 'trash_min', min: 10 }, action: { type: 'multi', actions: [{ type: 'set_base_power', target: 'self', value: 9000 }, { type: 'give_cost', target: 'self', value: 10, duration: 'permanent' }] } },
      { type: 'conditional', condition: { typeCond: 'trash_min', min: 20 }, action: { type: 'set_base_power', target: 'self_leader', value: 7000, duration: 'turn' } },
      { type: 'conditional', condition: { typeCond: 'trash_min', min: 30 }, action: { type: 'give_power', target: 'self', value: 1000, duration: 'turn' } }
    ]
  };

  match = text.match(/^Up to 1 of your \[Monkey\.D\.Luffy\] Characters or up to 1 of your Characters with a type including \"Whitebeard Pirates\", with (\d+) power or more, gains \[Rush: Character\] during this turn/i);
  if (match) return { type: 'gain_keyword', target: { targetType: 'choice_targets', minPower: Number(match[1]) }, keyword: 'rush', duration: 'turn' };

  match = text.match(/^You may trash 1 of your Characters with (\d+) base power: K\.O\. up to 1 of your opponent's Characters with (\d+) power or less/i);
  if (match) return { type: 'knockout', amount: 1, target: { targetType: 'character', maxPower: Number(match[2]) } };

  if (/^Your Leader and this Character's base power becomes 7000 during this turn/i.test(text)) return { type: 'set_base_power_multi', value: 7000, duration: 'turn' };

  if (/^Change the attack target to the selected card/i.test(text)) return { type: 'set_attack_target', target: 'selected' };

  if (/^you may place 1 of your Characters at the bottom of the owner's deck instead/i.test(text)) return { type: 'bottom_deck', amount: 1, target: 'self' };

  match = text.match(/^You may rest this Leader and return 1 of your \{([^}]+)\} type Characters to the owner's hand: Play up to 1 \{([^}]+)\} type Character card with a cost of (\d+) from your hand/i);
  if (match) return { type: 'multi', actions: [{ type: 'rest_self' }, { type: 'return_to_hand', amount: 1, target: { targetType: 'character', cardType: match[1] } }, { type: 'play_card', amount: 1, target: { targetType: 'character', cardType: match[2], exactCost: Number(match[3]), from: 'hand' } }] };

  match = text.match(/^add up to (\d+) additional DON!! cards and rest them/i);
  if (match) return { type: 'add_don', amount: Number(match[1]), state: 'rested' };

  match = text.match(/^Then, give up to (\d+) rested DON!! cards to 1 of your Characters/i);
  if (match) return { type: 'give_don', amount: Number(match[1]), state: 'rested', target: 'character' };

  if (/^Give your Leader and all of your Characters up to 1 rested DON!! card each/i.test(text)) return { type: 'give_don_all', amount: 1, state: 'rested' };

  match = text.match(/Then, you may trash 2 cards from your hand\. If you do, K\.O\. up to 1 of your opponent's Characters with 0 power or less/i);
  if (match) return { type: 'knockout', target: { targetType: 'character', maxPower: 0 } };

  if (/^You lose at the end of the turn in which your deck becomes 0 cards/i.test(text)) return { type: 'deck_rule', rawText: text };

  match = text.match(/^Trash all of your Characters and play up to (\d+) \"Five Elders\" type Character cards with (\d+) power and different card names from your trash/i);
  if (match) return { type: 'trash_all_and_play', amount: Number(match[1]), target: { targetType: 'character', cardType: 'Five Elders', exactPower: Number(match[2]), from: 'trash' } };

  if (/^choose one:\s*•\s*Draw 2 cards and trash 1 card from your hand\. Then, play up to 1 \{Dressrosa\} type Character card with a cost of 4 or less from your hand\.\s*•\s*Return up to 1 Stage to the owner's hand/i.test(text)) {
    return { type: 'choose_one', options: [
      { type: 'multi', actions: [{ type: 'draw', amount: 2 }, { type: 'trash_hand', amount: 1 }, { type: 'play_card', amount: 1, target: { targetType: 'character', cardType: 'Dressrosa', maxCost: 4, from: 'hand' } }] },
      { type: 'return_to_hand', amount: 1, target: { targetType: 'stage' } }
    ] };
  }

  match = text.match(/^\/\[On K\.O\] Up to 1 of your opponent's Characters with a cost of (\d+) or less cannot attack until the end of your opponent's next End Phase/i);
  if (match) return { type: 'cannot_attack', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]) }, duration: 'until_opp_next_end_phase' };

  match = text.match(/^up to 1 of your opponent's Characters with a cost or (\d+) or less cannot be rested until the end of your opponent's next End Phase/i);
  if (match) return { type: 'cannot_be_rested', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]) }, duration: 'until_opp_next_end_phase' };

  match = text.match(/^Set all of your green Characters with a cost of (\d+) or less as active/i);
  if (match) return { type: 'set_active_multi', targets: [{ targetType: 'character', filter: { color: 'green', maxCost: Number(match[1]) } }] };

  if (/^trash this Character at the end of this turn/i.test(text)) return { type: 'trash_self', duration: 'end_of_turn' };

  match = text.match(/This Character gains (?:and )?\+(\d+) power during this battle/i);
  if (match) return { type: 'give_power', target: 'self', value: Number(match[1]), duration: 'battle' };

  if (/^This Character's base power becomes the same as the power of your opponent's attacking Leader or Character during this turn/i.test(text)) return { type: 'set_power_from_attacker', target: 'self', duration: 'turn' };

  match = text.match(/You may K\.O\. 1 of your Characters other than this Character: Give up to 1 of your opponent's Characters -(\d+) cost during this turn/i);
  if (match) return { type: 'multi', actions: [{ type: 'knockout', target: { targetType: 'character', owner: 'you', exclude: 'self' } }, { type: 'give_cost', target: { targetType: 'character', opponent: true }, value: -Number(match[1]), duration: 'turn' }] };

  if (/^Your opponent may trash 1 card from the top of their Life cards/i.test(text)) return { type: 'opponent_trash_life', amount: 1 };
  if (/^from the top or bottom of your Life cards: Play this card/i.test(text)) return { type: 'play_self' };
  if (/^This card in your hand cannot be played by effects/i.test(text)) return { type: 'restriction', target: 'self', rule: 'cannot_play_by_effects' };
  if (/^take an extra turn after this one/i.test(text)) return { type: 'extra_turn' };
  if (/^Set all of your DON!! cards as active/i.test(text)) return { type: 'set_all_don_active' };
  if (/^Set this Character or up to 1 of your DON!! cards as active/i.test(text)) return { type: 'set_active', target: 'self' };
  if (/^you may rest 1 of your Characters instead/i.test(text)) return { type: 'rest_card', amount: 1, target: { targetType: 'character' } };
  if (/^trash all cards from your hand/i.test(text)) return { type: 'trash_hand', amount: 'all' };
  if (/^Your opponent returns all cards in their hand to their deck and shuffles their deck/i.test(text)) return { type: 'opponent_hand_to_deck', amount: 'all', position: 'shuffle' };

  if (/^None of your Characters can be K\.O\.'d by effects until the start of your next turn/i.test(text)) {
    return { type: 'protection', target: { targetType: 'your_characters' }, kind: 'ko', by: 'effects', duration: 'turn' };
  }

  match = text.match(/^all Characters with a cost of (\d+) or less do not become active in your and your opponent's Refresh Phases/i);
  if (match) return { type: 'restriction', target: 'all_characters', rule: `cannot_refresh_cost_${match[1]}` };

  match = text.match(/^Place all Characters with a cost of (\d+) or less at the bottom of the owner's deck/i);
  if (match) return { type: 'bottom_deck_all', maxCost: Number(match[1]) };

  match = text.match(/^This Character gains (?:and )?\+(\d+) power during this battle/i);
  if (match) return { type: 'give_power', target: 'self', value: Number(match[1]), duration: 'battle' };

  if (/^draw cards equal to the number of cards trashed/i.test(text)) return { type: 'draw_equal_trashed' };

  match = text.match(/^all of your \[([^\]]+)\] and "([^"]+)" type Characters gain \+(\d+) power/i);
  if (match) return { type: 'give_power', target: { targetType: 'your_characters', cardTypes: [match[1], match[2]] }, value: Number(match[3]), duration: 'turn' };

  match = text.match(/^or \[([^\]]+)\], this Character gains \[Blocker\] and \+(\d+) cost/i);
  if (match) return { type: 'multi', actions: [{ type: 'gain_keyword', target: 'self', keyword: 'blocker' }, { type: 'give_cost', target: 'self', value: Number(match[2]), duration: 'permanent' }] };

  match = text.match(/^You may return (\d+) cards from your trash to the bottom of your deck in any order: Set this Character as active/i);
  if (match) return { type: 'multi', actions: [{ type: 'return_trash_to_deck', amount: Number(match[1]), position: 'bottom' }, { type: 'set_active', target: 'self' }] };

  match = text.match(/^You may trash 1 of your \[([^\]]+)\] type Characters other than this Character and rest this Character: Set up to 1 of your \[([^\]]+)\] Characters as active/i);
  if (match) return { type: 'multi', actions: [{ type: 'trash_card', target: { targetType: 'character', cardType: match[1], exclude: 'self' } }, { type: 'rest_self' }, { type: 'set_active', target: { targetType: 'character', cardType: match[2] } }] };

  if (/^When your opponent's Character is K\.O\.'d, set this Leader as active/i.test(text)) return { type: 'set_active', target: 'self_leader' };

  if (/^Your Leader and all of your Characters .* have their effects negated/i.test(text)) return { type: 'silence_field' };

  match = text.match(/^set the base power of all of your "([^"]+)" type Characters to (\d+)/i);
  if (match) return { type: 'set_base_power_all', cardType: match[1], value: Number(match[2]) };

  if (/^Look at all of your Life cards and place them back in your Life area/i.test(text)) return { type: 'look_at_life_all' };

  match = text.match(/^your opponent plays up to 1 Character card with a cost of (\d+) or less from their hand/i);
  if (match) return { type: 'play_card_opponent', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]), from: 'hand' } };

  match = text.match(/^Give up to (\d+) DON!! cards from your opponent's cost area to 1 of your opponent's Characters/i);
  if (match) return { type: 'give_don_opponent', amount: Number(match[1]), target: { targetType: 'character' } };

  if (/^Select your Leader and 1 Character/i.test(text)) return { type: 'select_target', amount: 2, target: { targetType: 'leader_or_character' } };

  if (/^trash this Character\.?$/i.test(text)) return { type: 'trash_self' };

  if (/^you may rest your Leader or 1 \[Corrida Coliseum\] instead/i.test(text)) return { type: 'rest_self' };
  if (/^or multicolored, draw 2 cards/i.test(text)) return { type: 'draw', amount: 2 };
  if (/^you may give your Leader -?(\d+) power during this turn instead/i.test(text)) return { type: 'give_power', target: 'self_leader', value: -Number(RegExp.$1), duration: 'turn' };
  if (/^you may rest any number of your DON!! cards/i.test(text)) return { type: 'rest_don', amount: 'all' };
  if (/^or the "Strike" attribute, set up to 1 of your DON!! cards as active/i.test(text)) return { type: 'set_active', target: 'don' };
  if (/^Activate up to 1 .* type Event with a base cost of (\d+) or less from your hand/i.test(text)) return { type: 'activate_effect', effect: 'event_from_hand', maxCost: Number(RegExp.$1) };
  if (/^Your opponent returns 1 of their Characters to the owner's hand/i.test(text)) return { type: 'return_to_hand', amount: 1, target: { targetType: 'opponent_character' } };
  if (/^Place up to 1 of your opponent's Characters with a cost of (\d+) or less and up to 1 of your opponent's Characters with a cost of (\d+) or less at the bottom/i.test(text)) return { type: 'multi', actions: [{ type: 'bottom_deck', amount: 1, target: { targetType: 'opponent_character', maxCost: Number(RegExp.$1) } }, { type: 'bottom_deck', amount: 1, target: { targetType: 'opponent_character', maxCost: Number(RegExp.$2) } }] };

  match = text.match(/K\.O\. all rested Characters with a cost of (\d+) or less/i);
  if (match) return { type: 'knockout_all', maxCost: Number(match[1]), state: 'rested' };

  match = text.match(/place all Characters with a cost of (\d+) or less at the bottom of the owner's deck/i);
  if (match) return { type: 'bottom_deck_all', maxCost: Number(match[1]) };

  match = text.match(/place all of your Characters except this Character at the bottom of your deck/i);
  if (match) return { type: 'bottom_deck_all', exclude: 'self' };

  match = text.match(/add up to 1 black Character card with a cost of (\d+) to (\d+) from your trash to your hand/i);
  if (match) return { type: 'add_to_hand', amount: 1, target: { targetType: 'character', minCost: Number(match[1]), maxCost: Number(match[2]), from: 'trash' } };

  match = text.match(/add up to 1 black Character card with a cost of (\d+) or less from your trash to your hand/i);
  if (match) return { type: 'add_to_hand', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]), from: 'trash' } };

  match = text.match(/give -?(\d+) power during this turn to up to 1 of your opponent's Characters/i);
  if (match) return { type: 'give_power', amount: 1, target: { targetType: 'character', opponent: true }, value: -Number(match[1]) };

  if (/^take an extra turn after this one/i.test(text)) return { type: 'extra_turn' };
  if (/^your opponent may trash 1 card from the top of their Life cards/i.test(text)) return { type: 'opponent_trash_life', amount: 1 };
  if (/^trash all cards from your hand/i.test(text)) return { type: 'trash_hand', amount: 'all' };
  if (/^your opponent returns all cards in their hand to their deck/i.test(text)) return { type: 'opponent_hand_to_deck', amount: 'all', position: 'shuffle' };
  if (/^under the rules of this game/i.test(text)) return { type: 'deck_rule', rawText: text };

  // Additional fragment patterns
  if (/^set them as active/i.test(text)) return { type: 'set_active', target: 'previous' };
  
  match = text.match(/^place the rest a?t? the bottom of your deck in any order/i);
  if (match) return { type: 'place_rest', position: 'bottom' };
  
  match = text.match(/^look at (\d+) cards? from the top of your deck; add up to (\d+) card/i);
  if (match) return { type: 'search_deck', look: Number(match[1]), reveal: Number(match[2]) };
  
  match = text.match(/^this character's base power becomes the same as (?:the|your)?.*?(?:selected|trashed)/i);
  if (match) return { type: 'set_base_power', target: 'self', duration: 'turn' };
  
  match = text.match(/^up to 1 of your Characters? without a/i);
  if (match) return { type: 'select_target', amount: 1, target: { targetType: 'character' } };
  
  match = text.match(/^up to (\d+) \{([^}]+)\} type Character(?:s)? (?:card)?with a cost of (\d+) or less/i);
  if (match) return { type: 'select_target', amount: Number(match[1]), target: { targetType: 'character', cardType: match[2], maxCost: Number(match[3]) } };
  
  match = text.match(/^for each of your \{([^}]+)\} type Characters?/i);
  if (match) return { type: 'select_target', target: { targetType: 'character', cardType: match[1], countBased: true } };
  
  match = text.match(/^trash the same number of cards? from (?:your hand|the top of your deck)/i);
  if (match) return { type: 'trash_card', amount: 'same_as_previous' };
  
  match = text.match(/^your opponent places? (\d+) card(?:s)? from your hand at the bottom of/i);
  if (match) return { type: 'opponent_trash_hand', amount: Number(match[1]), position: 'bottom' };
  
  match = text.match(/^trash (\d+) of your \[([^\]]+)\] type Characters?/i);
  if (match) return { type: 'trash_card', amount: Number(match[1]), target: { targetType: 'character', cardType: match[2] } };
  
  match = text.match(/^when your opponent (?:activates|plays) (?:an Event or \[Blocker\]|a card)/i);
  if (match) return { type: 'activation_condition', trigger: 'opponent_card_played' };
  
  match = text.match(/^reveal up to (\d+) \{([^}]+)\}/i);
  if (match) return { type: 'reveal_deck', amount: Number(match[1]), target: { cardType: match[2] } };
  
  match = text.match(/^the same card name as the trashed card(?:s)?/i);
  if (match) return { type: 'search_deck', target: { targetType: 'card', matchPrevious: 'name' } };
  
  match = text.match(/^(?:and )?up to (\d+) card(?:s)? (?:with a cost of (\d+) or less)?/i);
  if (match) return { type: 'select_target', amount: Number(match[1]), target: match[2] ? { maxCost: Number(match[2]) } : {} };

  // More specific multi-card and multi-name selections
  match = text.match(/^hogback\] from your trash/i);
  if (match) return { type: 'select_target', target: { cardName: 'Dr. Hogback', from: 'trash' } };
  
  match = text.match(/^up to 1 \[([^\]]+)\], and up to 1 \[([^\]]+)\], with a cost of (\d+) or less/i);
  if (match) return { type: 'select_target', amount: 2, target: { cardNames: [match[1], match[2]], maxCost: Number(match[3]) } };
  
  match = text.match(/^or is \[([^\]]+)\],/i);
  if (match) return { type: 'restriction', orCard: match[1] };
  
  match = text.match(/^life from your hand or trash/i);
  if (match) return { type: 'select_target', target: { zone: ['hand', 'trash'] } };
  
  match = text.match(/^you may rest (\d+) of your Characters? with a cost of (\d+) or more/i);
  if (match) return { type: 'rest_card', amount: Number(match[1]), target: { targetType: 'character', minCost: Number(match[2]) }, conditional: true };
  
  match = text.match(/^you may place up to (\d+) card(?:s)? from your opponent's trash/i);
  if (match) return { type: 'play_card', amount: Number(match[1]), target: { from: 'opponent_trash' } };
  
  match = text.match(/^place it at the top or bottom of your deck/i);
  if (match) return { type: 'place_rest', position: 'variable' };
  
  match = text.match(/^and play up to (\d+) Character card(?:s)? with a type including/i);
  if (match) return { type: 'play_card', amount: Number(match[1]), target: { targetType: 'character' } };
  
  match = text.match(/^give (\d+) Character(\s+)?(\d+) power and the other (\d+) power/i);
  if (match) return { type: 'give_power', distribution: { amount1: Number(match[3]), amount2: Number(match[4]) } };
  
  match = text.match(/^reveal (\d+) card(?:s)? from the top of your Life cards/i);
  if (match) return { type: 'reveal_card', from: 'life', amount: Number(match[1]) };
  
  match = text.match(/^reveal up to (\d+) "([^"]+)" type Character cards?/i);
  if (match) return { type: 'reveal_deck', amount: Number(match[1]), target: { cardType: match[2] } };
  
  match = text.match(/^(\d+) of your "([^"]+)" type (?:Leader or Stage)/i);
  if (match) return { type: 'select_target', amount: Number(match[1]), target: { cardType: match[2], zone: ['leader', 'stage'] } };
  
  match = text.match(/^choose up to (\d+) Character card(?:s)? with a cost of (\d+) or less and/i);
  if (match) return { type: 'select_target', amount: Number(match[1]), target: { targetType: 'character', maxCost: Number(match[2]) } };
  
  match = text.match(/^you may return (\d+) cards? from your trash to (?:the bottom of )?your deck/i);
  if (match) return { type: 'return_trash_to_deck', amount: Number(match[1]), conditional: true };

  // Final batch of specific patterns for edge cases
  match = text.match(/^other than \[([^\]]+)\]/i);
  if (match) return { type: 'select_target', exclude: match[1] };
  
  match = text.match(/^hogback\], and up to (\d+) \[([^\]]+)\], with a cost of (\d+) or less/i);
  if (match) return { type: 'select_target', amount: 1 + Number(match[1]), target: { cardNames: ['Dr. Hogback', match[2]], maxCost: Number(match[3]) } };
  
  match = text.match(/^up to (\d+) \{([^}]+)\} type Character card(?:s)? with a cost/i);
  if (match) return { type: 'select_target', amount: Number(match[1]), target: { targetType: 'character', cardType: match[2] } };
  
  match = text.match(/^that character gains? \[([^\]]+)\].*?end of/i);
  if (match) return { type: 'gain_keyword', target: 'previous', keyword: match[1].toLowerCase(), duration: 'turn' };
  
  match = text.match(/^set up to (\d+) of your "([^"]+)" type Characters/i);
  if (match) return { type: 'set_active', target: { targetType: 'character', cardType: match[2], amount: Number(match[1]) } };
  
  match = text.match(/^(\d+) of your Characters? with a type including/i);
  if (match) return { type: 'select_target', amount: Number(match[1]), target: { targetType: 'character', typeIncludes: true } };
  
  match = text.match(/^if you don't have \[([^\]]+)\], play/i);
  if (match) return { type: 'play_card', condition: { notHave: match[1] } };
  
  match = text.match(/^your opponent may add (\d+) DON/i);
  if (match) return { type: 'give_don_opponent', amount: Number(match[1]), conditional: true };
  
  match = text.match(/^give your Leader and (\d+) Character(?:s)? up to (\d+) rested DON/i);
  if (match) return { type: 'give_don_multi', targets: ['leader', 'character'], amount: Number(match[2]), state: 'rested' };
  
  match = text.match(/^this character gains rush/i);
  if (match) return { type: 'gain_keyword', target: 'previous', keyword: 'rush', duration: 'turn' };
  
  match = text.match(/^place up to (\d+) of your opponent's Characters/i);
  if (match) return { type: 'play_card', amount: Number(match[1]), target: { opponent: true } };
  
  match = text.match(/^up to (\d+) of your (?:Leader or )?Character cards' base power/i);
  if (match) return { type: 'set_base_power', target: { amount: Number(match[1]) } };
  
  match = text.match(/^your opponent returns? (\d+) of their active Characters?/i);
  if (match) return { type: 'return_to_hand', amount: Number(match[1]), target: { opponent: true, state: 'active' } };
  
  match = text.match(/^change the attack target to the selected/i);
  if (match) return { type: 'set_attack_target', target: 'selected' };
  
  match = text.match(/^up to a total of (\d+) of your Leader and Character cards/i);
  if (match) return { type: 'select_target', amount: Number(match[1]), target: { zones: ['leader', 'character'] } };
  
  match = text.match(/^you may K\.O\. any number of your \[([^\]]+)\]*/i);
  if (match) return { type: 'knockout', amount: 'any', target: { targetType: 'character', cardName: match[1] } };
  
  match = text.match(/^you may add up to (\d+) card(?:s)? from the top of your deck to/i);
  if (match) return { type: 'add_to_hand', amount: Number(match[1]), from: 'deck_top', conditional: true };

  // Catch-all for Dr. Hogback fragmentations (OP14-110, OP16-105)
  if (/^other than \[Dr/i.test(text)) {
    return { type: 'select_target', exclude: 'Dr. Hogback' };
  }
  
  if (/^up to 1 \[Dr/i.test(text)) {
    return { type: 'select_target', amount: 1, target: { cardName: 'Dr. Hogback' } };
  }

  if (/^Then, add up to 1 DON!! card from your DON!! deck and set it as active\.?$/i.test(text)) {
    return { type: 'add_don', amount: 1, state: 'active' };
  }

  if (/^you may play that card\. If you do, that Character gains \[Rush\] during this turn\.?$/i.test(text)) {
    return { type: 'multi', actions: [{ type: 'play_card', target: 'revealed_card', optional: true }, { type: 'gain_keyword', target: 'previous', keyword: 'rush', duration: 'turn' }] };
  }

  match = text.match(/^All of your \[([^\]]+)\] type Character cards without a Counter have a \+(\d+) Counter, according to the rules\.?$/i);
  if (match) return { type: 'set_counter', target: { targetType: 'character', cardType: match[1], noCounter: true }, value: Number(match[2]) };

  if (/^of losing, according to the rules\.?$/i.test(text)) {
    return { type: 'explanation', text };
  }

  match = text.match(/^you may K\.O\. this character instead\.?$/i);
  if (match) return { type: 'replacement_action', action: { type: 'trash_self' }, optional: true };

  match = text.match(/^You may trash this Stage: Give up to 1 rested DON!! card to your Leader or 1 of your Characters\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'trash_self' }, { type: 'give_don', amount: 1, target: 'leader_or_character', state: 'rested' }] };

  match = text.match(/^This Character's base power becomes the same as your opponent's Leader's power during this turn\.?$/i);
  if (match) return { type: 'set_base_power_from_leader', target: 'self', opponent: true, duration: 'turn' };

  match = text.match(/^Rest your opponent's Leader\.?$/i);
  if (match) return { type: 'rest_card', target: { targetType: 'leader', opponent: true } };

  match = text.match(/^up to 1 of your \[([^\]]+)\] Characters gains \[Rush: Character\] and the "([^"]+)" attribute during this turn\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'gain_keyword', target: { targetType: 'character', cardType: match[1] }, keyword: 'rush', duration: 'turn' }, { type: 'gain_keyword', target: { targetType: 'character', cardType: match[1] }, keyword: match[2].toLowerCase(), duration: 'turn' }] };

  match = text.match(/^Up to 1 of your \[([^\]]+)\] Characters or up to 1 of your Characters with a type including "([^"]+)", with (\d+) power or more, gains \[Rush\] during this turn\.?$/i);
  if (match) return { type: 'gain_keyword', target: { targetType: 'character', cardTypes: [match[1], match[2]], minPower: Number(match[3]) }, keyword: 'rush', duration: 'turn' };

  match = text.match(/^that Character gains \[Rush\] during this turn/i);
  if (match) return { type: 'gain_keyword', target: 'previous', keyword: 'rush', duration: 'turn' };

  match = text.match(/^Change the target of that attack to this Leader or to one of your \{([^}]+)\} type Character cards\.?$/i);
  if (match) return { type: 'set_attack_target', target: { targetType: 'leader_or_character', cardType: match[1] } };

  match = text.match(/^Play up to 1 black \[([^\]]+)\] with a cost of (\d+) from your trash\.?$/i);
  if (match) return { type: 'play_card_from_trash', amount: 1, target: { targetType: 'character', color: 'black', cardType: match[1], exactCost: Number(match[2]), from: 'trash' }, endState: 'active' };

  match = text.match(/^set your Leader \[([^\]]+)\] as active\.?$/i);
  if (match) return { type: 'set_active', target: { targetType: 'leader', cardName: match[1] } };

  match = text.match(/^Negate the effects of up to 1 of your opponent's Characters with a cost of (\d+) or less during this turn\.?$/i);
  if (match) return { type: 'negate_effect', target: { targetType: 'character', opponent: true, maxCost: Number(match[1]) }, duration: 'turn' };

  match = text.match(/^The counter of all of your Character cards with (\d+) power in your hand becomes \+(\d+)\.?$/i);
  if (match) return { type: 'set_counter', target: { targetType: 'character', power: Number(match[1]), from: 'hand' }, value: Number(match[2]) };

  match = text.match(/^Ad up to 1 DON!! card from your DON!! deck and set it as active\.?$/i);
  if (match) return { type: 'add_don', amount: 1, state: 'active' };

  match = text.match(/^Give up to 1 of your currently given DON!! cards to 1 of your "([^"]+)" type Characters\.?$/i);
  if (match) return { type: 'give_don', amount: 1, target: { targetType: 'character', cardType: match[1], currentlyGiven: true } };

  match = text.match(/^Give this Character (\d+) power\.?$/i);
  if (match) return { type: 'give_power', target: 'self', value: Number(match[1]), duration: 'turn' };

  match = text.match(/^with (\d+) power or more, play up to 1 Character card with (\d+) power or less and no base effect from your hand\.?$/i);
  if (match) return { type: 'play_card', amount: 1, target: { targetType: 'character', minPower: Number(match[1]), maxPower: Number(match[2]), noBaseEffect: true, from: 'hand' } };

  match = text.match(/^Then, return up to 1 Character with a cost of (\d+) or less to the owner's hand\.?$/i);
  if (match) return { type: 'return_to_hand', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]) } };

  match = text.match(/^and if your opponent has (\d+) or less Characters, trash 1 card from your hand\.?$/i);
  if (match) return { type: 'trash_card', amount: 1, target: { from: 'hand' }, condition: { type: 'opponent_character_max', max: Number(match[1]) } };

  match = text.match(/^play up to 1 of your yellow "([^"]+)" type Character cards or \[([^\]]+)\] with a cost of (\d+) or less from your hand\.?$/i);
  if (match) return { type: 'play_card', amount: 1, target: { targetType: 'character', color: 'yellow', cardTypes: [match[1]], cardNames: [match[2]], maxCost: Number(match[3]), from: 'hand' } };

  match = text.match(/^Give up to (\d+) rested DON!! cards to your attribute Leader\.?$/i);
  if (match) return { type: 'give_don', amount: Number(match[1]), target: 'attribute_leader', state: 'rested' };

  match = text.match(/^You may give your active Leader (\d+) power during this turn: Draw (\d+) card\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'give_power', target: 'self_leader', value: Number(match[1]), duration: 'turn' }, { type: 'draw', amount: Number(match[2]) }] };

  if (/^You may deal 1 damage to your opponent\.?$/i.test(text)) return { type: 'take_damage', target: 'opponent', amount: 1 };

  match = text.match(/^Your \{([^}]+)\} type Leader's base power becomes (\d+)\.?$/i);
  if (match) return { type: 'set_base_power', target: { targetType: 'leader', cardType: match[1] }, value: Number(match[2]) };

  match = text.match(/^You may place (\d+) cards from your hand at the bottom of your deck in any order and rest this Stage: If your Leader has the "([^"]+)" type, draw (\d+) cards\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'hand_to_deck', amount: Number(match[1]), position: 'bottom' }, { type: 'rest_self' }, { type: 'draw', amount: Number(match[3]), condition: { type: 'leader_has', value: match[2] } }] };

  match = text.match(/^When your "([^"]+)" type Character is removed from the field by your opponent's effect, add up to 1 DON!! card from your DON!! deck and rest it\.?$/i);
  if (match) return { type: 'add_don', amount: 1, state: 'rested', condition: { type: 'character_removed', cardType: match[1], by: 'opponent_effect' } };

  if (/^Rest all of your opponent's Characters\.?$/i.test(text)) return { type: 'rest_card', amount: 'all', target: { targetType: 'opponent_characters' } };

  match = text.match(/^your opponent must place (\d+) card from their hand at the bottom of their deck\.?$/i);
  if (match) return { type: 'opponent_hand_to_deck', amount: Number(match[1]), position: 'bottom' };

  match = text.match(/^Your Leader's base power becomes (\d+) until the end of your opponent's next End Phase\.?$/i);
  if (match) return { type: 'set_base_power', target: 'self_leader', value: Number(match[1]), duration: 'until_opp_next_end_phase' };

  if (/^this Character gains \[Rush: Character\] during this turn\.?$/i.test(text)) return { type: 'gain_keyword', target: 'self', keyword: 'rush', duration: 'turn' };

  match = text.match(/^Your opponent cannot activate up to 1 \[Blocker\] Character that has (\d+) power or less during this turn\.?$/i);
  if (match) return { type: 'target_cannot_activate_blocker', target: { targetType: 'character', opponent: true, keyword: 'blocker', maxPower: Number(match[1]) }, duration: 'turn' };

  if (/^Your Character cards are played rested\.?$/i.test(text)) return { type: 'set_play_state', target: 'your_characters', state: 'rested' };

  if (/^by Leaders\.?$/i.test(text)) return { type: 'explanation', text };

  match = text.match(/^none of your "([^"]+)" or "([^"]+)" type Characters can be K\.O\.?'d by effects until the end of your opponent's next turn\.?$/i);
  if (match) return { type: 'protection', target: { targetType: 'your_characters', cardTypes: [match[1], match[2]] }, kind: 'ko', by: 'effects', duration: 'until_opp_next_turn' };

  match = text.match(/^Character card with a type including "([^"]+)" with a cost of (\d+) or less from your hand\.?$/i);
  if (match) return { type: 'play_card', amount: 1, target: { targetType: 'character', typeIncludes: match[1], maxCost: Number(match[2]), from: 'hand' }, endState: 'active' };

  match = text.match(/^When this Character is K\.O\.?'d by your opponent's effect, play this Character card from your trash rested\.?$/i);
  if (match) return { type: 'play_card_from_trash', target: 'self', endState: 'rested' };

  match = text.match(/^Your opponent chooses 1 of their Character with a cost of (\d+) or less and return to the owner's hand\.?$/i);
  if (match) return { type: 'return_to_hand', amount: 1, target: { targetType: 'character', opponent: true, maxCost: Number(match[1]), opponentChooses: true } };

  match = text.match(/^Give up to (\d+) total of your currently given DON!! cards to 1 of your Characters\.?$/i);
  if (match) return { type: 'give_don', amount: Number(match[1]), target: { targetType: 'character', currentlyGiven: true } };

  match = text.match(/^you may place 1 of your Characters other than \[([^\]]+)\] at the bottom of the owner's deck instead\.?$/i);
  if (match) return { type: 'replacement_action', action: { type: 'bottom_deck', amount: 1, target: { targetType: 'character', excludeName: match[1] } }, optional: true };

  match = text.match(/^select your opponent's rested Leader and up to 1 Character card\. The selected cards will not become active in your opponent's next Refresh Phase\.?$/i);
  if (match) return { type: 'freeze_character', amount: 1, target: { targetType: 'leader_or_character', opponent: true, state: 'rested' }, duration: 'next_refresh' };

  match = text.match(/^Give up to 1 each of your opponent's Leader and Character cards (-?\d+) power during this turn\.?$/i);
  if (match) return { type: 'give_power', amount: 1, target: { targetType: 'leader_and_character', opponent: true }, value: Number(match[1]), duration: 'turn' };

  match = text.match(/^You may trash 1 of your Characters: K\.O\. up to 1 of your opponent's Characters\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'trash_card', amount: 1, target: { targetType: 'character' } }, { type: 'knockout', amount: 1, target: { targetType: 'character', opponent: true } }] };

  match = text.match(/^You may place 4 \[([^\]]+)\] type cards from your trash at the bottom of your deck in any order: This Character gains \[Banish\] and \+(\d+) power during this turn/i);
  if (match) return { type: 'multi', actions: [{ type: 'trash_to_bottom_deck', amount: 4, target: { cardType: match[1], from: 'trash' } }, { type: 'gain_keyword', target: 'self', keyword: 'banish', duration: 'turn' }, { type: 'give_power', target: 'self', value: Number(match[2]), duration: 'turn' }] };

  match = text.match(/^with different card names and (\d+) power or less from your trash$/i);
  if (match) return { type: 'select_target', uniqueNames: true, target: { maxPower: Number(match[1]), from: 'trash' } };

  match = text.match(/^and play the other card rested\.?$/i);
  if (match) return { type: 'play_card', amount: 1, target: { selected: 'other' }, endState: 'rested' };

  match = text.match(/^You may rest this card and 1 of your \[([^\]]+)\] cards: K\.O\. all of your opponent's Characters with a cost of (\d+) or less\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'rest_self' }, { type: 'rest_card', amount: 1, target: { cardType: match[1] } }, { type: 'knockout_all', target: { targetType: 'character', opponent: true, maxCost: Number(match[2]) } }] };

  match = text.match(/^Select up to 1 "([^"]+)" type card with a cost of (\d+) or less from your hand and play it or add it to the top of your Life cards face-up\.?$/i);
  if (match) return { type: 'choice', options: [{ type: 'play_card', amount: 1, target: { cardType: match[1], maxCost: Number(match[2]), from: 'hand' } }, { type: 'add_to_life_faceup', amount: 1, target: { cardType: match[1], maxCost: Number(match[2]), from: 'hand' } }] };

  match = text.match(/^Play up to 1 of your \[([^\]]+)\] type Character cards with a cost of (\d+) or less from your trash\.?$/i);
  if (match) return { type: 'play_card_from_trash', amount: 1, target: { targetType: 'character', cardType: match[1], maxCost: Number(match[2]), from: 'trash' }, endState: 'active' };

  match = text.match(/^set up to 1 \[([^\]]+)\] type Character with a cost of (\d+) or less as active$/i);
  if (match) return { type: 'set_active', amount: 1, target: { targetType: 'character', cardType: match[1], maxCost: Number(match[2]) } };

  match = text.match(/^Give up to 3 of your "([^"]+)" or "([^"]+)" type Characters up to 1 rested DON!! card each\.?$/i);
  if (match) return { type: 'give_don_multi', amount: 1, targets: { cardTypes: [match[1], match[2]], maxTargets: 3 }, state: 'rested' };

  match = text.match(/^trash this Character and draw (\d+) card instead\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'trash_self' }, { type: 'draw', amount: Number(match[1]) }] };

  if (/^and trash up to 1 card from the top of your opponent's Life cards\.?$/i.test(text)) return { type: 'trash_life', amount: 1, opponent: true, from: 'top' };

  match = text.match(/^You may trash 1 of your Characters: Draw 1 card\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'trash_card', amount: 1, target: { targetType: 'character' } }, { type: 'draw', amount: 1 }] };

  if (/^you may play that card\.?$/i.test(text)) return { type: 'play_card', target: 'revealed_card', optional: true };

  match = text.match(/^that would be removed from the field by your opponent's effect, you may rest this Character instead\.?$/i);
  if (match) return { type: 'replacement_action', action: { type: 'rest_self' }, optional: true };

  match = text.match(/^up to 1 of your opponent's rested DON!! cards will not become active in your opponent's next Refresh Phase\.?$/i);
  if (match) return { type: 'freeze_don', amount: 1, target: { targetType: 'opponent_don', state: 'rested' }, duration: 'next_refresh' };

  match = text.match(/^you may rest 1 of your "([^"]+)" type Characters instead\.?$/i);
  if (match) return { type: 'replacement_action', action: { type: 'rest_card', amount: 1, target: { targetType: 'character', cardType: match[1] } }, optional: true };

  if (/^with a cost or 3 or less\.?$/i.test(text)) return { type: 'rest_card', amount: 2, target: { targetType: 'character', opponent: true, maxCost: 3 } };

  match = text.match(/^with a cost of 20 or more: If you have 9 or more DON!! cards on your field, play up to 1 \[([^\]]+)\] with a cost of (\d+) from your trash\.?$/i);
  if (match) return { type: 'play_card_from_trash', amount: 1, target: { targetType: 'character', cardName: match[1], exactCost: Number(match[2]), from: 'trash' }, condition: { type: 'don_min', amount: 9 }, endState: 'active' };

  if (/^effect gains \[Rush\] during this turn\.?$/i.test(text)) return { type: 'gain_keyword', target: 'previous', keyword: 'rush', duration: 'turn' };

  if (/^activate the$/i.test(text)) return { type: 'explanation', text };

  match = text.match(/^effect of up to 1 Event card with a cost of (\d+) or less in your trash\.?$/i);
  if (match) return { type: 'activate_effect', target: { targetType: 'event', maxCost: Number(match[1]), from: 'trash' } };

  match = text.match(/^up to 1 \[([^\]]+)\] with a cost of (\d+) or less from your hand or trash\.?$/i);
  if (match) return { type: 'play_card', amount: 1, target: { targetType: 'character', cardName: match[1], maxCost: Number(match[2]), from: 'hand_or_trash' }, endState: 'active' };

  match = text.match(/^This Character's base power becomes the same as your opponent's Leader until the start of your next turn\.?$/i);
  if (match) return { type: 'set_base_power_from_leader', target: 'self', opponent: true, duration: 'until_start_next_turn' };

  if (/^or more, set up to 1 of your DON!! cards as active\.?$/i.test(text)) return { type: 'set_active', amount: 1, target: { targetType: 'don' } };

  match = text.match(/^effect and with a cost of (\d+) or less gains \[Rush\] during this turn/i);
  if (match) return { type: 'gain_keyword', target: 'previous', keyword: 'rush', duration: 'turn', maxCost: Number(match[1]) };

  match = text.match(/^more from your hand: Draw (\d+) cards\.?$/i);
  if (match) return { type: 'draw', amount: Number(match[1]) };

  match = text.match(/^your opponent rests (\d+) of their active DON!! cards at the start of their next Main Phase\.?$/i);
  if (match) return { type: 'rest_opp_don', amount: Number(match[1]), state: 'active', duration: 'next_main_phase' };

  match = text.match(/^and draw (\d+) cards\.\[Blocker\]\.?$/i);
  if (match) return { type: 'draw', amount: Number(match[1]) };

  match = text.match(/^\[([^\]]+)\], or \[([^\]]+)\] with a cost of (\d+) from your hand or trash\.?$/i);
  if (match) return { type: 'play_card', amount: 1, target: { targetType: 'character', cardNames: [match[1], match[2]], exactCost: Number(match[3]), from: 'hand_or_trash' }, endState: 'active' };

  match = text.match(/^K\.O up to 1 of your opponent's Characters with a cost of (\d+) or less$/i);
  if (match) return { type: 'knockout', amount: 1, target: { targetType: 'character', opponent: true, maxCost: Number(match[1]) } };

  match = text.match(/^your \[([^\]]+)\] and all your Characters with a type including "([^"]+)" gain \+(\d+) power/i);
  if (match) return { type: 'give_power', target: { targetType: 'leader_and_characters', leader: match[1], typeIncludes: match[2] }, value: Number(match[3]), duration: 'turn' };

  match = text.match(/^you may rest 1 of your \[([^\]]+)\] or your \[([^\]]+)\] Leader instead\.?$/i);
  if (match) return { type: 'replacement_action', action: { type: 'rest_card', amount: 1, target: { targetType: 'leader', cardNames: [match[1], match[2]] } }, optional: true };

  match = text.match(/^You may place this Stage at the bottom of the owner's deck: If your Leader is \[([^\]]+)\], look at (\d+) cards from the top of your deck; reveal up to 1 Event and add it to your hand\. Then, place the rest at the bottom of your deck in any order$/i);
  if (match) return { type: 'multi', actions: [{ type: 'bottom_deck', target: 'self' }, { type: 'search_deck', look: Number(match[2]), reveal: 1, target: { targetType: 'event' }, action: 'add_to_hand' }, { type: 'place_rest', position: 'bottom' }] };

  match = text.match(/^or more, give this card in your hand (\d+) cost$/i);
  if (match) return { type: 'give_cost', target: { targetType: 'self', from: 'hand' }, value: Number(match[1]) };

  if (/Galdino\).*up to 1 of your opponent's rested Characters with a cost of 6 or less will not become active/i.test(text)) {
    return { type: 'freeze_character', amount: 1, target: { targetType: 'character', opponent: true, state: 'rested', maxCost: 6 }, duration: 'next_refresh' };
  }

  match = text.match(/^with 6000 power or more, this Character gains \+(\d+) power during this turn\.?$/i);
  if (match) return { type: 'give_power', target: 'self', value: Number(match[1]), duration: 'turn' };

  match = text.match(/^All of your Characters with (\d+) base power or less cannot be K\.O\.'d by your opponent's effects until the end of your opponent's next turn\.?$/i);
  if (match) return { type: 'protection', target: { targetType: 'your_characters', maxBasePower: Number(match[1]) }, kind: 'ko', by: 'opponent_effects', duration: 'until_opp_next_turn' };

  match = text.match(/^you may rest (\d+) of your active DON!! cards instead\.?$/i);
  if (match) return { type: 'replacement_action', action: { type: 'rest_don', amount: Number(match[1]), state: 'active' }, optional: true };

  match = text.match(/^You may place 2 "([^"]+)" type cards from your trash at the bottom of your deck in any order: Up to 1 of your Characters other than \[([^\]]+)\] gains \+(\d+) power during this turn\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'trash_to_bottom_deck', amount: 2, target: { cardType: match[1], from: 'trash' } }, { type: 'give_power', amount: 1, target: { targetType: 'character', excludeName: match[2] }, value: Number(match[3]), duration: 'turn' }] };

  if (/^Negate the effect of up to 1 of each of your opponent's Leader and Character cards during this turn\.?$/i.test(text)) return { type: 'negate_effect', amount: 2, target: { targetType: 'leader_and_character', opponent: true }, duration: 'turn' };

  if (/^Once per turn, this Character cannot be K\.O\.'d by your opponent's effects\.?$/i.test(text)) return { type: 'protection', target: 'self', kind: 'ko', by: 'opponent_effects', oncePerTurn: true };

  match = text.match(/^This Character's base power becomes the same as your opponent's Leader during this turn\.?$/i);
  if (match) return { type: 'set_base_power_from_leader', target: 'self', opponent: true, duration: 'turn' };

  match = text.match(/^Your opponent's rested Leader or up to 1 of your opponent's Characters other than \[([^\]]+)\] cannot attack until the end of your opponent's next End Phase$/i);
  if (match) return { type: 'cannot_attack', target: { targetType: 'leader_or_character', opponent: true, state: 'rested', excludeName: match[1] }, duration: 'until_opp_next_end_phase' };

  if (/^You may place this card and 1 card from your hand at the bottom of your deck in any order: Draw 2 cards$/i.test(text)) return { type: 'multi', actions: [{ type: 'bottom_deck', amount: 2, from: 'self_and_hand' }, { type: 'draw', amount: 2 }] };

  if (/^You may place 1 card from your hand at the bottom of your deck: Draw 1 card\.?$/i.test(text)) return { type: 'multi', actions: [{ type: 'bottom_deck', amount: 1, from: 'hand' }, { type: 'draw', amount: 1 }] };

  match = text.match(/^None of your Characters can be K\.O\.'d by your opponent's effects until the end of your opponent's next turn\.?$/i);
  if (match) return { type: 'protection', target: 'your_characters', kind: 'ko', by: 'opponent_effects', duration: 'until_opp_next_turn' };

  match = text.match(/^Then, add up to 1 DON!! card from your DON!! deck and (set|rest) it\.?$/i);
  if (match) return { type: 'add_don', amount: 1, state: match[1] === 'rest' ? 'rested' : 'active' };

  if (/^or return it to the owner's hand\.?$/i.test(text)) return { type: 'return_to_hand', amount: 1, target: { selected: 'previous' } };

  match = text.match(/^You may play 1 \[([^\]]+)\] from your hand: Add up to 1 of your opponent's Characters with a cost of (\d+) or less to the top or bottom of your opponent's Life cards face-up\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'play_card', amount: 1, target: { cardName: match[1], from: 'hand' } }, { type: 'add_to_opp_life_faceup', amount: 1, target: { targetType: 'character', opponent: true, maxCost: Number(match[2]), position: 'top_or_bottom' } }] };

  match = text.match(/^you may select your opponent's Character with a cost of (\d+) or less instead\.?$/i);
  if (match) return { type: 'select_target', amount: 1, target: { targetType: 'character', opponent: true, maxCost: Number(match[1]) }, replacement: true };

  match = text.match(/^with a type including "([^"]+)" or 1 Character with a type including "([^"]+)"$/i);
  if (match) return { type: 'give_don', amount: 1, target: { targetType: 'leader_or_character', typeIncludes: [match[1], match[2]] }, state: 'rested' };

  match = text.match(/^You may rest this Stage and trash 1 Event or Stage card from your hand: Up to 1 of your Leader or Character cards gains \+(\d+) power during this battle\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'rest_self' }, { type: 'trash_card', amount: 1, target: { cardTypes: ['event', 'stage'], from: 'hand' } }, { type: 'give_power', amount: 1, target: 'leader_or_character', value: Number(match[1]), duration: 'battle' }] };

  match = text.match(/^You may rest 1 of your "([^"]+)" type Leader or Stage cards, and return 1 of your "([^"]+)" type Characters with a cost of (\d+) or more to the owner's hand: Return up to 1 of your opponent's Characters with a cost of (\d+) or less to the owner's hand\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'rest_card', amount: 1, target: { targetType: 'leader_or_stage', cardType: match[1] } }, { type: 'return_to_hand', amount: 1, target: { targetType: 'character', cardType: match[2], minCost: Number(match[3]) } }, { type: 'return_to_hand', amount: 1, target: { targetType: 'character', opponent: true, maxCost: Number(match[4]) } }] };

  match = text.match(/^You may rest your Leader or 1 of your Stage cards: If your Leader is \[([^\]]+)\], look at (\d+) cards from the top of your deck; reveal up to (\d+) "([^"]+)" type cards other than \[([^\]]+)\] and add them to your hand\. Then, place the rest at the bottom of your deck in any order, and trash 1 card from your hand\.?$/i);
  if (match) return { type: 'multi', actions: [{ type: 'rest_card', target: 'leader_or_stage' }, { type: 'search_deck', look: Number(match[2]), reveal: Number(match[3]), target: { cardType: match[4], excludeName: match[5] }, action: 'add_to_hand' }, { type: 'place_rest', position: 'bottom' }, { type: 'trash_card', amount: 1, target: { from: 'hand' } }] };

  if (/^\.O'd, you may rest 2 of your cards instead\./i.test(text)) {
    return { type: 'replacement_action', action: { type: 'rest_card', amount: 2, target: { targetType: 'your_cards' } }, optional: true };
  }

  match = text.match(/^set up to (\d+) of your \{([^}]+)\} type Characters and your Leader as active\.?$/i);
  if (match) return { type: 'set_active_multi', amount: Number(match[1]), target: { targetType: 'character_and_leader', cardType: match[2] } };

  match = text.match(/^This Character's base power becomes the same as your opponent's Leader(?:'s)? power during this turn\.?$/i);
  if (match) return { type: 'set_base_power_from_leader', target: 'self', opponent: true, duration: 'turn' };

  // Catch-all for bullet points in options (OP05-096)
  if (/^• Place up to 1 of your opponent's Characters/i.test(text)) {
    return { type: 'play_card', amount: 1, target: { opponent: true, position: 'top_or_bottom' } };
  }

  return null;
}

function repairAst(node) {
  if (Array.isArray(node)) {
    const repairedItems = node.flatMap(child => {
      const repaired = repairAst(child);
      return Array.isArray(repaired) ? repaired : [repaired];
    });
    return repairContextualSequence(repairedItems);
  }
  if (!node || typeof node !== 'object') return node;
  if (node.type === 'unparsed_action') return repairUnparsedAction(node.rawText) || node;

  const repaired = { ...node };
  Object.entries(repaired).forEach(([key, value]) => {
    if (Array.isArray(value) || (value && typeof value === 'object')) repaired[key] = repairAst(value);
  });
  return repaired;
}

function repairContextualSequence(actions) {
  const result = [];

  actions.forEach(action => {
    const previous = result[result.length - 1];
    const previousAction = previous?.type === 'multi'
      ? previous.actions?.[previous.actions.length - 1]
      : previous;

    if (previous?.type === 'multi' && previous.actions?.some(item => item.type === 'gain_keyword' && item.keyword === 'double attack')
      && action?.type === 'give_power' && action.value === 3000 && action.target === 'self') {
      const leaderTarget = { targetType: 'leader', cardType: 'Lucy' };
      previous.actions.forEach(item => {
        if (item.type === 'gain_keyword' && item.keyword === 'double attack') item.target = leaderTarget;
      });
      action.target = leaderTarget;
    }

    if (action?.type === 'unparsed_action' && previous?.type === 'unparsed_action') {
      const combined = `${previous.rawText || ''} ${action.rawText || ''}`.replace(/\s+/g, ' ').trim();
      if (/^Your effects are negated\.?$/i.test(combined)) {
        result[result.length - 1] = { type: 'negate_effect', target: 'self', duration: 'permanent' };
        return;
      }
      if (/^Your opponent's effects are negated until the end of your opponent's next turn\.?$/i.test(combined)) {
        result[result.length - 1] = { type: 'negate_effect', target: 'opponent', duration: 'until_opp_next_turn' };
        return;
      }
    }

    if (action?.type !== 'unparsed_action' || !previous) {
      result.push(action);
      return;
    }

    const text = action.rawText.replace(/\s+/g, ' ').trim();
    let match;

    match = text.match(/^a cost of (\d+) or less$/i);
    if (match && previous.type === 'search_deck') {
      previous.target = { ...(previous.target || {}), maxCost: Number(match[1]), base: true };
      return;
    }

    match = text.match(/^with a power of (\d+) or less from your hand instead\.?$/i);
    if (match && previous.type === 'trash_card') {
      previous.target = { ...(previous.target || {}), maxPower: Number(match[1]), from: 'hand' };
      return;
    }

    match = text.match(/^more from your hand instead\.?$/i);
    if (match && previous.type === 'trash_card') {
      previous.target = { ...(previous.target || {}), minPower: previous.target?.exactPower, from: 'hand' };
      delete previous.target.exactPower;
      return;
    }

    match = text.match(/^and \+(\d+) power during this turn/i);
    if (match && previous.type === 'gain_keyword') {
      result.push({ type: 'give_power', target: 'self_leader', value: Number(match[1]), duration: 'turn' });
      return;
    }

    match = text.match(/^and \+(\d+) power during this turn\.?/i);
    if (match && previousAction?.type === 'gain_keyword') {
      previousAction.duration = 'turn';
      result.push({ type: 'give_power', target: previousAction.target || 'self', value: Number(match[1]), duration: 'turn' });
      return;
    }

    match = text.match(/^for every DON!! card given to that Character\.?$/i);
    if (match && previousAction?.type === 'give_power') {
      previousAction.perX = { source: 'don_given_to_previous_character' };
      return;
    }

    match = text.match(/^with a base power of (\d+)\.?$/i);
    if (match && (previousAction?.type === 'knockout' || previousAction?.type === 'return_to_hand')) {
      previousAction.target = { ...(previousAction.target || {}), exactPower: Number(match[1]) };
      return;
    }

    match = text.match(/^or Stage card with a cost of (\d+) or less from your hand\.?$/i);
    if (match && previousAction?.type === 'play_card') {
      previousAction.target = { ...(previousAction.target || {}), maxCost: Number(match[1]), cardTypes: ['character', 'stage'], from: 'hand' };
      return;
    }

    match = text.match(/^per 1 cost on the revealed card\.?$/i);
    if (match && previousAction?.type === 'boost_power') {
      previousAction.perX = { source: 'revealed_card_cost' };
      return;
    }

    if (/^for each of your Characters with a different card name\.?$/i.test(text) && previousAction?.type === 'boost_power') {
      previousAction.perX = { source: 'unique_character_names' };
      return;
    }

    if (/^with different card names from your hand\.?$/i.test(text) && previousAction?.type === 'play_card') {
      previousAction.target = { ...(previousAction.target || {}), uniqueNames: true, from: 'hand' };
      return;
    }

    match = text.match(/^with a cost or (\d+) or less\.?$/i);
    if (match && previousAction?.type === 'rest_card_or_don') {
      previousAction.target = { ...(previousAction.target || {}), maxCost: Number(match[1]), opponent: true };
      return;
    }

    if (/^Stage card from your hand instead\.?$/i.test(text) && previousAction?.type === 'trash_card') {
      previousAction.target = { ...(previousAction.target || {}), cardTypes: ['event', 'stage'], from: 'hand' };
      return;
    }

    if (/^that is a different color than the returned Character\.?$/i.test(text) && previousAction?.type === 'play_card') {
      previousAction.target = { ...(previousAction.target || {}), differentColorThan: 'returned_character' };
      return;
    }

    match = text.match(/^for every (\d+) of your rested DON!! cards\.?$/i);
    if (match && previousAction?.type === 'give_power') {
      previousAction.perX = { source: 'rested_don', amount: Number(match[1]) };
      return;
    }

    if (/^until the end of your next turn\.?$/i.test(text) && previousAction?.type === 'boost_power') {
      previousAction.duration = 'until_next_turn';
      return;
    }

    match = text.match(/^or more, set up to 1 of your DON!! cards as active\.?$/i);
    if (match && previousAction?.type === 'set_active') {
      previousAction.target = { targetType: 'don', amount: 1 };
      return;
    }

    if (/^until the end of your opponent's next turn\.?$/i.test(text) && previous?.type === 'choice') {
      previous.duration = 'until_opp_next_turn';
      previous.options?.forEach(option => { option.duration = 'until_opp_next_turn'; });
      return;
    }

    if (/^and that Character cannot attack until the end of your opponent's next turn\.?$/i.test(text) && previousAction?.type === 'negate_effect') {
      previousAction.cannotAttack = true;
      previousAction.duration = 'until_opp_next_turn';
      return;
    }

    if (/^or field: K\.O\. up to 1 of your opponent's rested Characters\.?$/i.test(text) && previous?.type === 'choice') {
      const fieldOption = previous.options?.find(option => option.target?.name === 'The Ark Noah');
      if (fieldOption) fieldOption.target.from = 'hand_or_field';
      result.push({ type: 'knockout', amount: 1, target: { targetType: 'character', opponent: true, state: 'rested' } });
      return;
    }

    if (/^Then,? trash the rest\.?$/i.test(text)) {
      const previousAction = previous.type === 'multi'
        ? previous.actions?.[previous.actions.length - 1]
        : previous;
      if (previousAction?.type === 'search_deck' || previousAction?.type === 'play_card') {
        if (previous.type === 'multi') previous.actions.push({ type: 'trash_rest' });
        else result.push({ type: 'trash_rest' });
        return;
      }
    }

    match = text.match(/^Then, give up to 1 of your opponent's Characters (-?\d+) power during this turn\.?$/i);
    if (match) {
      result.push({ type: 'give_power', amount: 1, target: { targetType: 'character', opponent: true }, value: Number(match[1]), duration: 'turn' });
      return;
    }

    match = text.match(/^Then, K\.O\. up to 1 of your opponent's Characters with (\d+) power or less\.?$/i);
    if (match) {
      result.push({ type: 'knockout', amount: 1, target: { targetType: 'character', opponent: true, maxPower: Number(match[1]) } });
      return;
    }

    match = text.match(/^Then, trash (\d+) cards from the top of your deck\.?$/i);
    if (match) {
      result.push({ type: 'trash_card', amount: Number(match[1]), target: { from: 'top_deck' } });
      return;
    }

    match = text.match(/^Then, draw (\d+) cards and trash (\d+) cards from your hand\.?$/i);
    if (match) {
      result.push({ type: 'multi', actions: [{ type: 'draw', amount: Number(match[1]) }, { type: 'trash_card', amount: Number(match[2]), target: { from: 'hand' } }] });
      return;
    }

    if (/^for every Character K\.O\.'d\.?$/i.test(text) && previousAction?.type === 'boost_power') {
      previousAction.perX = { source: 'characters_ko' };
      return;
    }

    if (/^O\.'d during this battle$/i.test(text) && previousAction?.type === 'restriction') {
      previousAction.rule = 'cannot_be_ko';
      previousAction.duration = 'battle';
      return;
    }

    match = text.match(/^or more, set up to (\d+) of your DON!! cards as active\.?$/i);
    if (match && previousAction?.type === 'unparsed_action') return;

    if (/^you may play that card\. If you do, that Character gains \[Rush\] during this turn$/i.test(text)) return { type: 'multi', actions: [{ type: 'play_card', target: 'revealed_card', optional: true }, { type: 'gain_keyword', target: 'previous', keyword: 'rush', duration: 'turn' }] };

    match = text.match(/^Return up to 1 Character with a cost of (\d+) or less to the bottom of the owner's deck\.?$/i);
    if (match) return { type: 'bottom_deck', amount: 1, target: { targetType: 'character', maxCost: Number(match[1]) } };

    match = text.match(/^or more, set up to (\d+) of your DON!! cards as active\.?$/i);
    if (match) return { type: 'set_active', amount: Number(match[1]), target: { targetType: 'don' } };

    if (/^by attribute cards and gains \+(\d+) power$/i.test(text)) return { type: 'multi', actions: [{ type: 'protection', target: 'self', kind: 'ko', by: 'attribute_cards' }, { type: 'give_power', target: 'self', value: 2000, duration: 'turn' }] };

    match = text.match(/^and this Character was played on this turn, K\.O\. up to 1 of your opponent's Characters with a base cost of (\d+) or less\.?$/i);
    if (match) return { type: 'knockout', amount: 1, target: { targetType: 'character', opponent: true, maxCost: Number(match[1]) } };

    match = text.match(/^All of your \[([^\]]+)\] type Character cards without a Counter have a \+(\d+) Counter, according to the rules$/i);
    if (match) return { type: 'set_counter', target: { targetType: 'character', cardType: match[1], noCounter: true }, value: Number(match[2]) };

    match = text.match(/^with a cost of (\d+) or more that is equal to or less than the number of DON!! cards on your opponent's field\.?$/i);
    if (match && previousAction?.type === 'play_card') {
      previousAction.target = { ...(previousAction.target || {}), minCost: Number(match[1]), maxCostBy: 'opponent_don', from: 'hand' };
      return;
    }

    if (/^for every 5 cards in your trash\.?$/i.test(text) && previous?.type === 'multi') {
      previous.actions?.forEach(item => { item.perX = { source: 'trash_count', amount: 5 }; });
      return;
    }

    match = text.match(/^for every (\d+) of your rested DON!! cards\.?$/i);
    if (match && previousAction?.type === 'boost_power') {
      previousAction.perX = { source: 'rested_don', amount: Number(match[1]) };
      return;
    }

    if (/^or more, set up to 1 of your DON!! cards as active\.?$/i.test(text) && previousAction?.type === 'unparsed_action') {
      return;
    }

    if (/^Then, at the end of this turn, return DON!! cards from your field to your DON!! deck until you have the same number of DON!! cards on your field as your opponent\.?$/i.test(text)) {
      result.push({ type: 'return_don_field', untilEqualOpponent: true, duration: 'end_of_turn' });
      return;
    }

    if (/^at the end of this turn\.?$/i.test(text) && previous.type) {
      previous.duration = 'end_of_turn';
      return;
    }

    match = text.match(/^at the end of this turn,? up to 1 rested Character with (\d+) or more DON!! cards given will not become active in your opponent's next Refresh Phase\.?$/i);
    if (match && (previous.type === 'multi' || previous.type === 'give_don_opponent' || previous.type === 'give_don')) {
      result.push({ type: 'cannot_refresh', amount: 1, target: { targetType: 'character', state: 'rested', minDonGiven: Number(match[1]) }, duration: 'until_opp_next_turn' });
      return;
    }

    match = text.match(/^with a base power of (\d+)\.?$/i);
    if (match && previous.target) {
      previous.target.maxPower = Number(match[1]);
      previous.target.base = true;
      return;
    }

    if (/^other than \[Dr$/i.test(text) && previous.type === 'play_card') {
      previous.target = { ...(previous.target || {}), excludeName: 'Dr. Hogback' };
      return;
    }

    if (/^Hogback\] from your trash$/i.test(text) && previous.type === 'play_card') {
      previous.target = { ...(previous.target || {}), excludeName: 'Dr. Hogback', from: 'trash' };
      return;
    }

    match = text.match(/^up to 1 of your \[([^\]]+)\] Characters? gains \[Rush: Character\] and the \"Slash\" attribute during this turn\.?$/i);
    if (match) {
      result.push({ type: 'gain_keyword', target: { targetType: 'character', cardType: match[1] }, keyword: 'rush', duration: 'turn' });
      return;
    }

    // Special cases for OP14-110 and OP16-105: fragmentations of Dr. Hogback
    match = text.match(/^other than \[Dr/i);
    if (match && previous.type === 'play_card') {
      previous.target = { ...(previous.target || {}), exclude: 'Dr. Hogback' };
      return;
    }

    match = text.match(/^up to 1 \[Dr/i);
    if (match && previous.type === 'play_card') {
      // This is a continuation of play_card with named card selection
      previous.target = { ...(previous.target || {}), cardNames: ['Dr. Hogback'] };
      return;
    }

    // For OP03-027: condition on not having [Buchi]
    match = text.match(/^, if you don't have \[([^\]]+)\], play/i);
    if (match && previous.type) {
      // Convert to conditional structure
      const previousCopy = { ...previous };
      result[result.length - 1] = {
        type: 'conditional',
        condition: { type: 'not_have', card: match[1] },
        action: { type: 'play_card', amount: 1, target: { cardName: match[1], from: 'hand' } }
      };
      return;
    }

    // For OP05-096: bullet point option in choose_one
    match = text.match(/^• Place up to 1 of your opponent's Characters/i);
    if (match && previous.type === 'conditional') {
      // This is likely an option in a choose_one that wasn't properly parsed
      result.push({ type: 'play_card', amount: 1, target: { opponent: true } });
      return;
    }

    result.push(action);
  });

  return result;
}

function normalizeKnownCardTargets(card, ast) {
  const text = String(card.effect || '');
  if (Array.isArray(ast)) {
    ast.forEach((node, index) => {
      if (!node || node.proc || !node.type) return;
      const nextProc = ast[index + 1]?.proc;
      const hasTrigger = /\[Trigger\]/i.test(text);
      if (nextProc === 'trigger') {
        node.proc = 'main';
      } else if (hasTrigger && index > 0) {
        node.proc = 'trigger';
      } else if (/\[On Your Opponent's Attack\]/i.test(text)) {
        node.proc = 'onOpponentAttack';
      } else if (/\[When Attacking\]/i.test(text)) {
        node.proc = 'onAttack';
      } else if (/\[End of Your Turn\]/i.test(text)) {
        node.proc = 'onEndTurn';
      } else if (/\[On K\.O\.\]/i.test(text)) {
        node.proc = 'onKO';
      } else if (/\[Counter\]/i.test(text)) {
        node.proc = 'counter';
      } else if (/\[Opponent's Turn\]/i.test(text)) {
        node.proc = 'oppTurn';
      } else if (/\[Your Turn\]/i.test(text)) {
        node.proc = 'yourTurn';
      } else if (/\[On Play\]/i.test(text)) {
        node.proc = 'onPlay';
      } else if (/\[(?:Main|Activate:\s*Main)\]/i.test(text)) {
        node.proc = 'main';
      }
    });
  }
  const visit = (node, callback) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(item => visit(item, callback));
      return;
    }
    callback(node);
    Object.values(node).forEach(value => visit(value, callback));
  };

  if (card.baseCode === 'OP15-009') {
    ast = [{ type: 'replacement_action', scope: 'player', condition: { typeCond: 'base_power_max', max: 7000 }, optional: true, action: { type: 'give_power', target: 'self_leader', value: -2000, duration: 'turn' } }, ...ast.filter(node => node.type !== 'give_power')];
  }
  if (card.baseCode === 'OP15-052') {
    ast = [{ type: 'replacement_action', scope: 'player', condition: { typeCond: 'base_power_max', max: 7000 }, optional: true, action: { type: 'bottom_deck', amount: 1, target: 'self' } }, ...ast.filter(node => node.type !== 'bottom_deck')];
  }
  if (card.baseCode === 'OP08-045') {
    ast = [{ type: 'replacement_action', optional: true, action: { type: 'multi', actions: [{ type: 'trash_self' }, { type: 'draw', amount: 1 }] } }, ...ast.filter(node => node.type !== 'multi')];
  }

  const setLeaderEffect = () => visit(ast, node => {
    if ((node.type === 'gain_keyword' || node.type === 'give_power' || node.type === 'boost_power')
      && (node.target === undefined || node.target === 'self')) {
      node.target = { targetType: 'leader' };
    }
  });

  if (card.baseCode === 'OP03-016' || card.baseCode === 'OP16-003' || card.baseCode === 'EB02-018') {
    setLeaderEffect();
  }

  if (card.baseCode === 'OP04-115') {
    visit(ast, node => {
      if (node.type === 'gain_keyword' && node.keyword === 'double attack') {
        node.target = { targetType: 'character', cardType: 'Land of Wano' };
      }
    });
  }

  if (card.baseCode === 'OP06-101') {
    visit(ast, node => {
      if (node.type === 'gain_keyword' && node.keyword === 'banish') {
        node.target = { targetType: 'leader_or_character' };
      }
    });
  }

  if (/your Leader or Character cards? other than this card gains/i.test(text)) {
    const markTarget = node => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(markTarget);
        return;
      }
      if (['give_power', 'boost_power', 'gain_keyword'].includes(node.type)
        && (node.target === 'leader_or_character' || node.target === undefined)) {
        node.target = { targetType: 'leader_or_character', exclude: 'self' };
      }
      Object.values(node).forEach(markTarget);
    };
    markTarget(ast);
  }

  if (/your \[Lucy\] Leader gains \[Double Attack\] and \+3000 power during this turn/i.test(text)) {
    const leaderTarget = { targetType: 'leader', cardType: 'Lucy' };
    visit(ast, node => {
      if (node.type === 'gain_keyword' && node.keyword === 'double attack') node.target = leaderTarget;
      if (node.type === 'give_power' && node.value === 3000) {
        node.target = leaderTarget;
        node.proc = 'main';
      }
    });
  }
  return ast;
}

function normalizeRawFields(node) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) {
    node.forEach(normalizeRawFields);
    return node;
  }
  if (Array.isArray(node.raw) && node.raw.every(part => typeof part === 'string')) {
    node.raw = node.raw.join('');
  }
  Object.values(node).forEach(normalizeRawFields);
  return node;
}

function normalizeAstTargets(node) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) {
    node.forEach(normalizeAstTargets);
    return node;
  }
  if (node.target && typeof node.target === 'object' && !Array.isArray(node.target)) {
    Object.keys(node.target)
      .filter(key => /^\d+$/.test(key))
      .forEach(key => delete node.target[key]);
  }
  Object.values(node).forEach(normalizeAstTargets);
  return node;
}

function normalizeSourceEffect(effect) {
  return String(effect || '')
    .replace(/Whitebeard Piratess/g, 'Whitebeard Pirates')
    .replace(/\b1o of your opponent's/g, '1 of your opponent\'s');
}

const cardEffects = {};
const needsOverride = [];

let overrideCount = 0, parsedCount = 0, partialCount = 0, nullCount = 0;

cards.forEach(card => {
  const code = card.baseCode;
  if (!code) return;

  if (!card.effect || card.effect === 'NULL') {
    cardEffects[code] = { name: card.name, effect: card.effect, ast: [], source: 'null' };
    nullCount++;
    return;
  }

  if (overrides[code]) {
    cardEffects[code] = { name: card.name, effect: card.effect, ast: overrides[code], source: 'override' };
    overrideCount++;
    return;
  }

  try {
    const sourceEffect = normalizeSourceEffect(card.effect);
    const ast = normalizeAstTargets(normalizeRawFields(normalizeKnownCardTargets({ ...card, effect: sourceEffect }, repairAst(parser.parse(sourceEffect)))));
    if (code === 'OP04-069') {
      const action = ast.find(node => node.type === 'set_power_from_attacker');
      if (action) action.proc = 'onOpponentAttack';
    }
    const unparsedSegments = findUnparsedSegments(ast);
    if (unparsedSegments.length === 0) {
      cardEffects[code] = { name: card.name, effect: sourceEffect, ast, source: 'parsed' };
      parsedCount++;
    } else {
      cardEffects[code] = { name: card.name, effect: sourceEffect, ast, source: 'partial' };
      needsOverride.push({ code, name: card.name, effect: sourceEffect, unparsed_segments: unparsedSegments });
      partialCount++;
    }
  } catch (err) {
    cardEffects[code] = { name: card.name, effect: card.effect, ast: [], source: 'crash' };
    needsOverride.push({ code, name: card.name, effect: card.effect, error: err.message });
    partialCount++;
  }
});

fs.writeFileSync('card_effects.json', JSON.stringify(cardEffects, null, 2));
fs.writeFileSync('needs_override.json', JSON.stringify(needsOverride, null, 2));

console.log('========================================');
console.log('BUILD card_effects.json');
console.log('========================================');
console.log(`Cartes totales        : ${cards.length}`);
console.log(`NULL (pas d'effet)    : ${nullCount}`);
console.log(`Parsées proprement    : ${parsedCount}`);
console.log(`Via override manuel   : ${overrideCount}`);
console.log(`A traiter (needs_override.json) : ${partialCount}`);
console.log('========================================');
