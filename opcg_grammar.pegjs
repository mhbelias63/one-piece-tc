// ============================================================================
// ONE PIECE CARD GRAMMAR HELPER (OPCGH) - FULL GRAMMAR
// ============================================================================

Effects
  = NullEffect
  / head:Block tail:(_? Separator? _? b:Block { return b; })* _? Separator? _? {
      return [head, ...tail].flat();
    }

NullEffect
  = "NULL"i _ { return []; }

Separator
  = "." / "\n" / "\r" / ";"

Block
  = tags:TagList _? !(WhenCondition / CostClause / IfCondition / EffectBody) {
      const res = { proc: "passive" };
      tags.forEach(t => {
        if (t.type === "proc") res.proc = t.value;
        if (t.type === "donReq") res.donReq = t.value;
        if (t.type === "oncePerTurn") res.oncePerTurn = true;
      });
      const bodyResult = res.proc === "blocker_tag" ? { type: "keyword", keyword: "blocker" } : { type: "none" };
      return Object.assign(res, bodyResult);
    }
  / tags:TagList? _? triggerCond:WhenCondition? _? ","? _? cost:CostClause? _? cond:IfCondition? _? body:EffectBody _? [.;]? _? ErrataText? {
      const res = { proc: triggerCond ? "onTrigger" : "passive" };
      if (tags) {
        tags.forEach(t => {
          if (t.type === "proc") res.proc = t.value;
          if (t.type === "donReq") res.donReq = t.value;
          if (t.type === "oncePerTurn") res.oncePerTurn = true;
        });
      } else {
        res.proc = "main";
      }
      if (triggerCond) res.triggerCondition = triggerCond;
      if (cost) res.cost = cost;
      if (cond) res.condition = cond;
      return Object.assign(res, body);
    }

TagList
  = head:Tag tail:(_? SlashSeparator? _? t:Tag { return t; })* {
      return [head, ...tail];
    }

SlashSeparator
  = "/"

Tag = ProcTag / DonReqTag / OncePerTurnTag

// --- TAGS (DECLENCHEURS ET CONDITIONS SYSTEME) ---
ProcTag
  = "[" _ name:(
      "Activate:Main"i / "Activate: Main"i / "Main"i / "Trigger"i / "Counter"i /
      "When Attacking"i / "On Play"i / "On Block"i / "On K.O."i / 
      "On Your Opponent's Attack"i / "On Your Opponent’s Attack"i /
      "On Your Opponent" ("'" / "’") "s"i? _ "Attack"i /
      "End of Your Turn"i / "Your Turn"i / "Opponent" ("'" / "’") "s Turn"i / "Blocker"i /
      "This Character gains"i [^\]]+
    ) _ ("]" / &"(" / &" " / &".") {
      const str = Array.isArray(name) ? name.join("") : String(name);
      const lower = str.toLowerCase();
      let val = "onPlay";
      if (lower.startsWith("this character gains")) val = "passive";
      else if (lower === "activate:main" || lower === "activate: main" || lower === "main") val = "main";
      else if (lower === "trigger") val = "trigger";
      else if (lower === "counter") val = "counter";
      else if (lower === "when attacking") val = "onAttack";
      else if (lower === "on block") val = "onBlock";
      else if (lower === "on k.o.") val = "onKO";
      else if (lower.includes("opponent") && lower.includes("attack")) val = "onOpponentAttack";
      else if (lower === "end of your turn") val = "onEndTurn";
      else if (lower === "your turn") val = "yourTurn";
      else if (lower.includes("opponent") && lower.includes("turn")) val = "oppTurn";
      else if (lower === "blocker") val = "blocker_tag";
      return { type: "proc", value: val };
    }

DonReqTag
  = "[" _ "DON!!"i " "i? ("x"i / "X"i / "×" / "✕") count:Number _ "]" { return { type: "donReq", value: count }; }
  / "DON!!"i _ count:Number _ "," { return { type: "donReq", value: count }; }

OncePerTurnTag
  = "[" _ "Once Per Turn"i _ "]" { return { type: "oncePerTurn", value: true }; }

// --- CONDITIONS ET TRIGGERS ---
WhenCondition
  = "When"i _ text:UntilKOOrCommaOrColon { return text; }
  / "When"i _ text:UntilCommaOrColon { return text; }

UntilKOOrCommaOrColon
  = chars:(!" then"i !" give"i !" gain"i !(Acronym) c:[^,:\.] { return c; })+ ko:("K.O.’d"i / "K.O.'d"i) !(" by"i / " in"i / " from"i / " on"i / " or"i) {
      return (chars.join("") + ko).trim();
    }

IfCondition
  = "If"i _ cond:ConditionClause { return cond; }
  / "If"i _ text:UntilCommaOrColon { return { type: "condition", text: text }; }

ConditionClause
  = c1:SingleCondition _ ","i _ c2:SingleCondition _ "and"i _ c3:SingleCondition _ ","i? _ { return { type: "and", conditions: [c1, c2, c3] }; }
  / c1:SingleCondition _ "and"i _ c2:SingleCondition _ "and"i _ c3:SingleCondition _ ","i? _ { return { type: "and", conditions: [c1, c2, c3] }; }
  / c1:SingleCondition _ "and"i _ c2:SingleCondition _ ","i? _ { return { type: "and", c1, c2 }; }
  / c1:SingleCondition _ ","i? _ { return c1; }

SingleCondition
  = "you and your opponent have a total of"i _ count:Number _ "or less Life cards"i { return { typeCond: "total_life", max: count }; }
  / "there is a"i _ name:BracketedString _ "Character"i { return { typeCond: "has_character", name: name }; }
  / "the selected card attacks during this turn"i { return { typeCond: "selected_card_attacks", duration: "turn" }; }
  / "your opponent has"i _ count:Number _ "or more rested cards"i { return { typeCond: "opp_rested_cards_min", min: count }; }
  / "the revealed card is a Character card with"i _ power:Number _ "power or more"i { return { typeCond: "revealed_card_character_power_min", minPower: power }; }
  / "the revealed card has a cost of"i _ cost:Number _ "or more"i { return { typeCond: "revealed_card_cost_min", minCost: cost }; }
  / "you have"i _ count:Number _ "or less Life cards and your Leader's type includes"i _ typeStr:QuotedString { return { typeCond: "life_and_leader", lifeMax: count, leaderIncludes: typeStr }; }
  / "you have"i _ count:Number _ "or less Life cards"i { return { typeCond: "life_max", max: count }; }
  / "you have"i _ count:Number _ "or less Characters"i { return { typeCond: "char_max", max: count }; }
  / "you have"i _ count:Number _ "or more cards in your trash"i { return { typeCond: "trash_min", min: count }; }
  / "you have"i _ count:Number _ "or less cards in your hand"i { return { typeCond: "hand_max", max: count }; }
  / "you have"i _ count:Number _ "or less cards"i _ "in your hand"i { return { typeCond: "hand_max", max: count }; }
  / "you only have Characters with a type including"i _ typeStr:BracketedOrQuotedString { return { typeCond: "only_characters_type", value: typeStr }; }
  / "you have a"i _ name:BracketedString _ (!("," / ".") .)* { return { typeCond: "has_card_name", value: name }; }
  / "you have"i _ name:BracketedString (!("," / ".") .)* { return { typeCond: "has_card_name", value: name }; }
  / "you have a Character with"i _ power:Number _ "power or more and a type including"i _ typeStr:QuotedString { return { typeCond: "char_power_type", minPower: power, typeIncludes: typeStr }; }
  / "you have no Characters with a type including"i _ typeStr:QuotedString _ "and a cost of"i _ cost:Number _ "or more"i { return { typeCond: "no_char_type_cost", typeIncludes: typeStr, minCost: cost }; }
  / "all of your DON!! cards are rested"i { return { typeCond: "all_don_rested" }; }
  / "your opponent has"i _ count:Number _ "or more Life cards"i { return { typeCond: "opp_life_min", min: count }; }
  / "your opponent has"i _ count:Number _ "or less Life cards"i { return { typeCond: "opp_life_max", max: count }; }
  / "your Leader's type includes"i _ typeStr:BracketedOrQuotedString { return { typeCond: "leader_includes", value: typeStr }; }
  / "your Leader's type include"i _ typeStr:BracketedOrQuotedString { return { typeCond: "leader_includes", value: typeStr }; }
  / "your Leader is"i _ typeStr:BracketedOrQuotedString { return { typeCond: "leader_is", value: typeStr }; }
  / "your Leader has the"i _ typeStr:BracketedOrQuotedString _ "type"i { return { typeCond: "leader_has", value: typeStr }; }
  / "this Character has"i _ power:Number _ "power or more"i { return { typeCond: "self_power_min", min: power }; }
  / "you have a"i _ target:TargetFilter { return { typeCond: "has_target", value: target }; }
  / text:UntilCommaOrColon { return { typeCond: "generic", text: text }; }

UntilCommaOrColon
  = chars:(!" then"i !" give "i !" gain "i c:(Acronym / [^,:\.]) { return c; })+ { return chars.join("").trim(); }

PostCondition
  = ("if"i / "when"i / "whenever"i) _ text:(!(SentenceSeparator / "during this" / ".") c:. {return c;})+ { return text.join("").trim(); }

// --- COÛTS DE JEU ET DON!! ---
CostClause
  = ","i? _ "You may"i _ cost:CostList ":" { return cost; }
  / ","i? _ "You can"i _ cost:CostList ":" { return cost; }
  / cost:DonMinusCost _ ":"? { return cost; }
  / "(" count:Number ")" _ ExplanationText? _? ":" { return { type: "rest_don_cost", amount: count }; }
  / ":" { return { type: "free_cost" }; }

CostList
  = head:SingleCost tail:(_ ("and"i / ",") _ c:SingleCost { return c; })* {
      return [head, ...tail].flat();
    }

SingleCost
  = RestDonAndSelfCost
  / RestLeaderOrStageCost
  / ReturnTrashToDeckCost
  / PlaceCharacterOwnerDeckCost
  / AddLifeAreaCost
  / KOOwnCharCost
  / PlaceOwnCharBottomDeckCost
  / PlaceThisCharacterBottomDeckCost
  / TurnLifeFaceUpCost
  / TrashCharacterPowerCost
  / TrashTypedCardsCost
  / TrashHandCost 
  / TrashLifeCost 
  / GiveOpponentDonCost
  / RevealHandCost
  / GiveDonCost
  / ReturnDonFieldCost
  / RestDonCost 
  / RestTypedLeaderOrStageCost
  / RestCharactersCost
  / RestSelfCost 
  / DonMinusCost
  / PlaceTrashToDeckCost
  / PlaceOwnerDeckCost
  / GiveOwnPowerCost
  / TrashSelfCost

RestLeaderOrStageCost
  = "rest your"i _ ("1"i _)? target:("Leader"i / "Stage"i / "card"i) {
      return { type: "rest_self", target: target.toLowerCase() };
    }

ReturnTrashToDeckCost
  = "return"i _ count:Number _ "cards from your trash to your deck and shuffle it"i {
      return { type: "return_trash_to_deck", amount: count, shuffle: true };
    }

PlaceCharacterOwnerDeckCost
  = "place"i _ count:Number _ "of your"i _ target:TargetFilter _ "at the bottom of the owner's deck"i _ ("in any order"i)? {
      return { type: "place_own_bottom_deck", amount: count, target: target, owner: "owner" };
    }

AddLifeAreaCost
  = "add"i _ count:Number _ "card"i "s"i? _ "from your Life area to your hand"i {
      return { type: "add_life_to_hand", amount: count, position: "any", asCost: true };
    }

