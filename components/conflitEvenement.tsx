import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

import ToastAbs from '@/abstractions/toastAbs'
import Spinner from '@/components/spinner'
import { toastConfig, toastTypes } from '@/constants/toastConfig'
import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { useMembre } from '@/contextes/contexteMembre'
import { usePalette } from '@/contextes/contextePalette'
import catcher from '@/functions/catcher'
import { convertirTimestampDateCourte, convertirTimestampDateLongue, convertirTimestampHeure } from '@/functions/convertirTimestamp'
import { convertUTCToLocal } from '@/functions/convertirUTCenLocal'
import formaterDatePourServeur from '@/functions/formaterDatePourServeur'
import { conflitsDeLaReponse, EvenementEnConflit } from '@/types/conflit'
import Ionicons from '@react-native-vector-icons/ionicons'

/** Exit fade of the conflict screen (ms), and when it hands over to the create
 * screen (`onSortie`) during it — the fade is ease-out, so it's ~80% transparent
 * by then; waiting for the whole fade kept the create screen too long. */
const DUREE_FERMETURE = 140
const DELAI_NAVIGATION = 80

/**
 * How the conflict screen is left:
 * - 'formulaire': back to the screen under it (the create form, or the feed), via
 *   the arrow next to the title or Android back;
 * - 'retour': "adjust my schedule" — creating: back to where the creation started
 *   (the calendar as it was before pressing "+", or the home timeline); accepting
 *   an invitation: the invitation review (everyone's schedule that day);
 * - 'accueil': the event was created / accepted, or the new one dropped.
 */
export type SortieConflit = 'formulaire' | 'retour' | 'accueil'

/**
 * - 'creation': a new event overlaps the member's schedule (create screen);
 * - 'invitation': accepting an invitation would overlap it (feed).
 */
export type ModeConflit = 'creation' | 'invitation'

type Props = {
    /** Conflicting events from the API's 409 answer. */
    existants: EvenementEnConflit[];
    /** The event being created or accepted, shown above the list (UTC dates). */
    evenement: { titre: string, debut: string | null, fin: string | null };
    /** Creates / accepts the event again once the conflicts are removed; rejects
     * with the API error (409: conflicts left). */
    confirmer: () => Promise<unknown>;
    mode?: ModeConflit;
    /** Called once the screen is fading out; the screen under it closes it and navigates. */
    onSortie: (sortie: SortieConflit) => void;
}

/**
 * Identifies one conflicting occurrence (occurrences of a recurring event share its id).
 *
 * @author Philip — user story 8 (event conflicts)
 * @param {EvenementEnConflit} ev
 * @returns {string}
 */
const cleConflit = (ev: EvenementEnConflit) => `${ev.id}|${ev.debut}`


/**
 * Shown when creating an event, or accepting an invitation ('invitation' mode),
 * overlaps events the member already has. Lists
 * every overlapping event (an event spanning several days can overlap many),
 * each with what confirming will do to it. Confirming removes them all (deleted,
 * only that occurrence if recurring, or left if the member isn't an editor),
 * then creates the new event: keeping one would block the creation anyway, so
 * there is nothing to pick. If events still overlap, the list shows those instead.
 * The member can also drop the new event, go back to the form (arrow next to
 * the title), or adjust their schedule (back to the screen the creation was
 * started from, e.g. the calendar with its selection; for an invitation, the
 * review of everyone's schedule that day). The screen under it stays visible, blurred.
 *
 * Shown by the create screen itself, in a transparent Modal over it (it used to be
 * a route of the (modals) group: navigating from there to the calendar under the
 * create screen kept failing — it closed only the modal, or pushed a new calendar).
 * The create screen now does the navigation, from its own stack, like its header's
 * back arrow (see `onSortie`). The Modal has its own <Toast/>: toasts of the
 * app's root would show under it.
 *
 * @author Philip — user story 8 (event conflicts)
 * @param {Props} props
 * @param {EvenementEnConflit[]} props.existants - Conflicting events (409 answer).
 * @param {{ titre: string, debut: string | null, fin: string | null }} props.evenement - Event created / accepted.
 * @param {() => Promise<unknown>} props.confirmer - Creates / accepts it again.
 * @param {ModeConflit} [props.mode='creation']
 * @param {(sortie: SortieConflit) => void} props.onSortie - How the screen is left.
 * @returns {JSX.Element}
 */
