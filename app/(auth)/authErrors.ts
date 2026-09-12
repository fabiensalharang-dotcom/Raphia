import type { AuthError } from '@supabase/supabase-js';

import { strings } from '../../i18n/fr-FR';

export function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return strings['auth.error.invalidCredentials'];
    case 'user_already_exists':
      return strings['auth.error.userAlreadyExists'];
    case 'weak_password':
      return strings['auth.error.weakPassword'];
    default:
      return strings['auth.error.generic'];
  }
}
