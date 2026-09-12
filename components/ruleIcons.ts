import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Correspondance entre les clés d'icône provisoires du référentiel
// (docs/referentiel.md) et de vraies icônes Ionicons. Provisoire comme le
// dit le référentiel — un vrai jeu d'icônes reste un travail graphique
// séparé, hors périmètre code.
const CORRESPONDANCE: Record<string, IoniconName> = {
  shirt: 'shirt-outline',
  toothbrush: 'water-outline',
  backpack: 'bag-handle-outline',
  shower: 'rainy-outline',
  soap: 'sparkles-outline',
  'alarm-clock': 'alarm-outline',
  hanger: 'shirt-outline',
  crosswalk: 'walk-outline',
  helmet: 'bicycle-outline',
  park: 'leaf-outline',
  phone: 'call-outline',
  seatbelt: 'car-outline',
  door: 'lock-closed-outline',
  wave: 'hand-right-outline',
  toys: 'gift-outline',
  heart: 'heart-outline',
  hourglass: 'hourglass-outline',
  'hand-raised': 'hand-left-outline',
  friends: 'people-outline',
  pencil: 'pencil-outline',
  book: 'book-outline',
  checklist: 'checkbox-outline',
  desk: 'school-outline',
  'screen-off': 'power-outline',
  screen: 'tablet-portrait-outline',
  table: 'restaurant-outline',
  moon: 'moon-outline',
  'speech-bubble': 'chatbubble-outline',
  'stop-hand': 'hand-left-outline',
  lungs: 'fitness-outline',
  'raised-hand': 'help-buoy-outline',
  calm: 'happy-outline',
  box: 'cube-outline',
  'table-setting': 'restaurant-outline',
  'coat-hook': 'shirt-outline',
  clothes: 'shirt-outline',
  basket: 'basket-outline',
};

const ICONE_PAR_DEFAUT: IoniconName = 'ellipse-outline';

export function nomIoniconPour(cleIcone: string): IoniconName {
  return CORRESPONDANCE[cleIcone] ?? ICONE_PAR_DEFAUT;
}
