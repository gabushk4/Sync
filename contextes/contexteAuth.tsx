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

/**
 * Permet de donner le contexte pour l'authetification d'un membre
 * @param param0 ReactNode
 * @returns
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const { setToken, resetTokens } = useAccessToken();
    const { getMembre, resetMembre, setMockMembre } = useMembre();
    const { isMockMode } = useMockMode()    

    const [state, setState] = useState<AuthState>('loading');

    // Vérifie si le membre est connecté ou non
    const checkAuth = async () => {
        try {
            const refreshToken = await SecureStore.getItemAsync('refresh_token');

            if (!refreshToken) {
                log('AuthContext: aucun refresh token, non authentifié');
                setState('unauthenticated');
                return;
            }
            
            await getMembre(); // fetch les infos du membre connecté
            setState('authenticated');
        } catch (error: any) {
            log('AuthContext: échec de la vérification, déconnexion', error?.message);
            await resetTokens(); // invalide tous les tokens
            resetMembre(); // invalide les infos du membre
            setState('unauthenticated');
        }
    }
    

    useEffect(() => {  
        // abonnement à l'évènement Unauthorized
        const unsubscribe = authEvents.onUnauthorized(() => {
            signOut(); 
        });
        return unsubscribe;        
    }, []);

    // au lancement de l'app
    useEffect(() => {
        checkAuth();
    }, [])

    /**
     * permet de lancer la requête pour connecter le membre
     * @param accessToken du membre connecté
     * @param refreshToken du membre connecté
     */
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

    /**
     * Permet de déconnecter le membre.
     * The state flips first: that unmounts the tabs and stops the pollers
     * (notifications, events) before the tokens disappear. In the old order,
     * a poll firing in between went out without a token, got a 401, and
     * showed a "conflit détecté / Un token est nécessaire" toast.
     *
     * @returns {Promise<void>}
     */
    const signOut = async () => {
        setState('unauthenticated');
        resetMembre();
        await resetTokens();
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