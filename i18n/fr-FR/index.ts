import { auth } from './auth';
import { common } from './common';
import { display } from './display';
import { onboarding } from './onboarding';
import { today } from './today';

export const strings = {
  ...common,
  ...auth,
  ...onboarding,
  ...today,
  ...display,
};
