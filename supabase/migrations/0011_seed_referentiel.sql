-- Corpus initial validé (docs/referentiel.md). Généré à partir du document
-- validé avec l'utilisateur -- ne pas modifier à la main sans mettre à jour
-- docs/referentiel.md en parallèle.

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('a1d24546-1059-469e-a0fa-cf72eb29cdc1', 'autonomie', 'Je m''habille tout seul le matin', 'Je m’habille seul', 'shirt', 3, 6, 4, true, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('517fa1e8-7e96-4726-9d41-83260ab6aba6', 'autonomie', 'Je me brosse les dents sans qu''on me le rappelle', 'Dents sans rappel', 'toothbrush', 4, 8, 5, true, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('77dd1647-3260-4b1f-a8af-7eddf2f57c76', 'autonomie', 'Je prépare mon cartable la veille', 'Cartable la veille', 'backpack', 6, 10, 7, true, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('298c4195-951f-4def-b21b-971682a5e788', 'autonomie', 'Je me douche tout seul', 'Douche toute seule', 'shower', 7, 11, 8, true, 'exigeante', array['1cbacad7-d6ef-41b8-8e82-781f1990290e'::uuid]);

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('1cbacad7-d6ef-41b8-8e82-781f1990290e', 'autonomie', 'Je me lave les mains et le visage tout seul', 'Mains et visage seul', 'soap', 5, 9, 6, false, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('f45e9566-a623-4ade-a853-e2d06d7d13c3', 'autonomie', 'Je me réveille avec mon réveil sans qu''on vienne me chercher', 'Réveil sans rappel', 'alarm-clock', 8, 11, 9, true, 'exigeante', array['56a87f33-f51a-446a-9744-1c25839e7e6a'::uuid]);

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('56a87f33-f51a-446a-9744-1c25839e7e6a', 'autonomie', 'Je me lève dès la première sonnerie du réveil', 'Je me lève au réveil', 'alarm-clock', 7, 10, 8, false, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('c5df41ba-4271-43bc-baad-f135b54dfddc', 'autonomie', 'Je choisis mes vêtements tout seul', 'Je choisis mes habits', 'hanger', 4, 7, 5, false, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('1f986e38-9a30-4282-9f52-378b1c20e3af', 'securite', 'Je tiens la main pour traverser la rue', 'Main pour traverser', 'crosswalk', 3, 6, 4, false, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('b977fde6-7534-42f6-a02e-6f58cb77312c', 'securite', 'Je mets mon casque pour faire du vélo', 'Casque à vélo', 'helmet', 4, 9, 6, true, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('6495b5d2-8fb1-4971-afdb-c6c84f997766', 'securite', 'Je reste dans mon champ de vision au parc', 'Je reste visible', 'park', 3, 7, 5, false, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('2b9caf57-c1e2-4d52-81e3-7c61775bf85a', 'securite', 'Je connais mon adresse et le numéro de mes parents', 'Adresse et numéro', 'phone', 6, 9, 7, false, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('da6be42a-937a-4a69-90a6-09c6ecec371c', 'securite', 'J''attache ma ceinture dès que je monte en voiture', 'Ceinture en voiture', 'seatbelt', 4, 8, 5, true, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('0b050e49-80b4-4973-b124-32cbfb031df4', 'securite', 'Je n''ouvre pas la porte à quelqu''un que je ne connais pas', 'Pas la porte à un inconnu', 'door', 7, 11, 8, false, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('b3e67970-ff7c-4f23-80f7-e98488761dc2', 'social', 'Je dis bonjour et au revoir', 'Bonjour / au revoir', 'wave', 3, 6, 4, false, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('b6c54136-7f91-44cd-afd8-d38646fab44e', 'social', 'Je partage mes jouets', 'Je partage', 'toys', 3, 6, 4, true, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('b0e5193f-e5ab-4643-98ae-29a5b2577946', 'social', 'Je dis s''il te plaît et merci', 'S''il te plaît, merci', 'heart', 3, 7, 4, false, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('a380c087-7003-4297-b784-1e2e294901e5', 'social', 'J''attends mon tour sans couper la parole', 'J''attends mon tour', 'hourglass', 5, 9, 6, true, 'exigeante', array['2d953585-9a5e-4a93-9d77-f04af1e5b0fa'::uuid]);

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('2d953585-9a5e-4a93-9d77-f04af1e5b0fa', 'social', 'Je lève la main avant de parler', 'Je lève la main', 'hand-raised', 5, 8, 6, false, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('a35cf87a-371d-486f-86f2-47f2311ef172', 'social', 'Je dis pardon quand j''ai fait de la peine à quelqu''un', 'Je dis pardon', 'heart', 5, 9, 6, false, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('397fb40d-fa37-423c-a306-6f0f60276230', 'social', 'J''invite un copain ou une copine à jouer', 'J''invite un copain', 'friends', 6, 10, 8, false, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('3e551a4b-d105-4897-90bc-ba46216c35d2', 'scolaire', 'Je fais mes devoirs avant de jouer', 'Devoirs avant de jouer', 'pencil', 6, 11, 8, true, 'exigeante', array['32f27a36-f5c9-4448-bca8-d39dfe81102b'::uuid]);

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('32f27a36-f5c9-4448-bca8-d39dfe81102b', 'scolaire', 'Je sors mes devoirs de mon cartable', 'Je sors mes devoirs', 'pencil', 6, 9, 7, false, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('2e4f0d37-00fc-4fc5-98ff-070c795c2562', 'scolaire', 'Je lis 10 minutes avant de dormir', 'Je lis 10 minutes', 'book', 6, 11, 8, true, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('1d131aba-6380-463e-b354-114f9bb63aac', 'scolaire', 'Je vérifie que je n''ai rien oublié dans mon cartable', 'Rien oublié', 'checklist', 7, 11, 9, false, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('b7a053db-0cd4-4171-96f0-8e4830285fc5', 'scolaire', 'Je range mon bureau avant de commencer mes devoirs', 'Bureau rangé', 'desk', 7, 10, 8, false, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('0c56baa2-04f7-4172-a37d-0805dada502b', 'ecrans', 'Je respecte le temps d''écran prévu', 'Temps d''écran respecté', 'screen-off', 5, 11, 8, true, 'exigeante', array['4b4d181c-1bb9-41b9-8baa-21553a4b3fb2'::uuid]);

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('4b4d181c-1bb9-41b9-8baa-21553a4b3fb2', 'ecrans', 'J''éteins l''écran dès qu''on me le demande', 'J''éteins tout de suite', 'screen-off', 5, 9, 6, false, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('317d95ce-a4d4-4b49-8083-768b1a360261', 'ecrans', 'Je demande avant d''allumer un écran', 'Je demande avant', 'screen', 4, 8, 5, false, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('49e80d7c-9b58-4c92-a50c-ce485055b22f', 'ecrans', 'Pas d''écran à table', 'Pas d''écran à table', 'table', 4, 11, 6, false, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('b01dc269-f2ea-4e2c-8089-698501b6bdd0', 'ecrans', 'Pas d''écran une heure avant de dormir', 'Pas d’écran avant dodo', 'moon', 6, 11, 8, false, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('f6682ed4-6066-4fde-92db-2b648209b706', 'emotions', 'Je dis ce que je ressens avec des mots', 'Je dis ce que je ressens', 'speech-bubble', 4, 9, 5, true, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('ee5adbc0-736b-4b67-8544-73089e9ccdb4', 'emotions', 'J’accepte un non sans crier', 'J''accepte un non', 'stop-hand', 3, 7, 4, true, 'exigeante', array['8fbbddeb-2767-4821-8946-b95ae4d8a2b6'::uuid]);

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('8fbbddeb-2767-4821-8946-b95ae4d8a2b6', 'emotions', 'Je respire un grand coup quand je suis en colère', 'Je respire un coup', 'lungs', 4, 7, 5, false, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('5e5d5127-e480-4427-8bb0-1723af4b7554', 'emotions', 'Je demande de l’aide quand je suis bloqué', 'Je demande de l''aide', 'raised-hand', 5, 9, 6, false, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('053db51c-7b84-4839-8234-d6a46c1acb88', 'emotions', 'Je reste calme si les choses ne se passent pas comme prévu', 'Je reste calme', 'calm', 6, 10, 8, false, 'exigeante', array['8fbbddeb-2767-4821-8946-b95ae4d8a2b6'::uuid]);

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('73237184-6742-4b2d-bc2c-ace14b79d298', 'organisation', 'Je range mes jouets après avoir joué', 'Je range mes jouets', 'box', 3, 7, 4, true, 'moyenne', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('0b8dae51-344f-45b6-867d-c68b983b3901', 'organisation', 'Je mets la table', 'Je mets la table', 'table-setting', 5, 9, 6, true, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('c022d667-612b-478d-a17c-c8d64721ffb2', 'organisation', 'Je débarrasse la table', 'Je débarrasse', 'table-setting', 5, 9, 6, false, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('5d0cfd7e-f3a4-4204-9be5-8b823f03bded', 'organisation', 'J''accroche mon manteau en rentrant', 'J’accroche mon manteau', 'coat-hook', 4, 8, 5, false, 'facile', '{}');

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('41044552-f172-4c13-b34e-7b1ce964f271', 'organisation', 'Je prépare mes affaires du lendemain avant de dormir', 'Affaires du lendemain', 'clothes', 7, 11, 9, true, 'exigeante', array['5d0cfd7e-f3a4-4204-9be5-8b823f03bded'::uuid]);

insert into rule_template (id, category, label, short_label, icon, age_min, age_max, focus_year, is_thematic_eligible, difficulty, split_into) values
  ('aefdecd0-bba7-4c06-bfff-b3b5f6167941', 'organisation', 'Je mets mon linge sale dans le panier', 'Linge sale au panier', 'basket', 4, 8, 5, false, 'facile', '{}');

-- Corpus initial validé (docs/referentiel.md) — récompenses.

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('5 minutes de jeu avec un parent au choix', 'relationnelle', 'daily', 3, 11, true);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Choisir l''histoire du soir', 'relationnelle', 'daily', 3, 8, true);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Un moment complice avec un parent avant le coucher', 'relationnelle', 'daily', 3, 11, true);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Une bataille de chatouilles ou un gros câlin', 'relationnelle', 'daily', 3, 7, true);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('10 minutes d''écran supplémentaires', 'privilege', 'daily', 5, 11, false);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Choisir le repas du soir', 'privilege', 'daily', 4, 11, false);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Se coucher 15 minutes plus tard', 'privilege', 'daily', 5, 11, false);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Choisir la musique dans la voiture', 'privilege', 'daily', 4, 11, false);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Un bonbon ou un carré de chocolat', 'materielle', 'daily', 3, 11, false);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Un sticker à coller sur son tableau', 'materielle', 'daily', 3, 7, false);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Sortie au parc ou à la piscine avec un parent', 'temps', 'weekly', 3, 9, true);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Une activité en tête-à-tête avec un parent, à son choix', 'temps', 'weekly', 3, 11, true);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Soirée pyjama-film en famille, film choisi par l’enfant', 'relationnelle', 'weekly', 4, 11, true);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Inviter un copain ou une copine à la maison', 'relationnelle', 'weekly', 5, 11, true);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Choisir la sortie du week-end en famille', 'privilege', 'weekly', 4, 11, false);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Un petit jouet ou objet peu coûteux', 'materielle', 'weekly', 3, 11, false);

insert into reward_template (label, category, tier, age_min, age_max, requires_parent_time) values
  ('Une glace ou un goûter spécial', 'materielle', 'weekly', 3, 11, false);

