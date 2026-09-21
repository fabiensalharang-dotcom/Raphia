-- §5.5, §7.10 (nouvelle direction) : la journée ne se clôture plus par une
-- action manuelle du parent — elle reste modifiable jusqu'à la fenêtre de
-- grâce habituelle (estJourModifiable), sans bouton à cliquer. validated_at
-- distingue un jour réellement passé en revue par le parent (même à 0 point)
-- d'un jour jamais ouvert : seul le premier génère un bilan (garde-fou #16
-- étendu — on ne relance jamais sur un silence, on ne bilan jamais un
-- silence non plus).
alter table day_entry add column validated_at timestamptz;

-- Le rappel du soir (rituel non fait) passe de 21h à 19h ; la notification
-- du bilan n'est plus programmée le soir mais le lendemain matin (calculée
-- côté application, cf. programmerNotificationBilanMatin), digest_time ne
-- sert donc plus qu'au rappel du soir.
alter table household alter column digest_time set default '19:00:00';
update household set digest_time = '19:00:00' where digest_time = '21:00:00';