export default function ConflitEvenement({ existants: existantsInitiaux, evenement, confirmer, mode = 'creation', onSortie }: Props) {
    const invitation = mode === 'invitation'
    const { t } = useTranslation('events')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()
    const { membre } = useMembre()
    const { api } = useAPI()

    // Replaced by the remaining conflicts when creating still answers 409.
    const [existants, setExistants] = useState<EvenementEnConflit[]>(existantsInitiaux)

    const [enCours, setEnCours] = useState(false)

    // Entrance: the card pops in, then gives a short, smooth shake with a light
    // vibration (also when another conflict replaces the list).
    const apparition = useSharedValue(0)
    const secousse = useSharedValue(0)

    useEffect(() => {
        apparition.set(withSpring(1, { damping: 16, stiffness: 180 }))
        const doux = { duration: 70, easing: Easing.inOut(Easing.sin) }
        secousse.set(withSequence(
            withTiming(0, { duration: 120 }),
            withTiming(-7, doux),
            withRepeat(withTiming(7, { ...doux, duration: 110 }), 3, true),
            withTiming(0, { duration: 90, easing: Easing.out(Easing.sin) }),
        ))
        const minuteur = setTimeout(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        }, 120)
        return () => clearTimeout(minuteur)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existants])

    // Blurred backdrop: fades in on open and out on close (the Modal itself has no
    // animation), so the blur doesn't appear / vanish in one frame.
    const fond = useSharedValue(0)
    const [fermeture, setFermeture] = useState(false)

    useEffect(() => {
        fond.set(withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const styleFond = useAnimatedStyle(() => ({ opacity: fond.value }))

    /**
     * Fades the card and the blurred backdrop out, then hands over to the create
     * screen (`onSortie`), which closes this screen and navigates: leaving is a
     * fade followed by the regular screen transition. The hand-over happens before
     * the fade ends, once it's mostly transparent.
     *
     * @author Philip — user story 8 (event conflicts)
     * @param {SortieConflit} sortie - How the screen is left.
     * @returns {void}
     */
    const fermer = (sortie: SortieConflit) => {
        if (fermeture) return
        setFermeture(true)
        const fondu = { duration: DUREE_FERMETURE, easing: Easing.out(Easing.quad) }
        // `.set()`: Reanimated's form for the React Compiler lint.
        apparition.set(withTiming(0, fondu))
        fond.set(withTiming(0, fondu))
        setTimeout(() => onSortie(sortie), DELAI_NAVIGATION)
    }

    const styleCarte = useAnimatedStyle(() => ({
        opacity: Math.min(1, apparition.value),
        transform: [
            { translateX: secousse.value },
            { scale: 0.92 + 0.08 * apparition.value },
        ],
    }))

    /**
     * Event created, or the new one dropped: back to the home timeline.
     *
     * @author Philip — user story 8 (event conflicts)
     * @returns {void}
     */
    const retourAccueil = () => fermer('accueil')

    /**
     * "Adjust my schedule": back to where the creation started — the calendar as
     * it was before pressing "+" (same page, so same month and selected day /
     * range), or the home timeline. The create screen pops itself (see onSortie).
     *
     * @author Philip — user story 8 (event conflicts)
     * @returns {void}
     */
    const modifierHoraire = () => fermer('retour')

    /**
     * Removes an existing event from the member's schedule:
     * - editor + recurring: cancels only the conflicting occurrence (exception 'annule'),
     * - editor + single event: deletes it,
     * - otherwise: leaves it (the event stays for its other participants).
     *
     * @author Philip — user story 8 (event conflicts)
     * @param {EvenementEnConflit} ev - The existing conflicting event.
     * @returns {Promise<void>}
     */
    const retirerExistant = async (ev: EvenementEnConflit) => {
        if (ev.privilege_membre !== 'editeur') {
            await api.post(`/evenements/${ev.id}/quitter`, {})
        } else if (ev.type === 'recurrence') {
            await api.post('/evenements/exceptions', {
                id_parent: ev.id,
                // Must match the occurrence's start exactly (UTC SQL) for the server to skip it.
                debut_occurence: formaterDatePourServeur(convertUTCToLocal(ev.debut, 'utc')),
                type: 'annule',
            })
        } else {
            await api.delete(`/evenements/${ev.id}`)
        }
    }

    /**
     * Removes every listed event, then creates / accepts the event (`confirmer`). If
     * events still overlap, this screen is updated to list them instead.
     *
     * @author Philip — user story 8 (event conflicts)
     * @returns {Promise<void>}
     */
    const retirerEtCreer = async () => {
        setEnCours(true)
        try {
            // Leaving / deleting a whole event once is enough, even if several of its
            // occurrences are listed (only recurring occurrences are cancelled one by one).
            const dejaFaits = new Set<string>()
            for (const ev of existants) {
                const parEvenement = ev.privilege_membre !== 'editeur' || ev.type !== 'recurrence'
                if (parEvenement && dejaFaits.has(ev.id)) continue
                try {
                    await retirerExistant(ev)
                    if (parEvenement) dejaFaits.add(ev.id)
                } catch (error) {
                    // Stop here: creating anyway would only answer with a conflict, whose
                    // toast replaced this error.
                    catcher(error, t('conflict.removeFailed'))
                    return
                }
            }

            await confirmer()
            ToastAbs.show({
                type: toastTypes.success,
                text1: invitation ? t('conflict.acceptedTitle') : t('create.createdTitle'),
                text2: invitation ? undefined : t('create.createdMessage'),
                autoHide: true,
            })
            retourAccueil()
        } catch (error: any) {
            if (error.response?.status === 409) {
                // Events still overlap the slot: list those now.
                setExistants(conflitsDeLaReponse(error.response.data))
                ToastAbs.show({ type: toastTypes.warning, text2: t('conflict.anotherConflict') })
            } else {
                catcher(error, invitation ? t('conflict.acceptFailed') : t('errors.createFailed'))
            }
        } finally {
            setEnCours(false)
        }
    }

    /**
     * Asks for confirmation before removing the conflicting events (they're deleted,
     * cancelled or left for good), naming them, then removes them and creates /
     * accepts the event.
     *
     * @author Philip — user story 8 (event conflicts)
     * @returns {void}
     */
    const confirmerRetrait = () => {
        const titres = existants.map((ev) => `• ${ev.titre}`).join('\n')
        Alert.alert(
            t('conflict.confirmTitle'),
            t('conflict.confirmMessage', { count: existants.length, titres }),
            [
                { text: t('conflict.confirmCancel'), style: 'cancel' },
                { text: t('conflict.confirmRemove'), style: 'destructive', onPress: retirerEtCreer },
            ]
        )
    }

    /**
     * "Don't create it": the new event was never saved, so just drop it.
     *
     * @author Philip — user story 8 (event conflicts)
     * @returns {void}
     */
    const abandonnerNouveau = () => {
        ToastAbs.show({ type: toastTypes.success, text2: t('conflict.newDiscarded') })
        retourAccueil()
    }

    /**
     * "Do nothing" (invitation): nothing is removed or answered, the invitation
     * stays pending; back to the screen under this one (feed or decision page).
     *
     * @author Philip — user story 8 (answering an invitation in conflict)
     * @returns {void}
     */
    const neRienFaire = () => {
        ToastAbs.show({ type: toastTypes.success, text2: t('conflict.stillPending') })
        fermer('formulaire')
    }

    /**
     * Formats an event's time range in the member's timezone: one date with its
     * hours, or both dates when it spans several days.
     *
     * @author Philip — user story 8 (event conflicts)
     * @param {string | null} debut - UTC start (ISO or SQL).
     * @param {string | null} fin - UTC end (ISO or SQL).
     * @returns {string | null} e.g. "lundi 5 octobre · 14:00 - 15:00", or null if a date is missing.
     */
    const formaterPlage = (debut: string | null, fin: string | null) => {
        if (!debut || !fin) return null
        const debutLocal = convertUTCToLocal(debut, membre.timezone)
        const finLocal = convertUTCToLocal(fin, membre.timezone)
        if (!debutLocal || !finLocal) return null
        if (debutLocal.hasSame(finLocal, 'day'))
            return `${convertirTimestampDateLongue(debutLocal)} · ${convertirTimestampHeure(debutLocal)} - ${convertirTimestampHeure(finLocal)}`
        return `${convertirTimestampDateCourte(debutLocal)} ${convertirTimestampHeure(debutLocal)} → ${convertirTimestampDateCourte(finLocal)} ${convertirTimestampHeure(finLocal)}`
    }

    const plageNouveau = formaterPlage(evenement.debut, evenement.fin)

    /**
     * What confirming will do to an event.
     *
     * @author Philip — user story 8 (event conflicts)
     * @param {EvenementEnConflit} ev
     * @returns {string}
     */
    const actionPour = (ev: EvenementEnConflit) => {
        if (ev.privilege_membre !== 'editeur') return t('conflict.willLeave')
        if (ev.type === 'recurrence') return t('conflict.willCancelOccurrence')
        return t('conflict.willDelete')
    }

    const s = StyleSheet.create({
        ecran: {
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 16,
        },
        // Dims the blurred create screen (on Android the blur is only a tint).
        voile: {
            position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
            backgroundColor: colors.background,
            opacity: 0.35,
        },
        carte: {
            maxHeight: '92%',
            backgroundColor: colors.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
        },
        entete: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
        },
        btnRetour: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.background,
        },
        container: {
            flexShrink: 1,
            alignItems: 'center',
            width: '100%',
            gap: 12,
        },
        title: {
            flex: 1,
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 20,
        },
        text: {
            color: colors.text,
            fontFamily: fonts.body,
            fontSize: 16,
            textAlign: 'center',
        },
        etiquette: {
            alignSelf: 'flex-start',
            color: colors.muted,
            fontFamily: fonts.body,
            fontSize: 13,
            textTransform: 'uppercase',
        },
        carteNouveau: {
            width: '100%',
            backgroundColor: colors.background,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.secondary,
            padding: 14,
            gap: 2,
        },
        liste: {
            width: '100%',
            maxHeight: 300,
        },
        listeContenu: {
            gap: 8,
        },
        carteExistant: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.background,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.error,
            padding: 12,
        },
        titreEvenement: {
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 16,
        },
        heureEvenement: {
            color: colors.muted,
            fontFamily: fonts.body,
            fontSize: 14,
        },
        action: {
            color: colors.error,
            fontFamily: fonts.body,
            fontSize: 13,
        },
        btnContainer: {
            marginTop: 4,
            width: '100%',
            alignItems: 'center',
            gap: 10,
        },
        btn: {
            height: 48,
            width: '100%',
            borderWidth: 1,
            borderRadius: 8,
            borderColor: colors.secondary,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.background,
            flexDirection: 'row',
            gap: 8,
        },
        btnPrincipal: {
            borderColor: colors.error,
        },
        texteBtnPrincipal: {
            color: colors.error,
            fontFamily: fonts.body,
            fontSize: 16,
        },
        lienSecondaire: {
            color: colors.muted,
            fontFamily: fonts.body,
            fontSize: 15,
            textDecorationLine: 'underline',
        },
    })

    return (
        <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            // Android back button: back to the form, like the arrow.
            onRequestClose={() => fermer('formulaire')}
        >
        <View style={StyleSheet.absoluteFill}>
            {/* The create screen stays visible behind, blurred. */}
            <Animated.View style={[StyleSheet.absoluteFill, styleFond]} pointerEvents="none">
                <BlurView intensity={40} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <View style={s.voile} />
            </Animated.View>
            <SafeAreaView style={s.ecran}>
            <Animated.View style={[s.carte, styleCarte]}>
            <View style={s.entete}>
                <TouchableOpacity
                    style={s.btnRetour}
                    onPress={() => fermer('formulaire')}
                    disabled={enCours || fermeture}
                    accessibilityRole="button"
                    accessibilityLabel={invitation ? t('conflict.back') : t('conflict.backToForm')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="chevron-back" color={colors.text} size={22} />
                </TouchableOpacity>
                <Text style={s.title}>{t('conflict.title')}</Text>
                <Ionicons name="alert-circle" color={colors.error} size={28} />
            </View>
            <View style={s.container}>
                <Text style={s.text}>
                    {t(invitation ? 'conflict.messageListInvitation' : 'conflict.messageList', { count: existants.length })}
                </Text>

                <View style={s.carteNouveau}>
                    <Text style={s.etiquette}>{invitation ? t('conflict.invitation') : t('conflict.new')}</Text>
                    <Text style={s.titreEvenement}>{evenement.titre}</Text>
                    {!!plageNouveau && <Text style={s.heureEvenement}>{plageNouveau}</Text>}
                </View>

                <Text style={s.etiquette}>{t('conflict.existingList', { count: existants.length })}</Text>
                <ScrollView style={s.liste} contentContainerStyle={s.listeContenu}>
                    {existants.map((ev) => {
                        const plage = formaterPlage(ev.debut, ev.fin)
                        return (
                            <View key={cleConflit(ev)} style={s.carteExistant}>
                                <Ionicons
                                    name={ev.privilege_membre !== 'editeur' ? 'exit-outline' : 'trash-outline'}
                                    color={colors.error}
                                    size={22}
                                />
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={s.titreEvenement} numberOfLines={1}>{ev.titre}</Text>
                                    {plage && <Text style={s.heureEvenement}>{plage}</Text>}
                                    <Text style={s.action}>{actionPour(ev)}</Text>
                                </View>
                            </View>
                        )
                    })}
                </ScrollView>

                {enCours && <Spinner size={24} color={colors.text} />}

                <View style={s.btnContainer}>
                    <TouchableOpacity
                        style={[s.btn, s.btnPrincipal]}
                        onPress={confirmerRetrait}
                        disabled={enCours || fermeture || existants.length === 0}
                    >
                        <Ionicons name="trash-outline" color={colors.error} size={18} />
                        <Text style={s.texteBtnPrincipal}>
                            {t(invitation ? 'conflict.removeAndAccept' : 'conflict.removeAndCreate', { count: existants.length })}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.btn} onPress={modifierHoraire} disabled={enCours || fermeture}>
                        <Text style={s.text}>{t('conflict.adjust')}</Text>
                        <Ionicons name="time-outline" color={colors.text} size={20} />
                    </TouchableOpacity>
                    {invitation ? (
                        <TouchableOpacity onPress={neRienFaire} disabled={enCours || fermeture}>
                            <Text style={s.lienSecondaire}>{t('conflict.doNothing')}</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={abandonnerNouveau} disabled={enCours || fermeture}>
                            <Text style={s.lienSecondaire}>{t('conflict.discardNew')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            </Animated.View>
            </SafeAreaView>
        </View>
        {/* Toasts of the root render under a Modal: this one shows them over it. */}
        <Toast config={toastConfig} />
        </Modal>
    )
}
