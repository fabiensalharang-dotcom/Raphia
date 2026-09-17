import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ScreenHeader from '../../components/ScreenHeader';
import { exporterDonneesFoyer, supprimerCompte } from '../../data/repositories/accountRepository';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export default function Parametres() {
  const onboarding = useOnboardingState();
  const householdId = onboarding.status === 'ready' ? onboarding.householdId : null;
  const [exportEnCours, setExportEnCours] = useState(false);
  const [exportErreur, setExportErreur] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [suppressionErreur, setSuppressionErreur] = useState(false);

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
      <ScreenHeader title={strings['parametres.title']} />

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardText}>{strings['parametres.exportTitle']}</Text>
          <Text style={styles.cardBody}>{strings['parametres.exportBody']}</Text>
          {exportErreur ? <Text style={styles.error}>{strings['parametres.exportError']}</Text> : null}
          <TouchableOpacity style={styles.actionSecondary} onPress={exporter} disabled={exportEnCours}>
            <Text style={styles.actionSecondaryLabel}>
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
          <Text style={styles.signOut}>{strings['today.signOut']}</Text>
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
  actionSecondary: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 100,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  actionSecondaryLabel: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
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
  signOut: {
    color: colors.accent,
    fontFamily: fonts.bodySemiBold,
    textAlign: 'center',
    marginTop: 8,
  },
});
