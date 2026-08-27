import axios, { AxiosHeaders, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { useAccessToken } from "./contexteToken";
import * as SecureStore from 'expo-secure-store';
import log from "@/functions/log";
import catcher from "@/functions/catcher";
import { useAuth } from "./contexteAuth";
import { authEvents } from "@/events/authEvents";
import Constants from 'expo-constants'

import { requestListener } from "@/events/requestEvents";
import { useMockMode } from "./contexteMockMode";

import { resolveMock } from "@/functions/resolveMock"

interface APIContextType {
  api: AxiosInstance;
  APIBaseURL: string;
}

interface AxiosRequestConfigWithRetry extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const APIContexte = createContext<APIContextType | undefined>(undefined);

export type Resource = 'notifications' | 'converssations' | 'evenements_membre' | 'evenements_amis' | 'evenement'

export const APIProvider = ({ children }: { children: React.ReactNode }) => {
  //log("api provider render")
  const { setToken, getToken } = useAccessToken();  
  const { isMockMode } = useMockMode()
  
  function getApiBaseUrl() {
    // hostUri ressemble à "192.168.1.42:8081"
    const hostUri = Constants.expoConfig?.hostUri
    
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return process.env.USING_REMOTE
        ? 'https://dev.syncalkemy.ca'
        : `http://${ip}:3100`;
    }
    
    // fallback si jamais hostUri est absent (build de prod, etc.)
    return process.env.NODE_ENV === 'development'
      ? 'https://dev.syncalkemy.ca'
      : 'https://syncalkemy.ca'
  }

  const APIBaseURL = getApiBaseUrl()
    

  const api = axios.create({
    baseURL: APIBaseURL,
    timeout: 10000,
  });

  let refreshPromise: Promise<string> | null = null;

  const refreshAccessToken = async (): Promise<string> => {
    //blocks any other refreshToken request if one is on going
    if (refreshPromise) return refreshPromise; 

    refreshPromise = (async () => { //Mutex
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) throw new Error('Aucun refresh token');

      const res = await axios.post(`${APIBaseURL}/token`, { refresh_token: refreshToken });
      const { access_token } = res.data;
      await setToken(access_token);
      return access_token;
    })();

    try {
      return await refreshPromise; //returns the mutex
    } finally {
      refreshPromise = null; 
    }
  };

  const mockAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const mock = resolveMock(config.method?.toUpperCase() ?? 'GET' , config.url??'', config.data);

    await new Promise(r => setTimeout(r, 300)); // latence simulée

    if (mock === null) {
      // simule une vraie erreur axios, avec la même forme qu'une erreur réseau
      return Promise.reject({
        isAxiosError: true,
        response: { status: 404, data: { message: 'Mock non défini' } },
        config,
      });
    }

    return {
      data: mock,
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config,
    };
  }

  api.interceptors.request.use(
    async (config) => {
      requestListener?.setFetching(true)
      
      if (config.method === 'GET' && !config.params?.resource)
        throw Error('cannot get without resource parameter')      
      
      const token = await getToken()
      if(token)
        config.headers.Authorization = `Bearer ${token}`

      if (isMockMode)
        config.adapter = mockAdapter

      return config
    },
    (error) => {
      requestListener?.setFetching(false)
      catcher(error, "erreur à l'envoie de la requête")
    }
  )

  api.interceptors.response.use(
    response => {
      //console.log('res:',response.config.url, response.status)
      requestListener?.setFetching(false)     
      return response;
    },
    async error => {
      requestListener?.setFetching(false)
      const requeteOriginale: AxiosRequestConfigWithRetry = error.config;

      if (!error.response) {
        return Promise.reject(error)
      };

      if (requeteOriginale.url?.includes('/token')) {
        return Promise.reject(error);
      }

      if ((error.response.status === 401) && !requeteOriginale._retry) {
        requeteOriginale._retry = true;

        try {
          const access_token = await refreshAccessToken()

          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          if (requeteOriginale.headers) {
            requeteOriginale.headers['Authorization'] = `Bearer ${access_token}`;
          }

          return api(requeteOriginale);
        } catch (refreshError) {
          await SecureStore.deleteItemAsync('refresh_token');
          setToken(null);
          authEvents.emitUnauthorized()
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );

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