TrashCharacterPowerCost
  = "trash"i _ count:Number _ "of your Characters with"i _ power:Number _ "power or more"i {
      return { type: "trash_character", amount: count, powerCond: { minPower: power } };
    }

TrashTypedCardsCost
  = "trash"i _ "any number of"i _ type:BracketedString _ "type cards from your hand"i {
      return { type: "trash_typed_cards", amount: "any", cardType: type, from: "hand" };
    }

RestDonAndSelfCost
  = "rest"i _ count:Number _ "of your DON!!"i " cards"i? _ "and this"i _ ("Character"i / "Leader"i / "Stage"i) {
      return { type: "rest_don_and_self", donAmount: count };
    }

KOOwnCharCost
  = "You may K.O."i _ count:Number _ "of your"i _ target:TargetFilter {
      return { type: "ko_own_character", amount: count, target: target };
    }

PlaceOwnCharBottomDeckCost
  = "place"i _ count:Number _ "of your"i _ target:TargetFilter _ "at the bottom of your deck"i {
      return { type: "place_own_char_bottom_deck", amount: count, target: target };
    }

PlaceThisCharacterBottomDeckCost
  = "place this Character"i _ "and"i _ count:Number _ target:BracketedString _ "with"i _ power:Number _ "power from your trash"i _ "at the bottom of your deck"i _ ("in any order"i)? {
      return { type: "place_self_and_named_bottom_deck", amount: count, name: target, power: power };
    }
  / "place this Character at the bottom of the owner's deck"i {
      return { type: "place_self_bottom_deck" };
    }

TurnLifeFaceUpCost
  = "turn"i _ count:Number _ "card"i "s"i? _ "from the top of your Life cards face-up"i {
      return { type: "turn_life_faceup", amount: count };
    }

TrashSelfCost
  = "trash this Character"i { return { type: "trash_self" }; }

RevealHandCost
  = "reveal"i _ "up to"i? _ count:Number _ target:TargetFilter { return { type: "reveal_hand_cost", amount: count, target: target }; }

RestCharactersCost
  = "rest"i _ count:Number _ "of your"i _ target:TargetFilter { return { type: "rest_characters_cost", amount: count, target: target }; }

GiveOwnPowerCost
  = "give your"i _ target:("1 active Leader"i { return "leader"; } / t:TargetFilter { return t; }) _ sign:("-" / "–" / "+") val:Number _ "power"i _ Duration? {
      return { type: "give_own_power_cost", target: target, value: (sign === "+" ? val : -val) };
    }

ReturnDonFieldCost
  = "return"i _ ("1 or more"i / count:Number {return count}) _ "DON!! card"i "s"i? _ "from your field to your DON!! deck"i {
      return { type: "return_don_field", amount: (typeof count === "number" ? count : 1) };
    }
  / "return"i _ count:Number _ "of your"i _ TargetState? "DON!! card"i "s"i? _ "to your DON!! deck"i {
      return { type: "return_don_field", amount: count };
    }

GiveOpponentDonCost
  = "give"i _ count:Number _ "of your opponent's"i _ state:TargetState? "DON!! card"i "s"i? _ "to"i _ text:(!(":") c:. {return c;})+ { 
      return { type: "give_opp_don_cost", amount: count, target: text.join("").trim() }; 
    }

GiveDonCost
  = "give"i _ count:Number _ state:TargetState? "DON!! card"i "s"i? _ "to"i _ text:(!(":") c:. {return c;})+ { 
      return { type: "give_don_cost", amount: count, target: text.join("").trim() }; 
    }

DonMinusCost
  = "DON!!"i _ [-–]? _? count:Number _ ExplanationText? {
      return { type: "return_don", amount: count };
    }

TrashHandCost
  = "trash"i _ "any number of"i _ ("Event or Stage"i / "Event or Stage cards"i) _ "from your hand"i { return { type: "trash_hand_target", amount: "any", target: { targetType: "event_or_stage" } }; }
  / "trash"i _ "up to"i? _ count:Number _ target:TargetFilter _ ("from your hand"i)? { return { type: "trash_hand_target", amount: count, target: target }; }
  / "trash"i _ "any number of"i _ target:TargetFilter _ ("from your hand"i)? { return { type: "trash_hand_target", amount: "any", target: target }; }
  / "trash"i _ count:Number _ "card"i "s"i? _ "from your hand"i { return { type: "trash_hand", amount: count }; }
  / "trash"i _ count:Number _ typeStr:TypeName _ "from your hand"i { return { type: "trash_hand_type", amount: count, cardType: typeStr }; }

TrashLifeCost
  = "trash"i _ count:Number _ "card"i "s"i? _ "from"i _ ("the top or bottom of"i _)? "your Life"i { return { type: "trash_life", amount: count }; }

RestDonCost
  = "rest"i _ count:Number _ "of your DON!!"i " cards"i? { return { type: "rest_don", amount: count }; }

RestTypedLeaderOrStageCost
  = "rest"i _ count:Number _ "of your"i _ typeName:(QuotedString / BracketedString / CurlyString) _ "type Leader or Stage cards"i {
      return { type: "rest_typed_leader_or_stage", amount: count, cardType: typeName };
    }

RestSelfCost
  = "rest this"i _ ("Character"i / "Leader"i / "Stage"i / "Card"i) { return { type: "rest_self" }; }

PlaceTrashToDeckCost
  = "place"i _ count:Number _ "card"i "s"i? _ filter:(!"from your trash"i .)* "from your trash at the bottom of your deck"i [^:]* {
      return { type: "trash_to_bottom_deck", amount: count, filter: filter.map(c => c[1]).join("").trim() };
    }

PlaceAnyFromTrashAction
  = "place any number of"i _ targetType:TargetType "s"i? _ attrs:TargetAttributes _ "from your trash at the bottom of your deck"i _ ("in any order"i)? {
      return { type: "trash_to_bottom_deck", amount: "any", target: { targetType: targetType, ...attrs } };
    }

PlaceOwnerDeckCost
  = "place"i _ count:Number _ target:TargetFilter _ "at the bottom of the owner's deck"i {
      return { type: "place_owner_deck", amount: count, target: target };
    }

// --- STRUCTURE ET ACTIONS DES EFFETS ---
EffectBody
  = ChoiceEffect / ConditionalAction / MultiAction / SimpleEffect / StandaloneTagWithExplanation

ConditionalAction
  = cond:IfCondition _? ","? _? action:SingleAction _? [.;]? _? ExplanationText? {
      return { type: "conditional", condition: cond, action: action };
    }

ChoiceEffect
  = left:SingleAction _ "or"i _ right:ChoiceRightSide {
      return { type: "choice", options: [left, right] };
    }

ChoiceRightSide
  = SingleAction
  / OpponentPrefix target:TargetFilter { return { type: "knockout", target: target }; }

MultiAction
  = head:SingleAction tails:(_ SentenceSeparator _ tail:MultiTailAction { return tail; })+ {
      return { type: "multi", actions: [head, ...tails] };
    }
  / head:SingleAction tails:(_ ","? _ ("and then"i / "and"i / "Then,"i / "Then"i) _ tail:MultiTailAction { return tail; })+ {
      return { type: "multi", actions: [head, ...tails] };
    }

MultiTailAction
  = ConditionalAction / SingleAction

SentenceSeparator
  = [.;] WS "Then,"i _
  / [.;] WS "Then"i _
  / [.;] WS "then,"i _
  / [.;] WS "then"i _
  / [.;] WS &( [A-Z] )
  / [.;] _ &( NextTag )

SimpleEffect
  = _? ","? _? action:SingleAction _? [.;]? _? ExplanationText? { return action; }

StandaloneTagWithExplanation
  = [.]? _? text:ExplanationText { return { type: "none" }; }

ExplanationText
  = "(" [^)]+ ")"
  / "(" [^)]+

ErrataText
  = "This card has been officially errata'd."i

OrphanClosingExplanation
  = ".)" { return { type: "none" }; }

SingleAction
  = ThenConditionalAction
  / OrphanClosingExplanation
  / NegateIfCharacterPresentAction
  / NegateCurrentEffectAction
  / ProtectionByAttributeContinuation
  / RevealAndShuffleAction
  / RevealNamedAndShuffleAction
  / LookAtOpponentDeckAction
  / SelectAndConditionalAttackRestrictionAction
  / FloatingExplanation
  / FloatingErrata
  / FloatingInstead
  / FloatingReplacementAction
  / ReplacementContinuationAction
  / ReplacementEffectAction
  / ActivateEffectAction
  / ActivationConditionAction
  / BottomDeckAction
  / ReturnThenPlayDifferentColorAction
  / BounceAction
  / GiveDonAction
  / GivePowerAction
  / GiveThatCardPowerAction
  / GiveCostAction
  / GiveHandTypeCostAction
  / SetCostAction
  / SetPowerAction
  / CostReductionAction
  / LookAndRevealPlaceAction
  / LookAtLifeAction
  / LookAndPlaceAction
  / AddDeckToLifeAction
  / PlaceAnyFromTrashAction
  / PlaceHandToDeckAction
  / OpponentHandToDeckAction
  / SelectAction
  / ChooseRevealHandAction
  / ChooseAndTrashHandAction
  / SwapPowerAction
  / CanAttackActiveAction
  / CannotActivateBlockerAction
  / DrawAndTrashAction
  / DrawUntilHandAction
  / DrawReturnedCountAction
  / DrawAction
  / ConditionalOptionalDrawAction
  / DrawAndTrashSameNumberAction
  / SearchDeckAction
  / PlaceRestAndPlayAction
  / PlaceRestAction
  / TrashRestAction
  / TrashAnyNumberAction
  / TrashTypedCardsAndBoostAction
  / TrashTargetAction
  / KOAction
  / TrashSelfOptionalAction
  / PlayThatCardRestedAction
  / PlaySelfAction
  / PlayWithFieldDonCostAction
  / PlayCardAction
  / BoostPowerAction
  / AddLifeToHandAction
  / AddTargetToHandAction
  / AddSelfToHandAction
  / AddTargetToOppLifeAction
  / PlaceOpponentLifeToOwnerDeckAction
  / AddFromHandToLifeFaceUpAction
  / OpponentAddLifeToHandAction
  / DamageAction
  / NegateAfterHandTrashAction
  / PlaceTargetToOppLifeAction
  / GiveDonToCharacterAction
  / AddDonAction
  / AddDonAndSetActiveAction
  / RevealDeckAction
  / ChooseCostAction
  / PlaceRevealedCardAction
  / TrashLifeUntilAction
  / TrashDeckAction
  / RestAction
  / RestSelfAction
  / RestItAction
  / SetActiveAction
  / GainKeywordAction
  / GainCostAction
  / StandaloneCostGainAction
  / StandalonePowerGainAction
  / StandaloneKeywordAction
  / OpponentTrashAction
  / TrashAllHandAction
  / OpponentRevealHandAction
  / OpponentDrawAction
  / OpponentAddLifeToHandAction
  / OpponentReturnDonAction
  / OpponentPlaceTrashToDeckAction
  / FreezeAction
  / RestPreventionAction
  / NegateEffectAction
  / ShuffleDeckAction
  / ReturnHandToDeckAction
  / TurnLifeFaceDownAction
  / TurnLifeFaceDownThenAction
  / ChooseOneAction
  / UnlimitedCopiesAction
  / TreatNameAsAction
  / WinGameAction
  / PassiveProtectionAction
  / ImplicitSelfProtectionAction
  / CannotAttackAnyCardAction
  / CannotAttackTargetAction
  / CannotAction
  / UnparsedAction

