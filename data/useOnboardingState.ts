import { useEffect, useState } from 'react';

import { supabase } from './supabaseClient';
import { useSession } from './useSession';

type OnboardingState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'needs-consent' }
  | { status: 'needs-child'; householdId: string }
  | { status: 'needs-rules'; householdId: string; childId: string }
  | { status: 'needs-rewards'; householdId: string; childId: string }
  | { status: 'needs-threshold'; householdId: string; childId: string }
  | { status: 'ready'; householdId: string; childId: string };

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
        .select('id, settings')
        .eq('household_id', caregiver.household_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (childError || !child) {
        setState({ status: 'needs-child', householdId: caregiver.household_id });
        return;
      }

      const { data: rule, error: ruleError } = await supabase
        .from('rule_instance')
        .select('id')
        .eq('child_id', child.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (ruleError || !rule) {
        setState({ status: 'needs-rules', householdId: caregiver.household_id, childId: child.id });
        return;
      }

      const { data: reward, error: rewardError } = await supabase
        .from('reward_instance')
        .select('id')
        .eq('child_id', child.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (rewardError || !reward) {
        setState({ status: 'needs-rewards', householdId: caregiver.household_id, childId: child.id });
        return;
      }

      const settings = (child.settings ?? {}) as { dailyThreshold?: number };
      if (typeof settings.dailyThreshold !== 'number') {
        setState({ status: 'needs-threshold', householdId: caregiver.household_id, childId: child.id });
        return;
      }

      setState({ status: 'ready', householdId: caregiver.household_id, childId: child.id });
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [session, sessionLoading]);

  return state;
}
