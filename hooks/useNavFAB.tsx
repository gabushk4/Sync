import React from 'react'
import { useFocusEffect } from 'expo-router'
import { useRef } from 'react'

import { useFabActions, FabConfig } from '@/contextes/contexteFAB';

export function useNavFab(owner: string, config: FabConfig) {
    //Centralization of FAB context 
    const { setFabConfig, release } = useFabActions()

    const configRef = useRef(config)    

    console.log('useNavFab render', owner);

    const href = config?.href
    const visible = config?.href
    const paramsKey = JSON.stringify(config?.params ?? null)

    useFocusEffect(React.useCallback(() => {      
        console.log('useFocusEffect fired', owner, configRef.current?.href);
        if(configRef.current?.href)
            setFabConfig(owner, configRef.current)
        else
            console.error("Nav FAB must have a href")            

        return () => release(owner)
    },[owner, href, visible, paramsKey]))
}