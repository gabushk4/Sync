import Ionicons from '@react-native-vector-icons/ionicons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { DateTime } from 'luxon'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useSharedValue, withDecay, withTiming } from 'react-native-reanimated'

import EventsList, { RETRAIT_RANGEE } from '@/components/eventsList'
import ProfilPic from '@/components/pfp'
import Spinner from '@/components/spinner'
import Timeline from '@/components/timeline'
import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { useGestionScroll } from '@/contextes/contexteGestionListes'
import { useMembre } from '@/contextes/contexteMembre'
import { usePalette } from '@/contextes/contextePalette'
import { useTimeline } from '@/contextes/contexteTimeline'
import catcher from '@/functions/catcher'
import { convertUTCToLocal } from '@/functions/convertirUTCenLocal'
import { getCommonFreeSlots } from '@/functions/availability'
import couleurStatutInvitation, { assombrir } from '@/functions/couleurStatutInvitation'
import { estJourFerie, paramsJour } from '@/functions/evenementsMembre'
import { ouvrirDecisionInvitation } from '@/functions/ouvrirRevueInvitation'
import { Event } from '@/types/calendar'
import { bornesLocales, InvitationInfo } from '@/types/invitation'

/** Photo column width and row height, like the home timeline. */
const LARGEUR_COLONNE = 80
const HAUTEUR_RANGEE = 104

/** One person of GET /evenements/invitations/:id/horaires. */
type PersonneHoraire = {
    id: string
    pseudo: string
    fp_url: string | null
    /** Their answer to the invitation. */
    statut: string
    /** Friend of the member: their other events come with titles. */
    ami: boolean
    evenements: Record<string, any>[]
}

type Horaires = { leader: PersonneHoraire | null, invites: PersonneHoraire[], moi: PersonneHoraire | null }

/**
 * Invitation review ("adjust my schedule" for an invitation in conflict): on the
 * invited event's day, the inviter (leader, at the top with a star), the other
 * people they invited, and the member — nobody else. Each row shows that person's
 * day (a friend's events with their titles, someone else's as grey "private"
 * blocks); the invited event is green in the leader's row and, in the other
 * rows, colored by each person's answer (accepted green, pending yellow, refused
 * red; darker green for the leader's). The invited event in the leader's row and
 * in the member's own can be tapped: it opens the decision page (the event,
 * read-only, to accept or refuse); the member's other events open their details,
 * to move or delete one in conflict. The leader's row and friends' rows also show
 * the free slots shared with the member. The rows scroll together, starting on the
 * event's hour.
 *
 * Route param `invitation`: {@link InvitationInfo} as JSON.
 *
 * @author Philip — user story 8 (reviewing an invitation in conflict)
 * @returns {JSX.Element}
 */
