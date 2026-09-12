-- Amorçage de la création de foyer (§3.3 parcours d'installation).
-- Problème résolu : juste après l'inscription, aucun caregiver n'existe
-- encore pour le nouveau household, donc la policy household_select
-- (is_household_member) ne peut pas être satisfaite avant que le caregiver
-- owner soit créé. Cette fonction crée les deux lignes ensemble, en
-- security definer pour s'affranchir de la RLS le temps de cette seule
-- opération d'amorçage. Utilisée par l'écran de création de foyer (L1
-- session 5) comme par le test d'isolation.
create or replace function create_household(
  p_name text,
  p_timezone text,
  p_display_name text,
  p_week_start_day smallint default 1
)
returns household
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household household;
begin
  insert into household (name, timezone, week_start_day)
  values (p_name, p_timezone, p_week_start_day)
  returning * into v_household;

  insert into caregiver (household_id, auth_user_id, display_name, role)
  values (v_household.id, auth.uid(), p_display_name, 'owner');

  return v_household;
end;
$$;

revoke all on function create_household(text, text, text, smallint) from public;
grant execute on function create_household(text, text, text, smallint) to authenticated;
