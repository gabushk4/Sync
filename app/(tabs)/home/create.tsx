import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, useColorScheme, View } from 'react-native';

import { useActionFab } from "@/hooks/useActionFAB";

import { useAPI } from "@/contextes/contexteAPI";
import { useInvites } from "@/contextes/contexteInvites";
import { useMembre } from "@/contextes/contexteMembre";
import { usePalette } from "@/contextes/contextePalette";

import EventForm from "@/components/eventForm";
import Spinner from "@/components/spinner";
import catcher from "@/functions/catcher";
import log from "@/functions/log";
import { defaultEvent, Event } from "@/types/calendar";
import Icon from "@react-native-vector-icons/ionicons";

import ToastAbs from "@/abstractions/toastAbs";
import { EventFormHandle } from "@/components/eventForm";
import { toastTypes } from "@/constants/toastConfig";
import { convertLocalToUTC } from "@/functions/convertirUTCenLocal";
import formaterDatePourServeur from "@/functions/formaterDatePourServeur";
import { Participant } from "@/types/invites";
import { conflitsDeLaReponse, EvenementEnConflit, NouvelEvenement } from "@/types/conflit";
import ConflitEvenement, { SortieConflit } from "@/components/conflitEvenement";
import ceilBy5 from "@/functions/ceilBy5";
import { estJourneeEntiere } from "@/functions/jourCreation";
import { DateTime } from "luxon";

/**
 * Event creation screen. Reads `start`/`end` route params (an ISO date each)
 * to pre-fill the event's date range — used both when tapping a time slot in
 * the day timeline (`start` only) and when dragging a range in the month
 * calendar (`start` and `end` both set — user story 5). An overlap with existing
 * events opens the conflict screen (user story 8).
 *
 * @author Philip Kvaratshelya — user story 5 (pre-filled day / range from the
 *   calendar) and user story 8 (conflict screen on a 409)
 * @author Philip Kvaratshelya — rectification for a more conventional display:
 *   the suggested start stays on the chosen day and only the past is blocked
 *   (the chosen day could become unpickable), and a missing title or a past
 *   start get a clear message before anything is sent
 * @returns {JSX.Element}
 */
