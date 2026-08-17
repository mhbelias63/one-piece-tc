-- Run once in Supabase SQL Editor.
-- Keeps the original effect text and stores the executable AST separately.
alter table public.cards
  add column if not exists effect_ast jsonb;

comment on column public.cards.effect_ast is
  'Executable card-effect AST generated from card_effects.json';

create index if not exists cards_effect_ast_gin_idx
  on public.cards using gin (effect_ast);
