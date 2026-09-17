import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import ScreenHeader from '../../components/ScreenHeader';
import type { RuleTemplate } from '../../core/referential';
import {
  accepterRegleAcquise,
  ajouterRecompensesApresUsure,
  ajouterRegleChoisie,
  ajusterSeuilQuotidien,
  decouperRegleEnEchec,
  dismisserSuggestion,
  fetchCandidatsNouvelleRegle,
  fetchRecompenseInfo,
  fetchReglesActives,
  fetchSuggestionsEnAttente,
  mettreRegleEnRetrait,
  reformulerRegle,
  type RecompenseInfo,
  type RegleActiveOption,
  type SuggestionView,
} from '../../data/repositories/pilotageRepository';
import { fetchRuleTemplates } from '../../data/repositories/ruleTemplateRepository';
import { supabase } from '../../data/supabaseClient';
import { enregistrerEvenement, filtrerTexteIdentifiant } from '../../data/telemetry';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

type CarteProps = {
  suggestion: SuggestionView;
  childId: string;
  householdId: string;
  prenomEnfant: string;
  onResolved: () => void;
};

export default function Pilotage() {
  const onboarding = useOnboardingState();
  const childId = onboarding.status === 'ready' ? onboarding.childId : null;
  const householdId = onboarding.status === 'ready' ? onboarding.householdId : null;
  const [suggestions, setSuggestions] = useState<SuggestionView[] | null>(null);
  const [prenomEnfant, setPrenomEnfant] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;
    fetchSuggestionsEnAttente(childId).then(
      (result) => {
        if (!cancelled) setSuggestions(result);
      },
      () => {
        if (!cancelled) setError(true);
      }
    );
    supabase
      .from('child')
      .select('first_name')
      .eq('id', childId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setPrenomEnfant(data.first_name);
      });
    return () => {
      cancelled = true;
    };
  }, [childId]);

  function retirerSuggestion(id: string) {
    setSuggestions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
  }

  if (onboarding.status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (onboarding.status !== 'ready') {
    return <Redirect href="/" />;
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['pilotage.title']} />

      <View style={styles.body}>
        {error ? <Text style={styles.error}>{strings['pilotage.error']}</Text> : null}
        {suggestions && suggestions.length === 0 ? <Text style={styles.empty}>{strings['pilotage.empty']}</Text> : null}

        {suggestions?.map((suggestion) => (
          <CarteSuggestion
            key={suggestion.id}
            suggestion={suggestion}
            childId={childId as string}
            householdId={householdId as string}
            prenomEnfant={prenomEnfant}
            onResolved={() => retirerSuggestion(suggestion.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function CarteSuggestion(props: CarteProps) {
  const { suggestion } = props;
  switch (suggestion.type) {
    case 'rule_acquired':
      return <CarteRegleAcquise {...props} />;
    case 'rule_failing':
      return <CarteRegleEnEchec {...props} />;
    case 'reward_fatigue':
      return <CarteRecompenseUsee {...props} />;
    case 'threshold_high':
      return <CarteSeuil {...props} sens="haut" />;
    case 'threshold_low':
      return <CarteSeuil {...props} sens="bas" />;
    case 'age_change':
      return <CarteChangementAge {...props} />;
    default:
      return null;
  }
}

function CarteRegleAcquise({ suggestion, childId, householdId, onResolved }: CarteProps) {
  const ruleInstanceId = suggestion.payload.ruleInstanceId as string;
  const label = suggestion.payload.label as string;
  const [busy, setBusy] = useState(false);

  async function marquer() {
    setBusy(true);
    await accepterRegleAcquise(suggestion.id, childId, ruleInstanceId);
    enregistrerEvenement(householdId, 'suggestion_accepted', { suggestionType: suggestion.type, action: 'mark_acquired' });
    onResolved();
  }
  async function garder() {
    setBusy(true);
    await dismisserSuggestion(suggestion.id);
    enregistrerEvenement(householdId, 'suggestion_dismissed', { suggestionType: suggestion.type, action: 'keep_going' });
    onResolved();
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardText}>
        « {label} » {strings['pilotage.ruleAcquiredIntro']}
      </Text>
      <Text style={styles.cardBody}>{strings['pilotage.ruleAcquiredBody']}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionPrimary} onPress={marquer} disabled={busy}>
          <Text style={styles.actionPrimaryLabel}>{strings['pilotage.markAcquired']}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionSecondary} onPress={garder} disabled={busy}>
          <Text style={styles.actionSecondaryLabel}>{strings['pilotage.keepGoing']}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CarteRegleEnEchec({ suggestion, childId, householdId, prenomEnfant, onResolved }: CarteProps) {
  const ruleInstanceId = suggestion.payload.ruleInstanceId as string;
  const label = suggestion.payload.label as string;
  const splitInto = (suggestion.payload.splitInto as string[] | undefined) ?? [];
  const [candidats, setCandidats] = useState<RuleTemplate[] | null>(null);
  const [mode, setMode] = useState<'menu' | 'reformuler'>('menu');
  const [nouveauLabel, setNouveauLabel] = useState(label);
  const [nouveauShortLabel, setNouveauShortLabel] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (splitInto.length === 0) return;
    let cancelled = false;
    fetchRuleTemplates().then((templates) => {
      if (!cancelled) setCandidats(templates.filter((t) => splitInto.includes(t.id)));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function decouper(templateId: string) {
    setBusy(true);
    await decouperRegleEnEchec(suggestion.id, childId, ruleInstanceId, templateId);
    enregistrerEvenement(householdId, 'suggestion_accepted', { suggestionType: suggestion.type, action: 'split' });
    onResolved();
  }
  async function enregistrerReformulation() {
    if (!nouveauLabel.trim()) return;
    setBusy(true);
    const courte = nouveauShortLabel.trim() || nouveauLabel.trim().slice(0, 28);
    await reformulerRegle(suggestion.id, ruleInstanceId, nouveauLabel.trim(), courte);
    enregistrerEvenement(householdId, 'suggestion_accepted', { suggestionType: suggestion.type, action: 'rewrite' });
    enregistrerEvenement(householdId, 'rule_relabeled', {
      before: filtrerTexteIdentifiant(label, prenomEnfant),
      after: filtrerTexteIdentifiant(nouveauLabel.trim(), prenomEnfant),
    });
    onResolved();
  }
  async function mettreEnPause() {
    setBusy(true);
    await mettreRegleEnRetrait(suggestion.id, ruleInstanceId);
    enregistrerEvenement(householdId, 'suggestion_accepted', { suggestionType: suggestion.type, action: 'pause' });
    onResolved();
  }
  async function ecarter() {
    setBusy(true);
    await dismisserSuggestion(suggestion.id);
    enregistrerEvenement(householdId, 'suggestion_dismissed', { suggestionType: suggestion.type });
    onResolved();
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardText}>
        « {label} » {strings['pilotage.ruleFailingIntro']}
      </Text>
      <Text style={styles.cardBody}>{strings['pilotage.ruleFailingBody']}</Text>

      {mode === 'menu' ? (
        <View style={styles.actions}>
          {candidats?.map((candidat) => (
            <TouchableOpacity
              key={candidat.id}
              style={styles.actionPrimary}
              onPress={() => decouper(candidat.id)}
              disabled={busy}
            >
              <Text style={styles.actionPrimaryLabel}>
                {strings['pilotage.splitRule']} : {candidat.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.actionSecondary} onPress={() => setMode('reformuler')} disabled={busy}>
            <Text style={styles.actionSecondaryLabel}>{strings['pilotage.rewriteRule']}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionSecondary} onPress={mettreEnPause} disabled={busy}>
            <Text style={styles.actionSecondaryLabel}>{strings['pilotage.pauseRule']}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={ecarter} disabled={busy}>
            <Text style={styles.dismissLabel}>{strings['pilotage.dismiss']}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actions}>
          <TextInput
            style={styles.input}
            value={nouveauLabel}
            onChangeText={setNouveauLabel}
            placeholder={strings['pilotage.rewritePlaceholder']}
          />
          <TextInput
            style={styles.input}
            value={nouveauShortLabel}
            onChangeText={setNouveauShortLabel}
            placeholder={strings['pilotage.rewriteShortPlaceholder']}
            maxLength={28}
          />
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionPrimary} onPress={enregistrerReformulation} disabled={busy}>
              <Text style={styles.actionPrimaryLabel}>{strings['pilotage.rewriteSave']}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSecondary} onPress={() => setMode('menu')} disabled={busy}>
              <Text style={styles.actionSecondaryLabel}>{strings['pilotage.rewriteCancel']}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function CarteRecompenseUsee({ suggestion, childId, householdId, onResolved }: CarteProps) {
  const rewardInstanceId = suggestion.payload.rewardInstanceId as string | null;
  const [info, setInfo] = useState<RecompenseInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!rewardInstanceId) return;
    let cancelled = false;
    fetchRecompenseInfo(rewardInstanceId).then((result) => {
      if (!cancelled) setInfo(result);
    });
    return () => {
      cancelled = true;
    };
  }, [rewardInstanceId]);

  async function ajouter() {
    setBusy(true);
    await ajouterRecompensesApresUsure(suggestion.id, childId, info?.tier ?? 'daily');
    enregistrerEvenement(householdId, 'suggestion_accepted', { suggestionType: suggestion.type, action: 'add_rewards' });
    onResolved();
  }
  async function toutVaBien() {
    setBusy(true);
    await dismisserSuggestion(suggestion.id);
    enregistrerEvenement(householdId, 'suggestion_dismissed', { suggestionType: suggestion.type, action: 'all_good' });
    onResolved();
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardText}>
        {info
          ? `« ${info.label} » ${strings['pilotage.rewardFatigueIntroKnown']}`
          : strings['pilotage.rewardFatigueIntroUnknown']}
      </Text>
      <Text style={styles.cardBody}>{strings['pilotage.rewardFatigueBody']}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionPrimary} onPress={ajouter} disabled={busy}>
          <Text style={styles.actionPrimaryLabel}>{strings['pilotage.addRewards']}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionSecondary} onPress={toutVaBien} disabled={busy}>
          <Text style={styles.actionSecondaryLabel}>{strings['pilotage.allGood']}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CarteSeuil({ suggestion, childId, householdId, onResolved, sens }: CarteProps & { sens: 'haut' | 'bas' }) {
  const [candidat, setCandidat] = useState<RuleTemplate[] | null>(null);
  const [reglesActives, setReglesActives] = useState<RegleActiveOption[] | null>(null);
  const [choisirRegleARetirer, setChoisirRegleARetirer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tableauComplet, setTableauComplet] = useState(false);

  useEffect(() => {
    if (sens !== 'haut') return;
    let cancelled = false;
    fetchCandidatsNouvelleRegle(childId, 1).then((result) => {
      if (!cancelled) setCandidat(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ajusterSeuil() {
    setBusy(true);
    await ajusterSeuilQuotidien(suggestion.id, childId, sens === 'haut' ? 1 : -1);
    enregistrerEvenement(householdId, 'suggestion_accepted', { suggestionType: suggestion.type, action: 'adjust_threshold' });
    onResolved();
  }
  async function ajouterRegle(template: RuleTemplate) {
    setBusy(true);
    const ok = await ajouterRegleChoisie(suggestion.id, childId, template);
    if (ok) {
      enregistrerEvenement(householdId, 'suggestion_accepted', { suggestionType: suggestion.type, action: 'add_rule' });
      onResolved();
    } else {
      setBusy(false);
      setTableauComplet(true);
    }
  }
  async function ouvrirChoixRetrait() {
    const regles = await fetchReglesActives(childId);
    setReglesActives(regles);
    setChoisirRegleARetirer(true);
  }
  async function retirer(ruleInstanceId: string) {
    setBusy(true);
    await mettreRegleEnRetrait(suggestion.id, ruleInstanceId);
    enregistrerEvenement(householdId, 'suggestion_accepted', { suggestionType: suggestion.type, action: 'remove_rule' });
    onResolved();
  }
  async function ecarter() {
    setBusy(true);
    await dismisserSuggestion(suggestion.id);
    enregistrerEvenement(householdId, 'suggestion_dismissed', { suggestionType: suggestion.type });
    onResolved();
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardBody}>
        {sens === 'haut' ? strings['pilotage.thresholdHighBody'] : strings['pilotage.thresholdLowBody']}
      </Text>

      {sens === 'haut' ? (
        <View style={styles.actions}>
          {tableauComplet ? (
            <Text style={styles.cardBody}>{strings['pilotage.boardFull']}</Text>
          ) : candidat && candidat.length > 0 ? (
            <TouchableOpacity style={styles.actionPrimary} onPress={() => ajouterRegle(candidat[0])} disabled={busy}>
              <Text style={styles.actionPrimaryLabel}>
                {strings['pilotage.addRule']} : {candidat[0].label}
              </Text>
            </TouchableOpacity>
          ) : candidat ? (
            <Text style={styles.cardBody}>{strings['pilotage.noCandidateRule']}</Text>
          ) : null}
          <TouchableOpacity style={styles.actionSecondary} onPress={ajusterSeuil} disabled={busy}>
            <Text style={styles.actionSecondaryLabel}>{strings['pilotage.raiseThreshold']}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={ecarter} disabled={busy}>
            <Text style={styles.dismissLabel}>{strings['pilotage.dismiss']}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionPrimary} onPress={ajusterSeuil} disabled={busy}>
            <Text style={styles.actionPrimaryLabel}>{strings['pilotage.lowerThreshold']}</Text>
          </TouchableOpacity>
          {!choisirRegleARetirer ? (
            <TouchableOpacity style={styles.actionSecondary} onPress={ouvrirChoixRetrait} disabled={busy}>
              <Text style={styles.actionSecondaryLabel}>{strings['pilotage.removeRule']}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.cardBody}>{strings['pilotage.chooseRuleToRemove']}</Text>
              {reglesActives?.map((regle) => (
                <TouchableOpacity
                  key={regle.ruleInstanceId}
                  style={styles.actionSecondary}
                  onPress={() => retirer(regle.ruleInstanceId)}
                  disabled={busy}
                >
                  <Text style={styles.actionSecondaryLabel}>{regle.label}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
          <TouchableOpacity onPress={ecarter} disabled={busy}>
            <Text style={styles.dismissLabel}>{strings['pilotage.dismiss']}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function CarteChangementAge({ suggestion, childId, householdId, onResolved }: CarteProps) {
  const age = suggestion.payload.age as number;
  const [candidats, setCandidats] = useState<RuleTemplate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [tableauComplet, setTableauComplet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCandidatsNouvelleRegle(childId, 3).then((result) => {
      if (!cancelled) setCandidats(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ajouter(template: RuleTemplate) {
    setBusy(true);
    const ok = await ajouterRegleChoisie(suggestion.id, childId, template);
    if (ok) {
      enregistrerEvenement(householdId, 'suggestion_accepted', { suggestionType: suggestion.type, action: 'add_rule' }, age);
      onResolved();
    } else {
      setBusy(false);
      setTableauComplet(true);
    }
  }
  async function ecarter() {
    setBusy(true);
    await dismisserSuggestion(suggestion.id);
    enregistrerEvenement(householdId, 'suggestion_dismissed', { suggestionType: suggestion.type }, age);
    onResolved();
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardText}>🎉 {age} ans</Text>
      <Text style={styles.cardBody}>{strings['pilotage.ageChangeBody']}</Text>
      <View style={styles.actions}>
        {tableauComplet ? (
          <Text style={styles.cardBody}>{strings['pilotage.boardFull']}</Text>
        ) : (
          candidats?.map((candidat) => (
            <TouchableOpacity key={candidat.id} style={styles.actionPrimary} onPress={() => ajouter(candidat)} disabled={busy}>
              <Text style={styles.actionPrimaryLabel}>{candidat.label}</Text>
            </TouchableOpacity>
          ))
        )}
        <TouchableOpacity onPress={ecarter} disabled={busy}>
          <Text style={styles.dismissLabel}>{strings['pilotage.dismiss']}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  body: {
    padding: 22,
    gap: 16,
  },
  empty: {
    color: colors.inkMuted,
    fontFamily: fonts.bodyMedium,
    textAlign: 'center',
    marginTop: 40,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.bodySemiBold,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    gap: 8,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardText: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  cardBody: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.inkMuted,
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPrimary: {
    backgroundColor: colors.accent,
    borderRadius: 100,
    padding: 12,
    alignItems: 'center',
  },
  actionPrimaryLabel: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
  },
  actionSecondary: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 100,
    padding: 12,
    alignItems: 'center',
  },
  actionSecondaryLabel: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
  },
  dismissLabel: {
    color: colors.inkMuted,
    fontFamily: fonts.bodyMedium,
    textAlign: 'center',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
  },
});
