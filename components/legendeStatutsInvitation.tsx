import { useTranslation } from 'react-i18next'
import { Image, ImageSourcePropType, StyleSheet, Text, useColorScheme, View } from 'react-native'

import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'

type StatutInvitation = 'acceptee' | 'en_attente' | 'refusee'

// Order shown in the legend (same as the invitation review's).
const STATUTS: StatutInvitation[] = ['acceptee', 'en_attente', 'refusee']

// Height of the legend row, counted in the participants list's animated height.
export const HAUTEUR_LEGENDE = 28

/**
 * Icon of an answer to an invitation, as shown on each participant's row
 * (ParticipantLigne): green checkmark, clock (light / dark), red cross.
 * Anything other than 'acceptee' / 'refusee' is pending.
 *
 * @author Philip — user story 9 (participants' answers)
 * @param {string | null | undefined} statut - 'acceptee' | 'en_attente' | 'refusee'.
 * @param {string | null | undefined} colorScheme - useColorScheme().
 * @returns {ImageSourcePropType}
 */
export function iconeStatutInvitation(statut: string | null | undefined, colorScheme: string | null | undefined): ImageSourcePropType {
    if (statut === 'acceptee') return require('@/assets/icones/icon-succes-checkmark.png')
    if (statut === 'refusee') return require('@/assets/icones/icon-erreur.png')
    return colorScheme === 'dark'
        ? require('@/assets/icones/horloge-dark-icon.png')
        : require('@/assets/icones/horloge-light-icon.png')
}

/**
 * Reminder of what the participants' status icons mean (accepted / pending /
 * refused), under the participants list of an event the member was invited to.
 *
 * @author Philip — user story 9 (participants' answers)
 * @returns {JSX.Element}
 */
export default function LegendeStatutsInvitation() {
    const { t } = useTranslation('events')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()

    return (
        <View style={s.legende}>
            {STATUTS.map((statut) => (
                <View key={statut} style={s.item}>
                    <Image source={iconeStatutInvitation(statut, colorScheme)} style={s.icone} resizeMode="contain" />
                    <Text style={[s.texte, { color: colors.muted, fontFamily: fonts.body }]}>
                        {t(`participantStatus.${statut}`)}
                    </Text>
                </View>
            ))}
        </View>
    )
}

const s = StyleSheet.create({
    legende: {
        height: HAUTEUR_LEGENDE,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    icone: { height: 14, width: 14 },
    texte: { fontSize: 11, letterSpacing: 0.5 },
})
