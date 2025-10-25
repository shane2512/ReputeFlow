"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

export type UserRole = 'freelancer' | 'client' | null;

interface UserContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  showRoleSelection: boolean;
  setShowRoleSelection: (show: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRoleState] = useState<UserRole>(null);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const { address, isConnected } = useAccount();

  // Load role from localStorage
  useEffect(() => {
    if (address) {
      const savedRole = localStorage.getItem(`userRole_${address}`) as UserRole;
      if (savedRole) {
        setUserRoleState(savedRole);
      } else if (isConnected) {
        // Show role selection if connected but no role set
        setShowRoleSelection(true);
      }
    }
  }, [address, isConnected]);

  // Save role to localStorage
  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
    if (address && role) {
      localStorage.setItem(`userRole_${address}`, role);
    }
    setShowRoleSelection(false);
  };

  // Reset role when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setUserRoleState(null);
      setShowRoleSelection(false);
    }
  }, [isConnected]);

  return (
    <UserContext.Provider value={{ userRole, setUserRole, showRoleSelection, setShowRoleSelection }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
