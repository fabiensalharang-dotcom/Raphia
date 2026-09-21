# Dossier de conception — Application de tableau de comportement enfant

**Version 1.0 — Septembre 2026**
**Destinataire : Claude Code (document d'entrée de projet)**

---

## Comment utiliser ce document

Ce dossier est **décision-complète** : tous les arbitrages produit sont tranchés, il n'y a pas de « à définir ». Si une ambiguïté apparaît pendant l'implémentation, la règle est de **demander plutôt que de supposer**.

Ordre de lecture recommandé pour l'implémentation :
1. §1 Périmètre (ce qui est dans la V1 et surtout ce qui n'y est pas)
2. §4 Modèle de données
3. §5 Moteur de scoring
4. §6 Moteur de pilotage
5. §7 Bilan du soir
6. §8 Architecture
7. §9 Écrans
8. §12 Garde-fous — **à lire avant d'écrire la première ligne**

---

## 1. Périmètre

### 1.1 Objectif de la V1

Une application mobile permettant à un parent de **suivre quotidiennement le comportement de ses enfants** via un tableau de règles personnalisable par âge, avec un système de points, de seuils et de récompenses, et un **mode d'affichage lisible à distance** destiné à être projeté sur la TV par partage d'écran.

La V1 doit être **utilisable en vrai par une famille dès la première semaine**. C'est le critère d'arbitrage en cas de doute sur une fonctionnalité.

### 1.2 Dans la V1

| Fonction | Détail |
|---|---|
| Multi-enfant | Plusieurs enfants par foyer, tableaux indépendants |
| Référentiel de règles par âge | Proposition à la création, entièrement modifiable |
| Cochage par le parent | Le parent est le seul à saisir |
| Grille hebdomadaire | 7 jours, points par règle |
| Règle thématique | Une par enfant, avec bonus renforcé |
| Seuil quotidien | Déclenche l'accès à une récompense |
| Récompense hebdomadaire | Sur cumul de la semaine |
| Mode Affichage | Écran lecture seule, lisible à 3 mètres, pour partage d'écran TV |
| Courbes de progression | Sur 4, 8 et 12 semaines |
| Moteur de pilotage | Suggestions de changement de règle et de récompense |
| **Bilan du soir** | Séquence enfant sur l'écran partagé + note parent après le coucher |
| **Bilan hebdomadaire** | Version enrichie en fin de semaine |
| Conformité RGPD | Consentement, minimisation, purge, hébergement UE |
| Instrumentation | Collecte des signaux pour le futur référentiel autoapprenant |

### 1.3 Hors V1 — ne pas implémenter

| Reporté | Version | Motif |
|---|---|---|
| Accès adolescent (12-14 ans) | V2 | Logique produit différente : contrat négocié bidirectionnel, pas un tableau de notation descendant |
| Compte enfant / connexion enfant | V2 | Complexité RGPD majeure (double consentement, vérification d'âge) |
| Boucle d'apprentissage du référentiel | V2 | Sans valeur statistique en dessous de ~1 000 familles. On collecte, on ne pondère pas |
| Google Cast / récepteur web autonome | V1.5 | Le partage d'écran couvre le besoin sans friction |
| Co-parentalité (2 foyers) | V1.5 | |
| Rituel du soir guidé | V1.5 | |
| Traduction effective des contenus | V2 | Architecture prête, contenus en français uniquement |
| Export / bilan mensuel PDF | V2 | |
| API externe / multi-tenant B2B | V2 | Mais voir §8.5 : l'architecture doit le permettre sans refonte |

---

## 2. Décisions produit actées

| # | Décision | Implication technique |
|---|---|---|
| D1 | **Le parent coche, l'enfant regarde** | Pas d'authentification enfant, pas de file de validation |
| D2 | **Le mode Affichage est en lecture seule** | Aucune interaction sur l'écran projeté. Élimine la saisie à la télécommande |
| D3 | **TV par partage d'écran en V1** | Le mode Affichage est une vue de l'app mobile, mais isolée dans sa propre route pour devenir une page web autonome en V1.5 |
| D4 | **Paliers de développement + sélection par année** | Un seul corpus de règles, classé dynamiquement par année. Pas 12 référentiels |
| D5 | **Aucun point négatif, sous aucune forme** | Une règle non tenue n'ajoute simplement pas de point. Pas de malus, pas même en option. Aligné sur la doctrine pédopsychiatrique |
| D6 | **Une règle acquise n'est pas supprimée** | Elle bascule en statut `acquired`, reste visible, fait l'objet d'un contrôle ponctuel |
| D7 | **Menu de récompenses stable** | On varie la disponibilité et on suggère des ajouts, on ne fait pas tourner le menu |
| D8 | **Maximum 6 règles actives simultanées** | Contrainte dure, au-delà l'outil devient une liste de corvées |
| D9 | **Une seule nouvelle règle à la fois** | Le moteur de pilotage ne propose jamais deux ajouts en même temps |
| D10 | **Aucune publicité, aucun tracker tiers** | Contrainte réglementaire absolue, voir §11 |
| D11 | **Bilans par gabarits déterministes, aucune IA générative en V1** | Hors ligne, conformité, responsabilité, contrôle du ton. Voir §7.11 |
| D12 | **Le bilan quotidien reste très court** | La substance va dans le bilan hebdomadaire, sinon l'objet devient une corvée en trois semaines |
| D13 | **Notifications locales, email transactionnel séparé** | Aucune donnée de comportement ne transite par un service d'envoi. Voir §8.7 |

---

## 3. Utilisateurs et parcours

### 3.1 Personas

**Le parent référent** — installe l'app, crée les profils, coche le soir. C'est l'utilisateur unique de la V1. Il a 2 minutes par jour, pas plus.

**L'enfant (3-11 ans)** — ne manipule pas l'app. Il voit son tableau sur l'écran partagé pendant le rituel du soir. Il doit comprendre son score **sans savoir lire couramment** : couleurs, icônes, jauges.

**Le second parent** — V1.5. En V1, il peut se connecter au même compte foyer.

### 3.2 Parcours principal — le rituel du soir (le parcours critique)

```
Parent ouvre l'app
  → Écran du jour, enfant sélectionné par défaut
  → Lance le mode Affichage à tout moment (avant, pendant ou après le cochage — bouton dédié, indépendant)
  → Partage d'écran vers la TV
  → Coche/décoche chaque règle depuis le téléphone (1 tap par règle)
  → Renseigne la règle thématique (respectée ou non)
  → Score calculé en direct
  → SÉQUENCE ENFANT (20 s) rejouée à chaque relance du mode Affichage : score révélé, jauge, série, semaine
  → Si seuil atteint : l'enfant choisit sa récompense parmi celles disponibles
  → Parent valide la journée depuis l'écran du jour (rejouable en cas de correction)
  → Le lendemain matin, si la journée a été validée : notification du bilan parent
```

**Objectif de performance : moins de 90 secondes du lancement à la validation, pour un enfant.**

### 3.3 Parcours d'installation

```
Téléchargement
  → Création du compte parent (email + mot de passe)
  → Écran de consentement et d'information (§11.2)
  → Création du foyer
  → Ajout d'un enfant : prénom + date de naissance
  → Proposition automatique de 4 règles adaptées à l'âge + 1 règle thématique
  → Le parent ajuste (retire, modifie le libellé, ajoute)
  → Proposition de 5 récompenses quotidiennes + 2 hebdomadaires
  → Réglage du seuil (valeur proposée calculée, voir §5.4)
  → Prêt à l'emploi
```

**Contrainte : l'installation complète doit tenir en moins de 4 minutes.** Si un écran ralentit, il passe en réglage optionnel accessible plus tard.

---

## 4. Modèle de données

### 4.1 Vue d'ensemble

```
household (foyer)
  ├── caregiver (1..n)          — les adultes
  ├── child (1..n)
  │     ├── rule_instance (1..n)      — les règles du tableau
  │     ├── reward_instance (1..n)    — le menu de récompenses
  │     ├── day_entry (1..n)          — une ligne par jour
  │     │     ├── rule_check (1..n)   — un cochage par règle
  │     │     └── reward_grant (0..1)
  │     ├── week_summary (1..n)
  │     └── pilotage_suggestion (0..n)
  └── consent_record (1..n)

rule_template      — le référentiel (global, non lié à un foyer)
reward_template    — le catalogue de récompenses (global)
```

### 4.2 Tables du référentiel (données globales, en lecture seule côté app)

**`rule_template`**

| Champ | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `locale` | text | `fr-FR` en V1 |
| `category` | enum | `autonomie`, `securite`, `social`, `scolaire`, `ecrans`, `emotions`, `organisation` |
| `label` | text | Formulé **à la positive**, du point de vue de l'enfant. « Je prépare mon cartable la veille » |
| `short_label` | text | Version courte pour le mode Affichage (≤ 28 caractères) |
| `icon` | text | Clé d'icône |
| `age_min` / `age_max` | int | Bornes de pertinence |
| `focus_year` | int | Année où la règle est la plus pertinente — **sert au classement par année (D4)** |
| `is_thematic_eligible` | bool | Toutes les règles ne font pas une bonne règle thématique |
| `default_points` | int | 1 par défaut |
| `difficulty` | enum | `facile`, `moyenne`, `exigeante` — sert au calibrage du seuil |
| `split_into` | uuid[] | Règles plus simples proposées si celle-ci échoue durablement (§6.3) |
| `version` | int | |

**Classement par année (implémentation de D4)** — pour un enfant de N ans, on retient les règles où `age_min ≤ N ≤ age_max`, triées par `abs(focus_year - N)` croissant puis par `difficulty`. Un seul corpus produit douze listes différentes.

**`reward_template`**

| Champ | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `locale` | text | |
| `label` | text | |
| `category` | enum | `relationnelle`, `privilege`, `temps`, `materielle` |
| `tier` | enum | `daily`, `weekly` |
| `age_min` / `age_max` | int | |
| `requires_parent_time` | bool | Permet d'éviter de tout proposer un soir de semaine |

> **Règle de contenu :** à la création, la proposition automatique doit contenir **au moins 3 récompenses `relationnelle` ou `temps` sur 5**. Les récompenses matérielles ne doivent jamais être majoritaires dans la proposition par défaut.

### 4.3 Tables du foyer

**`household`** — `id`, `name`, `locale`, `timezone`, `week_start_day` (défaut : lundi), `created_at`

**`caregiver`** — `id`, `household_id`, `auth_user_id`, `display_name`, `role` (`owner` | `member`), `created_at`

**`child`** — `id`, `household_id`, `first_name`, `birth_date`, `avatar_key`, `is_active`, `settings` (jsonb : `daily_threshold`, `weekly_threshold`), `created_at`

> `birth_date` sert au classement par âge et à la notification d'anniversaire. **Stocker l'année et le mois suffit** si on veut minimiser — à arbitrer, mais l'anniversaire est un levier de rétention.

**`rule_instance`**

| Champ | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `child_id` | uuid | |
| `template_id` | uuid nullable | `null` si règle créée de toutes pièces par le parent |
| `label` | text | Copie modifiable — ne jamais lire le libellé depuis le template |
| `short_label` | text | |
| `icon` | text | |
| `points` | int | Défaut 1 |
| `is_thematic` | bool | **Une seule à `true` par enfant** (contrainte en base) |
| `bonus_value` | int | Défaut 2, appliqué si thématique respectée. **Aucun champ de malus : voir D5** |
| `status` | enum | `active` \| `acquired` \| `retired` |
| `display_order` | int | |
| `started_at` / `acquired_at` / `retired_at` | timestamptz | |

> **Contrainte dure (D8) :** maximum 6 `rule_instance` en statut `active` par enfant, règle thématique incluse. À faire respecter côté base **et** côté interface.

**`reward_instance`** — `id`, `child_id`, `template_id` nullable, `label`, `category`, `tier`, `is_available`, `display_order`, `created_at`, `last_granted_at`

**`day_entry`**

| Champ | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `child_id` | uuid | |
| `date` | date | **Unique par enfant** |
| `points_total` | int | Recalculé, jamais saisi |
| `threshold_applied` | int | Copie du seuil au moment de la journée — l'historique ne doit pas bouger si le seuil change |
| `threshold_met` | bool | |
| `is_closed` | bool | |
| `closed_at` | timestamptz | |

**`rule_check`** — `id`, `day_entry_id`, `rule_instance_id`, `state` (`respected` | `not_respected` | `not_applicable`), `points_awarded`, `checked_at`

> L'état `not_applicable` est indispensable : une règle scolaire n'a pas de sens un dimanche. **Une règle non applicable ne compte ni dans le score ni dans les statistiques d'échec.**

**`reward_grant`** — `id`, `child_id`, `day_entry_id` nullable, `week_summary_id` nullable, `reward_instance_id`, `tier`, `granted_at`, `redeemed_at` nullable

> `redeemed_at` est important : la récompense est souvent consommée **le lendemain** (le bonbon au goûter). L'écart entre attribution et consommation est un signal produit.

**`week_summary`** — `id`, `child_id`, `iso_year`, `iso_week`, `points_total`, `days_threshold_met`, `weekly_threshold_applied`, `weekly_threshold_met`, `computed_at`

**`pilotage_suggestion`** — `id`, `child_id`, `type`, `payload` (jsonb), `status` (`pending` | `accepted` | `dismissed` | `expired`), `created_at`, `resolved_at`

**`consent_record`** — `id`, `household_id`, `child_id` nullable, `type`, `version`, `given_by_caregiver_id`, `given_at`, `revoked_at` nullable

---

## 5. Moteur de scoring

### 5.1 Calcul du score quotidien

```
points_du_jour = Σ (points de chaque règle non-thématique respectée)
               + bonus_thematique

bonus_thematique =
    + bonus_value        si la règle thématique est respectée
      0                  sinon

Le score ne peut structurellement jamais diminuer. Une règle non tenue
ne retire rien : elle n'ajoute pas. Il n'existe aucun chemin de code
produisant un point négatif.
```

Les règles en statut `acquired` **ne comptent pas dans le score** mais restent affichées (voir §6.2).

### 5.2 Seuil quotidien

Si `points_du_jour >= threshold_applied`, alors `threshold_met = true` et une récompense de niveau `daily` devient sélectionnable.

Le seuil est **figé dans `day_entry` au moment de la création de la journée**. Changer le seuil ne doit jamais réécrire l'historique.

### 5.3 Cumul hebdomadaire

```
days_threshold_met = nombre de jours de la semaine où threshold_met = true
weekly_threshold_met = days_threshold_met >= weekly_threshold  (défaut : 5)
```

La récompense hebdomadaire se déclenche à la validation du dernier jour de la semaine.

### 5.4 Calibrage initial du seuil

Le seuil proposé à l'installation ne doit pas être arbitraire :

```
points_max_theoriques = Σ points des règles actives + bonus_thematique
seuil_propose = arrondi( points_max_theoriques × 0,65 )
```

Avec 4 règles à 1 point et un bonus de 2, on obtient un maximum de 6 et un seuil proposé de 4. On retrouve exactement le fonctionnement validé en usage réel, mais il s'adapte si le parent ajoute des règles.

### 5.5 Journée et fuseau

Une journée démarre à 00h00 dans le `timezone` du foyer. **Il n'y a pas de clôture manuelle.** La journée reste modifiable **jusqu'à 12h00 le lendemain**, puis elle se fige d'elle-même. Cela couvre le parent qui oublie de cocher le soir, sans permettre de réécrire la semaine.

Un bouton **Valider** permet au parent de marquer explicitement qu'il a passé la journée en revue — même si le score est de 0 point. Sans ce geste, une journée reste indiscernable d'une journée jamais ouverte : `validated_at` (sur `day_entry`) porte cette distinction. Valider est rejouable autant de fois que voulu tant que la journée est encore modifiable (par exemple après une correction) ; ce n'est jamais une action définitive en soi — seule la fenêtre de modification l'est.

---

## 6. Moteur de pilotage

C'est la fonction qui différencie le produit. Il **suggère**, il ne décide jamais seul : toute suggestion est présentée au parent qui accepte ou écarte.

### 6.1 Principe général

Une passe quotidienne, à la validation de la journée (§5.5), évalue les déclencheurs ci-dessous et crée au maximum **une suggestion par enfant et par semaine**. Au-delà, l'outil devient harcelant.

### 6.2 Règle acquise

**Déclencheur :** une règle en statut `active` est respectée **14 jours consécutifs** (les jours `not_applicable` n'interrompent pas la série).

**Action :** suggestion de type `rule_acquired`.

```
« "Je prépare mon cartable la veille" est respectée depuis 14 jours.
  On peut la considérer comme acquise et proposer un nouveau défi. »

  [ Marquer comme acquise ]   [ Garder encore un peu ]
```

Si acceptée :
- la règle passe en `acquired`, elle **reste affichée** dans une zone « Déjà acquis » du mode Affichage, sans compter dans le score
- une **nouvelle règle est proposée**, choisie par le classement par année (§4.2) en excluant les règles déjà actives ou acquises
- **une seule à la fois (D9)**
- le seuil est recalculé selon §5.4 et le nouveau seuil est proposé au parent

**Contrôle ponctuel :** une règle `acquired` est re-proposée à la vérification une fois par mois, sur une seule journée. Si elle échoue, elle repasse en `active`. C'est ce qui empêche la dégradation silencieuse.

### 6.3 Règle en échec durable

**C'est le signal le plus important du moteur.** Un échec répété ne signifie pas que l'enfant est en difficulté : il signifie que la règle est mal calibrée ou mal formulée.

> Depuis la suppression de tout point négatif (D5), c'est le **seul** levier dont dispose le produit face à une règle qui ne fonctionne pas. Sa fiabilité conditionne l'utilité de l'application : un parent qui ne voit rien se passer finira par conclure que l'outil ne marche pas.

**Déclencheur :** une règle est en `not_respected` sur **10 jours applicables sur les 14 derniers**.

**Action :** suggestion de type `rule_failing`, avec trois options concrètes.

```
« "Je range ma chambre" n'est pas tenue depuis 10 jours.
  Ce n'est pas forcément l'enfant : c'est souvent que la règle
  demande trop de choses à la fois. »

  [ Découper en une étape plus simple ]   ← utilise rule_template.split_into
  [ Reformuler moi-même ]
  [ Mettre cette règle en pause ]
```

L'option « découper » propose les règles listées dans `split_into` du template d'origine — par exemple « Je range ma chambre » devient « Je mets mes affaires sales dans le panier ».

### 6.4 Usure de la récompense

**Déclencheur, au choix :** une même `reward_instance` a été attribuée **8 fois sur les 10 dernières attributions**, ou aucune nouvelle récompense n'a été ajoutée depuis **8 semaines**.

**Action :** suggestion de type `reward_fatigue`.

```
« "30 minutes d'écran" est choisie presque à chaque fois.
  Les récompenses perdent en effet quand elles deviennent une habitude. »

  [ Ajouter 2 récompenses au menu ]   [ Tout va bien ]
```

Conformément à D7 : on **ajoute au menu**, on ne le fait pas tourner et on ne retire rien. La prévisibilité fait partie de ce qui fonctionne chez les jeunes enfants.

### 6.5 Seuil mal calibré

**Déclencheur haut :** seuil atteint **7 jours sur 7 pendant 3 semaines** → l'enfant ne progresse plus, suggestion d'ajouter une règle ou de relever le seuil.

**Déclencheur bas :** seuil atteint **moins de 2 fois par semaine pendant 3 semaines** → risque de décrochage, suggestion d'abaisser le seuil ou de retirer une règle exigeante.

### 6.6 Changement d'année

**Déclencheur :** date d'anniversaire de l'enfant.

**Action :** notification et suggestion de type `age_change`.

```
« Léa a 8 ans aujourd'hui 🎉
  Voici les 3 règles que les parents ajoutent le plus à cet âge. »
```

C'est le mécanisme de rétention le plus puissant du produit : il crée un rendez-vous annuel garanti et il matérialise la progression.

---

## 7. Bilan du soir

### 7.1 Deux bilans, deux destinataires, deux moments

Le parent et l'enfant n'ont pas besoin de la même chose. Les confondre produirait un objet tiède qui ne sert ni l'un ni l'autre.

| | **Séquence enfant** | **Note parent** |
|---|---|---|
| **Quand** | Au lancement du mode Affichage, à tout moment | Le lendemain matin, si la journée a été validée (8h/10h) |
| **Où** | Mode Affichage, sur l'écran partagé | Notification + écran dédié dans l'app |
| **Forme** | Visuelle, animée, sans texte long | Texte court, structuré en 3 blocs |
| **Durée** | ≤ 20 secondes | ≤ 15 secondes de lecture |
| **Objectif** | Clore le rituel sur une note positive | Donner au parent un repère et une amorce de conversation |

> **Principe :** l'enfant vit un moment, il ne lit pas une évaluation. À 7 ans, un texte qui commente sa journée est une note de plus. Le parent, lui, a besoin de mots — c'est lui qui se demande en permanence s'il s'y prend bien, et personne ne lui répond jamais.

### 7.2 La séquence enfant

Déclenchée par le bouton dédié « Lancer le mode Affichage », disponible à tout moment sur l'écran du jour — indépendamment du cochage ou de la validation. Rejouée à chaque lancement, jouée en mode Affichage, **interrompable à tout moment par une tape**.

| # | Étape | Durée | Contenu |
|---|---|---|---|
| 1 | Révélation du score | 2 s | Le chiffre apparaît en grand, compteur animé depuis 0 |
| 2 | Remplissage de la jauge | 3 s | Progression vers le seuil du jour |
| 3 | Franchissement | 2 s | **Si seuil atteint** : la seule animation spectaculaire du produit |
| 4 | Série en cours | 3 s | Badge, uniquement si une série ≥ 3 jours existe |
| 5 | Bande de la semaine | 3 s | Les 7 jours, seuils atteints marqués |
| 6 | Choix de la récompense | libre | **Si seuil atteint** : les récompenses disponibles, en grand |

**Règles strictes :**
- **Aucun texte au-delà de 4 mots** par écran. Un enfant de 4 ans doit tout comprendre sans lire.
- **Si le seuil n'est pas atteint**, les étapes 3 et 6 sont sautées. La séquence ne commente pas, elle ne console pas, elle **montre la bande de la semaine et s'arrête**. Pas de message de consolation : un enfant entend la déception derrière.
- **Aucune couleur rouge**, jamais, dans toute la séquence.
- La séquence est rejouable depuis l'écran du jour.

### 7.3 La note parent

Trois blocs, toujours dans cet ordre, toujours courts.

```
Ce soir — Léa, mardi 15 septembre

TENU AUJOURD'HUI
  Préparer son cartable · Mettre la table · Dire la vérité
  4 points — seuil atteint

À REMARQUER
  « Je prépare mon cartable la veille » est tenue 4 jours d'affilée.
  C'est le moment où l'habitude commence à s'installer.

DEMAIN
  Tu peux lui demander ce qui l'aide à y penser toute seule.
```

- **Bloc 1 — Factuel.** Ce qui a été tenu, le score, l'atteinte du seuil. Aucun commentaire.
- **Bloc 2 — Une observation, une seule.** Sélectionnée par le moteur du §7.4.
- **Bloc 3 — Une question à poser demain.** C'est le cœur du bilan : on ne livre pas un verdict, on livre une amorce de conversation.

> Le bloc 3 est ce qui transforme l'outil de suivi en outil d'accompagnement. C'est aussi, en B2B, ce qui permet de parler d'accompagnement à la parentalité plutôt que de tableau de tâches.

### 7.4 Moteur de sélection de l'observation

Les détecteurs sont évalués **dans l'ordre de priorité**. Le premier qui se déclenche et qui passe les filtres du §7.5 fournit l'observation du soir.

| Prio | Type | Déclencheur | Nature |
|---|---|---|---|
| 1 | `recovery` | Seuil atteint après ≥ 2 jours consécutifs sans | Positif fort |
| 2 | `first_time` | Une règle tenue pour la première fois depuis son ajout | Positif fort |
| 3 | `streak_building` | Une règle tenue ≥ 3 jours applicables consécutifs | Positif |
| 4 | `perfect_day` | Toutes les règles applicables tenues | Positif |
| 5 | `threshold_first_of_week` | Premier seuil atteint de la semaine | Positif |
| 6 | `weekly_pace` | `days_threshold_met == weekly_threshold - 1` | Positif projectif |
| 7 | `close_to_threshold` | `points == threshold - 1` | Neutre encourageant |
| 8 | `rule_struggling` | Une règle non tenue sur ≥ 5 des 7 derniers jours applicables | Constructif |
| 9 | `steady` | Aucun des précédents | Neutre, toujours disponible |

`steady` est le filet de sécurité : **il y a toujours une observation**, jamais de bilan vide.

### 7.5 Filtres anti-spirale — obligatoires

Ces règles s'appliquent avant qu'une observation ne soit retenue. Elles existent parce qu'un bilan qui enchaîne les constats négatifs fait désinstaller l'application en une semaine.

1. **Si les 2 derniers jours sont sous le seuil**, `rule_struggling` est entièrement supprimé. On passe au candidat suivant, même si c'est `steady`.
2. **`rule_struggling` ne peut pas se déclencher deux fois en 7 jours**, toutes règles confondues.
3. **Jamais deux soirs de suite le même `observation_type`.**
4. **Pas de doublon avec le pilotage :** si une suggestion `rule_failing` (§6.3) est en attente sur une règle, le bilan ne la mentionne pas. Un seul canal par sujet.
5. **Au maximum une observation constructive par semaine.** Le reste est positif ou neutre.

> Conséquence assumée : sur une mauvaise semaine, le parent reçoit des bilans neutres plutôt que des diagnostics. C'est volontaire. Le diagnostic, c'est le rôle du moteur de pilotage, qui a ses propres seuils et son propre écran.

### 7.6 La question du lendemain

Chaque `observation_type` dispose d'une banque de questions. Elles sont **ouvertes**, adressées à l'enfant, et ne contiennent jamais de jugement.

| Type | Exemple de question |
|---|---|
| `recovery` | « Tu peux lui demander ce qui a changé aujourd'hui. » |
| `streak_building` | « Tu peux lui demander ce qui l'aide à y arriver depuis plusieurs jours. » |
| `perfect_day` | « Tu peux lui demander de quoi il est le plus fier aujourd'hui. » |
| `close_to_threshold` | « Tu peux lui demander à quel moment ça a été le plus dur. » |
| `rule_struggling` | « Tu peux lui demander ce qui est compliqué dans cette règle — souvent l'enfant le sait mieux que nous. » |
| `steady` | « Tu peux lui demander quel a été le meilleur moment de sa journée. » |

**Interdits de rédaction :**
- Jamais les mots « échec », « raté », « manqué », « mauvais », « problème »
- Jamais de comparaison entre frères et sœurs, ni avec d'autres familles
- Jamais un chiffre présenté comme un jugement
- **Tutoiement du parent**, de manière homogène dans tout le produit

### 7.7 Variation et anti-répétition

Chaque type d'observation dispose d'**au moins 5 variantes de formulation**, et chaque question d'au moins 4.

- Une variante utilisée n'est **pas réutilisée avant 14 jours** pour le même enfant
- Si toutes les variantes ont été vues, on repart sur la moins récente
- La variété vient des données et de la rotation des gabarits, **pas d'une rédaction dynamique**

### 7.8 Bilan hebdomadaire

Déclenché à la validation du dernier jour de la semaine, notification distincte, contenu plus riche. C'est lui qui porte la substance, ce qui permet de garder le bilan quotidien très court.

Contenu :
- Points de la semaine et nombre de seuils atteints
- **La règle la plus régulière** de la semaine
- **La règle qui a le plus progressé** par rapport à la semaine précédente
- Récompense hebdomadaire si elle est débloquée
- **Un seul focus** proposé pour la semaine suivante

Le bilan hebdomadaire est le **seul endroit** où une comparaison avec la semaine précédente est autorisée, et uniquement si elle est positive ou stable. Une semaine en baisse s'affiche sans être commentée.

### 7.9 Modèle de données

**`daily_digest`**

| Champ | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `child_id` | uuid | |
| `day_entry_id` | uuid | Unique |
| `date` | date | |
| `observation_type` | enum | Voir §7.4 |
| `template_key` | text | Clé i18n du gabarit retenu |
| `template_variant` | int | Pour l'anti-répétition |
| `question_key` | text | |
| `question_variant` | int | |
| `slots` | jsonb | Valeurs injectées : nom de règle, nombre de jours, score… |
| `created_at` / `read_at` / `shared_at` | timestamptz | |

**`weekly_digest`** — même structure, rattachée à `week_summary_id`.

> **Ne pas stocker le texte rendu.** On stocke la clé, la variante et les valeurs. Le rendu se fait à l'affichage, ce qui permet de corriger un gabarit maladroit sans réécrire l'historique, et de traduire rétroactivement le jour où la localisation arrive.

**Emplacement des gabarits :** dans `/i18n/fr-FR`, comme toute chaîne d'interface. Jamais en base, jamais en dur.

### 7.10 Déclenchement et notification

- Le bilan est **généré à la validation** de la journée (§5.5) — jamais avant, et jamais pour une journée jamais validée
- **Une journée jamais validée par le parent ne produit aucun bilan et aucune notification.** Le produit ne harcèle pas un parent qui a eu une soirée compliquée, et ne bilan pas un silence
- La notification du bilan part **le lendemain matin de la journée validée** — 8h00 en semaine, 10h00 le week-end (heure de l'appareil) — plutôt que le soir même : elle a pu être validée tard, ou complétée le lendemain matin dans la fenêtre de grâce (§5.5)
- Un second rappel, indépendant et inconditionnel (garde-fou #16), invite chaque soir à faire le rituel — à `household.digest_time`, **défaut 19h00** dans le fuseau du foyer, réglable. Il ne dit jamais si le rituel a été fait ou non
- Les notifications sont désactivables sans casser la génération : le bilan reste consultable dans l'app

### 7.11 Aucune IA générative en V1 — décision D11

Les bilans sont produits par des **gabarits déterministes**. Aucun appel à un modèle de langage, ni côté serveur ni côté application. Quatre raisons bloquantes :

1. **Le hors ligne est une exigence** (§9.1). Un appel réseau casse le rituel du soir.
2. **Conformité.** Envoyer les données de comportement d'un enfant à un fournisseur tiers, a fortiori hors UE, ruine le positionnement qui constitue le meilleur atout B2B du produit.
3. **Responsabilité.** Du texte généré, portant sur la conduite d'un enfant : le jour où une formulation dérape, il n'existe aucune ligne de défense.
4. **Contrôle du ton.** Le ton *est* la promesse du produit. Il ne se délègue pas.

Des gabarits couvrent l'immense majorité du besoin. **Cette décision est réévaluable en V2**, et uniquement avec un modèle hébergé en UE, sur des données strictement pseudonymisées, avec relecture humaine des gabarits générés en amont — pas de génération à la volée.

### 7.12 Partage

Un bouton « Partager » sur le bilan génère une carte-image du score.

- **Rendu entièrement local**, aucun envoi serveur
- Le prénom de l'enfant est **masquable en une tape** avant partage
- Aucune donnée de règle ou de comportement sur l'image partagée : score, jauge, série, rien d'autre

> C'est vraisemblablement le principal canal d'acquisition gratuit du produit. Il mérite un vrai soin graphique, mais il ne doit jamais exposer le détail du comportement d'un enfant.

---

## 8. Architecture technique

### 8.1 Stack recommandée

| Couche | Choix | Motif |
|---|---|---|
| Application mobile | **React Native + Expo** | Un seul codebase iOS/Android, itération rapide, adapté au développement solo |
| Backend | **Supabase, région UE** | Postgres + auth + temps réel + Row Level Security. Le RLS donne l'isolation multi-foyer nativement, ce qui prépare le multi-tenant B2B |
| Base | PostgreSQL | |
| Temps réel | Supabase Realtime | Inutile en V1 (même appareil), **indispensable en V1.5** quand l'écran TV devient autonome |
| Stockage | Aucun en V1 | Pas de photo, pas d'upload. Moins de surface RGPD |
| Notifications | **Locales uniquement** | Pas d'infrastructure push. Voir §8.7 |
| Email transactionnel | **Brevo (SMTP)** | Opérateur français, hébergement UE. Compte existant |

> Épingler les versions au moment de l'initialisation du projet. Ne pas se fier à des numéros de version cités dans un document.

### 8.2 Contrainte d'hébergement — non négociable

**Toutes les données doivent être hébergées en Union européenne.** C'est une case à cocher dans tous les appels d'offres mutuelles et CSE que le produit visera. À configurer au moment de la création du projet Supabase — **ce n'est pas migrable après coup sans douleur**.

### 8.3 Sécurité des données

- **Row Level Security activée sur toutes les tables** contenant des données de foyer. Aucune exception.
- Politique de base : un `caregiver` n'accède qu'aux lignes dont le `household_id` correspond à son propre foyer.
- Les tables `rule_template` et `reward_template` sont en lecture seule pour tous les clients.
- Pas de clé de service exposée côté application.

### 8.4 Organisation du code

```
/app
  /(auth)              — inscription, connexion, consentement
  /(main)
    /today             — écran du jour, parcours critique
    /progress          — courbes
    /pilotage          — suggestions
    /settings
  /display             — MODE AFFICHAGE, isolé (voir 7.5)
/core
  /scoring             — moteur de calcul, pur, testable sans UI
  /pilotage            — détecteurs de suggestions, purs, testables
  /referential         — classement des règles par âge
/data
  /repositories        — accès base, aucune logique métier
/i18n
  /fr-FR
```

> **Le moteur de scoring et le moteur de pilotage doivent être des fonctions pures, sans dépendance à la base ni à l'interface.** Ce sont les deux briques qui seront exposées en API en V2. Elles doivent être testables unitairement et transposables telles quelles.

### 8.5 Isolation du mode Affichage — point d'architecture clé

Le mode Affichage est en V1 une vue de l'app mobile, projetée par partage d'écran. **Mais il doit être écrit comme s'il était déjà une page web autonome :**

- route dédiée `/display/:childId`
- **aucune dépendance à l'état de navigation de l'app**
- alimenté par un objet `DisplayState` unique, sérialisable en JSON
- aucune interaction, aucun gestionnaire d'événement

Conséquence : en V1.5, transformer cette vue en récepteur web autonome (navigateur TV, puis Google Cast) devient un portage de quelques jours au lieu d'une réécriture. **C'est le point le plus important de cette section.**

### 8.6 Internationalisation

Architecture prête, contenus en français uniquement.

- Toutes les chaînes d'interface externalisées dès la première ligne, **jamais de texte en dur**
- `locale` présent sur `household`, `rule_template`, `reward_template`
- Formatage des dates et des nombres localisé

> **Ne pas traduire de contenu en V1.** Et retenir que le référentiel devra être **localisé, pas traduit** : les récompenses et les pratiques éducatives sont culturellement situées.

### 8.7 Notifications et email transactionnel

Deux canaux strictement séparés, avec une frontière qui ne se franchit jamais.

#### Notifications — locales uniquement

Les bilans (§7) sont produits **sur l'appareil**, par gabarits déterministes, sans réseau. La notification du bilan quotidien est donc **programmée localement**, calculée à la validation de la journée (§5.5) pour le lendemain matin.

Conséquences :
- **Aucune infrastructure push à monter** — ni FCM, ni APNs côté serveur
- Aucune donnée de comportement ne quitte l'appareil pour être notifiée
- Cohérent avec l'exigence hors ligne (§8.1)

| Notification | Déclenchement | Programmation |
|---|---|---|
| Rappel du rituel du soir | Quotidien, inconditionnel | Locale, à `household.digest_time` (défaut 19h00) |
| Bilan du jour | Validation de la journée (§5.5) | Locale, le lendemain matin : 8h00 en semaine, 10h00 le week-end |
| Bilan hebdomadaire | Validation du dernier jour de la semaine | Locale, à `household.digest_time` |
| Anniversaire de l'enfant (§6.6) | Date d'anniversaire | Locale, programmée à l'avance |

**Règles de contenu — l'écran verrouillé est public.** Le libellé d'une notification est visible par n'importe qui passant à côté du téléphone.

- ❌ « Léa n'a pas atteint son seuil ce soir »
- ✅ « Le bilan de ce soir est prêt »

Aucun prénom, aucun score, aucun nom de règle, aucune appréciation dans le libellé. Le contenu ne se découvre qu'à l'ouverture de l'application.

**Moment de la demande d'autorisation.** Ne **jamais** demander l'autorisation de notification à l'installation — le taux de refus est massif et irréversible. La demander **après le premier rituel du soir complet**, une fois la valeur démontrée.

**Cas limite :** si la validation a lieu après l'heure de la notification du lendemain (rattrapage tardif dans la fenêtre de grâce), aucune notification n'est programmée. Le parent est déjà dans l'application, le bilan y est simplement disponible.

#### Email transactionnel — Brevo (SMTP)

L'envoi d'emails passe par le **SMTP de Brevo**, opérateur français hébergé en UE, ce qui sert la contrainte du §8.2.

| Email | Usage |
|---|---|
| Confirmation d'inscription | Création de compte |
| Réinitialisation de mot de passe | Sur demande |
| Changement de politique de confidentialité | Nouveau `consent_record` à recueillir (§11.2) |
| Relance avant purge | Deux envois avant suppression à 24 mois d'inactivité (§11.3) |
| Export de données prêt | Sur demande de l'utilisateur |

**Frontière absolue : aucune donnée de comportement dans un email.** Ni score, ni règle, ni bilan, ni prénom d'enfant. Une relance de purge dit que le compte est inactif, jamais rien sur l'enfant.

> Faire transiter un bilan par une plateforme d'automatisation marketing contreviendrait au §11 et détruirait l'argument de conformité qui constitue le principal atout B2B du produit. La séparation des deux canaux n'est pas une commodité technique, c'est une contrainte de conformité.

**Configuration :** identifiants SMTP en variables d'environnement, jamais dans le dépôt. Gabarits d'email dans `/i18n/fr-FR` au même titre que les chaînes d'interface.

---

## 9. Écrans

### 9.1 Écran du jour — le parcours critique

C'est l'écran qui décide de l'adoption. Il est utilisé tous les soirs, en 90 secondes, souvent debout.

**Structure haut en bas :**
1. Sélecteur d'enfant (onglets ou avatars, si plusieurs enfants)
2. Date et navigation jour précédent / suivant
3. **Compteur de points**, grand, mis à jour instantanément
4. **Liste des règles actives** — une ligne par règle, une seule tape pour basculer
5. **Règle thématique**, visuellement distincte — respectée, elle vaut le bonus ; non tenue, elle ne vaut rien. Son état non tenu s'affiche en neutre, **jamais en rouge**
6. Jauge de progression vers le seuil
7. Bouton **« Lancer le mode Affichage »** — disponible à tout moment, indépendamment du cochage
8. Bouton **« Valider la journée »** — rejouable, ne fige rien par lui-même (§5.5)

**Exigences :**
- Une règle se coche en **une seule tape**. Pas de menu, pas de confirmation.
- L'appui long ouvre le choix `not_applicable`.
- Le score se met à jour **sans latence perceptible** — calcul local, écriture en base asynchrone.
- L'application doit fonctionner **hors ligne** et synchroniser ensuite. Le rituel du soir ne peut pas dépendre du réseau.

### 9.2 Mode Affichage — conçu pour la TV

C'est l'écran que voit l'enfant. Il est projeté par partage d'écran, donc il s'affiche sur le téléphone en plein écran, en orientation paysage.

**Contraintes de conception, à respecter strictement :**

| Contrainte | Valeur |
|---|---|
| Distance de lecture | 3 mètres |
| Taille du score | Doit occuper au moins **1/4 de la hauteur** |
| Libellés | `short_label` uniquement, jamais le libellé long |
| Contraste | Élevé, fond sombre, pas de gris sur gris |
| Zone de sécurité | Marge de 5 % sur tous les bords — **les TV rognent les bords** |
| Interaction | **Aucune** |
| Lisibilité non-lecteur | Chaque règle porte une icône et une couleur d'état. Un enfant de 4 ans doit comprendre sans lire |
| Animation | Une seule, celle du franchissement du seuil. Rien d'autre |

**Contenu :**
- Prénom et avatar de l'enfant
- Score du jour, très grand
- Jauge vers le seuil, avec un état franchi visuellement spectaculaire
- Les règles du jour, avec leur état (icône verte, icône grise)
- Zone « Déjà acquis » (§6.2), discrète, en bas
- Bande des 7 jours de la semaine, avec les jours de seuil atteint marqués
- Si le seuil est franchi : **les récompenses disponibles à choisir**, en grand

### 9.3 Écran de progression

- Courbe des points quotidiens sur 4, 8 et 12 semaines
- Taux de réussite par règle, trié du meilleur au moins bon
- Nombre de seuils atteints par semaine
- **Ton strictement factuel et non culpabilisant.** Pas de « objectif manqué », pas de rouge alarmiste. Une baisse s'affiche, elle ne se commente pas.

### 9.4 Écran de pilotage

Liste des suggestions en attente, présentées comme dans les encadrés du §6. Chaque suggestion propose des actions concrètes et une option pour l'écarter sans friction.

### 9.5 Écrans de configuration

- Gestion des enfants
- Gestion des règles par enfant : ajout depuis le référentiel classé par année, modification du libellé, réordonnancement, mise en pause
- Gestion du menu de récompenses
- Réglages par enfant : seuil quotidien, seuil hebdomadaire
- Réglages du foyer : fuseau, premier jour de la semaine
- Confidentialité : export des données, suppression du compte

---

## 10. Instrumentation pour le futur référentiel

**En V1 : on collecte, on ne pondère pas.** Construire la boucle d'apprentissage maintenant serait du travail perdu, elle n'a aucune valeur statistique en dessous d'un millier de familles.

### 10.1 Signaux à capter

| Signal | Pourquoi |
|---|---|
| Règle proposée puis retenue / écartée | Pertinence du référentiel par âge |
| Libellé modifié — texte avant et après | **Le signal le plus précieux** : la formulation qui marche vraiment |
| Règle créée de toutes pièces | Manque dans le référentiel |
| Durée de vie d'une règle avant abandon | Calibrage |
| Taux de réussite par règle et par âge | Efficacité réelle |
| Suggestion acceptée / écartée | Qualité du moteur de pilotage |
| Récompense effectivement choisie par âge | Calibrage du catalogue |
| Délai entre attribution et consommation | Valeur perçue de la récompense |
| Bilan ouvert / ignoré, par type d'observation | Quels bilans sont réellement lus |
| Carte-image partagée | Mesure du canal d'acquisition gratuit |
| Rétention à 7 / 30 / 60 / 90 jours | **Indicateur numéro un du projet** |

### 10.2 Règles de collecte

- Table `telemetry_event` séparée, **sans identifiant d'enfant ni prénom**
- Un identifiant de foyer **pseudonymisé**, non réversible côté analyse
- L'âge stocké en années révolues, jamais la date de naissance
- Les libellés modifiés sont conservés en texte, mais **une passe de filtrage doit retirer tout prénom ou donnée identifiante** avant toute exploitation
- Aucun outil d'analyse tiers. La collecte est interne, en base, point.

---

## 11. Conformité — contraintes bloquantes

### 11.1 Les interdits absolus

| Interdit | Raison |
|---|---|
| **Toute publicité** | La CNIL proscrit la publicité comportementale ciblée et le profilage marketing des mineurs, c'est un point de contrôle prioritaire |
| **Tout SDK d'analyse tiers** | Même raison : profilage indirect |
| **Tout hébergement hors UE** | Exigence des acheteurs B2B et bonne pratique RGPD |
| **Compte enfant en V1** | Déclencherait le double consentement et la vérification d'âge |
| **Conservation indéfinie** | Un compte inactif ne se conserve pas sans limite |

### 11.2 Le parcours de consentement

À l'inscription, avant toute création d'enfant, un écran qui expose en langage clair :
- quelles données sont collectées (prénom, mois et année de naissance, cochages quotidiens)
- à quoi elles servent
- où elles sont hébergées (UE)
- la durée de conservation
- comment les exporter et les supprimer

Chaque acceptation crée un `consent_record` **versionné**. Si la politique change, on redemande.

### 11.3 Minimisation et purge

- **Prénom uniquement** pour l'enfant. Jamais de nom de famille, jamais de photo en V1.
- **Purge automatique** : suppression des données d'un foyer après 24 mois d'inactivité, avec deux relances par email avant.
- **Suppression de compte** : effective sous 30 jours, avec confirmation, y compris les données de télémétrie liées au foyer.
- **Export** : format JSON lisible, accessible depuis l'app.

### 11.4 À prévoir hors développement

- **AIPD (analyse d'impact)** : obligatoire, le traitement à grande échelle de données de personnes vulnérables la déclenche. À lancer avant la mise en ligne publique.
- Politique de confidentialité **rédigée en version adaptée à l'âge**, en plus de la version juridique.

---

## 12. Garde-fous — à lire avant d'écrire du code

### Ce qu'il ne faut jamais faire

1. **Ne jamais dépasser 6 règles actives.** Contrainte en base et en interface.
2. **Ne jamais proposer deux ajouts de règle en même temps.**
3. **Ne jamais introduire de point négatif**, sous aucune forme, même optionnelle, même à la demande. Le score ne descend pas.
4. **Ne jamais supprimer une règle acquise** — statut `acquired`, pas suppression.
5. **Ne jamais retirer une récompense du menu automatiquement.**
6. **Ne jamais réécrire l'historique** quand un seuil change — le seuil est figé dans `day_entry`.
7. **Ne jamais mettre de texte en dur** dans l'interface.
8. **Ne jamais ajouter de SDK d'analyse ou de publicité.**
9. **Ne jamais créer de dépendance entre le mode Affichage et l'état de navigation.**
10. **Ne jamais faire dépendre le cochage du réseau** — hors ligne d'abord.
11. **Ne jamais coder la boucle de pondération du référentiel en V1.**
12. **Ne jamais mélanger logique métier et accès base** — le scoring et le pilotage restent des fonctions pures.
13. **Ne jamais appeler un modèle de langage** pour produire un bilan (D11).
14. **Ne jamais produire deux soirs de suite une observation négative** — les filtres du §7.5 sont obligatoires, pas indicatifs.
15. **Ne jamais consoler l'enfant** quand le seuil n'est pas atteint. La séquence s'arrête, elle ne commente pas.
16. **Ne jamais relancer un parent** ni produire de bilan pour une journée qu'il n'a pas validée.
17. **Ne jamais stocker le texte rendu d'un bilan** — clé, variante et valeurs uniquement.
18. **Ne jamais faire transiter une donnée de comportement par un email ou un service d'envoi** (§8.7).
19. **Ne jamais mettre de prénom, de score ou de nom de règle dans le libellé d'une notification** — l'écran verrouillé est public.
20. **Ne jamais demander l'autorisation de notification à l'installation** — après le premier rituel du soir.

### Le ton du produit

L'application accompagne, elle ne juge pas. Elle ne dit jamais qu'un enfant a échoué : elle dit qu'une règle mérite peut-être d'être revue. Elle ne dit jamais à un parent qu'il fait mal : elle propose un ajustement. **Chaque message d'interface doit passer ce test.**

---

## 13. Séquence de construction

| Lot | Contenu | Sortie attendue |
|---|---|---|
| **L1** | Schéma de base + RLS + auth + consentement | Un parent peut créer un compte et un foyer |
| **L2** | Référentiel : tables, corpus initial, classement par année | Créer un enfant propose des règles cohérentes |
| **L3** | **Moteur de scoring en fonctions pures + tests unitaires** | Le calcul est prouvé avant toute interface |
| **L4** | Écran du jour + cochage + hors ligne | **Le produit est utilisable en vrai** |
| **L5** | Mode Affichage | Le rituel du soir est complet |
| **L6** | Récompenses : menu, seuil, attribution, consommation | Boucle motivationnelle bouclée |
| **L7** | Cumul hebdomadaire | |
| **L8** | Courbes de progression | |
| **L9** | **Séquence enfant du bilan du soir** | Le rituel se clôt sur une note positive |
| **L10** | Moteur de pilotage + écran de suggestions | La différenciation produit existe |
| **L11** | **Note parent + filtres anti-spirale + bilan hebdomadaire** | L'accompagnement existe |
| **L12** | Partage de la carte-image | Canal d'acquisition gratuit |
| **L13** | Instrumentation, export, purge | Prêt pour les familles pilotes |

**Le lot L4 est le jalon critique.** Dès qu'il est livré, l'application doit être mise en usage réel dans une famille, sans attendre les lots suivants. Tout ce qui vient après doit être arbitré par ce que l'usage révèle.

---

## 14. Critères d'acceptation de la V1

- [ ] Le rituel du soir complet tient en **moins de 90 secondes** pour un enfant
- [ ] L'installation complète tient en **moins de 4 minutes**
- [ ] Le cochage fonctionne **entièrement hors ligne** et se synchronise ensuite
- [ ] Le mode Affichage est **lisible à 3 mètres**, testé sur une vraie TV par partage d'écran
- [ ] Un enfant **non-lecteur** comprend son score sans qu'on lui explique
- [ ] Le moteur de scoring est couvert par des **tests unitaires**, y compris les cas limites : règle non applicable, règle thématique non tenue, changement de seuil en cours de semaine, semaine incomplète, journée sans aucun cochage
- [ ] Le RLS est vérifié : un foyer ne peut accéder à aucune donnée d'un autre foyer
- [ ] Aucune donnée hors UE, aucun SDK tiers, **vérifié dans les dépendances**
- [ ] La séquence enfant dure **moins de 20 secondes** et est interrompable
- [ ] **Aucun enchaînement possible de deux observations négatives** — testé sur une série simulée de 14 jours sous le seuil
- [ ] Chaque type d'observation dispose d'**au moins 5 variantes**, sans répétition sur 14 jours
- [ ] Aucun appel réseau n'est nécessaire pour produire un bilan
- [ ] Aucun libellé de notification ne contient de prénom, de score ou de nom de règle
- [ ] Aucun email ne contient de donnée de comportement — vérifié sur l'ensemble des gabarits
- [ ] La carte-image de partage est générée **localement** et ne contient aucun détail de comportement
- [ ] Export et suppression de compte fonctionnels
- [ ] Le produit tourne **dans une vraie famille pendant 14 jours consécutifs** avant toute diffusion

---

## Annexe — Corpus initial du référentiel

Le corpus complet (règles par année de 3 à 11 ans, avec libellés, icônes, `focus_year`, difficulté et arborescence `split_into`) fait l'objet d'un livrable distinct à produire avant le lot L2.

Principes de rédaction qui s'appliquent à toutes les entrées :

1. **Formulation à la première personne et à la positive.** « Je dis la vérité », jamais « Ne pas mentir ».
2. **Un seul comportement observable par règle.** Si le parent doit interpréter, la règle est mal écrite.
3. **Observable en fin de journée.** Si le parent ne peut pas répondre par oui ou non le soir, la règle ne convient pas.
4. **`short_label` de 28 caractères maximum**, compréhensible seul sur l'écran TV.
5. **Chaque règle exigeante doit avoir un `split_into`** — c'est ce qui alimente la suggestion de découpage du §6.3.
6. **Récompenses relationnelles prioritaires.** Ce que l'enfant veut le plus souvent, c'est du temps avec ses parents.

---

*Document de conception V1.0 — toute évolution du périmètre doit être tracée ici avant d'être implémentée.*
