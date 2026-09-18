// §7.3-§7.7 : gabarits déterministes du bilan du soir. Jamais de texte
// rendu stocké en base — seules la clé, la variante et les valeurs le
// sont (§7.9). Au moins 5 variantes par observation, 4 par question
// (§7.7). Tutoiement du parent, jamais les mots échec/raté/manqué/
// mauvais/problème, jamais de comparaison entre enfants (§7.6).
export const bilan = {
  'bilan.title': 'Bilan du soir',
  'bilan.eveningHeader': 'Ce soir',
  'bilan.heldToday': 'Tenu aujourd’hui',
  'bilan.toNotice': 'À remarquer',
  'bilan.tomorrow': 'Demain',
  'bilan.pointsSummary': '{score} points',
  'bilan.noRuleHeld': 'Aucune habitude tenue aujourd’hui.',
  'bilan.notReady': 'Le bilan sera prêt une fois la journée clôturée.',
  'bilan.error': 'Impossible de charger le bilan, réessaie.',
  'bilan.openBilan': 'Voir le bilan',

  'bilan.observation.recovery.0': 'Le seuil est de nouveau atteint aujourd’hui.',
  'bilan.observation.recovery.1': 'Après quelques jours plus calmes, le seuil est atteint aujourd’hui.',
  'bilan.observation.recovery.2': 'Aujourd’hui marque un retour au rythme habituel.',
  'bilan.observation.recovery.3': 'Le seuil est atteint aujourd’hui, après une pause de quelques jours.',
  'bilan.observation.recovery.4': 'Ça repart aujourd’hui : le seuil est atteint.',

  'bilan.observation.first_time.0': '« {ruleLabel} » est tenue pour la première fois aujourd’hui.',
  'bilan.observation.first_time.1': 'C’est la première fois que « {ruleLabel} » est tenue.',
  'bilan.observation.first_time.2': '« {ruleLabel} » vient d’être tenue pour la première fois.',
  'bilan.observation.first_time.3': 'Une première : « {ruleLabel} » est tenue aujourd’hui.',
  'bilan.observation.first_time.4': '« {ruleLabel} » est tenue aujourd’hui, une première depuis son ajout.',

  'bilan.observation.streak_building.0': '« {ruleLabel} » est tenue depuis {days} jours d’affilée.',
  'bilan.observation.streak_building.1': 'Cela fait {days} jours que « {ruleLabel} » est tenue sans interruption.',
  'bilan.observation.streak_building.2': '« {ruleLabel} » s’installe : {days} jours d’affilée.',
  'bilan.observation.streak_building.3': '{days} jours d’affilée pour « {ruleLabel} ».',
  'bilan.observation.streak_building.4': '« {ruleLabel} » tient bon depuis {days} jours.',

  'bilan.observation.perfect_day.0': 'Toutes les règles ont été tenues aujourd’hui.',
  'bilan.observation.perfect_day.1': 'Chaque habitude applicable a été tenue aujourd’hui.',
  'bilan.observation.perfect_day.2': 'Aujourd’hui, tout a été tenu.',
  'bilan.observation.perfect_day.3': 'Une journée où tout a été tenu.',
  'bilan.observation.perfect_day.4': 'Rien à ajouter : tout a été tenu aujourd’hui.',

  'bilan.observation.threshold_first_of_week.0': 'C’est le premier seuil atteint de la semaine.',
  'bilan.observation.threshold_first_of_week.1': 'Premier seuil de la semaine atteint aujourd’hui.',
  'bilan.observation.threshold_first_of_week.2': 'La semaine démarre avec un seuil atteint.',
  'bilan.observation.threshold_first_of_week.3': 'Le premier seuil de la semaine vient de tomber.',
  'bilan.observation.threshold_first_of_week.4': 'Un premier seuil atteint cette semaine.',

  'bilan.observation.weekly_pace.0': 'Encore un jour de seuil atteint et la semaine sera réussie.',
  'bilan.observation.weekly_pace.1': 'Encore un jour suffira pour réussir la semaine.',
  'bilan.observation.weekly_pace.2': 'La semaine se joue à un jour près.',
  'bilan.observation.weekly_pace.3': 'Un seul jour sépare encore la semaine de son seuil.',
  'bilan.observation.weekly_pace.4': 'Plus qu’un jour pour boucler la semaine.',

  'bilan.observation.close_to_threshold.0': 'Le seuil du jour a été à un point près.',
  'bilan.observation.close_to_threshold.1': 'Un point de plus aurait suffi pour atteindre le seuil aujourd’hui.',
  'bilan.observation.close_to_threshold.2': 'Un seul point séparait la journée du seuil.',
  'bilan.observation.close_to_threshold.3': 'Le seuil était tout proche aujourd’hui.',
  'bilan.observation.close_to_threshold.4': 'À un point du seuil aujourd’hui.',

  'bilan.observation.rule_struggling.0': '« {ruleLabel} » demande encore du temps ces derniers jours.',
  'bilan.observation.rule_struggling.1': '« {ruleLabel} » reste difficile à tenir depuis plusieurs jours.',
  'bilan.observation.rule_struggling.2': '« {ruleLabel} » n’est pas encore installée dans les habitudes.',
  'bilan.observation.rule_struggling.3': '« {ruleLabel} » demande encore un peu d’accompagnement.',
  'bilan.observation.rule_struggling.4': '« {ruleLabel} » prend plus de temps à s’installer que les autres habitudes.',

  'bilan.observation.steady.0': 'La journée s’est déroulée normalement.',
  'bilan.observation.steady.1': 'Une journée sans particularité aujourd’hui.',
  'bilan.observation.steady.2': 'Rien de spécial à signaler aujourd’hui.',
  'bilan.observation.steady.3': 'Une journée comme les autres.',
  'bilan.observation.steady.4': 'La journée a suivi son cours habituel.',

  'bilan.question.recovery.0': 'Tu peux lui demander ce qui a changé aujourd’hui.',
  'bilan.question.recovery.1': 'Tu peux lui demander ce qui l’a aidé à s’y remettre.',
  'bilan.question.recovery.2': 'Tu peux lui demander comment s’est passée sa journée.',
  'bilan.question.recovery.3': 'Tu peux lui demander ce qui a été différent aujourd’hui.',

  'bilan.question.first_time.0': 'Tu peux lui demander comment il s’y est pris aujourd’hui.',
  'bilan.question.first_time.1': 'Tu peux lui demander ce qui l’a aidé à y arriver cette fois.',
  'bilan.question.first_time.2': 'Tu peux lui demander s’il est content de l’avoir fait.',
  'bilan.question.first_time.3': 'Tu peux lui demander ce qu’il a pensé en le faisant.',

  'bilan.question.streak_building.0': 'Tu peux lui demander ce qui l’aide à y arriver depuis plusieurs jours.',
  'bilan.question.streak_building.1': 'Tu peux lui demander comment il fait pour y penser chaque jour.',
  'bilan.question.streak_building.2': 'Tu peux lui demander si c’est plus facile qu’au début.',
  'bilan.question.streak_building.3': 'Tu peux lui demander ce qu’il retient de ces derniers jours.',

  'bilan.question.perfect_day.0': 'Tu peux lui demander de quoi il est le plus fier aujourd’hui.',
  'bilan.question.perfect_day.1': 'Tu peux lui demander ce qu’il a préféré dans sa journée.',
  'bilan.question.perfect_day.2': 'Tu peux lui demander comment il a fait pour tout tenir aujourd’hui.',
  'bilan.question.perfect_day.3': 'Tu peux lui demander ce qui l’a aidé aujourd’hui.',

  'bilan.question.threshold_first_of_week.0': 'Tu peux lui demander comment il compte continuer cette semaine.',
  'bilan.question.threshold_first_of_week.1': 'Tu peux lui demander ce qu’il a envie de faire du reste de la semaine.',
  'bilan.question.threshold_first_of_week.2': 'Tu peux lui demander ce qui l’a aidé à bien commencer la semaine.',
  'bilan.question.threshold_first_of_week.3': 'Tu peux lui demander comment s’est passé le début de sa semaine.',

  'bilan.question.weekly_pace.0': 'Tu peux lui demander comment il voit la fin de la semaine.',
  'bilan.question.weekly_pace.1': 'Tu peux lui demander ce qui pourrait l’aider demain.',
  'bilan.question.weekly_pace.2': 'Tu peux lui demander s’il sent la semaine proche du but.',
  'bilan.question.weekly_pace.3': 'Tu peux lui demander ce qu’il aimerait faire demain.',

  'bilan.question.close_to_threshold.0': 'Tu peux lui demander à quel moment ça a été le plus dur.',
  'bilan.question.close_to_threshold.1': 'Tu peux lui demander ce qui aurait pu l’aider à aller un peu plus loin aujourd’hui.',
  'bilan.question.close_to_threshold.2': 'Tu peux lui demander comment s’est passée sa journée dans l’ensemble.',
  'bilan.question.close_to_threshold.3': 'Tu peux lui demander ce qu’il retient de sa journée.',

  'bilan.question.rule_struggling.0':
    'Tu peux lui demander ce qui est compliqué dans cette habitude — souvent l’enfant le sait mieux que nous.',
  'bilan.question.rule_struggling.1': 'Tu peux lui demander ce qui rend cette habitude difficile pour lui en ce moment.',
  'bilan.question.rule_struggling.2': 'Tu peux lui demander s’il a une idée pour rendre cette habitude plus simple.',
  'bilan.question.rule_struggling.3': 'Tu peux lui demander ce qui pourrait l’aider avec cette habitude.',

  'bilan.question.steady.0': 'Tu peux lui demander quel a été le meilleur moment de sa journée.',
  'bilan.question.steady.1': 'Tu peux lui demander ce qu’il a fait de bien aujourd’hui.',
  'bilan.question.steady.2': 'Tu peux lui demander ce qu’il retient de sa journée.',
  'bilan.question.steady.3': 'Tu peux lui demander comment s’est passée son école aujourd’hui.',

  'bilan.weekly.title': 'Bilan de la semaine',
  'bilan.weekly.pointsSummary.one': '{points} points cette semaine — seuil atteint {daysThresholdMet} jour sur 7',
  'bilan.weekly.pointsSummary.other': '{points} points cette semaine — seuil atteint {daysThresholdMet} jours sur 7',
  'bilan.weekly.mostRegular': '« {ruleLabel} » est l’habitude la plus régulière cette semaine.',
  'bilan.weekly.mostImproved': '« {ruleLabel} » a le plus progressé par rapport à la semaine dernière.',
  'bilan.weekly.rewardUnlocked': 'La récompense de la semaine est débloquée : {rewardLabel}',
  'bilan.weekly.focus': 'Un focus pour la semaine prochaine : « {ruleLabel} ».',

  'bilan.share': 'Partager',
  'bilan.shareHideName': 'Masquer le prénom',
  'bilan.shareShowName': 'Afficher le prénom',
  'bilan.shareAction': 'Partager la carte',
  'bilan.shareClose': 'Fermer',
  'bilan.shareUnavailable': 'Le partage n’est pas disponible sur cet appareil.',
  'bilan.shareError': 'Impossible de générer la carte, réessaie.',

  'bilan.notification.title': 'Bilan du soir',
  'bilan.notification.body': 'Le bilan de ce soir est prêt.',
  'bilan.reminderNotification.title': 'Rituel du soir',
  'bilan.reminderNotification.body': "C'est bientôt l'heure du rituel du soir.",
  'bilan.weeklyNotification.title': 'Bilan de la semaine',
  'bilan.weeklyNotification.body': 'Le bilan de la semaine est prêt.',
  'bilan.birthdayNotification.title': 'Anniversaire',
  'bilan.birthdayNotification.body': 'C’est l’anniversaire de votre enfant aujourd’hui.',
};
