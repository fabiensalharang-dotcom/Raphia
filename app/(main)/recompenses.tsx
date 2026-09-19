import { Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import ChildSwitcher from '../../components/ChildSwitcher';
import ScreenHeader from '../../components/ScreenHeader';
import { calculerAge } from '../../core/referential';
import type { RewardCategory, RewardTemplate, RewardTier } from '../../core/rewards/types';
import { useActiveChild } from '../../data/activeChild';
import {
  ajouterRecompenseAuMenu,
  definirDisponibiliteRecompense,
  fetchMenuStatus,
  type MenuInfo,
} from '../../data/repositories/rewardMenuRepository';
import { fetchRewardTemplates } from '../../data/repositories/rewardTemplateRepository';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const ORDRE_CATEGORIES: RewardCategory[] = ['relationnelle', 'privilege', 'temps', 'materielle'];
const ORDRE_TIERS: RewardTier[] = ['daily', 'weekly'];

const LIBELLE_CATEGORIE: Record<RewardCategory, string> = {
  relationnelle: strings['recompenses.categoryRelationnelle'],
  privilege: strings['recompenses.categoryPrivilege'],
  temps: strings['recompenses.categoryTemps'],
  materielle: strings['recompenses.categoryMaterielle'],
};

const TITRE_TIER: Record<RewardTier, string> = {
  daily: strings['recompenses.dailyTitle'],
  weekly: strings['recompenses.weeklyTitle'],
};

function remplir(gabarit: string, slots: Record<string, unknown>): string {
  return gabarit.replace(/\{(\w+)\}/g, (_, nom: string) => String(slots[nom] ?? ''));
}

export default function Recompenses() {
  const onboarding = useOnboardingState();
  const { activeChildId: childId, activeAccent } = useActiveChild();
  const accent = activeAccent.accent;
  const accentStyles = useMemo(() => makeAccentStyles(accent), [accent]);

  const [templates, setTemplates] = useState<RewardTemplate[] | null>(null);
  const [ageReel, setAgeReel] = useState<number | null>(null);
  const [ageAffiche, setAgeAffiche] = useState<number | null>(null);
  const [statutMenu, setStatutMenu] = useState<Map<string, MenuInfo>>(new Map());
  const [filtreCategorie, setFiltreCategorie] = useState<RewardCategory | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [libelleEdite, setLibelleEdite] = useState('');

  async function charger(childIdActuel: string) {
    setError(false);
    try {
      const [{ data: child, error: childError }, tous, statut] = await Promise.all([
        supabase.from('child').select('birth_date').eq('id', childIdActuel).single(),
        fetchRewardTemplates(),
        fetchMenuStatus(childIdActuel),
      ]);
      if (childError || !child) throw childError ?? new Error('child introuvable');

      const age = calculerAge(child.birth_date);
      setTemplates(tous);
      setAgeReel(age);
      setAgeAffiche((actuel) => actuel ?? age);
      setStatutMenu(statut);
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

  function commencerEdition(template: RewardTemplate) {
    setEditionId(template.id);
    setLibelleEdite(template.label);
  }

  function annulerEdition() {
    setEditionId(null);
    setLibelleEdite('');
  }

  async function ajouter(template: RewardTemplate) {
    if (!childId) return;
    setBusyId(template.id);
    try {
      await ajouterRecompenseAuMenu(childId, template, libelleEdite);
      setEditionId(null);
      setLibelleEdite('');
      await charger(childId);
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  async function basculerDisponibilite(rewardInstanceId: string, disponible: boolean) {
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

  const bornesAge = (templates ?? []).reduce(
    (bornes, t) => ({ min: Math.min(bornes.min, t.ageMin), max: Math.max(bornes.max, t.ageMax) }),
    { min: 99, max: 0 }
  );

  const templatesFiltres = (templates ?? []).filter(
    (t) => ageAffiche !== null && t.ageMin <= ageAffiche && ageAffiche <= t.ageMax
  );
  const templatesAffiches = filtreCategorie
    ? templatesFiltres.filter((t) => t.category === filtreCategorie)
    : templatesFiltres;

  const groupes = new Map<RewardTier, RewardTemplate[]>();
  for (const template of templatesAffiches) {
    const liste = groupes.get(template.tier) ?? [];
    liste.push(template);
    groupes.set(template.tier, liste);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['recompenses.title']} accentColor={accent} />
      <ChildSwitcher />

      <View style={styles.body}>
        <Text style={styles.subtitle}>{strings['recompenses.subtitle']}</Text>

        {error ? <Text style={styles.error}>{strings['recompenses.error']}</Text> : null}

        {ageAffiche !== null && (
          <View style={styles.ageRow}>
            <TouchableOpacity
              style={[styles.ageStepper, ageAffiche <= bornesAge.min && styles.ageStepperDisabled]}
              onPress={() => setAgeAffiche((a) => Math.max(bornesAge.min, (a ?? bornesAge.min) - 1))}
              disabled={ageAffiche <= bornesAge.min}
            >
              <Text style={styles.ageStepperLabel}>–</Text>
            </TouchableOpacity>
            <Text style={styles.ageLabel}>{remplir(strings['recompenses.ageLabel'], { age: ageAffiche })}</Text>
            <TouchableOpacity
              style={[styles.ageStepper, ageAffiche >= bornesAge.max && styles.ageStepperDisabled]}
              onPress={() => setAgeAffiche((a) => Math.min(bornesAge.max, (a ?? bornesAge.max) + 1))}
              disabled={ageAffiche >= bornesAge.max}
            >
              <Text style={styles.ageStepperLabel}>+</Text>
            </TouchableOpacity>
            {ageReel !== null && ageAffiche !== ageReel && (
              <TouchableOpacity onPress={() => setAgeAffiche(ageReel)}>
                <Text style={[styles.ageReset, { color: accent }]}>{strings['recompenses.ageReset']}</Text>
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
              {strings['recompenses.categoryAll']}
            </Text>
          </TouchableOpacity>
          {ORDRE_CATEGORIES.map((categorie) => (
            <TouchableOpacity
              key={categorie}
              style={[accentStyles.categoryChip, filtreCategorie === categorie && accentStyles.categoryChipActive]}
              onPress={() => setFiltreCategorie(categorie)}
            >
              <Text style={[styles.categoryChipLabel, filtreCategorie === categorie && styles.categoryChipLabelActive]}>
                {LIBELLE_CATEGORIE[categorie]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {ORDRE_TIERS.filter((tier) => groupes.has(tier)).map((tier) => (
          <View key={tier} style={styles.section}>
            <Text style={styles.sectionTitle}>{TITRE_TIER[tier]}</Text>
            {(groupes.get(tier) ?? []).map((template) => {
              const info = statutMenu.get(template.id);
              const enEdition = editionId === template.id;
              return (
                <View key={template.id} style={[styles.item, enEdition && styles.itemEditing]}>
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
                          onPress={() => ajouter(template)}
                          disabled={!libelleEdite.trim() || busyId === template.id}
                        >
                          <Text style={accentStyles.addButtonText}>{strings['recompenses.addButton']}</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.itemTextWrap}>
                        <Text style={styles.itemLabel}>{template.label}</Text>
                        <Text style={styles.itemCategory}>{LIBELLE_CATEGORIE[template.category]}</Text>
                      </View>
                      {info ? (
                        <View style={styles.itemActiveWrap}>
                          <Text style={styles.activeBadge}>
                            {info.isAvailable ? strings['recompenses.onMenu'] : strings['recompenses.removedFromMenu']}
                          </Text>
                          <TouchableOpacity
                            onPress={() => basculerDisponibilite(info.rewardInstanceId, !info.isAvailable)}
                            disabled={busyId === info.rewardInstanceId}
                          >
                            <Text style={info.isAvailable ? styles.removeLink : accentStyles.restoreLink}>
                              {info.isAvailable ? strings['recompenses.removeButton'] : strings['recompenses.restoreButton']}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={accentStyles.addButton} onPress={() => commencerEdition(template)}>
                          <Text style={accentStyles.addButtonText}>{strings['recompenses.addButton']}</Text>
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
    </ScrollView>
  );
}

function makeAccentStyles(accent: string) {
  return StyleSheet.create({
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
    restoreLink: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: accent,
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
  error: {
    color: colors.danger,
    fontFamily: fonts.bodyMedium,
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
    padding: 14,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  itemEditing: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  itemTextWrap: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  itemCategory: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  itemActiveWrap: {
    alignItems: 'flex-end',
    gap: 2,
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
});
