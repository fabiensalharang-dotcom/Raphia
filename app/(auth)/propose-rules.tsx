import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { calculerAge, classerParAnnee, proposerReglesInitiales } from '../../core/referential';
import type { RuleTemplate } from '../../core/referential/types';
import { fetchRuleTemplates } from '../../data/repositories/ruleTemplateRepository';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';

const MAX_REGLES_ACTIVES = 6;

type Slot = {
  templateId: string;
  label: string;
  shortLabel: string;
  icon: string;
  points: number;
  isThematic: boolean;
};

function slotFromTemplate(template: RuleTemplate, isThematic: boolean): Slot {
  return {
    templateId: template.id,
    label: template.label,
    shortLabel: template.shortLabel,
    icon: template.icon,
    points: template.defaultPoints,
    isThematic,
  };
}

export default function ProposeRules() {
  const onboarding = useOnboardingState();
  const [candidats, setCandidats] = useState<RuleTemplate[] | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [showAddList, setShowAddList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const childId = onboarding.status === 'needs-rules' ? onboarding.childId : null;

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

      setCandidats(classees);
      setSlots([
        ...(thematique ? [slotFromTemplate(thematique, true)] : []),
        ...standard.map((regle) => slotFromTemplate(regle, false)),
      ]);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  if (onboarding.status === 'signed-out') {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (onboarding.status === 'needs-consent') {
    return <Redirect href="/(auth)/consent" />;
  }
  if (
    onboarding.status === 'needs-child' ||
    onboarding.status === 'needs-threshold' ||
    onboarding.status === 'ready'
  ) {
    return <Redirect href="/" />;
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
    if (onboarding.status !== 'needs-rules') return;

    setError(null);
    setSubmitting(true);
    const { error: insertError } = await supabase.from('rule_instance').insert(
      slots.map((slot, index) => ({
        child_id: onboarding.childId,
        template_id: slot.templateId,
        label: slot.label,
        short_label: slot.shortLabel,
        icon: slot.icon,
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
    router.replace('/');
  }

  const idsUtilises = slots.map((slot) => slot.templateId);
  const disponibles = (candidats ?? []).filter((regle) => !idsUtilises.includes(regle.id));
  const auMaximum = slots.length >= MAX_REGLES_ACTIVES;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{strings['onboarding.proposeRules.title']}</Text>

      {slots.map((slot) => (
        <View key={slot.templateId} style={styles.slot}>
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
            <Text>{strings['onboarding.proposeRules.addEmpty']}</Text>
          ) : (
            disponibles.map((regle) => (
              <TouchableOpacity key={regle.id} style={styles.addItem} onPress={() => ajouter(regle)}>
                <Text>{regle.label}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{strings['onboarding.proposeRules.submit']}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  slot: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  slotInput: {
    paddingVertical: 4,
  },
  removeButton: {
    alignSelf: 'flex-end',
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#208AEF',
  },
  removeLink: {
    color: '#B00020',
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#208AEF',
    fontWeight: '600',
  },
  maxReached: {
    textAlign: 'center',
    color: '#444',
  },
  addList: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  addListTitle: {
    fontWeight: '600',
  },
  addItem: {
    paddingVertical: 8,
  },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#B00020',
  },
});
