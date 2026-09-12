-- §3.3 : parcours d'installation. Le consentement (§11.2) et la création du
-- foyer sont amorcés ensemble : household + caregiver owner + consent_record
-- ('privacy_policy') en une seule opération atomique, en security definer
-- pour la même raison que create_household (0006) — impossible de créer ces
-- lignes séparément sous RLS avant que le caregiver n'existe.
--
-- create_household (0006) reste inchangée (utilisée par le test d'isolation) ;
-- cette fonction est dédiée à l'écran de consentement réel de l'app.
create or replace function complete_household_onboarding(
  p_name text,
  p_timezone text,
  p_display_name text,
  p_consent_version text,
  p_week_start_day smallint default 1
)
returns household
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household household;
  v_caregiver_id uuid;
begin
  insert into household (name, timezone, week_start_day)
  values (p_name, p_timezone, p_week_start_day)
  returning * into v_household;

  insert into caregiver (household_id, auth_user_id, display_name, role)
  values (v_household.id, auth.uid(), p_display_name, 'owner')
  returning id into v_caregiver_id;

  insert into consent_record (household_id, child_id, type, version, given_by_caregiver_id)
  values (v_household.id, null, 'privacy_policy', p_consent_version, v_caregiver_id);

  return v_household;
end;
$$;

revoke all on function complete_household_onboarding(text, text, text, text, smallint) from public;
grant execute on function complete_household_onboarding(text, text, text, text, smallint) to authenticated;
