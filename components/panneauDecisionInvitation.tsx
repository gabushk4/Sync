import Ionicons from '@react-native-vector-icons/ionicons'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import ProfilPic from '@/components/pfp'
import Spinner from '@/components/spinner'
import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import catcher from '@/functions/catcher'
import couleurStatutInvitation from '@/functions/couleurStatutInvitation'
import { Participant } from '@/types/invites'

type Props = {
    /** Public id of the invited event. */
    idEvenement: string
    /** Pseudo of the member who sent the invitation. */
    organisateur: string
    /** "Adjust my schedule": the invitation review (everyone's schedule that day). */
    voirHoraire: () => void
    accepter: () => void
    refuser: () => void
    /** The answer being sent (spinner on its button, every button disabled), or false. */
    enCours: false | 'acceptee' | 'refusee'
}

/**
 * Bottom panel of the decision page (an invited event opened from the invitation
 * review or from the feed): who invited the member, a drop-down list of the event's
 * participants with their answer, "adjust my schedule" (the invitation review), and
 * the decision — accept or refuse (see useDecisionInvitation).
 *
 * @author Philip — user story 8 (answering an invitation in conflict)
 * @param {Props} props
 * @returns {JSX.Element}
 */
export default function PanneauDecisionInvitation({ idEvenement, organisateur, voirHoraire, accepter, refuser, enCours }: Props) {
    const { t } = useTranslation('events')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { api } = useAPI()

    const [ouvert, setOuvert] = useState(false)
    // null while loading; `erreurParticipants`: the request failed (no endless spinner).
    const [participants, setParticipants] = useState<Participant[] | null>(null)
    const [erreurParticipants, setErreurParticipants] = useState(false)

    // Loaded the first time the list is opened.
    useEffect(() => {
        if (!ouvert || participants) return
        api.get(`/evenements/${idEvenement}/participants`, { params: { limite: 50 } })
            .then((reponse) => setParticipants(reponse.data.participants ?? []))
            .catch((error) => {
                setErreurParticipants(true)
                catcher(error, t('errors.participantsLoadFailed'))
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ouvert])

    const s = StyleSheet.create({
        panneau: {
            backgroundColor: colors.card,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 90, // room for the tab bar's FAB area
            gap: 10,
        },
        organisateur: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        texteOrganisateur: { color: colors.muted, fontFamily: fonts.body, fontSize: 14 },
        nomOrganisateur: { color: colors.text, fontFamily: fonts.title },
        enteteListe: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        titreListe: { color: colors.text, fontFamily: fonts.title, fontSize: 16 },
        ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
        pseudo: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
        statut: { fontFamily: fonts.title, fontSize: 12 },
        boutons: { flexDirection: 'row', gap: 8 },
        bouton: {
            flex: 1,
            height: 46,
            borderRadius: 10,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
        },
        texteBouton: { fontFamily: fonts.title, fontSize: 14 },
    })

    return (
        <View style={s.panneau}>
            <View style={s.organisateur}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={s.texteOrganisateur}>
                    {t('invitationDecision.invitedBy')} <Text style={s.nomOrganisateur}>{organisateur}</Text>
                </Text>
            </View>

            {/* Participants and their answer, folded by default. */}
            <TouchableOpacity
                style={s.enteteListe}
                // Reopening after a failure tries again.
                onPress={() => { setErreurParticipants(false); setOuvert((o) => !o) }}
                accessibilityRole="button"
            >
                <Text style={s.titreListe}>{t('form.participants')}</Text>
                <Ionicons name={ouvert ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text} />
            </TouchableOpacity>
            {ouvert && erreurParticipants && (
                <Text style={s.texteOrganisateur}>{t('errors.participantsLoadFailed')}</Text>
            )}
            {ouvert && !erreurParticipants && (participants === null
                ? <Spinner size={22} color={colors.muted} style={{ alignSelf: 'center' }} />
                : participants.map((p) => (
                    <View key={p.id} style={s.ligne}>
                        <ProfilPic pfp={p.fp_url ?? null} size={28} />
                        <Text style={s.pseudo} numberOfLines={1}>{p.pseudo}</Text>
                        <Text style={[s.statut, { color: couleurStatutInvitation(p.statut, colors) }]}>
                            {t(`participantStatus.${p.statut}`)}
                        </Text>
                    </View>
                )))}

            <TouchableOpacity style={[s.bouton, { flex: 0, borderColor: colors.secondary }]} onPress={voirHoraire} disabled={!!enCours}>
                <Ionicons name="time-outline" size={18} color={colors.text} />
                <Text style={[s.texteBouton, { color: colors.text }]}>{t('conflict.adjust')}</Text>
            </TouchableOpacity>
            <View style={s.boutons}>
                <TouchableOpacity style={[s.bouton, { borderColor: colors.success }]} onPress={accepter} disabled={!!enCours}>
                    {enCours === 'acceptee'
                        ? <Spinner size={18} color={colors.success} />
                        : <Ionicons name="checkmark" size={18} color={colors.success} />}
                    <Text style={[s.texteBouton, { color: colors.success }]}>{t('invitationDecision.accept')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.bouton, { borderColor: colors.error }]} onPress={refuser} disabled={!!enCours}>
                    {enCours === 'refusee'
                        ? <Spinner size={18} color={colors.error} />
                        : <Ionicons name="close" size={18} color={colors.error} />}
                    <Text style={[s.texteBouton, { color: colors.error }]}>{t('invitationDecision.refuse')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}
