import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";

type AccessTokenContextType = {
  getToken: () => Promise<string | null | undefined>;
  setToken: (token: string | null) => Promise<void>;
  expirationAccessToken: number;
  expirationRefreshToken: number;
  resetTokens: () => Promise<void>;
};

const AccessTokenContexte = createContext<AccessTokenContextType | undefined>(undefined);

export const AccessTokenProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null | undefined>(undefined);
  const expirationAccessToken = 60 * 60 * 1000; //1h
  const expirationRefreshToken = 30 * 24 * 60 * 60 * 1000; //30 jours

  const getToken = async () => {
    let token = accessToken;
    if (!token) {
      token = await SecureStore.getItemAsync('access_token');
      setAccessToken(token);
    }
    return token;
  };

  const setToken = async (token: string | null) => {
    if (token) {
      await SecureStore.setItemAsync('access_token', token);
      setAccessToken(token);
    } else {
      await SecureStore.deleteItemAsync('access_token');
      setAccessToken(null);
    }
  };

  const resetTokens = async () => {
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('access_token');
    setAccessToken(null);
  };

  useEffect(() => {}, [accessToken]);

  return (
    <AccessTokenContexte.Provider value={{ getToken, setToken, expirationAccessToken, expirationRefreshToken, resetTokens }}>
      {children}
    </AccessTokenContexte.Provider>
  );
};

export const useAccessToken = (): AccessTokenContextType => {
  const ctx = useContext(AccessTokenContexte);
  if (!ctx) throw new Error('useAccessToken must be used within an AccessTokenProvider');
  return ctx;
};

export default AccessTokenContexte;
