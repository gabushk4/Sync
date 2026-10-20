import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useFocusEffect, useIsFocused } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';


import { useAPI } from "@/contextes/contexteAPI";
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
import PanneauDecisionInvitation from "@/components/panneauDecisionInvitation";
import ouvrirRevueInvitation from "@/functions/ouvrirRevueInvitation";
import useDecisionInvitation from "@/hooks/useDecisionInvitation";
import { InvitationInfo } from "@/types/invitation";
import { defaultEvent, Event } from "@/types/calendar";
import { UrlDescriptor } from "@/types/url";
import Icon from "@react-native-vector-icons/ionicons";
import { DateTime } from "luxon";

export default function Details(){
    const { t } = useTranslation('events')
    const { colors } = usePalette()
    const { api } = useAPI()
    const isFocused = useIsFocused()
    const { getToken } = useAccessToken()
    const { membre } = useMembre()
    
    const { eventId, start, end, invitation: invitationParam, depuisRevue } = useLocalSearchParams()
    const navigation = useNavigation()

    // Decision mode: opened from the invitation review by tapping the leader's invited
    // event. The event is read-only (no edit / delete); a panel lists its participants
    // with their answer and offers accept / refuse.
    // Philip — user story 8 (answering an invitation in conflict).
    const invitation = useMemo<InvitationInfo | null>(
        () => (typeof invitationParam === 'string' ? JSON.parse(invitationParam) : null),
        [invitationParam]
    )
    // "Adjust my schedule" (panel button or conflict screen): back to the review this
    // page was opened from, else open it (page opened from the feed).
    const voirHoraire = () => {
        if (depuisRevue) router.back()
        else if (invitation) ouvrirRevueInvitation(invitation)
    }
    const decision = useDecisionInvitation(invitation, {
        // Answered: back to the home timeline (the invitation review is done).
        onRepondu: () => navigation.dispatch({ type: 'POP_TO_TOP' }),
        onVoirHoraire: voirHoraire,
    })

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
            params: FABParams,
            // No editing while deciding on an invitation.
            visible: !invitation,
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
                masquerParticipants={!!invitation}
            />
            {invitation ? (
                <>
                    <PanneauDecisionInvitation
                        idEvenement={invitation.id_evenement}
                        organisateur={invitation.pseudo_invitant}
                        voirHoraire={voirHoraire}
                        accepter={decision.accepter}
                        refuser={decision.refuser}
                        enCours={decision.enCours}
                    />
                    {decision.conflit}
                </>
            ) : (
                // quit (non-creators) / delete (creator) button
                <TouchableOpacity style={s.floatingBtn} onPress={() => {
                    if (event.privilege_membre === 'editeur')
                        verifAvantDelete()
                    else
                        quitterEvenement()
                }}>
                    <Icon name='trash-sharp' color={colors.error} size={28}/>
                </TouchableOpacity>
            )}
        </View>
    )
}