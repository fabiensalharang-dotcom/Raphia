-- Réglages : retirer un enfant — aucune politique de suppression n'existait
-- sur child (seuls select/insert/update avaient été prévus), donc
-- supprimerEnfant() était bloqué en silence par RLS (0 ligne affectée, pas
-- d'erreur remontée par PostgREST).
create policy child_delete on child
  for delete to authenticated
  using (is_household_member(household_id));
