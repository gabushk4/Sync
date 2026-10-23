import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import type { ConfigOAuthGoogle } from '@/functions/googleAgenda';

/**
 * Flux OAuth Google côté application.
 *
 * L'app n'a qu'un rôle : obtenir le code d'autorisation. C'est l'API qui détient
 * le client_secret, échange le code contre les jetons et chiffre le refresh token.
 * L'app ne voit donc jamais de secret — seulement un code à usage unique.
 *
 * Le `client_id` et le `redirect_uri` sont fournis par l'API (GET /comptes/google/config) :
 * ils doivent être exactement les mêmes des deux côtés, sinon Google refuse
 * l'échange du code.
 *
 * @author Gabriel Pereira Levesque US-19 — import Google Agenda
 */

const ISSUER_GOOGLE = 'https://accounts.google.com';

/** Le code d'autorisation et son vérificateur PKCE. */
export type CodeAutorisation = {
    code: string;
    code_verifier?: string;
};

/** Levée quand l'API n'expose pas une configuration OAuth exploitable. */
export class ConfigurationOAuthInvalide extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigurationOAuthInvalide';
    }
}

/**
 * Lance le consentement Google et renvoie le code d'autorisation.
 *
 * @returns le code, ou null si l'utilisateur a fermé la fenêtre sans valider.
 * @throws ConfigurationOAuthInvalide si la configuration servie par l'API est incomplète.
 * @throws Error si Google refuse l'autorisation.
 */
export async function demanderCodeGoogle(config: ConfigOAuthGoogle): Promise<CodeAutorisation | null> {
    if (!config?.client_id) {
        throw new ConfigurationOAuthInvalide("identifiant client OAuth manquant");
    }
    if (!config?.redirect_uri) {
        throw new ConfigurationOAuthInvalide("URI de redirection OAuth manquante");
    }
    if (!config?.scopes?.length) {
        throw new ConfigurationOAuthInvalide("portées OAuth manquantes");
    }

    // Sur le web, la fenêtre d'autorisation doit être explicitement refermée.
    if (Platform.OS === 'web') {
        WebBrowser.maybeCompleteAuthSession();
    }

    const discovery = await AuthSession.resolveDiscoveryAsync(ISSUER_GOOGLE);

    const request = await AuthSession.loadAsync(
        {
            clientId: config.client_id,
            redirectUri: config.redirect_uri,
            scopes: config.scopes,
            responseType: AuthSession.ResponseType.Code,
            extraParams: {
                // hors ligne + consentement forcé : c'est ce qui fait que Google
                // renvoie un refresh_token (donc un import durable côté Sync).
                access_type: 'offline',
                prompt: 'consent',
            },
        },
        discovery,
    );

    const resultat = await request.promptAsync(discovery);

    if (resultat.type !== 'success') {
        if (resultat.type === 'error') {
            throw new Error(resultat.error?.message ?? 'autorisation Google refusée');
        }
        return null; // annulé ou fenêtre fermée
    }

    const code = resultat.params?.code;
    if (!code) {
        throw new Error('Google n\'a pas renvoyé de code d\'autorisation');
    }

    return { code, code_verifier: request.codeVerifier };
}
