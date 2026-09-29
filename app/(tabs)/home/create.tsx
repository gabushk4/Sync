import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useColorScheme, View } from 'react-native';

import { useActionFab } from "@/hooks/useActionFAB";

import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { useInvites } from "@/contextes/contexteInvites";
import { useMembre } from "@/contextes/contexteMembre";
import { usePalette } from "@/contextes/contextePalette";
import { useAccessToken } from "@/contextes/contexteToken";

import EventForm from "@/components/eventForm";
import catcher from "@/functions/catcher";
import log from "@/functions/log";
import { defaultEvent, Event } from "@/types/calendar";
import Icon from "@react-native-vector-icons/ionicons";

import ToastAbs from "@/abstractions/toastAbs";
import { EventFormHandle } from "@/components/eventForm";
import { toastTypes } from "@/constants/toastConfig";
import { convertirLocalVersUTC } from "@/functions/convertirUTCenLocal";
import formaterDatePourServeur from "@/functions/formaterDatePourServeur";
import { Participant } from "@/types/invites";
import { DateTime } from "luxon";

/**
 * Event creation screen. Reads `start`/`end` route params (an ISO date each)
 * to pre-fill and constrain the event's date range — used both when tapping
 * a time slot in the day timeline (`start` only) and when dragging a range
 * in the month calendar (`start` and `end` both set).
 *
 * @returns {JSX.Element}
 */
export default function CreateEvent({ }) {
    const { t } = useTranslation('events')
    const { colors } = usePalette()
    const colorScheme = useColorScheme()
    const { fonts } = useFont()
    
    const {api} = useAPI()
    const {invites, resetInvites} = useInvites()
    const {membre, getMembre} = useMembre()
    const { getToken } = useAccessToken()
    const router = useRouter()
    
    const formRef = useRef<EventFormHandle>(null)

    const { start, end, friend } = useLocalSearchParams()

    // Sorted defensively regardless of the order `start`/`end` arrive in —
    // constraints.maximumStart ending up before minimumStart crashes the
    // native date picker deep inside DateTimeSelecteur.
    let debutDemande = DateTime.fromISO(start as string)
    let finDemandee = end ? DateTime.fromISO(end as string) : undefined
    if (finDemandee && debutDemande > finDemandee) {
        [debutDemande, finDemandee] = [finDemandee, debutDemande]
    }

    // The "at least 1h from now" floor exists for the single-slot flow (e.g.
    // tapping a near-term time in the timeline), where there's no explicit
    // end to anchor against. When an explicit range is provided (e.g. from
    // the calendar's drag-select), it's an intentional, possibly-past choice
    // — trust it directly instead of nudging it toward "now" and risking it
    // landing after finDemandee.
    const diffNowStart = debutDemande.diff(DateTime.now(), 'hours').hours
    const minimumStart = finDemandee || diffNowStart > 1
        ? debutDemande
        : DateTime.now().plus({ hours: 1 })

    const [enChargement, setEnChargement] = useState(false)
    
    //log('setter end')

    const [event, setEvent] = useState<Event>(defaultEvent)

    /**
     * Validates the form and submits the new event to the API, then
     * navigates back to the home screen on success.
     *
     * @returns {Promise<void>}
     */
    const postEvenement = async () => {
        try {
            const values = formRef.current?.getValues()
            if (!values) {
                log('no values')
                return
            }

            log('post event', values)

            let valid = true
            let errorMessage = t('create.unknownError')

            if (values.titre && values.titre.length < 4) {
                valid = false
                errorMessage = t('create.titleTooShort', { title: values.titre })
            }

            if (valid) {
                setEnChargement(true)

                const response = await api.post(
                    '/evenements/',
                    {
                        ...event, 
                        titre: values.titre,
                        description: values.description,
                        prive: values.prive,
                        debut: formaterDatePourServeur(convertirLocalVersUTC(values.start)), 
                        fin: formaterDatePourServeur(convertirLocalVersUTC(values.end)),
                        regle_recurrence: values.regleRecurrence,
                        participants: invites.map((i) => ({ id: i.id, privilege: i.privilege }))
                    }
                )

                if (response.status == 201) {
                    ToastAbs.show({
                        type: toastTypes.success,
                        text1: t('create.createdTitle'),
                        text2: t('create.createdMessage'),
                        autoHide: true,
                    })
                    router.replace('/(tabs)/home')
                }
            } else {
                ToastAbs.show({ type: toastTypes.error, text2: errorMessage })
            }
        } catch (error: any) {
            catcher(error, t('errors.createFailed'))
            if (error.response?.status == 409) {
                const evenementEnConflit = error.response.data.evenement
                log('evenement en conflit', evenementEnConflit)
            }
        } finally {
            setEnChargement(false)
        }
    }

    useActionFab({
        action: postEvenement,
        icon: <Icon name="checkmark" color={colors.text} size={28} />
    })

    useFocusEffect(useCallback(()=>{  
        return ()=>{
            resetInvites()  
        }
    },[]))

    useEffect(() => {
        log("email confirme", membre.emailConfirme)
        if(!membre.emailConfirme)
            getMembre()
    }, [])

    useEffect(()=>{
        log('email confirme', membre.emailConfirme)
    }, [membre.emailConfirme])

    useEffect(() => {
        //log("useEffect event", event)
        log("create opens with", {start: start, end: end, minimumStart: minimumStart})
    }, [event])

    return true
        ?(       
            <EventForm
                ref={formRef}
                event={event}
                mode={'create'}
                prefills={{
                    start: minimumStart ?? undefined,
                    end: finDemandee,
                    participants: friend ? [JSON.parse(friend as string)] as Array<Participant> : undefined
                }}
                constraints={{
                    maximumStart: finDemandee,
                    minimumStart: minimumStart ?? undefined
                }}
            />
        )
        :(<View/>)
    
}