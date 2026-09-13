-- §10.2, §11.3 : 0025 a introduit household_pseudonym_is_caller() avec
-- search_path = public, comme is_household_member() — mais contrairement
-- à elle, cette fonction appelle household_pseudonym(), qui utilise
-- digest() (pgcrypto, schéma extensions chez Supabase). Restreindre le
-- search_path à public seul rend digest() introuvable : testé en conditions
-- réelles, l'insertion échouait avec « function digest(text, unknown) does
-- not exist ». Il faut inclure extensions dans le search_path.
create or replace function household_pseudonym_is_caller(target_pseudonym text)
returns boolean
language sql
security definer
set search_path = public, extensions
stable
as $$
  select exists (
    select 1 from caregiver
    where auth_user_id = auth.uid()
      and household_pseudonym(household_id) = target_pseudonym
  );
$$;
