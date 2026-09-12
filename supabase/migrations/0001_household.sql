-- §4.3 : le foyer. week_start_day suit la convention ISO 8601 (1 = lundi ... 7 = dimanche),
-- cohérente avec iso_year/iso_week utilisés plus loin pour week_summary (§4.3).
create extension if not exists pgcrypto with schema extensions;

create table household (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  locale text not null default 'fr-FR',
  timezone text not null,
  week_start_day smallint not null default 1 check (week_start_day between 1 and 7),
  created_at timestamptz not null default now()
);

-- RLS activée sans exception (§8.3) dès la création de la table. Les politiques
-- d'accès arrivent en session 3 ; en attendant, tant qu'aucune politique n'existe,
-- l'accès via l'API est refusé par défaut — pas de fenêtre d'exposition.
alter table household enable row level security;
