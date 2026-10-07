import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect, useIsFocused } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';


import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { useInvites } from "@/contextes/contexteInvites";
import { useMembre } from "@/contextes/contexteMembre";
import { usePalette } from "@/contextes/contextePalette";
import { useAccessToken } from "@/contextes/contexteToken";

import catcher from "@/functions/catcher";
import { convertLocalToUTC, convertUTCToLocal } from "@/functions/convertirUTCenLocal";
import formaterDatePourServeur from "@/functions/formaterDatePourServeur";
import log from "@/functions/log";

import ToastAbs from "@/abstractions/toastAbs";
import EventForm from "@/components/eventForm";
import { toastTypes } from "@/constants/toastConfig";
import { useNavFab } from "@/hooks/useNavFAB";
import { defaultEvent, Event } from "@/types/calendar";
import { UrlDescriptor } from "@/types/url";
import Icon from "@react-native-vector-icons/ionicons";
import { DateTime } from "luxon";

export default function Details(){
    const { t } = useTranslation('events')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()
    const { api, APIBaseURL } = useAPI()
    const isFocused = useIsFocused()
    const {resetInvites, ajouterInvite, invites} = useInvites()
    const { getToken } = useAccessToken()
    const { membre } = useMembre()
    
    const { eventId, start, end } = useLocalSearchParams()

    const [membreEditeur, setMembreEditeur] = useState<boolean>()    

    const [modeEdit, setModeEdit] = useState<boolean>(false)
    const [titre, setTitre] = useState<string>()
    const [description, setDescription] = useState<string>()
    const [prive, setPrive] = useState<boolean>()
    const [dateEvenement, setDateEvenement] = useState<DateTime>()
    const [debutEvenement, setDebutEvenement] = useState<DateTime>()
    const [finEvenement, setFinEvenement] = useState<DateTime>()
    const [montrerDtPickers, setMontrerDtPickers] = useState<boolean>(false)
    const [event, setEvent] = useState<Event>(defaultEvent)  

    const verifAvantDelete = ()=>{        
        if (event.type === "recurrence") {
            Alert.alert(t('details.recurringEditTitle'), t('details.recurringEditMessage'),
                [
                    {text:t('details.editSeries'), onPress:()=>{
                        const url = {
                            method: 'DELETE',
                            string: `/evenements/${event.id}`,
                            data: {}
                        };
                        deleteEvenement(url)
                    }},
                    {text:t('details.editOccurrence'), onPress:()=>{
                        const url = {
                            method: 'POST',
                            string: '/evenements/exceptions/',
                            data: {
                                id_parent:event.id, 
                                date_occurence:formaterDatePourServeur(convertLocalToUTC(event.debut)), 
                                debut:formaterDatePourServeur(convertLocalToUTC(event.debut)), 
                                fin:formaterDatePourServeur(convertLocalToUTC(event.fin)), 
                                type: 'annule' 
                            }
                        };
                        log("url avant delete", url)
                        deleteEvenement(url)
                    }, isPreferred:true}
                ]
            )
        }
        else{
            const url = {
                method: 'DELETE',
                string: `/evenements/${event.id}`,
                data: {}
            };
            deleteEvenement(url)
        }
    }

    const deleteEvenement = async (url:UrlDescriptor)=>{        
        try {
            const token = await getToken()
            const reponse = await api.request(
                {
                    method:url.method,
                    url:url.string,
                    ...(url.data?{data:url.data}:{}),
                    headers: {
                        'Authorization':`Bearer ${token}`,
                    },
                }
            )

            log('evenements supprimé', reponse.status)

            ToastAbs.show({
                type:toastTypes.success,
                text1:t('details.deletedTitle'),
                text2:t('details.deletedMessage'),
                position:'top'
            })
            router.back()
        } catch (error) {
            log('erreur en supprimant l\'évènement', error)
            catcher(error, t('errors.deleteFailed'))
        }
    }    

    const quitterEvenement = async ()=>{
        try {
            const reponse = await api.post(`/evenements/${event.id}/quitter`, {})
            if(reponse.status === 201){
                ToastAbs.show({
                    type:toastTypes.success,
                    text2:reponse.data.message
                })
                router.back()
            }
        } catch (error) {
            catcher(error, t('errors.leaveFailed'))
        }
    }

    const getDetails = async (id: string) => {
        try {
            const timezone = membre.timezone

            const res = await api.request({
                method: "GET",
                url: `/evenements/${id}`,
                params: {
                    debut: formaterDatePourServeur(convertLocalToUTC(
                        typeof start === "string"
                            ? start
                            : DateTime.now())),
                    fin: formaterDatePourServeur(convertLocalToUTC(
                        typeof end === "string"
                            ? end 
                            : DateTime.now().plus({ hour: 1 })
                    )),
                }
            })

            res.data.debut = convertUTCToLocal(res.data.debut, timezone)
            res.data.fin = convertUTCToLocal(res.data.fin, timezone)
            setEvent(res.data)
        } catch (error) {
            router.back()
            catcher(error, t('errors.loadFailed'))
        }
    }

    const FABParams = useMemo(
        () => ({ event: JSON.stringify(event) }),
        [event]
    )

    useNavFab("details", {
            icon: <Icon name="pencil" size={24} color={colors.text} />,
            href: '/(tabs)/home/edit/[event]' as const,
            params: FABParams
        })

    useFocusEffect(useCallback(() => {
        if (typeof eventId === 'string')
            getDetails(eventId)
        return () => {
        }
    }, [isFocused, eventId, membre?.timezone]))

    useEffect(() => {
        log("event dans details", event)
    }, [event])

    const s = StyleSheet.create({
        floatingBtn: {
            height: 64, 
            width: 64,
            //backgroundColor: colors.secondary,
            position: 'absolute',
            bottom: 16,
            right: 16,
            borderRadius: 100,
            borderWidth: 1, 
            borderColor: colors.error,
            alignItems: 'center',
            justifyContent: 'center'
        }
    })

    return (
        <View style={{flex:1}}>
            <EventForm
                event={event}
                mode={'details'}                
            />
            {/* quit (non-creators) / delete (creator) button */}
            <TouchableOpacity style={s.floatingBtn} onPress={() => {
                if (event.privilege_membre === 'editeur')
                    verifAvantDelete()
                else
                    quitterEvenement()
            }}>
                <Icon name='trash-sharp' color={colors.error} size={28}/>
            </TouchableOpacity>
        </View>
    )
}