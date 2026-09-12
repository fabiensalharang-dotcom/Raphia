# Instructions projet

## Contexte

Application mobile de tableau de comportement pour enfants de 3 à 11 ans. Un parent suit quotidiennement des règles personnalisables par âge, avec points, seuil et récompenses. Un mode d'affichage lisible à distance est projeté sur la TV par partage d'écran.

**La source de vérité est `docs/conception.md`.** Toutes les décisions produit y sont tranchées. Le lire au début de chaque session et s'y référer plutôt que de supposer.

**En cas d'ambiguïté : demander, ne pas supposer.** Le dossier est décision-complète ; si quelque chose semble manquer, c'est probablement une lecture incomplète ou un vrai oubli à signaler — pas une invitation à inventer.

---

## Nom de l'application

Le nom commercial est **provisoire et sera changé**. Il ne doit apparaître **nulle part** dans le code :

- ❌ jamais dans le bundle identifier, le package name, le nom des modules, les noms de tables ou de variables
- ❌ jamais en dur dans un composant
- ✅ uniquement comme une clé i18n `app.name`, dans `/i18n/fr-FR`

Un changement de nom doit se résumer à modifier une seule chaîne.

---

## Périmètre

Respecter strictement §1.2 (dans la V1) et §1.3 (hors V1) du dossier de conception.

**Ne jamais ajouter une fonctionnalité qui n'est pas au périmètre**, même si elle semble utile, évidente ou peu coûteuse. Si une idée paraît manquante, la proposer en fin de lot — ne pas l'implémenter.

Hors périmètre, pour mémoire : accès adolescent, compte enfant, boucle d'apprentissage du référentiel, Google Cast, co-parentalité, rituel du soir guidé, traduction des contenus, export PDF, API externe.

---

## Interdits absolus

1. Plus de 6 règles actives par enfant — contrainte en base **et** en interface
2. Deux ajouts de règle proposés en même temps
3. Un point négatif, sous quelque forme que ce soit — le score ne descend jamais
4. Supprimer une règle acquise — statut `acquired`, jamais suppression
5. Retirer automatiquement une récompense du menu
6. Réécrire l'historique quand un seuil change — le seuil est figé dans `day_entry`
7. Du texte en dur dans l'interface
8. Un SDK d'analyse, de publicité ou de télémétrie tierce
9. Une dépendance entre le mode Affichage et l'état de navigation
10. Faire dépendre le cochage du réseau — **hors ligne d'abord**
11. Coder la boucle de pondération du référentiel — hors V1
12. Mélanger logique métier et accès base
13. Appeler un modèle de langage pour produire un bilan
14. Deux soirs de suite une observation négative — les filtres §7.5 sont obligatoires
15. Consoler l'enfant quand le seuil n'est pas atteint — la séquence s'arrête, elle ne commente pas
16. Relancer un parent qui n'a pas clôturé sa journée
17. Stocker le texte rendu d'un bilan — clé, variante et valeurs uniquement
18. Faire transiter une donnée de comportement par un email ou un service d'envoi
19. Mettre un prénom, un score ou un nom de règle dans le libellé d'une notification — l'écran verrouillé est public
20. Demander l'autorisation de notification à l'installation — la demander après le premier rituel du soir complet

---

## Architecture

### Fonctions pures

`core/scoring/`, `core/pilotage/` et `core/referential/` contiennent des **fonctions pures**, sans accès base, sans dépendance à l'interface, testables unitairement.

Ce sont les briques qui seront exposées en API plus tard. Aucune exception.

### Accès aux données

`data/repositories/` ne contient **aucune logique métier**. Lecture et écriture uniquement.

### Mode Affichage

Route dédiée `/display/:childId`, alimentée par un unique objet `DisplayState` sérialisable en JSON.

**Aucune dépendance à l'état de navigation de l'application, aucune interaction, aucun gestionnaire d'événement.** Cette vue doit pouvoir devenir une page web autonome sans réécriture.

### Hors ligne

Le cochage et la clôture de journée fonctionnent **sans réseau**, avec synchronisation différée. Le rituel du soir ne peut pas dépendre de la connectivité.

---

## Conformité — non négociable

- **Hébergement UE uniquement.** Aucune donnée, aucun appel vers un service hors Union européenne.
- **Aucun tracker, aucune publicité, aucun profilage.** Données d'enfants : la publicité comportementale ciblée sur mineurs est proscrite.
- **Minimisation.** Prénom seul pour l'enfant, jamais de nom de famille, jamais de photo.
- **Consentement versionné** dans `consent_record`.

### Règle sur les dépendances

**Demander une validation explicite avant d'ajouter toute dépendance.** Lister à chaque fin de lot les dépendances ajoutées et leur justification.

Une bibliothèque qui effectue un appel réseau vers un tiers casse la conformité sans qu'aucun test ne le signale.

---

## Notifications et email

**Notifications : locales uniquement.** Les bilans sont produits sur l'appareil ; la notification est programmée localement à la clôture de la journée. Aucune infrastructure push, ni FCM ni APNs.

Libellé neutre obligatoire : « Le bilan de ce soir est prêt », jamais un prénom ni un score. Le contenu ne se découvre qu'à l'ouverture de l'application.

**Email transactionnel : SMTP Brevo.** Uniquement inscription, réinitialisation de mot de passe, changement de politique de confidentialité, relance avant purge, export prêt.

**Frontière absolue : aucune donnée de comportement dans un email.** Identifiants SMTP en variables d'environnement, jamais dans le dépôt. Gabarits d'email dans `/i18n/fr-FR`.

Détail : voir §8.7 du dossier de conception.

---

## Internationalisation

- Toutes les chaînes d'interface dans `/i18n/fr-FR`, **dès la première ligne**
- Contenus en français uniquement en V1, mais architecture prête
- Dates et nombres formatés selon la locale
- Gabarits de bilan également dans `/i18n`, jamais en base, jamais en dur

---

## Ton du produit

L'application accompagne, elle ne juge pas.

- Elle ne dit jamais qu'un enfant a échoué — elle dit qu'une règle mérite d'être revue
- Elle ne dit jamais à un parent qu'il fait mal — elle propose un ajustement
- **Tutoiement du parent**, de façon homogène
- Mots interdits dans toute chaîne d'interface : échec, raté, manqué, mauvais, problème
- Aucune comparaison entre enfants, ni avec d'autres familles

Chaque message d'interface doit passer ce test.

---

## Méthode de travail

### Début de session

1. Lire `CLAUDE.md` et `docs/conception.md`
2. Annoncer le périmètre du lot compris
3. Lister les fichiers à créer ou modifier
4. Signaler les ambiguïtés
5. **Attendre validation avant d'écrire du code**

### Fin de lot

1. Relire les critères d'acceptation §14 concernant le lot
2. Vérifier la conformité aux interdits ci-dessus
3. Lister les dépendances ajoutées
4. Lancer les tests

### Tests

Le moteur de scoring et le moteur de pilotage sont couverts par des tests unitaires, cas limites inclus : règle non applicable, règle thématique non tenue, changement de seuil en cours de semaine, semaine incomplète, journée sans aucun cochage.

Les politiques RLS font l'objet d'un **test d'isolation explicite entre deux foyers**.

---

## Ordre des lots

L1 socle et conformité · L2 référentiel · L3 moteur de scoring · L4 écran du jour · L5 mode Affichage · L6 récompenses · L7 cumul hebdomadaire · L8 progression · L9 séquence enfant · L10 pilotage · L11 note parent · L12 partage · L13 instrumentation

Un lot à la fois. Ne pas anticiper sur le suivant.
