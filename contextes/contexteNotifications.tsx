import React, { createContext, useContext, useEffect, useState } from "react";
import { useAPI } from "./contexteAPI";
import log from "@/functions/log";
import catcher from "@/functions/catcher";
import { useAuth } from "./contexteAuth";
import AutoRefresh from "@/functions/autoRefresh";

/** Accept/refuse button of a notification (see the API's constants/*Actions.js). */
export type NotificationAction = {
    label: 'accepter' | 'refuser' | string;
    method: string;
    url: string;
    body: any;
    icon?: string;
}

/**
 * One notification, after its API payload has been normalized for the UI.
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
    icon?: string;
    payload?: Record<string, any> | null;
};

/** Normalize the API's payload envelope while retaining legacy top-level fields. */
export function normaliserNotification(notif: any): Notification {
    const payload = notif?.payload && typeof notif.payload === 'object' ? notif.payload : {};
    const source = { ...payload, ...notif };
    const actionsPayload = payload.actions ?? notif.actions;
    let actions: NotificationAction[] = [];

    if (Array.isArray(actionsPayload)) {
        actions = actionsPayload.map((action: any) => ({
            ...action,
            label: action.label ?? action.action ?? action.type,
            method: action.method ?? action.methode ?? 'POST',
            url: action.url ?? action.href,
            body: action.body ?? action.data,
            icon: action.icon ?? action.icone ?? action.icon_name,
        })).filter((action: NotificationAction) => action.label && action.url);
    } else {
        // Some API payloads expose accept/refuse endpoints as separate entries.
        for (const label of ['accepter', 'refuser'] as const) {
            const action = payload[label] ?? notif[label];
            if (!action || typeof action !== 'object') continue;
            actions.push({
                ...action,
                label,
                method: action.method ?? action.methode ?? 'POST',
                url: action.url ?? action.href,
                body: action.body ?? action.data,
                icon: action.icon ?? action.icone ?? action.icon_name,
            });
        }
    }

    return {
        ...source,
        type: source.type ?? source.notification_type ?? null,
        statut_metier: source.statut_metier ?? source.statut ?? null,
        statut_notification: source.statut_notification ?? 'lue',
        actions,
        details: source.details ?? null,
        expiration: source.expiration ?? null,
        message: source.message ?? '',
        icon: source.icon ?? source.icone ?? source.icon_name,
        payload: notif?.payload ?? null,
    } as Notification;
}

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
            const notification = normaliserNotification(notif)
            if (notification.statut_notification === 'non_lue') nbNonLues += 1
            listeNotifications.push(notification)
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
