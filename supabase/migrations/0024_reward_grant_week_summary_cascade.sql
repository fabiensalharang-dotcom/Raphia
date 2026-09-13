-- §11.3 : correctif découvert en construisant la suppression de compte —
-- reward_grant.week_summary_id (ajoutée en L7, migration 0017) n'avait
-- aucune action de suppression, ce qui bloque la suppression en cascade
-- d'un foyer dès qu'une récompense hebdomadaire a été attribuée.
alter table reward_grant drop constraint if exists reward_grant_week_summary_id_fkey;
alter table reward_grant
  add constraint reward_grant_week_summary_id_fkey
  foreign key (week_summary_id) references week_summary(id) on delete cascade;
