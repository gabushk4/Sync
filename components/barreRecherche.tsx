import Ionicons from '@react-native-vector-icons/ionicons'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import TextInputAbs from '@/abstractions/textInputAbs'
import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'

type Props = {
    valeur: string
    onChangeText: (texte: string) => void
    /** "Search" key of the keyboard (optional: the search may already be live). */
    onSubmit?: () => void
    /** ✕ at the end of the bar. */
    onFermer: () => void
    placeholder: string
    /** Read by screen readers on the ✕. */
    libelleFermer: string
    /** Opens the keyboard right away (default). */
    autoFocus?: boolean
}

/**
 * Search bar: magnifier, text field (TextInputAbs, the app's input) and a ✕ to
 * close it. Its band takes the background of what it sits on (here, the home
 * timeline's hours).
 *
 * @author Philip — user story 22 (friend search on the home screen)
 * @param {Props} props
 * @returns {JSX.Element}
 */
export default function BarreRecherche({ valeur, onChangeText, onSubmit, onFermer, placeholder, libelleFermer, autoFocus = true }: Props) {
    const { colors } = usePalette()
    const { fonts } = useFont()

    const s = StyleSheet.create({
        zone: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card },
        barre: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
            height: 40,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
        },
        // The bar draws the border and the background, not the field.
        champ: {
            flex: 1,
            width: undefined,
            height: '100%',
            fontFamily: fonts.body,
            fontSize: 16,
            paddingVertical: 0,
            paddingLeft: 0,
            borderWidth: 0,
            backgroundColor: 'transparent',
        },
    })

    return (
        <View style={s.zone}>
            <View style={s.barre}>
                <Ionicons name="search" size={18} color={colors.muted} />
                <TextInputAbs
                    style={s.champ}
                    value={valeur}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={onSubmit}
                />
                <TouchableOpacity
                    onPress={onFermer}
                    accessibilityRole="button"
                    accessibilityLabel={libelleFermer}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="close-circle" size={20} color={colors.muted} />
                </TouchableOpacity>
            </View>
        </View>
    )
}
