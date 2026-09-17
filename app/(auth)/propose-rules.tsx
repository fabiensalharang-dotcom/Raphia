import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { calculerAge, classerParAnnee, proposerReglesInitiales } from '../../core/referential';
import type { RuleTemplate } from '../../core/referential/types';
import { fetchRuleTemplates } from '../../data/repositories/ruleTemplateRepository';
import { supabase } from '../../data/supabaseClient';
import { enregistrerEvenement } from '../../data/telemetry';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, couleurCategorie } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const MAX_REGLES_ACTIVES = 6;

type Slot = {
  templateId: string;
  label: string;
  shortLabel: string;
  icon: string;
  category: RuleTemplate['category'];
  points: number;
  isThematic: boolean;
};

function slotFromTemplate(template: RuleTemplate, isThematic: boolean): Slot {
  return {
    templateId: template.id,
    label: template.label,
    shortLabel: template.shortLabel,
    icon: template.icon,
    category: template.category,
    points: template.defaultPoints,
    isThematic,
  };
}

export default function ProposeRules() {
  const onboarding = useOnboardingState();
  const params = useLocalSearchParams<{ childId?: string; householdId?: string }>();
  // §1.2 « Multi-enfant » : un enfant supplémentaire arrive ici avec son id
  // et celui du foyer en paramètre de route, plutôt que via la machine à
  // états de l'inscription (qui ne connaît que le tout premier enfant).
  const modeAjoutSupplementaire = typeof params.childId === 'string' && typeof params.householdId === 'string';
  const [candidats, setCandidats] = useState<RuleTemplate[] | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [showAddList, setShowAddList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [proposesInitialement, setProposesInitialement] = useState<string[]>([]);
  const [ageEnfant, setAgeEnfant] = useState<number | undefined>(undefined);

  const childId = modeAjoutSupplementaire
    ? (params.childId as string)
    : onboarding.status === 'needs-rules'
      ? onboarding.childId
      : null;
  const householdId = modeAjoutSupplementaire
    ? (params.householdId as string)
    : onboarding.status === 'needs-rules'
      ? onboarding.householdId
      : null;

  useEffect(() => {
    if (!childId) return;

    let cancelled = false;

    async function load() {
      const [{ data: child, error: childError }, templates] = await Promise.all([
        supabase.from('child').select('birth_date').eq('id', childId as string).single(),
        fetchRuleTemplates(),
      ]);
      if (cancelled) return;
      if (childError || !child) {
        setError(strings['onboarding.proposeRules.error']);
        return;
      }

      const age = calculerAge(child.birth_date);
      const classees = classerParAnnee(templates, age);
      const { thematique, standard } = proposerReglesInitiales(classees);

      const slotsInitiaux = [
        ...(thematique ? [slotFromTemplate(thematique, true)] : []),
        ...standard.map((regle) => slotFromTemplate(regle, false)),
      ];

      setCandidats(classees);
      setSlots(slotsInitiaux);
      setProposesInitialement(slotsInitiaux.map((slot) => slot.templateId));
      setAgeEnfant(age);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  if (onboarding.status === 'signed-out') {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (!modeAjoutSupplementaire) {
    if (onboarding.status === 'needs-consent') {
      return <Redirect href="/(auth)/consent" />;
    }
    if (
      onboarding.status === 'needs-child' ||
      onboarding.status === 'needs-rewards' ||
      onboarding.status === 'needs-threshold' ||
      onboarding.status === 'ready'
    ) {
      return <Redirect href="/" />;
    }
  }

  function retirer(templateId: string) {
    setSlots((precedents) => precedents.filter((slot) => slot.templateId !== templateId));
  }

  function modifierLibelle(templateId: string, label: string) {
    setSlots((precedents) =>
      precedents.map((slot) => (slot.templateId === templateId ? { ...slot, label } : slot))
    );
  }

  function ajouter(template: RuleTemplate) {
    setSlots((precedents) => [...precedents, slotFromTemplate(template, false)]);
    setShowAddList(false);
  }

  async function handleSubmit() {
    if (!childId || !householdId) return;

    setError(null);
    setSubmitting(true);
    const { error: insertError } = await supabase.from('rule_instance').insert(
      slots.map((slot, index) => ({
        child_id: childId,
        template_id: slot.templateId,
        label: slot.label,
        short_label: slot.shortLabel,
        icon: slot.icon,
        category: slot.category,
        points: slot.points,
        is_thematic: slot.isThematic,
        display_order: index,
      }))
    );
    setSubmitting(false);
    if (insertError) {
      setError(strings['onboarding.proposeRules.error']);
      return;
    }

    const idsRetenus = slots.map((slot) => slot.templateId);
    for (const templateId of proposesInitialement) {
      enregistrerEvenement(
        householdId,
        idsRetenus.includes(templateId) ? 'rule_kept' : 'rule_discarded',
        { templateId },
        ageEnfant
      );
    }

    if (modeAjoutSupplementaire) {
      router.replace(`/(auth)/propose-rewards?childId=${childId}&householdId=${householdId}`);
    } else {
      router.replace('/');
    }
  }

  const idsUtilises = slots.map((slot) => slot.templateId);
  const disponibles = (candidats ?? []).filter((regle) => !idsUtilises.includes(regle.id));
  const auMaximum = slots.length >= MAX_REGLES_ACTIVES;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['onboarding.proposeRules.title']} />

      <View style={styles.body}>
        {slots.map((slot) => (
          <View key={slot.templateId} style={[styles.slot, { borderLeftColor: couleurCategorie(slot.category) }]}>
            {slot.isThematic && <Text style={styles.badge}>{strings['onboarding.proposeRules.thematicBadge']}</Text>}
            <TextInput
              style={styles.slotInput}
              value={slot.label}
              onChangeText={(text) => modifierLibelle(slot.templateId, text)}
              accessibilityLabel={strings['onboarding.proposeRules.editLabel']}
              multiline
            />
            <TouchableOpacity onPress={() => retirer(slot.templateId)} style={styles.removeButton}>
              <Text style={styles.removeLink}>{strings['onboarding.proposeRules.remove']}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {auMaximum ? (
          <Text style={styles.maxReached}>{strings['onboarding.proposeRules.maxReached']}</Text>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddList((v) => !v)}>
            <Text style={styles.addButtonText}>{strings['onboarding.proposeRules.addButton']}</Text>
          </TouchableOpacity>
        )}

        {showAddList && !auMaximum && (
          <View style={styles.addList}>
            <Text style={styles.addListTitle}>{strings['onboarding.proposeRules.addTitle']}</Text>
            {disponibles.length === 0 ? (
              <Text style={styles.addEmpty}>{strings['onboarding.proposeRules.addEmpty']}</Text>
            ) : (
              disponibles.map((regle) => (
                <TouchableOpacity key={regle.id} style={styles.addItem} onPress={() => ajouter(regle)}>
                  <Text style={styles.addItemLabel}>{regle.label}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.buttonText}>{strings['onboarding.proposeRules.submit']}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  body: {
    padding: 22,
    gap: 14,
  },
  slot: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderLeftWidth: 5,
    padding: 14,
    gap: 6,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  slotInput: {
    paddingVertical: 4,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
  },
  removeButton: {
    alignSelf: 'flex-end',
  },
  badge: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  removeLink: {
    color: colors.danger,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  addButton: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 100,
    padding: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
  },
  maxReached: {
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    color: colors.inkMuted,
  },
  addList: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    gap: 8,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  addListTitle: {
    fontFamily: fonts.cursive,
    fontSize: 17,
    color: colors.ink,
  },
  addItem: {
    paddingVertical: 8,
  },
  addItemLabel: {
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
  },
  addEmpty: {
    fontFamily: fonts.bodyMedium,
    color: colors.inkMuted,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 100,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.bodyMedium,
  },
});
