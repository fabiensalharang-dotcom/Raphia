import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabaseClient';
import { useOnboardingState } from './useOnboardingState';

export type HouseholdChild = { id: string; firstName: string };

type ActiveChildContextValue = {
  children: HouseholdChild[];
  activeChildId: string | null;
  setActiveChildId: (id: string) => void;
  refreshChildren: () => Promise<void>;
};

const ActiveChildContext = createContext<ActiveChildContextValue | null>(null);

function cleStockage(householdId: string): string {
  return `raphia.activeChild.${householdId}`;
}

export function ActiveChildProvider({ children: reactChildren }: { children: ReactNode }) {
  const onboarding = useOnboardingState();
  const householdId = onboarding.status === 'ready' ? onboarding.householdId : null;
  const [childrenList, setChildrenList] = useState<HouseholdChild[]>([]);
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null);

  const refreshChildren = useCallback(async () => {
    if (!householdId) return;
    const { data, error } = await supabase
      .from('child')
      .select('id, first_name')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });
    if (error || !data) return;

    const liste = data.map((c) => ({ id: c.id, firstName: c.first_name }));
    setChildrenList(liste);
    setActiveChildIdState((actuel) => (actuel && liste.some((c) => c.id === actuel) ? actuel : (liste[0]?.id ?? null)));
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;

    async function init() {
      const stocke = await AsyncStorage.getItem(cleStockage(householdId as string));
      if (!cancelled && stocke) setActiveChildIdState(stocke);
      await refreshChildren();
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [householdId, refreshChildren]);

  function setActiveChildId(id: string) {
    setActiveChildIdState(id);
    if (householdId) AsyncStorage.setItem(cleStockage(householdId), id);
  }

  return (
    <ActiveChildContext.Provider value={{ children: childrenList, activeChildId, setActiveChildId, refreshChildren }}>
      {reactChildren}
    </ActiveChildContext.Provider>
  );
}

export function useActiveChild(): ActiveChildContextValue {
  const ctx = useContext(ActiveChildContext);
  if (!ctx) throw new Error('useActiveChild doit être utilisé à l’intérieur de ActiveChildProvider');
  return ctx;
}
