-- §4.2 : catalogue des récompenses, global, lecture seule pour tous les
-- clients (§8.3). Le catalogue est créé dès L2 (corpus validé ensemble),
-- mais son utilisation réelle (menu, seuil, attribution) est le lot L6.
create table reward_template (
  id uuid primary key default gen_random_uuid(),
  locale text not null default 'fr-FR',
  label text not null,
  category text not null check (category in ('relationnelle', 'privilege', 'temps', 'materielle')),
  tier text not null check (tier in ('daily', 'weekly')),
  age_min int not null,
  age_max int not null,
  requires_parent_time boolean not null default false,
  check (age_min <= age_max)
);

alter table reward_template enable row level security;

create policy reward_template_select on reward_template
  for select to authenticated
  using (true);
