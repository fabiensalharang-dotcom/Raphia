import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { exporterDonneesFoyer, supprimerCompte } from '../../data/repositories/accountRepository';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';

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
    return <View style={{ flex: 1 }} />;
  }
  if (onboarding.status !== 'ready') {
    return <Redirect href="/" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)/today'))}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{strings['parametres.title']}</Text>
        <View style={styles.headerSpacer} />
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backArrow: {
    fontSize: 28,
    paddingHorizontal: 16,
  },
  headerSpacer: {
    width: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  error: {
    color: '#B00020',
  },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardBody: {
    fontSize: 14,
    color: '#444',
  },
  actionSecondary: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  actionSecondaryLabel: {
    color: '#208AEF',
    fontWeight: '600',
  },
  actionDanger: {
    borderWidth: 1,
    borderColor: '#B00020',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  actionDangerLabel: {
    color: '#B00020',
    fontWeight: '600',
  },
  signOut: {
    color: '#208AEF',
    textAlign: 'center',
    marginTop: 8,
  },
});
