// Normalize parser AST nodes into the ActV3-like vocabulary used by the engine.

const ACTION_KIND_BY_TYPE = {
  add_don: 'GainActiveDon',
  add_to_hand: 'SendToHand',
  add_to_life: 'AddToLife',
  add_to_life_instead_of_draw: 'AddToLifeInsteadOfDraw',
  add_to_life_faceup: 'AddToLifeFaceUp',
  add_to_opp_life_faceup: 'AddOpponentLifeFaceUp',
  add_to_opp_life_facedown: 'AddOpponentLifeFaceDown',
  add_to_owner_life_faceup: 'AddOwnerLifeFaceUp',
  add_life_to_hand: 'TakeLife',
  boost_power: 'BuffPower',
  cannot_attack: 'CantAttack',
  can_attack_active: 'CanAttackActive',
  cannot_activate_blocker: 'DisableBlocker',
  target_cannot_activate_blocker: 'DisableBlocker',
  cannot_be_rested: 'CannotBeRested',
  cannot_attack_any_except: 'CannotAttackExcept',
  select_and_restrict_attack: 'Restriction',
  choose_one: 'ChooseOne',
  choice: 'ChooseOne',
  choose_and_reveal_hand: 'RevealHand',
  choose_cost_reveal: 'ChooseCostReveal',
  activation_condition: 'ActivationCondition',
  conditional_draw: 'DrawCards',
  draw: 'DrawCards',
  draw_and_trash: 'DrawCards',
  draw_until_hand: 'DrawUntilHand',
  opponent_draw: 'DrawOpponent',
  activate_effect: 'ActivateEffect',
  negate_effect: 'Silence',
  give_cost: 'ChangeCost',
  gain_cost: 'ChangeCost',
  give_self_hand_cost: 'ChangeCost',
  freeze_character: 'Freeze',
  freeze_don: 'FreezeDon',
  give_power: 'BuffPower',
  gain_keyword: 'GainKeyword',
  knockout: 'KOCard',
  knockout_multiple: 'KOMultiple',
  knockout_all: 'KOAll',
  knockout_choice: 'KOChoice',
  knockout_or_rest: 'KOOrRest',
  negate_current_effect: 'Silence',
  opponent_choose_and_trash_hand: 'TrashCard',
  opponent_place_trash_to_deck: 'SendToDeckBottom',
  opponent_trash_hand: 'TrashHand',
  opponent_hand_to_deck: 'OpponentHandToDeck',
  opp_return_don: 'ReturnOpponentDon',
  protection: 'Protection',
  protection_by_attribute: 'Protection',
  cannot_refresh: 'Freeze',
  restriction: 'Restriction',
  select_target: 'SelectTarget',
  bottom_deck: 'SendToDeckBottom',
  bottom_deck_all: 'SendAllToDeckBottom',
  trash_to_bottom_deck: 'TrashToDeckBottom',
  bottom_deck_battled_character: 'BottomDeckBattledCharacter',
  place_opponent_life_to_deck: 'SendToDeckBottom',
  place_to_opp_life_faceup: 'PlaceToOpponentLifeFaceUp',
  place_revealed_card: 'SendToDeckBottom',
  play_card: 'DeployCharacter',
  play_self: 'DeployCharacter',
  play_card_from_trash: 'DeployCharacterFromTrash',
  search_deck: 'SearchDeck',
  place_rest: 'PlaceRest',
  replacement_action: 'Replacement',
  instead: 'Replacement',
  reveal_deck_add_hand: 'RevealCard',
  reveal_deck: 'RevealDeck',
  reveal_card: 'RevealCard',
  return_to_hand: 'SendToHand',
  return_to_hand_multi: 'SendToHandMulti',
  return_hand_to_deck: 'ReturnHandToDeck',
  return_self_to_hand: 'ReturnSelfToHand',
  add_self_to_hand: 'ReturnSelfToHand',
  return_trash_to_deck: 'SendToDeckBottom',
  return_don_field: 'ReturnDonField',
  rest_card_or_don: 'Rest',
  rest_card: 'Rest',
  rest_self: 'RestSelf',
  rest_don: 'RestDon',
  rest_don_or_char: 'RestEither',
  rest_opp_don: 'RestOpponentDon',
  give_don: 'GiveDon',
  give_don_multi: 'GiveDonMulti',
  give_don_all: 'GiveDonAll',
  give_don_to_character: 'GiveDon',
  give_don_opponent: 'GiveDonOpponent',
  win_game: 'WinGame',
  deck_rule: 'DeckRule',
  set_active: 'SetActive',
  set_base_power: 'SetBasePower',
  set_power: 'SetBasePower',
  set_base_power_from_leader: 'SetBasePowerFromLeader',
  set_counter: 'SetCounter',
  set_power_from_attacker: 'SetPowerFromAttacker',
  set_active_multi: 'SetActiveMulti',
  set_active_all: 'SetActiveAll',
  set_attack_target: 'SetAttackTarget',
  set_base_power_multi: 'SetBasePowerAll',
  set_play_state: 'SetPlayState',
  shuffle_deck: 'ShuffleDeck',
  trash_card: 'TrashCard',
  trash_hand_target: 'TrashCard',
  trash_typed_cards: 'TrashCard',
  trash_hand: 'TrashHand',
  trash_rest: 'TrashCard',
  trash_life: 'TrashLife',
  trash_both_life: 'TrashBothLife',
  trash_hands_until: 'TrashHandsUntil',
  opponent_trash_life: 'OpponentTrashLife',
  trash_self: 'TrashSelf',
  turn_life_faceup: 'FlipLifeUp',
  turn_life_facedown: 'FlipLifeDown',
  hand_to_deck: 'HandToDeck',
  turn_life_facedown_then: 'FlipLifeDownThen',
  look_at_life: 'LookAtLife',
  look_at_deck: 'LookAtDeck',
  look_and_place: 'LookAndPlace',
  look_reveal_add_place: 'SearchDeck',
  swap_power: 'SwapPower',
  opp_add_life_to_hand: 'OpponentTakeLife',
  trash_life_until: 'TrashLifeUntil',
  take_damage: 'TakeDamage',
  cost_reduction_next_play: 'CostReductionNextPlay',
  draw_returned_count: 'DrawReturnedCount',
  extra_turn: 'ExtraTurn',
  draw_equal_trashed: 'DrawEqualTrashed',
  set_all_don_active: 'SetAllDonActive',
  silence_field: 'SilenceField',
  set_base_power_all: 'SetBasePowerAll',
  set_cost: 'ChangeCost',
  treat_name_as: 'TreatNameAs',
  trash_all_and_play: 'TrashAllAndPlay',
  look_at_life_all: 'LookAtLifeAll',
  play_card_opponent: 'DeployOpponent'
}

