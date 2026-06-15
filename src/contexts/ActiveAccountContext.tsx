import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { ConversionType } from '../types';

export interface ActiveAccount {
  id: string;
  account_id: string;
  account_name: string;
  display_name: string;
  conversion_type: ConversionType;
  platform: 'meta' | 'google';
  brand_id?: string;
  brand_name?: string;
}

interface ActiveAccountContextValue {
  activeAccount: ActiveAccount | null;
  setActiveAccount: (account: ActiveAccount | null) => void;
}

const ActiveAccountContext = createContext<ActiveAccountContextValue>({
  activeAccount: null,
  setActiveAccount: () => {},
});

const STORAGE_KEY = 'nextadsgen_active_account';

export const ActiveAccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeAccount, setActiveAccountState] = useState<ActiveAccount | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const setActiveAccount = (account: ActiveAccount | null) => {
    setActiveAccountState(account);
    if (account) localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    else localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ActiveAccountContext.Provider value={{ activeAccount, setActiveAccount }}>
      {children}
    </ActiveAccountContext.Provider>
  );
};

export const useActiveAccount = () => useContext(ActiveAccountContext);
