import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ChildSwitcher from '../../components/ChildSwitcher';
import ColorPicker from '../../components/ColorPicker';
import ScreenHeader from '../../components/ScreenHeader';
import { useActiveChild } from '../../data/activeChild';
import { exporterDonneesFoyer, supprimerCompte } from '../../data/repositories/accountRepository';
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

  async function changerCouleur(cle: AccentColorKey) {
    if (!activeChildId) return;
    const { data: enfant } = await supabase.from('child').select('settings').eq('id', activeChildId).single();
    const settingsExistants = (enfant?.settings as Record<string, unknown>) ?? {};
    await supabase.from('child').update({ settings: { ...settingsExistants, themeColor: cle } }).eq('id', activeChildId);
    await refreshChildren();
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

        <View style={styles.card}>
          <Text style={styles.cardText}>{strings['parametres.referentielTitle']}</Text>
          <Text style={styles.cardBody}>{strings['parametres.referentielBody']}</Text>
          <TouchableOpacity
            style={accentStyles.actionSecondary}
            onPress={() => router.push(`/(main)/referentiel?childId=${activeChildId}`)}
            disabled={!activeChildId}
          >
            <Text style={accentStyles.actionSecondaryLabel}>{strings['parametres.referentielButton']}</Text>
          </TouchableOpacity>
        </View>

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
});
