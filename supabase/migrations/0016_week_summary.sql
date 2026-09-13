-- §4.3 : le résumé hebdomadaire fige le résultat de la semaine, exactement
-- comme day_entry.threshold_applied fige le seuil du jour (garde-fou #6 :
-- ne jamais réécrire l'historique quand un seuil change). Calculé une
-- seule fois, à la clôture du dernier jour de la semaine (§5.3).
create table week_summary (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child(id) on delete cascade,
  iso_year int not null,
  iso_week int not null,
  points_total int not null,
  days_threshold_met int not null,
  weekly_threshold_applied int not null,
  weekly_threshold_met boolean not null,
  computed_at timestamptz not null default now(),
  unique (child_id, iso_year, iso_week)
);

create index week_summary_child_id_idx on week_summary(child_id);

alter table week_summary enable row level security;

create policy week_summary_select on week_summary
  for select to authenticated
  using (is_household_member((select household_id from child where id = child_id)));

create policy week_summary_insert on week_summary
  for insert to authenticated
  with check (is_household_member((select household_id from child where id = child_id)));
