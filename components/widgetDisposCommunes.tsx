import Ionicons from '@react-native-vector-icons/ionicons'
import { useFocusEffect, useNavigation } from 'expo-router'
import { DateTime } from 'luxon'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import Spinner from '@/components/spinner'
import WidgetProfil from '@/components/widgetProfil'
import Radius from '@/constants/Radius'
import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { useMembre } from '@/contextes/contexteMembre'
import { usePalette } from '@/contextes/contextePalette'
import catcher from '@/functions/catcher'
import { convertirTimestampDateCourte, convertirTimestampHeure } from '@/functions/convertirTimestamp'
import ouvrirCreationAvecAmi, { AmiInvite } from '@/functions/ouvrirCreationAvecAmi'
import versCreneauxLocaux from '@/functions/versCreneauxLocaux'
import voirAmiDansHoraire from '@/functions/voirAmiDansHoraire'
import { Interval } from '@/types/availabilities'

type Props = {
    /** The friend whose profile is shown (public id). */
    ami: AmiInvite
}

/**
 * Profile widget "Common availabilities": the free slots the member shares with a
 * friend, one week at a time (from now, then the following weeks with ‹ ›).
 * Tapping a slot opens the event creation on it with the friend invited; leaving
 * the creation (back arrow, or once created) comes back to this profile.
 * "See in schedule", at the top, opens the home schedule searched on this friend
 * (user story 22's search, see voirAmiDansHoraire).
 * The slots come from POST /disponibilites/communes (`ids`: the friend, `offset`:
 * weeks after this one), the same computation as the creation form's suggestions.
 *
 * @author Philip — user story 25 (common availabilities on a friend's profile)
 * @param {Props} props
 * @param {AmiInvite} props.ami - The friend whose profile is shown.
 * @returns {JSX.Element}
 */
