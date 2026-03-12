import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Profile } from '@/types';
import { api, clearAuthTokens, setAuthTokens, ApiError, authApi } from '@/lib/api';

interface SignInResult {
  requiresSetup: boolean;
  user: Profile;
}

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  completeSetup: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => ({ requiresSetup: false, user: {} as Profile }),
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: async () => {},
  completeSetup: async () => {},
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

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    const data = await api.post('/auth/login/', { email, password }, false);
    await setAuthTokens(data.access, data.refresh);
    const userData = data.user as Profile;
    setUser(userData);
    return {
      requiresSetup: userData.requires_setup ?? false,
      user: userData,
    };
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

  const completeSetup = async (newPassword: string) => {
    await authApi.changePassword(newPassword);
    // Update user to reflect completed setup
    if (user) {
      setUser({ ...user, requires_setup: false });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshProfile, updateProfile, completeSetup }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