export function compileEffectAst(effect) {
  if (!effect || typeof effect !== 'object') return null

  const compiled = {
    proc: compileTrigger(effect),
    oncePerTurn: Boolean(effect.oncePerTurn),
    donReq: effect.donReq,
    optional: Boolean(effect.optional),
    scope: effect.scope,
    cost: compileCost(effect.cost),
    condition: compileCondition(effect.condition),
    actions: compileActions(effect)
  }

  return removeUndefined(compiled)
}

export function compileActions(node) {
  if (!node || typeof node !== 'object') return []
  if (node.type === 'multi' && Array.isArray(node.actions)) {
    return node.actions.flatMap(action => compileActions(action))
  }

  if (node.type === 'conditional') {
    const actions = compileActions(node.action)
    return actions.map(action => ({
      ...action,
      target: action.kind === 'GainKeyword' && !action.target ? { reference: 'previous' } : action.target,
      condition: compileCondition(node.condition)
    }))
  }

  const kind = ACTION_KIND_BY_TYPE[node.type]
  if (!kind) return []

  const action = {
    kind,
    sourceType: node.type,
    amount: node.amount ?? node.value,
    drawAmount: node.draw,
    trashAmount: node.trash,
    value: node.value,
    keyword: node.keyword,
    name: node.name,
    maxPower: node.maxPower,
    maxCost: node.maxCost,
    exclude: node.exclude,
    target: compileTarget(node.target),
    primary: compileTarget(node.primary),
    secondary: compileTarget(node.secondary),
    opponent: node.opponent,
    filter: compileTarget(node.target),
    duration: node.duration,
    state: node.state,
    position: node.position,
    perX: node.perX,
    look: node.look,
    searchAction: node.action || (node.type === 'look_reveal_add_place' ? 'add_to_hand' : undefined),
    shuffle: node.shuffle,
    replacedDrawAmount: node.replacedDrawAmount,
    handSize: node.handSize,
    nestedAction: node.action,
    endState: node.endState,
    noBaseEffect: node.noBaseEffect,
    protectionKind: node.kind,
    protectionBy: node.by,
    attribute: node.attribute,
    except: node.except,
    unless: node.unless,
    rule: node.rule,
    activatedEffect: node.effect,
    activationCondition: node.condition,
    replacementAction: node.action,
    options: node.options,
    targetsMulti: node.targets,
    directTargets: Array.isArray(node.targets) ? node.targets.map(target => compileTarget(target)) : undefined,
    targets: Array.isArray(node.targets) ? node.targets.map(entry => ({
      amount: entry.amount,
      target: compileTarget(entry.target),
      maxPower: entry.target?.maxPower,
      maxCost: entry.target?.maxCost
    })) : undefined,
    costCond: node.costCond,
    powerCond: node.powerCond,
    from: node.from,
    condition: compileCondition(node.condition)
  }

  const actions = [removeUndefined(action)]
  if (node.then) actions.push(...compileActions(node.then))
  return actions
}

