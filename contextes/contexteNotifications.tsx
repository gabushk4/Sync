import React, { createContext, useContext, useEffect, useState } from "react";
import { useAPI } from "./contexteAPI";
import { useAccessToken } from "./contexteToken";
import log from "@/functions/log";
import catcher from "@/functions/catcher";
import { useAuth } from "./contexteAuth";
import AutoRefresh from "@/functions/autoRefresh";
import { AxiosInstance } from "axios";

export type NotificationPayload = {
    type: 'amis' | 'evenements';
    id_metier: string;
    actions?: any
}

export type Notification = {
    id: string;
    statut: string;
    statut_metier?: string;
    type: string;
    id_metier?: string;
    date_envoie: string;
    message: string;
    source_url: string;
    payload: NotificationPayload;
    [key: string]: any;
};

type NotificationsContextType = {
  notifRefresh: AutoRefresh | undefined;
  nonLues: number;
  notifications: Notification[];
};

export const NotificationsContexte = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    //log("notification provider render")
    const { api } = useAPI()
    const { state } = useAuth()

    const [notifRefresh, setNotifRefresh] = useState<AutoRefresh | undefined>()
    const [nonLues, setNonLues] = useState<number>(0)
    const [notifications, setNotifications] = useState<Notification[]>([])

    const onData = (data: any) => {
        //log('notifs onData', data)
        let nbNonLues = 0
        const listeNotifications: Notification[] = []
        for (const notif of (data.notifications || [])) {
            if (notif.statut === 'non_lue') nbNonLues += 1
           
            listeNotifications.push(notif)
        }

        setNonLues(nbNonLues)
        if (listeNotifications.length > 0) {
            setNotifications(listeNotifications)
        }
    }

    /* const enregistrerPushToken = async ()=>{
        
        if(!Device.isDevice){
          alert('notifications push requièrent un appareil physique')
          return
        }
    
        const {status: statusExistant} = await Notifs.getPermissionsAsync()
        let statusFinal = statusExistant
    
        if(statusExistant !== 'granted'){
          const {status} = await Notifs.requestPermissionsAsync()
          statusFinal = status
        }
    
        if(statusFinal !== 'granted'){
          alert('permission aux notifications push non-accordée')
          return
        }
    
        const pushToken = (await Notifs.getExpoPushTokenAsync()).data
        //log('pushToken', pushToken)
    
        try {
          const reponse = await api.post('/notifications/push_token', 
            {
              push_token: pushToken
            },
            {
              headers:{
                'Authorization':`Bearer ${accessToken}`
              }
            }
          )
          log('post push_token:', reponse.data)
        } catch (error) {
          catcher(error, 'problème survenu lors de l\'ouverture')
          setRouteInitiale('connexion')
        }
    } */

    useEffect(() => {
        log("use effect notificaions")
        if (notifRefresh){
            notifRefresh.stop()
            setNotifRefresh(undefined)
        }
        if (state === 'authenticated') {
            if (!notifRefresh || notifRefresh.isPaused()) {
                setNotifRefresh(new AutoRefresh(api, '/notifications', {
                    onError: (error) => {
                        log('erreur get notifs', error)
                        catcher(error, 'notifications introuvables')
                    },
                    onData: onData,
                    extraParams: {
                        resource: 'notifications'
                    }
                }))
            }
        }

        return () => {
            notifRefresh?.stop()
        }
    }, [state])

    const value: NotificationsContextType = { notifRefresh, nonLues, notifications }

    return (
        <NotificationsContexte.Provider value={value}>
            {children}
        </NotificationsContexte.Provider>
    )
}

export const useNotifications = () => {
    const ctx = useContext(NotificationsContexte)
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
    return ctx
}