UnparsedAction
  = chars:( Acronym / Char )+ {
      const text = chars.join("").trim();
      if (text === "." || text === "," || text === ";" || text === "") return { type: "none" };
      return { type: "unparsed_action", rawText: text };
    }

NegateIfCharacterPresentAction
  = "If there is a"i _ name:BracketedString _ "Character, this effect is negated"i [.]? {
      return { type: "negate_if_character_present", character: name };
    }

NegateCurrentEffectAction
  = "this effect is negated"i [.]? { return { type: "negate_current_effect" }; }

ProtectionByAttributeContinuation
  = "by"i _ typeStr:QuotedString _ "attribute"i _ ("card"i / "cards"i / "Characters"i) {
      return { type: "protection_by_attribute", attribute: typeStr };
    }

Acronym = "K.O.’d"i / "K.O.'d"i / "K.O.’s"i / "K.O.'s"i / "K.O."i / "D."i / "O."i
Char = !(SentenceSeparator / NextTag) c:. { return c; }

NextTag
  = _? "[" _ ("Activate"i / "Main"i / "Trigger"i / "Counter"i / "When Attacking"i / "On Play"i / "On Block"i / "On K.O."i / "End of Your Turn"i / "Your Turn"i / "On Your Opponent's Attack"i / "On Your Opponent’s Attack"i / "Opponent" ("'" / "’") "s Turn"i / "DON!!"i / "Once Per Turn"i)
ThenConditionalAction
  = ("Then,"i / "Then"i) _ cond:IfCondition _ ","? _ action:SingleAction _ [.;]? {
      return { type: "conditional", condition: cond, action: action };
    }

FloatingExplanation
  = "."? _? text:ExplanationText { return { type: "explanation", raw: text }; }

FloatingErrata
  = "This card has been officially errata'd."i { return { type: "errata" }; }
  / "Disclaimer:"i text:.+ { return { type: "metadata", text: text.join("").trim() }; }

FloatingInstead
  = "instead of drawing"i _ count:Number _ "card"i "s"i? { return { type: "instead", action: "draw", amount: count }; }
  / "instead of drawing 1 card"i { return { type: "instead", action: "draw", amount: 1 }; }
  / "instead"i { return { type: "instead" }; }

FloatingReplacementAction
  = action:ReplacementAction _ "instead"i { return { type: "replacement_action", action: action }; }

ActivationConditionAction
  = "This effect can be activated when"i _ text:(!(SentenceSeparator) c:. {return c;})+ { 
      return { type: "activation_condition", condition: text.join("").trim() }; 
    }
  / "This effect can be activated at the start of your turn"i {
      return { type: "activation_condition", condition: "start_of_your_turn" };
    }

ReplacementEffectAction
  = "If "i target:("this Character"i / "this Leader"i / "your "i t:TargetFilter {return t}) _ "would be "i trigger:("K.O."i ("'"/"’")? "d"i / "removed from the field"i / "rested"i) _ by:("by your opponent's effect"i "s"i? / "by your opponent's Character's effect"i / "by your opponent's Leader or Character effect"i)? ","i? _ action:ReplacementAction (" instead"i)? "."i? {
      return { type: "replacement_effect", target: target, trigger: trigger, action: action };
    }

ReplacementAction
  = "you may add it to the top of your Life cards face-down instead"i {
      return { action: "add_to_life_facedown", target: "it" };
    }
  / "you may give that Character"i _ value:Number _ "power during this turn instead of that Character being K.O.'d"i {
      return { action: "give_power", target: "that_character", value: value };
    }
  / "you may give"i _ target:("that Character"i / "this Character"i) _ sign:("+" / "-" / "–")? val:Number _ "power"i _ Duration? _ ("instead of"i _ [^.]+)? {
      return { action: "give_power", target: "that_character", value: val };
    }
  / "you may rest your Leader or 1"i _ target:BracketedString _ "instead"i {
      return { action: "rest_card", target: { targetType: "named_card", name: target }, amount: 1 };
    }
  / "you may rest 1 of your cards"i { return { action: "rest_card", target: "your_card", amount: 1 }; }
  / "you may rest this Character"i { return "rest_self"; }
  / "you may trash this Character"i { return "trash_self"; }
  / "you may rest 1 of your other Characters"i { return "rest_other"; }
  / "you may return"i _ count:Number _ "DON!! card"i "s"i? _ "from your field to your DON!! deck"i { return "return_don"; }
  / "you may place"i _ count:Number _ "cards from your trash at the bottom of your deck"i _ ("in any order"i)? { return "trash_to_bottom_deck"; }
  / "you may turn"i _ count:Number _ "card"i "s"i? _ "from the top of your Life cards face-up"i { return "turn_life_faceup"; }

ReplacementContinuationAction
  = "you may add it to the top of your Life cards face-down instead"i {
      return { type: "replacement_action", action: { action: "add_to_life_facedown", target: "it" } };
    }
  / "you may give that Character"i _ value:Number _ "power during this turn instead of that Character being K.O.'d"i {
      return { type: "replacement_action", action: { action: "give_power", target: "that_character", value: value } };
    }

SelectAction
  = "Select your Leader or 1 of your"i _ type:CurlyString _ "type Characters"i { return { type: "select_target", amount: 2, target: { targetType: "leader_or_character", cardType: type } }; }
  / "Select your Leader and 1 Character"i { return { type: "select_target", amount: 2, target: { targetType: "leader_or_character" } }; }
  / "Select"i _ "up to"i? _ count:Number _ "of your opponent's"i _ filter:TargetFilter {
      return { type: "select_target", amount: count, target: filter, opponent: true };
    }
  / "Select"i _ "up to"i? _ count:Number _ "of your"i _ filter:TargetFilter { 
      return { type: "select_target", amount: count, target: filter }; 
    }

ChooseRevealHandAction
  = "Choose"i _ count:Number _ "cards from your opponent's hand"i _ ";"? _ "your opponent reveals those cards"i {
      return { type: "choose_and_reveal_hand", amount: count, target: "opponent_hand" };
    }

ChooseAndTrashHandAction
  = "Your opponent chooses"i _ count:Number _ "card"i "s"i? _ "from your hand"i _ ";"? _ "trash"i _ ("that card"i / "those cards"i) {
      return { type: "opponent_choose_and_trash_hand", amount: count };
    }
  / "Choose"i _ count:Number _ "card from your opponent's hand"i _ ";"? _ "your opponent reveals that card"i {
      return { type: "choose_and_reveal_hand", amount: count, target: "opponent_hand" };
    }

SwapPowerAction
  = "Swap the base power of the selected cards with each other"i _ duration:Duration? {
      return { type: "swap_power", duration: duration || "turn" };
    }
  / "Swap the base power of the selected Characters with each other"i _ duration:Duration? {
      return { type: "swap_power", duration: duration || "turn" };
    }

ChooseCostAction
  = "Choose a cost and reveal 1 card from the top of your opponent's deck"i {
      return { type: "choose_cost_reveal" }; 
    }

FreezeAction
  = subject:FreezeSubject _ ("that has"i _ PowerCondition)? _ "will not become active in"i _ ("your opponent's"i / "your"i / "the"i)? _ "next Refresh Phase"i {
      return { type: "freeze_character", ...subject };
    }

FreezeSubject
  = "All of"i _ OpponentPrefix? target:FreezeTarget { return { amount: "all", target: target }; }
  / "Up to"i _ ("a total of"i _)? count:Number _ "of your opponent's rested Leader and Character cards"i { return { amount: count, target: { targetType: "leader_and_character", state: "rested" } }; }
  / "Up to"i _ ("a total of"i _)? count:Number _ "of"i _ OpponentPrefix? target:FreezeTarget { return { amount: count, target: target }; }
  / "this Character"i { return { target: "self" }; }
  / "the selected Character"i { return { target: "selected" }; }
  / "the selected cards"i { return { target: "selected" }; }

FreezeTarget
  = "your opponent's rested Leader and Character cards"i { return { targetType: "leader_and_character", state: "rested" }; }
  / "your opponent's rested DON!! cards"i { return { targetType: "don", state: "rested" }; }
  / TargetFilter

RestPreventionAction
  = "Up to"i _ count:Number _ "of"i _ OpponentPrefix? target:TargetFilter _ "cannot be rested until"i _ "the end of"i _ ("your opponent's"i / "your"i)? _ ("next End Phase"i / "next turn"i) {
      return { type: "cannot_be_rested", amount: count, target: target };
    }

NegateEffectAction
  = "Negate the effect of up to"i _ count:Number _ "of your opponent's"i _ target:TargetFilter _ duration:Duration? {
      return { type: "negate_effect", amount: count, target: target, duration: duration || "turn" };
    }

ShuffleDeckAction
  = "shuffle your deck"i { return { type: "shuffle_deck" }; }

ReturnHandToDeckAction
  = "Return all cards in your hand to your deck and shuffle your deck"i {
      return { type: "return_hand_to_deck", shuffle: true };
    }

TurnLifeFaceDownAction
  = "turn all of your Life cards face-down"i { return { type: "turn_life_facedown" }; }

TurnLifeFaceDownThenAction
  = "You may turn"i _ count:Number _ "card"i "s"i? _ "from the top of your Life cards face-down"i _ ":" _ action:SingleAction {
      return { type: "turn_life_facedown_then", amount: count, action: action };
    }

ChooseOneAction
  = "Choose one:"i _ "•"? _ opt1:ChooseOneOption _ "•" _ opt2:ChooseOneOption {
      return { type: "choose_one", options: [opt1, opt2] };
    }

ChooseOneOption
  = text:(!("•" / SentenceSeparator) c:. { return c; })+ { return text.join("").trim(); }

UnlimitedCopiesAction
  = "Under the rules of this game, you may have any number of this card in your deck"i { return { type: "unlimited_copies" }; }

TreatNameAsAction
  = ("Also treat this card's name as"i / "Treat this card's name as"i) _ name:BracketedString _ "according to the rules"i? { return { type: "treat_name_as", name: name }; }

WinGameAction
  = "you win the game"i { return { type: "win_game" }; }

OpponentReturnDonAction
  = "your opponent returns"i _ count:Number _ "DON!! card"i "s"i? _ "from their field to their DON!! deck"i {
      return { type: "opp_return_don", amount: count };
    }

OpponentPlaceTrashToDeckAction
  = "Your opponent places"i _ count:Number _ target:("Events"i { return "event"; } / "cards"i { return "card"; } / "Event"i { return "event"; } / "card"i { return "card"; }) _ "from their trash at the bottom of their deck"i _ ("in any order"i)? {
      return { type: "opponent_place_trash_to_deck", amount: count, cardType: target, position: "bottom" };
    }

RestItAction
  = ("and set"i / "and"i / "Set"i)? _ "rest"i _ ("it"i / "them"i) { return { type: "rest_card", target: "it" }; }

RestSelfAction
  = "You may rest this Character"i { return { type: "rest_self", optional: true }; }
  / "Rest this Character"i { return { type: "rest_self" }; }

