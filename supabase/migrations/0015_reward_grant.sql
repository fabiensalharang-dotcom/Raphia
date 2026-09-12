-- §4.3 : une récompense attribuée. week_summary_id n'est pas créée ici —
-- la table week_summary n'existe pas encore (lot L7). Elle sera ajoutée
-- par une migration ALTER TABLE au moment de L7, sans toucher à ce qui
-- suit : la récompense hebdomadaire de ce lot s'identifie par
-- day_entry_id (le dernier jour de la semaine, §5.3), qui suffit.
create table reward_grant (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child(id) on delete cascade,
  day_entry_id uuid references day_entry(id) on delete cascade,
  reward_instance_id uuid not null references reward_instance(id),
  tier text not null check (tier in ('daily', 'weekly')),
  granted_at timestamptz not null default now(),
  redeemed_at timestamptz
);

create index reward_grant_child_id_idx on reward_grant(child_id);
create unique index reward_grant_one_per_day_entry on reward_grant(day_entry_id, tier);

alter table reward_grant enable row level security;

create policy reward_grant_select on reward_grant
  for select to authenticated
  using (is_household_member((select household_id from child where id = child_id)));

create policy reward_grant_insert on reward_grant
  for insert to authenticated
  with check (is_household_member((select household_id from child where id = child_id)));

create policy reward_grant_update on reward_grant
  for update to authenticated
  using (is_household_member((select household_id from child where id = child_id)))
  with check (is_household_member((select household_id from child where id = child_id)));
