import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// Animation de célébration au franchissement du seuil (§9.2 : « un état
// franchi visuellement spectaculaire »). Construite avec Animated (déjà une
// dépendance de React Native), aucune bibliothèque supplémentaire.
const COULEURS = ['#D9483C', '#E07A3F', '#C99A2E', '#4CAF7D', '#4E7FE0', '#8B5FD9', '#E0568A', '#2FA9B8'];
const NOMBRE_PIECES = 24;

type PieceProps = { delay: number; startX: number; sens: number; color: string };

function Piece({ delay, startX, sens, color }: PieceProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1400,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 220] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, sens * 40] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${sens * 360}deg`] });
  const opacity = progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          backgroundColor: color,
          left: `${startX}%`,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate }],
        },
      ]}
    />
  );
}

export default function Confetti() {
  const pieces = useRef(
    Array.from({ length: NOMBRE_PIECES }, (_, i) => ({
      delay: Math.random() * 200,
      startX: Math.round(Math.random() * 100),
      sens: i % 2 === 0 ? 1 : -1,
      color: COULEURS[i % COULEURS.length],
    }))
  ).current;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((p, i) => (
        <Piece key={i} {...p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    overflow: 'hidden',
  },
  piece: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
