# Référentiel — premier jet

**Statut : brouillon à challenger, pas encore intégré en base.** Ce document précède le lot L2 (voir annexe du dossier de conception et `demarrage-developpement.md` §4). Une fois relu et ajusté, il sera transformé en migration SQL (`rule_template`, `reward_template`) et servira de jeu de test à la fonction de classement par année (`core/referential`).

Les clés (`R-AUTO-01`, etc.) ne sont pas stockées en base — elles servent uniquement à référencer une règle depuis `split_into` dans ce document. De vrais `uuid` seront générés au moment de la migration.

## Principes appliqués (annexe du dossier de conception)

1. Formulation à la première personne, à la positive.
2. Un seul comportement observable par règle.
3. Observable en fin de journée (le parent répond oui/non le soir).
4. `short_label` ≤ 28 caractères, compréhensible seul sur l'écran TV.
5. Chaque règle `exigeante` a un `split_into` vers une règle plus simple.
6. Récompenses relationnelles prioritaires sur les récompenses matérielles.

## Comment lire les tableaux

| Colonne | Signification |
|---|---|
| Clé | Repère interne à ce document |
| Libellé | `label` — formulation positive, 1ère personne |
| Affichage TV | `short_label` |
| Icône | `icon` — clé, pas d'asset choisi à ce stade |
| Âges | `age_min`–`age_max` |
| Pivot | `focus_year` — année où la règle est la plus pertinente |
| Difficulté | `facile` / `moyenne` / `exigeante` |
| Thématique | La règle peut-elle être choisie comme règle thématique (`is_thematic_eligible`) |
| Se découpe en | `split_into` — proposé si la règle échoue durablement (§6.3) |

---

## Catégorie : Autonomie

| Clé | Libellé | Affichage TV | Icône | Âges | Pivot | Difficulté | Thématique | Se découpe en |
|---|---|---|---|---|---|---|---|---|
| R-AUTO-01 | Je m'habille tout seul le matin | Je m'habille seul | shirt | 3–6 | 4 | facile | oui | — |
| R-AUTO-02 | Je me brosse les dents sans qu'on me le rappelle | Dents sans rappel | toothbrush | 4–8 | 5 | moyenne | oui | — |
| R-AUTO-03 | Je prépare mon cartable la veille | Cartable la veille | backpack | 6–10 | 7 | moyenne | oui | — |
| R-AUTO-04 | Je me douche tout seul | Douche toute seule | shower | 7–11 | 8 | exigeante | oui | R-AUTO-04B |
| R-AUTO-04B | Je me lave les mains et le visage tout seul | Mains et visage seul | soap | 5–9 | 6 | facile | non | — |
| R-AUTO-05 | Je me réveille avec mon réveil sans qu'on vienne me chercher | Réveil sans rappel | alarm-clock | 8–11 | 9 | exigeante | oui | R-AUTO-05B |
| R-AUTO-05B | Je me lève dès la première sonnerie du réveil | Je me lève au réveil | alarm-clock | 7–10 | 8 | moyenne | non | — |
| R-AUTO-06 | Je choisis mes vêtements tout seul | Je choisis mes habits | hanger | 4–7 | 5 | facile | non | — |

## Catégorie : Sécurité

| Clé | Libellé | Affichage TV | Icône | Âges | Pivot | Difficulté | Thématique | Se découpe en |
|---|---|---|---|---|---|---|---|---|
| R-SEC-01 | Je tiens la main pour traverser la rue | Main pour traverser | crosswalk | 3–6 | 4 | facile | non | — |
| R-SEC-02 | Je mets mon casque pour faire du vélo | Casque à vélo | helmet | 4–9 | 6 | facile | oui | — |
| R-SEC-03 | Je reste dans mon champ de vision au parc | Je reste visible | park | 3–7 | 5 | moyenne | non | — |
| R-SEC-04 | Je connais mon adresse et le numéro de mes parents | Adresse et numéro | phone | 6–9 | 7 | moyenne | non | — |
| R-SEC-05 | J'attache ma ceinture dès que je monte en voiture | Ceinture en voiture | seatbelt | 4–8 | 5 | facile | oui | — |
| R-SEC-06 | Je n'ouvre pas la porte à quelqu'un que je ne connais pas | Pas la porte à un inconnu | door | 7–11 | 8 | moyenne | non | — |

## Catégorie : Social