RestAction
  = optional:("You may "i)? "rest"i _ count:Number _ "of your DON!!"i " cards"i? {
      return { type: "rest_don", amount: count, optional: !!optional };
    }
  / optional:("You may "i)? "rest"i _ "up to"i? _ "a total of"i? _ count:Number _ "of your opponent's"i _ target:TargetFilter {
      return { type: "rest_card_or_don", amount: count, target: target, optional: !!optional };
    }
  / optional:("You may "i)? "rest"i _ "up to"i? _ count:Number _ "of your opponent's"i _ "DON!!"i _ "card"i "s"i? _ "or"i _ target:TargetFilter {
      return { type: "rest_don_or_char", amount: count, target: target, optional: !!optional };
    }
  / optional:("You may "i)? "rest"i _ "up to"i? _ count:Number _ "of your opponent's"i _ "DON!!"i " cards"i? {
      return { type: "rest_opp_don", amount: count, optional: !!optional };
    }
  / optional:("You may "i)? "rest"i _ "up to"i? _ count:Number _ "of your opponent's"i _ target:TargetFilter {
      return { type: "rest_card", amount: count, target: target, optional: !!optional };
    }
  / optional:("You may "i)? "rest"i _ count:Number _ "of your cards"i {
      return { type: "rest_card", amount: count, target: { targetType: "your_cards" }, optional: !!optional };
    }

TrashDeckAction
  = "trash"i _ count:Number _ "card"i "s"i? _ "from the top of your deck"i {
      return { type: "trash_deck", amount: count };
    }

PlaceRevealedCardAction
  = "Then, place the 1 Character played by this effect at the bottom of the owner's deck at the end of this turn"i {
      return { type: "bottom_deck_battled_character", duration: "end_of_turn" };
    }
  / ("Then,"i _ / "Then"i _)? "place the revealed card at the bottom of your deck"i {
      return { type: "place_revealed_card", position: "bottom" };
    }
  / "place it at the bottom of their deck"i {
      return { type: "place_revealed_card", target: "it", position: "opponent_deck_bottom" };
    }

TrashLifeUntilAction
  = "trash cards from the top of your Life cards until you have"i _ count:Number _ "Life card"i "s"i? {
      return { type: "trash_life_until", target: count };
    }

ActivateEffectAction
  = "activate up to 1"i _ type:CurlyString _ "type Event from your hand"i { return { type: "activate_effect", effect: "event_from_hand", cardType: type }; }
  / "Activate up to 1"i _ type:QuotedString _ "type Event with a base cost of"i _ cost:Number _ "or less from your hand"i { return { type: "activate_effect", effect: "event_from_hand", cardType: type, maxCost: cost }; }
  / "Activate this card's"i _ "[" _ effectName:("Main"i / "On Play"i / "On K.O."i / "Counter"i) _ "]" _ "effect"i {
      return { type: "activate_effect", effect: effectName.toLowerCase() };
    }

GiveDonAction
  = "Give"i _ "up to"i? _ count:Number? _ state:"rested "i? "DON!! card"i "s"i? _ "to"i _ target:GiveDonTarget {
      return { type: "give_don", amount: count || 1, state: state ? "rested" : "active", target: target };
    }
  / "Give"i _ "up to"i? _ count:Number _ state:("rested "i)? "DON!! card"i "s"i? _ "to"i _ target:GiveDonTarget {
      return { type: "give_don", amount: count, state: state ? "rested" : "active", target: target };
    }
  / "Give"i _ target:GiveDonTarget _ "up to"i _ count:Number? _ state:("rested"i)? _ "DON!! card"i "s"i? {
      return { type: "give_don", amount: count || 1, state: state ? "rested" : "active", target: target };
    }

GiveDonTarget
  = "your Leader or "i count:Number _ "of your Characters"i { return "leader_or_character"; }
  / "this Leader or "i count:Number _ "of your Characters"i { return "leader_or_character"; }
  / "its owner's Leader or "i count:Number _ "of their Characters"i { return "owner_leader_or_character"; }
  / "1 of your opponent's Characters"i { return { targetType: "opponent_character", amount: 1 }; }
  / count:Number _ "of your opponent's Characters"i { return { targetType: "opponent_character", amount: count }; }
  / "your"i _ name:BracketedString _ "Leader"i { return { targetType: "named_leader", name: name }; }
  / "your"i _ name:CurlyString _ "type Leader"i { return { targetType: "typed_leader", cardType: name }; }
  / "your Leader"i { return "leader"; }
  / "each of your"i _ target:TargetFilter { return { targetType: "each", filter: target }; }
  / count:Number _ "of your"i _ target:TargetFilter { return { targetType: "character", amount: count, filter: target }; }
  / count:Number _ "of your Characters"i { return "character"; }
  / "this Character"i { return "self"; }

LookAndPlaceAction
  = "Look at"i _ lookCount:Number _ "cards from the top of your deck"i _ (";" / "and")? _ "add up to"i _ revealCount:Number _ "card"i "s"i? _ "to your hand"i [.]? _ ("Then,"i _)? ("place the rest at the bottom of your deck"i / "place the rest at the top or bottom of your deck"i / "place the rest at the bottom of the deck"i / "place the rest at the top or bottom of the deck"i) _ ("in any order"i)? {
      return {
        type: "multi",
        actions: [
          { type: "search_deck", look: lookCount, reveal: revealCount, target: { targetType: "card" }, action: "add_to_hand" },
          { type: "place_rest", position: "bottom" }
        ]
      };
    }
  / "Look at"i _ lookCount:Number _ "cards from the top of your deck"i _ ("and trash up to"i _ trashCount:Number _ "cards"i)? _ ("and place"i / "Then, place"i / "place"i)? _ "them"? _ "at the top or bottom of your deck"i _ ("in any order"i)? {
      return { type: "look_and_place", look: lookCount };
    }
  / "Look at"i _ lookCount:Number _ "cards from the top of your deck"i _ ("and trash up to"i _ trashCount:Number _ "cards"i)? _ ("and place"i / "Then, place"i / "place"i)? _ "them"? _ "the rest at the bottom of your deck"i _ ("in any order"i)? {
      return { type: "look_and_place", look: lookCount };
    }

LookAndRevealPlaceAction
  = "Look at"i _ lookCount:Number _ "cards from the top of your deck;"i _ "reveal up to"i _ revealCount:Number _ target:CurlyString _ "type card"i _ ", add it to your hand and place the rest at the bottom of your deck"i _ ("in any order"i)? {
      return { type: "look_reveal_add_place", look: lookCount, reveal: revealCount, target: target, position: "bottom" };
    }

AddDeckToLifeAction
  = ("Add"i / "add"i / ": Add"i) _ "up to"i? _ count:Number _ "card"i "s"i? _ loc:FromLocation _ "to the top of your Life cards"i _ duration:Duration? {
      return { type: "add_to_life", amount: count, from: loc };
    }
  / ("Add"i / "add"i / ": Add"i) _ "up to"i? _ count:Number _ "card"i "s"i? _ "from the top of your deck to the top of your Life cards"i _ duration:Duration? {
      return { type: "add_to_life", amount: count, from: "top_deck" };
    }
  / "add 1 card from the top of your Life cards to your hand"i {
      return { type: "add_life_to_hand", amount: 1, position: "top" };
    }

PlaceHandToDeckAction
  = ("and place"i / "place"i) _ count:Number _ "card"i "s"i? _ "from your hand at the"i _ pos:("top or bottom"i / "bottom"i / "top"i) _ "of your deck"i _ ("in any order"i)? {
      return { type: "hand_to_deck", amount: count, position: pos.toLowerCase() };
    }

OpponentHandToDeckAction
  = "your opponent places"i _ count:Number _ "card"i "s"i? _ "from their hand at the bottom of their deck"i _ ("in any order"i)? {
      return { type: "opponent_hand_to_deck", amount: count, position: "bottom" };
    }

CanAttackActiveAction
  = target:BoostTarget _ "can"i _ ("also attack"i / "attack"i) _ ("Characters"i / "active Characters"i / "your opponent's active Characters"i) _ ("on the turn in which"i _ ("they are played"i / "it is played"i))? _ duration:Duration? {
      return { type: "can_attack_active", target: target, duration: duration || "permanent" };
    }
  / "This Character can also attack your opponent's active Characters"i {
      return { type: "can_attack_active" };
    }
  / "this Character can attack Characters on the turn in which it is played"i {
      return { type: "can_attack_characters_turn_played" };
    }

CannotActivateBlockerAction
  = "your opponent cannot activate "i "the "? "[Blocker]"i _ "of up to"i? count:Number _ "of your opponent's"i _ target:TargetFilter _ duration:Duration? {
      return { type: "target_cannot_activate_blocker", amount: count, target: target, duration: duration || "turn" };
    }
  / "your opponent cannot activate "i "the "? "[Blocker]"i _ "of any Character with a cost of"i _ val:Number _ ("or less"i / "or lower"i) _ duration:Duration? {
      return { type: "cannot_activate_blocker", costCond: { maxCost: val }, duration: duration || "battle" };
    }
  / "your opponent cannot activate "i "a "? "[Blocker]"i _ "Character that has"i _ val:Number _ cmp:("or less power"i / "or more power"i) _ duration:Duration? {
      return { type: "cannot_activate_blocker", powerCond: { value: val, cmp: cmp.toLowerCase().includes("less") ? "max" : "min" }, duration: duration || "battle" };
    }
  / "your opponent cannot activate "i "the "? "[Blocker]"i _ cond:PostCondition? _ duration:Duration? {
      return { type: "cannot_activate_blocker", condition: cond, duration: duration || "turn" };
    }
  / "All of"i _ OpponentPrefix? _ target:TargetFilter _ "cannot activate "i "the "? "["? "Blocker"i "]"? _ duration:Duration? {
      return { type: "target_cannot_activate_blocker", target: target, duration: duration || "turn" };
    }
  / "Up to"i _ count:Number _ "of"i _ OpponentPrefix? _ target:TargetFilter _ "cannot activate "i "the "? "["? "Blocker"i "]"? _ duration:Duration? {
      return { type: "target_cannot_activate_blocker", amount: count, target: target, duration: duration || "turn" };
    }

DrawAndTrashAction
  = "Draw"i _ drawCount:Number _ "card"i "s"i? _ "and trash"i _ trashCount:Number _ "card"i "s"i? _ "from your hand"i {
      return { type: "draw_and_trash", draw: drawCount, trash: trashCount };
    }

DrawUntilHandAction
  = "Draw card(s) so that you have"i _ targetCount:Number _ "cards in your hand"i {
      return { type: "draw_until_hand", target: targetCount };
    }
  / "draw cards so that you have"i _ targetCount:Number _ "card"i "s"i? _ "in your hand"i {
      return { type: "draw_until_hand", target: targetCount };
    }

DrawReturnedCountAction
  = "draw cards equal to the number you returned to your deck"i {
      return { type: "draw_returned_count" };
    }

DrawAction
  = "Draw"i _ drawAmount:("a"i { return 1; } / count:Number) _ "card"i "s"i? _ duration:Duration? _ cond:PostCondition? {
      return { type: "draw", value: drawAmount, duration: duration, condition: cond };
    }
  / (", "i / ": "i / _)? "Draw"i _ "up to"i? _ count:Number _ "card"i "s"i? _ duration:Duration? _ cond:PostCondition? { 
      return { type: "draw", value: count, duration: duration, condition: cond }; 
    }

ConditionalOptionalDrawAction
  = "you may draw"i _ count:Number _ "card"i "s"i? _ "if you have"i _ max:Number _ "or less cards in your hand and haven't drawn a card using this Leader's effect during this turn"i [.]? {
      return { type: "conditional_draw", amount: count, condition: { typeCond: "hand_max", max: max, oncePerLeaderEffect: true } };
    }

DrawAndTrashSameNumberAction
  = "Draw"i _ "a card for each of your"i _ type:CurlyString _ "type Characters"i _ "."? _ "Then,"i _ "trash the same number of cards from your hand"i {
      return { type: "draw_and_trash_same_number", cardType: type };
    }

