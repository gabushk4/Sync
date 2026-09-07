import React from 'react'
import { useFocusEffect } from 'expo-router/react-navigation'
import { NavFabConfig, useNavFabContext } from '@/contextes/contexteNavFAB';

import { useEffect, useRef } from 'react'

export function useNavFab(config: NavFabConfig) {
    const { setNavConfig } = useNavFabContext()
    const lastSerialized = useRef<string | null>(null)

    const serialized = config
        ? JSON.stringify({ href: config.href, params: config.params, visible: config.visible })
        : null
    
    useFocusEffect(React.useCallback(() => { 
        if (serialized !== lastSerialized.current) {
            lastSerialized.current = serialized
            setNavConfig(config)
        }

        return () => {
            // ne nettoie que si on quitte vraiment le focus ou l'écran démonte
            setNavConfig(null)
            lastSerialized.current = null
        }
    },[serialized]))
}