| Clé | Libellé | Affichage TV | Icône | Âges | Pivot | Difficulté | Thématique | Se découpe en |
|---|---|---|---|---|---|---|---|---|
| R-SOC-01 | Je dis bonjour et au revoir | Bonjour / au revoir | wave | 3–6 | 4 | facile | non | — |
| R-SOC-02 | Je partage mes jouets | Je partage | toys | 3–6 | 4 | moyenne | oui | — |
| R-SOC-03 | Je dis s'il te plaît et merci | S'il te plaît, merci | heart | 3–7 | 4 | facile | non | — |
| R-SOC-04 | J'attends mon tour sans couper la parole | J'attends mon tour | hourglass | 5–9 | 6 | exigeante | oui | R-SOC-04B |
| R-SOC-04B | Je lève la main avant de parler | Je lève la main | hand-raised | 5–8 | 6 | moyenne | non | — |
| R-SOC-05 | Je dis pardon quand j'ai fait de la peine à quelqu'un | Je dis pardon | heart | 5–9 | 6 | moyenne | non | — |
| R-SOC-06 | J'invite un copain ou une copine à jouer | J'invite un copain | friends | 6–10 | 8 | facile | non | — |

## Catégorie : Scolaire

| Clé | Libellé | Affichage TV | Icône | Âges | Pivot | Difficulté | Thématique | Se découpe en |
|---|---|---|---|---|---|---|---|---|
| R-SCO-01 | Je fais mes devoirs avant de jouer | Devoirs avant de jouer | pencil | 6–11 | 8 | exigeante | oui | R-SCO-01B |
| R-SCO-01B | Je sors mes devoirs de mon cartable | Je sors mes devoirs | pencil | 6–9 | 7 | facile | non | — |
| R-SCO-02 | Je lis 10 minutes avant de dormir | Je lis 10 minutes | book | 6–11 | 8 | moyenne | oui | — |
| R-SCO-03 | Je vérifie que je n'ai rien oublié dans mon cartable | Rien oublié | checklist | 7–11 | 9 | moyenne | non | — |
| R-SCO-04 | Je range mon bureau avant de commencer mes devoirs | Bureau rangé | desk | 7–10 | 8 | facile | non | — |

## Catégorie : Écrans

| Clé | Libellé | Affichage TV | Icône | Âges | Pivot | Difficulté | Thématique | Se découpe en |
|---|---|---|---|---|---|---|---|---|
| R-ECR-01 | Je respecte le temps d'écran prévu | Temps d'écran respecté | screen-off | 5–11 | 8 | exigeante | oui | R-ECR-01B |
| R-ECR-01B | J'éteins l'écran dès qu'on me le demande | J'éteins tout de suite | screen-off | 5–9 | 6 | moyenne | non | — |
| R-ECR-02 | Je demande avant d'allumer un écran | Je demande avant | screen | 4–8 | 5 | facile | non | — |
| R-ECR-03 | Pas d'écran à table | Pas d'écran à table | table | 4–11 | 6 | moyenne | non | — |
| R-ECR-04 | Pas d'écran une heure avant de dormir | Pas d'écran avant dodo | moon | 6–11 | 8 | moyenne | non | — |

## Catégorie : Émotions

| Clé | Libellé | Affichage TV | Icône | Âges | Pivot | Difficulté | Thématique | Se découpe en |
|---|---|---|---|---|---|---|---|---|
| R-EMO-01 | Je dis ce que je ressens avec des mots | Je dis ce que je ressens | speech-bubble | 4–9 | 5 | moyenne | oui | — |
| R-EMO-02 | J'accepte un non sans crier | J'accepte un non | stop-hand | 3–7 | 4 | exigeante | oui | R-EMO-02B |
| R-EMO-02B | Je respire un grand coup quand je suis en colère | Je respire un coup | lungs | 4–7 | 5 | moyenne | non | — |
| R-EMO-03 | Je demande de l'aide quand je suis bloqué | Je demande de l'aide | raised-hand | 5–9 | 6 | facile | non | — |
| R-EMO-04 | Je reste calme si les choses ne se passent pas comme prévu | Je reste calme | calm | 6–10 | 8 | exigeante | non | R-EMO-02B |

## Catégorie : Organisation