TrashTargetAction
  = "trash 1 card from the top of each of your and your opponent's Life cards"i {
      return { type: "trash_both_life", amount: 1 };
    }
  / optional:("You may trash up to"i / "You may trash"i / "Trash up to"i / "trash up to"i / "and trash"i / "trash"i)? _ count:Number _ "of your opponent's Life cards"i {
      return { type: "trash_life", amount: count, target: "opponent_life", optional: !!optional };
    }
  / optional:("You may trash up to"i / "You may trash"i / "Trash up to"i / "trash up to"i / "and trash"i / "trash"i)? _ count:Number _ "of"i? _ OpponentPrefix? target:TargetFilter _ duration:Duration? {
      return { type: "trash_card", amount: count, target: target, optional: !!optional };
    }
  / "Trash"i _ count:Number _ "of"i? _ OpponentPrefix? target:TargetFilter _ duration:Duration? {
      return { type: "trash_card", amount: count, target: target };
    }

PlaySelfAction
  = "play this card"i _ duration:Duration? { return { type: "play_self" }; }

PlayThatCardRestedAction
  = "you may play that card rested"i {
      return { type: "play_card", target: "that_card", endState: "rested", optional: true };
    }

PlayWithFieldDonCostAction
  = "Play"i _ "up to"i? _ count:Number _ name:QuotedString _ "type Character card from your hand with a cost equal to or less than the number of DON!! cards on your field"i {
      return { type: "play_card", amount: count, target: { targetType: "typed", cardType: name, maxCost: "field_don_count" }, from: "hand" };
    }

PlayCardAction
  = "Trash all of your Characters and play up to"i count:Number _ "\"Five Elders\" type Character cards with"i _ power:Number _ "power and different card names from your trash"i {
      return { type: "trash_all_and_play", amount: count, target: { targetType: "character", cardType: "Five Elders", exactPower: power, from: "trash" } };
    }
  / "your opponent plays up to"i _ count:Number _ "Character card"i _ "with a cost of"i _ maxCost:Number _ ("or less"i / "or lower"i) _ "from their hand"i {
      return { type: "play_card_opponent", amount: count, target: { targetType: "character", maxCost: maxCost, from: "hand" } };
    }
  / "Play this Character card from your trash"i _ endState:("rested"i)? _ duration:Duration? {
      return { type: "play_card_from_trash", target: "self", endState: endState ? "rested" : "active" };
    }
  / "Play"i _ "up to"i? _ count:Number _ target:DynamicDonCostTarget _ "with a cost equal to or less than the number of DON!! cards on your field"i _ "from your hand"i {
      return { type: "play_card", amount: count, target: target, maxCost: "field_don_count", from: "hand", endState: "active" };
    }
  / "Play"i _ "up to"i? _ count:Number? _ target:TargetFilter _ ("from your hand"i _)? endState:("rested"i)? _ duration:Duration? {
      return { type: "play_card", amount: count || 1, target: target, endState: endState ? "rested" : "active" };
    }

DynamicDonCostTarget
  = typeName:QuotedString _ "type Character card"i _ "or"i _ name:QuotedString {
      return { targetType: "character_or_named_card", cardType: typeName, name: name };
    }

KOAction
  = "choose up to 1 of your opponent's Characters with a cost of"i _ cost:Number _ "or less instead of a Character with a cost of"i _ previousCost:Number _ "or less"i {
      return { type: "knockout_choice", primary: { targetType: "character", maxCost: cost }, secondary: { targetType: "character", maxCost: previousCost } };
    }
  / ("K.O."i _ "or rest"i / "K.O. or rest"i) _ "up to"i _ count:Number _ "of your opponent's"i _ target:TargetFilter _ duration:Duration? {
      return { type: "knockout_or_rest", amount: count, target: target, duration: duration || "turn" };
    }
  / "K.O."i _ "all Characters other than this Character"i { return { type: "knockout_all", exclude: "self" }; }
  / "K.O."i _ "all of your opponent's Characters with"i _ power:Number _ "power or less"i { return { type: "knockout_all", maxPower: power }; }
  / "K.O."i _ "up to"i _ c1:Number _ ("of"i _)? OpponentPrefix? t1:TargetFilter _ "and"i _ "up to"i _ c2:Number _ ("of"i _)? OpponentPrefix? t2:TargetFilter _ duration:Duration? {
      return { type: "knockout_multiple", targets: [ {amount: c1, target: t1}, {amount: c2, target: t2} ] };
    }
  / "K.O."i _ "up to"i _ count:Number _ ("of"i _)? OpponentPrefix? target:TargetFilter _ "or"i _ altTarget:(OpponentPrefix? t:TargetFilter {return t}) _ duration:Duration? {
      return { type: "knockout_choice", primary: target, secondary: altTarget };
    }
  / "K.O."i _ "up to"i _ count:Number _ ("of"i _)? OpponentPrefix? target:TargetFilter _ duration:Duration? { return { type: "knockout", amount: count, target: target }; }
  / "K.O."i _ count:Number _ ("of your"i _)? target:TargetFilter _ duration:Duration? { return { type: "knockout", amount: count, target: target, own: true }; }
  / "K.O."i _ ("it"i / "them"i) _ duration:Duration? { return { type: "knockout", target: "it" }; }

BounceAction
  = optional:("You may return"i / "Return"i)? _ "this Character"i _ "to the owner's hand"i _ duration:Duration? {
      return { type: "return_self_to_hand", optional: !!optional, duration: duration };
    }
  / optional:("You may return"i / "Return"i)? _ "up to"i? _ count1:Number _ target1:TargetFilter _ "and"i _ "up to"i? _ count2:Number _ target2:TargetFilter _ "to the owner's hand"i _ duration:Duration? {
      return { type: "return_to_hand_multi", targets: [{ amount: count1, target: target1 }, { amount: count2, target: target2 }], optional: !!optional };
    }
  / optional:("You may return"i / "Return"i)? _ "up to"i? _ count:Number? _ "of"i? _ (OpponentPrefix / "your"i _)? target:TargetFilter _ "to the owner's hand"i _ ("or the bottom of"i _ ("their"i / "your opponent's"i / "the owner's"i) _ "deck"i)? _ duration:Duration? {
      return { type: "return_to_hand", amount: count || 1, target: target, optional: !!optional };
    }
  / "You may return this Character to the owner's hand"i {
      return { type: "return_self_to_hand", optional: true };
    }

ReturnThenPlayDifferentColorAction
  = "return"i _ count:Number _ "of your"i _ target:TargetFilter _ "to your hand"i _ "."? _ "Then,"i _ "play up to"i _ playCount:Number _ "Character"i _ ("card"i _)? _ "with a cost of"i _ cost:Number _ "or less from your hand that is a different color than the returned character"i {
      return {
        type: "multi",
        actions: [
          { type: "return_to_hand", amount: count, target: target },
          { type: "play_card", amount: playCount, target: { targetType: "character", maxCost: cost, differentColorFrom: "returned_character" }, from: "hand" }
        ]
      };
    }

BoostPowerAction
  = target:("It"i / "That card"i / "That Character"i) _ "gains"i? _ ("an additional"i _)? sign:("+" / "-" / "–")? val:Number _ "power"i _ duration:Duration? _ perX:PerXClause? {
      return { type: "boost_power", target: "previous", value: sign === "-" || sign === "–" ? -val : val, duration: duration || "turn", perX: perX };
    }
  / target:BoostTarget _ ("other than this card"i / "other than this Character"i)? _ "gains"i? _ "an additional"i? _ sign:("+" / "-" / "–")? val:Number _ "power"i _ duration:Duration? _ perX:PerXClause? {
      return { type: "boost_power", target: target, value: sign === "-" ? -val : val, duration: duration || "turn", perX: perX };
    }
  / target:BoostTarget _ "gain"i _ sign:("+" / "-")? val:Number _ "power"i _ duration:Duration? _ perX:PerXClause? {
      return { type: "boost_power", target: target, value: sign === "-" ? -val : val, duration: duration || "turn", perX: perX };
    }

PerXClause
  = "for every"i _ count:Number _ "card"i "s"i? _ "placed at the bottom of your deck"i {
      return { count: count, source: "placed_bottom_deck" };
    }
  / "for every card trashed"i {
      return { count: 1, source: "trashed_card" };
    }
  / "for every card in your hand"i {
      return { count: 1, source: "hand_cards" };
    }
  / "for every"i _ count:Number _ target:TargetFilter _ ("in your trash"i / "in your hand"i)? {
      return { count: count, target: target };
    }

BoostTarget
  = "All of your"i _ type1:TypeName _ "or"i _ type2:TypeName _ "type Leader and Character cards"i { return { targetType: "leader_and_characters", cardTypes: [type1, type2] }; }
  / "All of your"i _ type:TypeName _ "type Leader and Character cards"i { return { targetType: "leader_and_characters", cardType: type }; }
  / "Your Leader and all of your"i _ filter:TargetFilter { return { targetType: "leader_and_all_characters", filter: filter }; }
  / "All of your"i _ filter:TargetFilter { return { targetType: "all_characters", filter: filter }; }
  / "Up to"i _ count:Number _ "of your"i _ target:TargetFilter _ "or"i _ alt:(BracketedString / TargetFilter) { return { targetType: "choice_targets", amount: count, primary: target, secondary: alt }; }
  / "Up to"i _ count:Number _ name:CurlyString _ "type Leader or Character card"i "s"i? _ ("on your field"i)? { return { targetType: "typed_leader_or_character", amount: count, cardType: name }; }
  / "Up to"i _ count:Number _ "of your Leader or Character cards"i { return "leader_or_character"; }
  / "Up to 1 of your Leader or Character cards"i { return "leader_or_character"; }
  / "Up to"i _ count:Number _ "of your"i _ filter:TargetFilter { return { targetType: "character", amount: count, filter: filter }; }
  / "Up to 1 of your Leader"i { return "leader"; }
  / "your Leader"i { return "leader"; }
  / "Your"i _ filter:TargetFilter { return { targetType: "your_characters", filter: filter }; }
  / "this Character"i { return "self"; }
  / "this Leader"i { return "self_leader"; }
  / "this card in your hand"i { return "self_hand"; }
  / "this card"i { return "self"; }
  / "that card"i { return "that_card"; }

GivePowerAction
  = ("give"i / "Give"i) _ "all of your opponent's"i _ target:TargetFilter _ sign:("+"/"-"/"–")? val:Number _ "power"i _ duration:Duration? {
      return { type: "give_power", opponent: true, target: { ...target, all: true }, value: sign === "-" || sign === "–" ? -val : val, duration: duration || "turn" };
    }
  / ("give"i / "Give"i) _ ("up to a total of"i / "up to") _ count:Number _ "of your opponent's"i _ target:TargetFilter _ sign:("+"/"-"/"–")? val:Number _ "power"i _ duration:Duration? {
      return { type: "give_power", opponent: true, amount: count, target: target, value: sign === "-" || sign === "–" ? -val : val, duration: duration || "turn" };
    }
  / ("give"i / "Give"i) _ ("up to a total of"i / "up to") _ count:Number _ "of your opponent's"i _ target:TargetFilter _ val:SignedNumber _ "power"i _ duration:Duration? {
      return { type: "give_power", opponent: true, amount: count, target: target, value: val, duration: duration || "turn" };
    }
  / ("give"i / "Give"i) _ target:BoostTarget _ val:SignedNumber _ "power"i _ duration:Duration? {
      return { type: "give_power", target: target, value: val, duration: duration || "turn" };
    }

