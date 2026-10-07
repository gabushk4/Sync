import React, { useMemo } from 'react'
import { useFocusEffect } from 'expo-router/react-navigation'
import { NavFabConfig, useNavFabContext } from '@/contextes/contexteNavFAB';

import { useEffect, useRef } from 'react'
import log from '@/functions/log';

export function useNavFab(owner: string, config: NavFabConfig) {
    const { setNavConfig, release } = useNavFabContext()

    const configRef = useRef(config)
    configRef.current = config

    const key = useMemo(() => JSON.stringify({owner:owner, href: config?.href, params: config?.params, visible: config?.visible }), [config])
    
    useFocusEffect(React.useCallback(() => { 
            log("nav fab by ", owner)
            setNavConfig(owner, configRef.current)

        return () => {
            log("nav fab cleansed by ", owner)
            release(owner)
        }
    },[key]))
}