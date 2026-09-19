import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ChildSwitcher from '../../components/ChildSwitcher';
import ColorPicker from '../../components/ColorPicker';
import ScreenHeader from '../../components/ScreenHeader';
import { useActiveChild } from '../../data/activeChild';
import { exporterDonneesFoyer, supprimerCompte, supprimerEnfant } from '../../data/repositories/accountRepository';
import {
  definirSeuilHebdomadaire,
  definirSeuilQuotidien,
  fetchSeuilHebdoInfo,
  fetchSeuilInfo,
  type SeuilHebdoInfo,
  type SeuilInfo,
} from '../../data/repositories/pilotageRepository';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { DEFAULT_ACCENT_KEY, type AccentColorKey } from '../../theme/accentPalette';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export default function Parametres() {
  const onboarding = useOnboardingState();
  const householdId = onboarding.status === 'ready' ? onboarding.householdId : null;
  const { activeChildId, activeAccent, children, refreshChildren } = useActiveChild();
  const enfantActif = children.find((c) => c.id === activeChildId);
  const couleurActuelle = enfantActif?.themeColor ?? DEFAULT_ACCENT_KEY;
  const accentStyles = useMemo(() => makeAccentStyles(activeAccent.accent), [activeAccent.accent]);
  const [exportEnCours, setExportEnCours] = useState(false);
  const [exportErreur, setExportErreur] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [suppressionErreur, setSuppressionErreur] = useState(false);
  const [seuilInfo, setSeuilInfo] = useState<SeuilInfo | null>(null);
  const [seuilHebdoInfo, setSeuilHebdoInfo] = useState<SeuilHebdoInfo | null>(null);
  const [seuilMode, setSeuilMode] = useState<'daily' | 'weekly'>('daily');
  const [seuilErreur, setSeuilErreur] = useState(false);
  const [retraitEnCours, setRetraitEnCours] = useState(false);
  const [retraitErreur, setRetraitErreur] = useState(false);

  useEffect(() => {
    if (!activeChildId) return;
    let cancelled = false;
    Promise.all([fetchSeuilInfo(activeChildId), fetchSeuilHebdoInfo(activeChildId)])
      .then(([info, infoHebdo]) => {
        if (!cancelled) {
          setSeuilInfo(info);
          setSeuilHebdoInfo(infoHebdo);
        }
      })
      .catch(() => {
        if (!cancelled) setSeuilErreur(true);
      });
    return () => {
      cancelled = true;
    };
  }, [activeChildId]);

  async function changerCouleur(cle: AccentColorKey) {
    if (!activeChildId) return;
    const { data: enfant } = await supabase.from('child').select('settings').eq('id', activeChildId).single();
    const settingsExistants = (enfant?.settings as Record<string, unknown>) ?? {};
    await supabase.from('child').update({ settings: { ...settingsExistants, themeColor: cle } }).eq('id', activeChildId);
    await refreshChildren();
  }

  async function ajusterSeuil(delta: number) {
    if (!activeChildId || !seuilInfo) return;
    const nouveauSeuil = Math.max(1, Math.min(seuilInfo.pointsMax, seuilInfo.seuilActuel + delta));
    if (nouveauSeuil === seuilInfo.seuilActuel) return;
    setSeuilErreur(false);
    try {
      await definirSeuilQuotidien(activeChildId, nouveauSeuil);
      setSeuilInfo({ ...seuilInfo, seuilActuel: nouveauSeuil });
    } catch {
      setSeuilErreur(true);
    }
  }

  async function reinitialiserSeuil() {
    if (!activeChildId || !seuilInfo) return;
    setSeuilErreur(false);
    try {
      await definirSeuilQuotidien(activeChildId, seuilInfo.seuilRecommande);
      setSeuilInfo({ ...seuilInfo, seuilActuel: seuilInfo.seuilRecommande });
    } catch {
      setSeuilErreur(true);
    }
  }

  async function ajusterSeuilHebdo(delta: number) {
    if (!activeChildId || !seuilHebdoInfo) return;
    const nouveauSeuil = Math.max(1, Math.min(seuilHebdoInfo.maxJours, seuilHebdoInfo.seuilActuel + delta));
    if (nouveauSeuil === seuilHebdoInfo.seuilActuel) return;
    setSeuilErreur(false);
    try {
      await definirSeuilHebdomadaire(activeChildId, nouveauSeuil);
      setSeuilHebdoInfo({ ...seuilHebdoInfo, seuilActuel: nouveauSeuil });
    } catch {
      setSeuilErreur(true);
    }
  }

  async function reinitialiserSeuilHebdo() {
    if (!activeChildId || !seuilHebdoInfo) return;
    setSeuilErreur(false);
    try {
      await definirSeuilHebdomadaire(activeChildId, seuilHebdoInfo.seuilParDefaut);
      setSeuilHebdoInfo({ ...seuilHebdoInfo, seuilActuel: seuilHebdoInfo.seuilParDefaut });
    } catch {
      setSeuilErreur(true);
    }
  }

  async function retirerEnfant() {
    if (!activeChildId) return;
    setRetraitEnCours(true);
    setRetraitErreur(false);
    try {
      await supprimerEnfant(activeChildId);
      await refreshChildren();
    } catch {
      setRetraitErreur(true);
    } finally {
      setRetraitEnCours(false);
    }
  }

  function confirmerRetraitEnfant() {
    if (!enfantActif) return;
    const message = strings['parametres.removeChildConfirmBody'].replace('{firstName}', enfantActif.firstName);
    if (Platform.OS === 'web') {
      if (window.confirm(message)) retirerEnfant();
      return;
    }
    Alert.alert(strings['parametres.removeChildConfirmTitle'], message, [
      { text: strings['parametres.removeChildCancelButton'], style: 'cancel' },
      { text: strings['parametres.removeChildConfirmButton'], style: 'destructive', onPress: retirerEnfant },
    ]);
  }

  async function exporter() {
    if (!householdId) return;
    setExportEnCours(true);
    setExportErreur(false);
    try {
      const donnees = await exporterDonneesFoyer(householdId);
      const contenu = JSON.stringify(donnees, null, 2);
      if (Platform.OS === 'web') {
        // §11.3 : sur le web, la feuille de partage native n'existe pas de
        // façon fiable (absente de la plupart des navigateurs de bureau) —
        // on déclenche un téléchargement de fichier à la place, plus adapté
        // à un export de données de toute façon.
        const blob = new Blob([contenu], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const lien = document.createElement('a');
        lien.href = url;
        lien.download = `export-donnees-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: strings['parametres.exportTitle'], message: contenu });
      }
    } catch {
      setExportErreur(true);
    } finally {
      setExportEnCours(false);
    }
  }

  async function supprimer() {
    if (!householdId) return;
    setSuppressionEnCours(true);
    setSuppressionErreur(false);
    try {
      await supprimerCompte(householdId);
      router.replace('/');
    } catch {
      setSuppressionErreur(true);
      setSuppressionEnCours(false);
    }
  }

  function confirmerSuppression() {
    if (Platform.OS === 'web') {
      if (window.confirm(strings['parametres.deleteConfirmBody'])) supprimer();
      return;
    }
    Alert.alert(strings['parametres.deleteConfirmTitle'], strings['parametres.deleteConfirmBody'], [
      { text: strings['parametres.deleteCancelButton'], style: 'cancel' },
      { text: strings['parametres.deleteConfirmButton'], style: 'destructive', onPress: supprimer },
    ]);
  }

  if (onboarding.status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (onboarding.status !== 'ready') {
    return <Redirect href="/" />;
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['parametres.title']} accentColor={activeAccent.accent} />
      <ChildSwitcher />

      <View style={styles.body}>
        {enfantActif && (
          <View style={styles.card}>
            <Text style={styles.cardText}>
              {strings['parametres.colorTitle']} {enfantActif.firstName}
            </Text>
            <Text style={styles.cardBody}>{strings['parametres.colorBody']}</Text>
            <ColorPicker value={couleurActuelle} onChange={changerCouleur} />
          </View>
        )}

        {enfantActif && (
          <View style={styles.card}>
            <Text style={styles.cardText}>
              {strings['parametres.rewardsTitle']} {enfantActif.firstName}
            </Text>
            <Text style={styles.cardBody}>{strings['parametres.rewardsBody']}</Text>
            <TouchableOpacity style={accentStyles.actionSecondary} onPress={() => router.push('/(main)/recompenses')}>
              <Text style={accentStyles.actionSecondaryLabel}>{strings['parametres.rewardsButton']}</Text>
            </TouchableOpacity>
          </View>
        )}

        {enfantActif && seuilInfo && seuilHebdoInfo && (
          <View style={styles.card}>
            <Text style={styles.cardText}>
              {strings['parametres.thresholdTitle']} {enfantActif.firstName}
            </Text>

            <View style={styles.seuilModeRow}>
              <TouchableOpacity
                style={[accentStyles.seuilModeSegment, seuilMode === 'daily' && accentStyles.seuilModeSegmentActive]}
                onPress={() => setSeuilMode('daily')}
              >
                <Text style={[styles.seuilModeLabel, seuilMode === 'daily' && styles.seuilModeLabelActive]}>
                  {strings['parametres.thresholdDailyFilter']}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[accentStyles.seuilModeSegment, seuilMode === 'weekly' && accentStyles.seuilModeSegmentActive]}
                onPress={() => setSeuilMode('weekly')}
              >
                <Text style={[styles.seuilModeLabel, seuilMode === 'weekly' && styles.seuilModeLabelActive]}>
                  {strings['parametres.thresholdWeeklyFilter']}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardBody}>
              {seuilMode === 'daily' ? strings['parametres.thresholdBody'] : strings['parametres.thresholdWeeklyBody']}
            </Text>
            {seuilErreur ? <Text style={styles.error}>{strings['parametres.thresholdError']}</Text> : null}

            {seuilMode === 'daily' ? (
              <>
                <View style={styles.thresholdRow}>
                  <TouchableOpacity
                    style={[accentStyles.thresholdStepper, seuilInfo.seuilActuel <= 1 && styles.thresholdStepperDisabled]}
                    onPress={() => ajusterSeuil(-1)}
                    disabled={seuilInfo.seuilActuel <= 1}
                  >
                    <Text style={accentStyles.thresholdStepperLabel}>–</Text>
                  </TouchableOpacity>
                  <View style={styles.thresholdValueWrap}>
                    <Text style={accentStyles.thresholdValue}>{seuilInfo.seuilActuel}</Text>
                    <Text style={styles.thresholdMax}>
                      / {seuilInfo.pointsMax} {strings['parametres.thresholdMaxSuffix']}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      accentStyles.thresholdStepper,
                      seuilInfo.seuilActuel >= seuilInfo.pointsMax && styles.thresholdStepperDisabled,
                    ]}
                    onPress={() => ajusterSeuil(1)}
                    disabled={seuilInfo.seuilActuel >= seuilInfo.pointsMax}
                  >
                    <Text style={accentStyles.thresholdStepperLabel}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.thresholdGaugeWrap}>
                  <View style={styles.thresholdGaugeTrack}>
                    <View
                      style={[
                        accentStyles.thresholdGaugeFill,
                        { width: `${Math.min(100, (seuilInfo.seuilActuel / Math.max(1, seuilInfo.pointsMax)) * 100)}%` },
                      ]}
                    />
                  </View>
                  <View
                    style={[
                      styles.thresholdGaugeMark,
                      { left: `${Math.min(100, (seuilInfo.seuilRecommande / Math.max(1, seuilInfo.pointsMax)) * 100)}%` },
                    ]}
                  />
                </View>

                {seuilInfo.seuilActuel !== seuilInfo.seuilRecommande && (
                  <TouchableOpacity onPress={reinitialiserSeuil}>
                    <Text style={accentStyles.thresholdReset}>
                      {strings['parametres.thresholdRecommended'].replace('{value}', String(seuilInfo.seuilRecommande))} ·{' '}
                      {strings['parametres.thresholdResetButton']}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <View style={styles.thresholdRow}>
                  <TouchableOpacity
                    style={[
                      accentStyles.thresholdStepper,
                      seuilHebdoInfo.seuilActuel <= 1 && styles.thresholdStepperDisabled,
                    ]}
                    onPress={() => ajusterSeuilHebdo(-1)}
                    disabled={seuilHebdoInfo.seuilActuel <= 1}
                  >
                    <Text style={accentStyles.thresholdStepperLabel}>–</Text>
                  </TouchableOpacity>
                  <View style={styles.thresholdValueWrap}>
                    <Text style={accentStyles.thresholdValue}>{seuilHebdoInfo.seuilActuel}</Text>
                    <Text style={styles.thresholdMax}>
                      / {seuilHebdoInfo.maxJours} {strings['parametres.thresholdWeeklyMaxSuffix']}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      accentStyles.thresholdStepper,
                      seuilHebdoInfo.seuilActuel >= seuilHebdoInfo.maxJours && styles.thresholdStepperDisabled,
                    ]}
                    onPress={() => ajusterSeuilHebdo(1)}
                    disabled={seuilHebdoInfo.seuilActuel >= seuilHebdoInfo.maxJours}
                  >
                    <Text style={accentStyles.thresholdStepperLabel}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.thresholdGaugeWrap}>
                  <View style={styles.thresholdGaugeTrack}>
                    <View
                      style={[
                        accentStyles.thresholdGaugeFill,
                        {
                          width: `${Math.min(100, (seuilHebdoInfo.seuilActuel / seuilHebdoInfo.maxJours) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <View
                    style={[
                      styles.thresholdGaugeMark,
                      { left: `${Math.min(100, (seuilHebdoInfo.seuilParDefaut / seuilHebdoInfo.maxJours) * 100)}%` },
                    ]}
                  />
                </View>

                {seuilHebdoInfo.seuilActuel !== seuilHebdoInfo.seuilParDefaut && (
                  <TouchableOpacity onPress={reinitialiserSeuilHebdo}>
                    <Text style={accentStyles.thresholdReset}>
                      {strings['parametres.thresholdWeeklyDefault'].replace(
                        '{value}',
                        String(seuilHebdoInfo.seuilParDefaut)
                      )}{' '}
                      · {strings['parametres.thresholdWeeklyResetButton']}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardText}>{strings['parametres.addChildTitle']}</Text>
          <Text style={styles.cardBody}>{strings['parametres.addChildBody']}</Text>
          <TouchableOpacity
            style={accentStyles.actionSecondary}
            onPress={() => router.push(`/(auth)/add-child?householdId=${householdId}`)}
            disabled={!householdId}
          >
            <Text style={accentStyles.actionSecondaryLabel}>{strings['parametres.addChildButton']}</Text>
          </TouchableOpacity>
        </View>

        {enfantActif && (
          <View style={styles.card}>
            <Text style={styles.cardText}>{strings['parametres.removeChildTitle']}</Text>
            <Text style={styles.cardBody}>{strings['parametres.removeChildBody']}</Text>
            {retraitErreur ? <Text style={styles.error}>{strings['parametres.removeChildError']}</Text> : null}
            {children.length <= 1 ? (
              <Text style={styles.notice}>{strings['parametres.removeChildLastOne']}</Text>
            ) : (
              <TouchableOpacity style={styles.actionDanger} onPress={confirmerRetraitEnfant} disabled={retraitEnCours}>
                <Text style={styles.actionDangerLabel}>
                  {retraitEnCours ? strings['parametres.deleteInProgress'] : strings['parametres.removeChildButton']}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardText}>{strings['parametres.exportTitle']}</Text>
          <Text style={styles.cardBody}>{strings['parametres.exportBody']}</Text>
          {exportErreur ? <Text style={styles.error}>{strings['parametres.exportError']}</Text> : null}
          <TouchableOpacity style={accentStyles.actionSecondary} onPress={exporter} disabled={exportEnCours}>
            <Text style={accentStyles.actionSecondaryLabel}>
              {exportEnCours ? strings['parametres.exportInProgress'] : strings['parametres.exportButton']}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardText}>{strings['parametres.deleteTitle']}</Text>
          <Text style={styles.cardBody}>{strings['parametres.deleteBody']}</Text>
          {suppressionErreur ? <Text style={styles.error}>{strings['parametres.deleteError']}</Text> : null}
          <TouchableOpacity style={styles.actionDanger} onPress={confirmerSuppression} disabled={suppressionEnCours}>
            <Text style={styles.actionDangerLabel}>
              {suppressionEnCours ? strings['parametres.deleteInProgress'] : strings['parametres.deleteButton']}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={accentStyles.signOut}>{strings['today.signOut']}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function makeAccentStyles(accent: string) {
  return StyleSheet.create({
    actionSecondary: {
      borderWidth: 1.5,
      borderColor: accent,
      borderRadius: 100,
      padding: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    actionSecondaryLabel: {
      color: accent,
      fontFamily: fonts.bodyBold,
    },
    signOut: {
      color: accent,
      fontFamily: fonts.bodySemiBold,
      textAlign: 'center',
      marginTop: 8,
    },
    thresholdStepper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thresholdStepperLabel: {
      color: accent,
      fontFamily: fonts.bodyExtraBold,
      fontSize: 20,
      lineHeight: 22,
    },
    thresholdValue: {
      fontFamily: fonts.bodyExtraBold,
      fontSize: 32,
      color: accent,
    },
    thresholdGaugeFill: {
      height: '100%',
      borderRadius: 100,
      backgroundColor: accent,
    },
    thresholdReset: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: accent,
      marginTop: 4,
    },
    seuilModeSegment: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: accent,
      borderRadius: 100,
      paddingVertical: 8,
      alignItems: 'center',
    },
    seuilModeSegmentActive: {
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
    gap: 16,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.bodyMedium,
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
  actionDanger: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: 100,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  actionDangerLabel: {
    color: colors.danger,
    fontFamily: fonts.bodyBold,
  },
  notice: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 4,
  },
  seuilModeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  seuilModeLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  seuilModeLabelActive: {
    color: '#fff',
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginTop: 6,
  },
  thresholdStepperDisabled: {
    opacity: 0.35,
  },
  thresholdValueWrap: {
    alignItems: 'center',
    minWidth: 90,
  },
  thresholdMax: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.inkMuted,
  },
  thresholdGaugeWrap: {
    position: 'relative',
    marginTop: 14,
  },
  thresholdGaugeTrack: {
    height: 14,
    borderRadius: 100,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  thresholdGaugeMark: {
    position: 'absolute',
    top: -3,
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: colors.ink,
    opacity: 0.4,
  },
});
