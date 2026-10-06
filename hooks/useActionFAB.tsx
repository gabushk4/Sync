import { useActionFabContext } from '@/contextes/contextActionFAB';
import { useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useEffect } from 'react';

/**
 * Shows the action FAB with `icon` while the screen is focused and runs `action` when it's pressed.
 * User story 12: return a promise from `action` (an async function) for the FAB
 * to show a spinner until it settles.
 *
 * @param {object} params
 * @param {() => void | Promise<unknown>} params.action - Run on press. Async to show the spinner.
 * @param {ReactNode} params.icon - Icon of the FAB, a checkmark when undefined.
 * @returns {void}
 */
export function useActionFab({ action, icon }: { action: () => void | Promise<unknown>; icon: ReactNode }) {
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