GiveThatCardPowerAction
  = "give that card"i _ sign:("+" / "-" / "–")? val:Number _ "power"i _ duration:Duration? {
      return { type: "give_power", target: "that_card", value: sign === "-" || sign === "–" ? -val : val, duration: duration || "turn" };
    }

SetCostAction
  = "Set the cost of up to"i _ count:Number _ "of your opponent's"i _ target:TargetFilter _ "to"i _ val:Number _ duration:Duration? {
      return { type: "set_cost", amount: count, target: target, value: val, duration: duration || "turn" };
    }

SetPowerAction
  = "this Character's base power becomes the same as your Leader's base power"i _ duration:Duration? { return { type: "set_base_power_from_leader", target: "self", duration: duration || "turn" }; }
  / "All of your opponent's Characters cannot be removed from the field by your effects"i _ duration:Duration? { return { type: "protection", target: "opponent_characters", kind: "removed", by: "your_effects", duration: duration || "permanent" }; }
  / "All of your"i _ type:TypeName _ "cards' base power and this Character's base power become"i _ val:Number {
      return { type: "set_base_power", target: { targetType: "typed", cardType: type, all: true, includeSelf: true }, value: val };
    }
  / "all of your"i _ type:TypeName _ "cards' base power becomes"i _ val:Number _ duration:Duration? {
      return { type: "set_base_power", target: { targetType: "typed", cardType: type, all: true }, value: val, duration: duration || "permanent" };
    }
  / "Set the power of up to"i _ count:Number _ "of your opponent's"i _ target:TargetFilter _ "to"i _ val:Number _ duration:Duration? {
      return { type: "set_power", amount: count, target: target, value: val, duration: duration || "turn" };
    }

GiveCostAction
  = "Give"i _ "this card in your hand"i _ sign:("-" / "+" / "–")? cost:Number _ "cost"i _ duration:Duration? {
      return { type: "give_self_hand_cost", value: sign === "-" || sign === "–" ? -cost : cost, duration: duration || "permanent" };
    }
  / "give this card in your hand"i _ sign:("-" / "+" / "–")? cost:Number _ "cost"i _ duration:Duration? {
      return { type: "give_self_hand_cost", value: sign === "-" || sign === "–" ? -cost : cost, duration: duration || "permanent" };
    }
  / "Give"i _ "this card in your hand"i _ val:SignedNumber _ "cost"i _ duration:Duration? {
      return { type: "give_self_hand_cost", value: val, duration: duration || "permanent" };
    }
  / "Give"i _ "all of your opponent's"i _ target:TargetFilter _ sign:("-" / "+" / "–")? cost:Number _ "cost"i _ duration:Duration? {
      return { type: "give_cost", target: { ...target, all: true }, value: sign === "-" || sign === "–" ? -cost : cost, duration: duration || "turn" };
    }
  / "Give"i _ ("up to"i _)? count:Number _ "of your opponent's"i _ target:TargetFilter _ sign:("-" / "+" / "–")? cost:Number _ "cost"i _ duration:Duration? {
      return { type: "give_cost", target: target, amount: count, value: sign === "-" || sign === "–" ? -cost : cost, duration: duration || "turn" };
    }
  / "Give"i _ ("up to"i _)? count:Number _ "of your opponent's"i _ target:TargetFilter _ val:SignedNumber _ "cost"i _ duration:Duration? {
      return { type: "give_cost", target: target, amount: count, value: val, duration: duration || "turn" };
    }

GiveHandTypeCostAction
  = "Give"i _ color:ColorName _ type:("Events"i / "Characters"i / "cards"i) _ "in your hand"i _ sign:("+" / "-" / "–") val:Number _ "cost"i {
      return { type: "give_cost", target: { zone: "hand", color: color, cardType: type }, value: sign === "-" || sign === "–" ? -val : val };
    }

CostReductionAction
  = "the next time you play a"i _ target:TargetFilter _ ("from your hand"i _)? "during this turn, the cost will be reduced by"i _ amount:Number {
      return { type: "cost_reduction_next_play", target: target, amount: amount };
    }

LookAtLifeAction
  = "Look at all of your Life cards and place them back in your Life area"i _ ("in any order"i)? {
      return { type: "look_at_life_all" };
    }
  / "Look at"i _ "up to"i? _ count:Number _ "card"i "s"i? _ "from the top of your or your opponent's Life cards"i _ ("," _)? _ "and"i? _ "place it at the top or bottom of the Life cards"i {
      return { type: "look_at_life", amount: count, source: "either", destination: "top_or_bottom" };
    }

BottomDeckAction
  = "Place up to"i _ count:Number _ "of"i? _ OpponentPrefix? target:TargetFilter _ "at the bottom of the owner's deck"i _ ("in any order"i)? _ duration:Duration? {
      return { type: "bottom_deck", amount: count, target: target };
    }
  / "At the end of a battle in which this Character battles your opponent's Character with a cost of"i _ cost:Number _ "or less, place the opponent's Character you battled with at the bottom of the owner's deck"i {
      return { type: "bottom_deck_battled_character", maxCost: cost };
    }
  / ("at the end of this battle,"i / "at the end of this turn,"i)? _ "place this Character at the bottom of the owner's deck"i {
      return { type: "bottom_deck", target: "self" };
    }

AddLifeToHandAction
  = ("You may add"i / "Then, add"i / "Add"i / "add"i) _ count:Number _ "card"i "s"i? _ "from the"i _ pos:LifePosition _ "of your Life"i (" cards"i)? _ "to your hand"i {
      return { type: "add_life_to_hand", amount: count, position: pos, optional: true };
    }
  / ("Then, add"i / "Add"i / "add"i) _ count:Number _ "card"i "s"i? _ "from the"i _ pos:LifePosition _ "of your Life"i (" cards"i)? _ "to your hand"i {
      return { type: "add_life_to_hand", amount: count, position: pos };
    }
  / ("You may add"i / "Add"i) _ "up to"i? _ count:Number _ "card"i "s"i? _ "from the top of your opponent's Life cards to the owner's hand"i {
      return { type: "add_life_to_hand", amount: count, position: "top", opponent: true };
    }
  / "you may add"i _ "up to"i? _ count:Number _ "card"i "s"i? _ "from the top of your deck to the top of your Life cards instead of drawing"i _ count2:Number _ "card"i "s"i? {
      return { type: "add_to_life_instead_of_draw", amount: count, from: "top_deck", replacedDrawAmount: count2 };
    }

AddTargetToHandAction
  = "Add up to 1 blue [Usopp from your trash to your hand"i [.]? { return { type: "add_to_hand", amount: 1, target: { targetType: "named_card", name: "Usopp", color: "blue", from: "trash" } }; }
  / ("You may add"i / "Add"i) _ "up to"i? _ count:Number _ target:TargetFilter _ "to your hand"i {
      return { type: "add_to_hand", amount: count, target: target };
    }

AddSelfToHandAction
  = "Add this Character card from your trash to your hand"i { return { type: "add_self_to_hand", from: "trash" }; }
  / "add this card to your hand"i { return { type: "add_self_to_hand" }; }

AddTargetToOppLifeAction
  = ("You may add"i / "Add"i) _ "up to"i? _ count:Number _ "of your opponent's"i _ target:TargetFilter _ "to the top or bottom of your opponent's Life cards face-up"i {
      return { type: "add_to_opp_life_faceup", amount: count, target: target };
    }
  / ("You may add"i / "Add"i) _ "up to"i? _ count:Number _ target:TargetFilter _ "to the top or bottom of the owner's Life cards face-up"i {
      return { type: "add_to_owner_life_faceup", amount: count, target: target };
    }

PlaceOpponentLifeToOwnerDeckAction
  = "place"i _ "up to"i _ count:Number _ "card"i _ "from your opponent's Life area at the bottom of the owner's deck"i {
      return { type: "place_opponent_life_to_deck", amount: count, position: "bottom" };
    }

AddFromHandToLifeFaceUpAction
  = ("You may add"i / "Add"i) _ "up to"i? _ count:Number _ "of your"i _ target:TargetFilter _ "to the top or bottom of your Life cards face-up"i {
      return { type: "add_to_life_faceup", amount: count, target: target, from: "field" };
    }
  / ("You may add"i / "Add"i) _ "up to"i? _ count:Number _ target:TargetFilter _ "to the top of your Life cards face-up"i {
      return { type: "add_to_life_faceup", amount: count, target: target, from: "hand" };
    }
  / ("You may add"i / "Add"i) _ "up to"i? _ count:Number _ "of your"i _ target:TargetFilter _ "to the top or bottom of the owner's Life cards face-up"i {
      return { type: "add_to_owner_life_faceup", amount: count, target: target };
    }

OpponentAddLifeToHandAction
  = "your opponent adds"i _ count:Number _ "card"i "s"i? _ "from the top of their Life cards to their hand"i {
      return { type: "opp_add_life_to_hand", amount: count };
    }

DamageAction
  = "you take"i _ count:Number _ "damage"i { return { type: "take_damage", amount: count }; }

NegateAfterHandTrashAction
  = "When a card is trashed from your hand by an effect, this Character's effect is negated during this turn"i {
      return { type: "negate_current_effect", duration: "turn", trigger: "hand_trash" };
    }

PlaceTargetToOppLifeAction
  = ("Place"i / "place"i) _ count:Number _ "of your opponent's"i _ target:TargetFilter _ "at the top or bottom of your opponent's Life cards face-up"i {
      return { type: "place_to_opp_life_faceup", amount: count, target: target };
    }

GiveDonToCharacterAction
  = ("Give"i / "give"i) _ "up to"i? _ count:Number _ "DON!!"i _ "card"i "s"i? _ "from your opponent's cost area to 1 of your opponent's"i _ target:TargetFilter _ duration:Duration? {
      return { type: "give_don_opponent", amount: count, target: target, duration: duration || "turn" };
    }
  / ("Give"i / "give"i) _ "up to"i? _ count:Number _ "of your opponent's rested"i _ "DON!!"i _ "card"i "s"i? _ "to"i _ "1 of your opponent's"i _ target:TargetFilter _ duration:Duration? {
      return { type: "give_don_to_character", amount: count, target: target, duration: duration || "turn" };
    }
  / ("Give"i / "give"i) _ "up to"i? _ count:Number _ "rested DON!!"i _ "card"i "s"i? _ "to"i _ "1 of your opponent's"i _ target:TargetFilter _ duration:Duration? {
      return { type: "give_don_to_character", amount: count, target: target, duration: duration || "turn" };
    }
  / ("Give"i / "give"i) _ "up to"i? _ count:Number _ "of your"i _ "DON!!"i _ "card"i "s"i? _ "to"i _ "1 of your"i _ target:TargetFilter _ duration:Duration? {
      return { type: "give_don_to_character", amount: count, target: target, duration: duration || "turn" };
    }

LifePosition
  = "top or bottom"i { return "choice"; }
  / "top"i { return "top"; }
  / "bottom"i { return "bottom"; }

AddDonAction
  = "Add"i _ "up to"i? _ count:Number _ "DON!! card"i "s"i? _ "from your DON!!"i _ "deck"i _ state:("and rest it"i / "rested"i / "and set it as active"i)? {
      return { type: "add_don", amount: count, state: state ? (state.includes("active") ? "active" : "rested") : "active" };
    }
  / "add"i _ "up to"i? _ count:Number _ "additional DON!! card"i "s"i? _ "and"i _ state:("rest it"i / "set it as active"i) {
      return { type: "add_don", amount: count, state: state.toLowerCase().includes("active") ? "active" : "rested", additional: true };
    }