export default function WidgetDisposCommunes({ ami }: Props) {
    const { t } = useTranslation('profile')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { api } = useAPI()
    const { membre } = useMembre()
    const navigation = useNavigation()

    // Weeks after the current one (the API's `offset`).
    const [semaine, setSemaine] = useState(0)
    // null while loading.
    const [creneaux, setCreneaux] = useState<Interval[] | null>(null)
    // The request failed: a retry link instead of an endless spinner.
    const [erreur, setErreur] = useState(false)
    // Bumped by the retry link to run the request again.
    const [essai, setEssai] = useState(0)

    // The API's window: seven days from now, shifted by whole weeks.
    const debutSemaine = DateTime.now().plus({ weeks: semaine })

    // (Re)loaded on focus too: back from creating an event, its slot is gone.
    useFocusEffect(useCallback(() => {
        let actif = true
        setCreneaux(null)
        setErreur(false)
        api.post('/disponibilites/communes', { ids: [ami.id], offset: semaine })
            .then(({ data }) => { if (actif) setCreneaux(versCreneauxLocaux(data.disponibilites, membre.timezone)) })
            .catch((error) => {
                if (!actif) return
                setErreur(true)
                catcher(error, t('commonSlots.loadFailed'))
            })
        return () => { actif = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ami.id, semaine, essai]))

    const s = StyleSheet.create({
        // "See in schedule", at the top of the slots.
        voirHoraire: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 8,
            paddingVertical: 10,
            borderRadius: Radius.xl,
            backgroundColor: colors.primary,
        },
        texteVoirHoraire: { color: colors.text, fontFamily: fonts.title, fontSize: 15 },
        // Under the title, above the slots: ‹ week ›
        fleches: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
        fleche: { padding: 4 },
        semaine: { color: colors.text, fontFamily: fonts.body, fontSize: 15 },
        ligne: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
            gap: 12,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: Radius.xl,
        },
        jour: { width: 72, color: colors.text, fontFamily: fonts.title, fontSize: 15 },
        heures: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
        message: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, paddingVertical: 8 },
        lien: { color: colors.primary, fontFamily: fonts.body, fontSize: 15, paddingVertical: 8 },
    })

    /**
     * One week arrow: the previous week (none before this one) or the next.
     *
     * @author Philip — user story 25
     * @param {-1 | 1} sens - -1 for the previous week, 1 for the next.
     * @returns {JSX.Element}
     */
    const fleche = (sens: -1 | 1) => {
        const desactivee = sens === -1 && semaine === 0
        return (
            <TouchableOpacity
                style={[s.fleche, desactivee && { opacity: 0.3 }]}
                onPress={() => setSemaine((n) => Math.max(0, n + sens))}
                disabled={desactivee}
                accessibilityRole="button"
                accessibilityLabel={t(sens === -1 ? 'commonSlots.previousWeek' : 'commonSlots.nextWeek')}
            >
                <Ionicons name={sens === -1 ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.text} />
            </TouchableOpacity>
        )
    }

    /**
     * One slot: its day (only on the day's first slot), then its hours, with the end's
     * day when the slot runs past midnight. Tap: create an event together on it.
     *
     * @author Philip — user story 25
     * @param {Interval} creneau
     * @param {number} index - Its place in `creneaux` (sorted by start).
     * @returns {JSX.Element}
     */
    const ligne = (creneau: Interval, index: number) => {
        const premierDuJour = index === 0 || !creneaux![index - 1].debut.hasSame(creneau.debut, 'day')
        const memeJour = creneau.fin.hasSame(creneau.debut, 'day')
            // A slot ending at midnight stays on its day.
            || creneau.fin.equals(creneau.debut.startOf('day').plus({ days: 1 }))
        const fin = memeJour
            ? convertirTimestampHeure(creneau.fin)
            : `${creneau.fin.weekdayShort} ${convertirTimestampHeure(creneau.fin)}`
        const heures = t('commonSlots.slot', { debut: convertirTimestampHeure(creneau.debut), fin })
        const jour = `${creneau.debut.weekdayShort} ${creneau.debut.day}`
        return (
            <TouchableOpacity
                key={creneau.id ?? `${creneau.debut.toMillis()}`}
                style={s.ligne}
                // Leaving the creation comes back to this profile, not the home tab.
                onPress={() => ouvrirCreationAvecAmi({
                    debut: creneau.debut,
                    fin: creneau.fin,
                    ami,
                    depuisProfil: true,
                })}
                accessibilityRole="button"
                accessibilityLabel={t('commonSlots.create', { pseudo: ami.pseudo, creneau: `${jour} ${heures}` })}
            >
                <Text style={s.jour}>{premierDuJour ? jour : ''}</Text>
                <Text style={s.heures} numberOfLines={1}>{heures}</Text>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
        )
    }

    return (
        <WidgetProfil titre={t('commonSlots.title')}>
            {/* The home schedule, searched on this friend (no back button). */}
            <TouchableOpacity
                style={s.voirHoraire}
                onPress={() => voirAmiDansHoraire(navigation, ami.pseudo)}
                accessibilityRole="button"
            >
                <Ionicons name="grid-outline" size={16} color={colors.text} />
                <Text style={s.texteVoirHoraire}>{t('commonSlots.seeInSchedule')}</Text>
            </TouchableOpacity>
            <View style={s.fleches}>
                {fleche(-1)}
                <Text style={s.semaine}>
                    {t('commonSlots.week', {
                        debut: convertirTimestampDateCourte(debutSemaine),
                        fin: convertirTimestampDateCourte(debutSemaine.plus({ days: 6 })),
                    })}
                </Text>
                {fleche(1)}
            </View>
            {erreur ? (
                <TouchableOpacity onPress={() => setEssai((n) => n + 1)} accessibilityRole="button">
                    <Text style={s.lien}>{t('commonSlots.retry')}</Text>
                </TouchableOpacity>
            ) : !creneaux ? (
                <Spinner size={24} color={colors.muted} accessibilityLabel={t('common:loading')} />
            ) : creneaux.length === 0 ? (
                <Text style={s.message}>{t('commonSlots.empty', { pseudo: ami.pseudo })}</Text>
            ) : (
                creneaux.map(ligne)
            )}
        </WidgetProfil>
    )
}
