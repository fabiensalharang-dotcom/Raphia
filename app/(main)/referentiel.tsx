import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ScreenHeader from '../../components/ScreenHeader';
import { calculerAge, classerParAnnee } from '../../core/referential';
import type { RuleCategory, RuleTemplate } from '../../core/referential/types';
import { useActiveChild } from '../../data/activeChild';
import { ajouterHabitudeDepuisReferentiel } from '../../data/repositories/pilotageRepository';
import { fetchRuleTemplates } from '../../data/repositories/ruleTemplateRepository';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { accentColorsFor } from '../../theme/accentPalette';
import { colors, couleurCategorie } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const ORDRE_CATEGORIES: RuleCategory[] = ['autonomie', 'securite', 'social', 'scolaire', 'ecrans', 'emotions', 'organisation'];

export default function Referentiel() {
  const onboarding = useOnboardingState();
  const params = useLocalSearchParams<{ childId?: string }>();
  const childId = typeof params.childId === 'string' ? params.childId : null;
  const { children: enfantsFoyer } = useActiveChild();
  const accent = accentColorsFor(enfantsFoyer.find((c) => c.id === childId)?.themeColor).accent;
  const accentStyles = useMemo(() => makeAccentStyles(accent), [accent]);

  const [templates, setTemplates] = useState<RuleTemplate[] | null>(null);
  const [idsActifs, setIdsActifs] = useState<Set<string>>(new Set());
  const [auMaximum, setAuMaximum] = useState(false);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function charger() {
    if (!childId) return;
    setError(false);
    try {
      const [{ data: child, error: childError }, tous, { data: regles, error: reglesError }] = await Promise.all([
        supabase.from('child').select('birth_date').eq('id', childId).single(),
        fetchRuleTemplates(),
        supabase.from('rule_instance').select('template_id, status').eq('child_id', childId),
      ]);
      if (childError || !child) throw childError ?? new Error('child introuvable');
      if (reglesError) throw reglesError;

      const age = calculerAge(child.birth_date);
      setTemplates(classerParAnnee(tous, age));

      const actives = (regles ?? []).filter((r) => r.status === 'active');
      setIdsActifs(new Set(actives.filter((r) => r.template_id).map((r) => r.template_id as string)));
      setAuMaximum(actives.length >= 6);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  if (onboarding.status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (onboarding.status !== 'ready') {
    return <Redirect href="/" />;
  }

  async function ajouter(template: RuleTemplate) {
    if (!childId) return;
    setBusyId(template.id);
    try {
      const ok = await ajouterHabitudeDepuisReferentiel(childId, template);
      if (ok) {
        await charger();
      } else {
        setAuMaximum(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  const groupes = new Map<RuleCategory, RuleTemplate[]>();
  for (const template of templates ?? []) {
    const liste = groupes.get(template.category) ?? [];
    liste.push(template);
    groupes.set(template.category, liste);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['referentiel.title']} accentColor={accent} />

      <View style={styles.body}>
        <Text style={styles.subtitle}>{strings['referentiel.subtitle']}</Text>

        {error ? <Text style={styles.error}>{strings['referentiel.error']}</Text> : null}
        {auMaximum ? <Text style={styles.notice}>{strings['pilotage.boardFull']}</Text> : null}

        {ORDRE_CATEGORIES.filter((categorie) => groupes.has(categorie)).map((categorie) => (
          <View key={categorie} style={styles.section}>
            <Text style={styles.sectionTitle}>{strings[`category.${categorie}`] ?? categorie}</Text>
            {(groupes.get(categorie) ?? []).map((template) => {
              const active = idsActifs.has(template.id);
              return (
                <View key={template.id} style={[styles.item, { borderLeftColor: couleurCategorie(template.category) }]}>
                  <Text style={styles.itemLabel}>{template.label}</Text>
                  {active ? (
                    <Text style={styles.activeBadge}>{strings['referentiel.alreadyActive']}</Text>
                  ) : (
                    <TouchableOpacity
                      style={[accentStyles.addButton, auMaximum && styles.addButtonDisabled]}
                      onPress={() => ajouter(template)}
                      disabled={auMaximum || busyId === template.id}
                    >
                      <Text style={[accentStyles.addButtonText, auMaximum && styles.addButtonTextDisabled]}>
                        {strings['referentiel.add']}
                      </Text>
                    </TouchableOpacity>
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
  });
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  body: {
    padding: 22,
    gap: 18,
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
  notice: {
    color: colors.inkMuted,
    fontFamily: fonts.bodyMedium,
    textAlign: 'center',
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
    borderLeftWidth: 5,
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
  activeBadge: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.inkMuted,
  },
  addButtonDisabled: {
    borderColor: colors.border,
  },
  addButtonTextDisabled: {
    color: colors.inkMuted,
  },
});
