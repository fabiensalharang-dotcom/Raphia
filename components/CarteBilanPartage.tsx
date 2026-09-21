import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { strings } from '../i18n/fr-FR';
import { fonts } from '../theme/typography';

export type CarteBilanPartageProps = {
  childFirstName: string;
  nomMasque: boolean;
  score: number;
  thresholdApplied: number;
  streakDays: number | null;
  accent: string;
};

// §7.12 : la carte partagée ne montre jamais que le score, la jauge et la
// série — aucun nom de règle, aucun détail de comportement. Le prénom est
// affiché par défaut mais reste sous le contrôle du parent (nomMasque).
// collapsable={false} est nécessaire pour que react-native-view-shot
// puisse capturer la vue sur Android.
const CarteBilanPartage = forwardRef<View, CarteBilanPartageProps>(function CarteBilanPartage(
  { childFirstName, nomMasque, score, thresholdApplied, streakDays, accent },
  ref
) {
  const proportion = thresholdApplied > 0 ? Math.min(1, score / thresholdApplied) : 0;

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: accent }]}>
      <Text style={styles.brand}>{strings['app.name']}</Text>

      {!nomMasque && <Text style={styles.childName}>{childFirstName}</Text>}

      <Text style={styles.score}>{score}</Text>

      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${proportion * 100}%` }]} />
      </View>

      {streakDays !== null && streakDays > 0 && (
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
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  brand: {
    position: 'absolute',
    top: 26,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: fonts.cursive,
    fontSize: 20,
  },
  childName: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 22,
  },
  score: {
    color: '#fff',
    fontFamily: fonts.bodyExtraBold,
    fontSize: 110,
    lineHeight: 122,
  },
  gaugeTrack: {
    width: '78%',
    height: 18,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 100,
    backgroundColor: '#fff',
  },
  streakBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  streakText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 18,
  },
});
