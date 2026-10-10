import { useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { FabConfig, useFabActions } from '@/contextes/contexteFAB'; 
import log from '@/functions/log';

export function useActionFab(owner: string, { action, config }: { action: () => void; config: FabConfig }) {
    const { setFabConfig, actionRef, release } = useFabActions();

    const configRef = useRef(config)

    // L'action locale est toujours à jour, mais n'est enregistrée qu'au focus
    const actionLocalRef = useRef(action);
    actionLocalRef.current = action;
    const stableAction = useCallback(() => actionLocalRef.current(), []);

    const visible = config?.visible;
    
    // Gère l'icône + le montage/démontage lié au focus de l'écran
    useFocusEffect(
        useCallback(() => {
            setFabConfig(owner, configRef.current, stableAction);
            return () => {
                log("action fab cleansed by", owner)
                release(owner)
            };
        },  [owner, visible, setFabConfig, release, stableAction])
    );
}