| Clé | Libellé | Affichage TV | Icône | Âges | Pivot | Difficulté | Thématique | Se découpe en |
|---|---|---|---|---|---|---|---|---|
| R-ORG-01 | Je range mes jouets après avoir joué | Je range mes jouets | box | 3–7 | 4 | moyenne | oui | — |
| R-ORG-02 | Je mets la table | Je mets la table | table-setting | 5–9 | 6 | facile | oui | — |
| R-ORG-03 | Je débarrasse la table | Je débarrasse | table-setting | 5–9 | 6 | facile | non | — |
| R-ORG-04 | J'accroche mon manteau en rentrant | J'accroche mon manteau | coat-hook | 4–8 | 5 | facile | non | — |
| R-ORG-05 | Je prépare mes affaires du lendemain avant de dormir | Affaires du lendemain | clothes | 7–11 | 9 | exigeante | oui | R-ORG-04 |
| R-ORG-06 | Je mets mon linge sale dans le panier | Linge sale au panier | basket | 4–8 | 5 | facile | non | — |

**Total : 42 règles** (36 principales + 6 versions simplifiées via `split_into`).

---

## Récompenses quotidiennes (`tier = daily`)

| Clé | Libellé | Catégorie | Âges | Temps parent requis |
|---|---|---|---|---|
| RW-D-01 | 5 minutes de jeu avec un parent au choix | relationnelle | 3–11 | oui |
| RW-D-02 | Choisir l'histoire du soir | relationnelle | 3–8 | oui |
| RW-D-03 | Un moment complice avec un parent avant le coucher | relationnelle | 3–11 | oui |
| RW-D-04 | Une bataille de chatouilles ou un gros câlin | relationnelle | 3–7 | oui |
| RW-D-05 | 10 minutes d'écran supplémentaires | privilège | 5–11 | non |
| RW-D-06 | Choisir le repas du soir | privilège | 4–11 | non |
| RW-D-07 | Se coucher 15 minutes plus tard | privilège | 5–11 | non |
| RW-D-08 | Choisir la musique dans la voiture | privilège | 4–11 | non |
| RW-D-09 | Un bonbon ou un carré de chocolat | matérielle | 3–11 | non |
| RW-D-10 | Un sticker à coller sur son tableau | matérielle | 3–7 | non |

## Récompenses hebdomadaires (`tier = weekly`)

| Clé | Libellé | Catégorie | Âges | Temps parent requis |
|---|---|---|---|---|
| RW-W-01 | Sortie au parc ou à la piscine avec un parent | temps | 3–9 | oui |
| RW-W-02 | Une activité en tête-à-tête avec un parent, à son choix | temps | 3–11 | oui |
| RW-W-03 | Soirée pyjama-film en famille, film choisi par l'enfant | relationnelle | 4–11 | oui |
| RW-W-04 | Inviter un copain ou une copine à la maison | relationnelle | 5–11 | oui |
| RW-W-05 | Choisir la sortie du week-end en famille | privilège | 4–11 | non |
| RW-W-06 | Un petit jouet ou objet peu coûteux | matérielle | 3–11 | non |
| RW-W-07 | Une glace ou un goûter spécial | matérielle | 3–11 | non |

**Total : 17 récompenses** (10 quotidiennes, 7 hebdomadaires). Sur les 5 récompenses quotidiennes proposées par défaut à la création (§4.2), au moins 3 devront être `relationnelle` ou `temps` — à vérifier au moment d'implémenter la sélection, pas seulement au niveau du catalogue.

---

## Points à trancher avec ta femme

1. **Couverture par âge inégale.** Certaines années (7-8 ans) ont plus de règles disponibles que d'autres (3 ans, 11 ans). À vérifier si c'est le reflet d'une réalité éducative ou juste un angle mort de rédaction.
2. **`securite` n'a aucune règle `exigeante`** — volontaire (la sécurité ne se "découpe" pas de la même façon) ou à enrichir ?
3. **Récompenses matérielles** : seulement 3 sur 17, toutes peu coûteuses — cohérent avec D7/§4.2, à confirmer que ça correspond à votre usage réel.
4. Les `icon` sont des clés provisoires, pas un choix graphique — un vrai jeu d'icônes reste à faire (hors périmètre code).

---

*Une fois ce document ajusté, je le transforme en migration SQL et j'écris la fonction de classement par année (`core/referential`), avec ses tests unitaires (règle non applicable un dimanche, enfant à la limite de deux tranches d'âge, etc.).*
