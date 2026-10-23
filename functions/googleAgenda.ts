import type { AxiosInstance } from 'axios';

import { getToken } from '@/functions/tokenStore';

/**
 * Client de l'intégration Google Agenda.
 *
 * Le serveur reste la source de vérité : l'app ne connaît ni le secret OAuth,
 * ni les jetons Google. Elle ne fait que :
 *  - demander la configuration OAuth publique (client_id, redirect_uri, portées) ;
 *  - lister les comptes et les calendriers du membre ;
 *  - envoyer la sélection (PUT /calendriers/google, idempotent) ;
 *  - suivre l'import en temps réel (SSE) avec repli sur le polling.
 *
 * @author US-19 — import Google Agenda
 */

/** Statuts possibles d'un compte externe. */
export type StatutCompte = 'actif' | 'deconnecte' | 'erreur';

/** Un compte Google lié au membre. */
export type CompteGoogle = {
    id: string;
    fournisseur: string;
    id_externe: string;
    courriel: string | null;
    statut: StatutCompte;
    temps_creation: string;
    derniere_erreur: string | null;
    /** vrai quand l'utilisateur doit reconnecter son compte (jeton révoqué, déconnecté…) */
    a_reconnecter: boolean;
};

/** Un calendrier Google proposé à l'utilisateur. */
export type CalendrierGoogle = {
    source: 'google';
    /** identifiant public du compte propriétaire */
    id_compte: string;
    /** identifiant natif du calendrier chez Google : c'est lui qu'on renvoie au serveur */
    id_externe: string;
    /** identifiant public Sync du calendrier, null tant qu'il n'est pas sélectionné */
    id_publique: string | null;
    nom: string;
    couleur: string | null;
    /** déjà importé dans Sync */
    actif: boolean;
    /** calendrier principal du compte, proposé par défaut */
    suggere: boolean;
    /** false quand le calendrier est déjà lié à un autre compte */
    disponible: boolean;
    lie_a_autre_compte: boolean;
};

/** Statut d'un groupe d'import. */
export type StatutImport = 'en_cours' | 'termine' | 'erreur';

/** Un import de calendrier (un job = un calendrier). */
export type JobImport = {
    id: string;
    groupId: string;
    lane: string;
    /** nom du calendrier, pour afficher la progression par calendrier */
    label: string | null;
    done: boolean;
    success: boolean | null;
    error: string | null;
};

/** La progression d'un groupe d'import. */
export type ProgressionImport = {
    groupId: string;
    total: number;
    done: number;
    statut: StatutImport;
    jobs: JobImport[];
};

/** La réponse de GET /calendriers/google. */
export type ReponseCalendriersGoogle = {
    comptes: { id: string; courriel: string | null; statut: StatutCompte; a_reconnecter: boolean }[];
    calendriers: CalendrierGoogle[];
    comptes_en_erreur: string[];
};

/** Plateformes pour lesquelles la console Google a un client OAuth dédié. */
export type PlateformeOAuth = 'ios' | 'android';

/** La configuration OAuth publique, servie par l'API. */
export type ConfigOAuthGoogle = {
    client_id: string;
    redirect_uri: string | null;
    scopes: string[];
    plateforme?: string;
};

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Récupère la configuration OAuth publique (client_id, redirect_uri, portées).
 * @param plateforme - 'ios' ou 'android' pour obtenir le client de la plateforme ;
 *   sans argument, l'API renvoie son client par défaut.
 */
export async function chargerConfigGoogle(
    api: AxiosInstance,
    plateforme?: PlateformeOAuth,
): Promise<ConfigOAuthGoogle> {
    const { data } = await api.get<ConfigOAuthGoogle>('/comptes/google/config', {
        params: plateforme ? { platform: plateforme } : undefined,
    });
    return data;
}

/** Liste les comptes Google liés au membre. */
export async function chargerComptesGoogle(api: AxiosInstance): Promise<CompteGoogle[]> {
    const { data } = await api.get<{ comptes: CompteGoogle[] }>('/comptes/', { params: { fournisseur: 'google' } });
    return data.comptes ?? [];
}

/** Liste les comptes et les calendriers Google du membre. */
export async function chargerCalendriersGoogle(api: AxiosInstance): Promise<ReponseCalendriersGoogle> {
    const { data } = await api.get<ReponseCalendriersGoogle>('/calendriers/google');
    return data;
}

/**
 * Envoie la sélection de calendriers. L'action est idempotent : le tableau reçu
 * fait foi, un calendrier absent est désactivé (ses événements sont marqués
 * `deleted_at`, pas effacés).
 * @returns l'identifiant du job d'import (null si rien n'était à importer) et le
 * nombre de calendriers retirés.
 */
export async function selectionnerCalendriersGoogle(
    api: AxiosInstance,
    idsExternes: string[],
): Promise<{ jobId: string | null; calendriersDesactives: number }> {
    const { data } = await api.put<{ job_id: string | null; calendriers_desactives?: number }>(
        '/calendriers/google',
        { calendar_ids: idsExternes },
    );
    return { jobId: data.job_id ?? null, calendriersDesactives: data.calendriers_desactives ?? 0 };
}