export default function RevueInvitation() {
    const { t } = useTranslation('events')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { api } = useAPI()
    const { membre } = useMembre()
    const { offset } = useGestionScroll()
    const { pxHeures, L_HEURES } = useTimeline()
    const { width: largeurEcran } = useWindowDimensions()
    // This screen shows one day: the shared bounds (GestionScrollProvider) now cover
    // the home screen's seven days and let the rows scroll into empty days.
    // Rectification (Philip) after the seven-day window.
    const maxOffset = Math.max(0, 24 * (pxHeures + L_HEURES) - (largeurEcran - LARGEUR_COLONNE))
    const clampOffset = (valeur: number) => {
        'worklet'
        return Math.min(Math.max(valeur, 0), maxOffset)
    }

    const { invitation: invitationParam } = useLocalSearchParams<{ invitation?: string }>()
    const invitation = useMemo<InvitationInfo | null>(
        () => (invitationParam ? JSON.parse(invitationParam) : null),
        [invitationParam]
    )
    const debutEvenement = invitation ? bornesLocales(invitation, membre.timezone).debut : undefined
    const jour = (debutEvenement ?? DateTime.now()).startOf('day')

    const [horaires, setHoraires] = useState<Horaires | null>(null)
    // The request failed: a retry button instead of an endless spinner.
    const [erreur, setErreur] = useState(false)
    // Bumped by the retry button to run the request again.
    const [essai, setEssai] = useState(0)

    /**
     * Converts a row's events to the timeline's format, with this screen's
     * display: the invited event colored by its answer (couleurStatutInvitation) —
     * a darker green in the leader's row — and tappable in the leader's row and the
     * member's own (both open the decision page); the member's other events are
     * tappable too (their details); every other event is a plain block that
     * can't be tapped — with its title for a friend, or grey and
     * "private" for someone who isn't a friend (`masque`, the API sends no title).
     *
     * @author Philip — user story 8 (answering an invitation)
     * @param {PersonneHoraire} personne
     * @param {'leader' | 'invite' | 'moi'} role
     * @returns {Event[]}
     */
    const evenementsDe = (personne: PersonneHoraire, role: 'leader' | 'invite' | 'moi'): Event[] =>
        // Holidays don't occupy the day (like the home screen): no block.
        personne.evenements.filter((ev) => !estJourFerie(ev)).map((ev) => (({
            ...ev,
            id: ev.id_publique,
            debut: convertUTCToLocal(ev.debut, membre.timezone),
            fin: convertUTCToLocal(ev.fin, membre.timezone),
            ...(ev.masque ? { titre: t('invitationReview.private') } : {}),

            couleur: ev.est_invitation
                ? role === 'leader'
                    ? assombrir(colors.success)
                    : couleurStatutInvitation(ev.statut_invitation, colors)
                : ev.masque ? colors.muted : undefined,

            // The member's own events too: they open their details, to move or
            // delete one in conflict (Philip — user story 8).
            cliquable: role === 'moi' || (!!ev.est_invitation && role === 'leader')
        }) as Event))

    /**
     * Tap on an event of the review: the invited event opens the decision page;
     * one of the member's own events opens its details (edit / delete / leave),
     * pushed over this screen so going back returns here (reloaded on focus).
     *
     * @author Philip — user story 8 (adjusting my schedule)
     * @param {Event} ev
     * @returns {void}
     */
    const ouvrirEvenement = (ev: Event) => {
        if ((ev as any).est_invitation) {
            if (invitation) ouvrirDecisionInvitation(invitation, { depuisRevue: true })
            return
        }
        if (!ev.id || !ev.debut) return
        router.push({
            pathname: '/(tabs)/home/details/[eventId]',
            params: { eventId: ev.id, start: ev.debut.toISO(), end: (ev.fin ?? ev.debut).toISO() },
        } as any)
    }

    /**
     * Events that make a person busy, for the common free slots: everything but the
     * invited event while it isn't accepted (a pending invitation doesn't take the time).
     *
     * @author Philip — user story 8 (answering an invitation)
     * @param {Event[]} evenements - A row's events (evenementsDe).
     * @returns {Event[]}
     */
    const occupes = (evenements: Event[]) =>
        evenements.filter((ev: any) => !ev.est_invitation || ev.statut_invitation === 'acceptee')

    // The member's busy times, for the free slots shared with each friend.
    const mesOccupations = useMemo(
        () => (horaires?.moi ? occupes(evenementsDe(horaires.moi, 'moi')) : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [horaires]
    )

    // (Re)loaded on focus: e.g. back from the decision page after answering.
    useFocusEffect(useCallback(() => {
        if (!invitation) return
        let actif = true
        setErreur(false)
        api.get(`/evenements/invitations/${invitation.id}/horaires`, { params: paramsJour(jour) })
            .then((reponse) => { if (actif) setHoraires(reponse.data) })
            .catch((error) => {
                if (actif) setErreur(true)
                catcher(error, t('invitationReview.loadFailed'))
            })
        return () => { actif = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invitation?.id, essai]))

    // Start on the event's hour (the rows don't jump to the current hour here).
    useFocusEffect(useCallback(() => {
        // `.set()` rather than `.value =`: Reanimated's form for the React Compiler lint.
        if (debutEvenement) offset.set(withTiming(clampOffset(debutEvenement.hour * (pxHeures + L_HEURES)), { duration: 300 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invitation?.id]))

    // Horizontal drag scrolls every row (and the hours header) together.
    const base = useSharedValue(0)
    const glisser = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onBegin(() => { base.set(offset.get()) })
        .onChange((e) => { offset.set(clampOffset(base.get() - e.translationX)) })
        .onEnd((e) => { offset.set(withDecay({ velocity: -e.velocityX, clamp: [0, maxOffset] })) })

    const s = StyleSheet.create({
        ecran: { flex: 1, backgroundColor: colors.background },
        entete: { paddingHorizontal: 16, paddingVertical: 10, gap: 6, backgroundColor: colors.card },
        titre: { color: colors.text, fontFamily: fonts.title, fontSize: 18 },
        aide: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
        legende: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
        itemLegende: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        pastille: { width: 10, height: 10, borderRadius: 5 },
        texteLegende: { color: colors.text, fontFamily: fonts.body, fontSize: 12 },
        timeline: { flexDirection: 'row', height: 32, backgroundColor: colors.card },
        colonneVide: { width: LARGEUR_COLONNE },
        rangee: { flexDirection: 'row', height: HAUTEUR_RANGEE, marginBottom: 4 },
        rangeeMoi: { borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
        colonne: {
            width: LARGEUR_COLONNE,
            paddingVertical: RETRAIT_RANGEE,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
        },
        // Star on the leader's photo.
        etoile: { position: 'absolute', top: RETRAIT_RANGEE, right: 8 },
        pseudo: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, maxWidth: LARGEUR_COLONNE - 8 },
        chargement: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    })

    /**
     * One person's row: photo (+ star for the leader), pseudo, and their schedule —
     * with, for the leader and for a friend, the free slots shared with the member
     * (like the home screen).
     *
     * @author Philip — user story 8 (answering an invitation)
     * @param {PersonneHoraire} personne
     * @param {'leader' | 'invite' | 'moi'} role
     * @returns {JSX.Element}
     */
    const rangee = (personne: PersonneHoraire, role: 'leader' | 'invite' | 'moi') => {
        const evenements = evenementsDe(personne, role)
        // The leader's row always (whoever they are), and every friend's.
        const dispoCommunes = role === 'leader' || (role === 'invite' && personne.ami)
            ? getCommonFreeSlots(mesOccupations, occupes(evenements), jour)
            : undefined
        return (
        <View key={`${role}-${personne.id}`} style={[s.rangee, role === 'moi' && s.rangeeMoi]}>
            <View style={s.colonne}>
                <ProfilPic pfp={personne.fp_url} size={52} />
                {role === 'leader' && (
                    <Ionicons name="star" size={18} color={colors.warning} style={s.etoile} accessibilityLabel={t('invitationReview.leader')} />
                )}
                <Text style={s.pseudo} numberOfLines={1}>{role === 'moi' ? t('invitationReview.me') : personne.pseudo}</Text>
            </View>
            <EventsList
                owner={personne}
                events={evenements}
                eventsColor={role === 'moi' ? colors.primary : undefined}
                textColor={colors.text}
                offsetSnap={L_HEURES + pxHeures}
                listSize={HAUTEUR_RANGEE}
                displayedDate={jour}
                horizontal
                commonFreeSlots={dispoCommunes}
                getEvenements={() => {}}
                // The invited event (leader's or member's row): the decision page; the
                // member's own events: their details.
                onPressEvenement={ouvrirEvenement}
            />
        </View>
        )
    }

    return (
        <View style={s.ecran}>
            <View style={s.entete}>
                <Text style={s.titre} numberOfLines={1}>
                    {invitation?.titre_evenement} · {jour.toFormat('cccc d MMMM')}
                </Text>
                <Text style={s.aide}>{t('invitationReview.hint', { pseudo: invitation?.pseudo_invitant ?? '' })}</Text>
                <View style={s.legende}>
                    {(['acceptee', 'en_attente', 'refusee'] as const).map((statut) => (
                        <View key={statut} style={s.itemLegende}>
                            <View style={[s.pastille, { backgroundColor: couleurStatutInvitation(statut, colors) }]} />
                            <Text style={s.texteLegende}>{t(`participantStatus.${statut}`)}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={s.timeline}>
                <View style={s.colonneVide} />
                {/* The invited event's day (midnight's label is that day, not the home
                    screen's window); the focus effect above scrolls to the event's hour. */}
                <Timeline horizontal={true} windowStart={jour} defilerAuDemarrage={false} />
            </View>

            {!horaires ? (
                <View style={s.chargement}>
                    {erreur ? (
                        <TouchableOpacity onPress={() => setEssai((n) => n + 1)} accessibilityRole="button">
                            <Text style={s.aide}>{t('invitationReview.retry')}</Text>
                        </TouchableOpacity>
                    ) : (
                        <Spinner size={32} color={colors.muted} accessibilityLabel={t('common:loading')} />
                    )}
                </View>
            ) : (
                <GestureDetector gesture={glisser}>
                    <View style={{ flex: 1 }}>
                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                            {horaires.leader && rangee(horaires.leader, 'leader')}
                            {horaires.invites.map((personne) => rangee(personne, 'invite'))}
                        </ScrollView>
                        {horaires.moi && rangee(horaires.moi, 'moi')}
                    </View>
                </GestureDetector>
            )}
        </View>
    )
}
