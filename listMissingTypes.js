import fs from 'fs';

const effectsData = JSON.parse(fs.readFileSync('./card_effects.json', 'utf8'));

// Types supportés par le compilateur
const SUPPORTED_TYPES = {
  add_don: true, add_to_hand: true, add_to_life: true, add_to_life_instead_of_draw: true,
  add_to_life_faceup: true, add_to_opp_life_faceup: true, add_to_opp_life_facedown: true,
  add_to_owner_life_faceup: true, add_life_to_hand: true, boost_power: true, cannot_attack: true,
  can_attack_active: true, cannot_activate_blocker: true, cannot_be_rested: true,
  cannot_attack_any_except: true, select_and_restrict_attack: true, choose_one: true,
  choice: true, choose_and_reveal_hand: true, activation_condition: true,
  conditional_draw: true, draw: true, draw_and_trash: true, draw_until_hand: true,
  opponent_draw: true, activate_effect: true, negate_effect: true, give_cost: true,
  gain_cost: true, give_self_hand_cost: true, freeze_character: true, give_power: true,
  gain_keyword: true, knockout: true, knockout_multiple: true, knockout_all: true,
  knockout_choice: true, negate_current_effect: true, opponent_choose_and_trash_hand: true,
  opponent_place_trash_to_deck: true, opponent_trash_hand: true, opponent_hand_to_deck: true,
  opp_return_don: true, protection: true, protection_by_attribute: true, restriction: true,
  select_target: true, bottom_deck: true, bottom_deck_all: true, trash_to_bottom_deck: true,
  bottom_deck_battled_character: true, place_opponent_life_to_deck: true,
  place_to_opp_life_faceup: true, place_revealed_card: true, play_card: true, play_self: true,
  play_card_from_trash: true, search_deck: true, place_rest: true, replacement_action: true,
  instead: true, reveal_deck_add_hand: true, reveal_deck: true, return_to_hand: true,
  return_to_hand_multi: true, return_hand_to_deck: true, return_self_to_hand: true,
  add_self_to_hand: true, return_trash_to_deck: true, rest_card_or_don: true, rest_card: true,
  rest_self: true, rest_don: true, rest_don_or_char: true, rest_opp_don: true, give_don: true,
  give_don_to_character: true, give_don_opponent: true, win_game: true, deck_rule: true,
  set_active: true, set_base_power: true, set_power: true, set_power_from_attacker: true,
  set_active_multi: true, shuffle_deck: true, trash_card: true, trash_life: true,
  trash_both_life: true, trash_hands_until: true, opponent_trash_life: true, trash_self: true,
  turn_life_faceup: true, turn_life_facedown: true, hand_to_deck: true,
  turn_life_facedown_then: true, look_at_life: true, look_at_deck: true, look_and_place: true,
  look_reveal_add_place: true, swap_power: true, opp_add_life_to_hand: true,
  trash_life_until: true, cost_reduction_next_play: true, draw_returned_count: true,
  extra_turn: true, draw_equal_trashed: true, set_all_don_active: true, silence_field: true,
  set_base_power_all: true, multi: true, conditional: true
};

const unsupported = new Set();
const cardsByUnsupported = {};

Object.entries(effectsData).forEach(([cardId, effect]) => {
  if (!effect?.actions) return;
  
  const walkActions = (actions) => {
    if (!Array.isArray(actions)) return;
    actions.forEach(action => {
      if (action?.type && !SUPPORTED_TYPES[action.type]) {
        unsupported.add(action.type);
        if (!cardsByUnsupported[action.type]) cardsByUnsupported[action.type] = [];
        cardsByUnsupported[action.type].push(cardId);
      }
      if (action?.actions) walkActions(action.actions);
    });
  };
  walkActions(effect.actions);
});

console.log('Types MANQUANTS au compilateur:');
if (unsupported.size === 0) {
  console.log('  Aucun!');
} else {
  Array.from(unsupported).sort().forEach(t => {
    const count = cardsByUnsupported[t]?.length || 0;
    console.log(`  ${t}: ${count} cartes`);
  });
}
