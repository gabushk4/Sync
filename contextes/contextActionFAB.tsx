import { createContext, RefObject, useContext, useRef, useState } from 'react';

export type ActionFabIconConfig = {
    icon: React.ReactNode | null;
} | null;

const ActionFabContext = createContext<{
    config: ActionFabIconConfig;
    setFabConfig: (config: ActionFabIconConfig) => void;
    actionRef: RefObject<(() => void) | null>;
}>({ config: null, setFabConfig: () => {}, actionRef: { current: null } });

export function FabProvider({ children }: { children: React.ReactNode }) {
    const [config, setFabConfig] = useState<ActionFabIconConfig>(null);
    const actionRef = useRef<(() => void) | null>(null);

    return (
        <ActionFabContext.Provider value={{ config, setFabConfig, actionRef }}>
            {children}
        </ActionFabContext.Provider>
    );
}

export const useActionFabContext = () => useContext(ActionFabContext);