-- §10.2, §11.3 : les politiques insert/delete de telemetry_event
-- interrogeaient directement caregiver depuis la politique d'une autre
-- table — testé en conditions réelles (session authentifiée, foyer
-- existant), l'insertion et la suppression échouaient toutes les deux
-- avec « new row violates row-level security policy ». is_household_member
-- (0005) documente déjà pourquoi cette indirection doit passer par une
-- fonction security definer plutôt qu'une sous-requête directe sur
-- caregiver. On applique ici le même remède.
create or replace function household_pseudonym_is_caller(target_pseudonym text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from caregiver
    where auth_user_id = auth.uid()
      and household_pseudonym(household_id) = target_pseudonym
  );
$$;

drop policy if exists telemetry_event_insert on telemetry_event;
create policy telemetry_event_insert on telemetry_event
  for insert to authenticated
  with check (household_pseudonym_is_caller(household_pseudonym));

drop policy if exists telemetry_event_delete on telemetry_event;
create policy telemetry_event_delete on telemetry_event
  for delete to authenticated
  using (household_pseudonym_is_caller(household_pseudonym));