/** Relance l'import d'un calendrier déjà sélectionné. */
export async function resynchroniserCalendrierGoogle(api: AxiosInstance, idPublique: string): Promise<string> {
    const { data } = await api.post<{ job_id: string }>(`/calendriers/syncroniser/${idPublique}`);
    return data.job_id;
}

/** Déconnecte un compte Google : ses calendriers sont désactivés et ses événements retirés. */
export async function deconnecterCompteGoogle(api: AxiosInstance, idPublique: string): Promise<void> {
    await api.post(`/comptes/deconnexion/${idPublique}`);
}

/**
 * Envoie le code d'autorisation à l'API, qui l'échange contre les jetons Google.
 *
 * Le `client_id` est renvoyé avec le code : l'API en déduit le client_secret
 * correspondant (le code et le refresh_token sont liés au client qui les a
 * obtenus). Le secret ne transite jamais par l'app.
 */
export async function connecterCompteGoogle(
    api: AxiosInstance,
    code: string,
    codeVerifier?: string,
    clientId?: string,
): Promise<void> {
    await api.post('/comptes/google/connexion', {
        server_auth_code: code,
        code_verifier: codeVerifier,
        client_id: clientId,
    });
}

/**
 * Extrait les objets de progression des blocs SSE reçus.
 * Le serveur envoie `event: status` puis `data: {…}` ; les lignes de commentaire
 * (`: keep-alive`) sont ignorées.
 */
export function extraireProgression(bloc: string): ProgressionImport[] {
    const progressions: ProgressionImport[] = [];
    for (const evenement of bloc.split('\n\n')) {
        const ligne = evenement.split('\n').find(l => l.startsWith('data:'));
        if (!ligne) continue;
        try {
            progressions.push(JSON.parse(ligne.slice('data:'.length).trim()) as ProgressionImport);
        } catch {
            // bloc tronqué ou commentaire : on l'ignore
        }
    }
    return progressions;
}

/**
 * Ouvre le flux SSE de suivi d'import.
 *
 * React Native ne fournit pas de `Response.body` (le polyfill de `fetch` passe par
 * XMLHttpRequest et n'expose pas de flux) : on lit donc `xhr.responseText` au fil
 * de l'eau via `onprogress`.
 */
function ouvrirFluxSse(
    url: string,
    surProgression: (progression: ProgressionImport) => void,
    surEchec: () => void,
): XMLHttpRequest {
    const xhr = new XMLHttpRequest();
    let consomme = 0;

    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onprogress = () => {
        if (xhr.status >= 400) {
            surEchec();
            return;
        }
        const texte = xhr.responseText ?? '';
        if (texte.length <= consomme) return;
        // on ne traite que les blocs complets (terminés par une ligne vide)
        const fin = texte.lastIndexOf('\n\n');
        if (fin === -1) return;
        const bloc = texte.slice(consomme, fin + 2);
        consomme = fin + 2;
        for (const progression of extraireProgression(bloc)) surProgression(progression);
    };

    xhr.onerror = () => surEchec();
    xhr.onabort = () => { /* annulation volontaire */ };
    xhr.onload = () => {
        // le flux se termine quand l'import est terminé : s'il se ferme avant
        // l'événement final, le repli polling prend le relais (sinon l'écran
        // resterait bloqué sur « en cours »).
        surEchec();
    };

    xhr.send();
    return xhr;
}

/**
 * Suit un import en temps réel et appelle `onFin` une seule fois.
 *
 * @returns une fonction d'annulation (à appeler au démontage de l'écran).
 */
export function suivreImportGoogle(
    api: AxiosInstance,
    jobId: string,
    handlers: {
        onProgression: (progression: ProgressionImport) => void;
        onFin: (progression: ProgressionImport) => void;
    },
): () => void {
    let annule = false;
    let repliLance = false;
    let xhr: XMLHttpRequest | null = null;

    const finir = (progression: ProgressionImport) => {
        if (annule) return;
        annule = true;
        handlers.onFin(progression);
    };

    const traiter = (progression: ProgressionImport) => {
        if (annule) return;
        handlers.onProgression(progression);
        if (progression.statut && progression.statut !== 'en_cours') finir(progression);
    };

    /** Repli : on interroge l'API toutes les 2 secondes. */
    const suivreParPolling = async () => {
        while (!annule) {
            try {
                const { data } = await api.get<ProgressionImport>(`/calendriers/imports/${jobId}`);
                traiter(data);
            } catch {
                // le job a disparu (serveur redémarré) : on ne peut plus suivre
                finir({ groupId: jobId, total: 0, done: 0, statut: 'erreur', jobs: [] });
                return;
            }
            if (annule) return;
            await pause(2000);
        }
    };

    /** Bascule sur le polling, une seule fois. */
    const basculerSurPolling = () => {
        if (annule || repliLance) return;
        repliLance = true;
        void suivreParPolling();
    };

    // Sans jeton en mémoire, le flux SSE ne peut pas être authentifié : on part
    // directement sur le polling, dont l'appel axios rafraîchit le jeton si besoin.
    if (!getToken()) {
        basculerSurPolling();
    } else {
        const base = api.defaults.baseURL ?? '';
        xhr = ouvrirFluxSse(
            `${base}/calendriers/imports/${jobId}/events`,
            traiter,
            basculerSurPolling,
        );
    }

    return () => {
        annule = true;
        xhr?.abort();
    };
}
