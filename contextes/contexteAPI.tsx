import { authEvents } from "@/events/authEvents";
import catcher from "@/functions/catcher";
import { emptyTokens, getToken, setToken } from "@/functions/tokenStore";
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useMemo } from "react";

import { requestListener } from "@/events/requestEvents";


interface APIContextType {
  api: AxiosInstance;
  APIBaseURL: string;
}

interface AxiosRequestConfigWithRetry extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let inFlight = 0

const track = (delta: number) => {
  inFlight += delta
  requestListener?.setFetching(inFlight > 0)
}

export const APIContexte = createContext<APIContextType | undefined>(undefined);

/** Utilitaire interne seulement. Sert à savoir à quelle url le serveur se base. 
 * Utilise la variable d'environnement EXPO_PUBLIC_USING_REMOTE pour savoir si le client fetch au niveau local ou sur l'internet publique.
 * Utilise la var. d'env. NODE_ENV pour savoir si on fetch sur le serveur de dev ou de prod. 
 * La variable NODE_ENV est manipulé strictement par React.
 *  */
function getApiBaseUrl() {
  // hostUri ressemble à "192.168.1.42:8081"
  const hostUri = Constants.expoConfig?.hostUri
  
  if (hostUri) {
    const ip = hostUri.split(':')[0]; //prendre lip seulement [ip, port]
    return process.env.EXPO_PUBLIC_USING_REMOTE === 'true'
      ? 'https://dev.syncalkemy.ca'
      : `http://${ip}:3100`;
  }
  
  // fallback si jamais hostUri est absent (build de prod, etc.)
  return process.env.NODE_ENV === 'development'
    ? 'https://dev.syncalkemy.ca'
    : 'https://syncalkemy.ca'
}

const APIBaseURL = getApiBaseUrl()  



export const APIProvider = ({ children }: { children: React.ReactNode }) => {
  //log("api provider render")
  
  let refreshPromiseRef: Promise<string> | null = null; // mutexlock sur une requête de refresh de access token

  /**
 * permet de rafraichir un access token si jamais il est expiré
 * @returns fonction anonyme qui elle retourne un access token
 */
  const refreshAccessToken = async (): Promise<string> => {
    if (refreshPromiseRef) return refreshPromiseRef; // si une requête de refresh token est en cours, on ignore

    refreshPromiseRef = (async () => {
      const refreshToken = await SecureStore.getItemAsync('refresh_token'); 
      if (!refreshToken) throw new Error('Aucun refresh token'); // si le client n'a pas de refresh token, il ne s'est pas connecté. Envoyé vers un écran de connexion où le refresh token sera set

      const res = await axios.post(`${APIBaseURL}/token`, { refresh_token: refreshToken }); // base url spécifié pour évité que la fonction soit déclaré avant que api soit défini a 100%
      const { access_token } = res.data;
      setToken(access_token); // refresh access token done
      return access_token; // retourne le token pour éviter une erreur de timing 
    })();

    try {
      return await refreshPromiseRef; // exécute la fonction en retournant son résultat
    } finally {
      refreshPromiseRef = null; // quand la fonction a fini son exécution, plus de requête de access token existe
    }
  };

  //crée une instance d'axios personnalisable pour nos besoins. 
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: APIBaseURL, // ainsi, pas besoin de spécifier APIBaseURL a chaque requêtes
      timeout: 10000, //pas besoin de spécifier un timeout 
    });

    instance.interceptors.request.use(
      async (config) => {
        track(+1)
        const token = getToken()
        if (token) config.headers.Authorization = `Bearer ${token}`
        return config
      },
      (error) => { // si une erreur survient à l'envoie de la requete
        track(-1)
        catcher(error, "erreur à l'envoie de la requête")
        return Promise.reject(error)
      }
    )

    instance.interceptors.response.use(
      response => {
        track(-1)
        return response; // retourne la réponse si aucune erreur est retournée
      },
      async error => { // si une erreur survient
        track(-1)
        const requeteOriginale: AxiosRequestConfigWithRetry = error.config;
        console.log("error response", error.response)

        if (!error.response) {
          return Promise.reject(error)
        };

        if (requeteOriginale.url?.includes('/token')) {
          return Promise.reject(error);
        }

        if ((error.response.status === 401) && !requeteOriginale._retry) { // si un 401 est retourné (Access token invalide) et qu'on est pas en train de retry
          requeteOriginale._retry = true; // on dit qu'on va retry

          try {
            const access_token = await refreshAccessToken() // on refresh l'access token

            api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`; // insère le nouveau token
            if (requeteOriginale.headers) {
              (requeteOriginale.headers as any)['Authorization'] = `Bearer ${access_token}`; // insère le nouveau token dans les headers s'il y a lieu
            }

            return api(requeteOriginale); //continue la requete originale
          } catch { // si une erreur a lieu au moment du refresh
            await SecureStore.deleteItemAsync('refresh_token'); // c'est souvent parce que le refresh token est invalide
            // TODO: avoir une erreur spécifique pour un refresh token invalide pour ne pas l'invalider par une erreur qui n'a pas rapport
            await emptyTokens()
            authEvents.emitUnauthorized()
            // The member is being sent to the login screen: flag the error so
            // catcher() doesn't also show a toast for it (see catcher.js).
            error.deconnecte = true
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    )

    return instance

  }, []) 

  const value = useMemo(()=> ({api, APIBaseURL}), [api])

  return (
    <APIContexte.Provider value={value}>
      {children}
    </APIContexte.Provider>
  );
};

/**
 * Offre api de type axios avec un interceptor et APIBaseURL de type string
 * @returns {AxiosInstance} api
 * @returns {string} APIBaseURL
 */
export const useAPI = (): APIContextType => {
  const context = useContext(APIContexte);
  if (!context) {
    throw new Error('useAPI doit être utilisé à l\'intérieur d\'un APIProvider');
  }
  return context;
};