# Démarrage du développement — consignes

*Document opérationnel. À suivre dans l'ordre.*

---

## 0. Avant toute chose : ce qui n'est pas réversible

Trois décisions se prennent maintenant parce qu'elles coûtent cher à changer plus tard. Tout le reste se corrige.

### 0.1 La région du projet Supabase — UE, obligatoire

Au moment de créer le projet, choisir une **région européenne** (Francfort ou Paris). Ce paramètre n'est pas modifiable après création : il faudrait recréer le projet et migrer les données.

C'est une exigence de conformité et une case à cocher dans tous les appels d'offres mutuelles et CSE que le produit visera. Ne pas cliquer trop vite sur la région par défaut, qui est américaine.

### 0.2 L'identifiant de l'application — indépendant du nom commercial

**C'est le piège principal de ta situation.** Le bundle identifier iOS et le package name Android sont **définitifs** une fois l'application publiée sur les stores. On ne les change jamais : il faut republier une nouvelle application et perdre les utilisateurs.

Donc : **ne jamais mettre le nom commercial dans l'identifiant.**

| À ne pas faire | À faire |
|---|---|
| `com.kidsguide.app` | `fr.<tonnom>.tableaucomportement` |

Avec un identifiant neutre, tu changes de nom commercial autant de fois que tu veux — le nom affiché sur les stores, lui, se modifie librement.

Même principe pour le nom du dépôt Git, le nom du projet Supabase et le nom du package : **descriptifs, jamais commerciaux**.

### 0.3 Ce qu'il ne faut PAS faire maintenant

- ❌ Acheter un domaine — le nom n'est pas tranché
- ❌ Déposer la marque à l'INPI — même raison
- ❌ Ouvrir les comptes développeur Apple et Google — l'abonnement annuel court pour rien, tu n'en as besoin qu'au moment de publier
- ❌ Travailler l'identité visuelle
- ❌ Créer la structure juridique — inutile avant les premiers contrats

---

## 1. Mise en place du dépôt

### 1.1 Arborescence de départ

```
/
├── CLAUDE.md                 ← instructions permanentes (fourni)
├── docs/
│   ├── conception.md         ← le dossier de conception, copié tel quel
│   └── referentiel.md        ← à venir, avant le lot L2
├── app/
├── core/
│   ├── scoring/
│   ├── pilotage/
│   └── referential/
├── data/
│   └── repositories/
├── i18n/
│   └── fr-FR/
├── supabase/
│   └── migrations/
└── tests/
```

### 1.2 Les deux fichiers à poser en premier

1. **`docs/conception.md`** — copie intégrale du dossier de conception. C'est la source de vérité du projet. Claude Code doit pouvoir s'y référer à chaque session.
2. **`CLAUDE.md`** — fourni séparément, à poser à la racine. C'est ce que Claude Code lit automatiquement au début de chaque session.

### 1.3 Les tests dès le premier jour

Le critère d'acceptation §14 impose des tests unitaires sur le moteur de scoring. Installer le harnais de test **avant** d'écrire le moteur, pas après. Un moteur écrit sans tests ne sera jamais rétro-testé correctement.

---

## 2. Comment piloter Claude Code

### 2.1 La règle de base : un lot = une session = une branche

Ne jamais enchaîner deux lots dans la même session. Le contexte se dilue, les décisions du dossier se perdent, et le périmètre dérive.

```
git checkout -b lot-01-socle
```

### 2.2 Le rituel d'ouverture de session

À chaque nouvelle session, avant toute demande de code :

```
Lis CLAUDE.md et docs/conception.md.
On attaque le lot L1 : schéma de base, RLS, authentification, consentement.

Avant d'écrire du code, donne-moi :
1. ce que tu as compris du périmètre de ce lot
2. la liste des fichiers que tu comptes créer ou modifier
3. les points du dossier qui te semblent ambigus

N'écris rien tant que je n'ai pas validé.
```

**Le plan avant le code, systématiquement.** C'est ce qui coûte le moins cher à corriger. Si le plan contient une fonctionnalité hors périmètre, tu le vois en dix secondes au lieu de le découvrir dans 800 lignes.