AddDonAndSetActiveAction
  = ("and add"i / "add"i) _ "up to"i? _ count:Number _ "DON!! card"i "s"i? _ "from your DON!! deck and set it as active"i {
      return { type: "add_don", amount: count, state: "active" };
    }

RevealDeckAction
  = "You may reveal"i _ count:Number _ target:TargetFilter _ "from your hand"i {
      return { type: "reveal_hand_target", amount: count, target: target, optional: true };
    }
  / "Reveal"i _ "up to"i? _ count:Number _ target:TargetFilter _ "from your deck"i _ "and add"i _ ("it"i / "them"i) _ "to your hand"i {
      return { type: "reveal_deck_add_hand", amount: count, target: target };
    }
  / "Reveal"i _ "up to"i? _ count:Number _ "card"i "s"i? _ "from the top of your"i _ opp:("opponent" ("'" / "’") "s"i _)? "deck"i {
      return { type: "reveal_deck", amount: count, opponent: !!opp };
    }

RevealAndShuffleAction
  = "Reveal"i _ "up to"i? _ count:Number _ target:TargetFilter _ "from your deck"i _ "and add it to your hand"i _ "."? _ "Then,"i _ "shuffle your deck"i {
      return { type: "reveal_deck_add_hand", amount: count, target: target, then: { type: "shuffle_deck" } };
    }

RevealNamedAndShuffleAction
  = "Reveal"i _ "up to"i? _ count:Number _ name:BracketedOrQuotedString _ "from your deck and add it to your hand"i _ "."? _ "Then,"i _ "shuffle your deck"i {
      return { type: "reveal_deck_add_hand", amount: count, target: { targetType: "named_card", name: name }, then: { type: "shuffle_deck" } };
    }

LookAtOpponentDeckAction
  = "Look at"i _ count:Number _ "card"i "s"i? _ "from the top of your opponent's deck"i {
      return { type: "look_at_deck", amount: count, opponent: true, position: "top" };
    }

SearchDeckAction
  = ("Look at"i / "look at"i) _ "up to"i? _ lookCount:Number _ "cards from the top of your deck"i _? [;,]? _ ("and"i _)? action:SearchActionEnd {
      return { type: "search_deck", look: lookCount, ...action };
    }

SearchActionEnd
  = "reveal"i _ "up to"i? _ revealCount:Number? _ target:SearchTargetFallback _ (", "i / "and "i)? "add"i _ ("it"i / "them"i / "that card"i)? _ "to your hand"i _ "and place the rest at the bottom of your deck"i _ ("in any order"i)? {
      return { reveal: revealCount || 1, target: target, action: "add_to_hand_and_place_rest", position: "bottom" };
    }
  / "reveal"i _ "up to"i? _ "a total of"i? _ revealCount:Number? _ target:SearchTargetFallback _ ("and"i _)? "add"i _ ("it"i / "them"i / "that card"i / "those cards"i)? _ "to your hand"i {
      return { reveal: revealCount || 1, target: target, action: "add_to_hand" };
    }
  / "play"i _ ("up to"i _)? playCount:Number _ target:TargetFilter {
      return { action: "play", amount: playCount, target: target };
    }
  / "trash"i _ ("up to"i _)? trashCount:Number _ target:TargetFilter {
      return { action: "trash", amount: trashCount, target: target };
    }
  / ("place the rest at the bottom of your deck"i / "place them at the bottom of your deck"i) _ ("in any order"i)? _ "and play"i _ ("up to"i _)? playCount:Number _ target:TargetFilter _ ("from your hand"i)? {
      return { action: "place_and_play", amount: playCount, target: target, position: "bottom" };
    }
  / "place them at the top or bottom of the deck"i _ ("in any order"i)? {
      return { action: "place_deck", position: "top_or_bottom" };
    }

SearchTargetFallback
  = chars:(!("and add"i / "and place"i / "and play"i / "and trash"i) c:. {return c;})+ { 
      return { targetType: "search_filter_raw", rawText: chars.join("").trim() }; 
    }

PlaceRestAction
  = RestDestination { return { type: "place_rest" }; }

PlaceRestAndPlayAction
  = ("Then,"i _ / "Then"i _)? "place the rest at the bottom of your deck"i _ ("in any order"i)? _ "and play"i _ ("up to"i _)? count:Number _ target:TargetFilter _ ("from your hand"i)? _ ("rested"i)? {
      return {
        type: "multi",
        actions: [
          { type: "place_rest" },
          { type: "play_card", amount: count, target: target, endState: "rested" }
        ]
      };
    }

TrashRestAction
  = "trash the rest"i { return { type: "trash_rest" }; }

TrashAnyNumberAction
  = "You may trash any number of Event or Stage cards from your hand"i {
      return { type: "trash_hand_target", amount: "any", target: { targetType: "event_or_stage" }, optional: true };
    }
  / "Trash cards from your hand until you have"i _ count:Number _ "cards in your hand"i {
      return { type: "trash_hands_until", handSize: count, playerOnly: true };
    }

TrashTypedCardsAndBoostAction
  = "You may trash any number of"i _ type:BracketedString _ "type cards from your hand"i _ [.;] _ "Your Leader or 1 of your Characters gains +1000 power during this battle for every card trashed"i [.]? {
      return {
        type: "multi",
        actions: [
          { type: "trash_typed_cards", amount: "any", cardType: type, from: "hand", optional: true },
          { type: "boost_power", target: "leader_or_character", value: 1000, duration: "battle", perX: { count: 1, source: "trashed_card" } }
        ]
      };
    }

TrashSelfOptionalAction
  = "You may trash this Character"i {
      return { type: "trash_self", optional: true };
    }

RestDestination
  = ("Then,"i _ / "Then"i _)? "place the rest at the bottom of your deck"i _ ("in any order"i)? { return "bottom_deck_any"; }
  / "trash the rest"i { return "trash"; }
  / ("Then,"i _ / "Then"i _)? "place them at the top or bottom of the deck"i _ ("in any order"i)? { return "top_or_bottom"; }
  / ("Then,"i _ / "Then"i _)? "place the rest at the top or bottom of your deck"i _ ("in any order"i)? { return "top_or_bottom"; }
  / ("Then,"i _ / "Then"i _)? "place the rest at the top or bottom of the deck"i _ ("in any order"i)? { return "top_or_bottom"; }

GainKeywordAction
  = target:BoostTarget _ "gains"i _ "[" _ kw:KeywordName _ "]" _? ExplanationText? _ duration:Duration? {
      return { type: "gain_keyword", keyword: kw.toLowerCase(), duration: duration || "permanent" };
    }

GainCostAction
  = target:BoostTarget _ ("gains"i / "gain"i) _ sign:("+" / "-" / "–") val:Number _ "cost"i _ duration:Duration? {
      return { type: "gain_cost", target: target, value: sign === "-" || sign === "–" ? -val : val, duration: duration || "permanent" };
    }

StandaloneCostGainAction
  = sign:("+" / "-" / "–") val:Number _ "cost"i _ duration:Duration? {
      return { type: "gain_cost", target: "self", value: sign === "-" || sign === "–" ? -val : val, duration: duration || "permanent" };
    }

StandalonePowerGainAction
  = ("gains"i _)? sign:("+" / "-" / "–") val:Number _ "power"i _ duration:Duration? {
      return { type: "boost_power", target: "self", value: sign === "-" || sign === "–" ? -val : val, duration: duration || "turn" };
    }

StandaloneKeywordAction
  = "[" _ "Rush"i _ ":" _ "Character"i _ "]" _? ExplanationText? {
      return { type: "keyword", keyword: "rush", restriction: "character_only" };
    }
  / "[" _ kw:KeywordName _ "]" _? ExplanationText? {
      return { type: "keyword", keyword: kw.toLowerCase() };
    }

KeywordName
  = "Rush"i / "Banish"i / "Double Attack"i / "Blocker"i / "Strike"i / "Unblockable"i

OpponentTrashAction
  = "Your opponent trashes"i _ count:Number _ "card"i "s"i? _ "from their hand"i _ ("and reveals their hand"i)? {
      return { type: "opponent_trash_hand", amount: count, revealsHand: true };
    }

TrashAllHandAction
  = "trash all cards from your hand"i {
      return { type: "trash_hand", amount: "all" };
    }

OpponentRevealHandAction
  = "your opponent reveals their hand"i {
      return { type: "opponent_reveal_hand" };
    }

OpponentDrawAction
  = "your opponent draws"i _ count:Number _ "card"i "s"i? {
      return { type: "opponent_draw", amount: count };
    }

PassiveProtectionAction
  = target:ProtectionTarget _ ("cannot be "i / "will not be "i) prot:("K.O."i ("'"/"’")? "d or rested"i / "K.O."i ("'"/"’")? "d"i / "removed from the field"i / "rested"i) _ by:("by your opponent's effects"i / "by your opponent's Character's effect"i / "by effects of Characters without"i _ attr:AttributeCondition {return "without_" + attr} / "by effects of your opponent's Characters with"i _ maxPower:Number _ "base power or less"i {return "opponent_character_power_" + maxPower} / "in battle by"i _ typeStr:QuotedString _ "attribute cards"i {return "attribute_" + typeStr} / "by"i _ typeStr:QuotedString _ "attribute cards"i {return "attribute_" + typeStr} / "by effects"i / "in battle"i / "by your opponent's Leader and Character effects"i / "by your opponent's Leader or Character effects"i / "by your opponent's effect"i / ProtectionByCondition)? _ duration:Duration? _ kw:(_ "and gains"i _ "[" k:KeywordName "]" {return k})? {
      const pStr = Array.isArray(prot) ? prot.flat().join("") : String(prot);
      const res = { 
        type: "protection", 
        target: target, 
        kind: pStr.toLowerCase().includes("k.o.") ? "ko" : (pStr.toLowerCase().includes("removed") ? "removed" : "rested"), 
        by: by || "all",
        duration: duration || "permanent" 
      };
      if (kw) res.gainKeyword = String(kw).toLowerCase();
      return res;
    }

ImplicitSelfProtectionAction
  = ("cannot be "i / "will not be "i) prot:("K.O."i ("'" / "’")? "d"i / "removed from the field"i / "rested"i) _ by:("by effects"i / "by your opponent's effects"i / "in battle")? _ duration:Duration? {
      const protection = Array.isArray(prot) ? prot.flat().join("") : String(prot);
      return {
        type: "protection",
        target: "self",
        kind: protection.toLowerCase().includes("k.o.") ? "ko" : (protection.toLowerCase().includes("removed") ? "removed" : "rested"),
        by: by || "all",
        duration: duration || "permanent"
      };
    }

AttributeCondition
  = "the "i attr:TypeName _ "attribute"i { return attr; }

ProtectionByCondition
  = ("in battle by"i / "by"i) _ typeStr:QuotedString _ "attribute"i _ ("card"i / "cards"i / "Characters"i) { return "attribute_" + typeStr; }
  / ("in battle by "i / "by "i) text:(!(SentenceSeparator / NextTag / ".") c:. {return c;})+ {
      return text.join("").trim();
    }

CannotAttackAnyCardAction
  = "your opponent cannot attack any card other than the Character"i _ name:BracketedString {
      return { type: "cannot_attack_any_except", except: name };
    }

