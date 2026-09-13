-- §11.3 : suppression de compte — aucune politique de suppression n'existait
-- encore sur household (seuls select/insert/update avaient été prévus).
create policy household_delete on household
  for delete to authenticated
  using (is_household_member(id));
