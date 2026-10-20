import { useLocalSearchParams, useNavigation } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import Icon from "@react-native-vector-icons/ionicons";

import { useActionFab } from "@/hooks/useActionFAB";
import { useAPI } from "@/contextes/contexteAPI";
import { usePalette } from "@/contextes/contextePalette";

import EventForm, { EventFormHandle } from "@/components/eventForm";
import VoileEnvoi from "@/components/voileEnvoi";
import ToastAbs from "@/abstractions/toastAbs";
import { toastTypes } from "@/constants/toastConfig";
import catcher from "@/functions/catcher";
import { convertLocalToUTC } from "@/functions/convertirUTCenLocal";
import formaterDatePourServeur from "@/functions/formaterDatePourServeur";
import { debutDejaPasse, estJourneeEntiere, plagePreremplie } from "@/functions/jourCreation";
import { defaultEvent, Event } from "@/types/calendar";
import { conflitsDeLaReponse } from "@/types/conflit";

/** Conflicting titles listed in the error message before "…". */
const MAX_TITRES_CONFLIT = 3

/**
 * Unavailability screen: a stretch where the member is busy, stored as an event of
 * nature 'indisponibilite' (same conflicts and display as an event). The form is the
 * event one without recurrence nor participants: an optional title (the reason), a
 * description, whether friends see the reason, start / end and "all day".
 * Opened from the "what to add?" menu (`start` / `end` route params, ISO), like the
 * event creation. Overlapping something already in the schedule (e.g. "all day" on
 * a day that already holds an event) is only checked on confirming: the API's 409
 * then shows an error listing what is in the way.
 *
 * @author Philip — user story 20
 * @returns {JSX.Element}
 */
export default function Indisponibilite() {
    const { t } = useTranslation('events')
    const { colors } = usePalette()
    const navigation = useNavigation()
    const { api } = useAPI()

    const formRef = useRef<EventFormHandle>(null)
    const [event] = useState<Event>(defaultEvent)
    const [enChargement, setEnChargement] = useState(false)
    // Set synchronously: a double tap on ✓ would otherwise send it twice.
    const envoiEnCoursRef = useRef(false)

    const { start, end } = useLocalSearchParams<{ start?: string, end?: string }>()
    const maintenant = DateTime.now()
    const { debutSuggere, finDemandee } = plagePreremplie(start, end, maintenant)

    /**
     * Validates the form (start not past) and sends the unavailability, then goes
     * back to the home timeline. A 409 (overlap) shows what is in the way.
     *
     * @author Philip — user story 20
     * @returns {Promise<void>}
     */
    const envoyer = async () => {
        if (envoiEnCoursRef.current) return
        envoiEnCoursRef.current = true
        let jourEntier = false
        try {
            const values = formRef.current?.getValues()
            if (!values) return
            jourEntier = estJourneeEntiere(values.start, values.end)
            if (debutDejaPasse(values.start, values.end)) {
                ToastAbs.show({ type: toastTypes.error, text2: t('create.pastStart') })
                return
            }

            setEnChargement(true)
            const response = await api.post('/evenements/', {
                nature: 'indisponibilite',
                // Empty: the API names it "Indisponible".
                titre: values.titre.trim(),
                description: values.description,
                prive: values.prive,
                debut: formaterDatePourServeur(convertLocalToUTC(values.start)),
                fin: formaterDatePourServeur(convertLocalToUTC(values.end)),
                participants: [],
            })
            if (response.status === 201) {
                ToastAbs.show({
                    type: toastTypes.success,
                    text1: t('unavailability.createdTitle'),
                    text2: t('unavailability.createdMessage'),
                    autoHide: true,
                })
                navigation.dispatch({ type: 'POP_TO_TOP' })
            }
        } catch (error: any) {
            if (error.response?.status === 409) {
                const titres = [...new Set(conflitsDeLaReponse(error.response.data).map((c) => c.titre))]
                const liste = titres.slice(0, MAX_TITRES_CONFLIT).join(', ') + (titres.length > MAX_TITRES_CONFLIT ? '…' : '')
                ToastAbs.show({
                    type: toastTypes.error,
                    text1: jourEntier ? t('unavailability.dayTaken') : t('unavailability.rangeTaken'),
                    text2: t('unavailability.inTheWay', { titres: liste }),
                })
            } else {
                catcher(error, t('unavailability.createFailed'))
            }
        } finally {
            envoiEnCoursRef.current = false
            setEnChargement(false)
        }
    }

    useActionFab("unavailabilityCreate", {
        action: envoyer,
        config: {
            visible: true,
            icon: <Icon name="checkmark" color={colors.text} size={28} />
        }
    })

    return (
        <>
            <EventForm
                ref={formRef}
                event={event}
                mode={'create'}
                nature="indisponibilite"
                prefills={{ start: debutSuggere, end: finDemandee }}
                constraints={{ maximumStart: finDemandee, minimumStart: maintenant }}
            />
            {enChargement && <VoileEnvoi />}
        </>
    )
}
