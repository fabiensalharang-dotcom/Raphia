-- §4.3 : le menu de récompenses d'un enfant, copié depuis reward_template.
-- D7 : le menu est stable — on varie is_available, on ne supprime jamais.
create table reward_instance (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child(id) on delete cascade,
  template_id uuid references reward_template(id),
  label text not null,
  category text not null check (category in ('relationnelle', 'privilege', 'temps', 'materielle')),
  tier text not null check (tier in ('daily', 'weekly')),
  is_available boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  last_granted_at timestamptz
);

create index reward_instance_child_id_idx on reward_instance(child_id);

alter table reward_instance enable row level security;

create policy reward_instance_select on reward_instance
  for select to authenticated
  using (is_household_member((select household_id from child where id = child_id)));

create policy reward_instance_insert on reward_instance
  for insert to authenticated
  with check (is_household_member((select household_id from child where id = child_id)));

create policy reward_instance_update on reward_instance
  for update to authenticated
  using (is_household_member((select household_id from child where id = child_id)))
  with check (is_household_member((select household_id from child where id = child_id)));
