// contexts/AuthContext.tsx
import { authEvents } from '@/events/authEvents';
import catcher from '@/functions/catcher';
import log from '@/functions/log';
import { emptyTokens, setToken } from '@/functions/tokenStore';
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useMembre } from './contexteMembre';
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
            await emptyTokens(); // invalide tous les tokens            
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
            setToken(accessToken);
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
        await emptyTokens();

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