export function findUnsupportedActionTypes(node, unsupported = new Set()) {
  if (!node || typeof node !== 'object') return unsupported
  if (Array.isArray(node)) {
    node.forEach(child => findUnsupportedActionTypes(child, unsupported))
    return unsupported
  }

  if (node.type === 'multi' && Array.isArray(node.actions)) {
    node.actions.forEach(child => findUnsupportedActionTypes(child, unsupported))
    return unsupported
  }

  if (node.type === 'conditional') {
    findUnsupportedActionTypes(node.action, unsupported)
    return unsupported
  }

  if (node.type && !ACTION_KIND_BY_TYPE[node.type] && !IGNORED_AST_TYPES.has(node.type)) {
    unsupported.add(node.type)
  }

  if (node.then) findUnsupportedActionTypes(node.then, unsupported)
  return unsupported
}

const IGNORED_AST_TYPES = new Set([
  'errata',
  'explanation',
  'keyword',
  'none',
  'metadata',
  'unlimited_copies'
])

function compileTrigger(effect) {
  if (effect?.triggerCondition) return effect.triggerCondition
  return effect?.proc
}

function compileCost(cost) {
  if (!cost) return undefined
  if (Array.isArray(cost)) return cost.map(compileCost)
  if (typeof cost !== 'object') return cost
  return removeUndefined({
    kind: cost.type,
    amount: cost.amount ?? cost.donAmount,
    target: compileTarget(cost.target),
    powerCond: cost.powerCond,
    costCond: cost.costCond,
    cardType: cost.cardType,
    from: cost.from,
    shuffle: cost.shuffle
  })
}

function compileCondition(condition) {
  if (!condition) return undefined
  if (condition.type === 'and' && Array.isArray(condition.conditions)) {
    return { all: condition.conditions.map(compileCondition) }
  }
  if (condition.type === 'and') {
    return { all: [condition.c1, condition.c2].filter(Boolean).map(compileCondition) }
  }
  return condition
}

function compileTarget(target) {
  if (!target) return undefined
  if (typeof target === 'string') return { reference: target }
  if (typeof target !== 'object') return target
  return removeUndefined({
    reference: target.reference,
    targetType: target.targetType,
    opponent: target.opponent,
    amount: target.amount,
    cardType: target.cardType ?? target.type,
    cardTypes: target.cardTypes,
    cardNames: target.cardNames,
    color: target.color,
    exactCost: target.exactCost,
    name: target.name,
    rawText: target.rawText,
    state: target.state,
    maxCost: target.maxCost,
    minCost: target.minCost,
    maxPower: target.maxPower,
    minPower: target.minPower,
    differentColorFrom: target.differentColorFrom,
    filter: target.filter ? compileTarget(target.filter) : undefined,
    from: target.from,
    all: target.all,
    exclude: target.exclude
  })
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null))
}
