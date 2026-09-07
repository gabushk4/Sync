// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAccessToken } from './contexteToken';
import { useMembre } from './contexteMembre';
import log from '@/functions/log'; 
import catcher from '@/functions/catcher';
import { authEvents } from '@/events/authEvents';
import { useMockMode } from './contexteMockMode';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextType = {
  state: AuthState;
  signIn: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  recheckAuth: () => Promise<void>;
};

const AuthContexte = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const { setToken, resetTokens } = useAccessToken();
    const { getMembre, resetMembre, setMockMembre } = useMembre();
    const { isMockMode } = useMockMode()    

    const [state, setState] = useState<AuthState>('loading');

    const checkAuth = async () => {
        if (isMockMode) {
            setMockMembre()
            setState("authenticated")            
        } else {
            try {
                const refreshToken = await SecureStore.getItemAsync('refresh_token');

                if (!refreshToken) {
                    log('AuthContext: aucun refresh token, non authentifié');
                    setState('unauthenticated');
                    return;
                }
                
                await getMembre();
                setState('authenticated');
            } catch (error: any) {
                log('AuthContext: échec de la vérification, déconnexion', error?.message);
                await resetTokens();
                resetMembre();
                setState('unauthenticated');
            }
        }
    };

    useEffect(() => {        
        const unsubscribe = authEvents.onUnauthorized(() => {
            signOut();
        });
        return unsubscribe;        
    }, []);

    useEffect(() => {
        checkAuth();
    }, [isMockMode])

    const signIn = async (accessToken: string, refreshToken: string) => {
        console.log("sign in")
        try {
            await setToken(accessToken);
            await SecureStore.setItemAsync('refresh_token', refreshToken);
            await getMembre();
            setState('authenticated');
        } catch (err) {
            catcher(err, 'connexion impossible')
            setState('unauthenticated')
        }
    };

    const signOut = async () => {
        await resetTokens();
        resetMembre();
        setState('unauthenticated');
    };

    return (
        <AuthContexte.Provider value={{ state, signIn, signOut, recheckAuth: checkAuth }}>
            {children}
        </AuthContexte.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const ctx = useContext(AuthContexte);
    if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
    return ctx;
};