-- Complète reward_grant (0015, lot L6) : week_summary_id n'avait pas pu
-- être créée avant que week_summary n'existe. Ne change rien à ce qui
-- fonctionne déjà — day_entry_id reste renseigné pour l'attribution
-- hebdomadaire (le dernier jour de la semaine), week_summary_id vient
-- s'y ajouter pour rattacher explicitement le don au résumé figé (§4.3).
alter table reward_grant add column week_summary_id uuid references week_summary(id);
