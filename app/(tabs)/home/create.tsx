import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import { EvenementEnConflit, NouvelEvenement } from "@/types/conflit";
import { DateTime } from "luxon";

/**
 * Event creation screen. Reads `start`/`end` route params (an ISO date each)
 * to pre-fill and constrain the event's date range — used both when tapping
 * a time slot in the day timeline (`start` only) and when dragging a range
 * in the month calendar (`start` and `end` both set — user story 5).
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
    // the calendar's drag-select, user story 5), it's an intentional, possibly-past choice
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
     * Opens the conflict modal, which compares the existing event with the
     * new one and lets the member pick which one to delete.
     * Part of user story 8 (conflict screen when creating an overlapping event).
     *
     * @param {EvenementEnConflit} existant - Conflicting event, as sent in the API's 409 response.
     * @param {NouvelEvenement} nouveau - The POST body of the event being created, so the
     *   modal can create it itself if the member deletes the existing one.
     * @returns {void}
     */
    const afficherConflit = (existant: EvenementEnConflit, nouveau: NouvelEvenement) => {
        // Cast: expo-router's typed routes only pick up this new
        // screen once the dev server regenerates .expo/types/router.d.ts.
        router.push({
            pathname: '/(modals)/conflitEvenement' as unknown as '/(modals)/ajouterAmi',
            params: {
                existant: JSON.stringify(existant),
                nouveau: JSON.stringify(nouveau),
            },
        })
    }

    /**
     * Validates the form and submits the new event to the API, then
     * navigates back to the home screen on success. If the API answers 409
     * (overlap with an existing event, user story 8), opens the conflict screen.
     *
     * @returns {Promise<void>}
     */
    const postEvenement = async () => {
        // Kept outside the try so the 409 handler can hand it to the conflict screen.
        let nouveau: NouvelEvenement | undefined
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

                nouveau = {
                    ...event,
                    titre: values.titre,
                    description: values.description,
                    prive: values.prive,
                    debut: formaterDatePourServeur(convertirLocalVersUTC(values.start)),
                    fin: formaterDatePourServeur(convertirLocalVersUTC(values.end)),
                    regle_recurrence: values.regleRecurrence,
                    participants: invites.map((i) => ({ id: i.id, privilege: i.privilege }))
                }

                const response = await api.post('/evenements/', nouveau)

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
            // User story 8: the server's verifierDisponibilite found an overlap
            // (including later occurrences of recurring events), show the conflict screen.
            if (error.response?.status == 409 && nouveau) {
                afficherConflit(error.response.data.evenement, nouveau)
            } else {
                catcher(error, t('errors.createFailed'))
            }
        } finally {
            setEnChargement(false)
        }
    }

    useActionFab({
        action: postEvenement,
        icon: <Icon name="checkmark" color={colors.text} size={28} />
    })

    // Cleared on unmount rather than on blur: the conflict modal (user story 8)
    // blurs this screen, and "adjust my schedule" must come back to the same invites.
    useEffect(() => {
        return () => {
            resetInvites()
        }
    }, [])

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