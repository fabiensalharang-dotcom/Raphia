import { auth } from './auth';
import { bilan } from './bilan';
import { common } from './common';
import { display } from './display';
import { onboarding } from './onboarding';
import { pilotage } from './pilotage';
import { progress } from './progress';
import { today } from './today';

export const strings = {
  ...common,
  ...auth,
  ...onboarding,
  ...today,
  ...display,
  ...progress,
  ...pilotage,
  ...bilan,
};
