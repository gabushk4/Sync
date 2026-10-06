import { authEvents } from "@/events/authEvents";
import catcher from "@/functions/catcher";
import axios, { AxiosHeaders, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useRef } from "react";
import { useAccessToken } from "./contexteToken";

import { requestListener } from "@/events/requestEvents";
import { useMockMode } from "./contexteMockMode";

import { resolveMock } from "@/functions/resolveMock";

interface APIContextType {
  api: AxiosInstance;
  APIBaseURL: string;
}

interface AxiosRequestConfigWithRetry extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * User story 12: background request (e.g. AutoRefresh polling) that must not
     * show the global loading indicator, which would otherwise flash every few seconds.
     */
    silencieux?: boolean;
  }
}

export const APIContexte = createContext<APIContextType | undefined>(undefined);

export const APIProvider = ({ children }: { children: React.ReactNode }) => {
  //log("api provider render")
  const { setToken, getToken } = useAccessToken();  

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

  //crée une instance d'axios personnalisable pour nos besoins. 
  const api = axios.create({
    baseURL: APIBaseURL, // ainsi, pas besoin de spécifier APIBaseURL a chaque requêtes
    timeout: 10000, //pas besoin de spécifier un timeout 
  });

  const refreshPromiseRef = useRef<Promise<string> | null>(null); // mutexlock sur une requête de refresh de access token

  /**
   * permet de rafraichir un access token si jamais il est expiré
   * @returns fonction anonyme qui elle retourne un access token
   */
  const refreshAccessToken = async (): Promise<string> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current; // si une requête de refresh token est en cours, on ignore

    refreshPromiseRef.current = (async () => {
      const refreshToken = await SecureStore.getItemAsync('refresh_token'); 
      if (!refreshToken) throw new Error('Aucun refresh token'); // si le client n'a pas de refresh token, il ne s'est pas connecté. Envoyé vers un écran de connexion où le refresh token sera set

      const res = await axios.post(`${APIBaseURL}/token`, { refresh_token: refreshToken }); // base url spécifié pour évité que la fonction soit déclaré avant que api soit défini a 100%
      const { access_token } = res.data;
      await setToken(access_token); // refresh access token done
      return access_token; // retourne le token pour éviter une erreur de timing 
    })();

    try {
      return await refreshPromiseRef.current; // exécute la fonction en retournant son résultat
    } finally {
      refreshPromiseRef.current = null; // quand la fonction a fini son exécution, plus de requête de access token existe
    }
  };

  useEffect(() => {
    // un requestInterceptor est un callback qui s'exécute lors d'un appel API
    // User story 12: every setFetching(true) here is matched by one setFetching(false)
    // in the response interceptor (success or error, including an error thrown by
    // this callback), so the global loading indicator always ends. A 401 retry goes
    // through here again and counts as a new request.
    const requestInterceptor = api.interceptors.request.use(
      async (config) => {
        if (!config.silencieux)
          requestListener?.setFetching(true) //utile pour écouter si le client fait un appel

        if (config.method === 'GET' && !config.params?.resource)
          throw Error('cannot get without resource parameter')

        const token = await getToken()
        if (token)
          (config.headers as any).Authorization = `Bearer ${token}` // insère le access token a chaque requete pour pas qu'on ait a le faire

        return config
      },
      (error) => { // si une erreur survient à l'envoie de la requete
        if (!error?.config?.silencieux)
          requestListener?.setFetching(false)
        catcher(error, "erreur à l'envoie de la requête")
        return Promise.reject(error)
      }
    )

    // un responseInterceptor est un callback qui s'exécute lorsqu'une réponse API est retournée
    const responseInterceptor = api.interceptors.response.use(
      response => {
        if (!response.config.silencieux)
          requestListener?.setFetching(false) //utile pour écouter si le client ne fait plus appel
        return response; // retourne la réponse si aucune erreur est retournée
      },
      async error => { // si une erreur survient
        if (!error?.config?.silencieux)
          requestListener?.setFetching(false) //utile pour écouter si le client ne fait plus appel
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
          } catch (refreshError) { // si une erreur a lieu au moment du refresh
            await SecureStore.deleteItemAsync('refresh_token'); // c'est souvent parce que le refresh token est invalide
            // TODO: avoir une erreur spécifique pour un refresh token invalide pour ne pas l'invalider par une erreur qui n'a pas rapport
            setToken(null); // on déconnecte le membre donc on invalide son access token
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

    return () => {
      api.interceptors.request.eject(requestInterceptor)
      api.interceptors.response.eject(responseInterceptor)
    }
  }, [api, getToken, setToken, APIBaseURL])

  return (
    <APIContexte.Provider value={{ api, APIBaseURL }}>
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