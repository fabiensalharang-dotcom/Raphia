-- §4.3 : un cochage par règle et par jour. L'état not_applicable est
-- indispensable (§4.3) : une règle scolaire n'a pas de sens un dimanche, et
-- ne doit compter ni dans le score ni dans les statistiques d'échec.
create table rule_check (
  id uuid primary key default gen_random_uuid(),
  day_entry_id uuid not null references day_entry(id) on delete cascade,
  rule_instance_id uuid not null references rule_instance(id) on delete cascade,
  state text not null default 'not_respected' check (state in ('respected', 'not_respected', 'not_applicable')),
  points_awarded int not null default 0,
  checked_at timestamptz not null default now(),
  unique (day_entry_id, rule_instance_id)
);

create index rule_check_day_entry_id_idx on rule_check(day_entry_id);

alter table rule_check enable row level security;

create policy rule_check_select on rule_check
  for select to authenticated
  using (
    is_household_member(
      (select household_id from child where id = (select child_id from day_entry where id = day_entry_id))
    )
  );

create policy rule_check_insert on rule_check
  for insert to authenticated
  with check (
    is_household_member(
      (select household_id from child where id = (select child_id from day_entry where id = day_entry_id))
    )
  );

create policy rule_check_update on rule_check
  for update to authenticated
  using (
    is_household_member(
      (select household_id from child where id = (select child_id from day_entry where id = day_entry_id))
    )
  )
  with check (
    is_household_member(
      (select household_id from child where id = (select child_id from day_entry where id = day_entry_id))
    )
  );