### 2.3 Le rituel de clôture de lot

```
Avant qu'on close ce lot :
1. relis les critères d'acceptation §14 qui concernent ce lot
2. relis les garde-fous §12 et dis-moi si quelque chose y contrevient
3. liste les dépendances que tu as ajoutées et pourquoi
4. lance les tests
```

Puis relecture par toi, commit, merge, session suivante.

### 2.4 Les trois dérives à surveiller

| Dérive | Symptôme | Parade |
|---|---|---|
| **Extension de périmètre** | Il ajoute une fonction « utile » non demandée | Lui faire relire §1.3 et supprimer |
| **Texte en dur** | Des chaînes françaises dans les composants | Règle CLAUDE.md, à vérifier à chaque lot |
| **Dépendances non contrôlées** | Il installe une bibliothèque de confort | **Le plus grave** : voir ci-dessous |

> **Sur les dépendances.** Ta conformité interdit tout SDK d'analyse ou de publicité (§11). Un agent qui ajoute une bibliothèque pratique qui appelle un serveur tiers casse ton positionnement sans que rien ne le signale. **Exiger une validation explicite avant tout ajout de dépendance**, et faire lister les dépendances à chaque fin de lot.

---

## 3. Le lot L1, concrètement

**Contenu :** schéma de base, Row Level Security, authentification, parcours de consentement.
**Sortie attendue :** un parent peut créer un compte et un foyer.

### Découpage suggéré des sessions

| Session | Contenu | Vérification |
|---|---|---|
| 1 | Initialisation du projet, arborescence, harnais de test, connexion Supabase | Le projet démarre, les tests tournent à vide |
| 2 | Migrations : `household`, `caregiver`, `child`, `consent_record` | Les tables existent, les contraintes aussi |
| 3 | **Politiques RLS sur toutes les tables** | **Test explicite d'isolation entre deux foyers** |
| 4 | Authentification email + mot de passe | Inscription et connexion fonctionnelles |
| 5 | Écrans consentement, création foyer, création enfant | Parcours d'installation complet |

### Le test qui ne doit pas être sauté

À la fin de la session 3, créer deux foyers avec deux comptes distincts, et vérifier depuis le compte A qu'aucune requête ne remonte de donnée du foyer B. **Écrire ce test, ne pas le faire à la main.** Une RLS mal posée ne se voit pas en développement solo : elle se voit le jour où deux familles pilotes utilisent l'application.

---

## 4. Ce qui tourne en parallèle

Pendant que L1 avance, deux chantiers indépendants du code :

**Le corpus du référentiel.** C'est le chemin critique du projet, pas le code. Le lot L2 en dépend directement. Demande-le-moi dès maintenant : je produis la base complète par tranche d'âge — libellés, `short_label`, `focus_year`, difficulté, arborescence `split_into` — et tu la challenges avec ta femme.

**Les cinq entretiens B2B.** Toujours le meilleur investissement disponible, et toujours à zéro euro. Deux plateformes parentalité, deux CSE, une mutuelle.

**Le test du nom.** Dix parents, trois premiers mots, aucune explication.

---

## 5. Plan de la première semaine

| Jour | Action |
|---|---|
| 1 | Créer le projet Supabase **en région UE**, le dépôt Git, poser `CLAUDE.md` et `docs/conception.md` |
| 2 | Session 1 : initialisation, arborescence, tests |
| 3 | Session 2 : migrations |
| 4 | Session 3 : RLS + test d'isolation |
| 5 | Sessions 4 et 5 : auth et consentement |
| — | En parallèle : demander le corpus, lancer les entretiens |

À la fin de la semaine, tu dois pouvoir créer un compte, un foyer et un enfant. Rien de visible côté produit, mais tout le socle de conformité est posé — et c'est ce qui serait le plus douloureux à rattraper après coup.

---

## 6. Le jalon qui compte

**Le lot L4.** Dès qu'il est livré, l'application doit tourner en vrai chez toi, tous les soirs, sans attendre les lots suivants.

Tout ce que ton usage réel révélera vaut plus que tout ce que le dossier de conception anticipe. Le dossier est une hypothèse sérieuse, pas une vérité.
