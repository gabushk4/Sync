import { createContext, RefObject, useContext, useRef, useState } from 'react';

export type ActionFabIconConfig = {
    icon: React.ReactNode | null;
} | null;

const ActionFabContext = createContext<{
    config: ActionFabIconConfig;
    setFabConfig: (config: ActionFabIconConfig) => void;
    // May return a promise: the FAB then shows a spinner until it settles (user story 12).
    actionRef: RefObject<(() => void | Promise<unknown>) | null>;
}>({ config: null, setFabConfig: () => {}, actionRef: { current: null } });

export function FabProvider({ children }: { children: React.ReactNode }) {
    const [config, setFabConfig] = useState<ActionFabIconConfig>(null);
    const actionRef = useRef<(() => void | Promise<unknown>) | null>(null);

    return (
        <ActionFabContext.Provider value={{ config, setFabConfig, actionRef }}>
            {children}
        </ActionFabContext.Provider>
    );
}

export const useActionFabContext = () => useContext(ActionFabContext);