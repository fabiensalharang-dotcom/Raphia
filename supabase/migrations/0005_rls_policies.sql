-- §8.3 : RLS sur toutes les tables du foyer, aucune exception. Un caregiver
-- n'accède qu'aux lignes dont le household_id correspond à son propre foyer.
--
-- is_household_member() est en security definer : elle interroge caregiver
-- en s'affranchissant de la RLS de caregiver elle-même, ce qui évite toute
-- récursion des politiques qui l'utilisent (pattern standard Supabase).
create or replace function is_household_member(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from caregiver
    where household_id = target_household_id
      and auth_user_id = auth.uid()
  );
$$;

-- household -------------------------------------------------------------
-- Création libre : c'est l'acte même de créer son foyer à l'inscription,
-- avant qu'aucun caregiver n'existe encore pour le rattacher.
create policy household_insert on household
  for insert to authenticated
  with check (true);

create policy household_select on household
  for select to authenticated
  using (is_household_member(id));

create policy household_update on household
  for update to authenticated
  using (is_household_member(id))
  with check (is_household_member(id));

-- caregiver ---------------------------------------------------------------
-- On ne peut créer que sa propre ligne, et seulement si le foyer visé n'a
-- pas déjà de caregiver (pas de rattachement à un foyer existant en V1 :
-- le second parent réutilise le même compte, §3.1).
create policy caregiver_insert on caregiver
  for insert to authenticated
  with check (
    auth_user_id = auth.uid()
    and not exists (
      select 1 from caregiver existing where existing.household_id = caregiver.household_id
    )
  );

create policy caregiver_select on caregiver
  for select to authenticated
  using (is_household_member(household_id));

create policy caregiver_update on caregiver
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- child ---------------------------------------------------------------------
create policy child_insert on child
  for insert to authenticated
  with check (is_household_member(household_id));

create policy child_select on child
  for select to authenticated
  using (is_household_member(household_id));

create policy child_update on child
  for update to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

-- consent_record --------------------------------------------------------
-- Le consentement doit être attribué au caregiver qui l'exprime réellement.
create policy consent_record_insert on consent_record
  for insert to authenticated
  with check (
    is_household_member(household_id)
    and exists (
      select 1 from caregiver c
      where c.id = given_by_caregiver_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy consent_record_select on consent_record
  for select to authenticated
  using (is_household_member(household_id));

create policy consent_record_update on consent_record
  for update to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));
