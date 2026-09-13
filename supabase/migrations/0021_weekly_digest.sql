-- §7.9 : « même structure » que daily_digest, rattachée à week_summary_id.
-- Le bilan hebdomadaire n'a pas de banque de 9 types comme le quotidien —
-- son contenu (règle la plus régulière, règle la plus progressée, focus,
-- comparaison) est toujours le même gabarit, seules les valeurs varient —
-- mais le principe reste identique : clé + variante + valeurs, jamais de
-- texte rendu stocké.
create table weekly_digest (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child(id) on delete cascade,
  week_summary_id uuid not null references week_summary(id) on delete cascade,
  template_key text not null,
  template_variant int not null,
  slots jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  shared_at timestamptz,
  unique (week_summary_id)
);

create index weekly_digest_child_id_idx on weekly_digest(child_id);

alter table weekly_digest enable row level security;

create policy weekly_digest_select on weekly_digest
  for select to authenticated
  using (is_household_member((select household_id from child where id = child_id)));

create policy weekly_digest_insert on weekly_digest
  for insert to authenticated
  with check (is_household_member((select household_id from child where id = child_id)));

create policy weekly_digest_update on weekly_digest
  for update to authenticated
  using (is_household_member((select household_id from child where id = child_id)))
  with check (is_household_member((select household_id from child where id = child_id)));
