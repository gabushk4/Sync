import { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'

type Props = {
    /** Title at the top left of the card. */
    titre: string
    /** Optional controls at the top right (e.g. the week arrows). */
    actions?: ReactNode
    children: ReactNode
}

/**
 * Base of the profile widgets: a card (same look as the profile's mood / bio
 * cards) with a title, optional controls next to it, and the widget's content.
 * The profile page stacks its widgets under the member's info.
 *
 * @author Philip — user story 25 (profile widgets)
 * @param {Props} props
 * @returns {JSX.Element}
 */
export default function WidgetProfil({ titre, actions, children }: Props) {
    const { colors } = usePalette()
    const { fonts } = useFont()

    const s = StyleSheet.create({
        carte: { width: '100%', padding: 16, marginTop: 12, borderRadius: 12, backgroundColor: colors.card },
        entete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
        titre: { flexShrink: 1, color: colors.muted, fontFamily: fonts.title, fontSize: 16 },
        contenu: { marginTop: 8 },
    })

    return (
        <View style={s.carte}>
            <View style={s.entete}>
                <Text style={s.titre} numberOfLines={1}>{titre}</Text>
                {actions}
            </View>
            <View style={s.contenu}>{children}</View>
        </View>
    )
}
