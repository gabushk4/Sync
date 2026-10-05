import React, { createContext, useContext, useEffect, useState } from "react";
import { useAPI } from "./contexteAPI";
import { useAccessToken } from "./contexteToken";
import log from "@/functions/log";
import catcher from "@/functions/catcher";
import { useAuth } from "./contexteAuth";
import AutoRefresh from "@/functions/autoRefresh";
import { AxiosInstance } from "axios";

/** Accept/refuse button of a notification (see the API's constants/*Actions.js). */
export type NotificationAction = {
    label: 'accepter' | 'refuser' | string;
    method: string;
    url: string;
    body: any;
}

/**
 * One notification, as returned by GET /notifications. The business fields
 * (`statut_metier`, `actions`, `details`, `expiration`) are resolved live by the
 * API from the related invitation / friend request, not frozen at send time.
 * Shape updated for user story 9 (it used to read these from a `payload` the API
 * no longer sends). SUBJECT TO CHANGE: may be revised depending on how teammates
 * implement their own user stories.
 */
export type Notification = {
    id: string;
    /** Read state of the notification itself. */
    statut_notification: 'non_lue' | 'lue';
    /** e.g. 'invitation_evenement', 'demande_ami', 'evenements', 'messages'. */
    type: string | null;
    /** Status of the related invitation / request: 'en_attente' | 'acceptee' | 'refusee', or null. */
    statut_metier: string | null;
    /** Empty once answered or expired. */
    actions: NotificationAction[];
    details: { [key: string]: any } | null;
    /** UTC ISO date, 'expired', or null. */
    expiration: string | null;
    date_envoie: string;
    message: string;
    source_url: { method: string, url: string };
};

/**
 * Whether a notification is an event invitation the member refused. Those are
 * kept out of the main list and shown on their own page (user story 9).
 *
 * @param {Notification} notif
 * @returns {boolean}
 */
export const estInvitationRefusee = (notif: Notification) =>
    notif.type === 'invitation_evenement' && notif.statut_metier === 'refusee'

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
        // No `notifications` key means "unchanged since last_checked": keep the current list.
        // (It used to skip empty lists too, so deleting the last notification never cleared it.)
        if (!Array.isArray(data.notifications)) return

        let nbNonLues = 0
        const listeNotifications: Notification[] = []
        for (const notif of data.notifications) {
            // User story 9: the API sends `statut_notification` (it used to be `statut`).
            if (notif.statut_notification === 'non_lue') nbNonLues += 1

            listeNotifications.push(notif)
        }

        setNonLues(nbNonLues)
        setNotifications(listeNotifications)
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
