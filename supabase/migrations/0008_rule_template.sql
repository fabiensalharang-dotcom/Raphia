-- §4.2 : référentiel des règles, global, non lié à un foyer, lecture seule
-- pour tous les clients (§8.3).
create table rule_template (
  id uuid primary key default gen_random_uuid(),
  locale text not null default 'fr-FR',
  category text not null check (category in ('autonomie', 'securite', 'social', 'scolaire', 'ecrans', 'emotions', 'organisation')),
  label text not null,
  short_label text not null,
  icon text not null,
  age_min int not null,
  age_max int not null,
  focus_year int not null,
  is_thematic_eligible boolean not null default false,
  default_points int not null default 1,
  difficulty text not null check (difficulty in ('facile', 'moyenne', 'exigeante')),
  split_into uuid[] not null default '{}',
  version int not null default 1,
  check (age_min <= age_max)
);

alter table rule_template enable row level security;

create policy rule_template_select on rule_template
  for select to authenticated
  using (true);
