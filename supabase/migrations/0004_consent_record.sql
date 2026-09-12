-- §4.3 / §11.2 : consentement versionné. Deux types :
--   'privacy_policy' : consentement du foyer à l'inscription et à chaque
--     changement de politique de confidentialité (§8.7) — child_id est nul.
--   'child_data'      : consentement spécifique donné à l'ajout d'un enfant —
--     child_id est renseigné.
create table consent_record (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household(id) on delete cascade,
  child_id uuid references child(id) on delete cascade,
  type text not null check (type in ('privacy_policy', 'child_data')),
  version text not null,
  given_by_caregiver_id uuid not null references caregiver(id) on delete cascade,
  given_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint consent_record_child_id_matches_type check (
    (type = 'child_data' and child_id is not null)
    or (type = 'privacy_policy' and child_id is null)
  )
);

create index consent_record_household_id_idx on consent_record(household_id);
create index consent_record_child_id_idx on consent_record(child_id);

alter table consent_record enable row level security;
