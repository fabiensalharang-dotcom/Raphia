-- §6 : le moteur de pilotage suggère, il ne décide jamais seul. Au plus une
-- suggestion par enfant et par semaine (§6.1) — cette limite est appliquée
-- côté application (lecture de created_at récent), pas en contrainte SQL.
create table pilotage_suggestion (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child(id) on delete cascade,
  type text not null check (
    type in ('rule_acquired', 'rule_failing', 'reward_fatigue', 'threshold_high', 'threshold_low', 'age_change')
  ),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed', 'expired')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index pilotage_suggestion_child_id_idx on pilotage_suggestion(child_id);

alter table pilotage_suggestion enable row level security;

create policy pilotage_suggestion_select on pilotage_suggestion
  for select to authenticated
  using (is_household_member((select household_id from child where id = child_id)));

create policy pilotage_suggestion_insert on pilotage_suggestion
  for insert to authenticated
  with check (is_household_member((select household_id from child where id = child_id)));

create policy pilotage_suggestion_update on pilotage_suggestion
  for update to authenticated
  using (is_household_member((select household_id from child where id = child_id)))
  with check (is_household_member((select household_id from child where id = child_id)));
