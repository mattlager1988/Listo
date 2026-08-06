import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../services/api';

interface User {
  sysId: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
  mfaEnabled: boolean;
  sidebarCollapsed: boolean;
  modules: string[];
  profilePhoto?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requiresMfa: boolean; mfaToken?: string }>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/users/me');
      setUser(response.data);
    } catch {
      // Session expiration is disabled: keep any existing session and tokens on
      // a failed /users/me so transient errors never log the user out.
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await refreshUser();
      }
      if (mounted) {
        setIsLoading(false);
      }
    };
    initAuth();
    return () => { mounted = false; };
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    // Send this device's trusted-device token (if any) so a device that has
    // already passed MFA within the window can skip it.
    const deviceToken = localStorage.getItem('trustedDeviceToken');
    const response = await api.post('/auth/login', { email, password, deviceToken });

    if (response.data.requiresMfa) {
      return { requiresMfa: true, mfaToken: response.data.mfaToken };
    }

    const { accessToken, refreshToken } = response.data.tokens;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    await refreshUser();

    return { requiresMfa: false };
  };

  const verifyMfa = async (mfaToken: string, code: string) => {
    const response = await api.post('/auth/mfa/verify', { mfaToken, code });
    const { accessToken, refreshToken } = response.data.tokens;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    // Remember this device so future logins skip MFA until the token expires.
    if (response.data.deviceToken) {
      localStorage.setItem('trustedDeviceToken', response.data.deviceToken);
    }
    await refreshUser();
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // Ignore errors during logout
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        verifyMfa,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