export default function CreateEvent({ }) {
    const { t } = useTranslation('events')
    const { colors } = usePalette()
    const navigation = useNavigation()
    
    const {api} = useAPI()
    const {invites, resetInvites} = useInvites()
    const {membre, getMembre} = useMembre()
    const router = useRouter()
    const { getToken } = useAccessToken()
    
    const formRef = useRef<EventFormHandle>(null)

    const { start, end, friend } = useLocalSearchParams<{ start?: string, end?: string, friend?: string }>()

    // Sorted defensively regardless of the order `start`/`end` arrive in —
    // constraints.maximumStart ending up before minimumStart crashes the
    // native date picker deep inside DateTimeSelecteur.
    let debutDemande = DateTime.fromISO(start as string)
    let finDemandee = end ? DateTime.fromISO(end as string) : undefined
    if (finDemandee && debutDemande > finDemandee) {
        [debutDemande, finDemandee] = [finDemandee, debutDemande]
    }

    // Events can't start in the past.
    // - Single slot (e.g. tapping a near-term time in the timeline): at least 1h
    //   from now, since there's no explicit end to anchor against.
    // - Explicit range (the calendar's drag-select, user story 5): its start, or
    //   now when the range starts earlier today (it used to trust a past start).
    // A range already over is dropped (the calendar's "+" refuses it anyway).
    const maintenant = DateTime.now()
    if (finDemandee && finDemandee <= maintenant) finDemandee = undefined
    // Suggested start (pre-filled), kept apart from the pickers' minimum: the
    // minimum used to be this suggestion, so its day / hour couldn't be moved
    // earlier (e.g. selecting the 11th late in the evening suggested the 12th
    // at midnight, and the 11th could no longer be picked).
    let debutSuggere: DateTime
    if (!debutDemande.isValid) debutSuggere = maintenant.plus({ hours: 1 })
    // Whole days (the calendar's range): kept as is, even when it starts today, so the
    // form opens with "all day" on.
    else if (finDemandee && estJourneeEntiere(debutDemande, finDemandee)) debutSuggere = debutDemande
    else if (finDemandee) debutSuggere = debutDemande > maintenant ? debutDemande : ceilBy5(maintenant)
    else debutSuggere = debutDemande.diff(maintenant, 'hours').hours > 1 ? debutDemande : maintenant.plus({ hours: 1 })
    // The pickers only forbid the past.
    const minimumStart = maintenant

    const [enChargement, setEnChargement] = useState(false)
    // Set synchronously (a state update isn't visible yet to a second tap): a double
    // tap on ✓ used to send the event twice. Rectification (Philip Kvaratshelya).
    const envoiEnCoursRef = useRef(false)
    
    //log('setter end')

    const [event] = useState<Event>(defaultEvent)

    // Conflict screen shown over this one (409 answer), or null.
    const [conflit, setConflit] = useState<{ existants: EvenementEnConflit[], nouveau: NouvelEvenement } | null>(null)

    /**
     * Opens the conflict screen over this one, which lists every existing event
     * the new one overlaps and can remove them all, then create the new one.
     *
     * @author Philip Kvaratshelya — user story 8 (event conflicts)
     * @param {EvenementEnConflit[]} existants - Conflicting events, as sent in the API's 409 response.
     * @param {NouvelEvenement} nouveau - The POST body of the event being created, so the
     *   conflict screen can create it itself once the existing ones are removed.
     * @returns {void}
     */
    const afficherConflit = (existants: EvenementEnConflit[], nouveau: NouvelEvenement) => {
        setConflit({ existants, nouveau })
    }

    /**
     * The conflict screen is left: closes it, then navigates from this screen's own
     * stack — one plain action, like the header's back arrow (navigating from the
     * old (modals) route never reached the calendar under this screen):
     * - 'formulaire': stays on this form;
     * - 'retour' ("adjust my schedule"): back to where the creation started, the
     *   calendar page as it was before pressing "+" (same month, same selection)
     *   or the home timeline;
     * - 'accueil' (created / dropped): back to the home timeline.
     *
     * @author Philip Kvaratshelya — user story 8 (event conflicts)
     * @param {SortieConflit} sortie
     * @returns {void}
     */
    const quitterConflit = (sortie: SortieConflit) => {
        setConflit(null)
        if (sortie === 'retour') navigation.goBack()
        else if (sortie === 'accueil') navigation.dispatch({ type: 'POP_TO_TOP' })
    }

    /**
     * Validates the form (title present and long enough, start not past) and
     * submits the new event to the API, then goes back to the home screen on
     * success. If the API answers 409 (overlap with existing events, user story 8),
     * opens the conflict screen.
     *
     * @author Philip Kvaratshelya — user story 8 (409 → conflict screen) and
     *   rectification (validation messages, back to the existing home screen)
     * @returns {Promise<void>}
     */
    const postEvenement = async () => {
        if (envoiEnCoursRef.current) return
        envoiEnCoursRef.current = true
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

            if (!values.titre?.trim()) {
                // Checked first: without a name the API used to answer with a conflict
                // (checked before the title) instead of this error.
                valid = false
                errorMessage = t('create.titleRequired')
            } else if (values.titre.trim().length < 4) {
                valid = false
                errorMessage = t('create.titleTooShort', { title: values.titre })
            } else if (estJourneeEntiere(values.start, values.end)
                ? values.start < DateTime.now().startOf('day')
                : values.start < DateTime.now().minus({ minutes: 1 })) {
                // No events in the past (the pickers' minimum is set when the screen
                // opens, so the start can pass while the form is being filled). An
                // all-day event starts at midnight: today is still allowed.
                valid = false
                errorMessage = t('create.pastStart')
            }

            if (valid) {
                setEnChargement(true)

                nouveau = {
                    ...event,
                    titre: values.titre,
                    description: values.description,
                    prive: values.prive,
                    debut: formaterDatePourServeur(convertLocalToUTC(values.start)),
                    fin: formaterDatePourServeur(convertLocalToUTC(values.end)),
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
                    // Pops the home stack back to the home screen (replace stacked a
                    // second one over the calendar page when created from there).
                    navigation.dispatch({ type: 'POP_TO_TOP' })
                }
            } else {
                ToastAbs.show({ type: toastTypes.error, text2: errorMessage })
            }
        } catch (error: any) {
            // User story 8: the server's verifierDisponibilite found an overlap
            // (including later occurrences of recurring events), show the conflict screen.
            if (error.response?.status == 409 && nouveau) {
                afficherConflit(conflitsDeLaReponse(error.response.data), nouveau)
            } else {
                catcher(error, t('errors.createFailed'))
            }
        } finally {
            envoiEnCoursRef.current = false
            setEnChargement(false)
        }
    }

    useActionFab("eventCreate", {
        action: postEvenement,
        config: {
            visible:true,
            icon: <Icon name="checkmark" color={colors.text} size={28} />
        }
    })

    useFocusEffect(useCallback(() => { 
        const listener = navigation.addListener('beforeRemove', (e) => {
            console.log('on back')
            resetInvites()
        })
        return () => {
            navigation.removeListener('beforeRemove', listener)
        }
    }, []))

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
        log("create opens with", {start: start, end: end, debutSuggere: debutSuggere})
    }, [event])

    return (
        <>
            <EventForm
                ref={formRef}
                event={event}
                mode={'create'}
                prefills={{
                    start: debutSuggere,
                    end: finDemandee,
                    participants: friend ? [JSON.parse(friend as string)] as Array<Participant> : undefined
                }}
                constraints={{
                    maximumStart: finDemandee,
                    minimumStart: minimumStart
                }}
            />
            {/* Event being sent. Rectification (Philip Kvaratshelya). */}
            {enChargement && (
                <View style={stylesEnvoi.voile} pointerEvents="none">
                    <Spinner size={40} color={colors.text} accessibilityLabel={t('common:loading')} />
                </View>
            )}
            {conflit && (
                <ConflitEvenement
                    existants={conflit.existants}
                    evenement={{ titre: conflit.nouveau.titre, debut: conflit.nouveau.debut, fin: conflit.nouveau.fin }}
                    confirmer={() => api.post('/evenements/', conflit.nouveau)}
                    onSortie={quitterConflit}
                />
            )}
        </>
    )
}

const stylesEnvoi = StyleSheet.create({
    // Centered over the form while the event is being sent.
    voile: {
        position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
