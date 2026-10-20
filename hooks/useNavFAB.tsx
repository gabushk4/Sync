import React, { useEffect } from 'react'
import { useFocusEffect } from 'expo-router'
import { useRef } from 'react'

import { useFabActions, FabConfig } from '@/contextes/contexteFAB';

export function useNavFab(owner: string, config: FabConfig) {
    //Centralization of FAB context 
    const { setFabConfig, release } = useFabActions()

    const configRef = useRef(config)
    // Kept current: the focus effect below re-runs when the params change (paramsKey),
    // and must then publish the new ones, not the first render's (e.g. the home
    // calendar's selected day / range for the "+" button). Synced in an effect (not
    // during render, React Compiler lint); declared before the focus effect, so it
    // runs first in the same commit. Philip — user story 5.
    useEffect(() => { configRef.current = config })

    console.log('useNavFab render', owner);

    const href = config?.href
    const visible = config?.href
    const paramsKey = JSON.stringify(config?.params ?? null)
    // Republished when it changes (e.g. switching to a past day blocks the "+").
    const bloque = config?.bloque

    useFocusEffect(React.useCallback(() => {      
        console.log('useFocusEffect fired', owner, configRef.current?.href);
        if(configRef.current?.href)
            setFabConfig(owner, configRef.current)
        else
            console.error("Nav FAB must have a href")            

        return () => release(owner)
    },[owner, href, visible, paramsKey, bloque]))
}