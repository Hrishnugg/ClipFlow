'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
// import { getTeamsForUser } from '@/firebase/firestore';
import { useAuth } from './AuthContext';

interface TeamContextType {
  refreshTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  useAuth();
  
  const refreshTeams = useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refresh-teams'));
    }
  }, []);

  return (
    <TeamContext.Provider value={{ refreshTeams }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
