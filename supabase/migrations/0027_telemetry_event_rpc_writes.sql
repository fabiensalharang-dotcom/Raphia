-- §10.2, §11.3 : 0022/0025/0026 tentaient d'autoriser l'insertion et la
-- suppression directes du client via des politiques RLS s'appuyant sur
-- caregiver. Testé de façon répétée avec une session authentifiée réelle,
-- household_pseudonym_is_caller() renvoie true en appel RPC direct, mais
-- la même expression utilisée comme with check/using sur telemetry_event
-- rejette systématiquement l'écriture (« new row violates row-level
-- security policy »), sans explication trouvée après investigation
-- poussée. On contourne le problème plutôt que de continuer à le
-- chercher : toute écriture passe désormais par une fonction security
-- definer dédiée, qui vérifie l'appartenance au foyer elle-même puis
-- écrit en s'affranchissant de la RLS (comme is_household_member le fait
-- déjà pour la lecture). Le client n'a plus besoin de connaître le
-- pseudonyme : il passe directement le household_id, calculé et haché
-- côté serveur.
drop policy if exists telemetry_event_insert on telemetry_event;
drop policy if exists telemetry_event_delete on telemetry_event;

create or replace function enregistrer_evenement_telemetrie(
  p_household_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_child_age int default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not is_household_member(p_household_id) then
    raise exception 'not a household member';
  end if;

  insert into telemetry_event (household_pseudonym, event_type, child_age, payload)
  values (household_pseudonym(p_household_id), p_event_type, p_child_age, p_payload);
end;
$$;

grant execute on function enregistrer_evenement_telemetrie(uuid, text, jsonb, int) to authenticated;

create or replace function supprimer_telemetrie_foyer(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not is_household_member(p_household_id) then
    raise exception 'not a household member';
  end if;

  delete from telemetry_event where household_pseudonym = household_pseudonym(p_household_id);
end;
$$;

grant execute on function supprimer_telemetrie_foyer(uuid) to authenticated;
