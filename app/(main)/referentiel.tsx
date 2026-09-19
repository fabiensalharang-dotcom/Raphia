import { Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import ChildSwitcher from '../../components/ChildSwitcher';
import ScreenHeader from '../../components/ScreenHeader';
import { calculerAge, classerParAnnee } from '../../core/referential';
import type { RuleCategory, RuleTemplate } from '../../core/referential/types';
import type { RewardCategory, RewardTemplate, RewardTier } from '../../core/rewards/types';
import { useActiveChild } from '../../data/activeChild';
import {
  ajouterHabitudeDepuisReferentiel,
  definirDefiBloquant,
  definirSeuilQuotidien,
  fetchSeuilInfo,
  retirerHabitudeActive,
} from '../../data/repositories/pilotageRepository';
import {
  ajouterRecompenseAuMenu,
  definirDisponibiliteRecompense,
  fetchMenuStatus,
  type MenuInfo,
} from '../../data/repositories/rewardMenuRepository';
import { fetchRuleTemplates } from '../../data/repositories/ruleTemplateRepository';
import { fetchRewardTemplates } from '../../data/repositories/rewardTemplateRepository';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { colors, couleurCategorie, couleurCategorieRecompense } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const ORDRE_CATEGORIES: RuleCategory[] = ['autonomie', 'securite', 'social', 'scolaire', 'ecrans', 'emotions', 'organisation'];
const ORDRE_CATEGORIES_RECOMPENSE: RewardCategory[] = ['relationnelle', 'privilege', 'temps', 'materielle'];
const ORDRE_TIERS: RewardTier[] = ['daily', 'weekly'];

const LIBELLE_CATEGORIE_RECOMPENSE: Record<RewardCategory, string> = {
  relationnelle: strings['recompenses.categoryRelationnelle'],
  privilege: strings['recompenses.categoryPrivilege'],
  temps: strings['recompenses.categoryTemps'],
  materielle: strings['recompenses.categoryMaterielle'],
};

const TITRE_TIER: Record<RewardTier, string> = {
  daily: strings['recompenses.dailyTitle'],
  weekly: strings['recompenses.weeklyTitle'],
};

type Mode = 'habitude' | 'defi' | 'recompense';
type Selection = 'selection' | 'tout';

type ActiveInfo = { ruleInstanceId: string; estThematique: boolean };

function remplir(gabarit: string, slots: Record<string, unknown>): string {
  return gabarit.replace(/\{(\w+)\}/g, (_, nom: string) => String(slots[nom] ?? ''));
}

export default function Referentiel() {
  const onboarding = useOnboardingState();
  const { activeChildId: childId, children: enfantsFoyer, activeAccent } = useActiveChild();
  const enfantActif = enfantsFoyer.find((c) => c.id === childId);
  const accent = activeAccent.accent;
  const accentStyles = useMemo(() => makeAccentStyles(accent), [accent]);

  const [mode, setMode] = useState<Mode>('habitude');
  const [selection, setSelection] = useState<Selection>('selection');
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [libelleEdite, setLibelleEdite] = useState('');
  const [bloquantEdite, setBloquantEdite] = useState(false);

  // Habitudes / Défi
  const [templates, setTemplates] = useState<RuleTemplate[] | null>(null);
  const [ageReel, setAgeReel] = useState<number | null>(null);
  const [ageAffiche, setAgeAffiche] = useState<number | null>(null);
  const [idsActifs, setIdsActifs] = useState<Map<string, ActiveInfo>>(new Map());
  const [defiActif, setDefiActif] = useState<{ ruleInstanceId: string; label: string; bloquant: boolean } | null>(
    null
  );
  const [auMaximum, setAuMaximum] = useState(false);
  const [filtreCategorie, setFiltreCategorie] = useState<RuleCategory | null>(null);

  // Récompenses
  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[] | null>(null);
  const [statutMenu, setStatutMenu] = useState<Map<string, MenuInfo>>(new Map());
  const [filtreTier, setFiltreTier] = useState<RewardTier>('daily');
  const [filtreCategorieRecompense, setFiltreCategorieRecompense] = useState<RewardCategory | null>(null);

  async function charger(childIdActuel: string) {
    setError(false);
    try {
      const [{ data: child, error: childError }, tous, { data: regles, error: reglesError }, tousLesRecompenses, statut] =
        await Promise.all([
          supabase.from('child').select('birth_date').eq('id', childIdActuel).single(),
          fetchRuleTemplates(),
          supabase
            .from('rule_instance')
            .select('id, template_id, status, is_thematic, thematic_blocking, label')
            .eq('child_id', childIdActuel),
          fetchRewardTemplates(),
          fetchMenuStatus(childIdActuel),
        ]);
      if (childError || !child) throw childError ?? new Error('child introuvable');
      if (reglesError) throw reglesError;

      const age = calculerAge(child.birth_date);
      setTemplates(tous);
      setAgeReel(age);
      setAgeAffiche((actuel) => actuel ?? age);
      setRewardTemplates(tousLesRecompenses);
      setStatutMenu(statut);

      const actives = (regles ?? []).filter((r) => r.status === 'active');
      const map = new Map<string, ActiveInfo>();
      for (const r of actives) {
        if (r.template_id) map.set(r.template_id, { ruleInstanceId: r.id, estThematique: r.is_thematic });
      }
      setIdsActifs(map);
      setAuMaximum(actives.length >= 6);
      const thematique = actives.find((r) => r.is_thematic);
      setDefiActif(
        thematique
          ? { ruleInstanceId: thematique.id, label: thematique.label, bloquant: thematique.thematic_blocking }
          : null
      );
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    if (!childId) return;
    charger(childId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  if (onboarding.status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (onboarding.status !== 'ready') {
    return <Redirect href="/" />;
  }

  function changerMode(nouveauMode: Mode) {
    setMode(nouveauMode);
    setEditionId(null);
    setLibelleEdite('');
    setBloquantEdite(false);
  }

  function commencerEdition(id: string, labelDepart: string) {
    setEditionId(id);
    setLibelleEdite(labelDepart);
    setBloquantEdite(false);
  }

  function annulerEdition() {
    setEditionId(null);
    setLibelleEdite('');
    setBloquantEdite(false);
  }

  async function ajouterHabitude(template: RuleTemplate) {
    if (!childId) return;
    setBusyId(template.id);
    try {
      const avant = await fetchSeuilInfo(childId);
      const ok = await ajouterHabitudeDepuisReferentiel(
        childId,
        template,
        mode === 'defi',
        libelleEdite,
        mode === 'defi' && bloquantEdite
      );
      if (ok) {
        annulerEdition();
        await charger(childId);
        const apres = await fetchSeuilInfo(childId);
        if (apres.seuilRecommande !== avant.seuilActuel) {
          proposerAjustementSeuil(childId, avant.seuilActuel, apres.seuilRecommande);
        }
      } else {
        setAuMaximum(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  async function ajouterRecompense(template: RewardTemplate) {
    if (!childId) return;
    setBusyId(template.id);
    try {
      await ajouterRecompenseAuMenu(childId, template, libelleEdite);
      annulerEdition();
      await charger(childId);
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  async function basculerDisponibiliteRecompense(rewardInstanceId: string, disponible: boolean) {
    if (!childId) return;
    setBusyId(rewardInstanceId);
    try {
      await definirDisponibiliteRecompense(rewardInstanceId, disponible);
      await charger(childId);
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  async function basculerDefiBloquant() {
    if (!defiActif) return;
    setBusyId(defiActif.ruleInstanceId);
    try {
      await definirDefiBloquant(defiActif.ruleInstanceId, !defiActif.bloquant);
      if (childId) await charger(childId);
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  async function retirerHabitude(ruleInstanceId: string) {
    if (!childId) return;
    setBusyId(ruleInstanceId);
    try {
      const avant = await fetchSeuilInfo(childId);
      await retirerHabitudeActive(ruleInstanceId);
      await charger(childId);
      const apres = await fetchSeuilInfo(childId);
      if (apres.seuilRecommande !== avant.seuilActuel) {
        proposerAjustementSeuil(childId, avant.seuilActuel, apres.seuilRecommande);
      }
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  function confirmerRetraitHabitude(ruleInstanceId: string) {
    if (!enfantActif) return;
    const message = remplir(strings['referentiel.removeConfirmBody'], { firstName: enfantActif.firstName });
    if (Platform.OS === 'web') {
      if (window.confirm(message)) retirerHabitude(ruleInstanceId);
      return;
    }
    Alert.alert(strings['referentiel.removeConfirmTitle'], message, [
      { text: strings['referentiel.removeCancelButton'], style: 'cancel' },
      { text: strings['referentiel.removeConfirmButton'], style: 'destructive', onPress: () => retirerHabitude(ruleInstanceId) },
    ]);
  }

  function proposerAjustementSeuil(childIdActuel: string, seuilActuel: number, seuilRecommande: number) {
    const message = remplir(strings['referentiel.thresholdPromptBody'], { value: seuilRecommande, current: seuilActuel });
    const appliquer = () => definirSeuilQuotidien(childIdActuel, seuilRecommande).catch(() => setError(true));
    if (Platform.OS === 'web') {
      if (window.confirm(message)) appliquer();
      return;
    }
    Alert.alert(strings['referentiel.thresholdPromptTitle'], message, [
      { text: remplir(strings['referentiel.thresholdPromptCancel'], { current: seuilActuel }), style: 'cancel' },
      { text: remplir(strings['referentiel.thresholdPromptConfirm'], { value: seuilRecommande }), onPress: appliquer },
    ]);
  }

  const estModeRecompense = mode === 'recompense';

  const bornesAgeHabitude = (templates ?? []).reduce(
    (bornes, t) => ({ min: Math.min(bornes.min, t.ageMin), max: Math.max(bornes.max, t.ageMax) }),
    { min: 99, max: 0 }
  );
  const bornesAgeRecompense = (rewardTemplates ?? []).reduce(
    (bornes, t) => ({ min: Math.min(bornes.min, t.ageMin), max: Math.max(bornes.max, t.ageMax) }),
    { min: 99, max: 0 }
  );
  const bornesAge = estModeRecompense ? bornesAgeRecompense : bornesAgeHabitude;

  // Habitudes / Défi : liste affichée
  const habitudesParAge = ageAffiche === null ? [] : classerParAnnee(templates ?? [], ageAffiche);
  const habitudesParMode = mode === 'defi' ? habitudesParAge.filter((t) => t.isThematicEligible) : habitudesParAge;
  const habitudesParCategorie = filtreCategorie
    ? habitudesParMode.filter((t) => t.category === filtreCategorie)
    : habitudesParMode;
  const habitudesAffichees =
    selection === 'selection'
      ? habitudesParCategorie.filter((t) => {
          const info = idsActifs.get(t.id);
          return info ? info.estThematique === (mode === 'defi') : false;
        })
      : habitudesParCategorie;

  const groupesHabitudes = new Map<RuleCategory, RuleTemplate[]>();
  for (const template of habitudesAffichees) {
    const liste = groupesHabitudes.get(template.category) ?? [];
    liste.push(template);
    groupesHabitudes.set(template.category, liste);
  }

  // Récompenses : liste affichée
  const recompensesParAge = (rewardTemplates ?? []).filter(
    (t) => ageAffiche !== null && t.ageMin <= ageAffiche && ageAffiche <= t.ageMax
  );
  const recompensesParTier = recompensesParAge.filter((t) => t.tier === filtreTier);
  const recompensesParCategorie = filtreCategorieRecompense
    ? recompensesParTier.filter((t) => t.category === filtreCategorieRecompense)
    : recompensesParTier;
  const recompensesAffichees =
    selection === 'selection'
      ? recompensesParCategorie.filter((t) => statutMenu.has(t.id))
      : recompensesParCategorie;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['referentiel.title']} accentColor={accent} />
      <ChildSwitcher />

      <View style={styles.body}>
        <Text style={styles.subtitle}>
          {estModeRecompense ? strings['recompenses.subtitle'] : strings['referentiel.subtitle']}
        </Text>
        {!estModeRecompense && <Text style={styles.effectiveTomorrow}>{strings['referentiel.effectiveTomorrow']}</Text>}

        {error ? <Text style={styles.error}>{strings['referentiel.error']}</Text> : null}

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[accentStyles.modeSegment, mode === 'habitude' && accentStyles.modeSegmentActive]}
            onPress={() => changerMode('habitude')}
          >
            <Text style={[styles.modeLabel, mode === 'habitude' && styles.modeLabelActive]}>
              {strings['referentiel.modeHabitude']}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[accentStyles.modeSegment, mode === 'defi' && accentStyles.modeSegmentActive]}
            onPress={() => changerMode('defi')}
          >
            <Text style={[styles.modeLabel, mode === 'defi' && styles.modeLabelActive]}>
              {strings['referentiel.modeDefi']}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[accentStyles.modeSegment, mode === 'recompense' && accentStyles.modeSegmentActive]}
            onPress={() => changerMode('recompense')}
          >
            <Text style={[styles.modeLabel, mode === 'recompense' && styles.modeLabelActive]}>
              {strings['recompenses.modeTitle']}
            </Text>
          </TouchableOpacity>
        </View>

        {estModeRecompense && (
          <View style={styles.tierRow}>
            <TouchableOpacity
              style={[accentStyles.tierSegment, filtreTier === 'daily' && accentStyles.modeSegmentActive]}
              onPress={() => setFiltreTier('daily')}
            >
              <Text style={[styles.modeLabel, filtreTier === 'daily' && styles.modeLabelActive]}>
                {strings['recompenses.dailyTitle']}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[accentStyles.tierSegment, filtreTier === 'weekly' && accentStyles.modeSegmentActive]}
              onPress={() => setFiltreTier('weekly')}
            >
              <Text style={[styles.modeLabel, filtreTier === 'weekly' && styles.modeLabelActive]}>
                {strings['recompenses.weeklyTitle']}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.selectionRow}>
          <TouchableOpacity
            style={[styles.selectionChip, selection === 'selection' && accentStyles.selectionChipActive]}
            onPress={() => setSelection('selection')}
          >
            <Text style={[styles.selectionLabel, selection === 'selection' && styles.selectionLabelActive]}>
              {strings['referentiel.mySelection']}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectionChip, selection === 'tout' && accentStyles.selectionChipActive]}
            onPress={() => setSelection('tout')}
          >
            <Text
              style={[
                styles.selectionLabel,
                styles.selectionLabelMuted,
                selection === 'tout' && styles.selectionLabelActive,
              ]}
            >
              {strings['referentiel.wholeReferentiel']}
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'defi' && defiActif && enfantActif && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {remplir(strings['referentiel.defiAlreadySet'], { firstName: enfantActif.firstName, label: defiActif.label })}
            </Text>
            <View style={styles.blockingRow}>
              <View style={styles.blockingTextWrap}>
                <Text style={styles.blockingLabel}>{strings['referentiel.defiBlockingLabel']}</Text>
                <Text style={styles.blockingBody}>{strings['referentiel.defiBlockingBody']}</Text>
              </View>
              <TouchableOpacity
                style={[accentStyles.toggle, defiActif.bloquant && accentStyles.toggleActive]}
                onPress={basculerDefiBloquant}
                disabled={busyId === defiActif.ruleInstanceId}
              >
                <View style={[styles.toggleKnob, defiActif.bloquant && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {ageAffiche !== null && (
          <View style={styles.ageRow}>
            <TouchableOpacity
              style={[styles.ageStepper, ageAffiche <= bornesAge.min && styles.ageStepperDisabled]}
              onPress={() => setAgeAffiche((a) => Math.max(bornesAge.min, (a ?? bornesAge.min) - 1))}
              disabled={ageAffiche <= bornesAge.min}
            >
              <Text style={styles.ageStepperLabel}>–</Text>
            </TouchableOpacity>
            <Text style={styles.ageLabel}>{remplir(strings['referentiel.ageLabel'], { age: ageAffiche })}</Text>
            <TouchableOpacity
              style={[styles.ageStepper, ageAffiche >= bornesAge.max && styles.ageStepperDisabled]}
              onPress={() => setAgeAffiche((a) => Math.min(bornesAge.max, (a ?? bornesAge.max) + 1))}
              disabled={ageAffiche >= bornesAge.max}
            >
              <Text style={styles.ageStepperLabel}>+</Text>
            </TouchableOpacity>
            {ageReel !== null && ageAffiche !== ageReel && (
              <TouchableOpacity onPress={() => setAgeAffiche(ageReel)}>
                <Text style={[styles.ageReset, { color: accent }]}>{strings['referentiel.ageReset']}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {estModeRecompense ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            <TouchableOpacity
              style={[styles.categoryChip, !filtreCategorieRecompense && accentStyles.categoryChipActive]}
              onPress={() => setFiltreCategorieRecompense(null)}
            >
              <Text style={[styles.categoryChipLabel, !filtreCategorieRecompense && styles.categoryChipLabelActive]}>
                {strings['recompenses.categoryAll']}
              </Text>
            </TouchableOpacity>
            {ORDRE_CATEGORIES_RECOMPENSE.map((categorie) => {
              const couleur = couleurCategorieRecompense(categorie);
              const active = filtreCategorieRecompense === categorie;
              return (
                <TouchableOpacity
                  key={categorie}
                  style={[
                    styles.categoryChip,
                    { borderColor: couleur },
                    active && { backgroundColor: couleur, borderColor: couleur },
                  ]}
                  onPress={() => setFiltreCategorieRecompense(categorie)}
                >
                  <Text style={[styles.categoryChipLabel, { color: active ? '#fff' : couleur }]}>
                    {LIBELLE_CATEGORIE_RECOMPENSE[categorie]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            <TouchableOpacity
              style={[styles.categoryChip, !filtreCategorie && accentStyles.categoryChipActive]}
              onPress={() => setFiltreCategorie(null)}
            >
              <Text style={[styles.categoryChipLabel, !filtreCategorie && styles.categoryChipLabelActive]}>
                {strings['referentiel.categoryAll']}
              </Text>
            </TouchableOpacity>
            {ORDRE_CATEGORIES.map((categorie) => {
              const couleur = couleurCategorie(categorie);
              const active = filtreCategorie === categorie;
              return (
                <TouchableOpacity
                  key={categorie}
                  style={[
                    styles.categoryChip,
                    { borderColor: couleur },
                    active && { backgroundColor: couleur, borderColor: couleur },
                  ]}
                  onPress={() => setFiltreCategorie(categorie)}
                >
                  <Text style={[styles.categoryChipLabel, { color: active ? '#fff' : couleur }]}>
                    {strings[`category.${categorie}`] ?? categorie}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {estModeRecompense ? (
          <>
            {selection === 'selection' && recompensesAffichees.length === 0 && (
              <Text style={styles.notice}>{strings['recompenses.selectionEmpty']}</Text>
            )}
            {ORDRE_TIERS.filter((tier) => tier === filtreTier).map((tier) => {
              const groupes = new Map<RewardCategory, RewardTemplate[]>();
              for (const template of recompensesAffichees) {
                const liste = groupes.get(template.category) ?? [];
                liste.push(template);
                groupes.set(template.category, liste);
              }
              return (
                <View key={tier} style={styles.tierSection}>
                  {ORDRE_CATEGORIES_RECOMPENSE.filter((categorie) => groupes.has(categorie)).map((categorie) => (
                    <View key={categorie} style={styles.section}>
                      <Text style={styles.sectionTitle}>{LIBELLE_CATEGORIE_RECOMPENSE[categorie]}</Text>
                      {(groupes.get(categorie) ?? []).map((template) => {
                        const info = statutMenu.get(template.id);
                        const enEdition = editionId === template.id;
                        const couleur = couleurCategorieRecompense(template.category);
                        return (
                          <View
                            key={template.id}
                            style={[
                              styles.item,
                              enEdition && styles.itemEditing,
                              { borderColor: couleur },
                              info?.isAvailable && { backgroundColor: couleur },
                            ]}
                          >
                            {enEdition ? (
                              <>
                                <TextInput
                                  style={styles.editInput}
                                  value={libelleEdite}
                                  onChangeText={setLibelleEdite}
                                  accessibilityLabel={strings['recompenses.editLabel']}
                                  multiline
                                />
                                <View style={styles.editActions}>
                                  <TouchableOpacity onPress={annulerEdition}>
                                    <Text style={styles.editCancel}>{strings['recompenses.editCancel']}</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={accentStyles.addButton}
                                    onPress={() => ajouterRecompense(template)}
                                    disabled={!libelleEdite.trim() || busyId === template.id}
                                  >
                                    <Text style={accentStyles.addButtonText}>{strings['recompenses.addButton']}</Text>
                                  </TouchableOpacity>
                                </View>
                              </>
                            ) : (
                              <>
                                <Text style={[styles.itemLabel, info?.isAvailable && styles.itemLabelOn]}>
                                  {template.label}
                                </Text>
                                {info ? (
                                  <View style={styles.itemActiveWrap}>
                                    <Text style={[styles.activeBadge, info.isAvailable && styles.activeBadgeOn]}>
                                      {info.isAvailable ? strings['recompenses.onMenu'] : strings['recompenses.removedFromMenu']}
                                    </Text>
                                    <TouchableOpacity
                                      onPress={() => basculerDisponibiliteRecompense(info.rewardInstanceId, !info.isAvailable)}
                                      disabled={busyId === info.rewardInstanceId}
                                    >
                                      <Text
                                        style={
                                          info.isAvailable
                                            ? [styles.removeLink, styles.removeLinkOn]
                                            : accentStyles.restoreLink
                                        }
                                      >
                                        {info.isAvailable ? strings['recompenses.removeButton'] : strings['recompenses.restoreButton']}
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    style={[accentStyles.addButton, { borderColor: couleur }]}
                                    onPress={() => commencerEdition(template.id, template.label)}
                                  >
                                    <Text style={[accentStyles.addButtonText, { color: couleur }]}>
                                      {strings['recompenses.addButton']}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        ) : (
          <>
            {auMaximum ? <Text style={styles.notice}>{strings['pilotage.boardFull']}</Text> : null}
            {mode === 'defi' && selection === 'tout' && habitudesAffichees.length === 0 ? (
              <Text style={styles.notice}>{strings['referentiel.defiNoneEligible']}</Text>
            ) : null}
            {selection === 'selection' && habitudesAffichees.length === 0 && !(mode === 'defi' && defiActif) ? (
              <Text style={styles.notice}>{strings['referentiel.selectionEmpty']}</Text>
            ) : null}

            {ORDRE_CATEGORIES.filter((categorie) => groupesHabitudes.has(categorie)).map((categorie) => (
              <View key={categorie} style={styles.section}>
                <Text style={styles.sectionTitle}>{strings[`category.${categorie}`] ?? categorie}</Text>
                {(groupesHabitudes.get(categorie) ?? []).map((template) => {
                  const info = idsActifs.get(template.id);
                  const enEdition = editionId === template.id;
                  const couleur = couleurCategorie(template.category);
                  return (
                    <View
                      key={template.id}
                      style={[
                        styles.item,
                        enEdition && styles.itemEditing,
                        { borderColor: couleur },
                        info && { backgroundColor: couleur },
                      ]}
                    >
                      {enEdition ? (
                        <>
                          <TextInput
                            style={styles.editInput}
                            value={libelleEdite}
                            onChangeText={setLibelleEdite}
                            accessibilityLabel={strings['referentiel.editLabel']}
                            multiline
                          />
                          {mode === 'defi' && (
                            <View style={styles.blockingRow}>
                              <View style={styles.blockingTextWrap}>
                                <Text style={styles.blockingLabel}>{strings['referentiel.defiBlockingLabel']}</Text>
                                <Text style={styles.blockingBody}>{strings['referentiel.defiBlockingBody']}</Text>
                              </View>
                              <TouchableOpacity
                                style={[accentStyles.toggle, bloquantEdite && accentStyles.toggleActive]}
                                onPress={() => setBloquantEdite((v) => !v)}
                              >
                                <View style={[styles.toggleKnob, bloquantEdite && styles.toggleKnobActive]} />
                              </TouchableOpacity>
                            </View>
                          )}
                          <View style={styles.editActions}>
                            <TouchableOpacity onPress={annulerEdition}>
                              <Text style={styles.editCancel}>{strings['referentiel.editCancel']}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={accentStyles.addButton}
                              onPress={() => ajouterHabitude(template)}
                              disabled={!libelleEdite.trim() || busyId === template.id}
                            >
                              <Text style={accentStyles.addButtonText}>
                                {mode === 'defi' ? strings['referentiel.defiAddButton'] : strings['referentiel.add']}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.itemLabel, info && styles.itemLabelOn]}>{template.label}</Text>
                          {info ? (
                            <View style={styles.itemActiveWrap}>
                              <Text style={[styles.activeBadge, styles.activeBadgeOn]}>
                                {info.estThematique ? strings['referentiel.defiActiveBadge'] : strings['referentiel.alreadyActive']}
                              </Text>
                              <TouchableOpacity
                                onPress={() => confirmerRetraitHabitude(info.ruleInstanceId)}
                                disabled={busyId === info.ruleInstanceId}
                              >
                                <Text style={[styles.removeLink, styles.removeLinkOn]}>{strings['referentiel.removeButton']}</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[accentStyles.addButton, { borderColor: couleur }, auMaximum && styles.addButtonDisabled]}
                              onPress={() => commencerEdition(template.id, template.label)}
                              disabled={auMaximum || (mode === 'defi' && !!defiActif)}
                            >
                              <Text
                                style={[
                                  accentStyles.addButtonText,
                                  { color: couleur },
                                  auMaximum && styles.addButtonTextDisabled,
                                ]}
                              >
                                {mode === 'defi' ? strings['referentiel.defiAddButton'] : strings['referentiel.add']}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function makeAccentStyles(accent: string) {
  return StyleSheet.create({
    modeSegment: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: accent,
      borderRadius: 100,
      paddingVertical: 10,
      alignItems: 'center',
    },
    tierSegment: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: accent,
      borderRadius: 100,
      paddingVertical: 8,
      alignItems: 'center',
    },
    modeSegmentActive: {
      backgroundColor: accent,
    },
    categoryChipActive: {
      backgroundColor: accent,
      borderColor: accent,
    },
    addButton: {
      borderWidth: 1.5,
      borderColor: accent,
      borderRadius: 100,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    addButtonText: {
      color: accent,
      fontFamily: fonts.bodyBold,
      fontSize: 13,
    },
    restoreLink: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: accent,
    },
    toggle: {
      width: 46,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.border,
      padding: 3,
      justifyContent: 'center',
    },
    toggleActive: {
      backgroundColor: accent,
    },
    selectionChipActive: {
      backgroundColor: accent,
    },
  });
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  body: {
    padding: 22,
    gap: 14,
  },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: -6,
  },
  effectiveTomorrow: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: 'italic',
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.bodyMedium,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  modeLabelActive: {
    color: '#fff',
  },
  selectionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionChip: {
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  selectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  selectionLabelMuted: {
    color: colors.inkMuted,
  },
  selectionLabelActive: {
    color: '#fff',
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ageStepper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageStepperDisabled: {
    opacity: 0.35,
  },
  ageStepperLabel: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 16,
    color: colors.ink,
  },
  ageLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  ageReset: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
  },
  categoryRow: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryChipLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.ink,
  },
  categoryChipLabelActive: {
    color: '#fff',
  },
  notice: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  noticeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  blockingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  blockingTextWrap: {
    flex: 1,
    gap: 2,
  },
  blockingLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  blockingBody: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkMuted,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  toggleKnobActive: {
    transform: [{ translateX: 18 }],
  },
  tierSection: {
    gap: 14,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: fonts.cursive,
    fontSize: 19,
    color: colors.ink,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  itemLabel: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  itemLabelOn: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
  },
  itemActiveWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  itemEditing: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  editInput: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
  },
  editCancel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.inkMuted,
  },
  activeBadge: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.inkMuted,
  },
  activeBadgeOn: {
    color: 'rgba(255,255,255,0.85)',
  },
  removeLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.danger,
  },
  removeLinkOn: {
    color: '#fff',
    textDecorationLine: 'underline',
  },
  addButtonDisabled: {
    borderColor: colors.border,
  },
  addButtonTextDisabled: {
    color: colors.inkMuted,
  },
});
