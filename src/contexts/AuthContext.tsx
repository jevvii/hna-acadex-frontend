import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Profile } from '@/types';
import { api, clearAuthTokens, setAuthTokens, ApiError } from '@/lib/api';

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const data = await api.get('/auth/me/');
      setUser(data as Profile);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        await clearAuthTokens();
      }
    }
  };

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const data = await api.post('/auth/login/', { email, password }, false);
    await setAuthTokens(data.access, data.refresh);
    setUser(data.user as Profile);
  };

  const signOut = async () => {
    await clearAuthTokens();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const data = await api.patch(`/profiles/${user.id}/`, updates);
    setUser(data as Profile);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
