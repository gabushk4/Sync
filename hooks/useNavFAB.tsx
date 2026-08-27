import { NavFabConfig, useNavFabContext } from '@/contextes/contexteNavFAB';

import { useIsFocused } from '@react-navigation/native'
import { useEffect, useRef } from 'react'

export function useNavFab(config: NavFabConfig) {
    const { setNavConfig } = useNavFabContext()
    const isFocused = useIsFocused()   // boolean réactif → déclenche un re-render au changement
    const lastSerialized = useRef<string | null>(null)

    const serialized = config
        ? JSON.stringify({ href: config.href, params: config.params, visible: config.visible })
        : null

    useEffect(() => {
        if (!isFocused) return

        if (serialized !== lastSerialized.current) {
            lastSerialized.current = serialized
            setNavConfig(config)
        }

        return () => {
            // ne nettoie que si on quitte vraiment le focus ou l'écran démonte
        }
    }, [isFocused, serialized])

    // Nettoyage explicite à la perte de focus / démontage
    useEffect(() => {
        if (!isFocused) {
            setNavConfig(null)
            lastSerialized.current = null
        }
    }, [isFocused])
}