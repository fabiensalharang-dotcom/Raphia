import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

type PousseProps = {
  size?: number;
};

// Mascotte de l'app, validée avec l'utilisateur (retour famille pilote,
// sept. 2026) : une graine-personnage qui grandit, pas un animal — pour
// ne pas ressembler à la mascotte d'une app concurrente.
export default function Pousse({ size = 46 }: PousseProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Path d="M60 30 C60 30 56 14 44 12 C46 24 52 30 60 34 Z" fill="#5FA84B" />
      <Path d="M60 30 C60 30 64 14 76 12 C74 24 68 30 60 34 Z" fill="#7BC463" />
      <Ellipse cx={60} cy={40} rx={9} ry={11} fill="#FFC9DE" />
      <Circle cx={55} cy={36} r={4} fill="#FF9EC0" />
      <Circle cx={65} cy={36} r={4} fill="#FF9EC0" />
      <Circle cx={60} cy={32} r={4} fill="#FF9EC0" />
      <Path
        d="M60 46 C40 46 28 62 30 82 C30 96 43 106 60 106 C77 106 90 96 90 82 C92 62 80 46 60 46 Z"
        fill="#8FCB74"
      />
      <Circle cx={50} cy={76} r={7} fill="#FFFFFF" />
      <Circle cx={70} cy={76} r={7} fill="#FFFFFF" />
      <Circle cx={51} cy={78} r={3.6} fill="#3A2E2A" />
      <Circle cx={71} cy={78} r={3.6} fill="#3A2E2A" />
      <Path d="M54 90 Q60 95 66 90" stroke="#3A6E2E" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
