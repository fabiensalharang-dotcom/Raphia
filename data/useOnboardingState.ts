import { useEffect, useState } from 'react';

import { supabase } from './supabaseClient';
import { useSession } from './useSession';

type OnboardingState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'needs-consent' }
  | { status: 'needs-child'; householdId: string }
  | { status: 'ready'; householdId: string };

export function useOnboardingState(): OnboardingState {
  const { session, loading: sessionLoading } = useSession();
  const [state, setState] = useState<OnboardingState>({ status: 'loading' });

  useEffect(() => {
    if (sessionLoading) {
      setState({ status: 'loading' });
      return;
    }
    if (!session) {
      setState({ status: 'signed-out' });
      return;
    }

    let cancelled = false;
    const userId = session.user.id;

    async function check() {
      const { data: caregiver, error: caregiverError } = await supabase
        .from('caregiver')
        .select('household_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (cancelled) return;
      if (caregiverError || !caregiver) {
        setState({ status: 'needs-consent' });
        return;
      }

      const { data: child, error: childError } = await supabase
        .from('child')
        .select('id')
        .eq('household_id', caregiver.household_id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (childError || !child) {
        setState({ status: 'needs-child', householdId: caregiver.household_id });
        return;
      }

      setState({ status: 'ready', householdId: caregiver.household_id });
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [session, sessionLoading]);

  return state;
}
