import Spinner from '@/components/spinner'
import { usePalette } from '@/contextes/contextePalette'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

/**
 * Spinner centered over a form while it is being sent (touches go through).
 *
 * @author Philip — user story 20: shared by create.tsx (where it lived,
 *   rectification) and indisponibilite.tsx
 * @returns {JSX.Element}
 */
export default function VoileEnvoi() {
    const { t } = useTranslation()
    const { colors } = usePalette()
    return (
        <View style={styles.voile} pointerEvents="none">
            <Spinner size={40} color={colors.text} accessibilityLabel={t('common:loading')} />
        </View>
    )
}

const styles = StyleSheet.create({
    voile: {
        position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
