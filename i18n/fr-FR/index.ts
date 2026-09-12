import { auth } from './auth';
import { common } from './common';
import { onboarding } from './onboarding';
import { today } from './today';

export const strings = {
  ...common,
  ...auth,
  ...onboarding,
  ...today,
};
