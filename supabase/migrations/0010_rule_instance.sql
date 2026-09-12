-- §4.3 : les règles réellement actives d'un enfant. Copie modifiable du
-- template — le libellé ne doit jamais être relu depuis rule_template.
create table rule_instance (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child(id) on delete cascade,
  template_id uuid references rule_template(id),
  label text not null,
  short_label text not null,
  icon text not null,
  points int not null default 1,
  is_thematic boolean not null default false,
  bonus_value int not null default 2,
  status text not null default 'active' check (status in ('active', 'acquired', 'retired')),
  display_order int not null default 0,
  started_at timestamptz not null default now(),
  acquired_at timestamptz,
  retired_at timestamptz
);

create index rule_instance_child_id_idx on rule_instance(child_id);

-- D8/§4.3 : une seule règle thématique par enfant.
create unique index rule_instance_one_thematic_per_child
  on rule_instance(child_id)
  where is_thematic and status = 'active';

-- D8/§4.3 : maximum 6 règles actives par enfant, thématique incluse.
-- Contrainte dure à faire respecter côté base ET côté interface — ceci est
-- le côté base, un CHECK ne pouvant pas compter les lignes d'une table.
create or replace function enforce_max_active_rules()
returns trigger
language plpgsql
as $$
declare
  v_active_count int;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select count(*) into v_active_count
  from rule_instance
  where child_id = new.child_id
    and status = 'active'
    and id <> new.id;

  if v_active_count >= 6 then
    raise exception 'Un enfant ne peut pas avoir plus de 6 règles actives (D8)';
  end if;

  return new;
end;
$$;

create trigger rule_instance_max_active
  before insert or update on rule_instance
  for each row
  execute function enforce_max_active_rules();

alter table rule_instance enable row level security;

create policy rule_instance_select on rule_instance
  for select to authenticated
  using (is_household_member((select household_id from child where id = child_id)));

create policy rule_instance_insert on rule_instance
  for insert to authenticated
  with check (is_household_member((select household_id from child where id = child_id)));

create policy rule_instance_update on rule_instance
  for update to authenticated
  using (is_household_member((select household_id from child where id = child_id)))
  with check (is_household_member((select household_id from child where id = child_id)));
