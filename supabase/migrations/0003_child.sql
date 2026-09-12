-- §4.3 : l'enfant. Prénom seul, jamais de nom de famille ni de photo (§11.3).
-- birth_date complète : nécessaire au calcul d'âge (D4) et à la notification
-- d'anniversaire au jour exact (§6.6).
create table child (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household(id) on delete cascade,
  first_name text not null,
  birth_date date not null,
  avatar_key text,
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index child_household_id_idx on child(household_id);

alter table child enable row level security;
