-- §4.3 : une ligne par jour et par enfant. threshold_applied est une copie
-- figée du seuil au moment de la création de la journée — changer le seuil
-- plus tard ne doit jamais réécrire l'historique (§5.2, garde-fou #6).
-- points_total est recalculé, jamais saisi directement par le client.
create table day_entry (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child(id) on delete cascade,
  date date not null,
  points_total int not null default 0,
  threshold_applied int not null,
  threshold_met boolean not null default false,
  is_closed boolean not null default false,
  closed_at timestamptz,
  unique (child_id, date)
);

create index day_entry_child_id_idx on day_entry(child_id);

alter table day_entry enable row level security;

create policy day_entry_select on day_entry
  for select to authenticated
  using (is_household_member((select household_id from child where id = child_id)));

create policy day_entry_insert on day_entry
  for insert to authenticated
  with check (is_household_member((select household_id from child where id = child_id)));

create policy day_entry_update on day_entry
  for update to authenticated
  using (is_household_member((select household_id from child where id = child_id)))
  with check (is_household_member((select household_id from child where id = child_id)));
