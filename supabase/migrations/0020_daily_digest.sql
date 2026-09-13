-- §7.9 : le bilan du soir ne stocke jamais le texte rendu — seulement la
-- clé de gabarit, sa variante (anti-répétition, §7.7), la question retenue
-- et les valeurs à injecter. Le rendu se fait à l'affichage.
create table daily_digest (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child(id) on delete cascade,
  day_entry_id uuid not null references day_entry(id) on delete cascade,
  date date not null,
  observation_type text not null check (
    observation_type in (
      'recovery', 'first_time', 'streak_building', 'perfect_day',
      'threshold_first_of_week', 'weekly_pace', 'close_to_threshold',
      'rule_struggling', 'steady'
    )
  ),
  template_key text not null,
  template_variant int not null,
  question_key text not null,
  question_variant int not null,
  slots jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  shared_at timestamptz,
  unique (day_entry_id)
);

create index daily_digest_child_id_idx on daily_digest(child_id);

alter table daily_digest enable row level security;

create policy daily_digest_select on daily_digest
  for select to authenticated
  using (is_household_member((select household_id from child where id = child_id)));

create policy daily_digest_insert on daily_digest
  for insert to authenticated
  with check (is_household_member((select household_id from child where id = child_id)));

create policy daily_digest_update on daily_digest
  for update to authenticated
  using (is_household_member((select household_id from child where id = child_id)))
  with check (is_household_member((select household_id from child where id = child_id)));
