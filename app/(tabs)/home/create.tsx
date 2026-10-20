import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useActionFab } from "@/hooks/useActionFAB";

import { useAPI } from "@/contextes/contexteAPI";
import { useInvites } from "@/contextes/contexteInvites";
import { useMembre } from "@/contextes/contexteMembre";
import { usePalette } from "@/contextes/contextePalette";

import EventForm from "@/components/eventForm";
import VoileEnvoi from "@/components/voileEnvoi";
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
import { debutDejaPasse, plagePreremplie } from "@/functions/jourCreation";
import { DateTime } from "luxon";

/**
 * Event creation screen. Reads `start`/`end` route params (an ISO date each)
 * to pre-fill the event's date range — used both when tapping a time slot in
 * the day timeline (`start` only) and when dragging a range in the month
 * calendar (`start` and `end` both set — user story 5). An overlap with existing
 * events opens the conflict screen (user story 8).
 *
 * @author Philip — user story 5 (pre-filled day / range from the
 *   calendar) and user story 8 (conflict screen on a 409)
 * @author Philip — rectification for a more conventional display:
 *   the suggested start stays on the chosen day and only the past is blocked
 *   (the chosen day could become unpickable), and a missing title or a past
 *   start get a clear message before anything is sent
 * @author Philip — user story 25 / rectification (user story 20): opened from a
 *   friend's profile, this screen lives in the profile stack (app/(tabs)/profile/create,
 *   `depuis: 'profil'`), so leaving it goes straight back to that profile
 * @returns {JSX.Element}
 */
export default function CreateEvent({ }) {
    const { t } = useTranslation('events')
    const { colors } = usePalette()
    const navigation = useNavigation()
    
    const {api} = useAPI()
    const {invites, resetInvites} = useInvites()
    const {membre, getMembre} = useMembre()
    
    const formRef = useRef<EventFormHandle>(null)

    const { start, end, friend, depuis } = useLocalSearchParams<{ start?: string, end?: string, friend?: string, depuis?: string }>()

    /**
     * Leaves after creating (or dropping, from the conflict screen): pops the home
     * stack back to the home screen (replace stacked a second one over the calendar
     * page when created from there). Opened from a friend's profile (`depuis:
     * 'profil'`, profile stack): back to that profile.
     *
     * @author Philip — user story 25; profile stack: rectification (user story 20).
     *   The previous `retour` param prevented the removal in `beforeRemove` and
     *   navigated to the profile itself, which native-stack doesn't support on iOS
     *   (the screen was removed natively but kept in JS state).
     * @returns {void}
     */
    const quitterApresCreation = () => {
        if (depuis === 'profil') navigation.goBack()
        else navigation.dispatch({ type: 'POP_TO_TOP' })
    }

    // Pre-filled range, never in the past (sorting / past rules: plagePreremplie,
    // shared with the unavailability screen; Philip — user story 20).
    // The suggested start is kept apart from the pickers' minimum: the minimum used
    // to be this suggestion, so its day / hour couldn't be moved earlier (e.g.
    // selecting the 11th late in the evening suggested the 12th at midnight, and the
    // 11th could no longer be picked).
    const maintenant = DateTime.now()
    const { debutSuggere, finDemandee } = plagePreremplie(start, end, maintenant)
    // The pickers only forbid the past.
    const minimumStart = maintenant

    const [enChargement, setEnChargement] = useState(false)
    // Set synchronously (a state update isn't visible yet to a second tap): a double
    // tap on ✓ used to send the event twice. Rectification (Philip).
    const envoiEnCoursRef = useRef(false)
    
    //log('setter end')

    const [event] = useState<Event>(defaultEvent)

    // Conflict screen shown over this one (409 answer), or null.
    const [conflit, setConflit] = useState<{ existants: EvenementEnConflit[], nouveau: NouvelEvenement } | null>(null)

    /**
     * Opens the conflict screen over this one, which lists every existing event
     * the new one overlaps and can remove them all, then create the new one.
     *
     * @author Philip — user story 8 (event conflicts)
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
     * @author Philip — user story 8 (event conflicts)
     * @param {SortieConflit} sortie
     * @returns {void}
     */
    const quitterConflit = (sortie: SortieConflit) => {
        setConflit(null)
        if (sortie === 'retour') navigation.goBack()
        else if (sortie === 'accueil') quitterApresCreation()
    }

    /**
     * Validates the form (title present and long enough, start not past) and
     * submits the new event to the API, then goes back to the home screen on
     * success. If the API answers 409 (overlap with existing events, user story 8),
     * opens the conflict screen.
     *
     * @author Philip — user story 8 (409 → conflict screen) and
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
            } else if (debutDejaPasse(values.start, values.end)) {
                // No events in the past (shared check, Philip — user story 20).
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
                    quitterApresCreation()
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
        const listener = navigation.addListener('beforeRemove', () => {
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
            {/* Event being sent. Rectification (Philip); shared VoileEnvoi (user story 20). */}
            {enChargement && <VoileEnvoi />}
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
