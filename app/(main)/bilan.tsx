import { Redirect } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import CarteBilanPartage from '../../components/CarteBilanPartage';
import ChildSwitcher from '../../components/ChildSwitcher';
import ScreenHeader from '../../components/ScreenHeader';
import { useActiveChild } from '../../data/activeChild';
import {
  fetchDailyDigest,
  fetchLatestWeeklyDigest,
  marquerBilanPartage,
  type DailyDigestData,
  type WeeklyDigestData,
} from '../../data/repositories/bilanRepository';
import { fetchDisplayState } from '../../data/repositories/displayStateRepository';
import { supabase } from '../../data/supabaseClient';
import { enregistrerEvenement } from '../../data/telemetry';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

function dateDuJourDansFuseau(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function formaterDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// §7.9 : le rendu se fait à l'affichage — la base ne stocke qu'une clé,
// une variante et des valeurs à injecter.
function remplir(gabarit: string, slots: Record<string, unknown>): string {
  return gabarit.replace(/\{(\w+)\}/g, (_, nom: string) => String(slots[nom] ?? ''));
}

function rendreGabarit(cle: string, variante: number, slots: Record<string, unknown>): string {
  const gabarit = (strings as Record<string, string>)[`${cle}.${variante}`] ?? '';
  return remplir(gabarit, slots);
}

export default function Bilan() {
  const onboarding = useOnboardingState();
  const { activeChildId, activeAccent } = useActiveChild();
  const childId = activeChildId;
  const accentStyles = useMemo(() => makeAccentStyles(activeAccent.accent), [activeAccent.accent]);
  const [digest, setDigest] = useState<DailyDigestData | null | undefined>(undefined);
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklyDigestData | null>(null);
  const [streakDays, setStreakDays] = useState<number | null>(null);
  const [error, setError] = useState(false);

  const [partageOuvert, setPartageOuvert] = useState(false);
  const [nomMasque, setNomMasque] = useState(false);
  const [partageEnCours, setPartageEnCours] = useState(false);
  const [erreurPartage, setErreurPartage] = useState<string | null>(null);
  const carteRef = useRef<View>(null);

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;

    async function charger() {
      try {
        const { data: household, error: householdError } = await supabase
          .from('child')
          .select('household_id')
          .eq('id', childId as string)
          .single();
        if (householdError || !household) throw householdError ?? new Error('child introuvable');
        const { data: householdRow, error: householdRowError } = await supabase
          .from('household')
          .select('timezone')
          .eq('id', household.household_id)
          .single();
        if (householdRowError || !householdRow) throw householdRowError ?? new Error('household introuvable');

        const aujourdHui = dateDuJourDansFuseau(householdRow.timezone);
        const [dailyResult, weeklyResult, displayState] = await Promise.all([
          fetchDailyDigest(childId as string, aujourdHui),
          fetchLatestWeeklyDigest(childId as string),
          fetchDisplayState(childId as string),
        ]);
        if (cancelled) return;
        setDigest(dailyResult);
        setWeeklyDigest(weeklyResult);
        setStreakDays(displayState.streak?.days ?? null);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    charger();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  async function partager() {
    if (!digest) return;
    setErreurPartage(null);
    setPartageEnCours(true);
    try {
      const disponible = await Sharing.isAvailableAsync();
      if (!disponible) {
        setErreurPartage(strings['bilan.shareUnavailable']);
        return;
      }
      const uri = await captureRef(carteRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri);
      await marquerBilanPartage(digest.id);
      if (onboarding.status === 'ready') enregistrerEvenement(onboarding.householdId, 'card_shared');
    } catch {
      setErreurPartage(strings['bilan.shareError']);
    } finally {
      setPartageEnCours(false);
    }
  }

  if (onboarding.status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (onboarding.status !== 'ready') {
    return <Redirect href="/" />;
  }

  const weeklySlots = weeklyDigest?.slots ?? {};

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['bilan.title']} accentColor={activeAccent.accent} />
      <ChildSwitcher />

      <View style={styles.body}>
      {error ? <Text style={styles.error}>{strings['bilan.error']}</Text> : null}

      {digest === null && <Text style={styles.notReady}>{strings['bilan.notReady']}</Text>}

      {digest && (
        <View style={styles.section}>
          <Text style={styles.eveningHeader}>
            {strings['bilan.eveningHeader']} — {digest.childName}, {formaterDate(digest.date)}
          </Text>

          <View style={styles.block}>
            <Text style={accentStyles.blockTitle}>{strings['bilan.heldToday']}</Text>
            <Text style={styles.blockBody}>
              {digest.heldRuleLabels.length > 0 ? digest.heldRuleLabels.join(' · ') : strings['bilan.noRuleHeld']}
            </Text>
            <Text style={styles.blockBody}>
              {remplir(strings['bilan.pointsSummary'], { score: digest.pointsTotal })}
              {digest.thresholdMet ? ` — ${strings['today.thresholdReached']}` : ''}
            </Text>
          </View>

          <View style={styles.block}>
            <Text style={accentStyles.blockTitle}>{strings['bilan.toNotice']}</Text>
            <Text style={styles.blockBody}>{rendreGabarit(digest.templateKey, digest.templateVariant, digest.slots)}</Text>
          </View>

          <View style={styles.block}>
            <Text style={accentStyles.blockTitle}>{strings['bilan.tomorrow']}</Text>
            <Text style={styles.blockBody}>{rendreGabarit(digest.questionKey, digest.questionVariant, digest.slots)}</Text>
          </View>

          {!partageOuvert ? (
            <TouchableOpacity style={accentStyles.shareButton} onPress={() => setPartageOuvert(true)}>
              <Text style={styles.shareButtonText}>{strings['bilan.share']}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.sharePreview}>
              <CarteBilanPartage
                ref={carteRef}
                childFirstName={digest.childName}
                nomMasque={nomMasque}
                score={digest.pointsTotal}
                thresholdApplied={digest.thresholdApplied}
                streakDays={streakDays}
                accent={activeAccent.accent}
              />
              <TouchableOpacity style={accentStyles.shareToggle} onPress={() => setNomMasque((v) => !v)}>
                <Text style={accentStyles.shareToggleText}>
                  {nomMasque ? strings['bilan.shareShowName'] : strings['bilan.shareHideName']}
                </Text>
              </TouchableOpacity>
              {erreurPartage ? <Text style={styles.error}>{erreurPartage}</Text> : null}
              <TouchableOpacity style={accentStyles.shareButton} onPress={partager} disabled={partageEnCours}>
                <Text style={styles.shareButtonText}>{strings['bilan.shareAction']}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPartageOuvert(false)}>
                <Text style={styles.shareCloseText}>{strings['bilan.shareClose']}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {weeklyDigest && (
        <View style={styles.section}>
          <Text style={styles.eveningHeader}>
            {strings['bilan.weekly.title']} — S{weeklyDigest.isoWeek} · {weeklyDigest.isoYear}
          </Text>
          <View style={styles.block}>
            <Text style={styles.blockBody}>
              {remplir(
                strings[weeklySlots.daysThresholdMet === 1 ? 'bilan.weekly.pointsSummary.one' : 'bilan.weekly.pointsSummary.other'],
                {
                  points: weeklySlots.points as number,
                  daysThresholdMet: weeklySlots.daysThresholdMet as number,
                }
              )}
            </Text>
            {weeklySlots.mostRegularRuleLabel ? (
              <Text style={styles.blockBody}>
                {remplir(strings['bilan.weekly.mostRegular'], { ruleLabel: weeklySlots.mostRegularRuleLabel as string })}
              </Text>
            ) : null}
            {weeklySlots.showComparison && weeklySlots.mostImprovedRuleLabel ? (
              <Text style={styles.blockBody}>
                {remplir(strings['bilan.weekly.mostImproved'], {
                  ruleLabel: weeklySlots.mostImprovedRuleLabel as string,
                })}
              </Text>
            ) : null}
            {weeklyDigest.rewardLabel ? (
              <Text style={styles.blockBody}>
                {remplir(strings['bilan.weekly.rewardUnlocked'], { rewardLabel: weeklyDigest.rewardLabel })}
              </Text>
            ) : null}
            {weeklySlots.focusRuleLabel ? (
              <Text style={styles.blockBody}>
                {remplir(strings['bilan.weekly.focus'], { ruleLabel: weeklySlots.focusRuleLabel as string })}
              </Text>
            ) : null}
          </View>
        </View>
      )}
      </View>
    </ScrollView>
  );
}

function makeAccentStyles(accent: string) {
  return StyleSheet.create({
    blockTitle: {
      fontSize: 12,
      fontFamily: fonts.bodyBold,
      color: accent,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    shareButton: {
      backgroundColor: accent,
      borderRadius: 100,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    shareToggle: {
      borderWidth: 1.5,
      borderColor: accent,
      borderRadius: 100,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    shareToggleText: {
      color: accent,
      fontFamily: fonts.bodyBold,
    },
  });
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  body: {
    padding: 22,
    gap: 24,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.bodySemiBold,
    textAlign: 'center',
  },
  notReady: {
    color: colors.inkMuted,
    fontFamily: fonts.bodyMedium,
    textAlign: 'center',
    marginTop: 40,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    gap: 16,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  eveningHeader: {
    fontFamily: fonts.cursive,
    fontSize: 19,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  block: {
    gap: 6,
  },
  blockBody: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
  },
  shareButtonText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
  },
  sharePreview: {
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  shareCloseText: {
    color: colors.inkMuted,
    fontFamily: fonts.bodyMedium,
    textAlign: 'center',
    marginTop: 4,
  },
});
