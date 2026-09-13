-- §10.2 : table séparée, sans identifiant d'enfant ni prénom. L'identifiant
-- de foyer est pseudonymisé par hachage — non réversible côté analyse — et
-- calculé côté base pour que le sel ne circule jamais dans le client.
create or replace function household_pseudonym(p_household_id uuid)
returns text
language sql
stable
as $$
  select encode(digest(p_household_id::text || 'raphia-telemetry-v1', 'sha256'), 'hex');
$$;

grant execute on function household_pseudonym(uuid) to authenticated;

create table telemetry_event (
  id uuid primary key default gen_random_uuid(),
  household_pseudonym text not null,
  event_type text not null check (
    event_type in (
      'rule_kept', 'rule_discarded', 'rule_relabeled', 'suggestion_accepted',
      'suggestion_dismissed', 'reward_chosen', 'digest_opened', 'card_shared', 'day_closed'
    )
  ),
  child_age int,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index telemetry_event_pseudonym_idx on telemetry_event(household_pseudonym);

alter table telemetry_event enable row level security;

-- Aucune politique de lecture : la collecte est interne, exploitée hors
-- application (§10.2 « aucun outil d'analyse tiers, la collecte est
-- interne, en base, point »). Seul le rôle de service peut la lire.
create policy telemetry_event_insert on telemetry_event
  for insert to authenticated
  with check (
    exists (
      select 1 from caregiver c
      where c.auth_user_id = auth.uid()
        and household_pseudonym(c.household_id) = telemetry_event.household_pseudonym
    )
  );

-- §11.3 : la suppression de compte doit emporter la télémétrie du foyer.
create policy telemetry_event_delete on telemetry_event
  for delete to authenticated
  using (
    exists (
      select 1 from caregiver c
      where c.auth_user_id = auth.uid()
        and household_pseudonym(c.household_id) = telemetry_event.household_pseudonym
    )
  );
