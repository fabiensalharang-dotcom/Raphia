import { Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import ChildSwitcher from '../../components/ChildSwitcher';
import ScreenHeader from '../../components/ScreenHeader';
import { calculerAge, classerParAnnee } from '../../core/referential';
import type { RuleCategory, RuleTemplate } from '../../core/referential/types';
import { useActiveChild } from '../../data/activeChild';
import {
  ajouterHabitudeDepuisReferentiel,
  definirDefiBloquant,
  definirSeuilQuotidien,
  fetchSeuilInfo,
  retirerHabitudeActive,
} from '../../data/repositories/pilotageRepository';
import { fetchRuleTemplates } from '../../data/repositories/ruleTemplateRepository';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { colors, couleurCategorie } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const ORDRE_CATEGORIES: RuleCategory[] = ['autonomie', 'securite', 'social', 'scolaire', 'ecrans', 'emotions', 'organisation'];

type Mode = 'habitude' | 'defi';

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

  const [templates, setTemplates] = useState<RuleTemplate[] | null>(null);
  const [ageReel, setAgeReel] = useState<number | null>(null);
  const [ageAffiche, setAgeAffiche] = useState<number | null>(null);
  const [idsActifs, setIdsActifs] = useState<Map<string, ActiveInfo>>(new Map());
  const [defiActif, setDefiActif] = useState<{ ruleInstanceId: string; label: string; bloquant: boolean } | null>(
    null
  );
  const [auMaximum, setAuMaximum] = useState(false);
  const [mode, setMode] = useState<Mode>('habitude');
  const [filtreCategorie, setFiltreCategorie] = useState<RuleCategory | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [libelleEdite, setLibelleEdite] = useState('');
  const [bloquantEdite, setBloquantEdite] = useState(false);

  async function charger(childIdActuel: string) {
    setError(false);
    try {
      const [{ data: child, error: childError }, tous, { data: regles, error: reglesError }] = await Promise.all([
        supabase.from('child').select('birth_date').eq('id', childIdActuel).single(),
        fetchRuleTemplates(),
        supabase
          .from('rule_instance')
          .select('id, template_id, status, is_thematic, thematic_blocking, label')
          .eq('child_id', childIdActuel),
      ]);
      if (childError || !child) throw childError ?? new Error('child introuvable');
      if (reglesError) throw reglesError;

      const age = calculerAge(child.birth_date);
      setTemplates(tous);
      setAgeReel(age);
      setAgeAffiche((actuel) => actuel ?? age);

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

  function commencerEdition(template: RuleTemplate) {
    setEditionId(template.id);
    setLibelleEdite(template.label);
    setBloquantEdite(false);
  }

  function annulerEdition() {
    setEditionId(null);
    setLibelleEdite('');
    setBloquantEdite(false);
  }

  async function ajouter(template: RuleTemplate) {
    if (!childId) return;
    setBusyId(template.id);
    try {
      const ok = await ajouterHabitudeDepuisReferentiel(
        childId,
        template,
        mode === 'defi',
        libelleEdite,
        mode === 'defi' && bloquantEdite
      );
      if (ok) {
        setEditionId(null);
        setLibelleEdite('');
        setBloquantEdite(false);
        await charger(childId);
      } else {
        setAuMaximum(true);
      }
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

  async function retirer(ruleInstanceId: string) {
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

  function confirmerRetrait(ruleInstanceId: string) {
    if (!enfantActif) return;
    const message = remplir(strings['referentiel.removeConfirmBody'], { firstName: enfantActif.firstName });
    if (Platform.OS === 'web') {
      if (window.confirm(message)) retirer(ruleInstanceId);
      return;
    }
    Alert.alert(strings['referentiel.removeConfirmTitle'], message, [
      { text: strings['referentiel.removeCancelButton'], style: 'cancel' },
      { text: strings['referentiel.removeConfirmButton'], style: 'destructive', onPress: () => retirer(ruleInstanceId) },
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

  const bornesAge = (templates ?? []).reduce(
    (bornes, t) => ({ min: Math.min(bornes.min, t.ageMin), max: Math.max(bornes.max, t.ageMax) }),
    { min: 99, max: 0 }
  );

  const templatesFiltres = ageAffiche === null ? [] : classerParAnnee(templates ?? [], ageAffiche);
  const templatesParMode = mode === 'defi' ? templatesFiltres.filter((t) => t.isThematicEligible) : templatesFiltres;
  const templatesAffiches = filtreCategorie
    ? templatesParMode.filter((t) => t.category === filtreCategorie)
    : templatesParMode;

  const groupes = new Map<RuleCategory, RuleTemplate[]>();
  for (const template of templatesAffiches) {
    const liste = groupes.get(template.category) ?? [];
    liste.push(template);
    groupes.set(template.category, liste);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['referentiel.title']} accentColor={accent} />
      <ChildSwitcher />

      <View style={styles.body}>
        <Text style={styles.subtitle}>{strings['referentiel.subtitle']}</Text>
        <Text style={styles.effectiveTomorrow}>{strings['referentiel.effectiveTomorrow']}</Text>

        {error ? <Text style={styles.error}>{strings['referentiel.error']}</Text> : null}

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[accentStyles.modeSegment, mode === 'habitude' && accentStyles.modeSegmentActive]}
            onPress={() => {
              setMode('habitude');
              annulerEdition();
            }}
          >
            <Text style={[styles.modeLabel, mode === 'habitude' && styles.modeLabelActive]}>
              {strings['referentiel.modeHabitude']}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[accentStyles.modeSegment, mode === 'defi' && accentStyles.modeSegmentActive]}
            onPress={() => {
              setMode('defi');
              annulerEdition();
            }}
          >
            <Text style={[styles.modeLabel, mode === 'defi' && styles.modeLabelActive]}>
              {strings['referentiel.modeDefi']}
            </Text>
          </TouchableOpacity>
        </View>

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          <TouchableOpacity
            style={[accentStyles.categoryChip, !filtreCategorie && accentStyles.categoryChipActive]}
            onPress={() => setFiltreCategorie(null)}
          >
            <Text style={[styles.categoryChipLabel, !filtreCategorie && styles.categoryChipLabelActive]}>
              {strings['referentiel.categoryAll']}
            </Text>
          </TouchableOpacity>
          {ORDRE_CATEGORIES.map((categorie) => (
            <TouchableOpacity
              key={categorie}
              style={[accentStyles.categoryChip, filtreCategorie === categorie && accentStyles.categoryChipActive]}
              onPress={() => setFiltreCategorie(categorie)}
            >
              <Text style={[styles.categoryChipLabel, filtreCategorie === categorie && styles.categoryChipLabelActive]}>
                {strings[`category.${categorie}`] ?? categorie}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {mode === 'defi' && defiActif && enfantActif ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {remplir(strings['referentiel.defiAlreadySet'], { firstName: enfantActif.firstName, label: defiActif.label })}
            </Text>
            <Text style={styles.noticeSubtext}>{strings['referentiel.defiAlreadySetBody']}</Text>

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

            <TouchableOpacity
              onPress={() => confirmerRetrait(defiActif.ruleInstanceId)}
              disabled={busyId === defiActif.ruleInstanceId}
            >
              <Text style={[styles.removeLink, { marginTop: 6 }]}>{strings['referentiel.removeButton']}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {auMaximum ? <Text style={styles.notice}>{strings['pilotage.boardFull']}</Text> : null}
            {mode === 'defi' && templatesAffiches.length === 0 ? (
              <Text style={styles.notice}>{strings['referentiel.defiNoneEligible']}</Text>
            ) : null}

            {ORDRE_CATEGORIES.filter((categorie) => groupes.has(categorie)).map((categorie) => (
              <View key={categorie} style={styles.section}>
                <Text style={styles.sectionTitle}>{strings[`category.${categorie}`] ?? categorie}</Text>
                {(groupes.get(categorie) ?? []).map((template) => {
                  const info = idsActifs.get(template.id);
                  const enEdition = editionId === template.id;
                  return (
                    <View
                      key={template.id}
                      style={[
                        styles.item,
                        enEdition && styles.itemEditing,
                        { borderColor: couleurCategorie(template.category) },
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
                              onPress={() => ajouter(template)}
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
                          <Text style={styles.itemLabel}>{template.label}</Text>
                          {info ? (
                            <View style={styles.itemActiveWrap}>
                              <Text style={styles.activeBadge}>
                                {info.estThematique ? strings['referentiel.defiActiveBadge'] : strings['referentiel.alreadyActive']}
                              </Text>
                              <TouchableOpacity
                                onPress={() => confirmerRetrait(info.ruleInstanceId)}
                                disabled={busyId === info.ruleInstanceId}
                              >
                                <Text style={styles.removeLink}>{strings['referentiel.removeButton']}</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[accentStyles.addButton, auMaximum && styles.addButtonDisabled]}
                              onPress={() => commencerEdition(template)}
                              disabled={auMaximum}
                            >
                              <Text style={[accentStyles.addButtonText, auMaximum && styles.addButtonTextDisabled]}>
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
    modeSegmentActive: {
      backgroundColor: accent,
    },
    categoryChip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 100,
      paddingHorizontal: 14,
      paddingVertical: 8,
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
    gap: 10,
  },
  modeLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  modeLabelActive: {
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
  noticeSubtext: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkMuted,
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
  removeLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.danger,
  },
  addButtonDisabled: {
    borderColor: colors.border,
  },
  addButtonTextDisabled: {
    color: colors.inkMuted,
  },
});
