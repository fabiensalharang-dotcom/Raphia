-- §5.2 : le Défi (règle thématique) reste additif par défaut. Un parent peut
-- le rendre « bloquant » depuis le référentiel : dans ce cas, un Défi non
-- tenu empêche la récompense du jour même si le total de points dépasse le
-- seuil. Colonne sans effet tant qu'elle n'est pas activée explicitement.
alter table rule_instance add column thematic_blocking boolean not null default false;
