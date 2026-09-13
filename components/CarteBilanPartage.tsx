import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { strings } from '../i18n/fr-FR';

export type CarteBilanPartageProps = {
  childFirstName: string;
  nomMasque: boolean;
  score: number;
  thresholdApplied: number;
  streakDays: number | null;
};

// §7.12 : la carte partagée ne montre jamais que le score, la jauge et la
// série — aucun nom de règle, aucun détail de comportement. Le prénom est
// affiché par défaut mais reste sous le contrôle du parent (nomMasque).
// collapsable={false} est nécessaire pour que react-native-view-shot
// puisse capturer la vue sur Android.
const CarteBilanPartage = forwardRef<View, CarteBilanPartageProps>(function CarteBilanPartage(
  { childFirstName, nomMasque, score, thresholdApplied, streakDays },
  ref
) {
  const proportion = thresholdApplied > 0 ? Math.min(1, score / thresholdApplied) : 0;

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <Text style={styles.brand}>{strings['app.name']}</Text>

      {!nomMasque && <Text style={styles.childName}>{childFirstName}</Text>}

      <Text style={styles.score}>{score}</Text>

      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${proportion * 100}%` }]} />
      </View>

      {streakDays !== null && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {streakDays}</Text>
        </View>
      )}
    </View>
  );
});

export default CarteBilanPartage;

const styles = StyleSheet.create({
  card: {
    width: 320,
    height: 480,
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  brand: {
    position: 'absolute',
    top: 24,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  childName: {
    color: '#E5E7EB',
    fontSize: 24,
    fontWeight: '600',
  },
  score: {
    color: '#FFFFFF',
    fontSize: 120,
    fontWeight: '800',
  },
  gaugeTrack: {
    width: '80%',
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: '#4ADE80',
  },
  streakBadge: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  streakText: {
    color: '#FBBF24',
    fontSize: 20,
    fontWeight: '700',
  },
});
