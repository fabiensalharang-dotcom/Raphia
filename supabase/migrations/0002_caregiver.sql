-- §4.3 : les adultes du foyer. Un compte Supabase Auth (auth_user_id) correspond
-- à un seul caregiver — le second parent (§3.1) se connecte au même foyer.
create table caregiver (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

create index caregiver_household_id_idx on caregiver(household_id);

alter table caregiver enable row level security;
