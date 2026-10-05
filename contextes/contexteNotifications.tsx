import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useAPI } from "./contexteAPI";
import log from "@/functions/log";
import catcher from "@/functions/catcher";
import { useAuth } from "./contexteAuth";
import AutoRefresh from "@/functions/autoRefresh";

export type NotificationPayload = {
    type: string;
    id_metier?: string;
    pseudo_demandeur?: string;
    actions?: Array<{
        label: string;
        method: string;
        url: string;
        body: Record<string, any>;
    }>;
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
    const { t } = useTranslation('friends')

    const [notifRefresh, setNotifRefresh] = useState<AutoRefresh | undefined>()
    const [nonLues, setNonLues] = useState<number>(0)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [popupQueueVersion, setPopupQueueVersion] = useState(0)
    const demandesPopupAffichees = useRef(new Set<string>())
    const popupOuvert = useRef(false)

    const onData = (data: any) => {
        //log('notifs onData', data)
        let nbNonLues = 0
        const listeNotifications: Notification[] = []
        for (const notif of (data.notifications || [])) {
            if ((notif.statut ?? notif.statut_notification) === 'non_lue') nbNonLues += 1
           
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

    useEffect(() => {
        if (state !== 'authenticated' || popupOuvert.current) return

        const demande = notifications.find((notification) => {
            const type = notification.payload?.type ?? notification.type
            return type === 'demande_ami'
                && notification.statut_metier === 'en_attente'
                && !demandesPopupAffichees.current.has(notification.id)
        })

        if (!demande) return

        demandesPopupAffichees.current.add(demande.id)
        popupOuvert.current = true

        let popupTermine = false
        const terminerPopup = () => {
            if (popupTermine) return
            popupTermine = true
            popupOuvert.current = false
            setPopupQueueVersion((version) => version + 1)
        }

        const repondre = async (statut: 'acceptee' | 'refusee') => {
            const idDemande = demande.payload?.id_metier
            if (!idDemande) {
                terminerPopup()
                return
            }

            try {
                await api.patch(`/amis/demandes/${idDemande}`, { statut })
                notifRefresh?.forceRefresh()
            } catch (error) {
                catcher(error, t('requests.errors.responseFailed'))
            } finally {
                terminerPopup()
            }
        }

        Alert.alert(
            t('requests.popupTitle'),
            t('requests.popupMessage', {
                pseudo: demande.details?.pseudo_demandeur ?? demande.payload?.pseudo_demandeur ?? demande.message,
            }),
            [
                { text: t('requests.later'), style: 'cancel', onPress: terminerPopup },
                { text: t('requests.decline'), style: 'destructive', onPress: () => { void repondre('refusee') } },
                { text: t('requests.accept'), onPress: () => { void repondre('acceptee') } },
            ],
            { cancelable: true, onDismiss: terminerPopup }
        )
    }, [api, notifications, notifRefresh, popupQueueVersion, state, t])

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