CannotAction
  = target:("you"i / "this Leader"i / "this Character"i / "the selected Character"i / "Your opponent"i) _ "cannot"i _ text:(!"." [^.\[])+ {
      return { type: "restriction", target: target.toLowerCase(), rule: text.map(c => c[1]).join("").trim() };
    }

SelectAndConditionalAttackRestrictionAction
  = "select all of your opponent's Characters on their field"i _ "."? _ "Until the end of your opponent's next turn"i _ ","? _ "none of the selected Characters can attack unless your opponent trashes"i _ count:Number _ "cards from their hand whenever they attack"i {
      return { type: "select_and_restrict_attack", target: "opponent_characters", duration: "until_opp_next_turn", unless: { type: "opponent_trashes_from_hand", amount: count, whenever: "attack" } };
    }

CannotAttackTargetAction
  = "up to"i _ count:Number _ "of your opponent's"i _ target:TargetFilter _ "cannot attack during this turn"i {
      return { type: "cannot_attack", amount: count, target: target, duration: "turn" };
    }
  / "up to"i _ count:Number _ "of your opponent's"i _ target:TargetFilter _ "cannot attack until"i _ duration:("the start of your next turn"i / "the end of your opponent's next End Phase"i / "the end of your opponent's next turn"i) {
      return { type: "cannot_attack", amount: count, target: target, duration: duration };
    }

ProtectionTarget
  = "your"i _ target:TargetFilter { return target; }
  / TargetFilter
  / "This Character"i / "this Character"i / "This Leader"i / "this Leader"i

SetActiveAction
  = ("and set"i / "Set"i) _ first:ActiveTarget _ "and"i _ second:ActiveTarget _ "as active"i _ duration:Duration? {
      return { type: "set_active_multi", targets: [first, second], duration: duration };
    }
  / ("and set"i / "Set"i) _ target:ActiveTarget _ "as active"i _ duration:Duration? {
      return { type: "set_active", target: target, duration: duration };
    }

ActiveTarget
  = "this Character"i { return { targetType: "self" }; }
  / "this Leader"i { return { targetType: "self_leader" }; }
  / "your"i _ name:CurlyString _ "type Leader"i { return { targetType: "typed_leader", cardType: name }; }
  / "it"i { return { targetType: "it" }; }
  / "up to"i _ count:Number _ "of your DON!!"i _ "cards"i? { 
      return { targetType: "don", amount: count }; 
    }
  / "up to"i _ count:Number _ "of your"i _ filter:TargetFilter { 
      return { targetType: "character", amount: count, filter: filter }; 
    }

ProtectionType
  = "by effects"i { return "effects"; }
  / "in battle"i { return "battle"; }

Duration
  = "during this turn"i { return "turn"; }
  / "during this battle"i { return "battle"; }
  / "at the end of this turn"i { return "end_of_turn"; }
  / "until the start of your next turn"i { return "until_next_turn"; }
  / "until the end of your opponent's next End Phase"i { return "until_opp_next_end_phase"; }
  / "until the end of your opponent's next turn"i { return "until_opp_next_turn"; }
  / "in battle"i { return "battle"; }

// --- FILTRES & CIBLES ---
OpponentPrefix
  = "your opponent's"i _

TargetType
  = "Leader or Character"i _ "cards"i { return "leader_or_character"; }
  / "Character"i _ "card"i { return "character"; }
  / "Leader"i _ "card"i { return "leader"; }
  / "Stage"i _ "card"i { return "stage"; }
  / "Event"i _ "card"i { return "event"; }
  / "Character"i { return "character"; }
  / "Stage"i { return "stage"; }
  / "Leader"i { return "leader"; }
  / "Event"i { return "event"; }
  / "Card"i { return "card"; }

TargetState
  = "rested"i _ { return "rested"; }
  / "active"i _ { return "active"; }

TargetFilter
  = "all"i _ targetType:TargetType "s"i? _ attr:TargetAttributes? {
      const res = { targetType: targetType, all: true };
      if (attr) Object.assign(res, attr);
      return res;
    }
  / color:ColorName? _ state1:TargetState? prefixType:MultiTypeClause? targetType:TargetType "s"i? _ opt1:(ExceptFilter / TargetAttributes)? _ opt2:(ExceptFilter / TargetAttributes)? _ trig:("and a [Trigger]"i)? _ noBase:("and no base effect"i / "with no base effect"i)? _ donGiven:("with a DON!! card given"i)? _ donGivenCount:("that has"i _ donCount:Number _ "or more DON!! cards given"i)? _ orAlt:(_ "or"i _ ("Stages"i / "DON!! card"i "s"i? / "DON!!"i) { return true; })? _ loc1:FromLocation? _ state2:TargetState? _ loc2:FromLocation? _ endState:("rested"i [.]?)? {
      const res = { state: state1 || state2, targetType: targetType };
      if (color) res.color = color;
      if (prefixType) res.cardType = prefixType;
      if (noBase) res.noBaseEffect = true;
      if (donGiven) res.hasDon = true; 
      if (donGivenCount) {
        res.hasDon = true;
        res.minDonGiven = donGivenCount[2];
      }
      if (orAlt) res.orDon = true;
      if (opt1) {
        if (typeof opt1 === "string") res.exclude = opt1;
        else Object.assign(res, opt1);
      }
      if (opt2) {
        if (typeof opt2 === "string") res.exclude = opt2;
        else Object.assign(res, opt2);
      }
      if (trig) res.hasTrigger = true;
      if (loc1 || loc2) res.from = loc1 || loc2;
      if (endState) res.endState = "rested";
      return res;
    }
  / targetType:TargetType _ "card"i _ attr:TargetAttributes {
      return { targetType: targetType, ...attr };
    }
  / name:BracketedOrQuotedString _ opt1:(ExceptFilter / TargetAttributes)? _ loc:FromLocation? {
      const res = { targetType: "named_card", name: name };
      if (opt1) {
        if (typeof opt1 === "string") res.exclude = opt1;
        else Object.assign(res, opt1);
      }
      if (loc) res.from = loc;
      return res;
    }

MultiTypeClause
  = head:TypeName tail:(_ "," _ t:TypeName { return t; })+ _ "or"i _ last:TypeName _ ("type"i / "attribute"i)? _ { return [head, ...tail, last]; }
  / t1:TypeName _ "or"i _ t2:TypeName _ ("type"i / "attribute"i)? _ { return [t1, t2]; }
  / t:TypeName _ ("type"i / "attribute"i)? _ { return t; }

TargetAttributes
  = p:PowerCondition _ c:CostCondition _ t:TypeClause { return { cardType: t, ...c, ...p }; }
  / c:CostCondition _ p:PowerCondition _ t:TypeClause { return { cardType: t, ...c, ...p }; }
  / p:PowerCondition _ c:CostCondition { return { ...c, ...p }; }
  / c:CostCondition _ p:PowerCondition { return { ...c, ...p }; }
  / t:TypeClause _ p:PowerCondition { return { cardType: t, ...p }; }
  / t:TypeClause _ c:CostCondition { return { cardType: t, ...c }; }
  / p:PowerCondition { return { ...p }; }
  / c:CostCondition { return { ...c }; }
  / t:TypeClause { return { cardType: t }; }

TypeClause
  = ("with a type include"i "s"i? / "with a type including"i / "with a type of"i / "with type"i / "with a type"i / "with a"i / "with"i) _ typeStr:TypeName _ ("type"i / "attribute"i)? { return typeStr; }

CostCondition
  = ("with a cost equal to or less than"i / "with a base cost equal to or less than"i) _ "the number of DON!! cards on your field"i {
      return { maxCost: "field_don_count", base: true };
    }
  / ("with a cost equal to or less than"i / "with a base cost equal to or less than"i) _ "your number of Life cards"i {
      return { maxCost: "your_life_count", base: true };
    }
  / ("with a base cost of"i / "with a cost of"i / "and a cost of"i / "with a cost"i / "with cost"i / "with a"i / "with"i / "and"i) _ "equal to or less than the total of your and your opponent's Life cards"i {
      return { costCond: "total_life_or_less" };
    }
  / ("with a base cost of"i / "with a cost of"i / "and a cost of"i / "with a cost"i / "with cost"i / "with a"i / "with"i / "and"i) _ "equal to or less than the number of your opponent's Life cards"i {
      return { costCond: "opp_life_or_less" };
    }
  / ("with a base cost of"i / "with a cost of"i / "and a cost of"i / "with a cost"i / "with cost"i / "with a"i / "with"i / "and"i) _ max:Number _ ("or less"i / "or lower"i) {
      return { maxCost: max, base: true };
    }
  / ("with a base cost of"i / "with a cost of"i / "and a cost of"i / "with a cost"i / "with cost"i / "with a"i / "with"i / "and"i) _ min:Number _ ("or more"i / "or higher"i) {
      return { minCost: min, base: true };
    }
  / ("with a base cost of"i / "with a cost of"i / "and a cost of"i / "with a cost"i / "with cost"i / "with a"i / "with"i / "and"i) _ val:Number {
      return { exactCost: val };
    }

PowerCondition
  = ("with a"i / "with"i / "and"i) _ "total power of"i _ max:Number _ "or less"i { return { maxTotalPower: max }; }
  / ("with a"i / "with"i / "and"i) _ max:Number _ ("base power or less"i / "power or less"i) { return { maxPower: max, base: true }; }
  / ("with a base power of"i / "with power of"i) _ max:Number _ ("or less"i / "or lower"i) { return { maxPower: max, base: true }; }
  / ("with a"i / "with"i / "and"i) _ min:Number _ "to"i _ max:Number _ "power"i { return { minPower: min, maxPower: max }; }
  / ("with a"i / "with"i / "and"i) _ val:Number _ ("base power"i / "power"i) { return { exactPower: val }; }

TypeName
  = QuotedString / BracketedString / CurlyString / ParenString
  / "Kurozumi Clan"i / "Navy"i / "Whitebeard Pirates"i / "SWORD"i / "CP"i / "FILM"i / "Land of Wano"i / "Impel Down"i / "Straw Hat Crew"i / "ODYSSEY"i / "The Seven Warlords of the Sea"i

CurlyString
  = "{" chars:[^}]+ "}" { return chars.join(""); }

BracketedOrQuotedString
  = BracketedString
  / QuotedString
  / CurlyString
  / ParenString

BracketedString
  = "[" chars:[^\]]+ "]" { return chars.join(""); }

ParenString
  = "(" chars:[^)]+ ")" { return chars.join(""); }

FromLocation
  = "from your"i _ loc:("hand or trash"i / "trash or hand"i / "field or trash"i / "trash"i / "hand"i / "deck"i / "Life cards"i / "Life"i) { return loc.toLowerCase(); }
  / "from your opponent's"i _ loc:("hand"i / "trash"i / "deck"i) { return "opp_" + loc.toLowerCase(); }
  / "from the top of your"i _ loc:("deck"i / "Life cards"i / "Life"i) { return "top_" + loc.toLowerCase(); }
  / "from the top of your opponent's"i _ loc:("deck"i / "Life cards"i / "Life"i) { return "opp_top_" + loc.toLowerCase(); }

ColorName
  = "red"i / "green"i / "blue"i / "purple"i / "black"i / "yellow"i

ExceptFilter
  = "other than"i _ ("this Character"i / "this Leader"i / "your "i? "[" name:[^\]]+ "]" { return name.join("").trim(); } / BracketedString / QuotedString)

QuotedString
  = "\"" chars:[^"]+ "\"" { return chars.join(""); }

// --- UTILITAIRES ---
SignedNumber
  = sign:[-–+] digits:[0-9]+ [oO]? { return parseInt(sign + digits.join(""), 10); }

Number
  = digits:[0-9]+ [oO]? { return parseInt(digits.join(""), 10); }

WS
  = [ \t\n\r]+

_
  = [ \t\n\r]*