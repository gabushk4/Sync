import { useActionFabContext } from '@/contextes/contextActionFAB';
import { useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useEffect } from 'react';

export function useActionFab({ action, icon }: { action: () => void; icon: ReactNode }) {
    const { setFabConfig, actionRef } = useActionFabContext();

    // Garde la ref toujours à jour, à CHAQUE render (pas de deps)
    useEffect(() => {
        actionRef.current = action;
    });

    // Gère l'icône + le montage/démontage lié au focus de l'écran
    useFocusEffect(
        useCallback(() => {
            setFabConfig({ icon });
            return () => setFabConfig(null);
        }, [])
    );
}