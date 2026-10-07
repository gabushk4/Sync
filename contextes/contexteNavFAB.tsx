import { Href } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type NavFabConfig = {
  icon: React.ReactNode | null;
  href: Href;           // route Expo Router à ouvrir
  params?: any;
  visible?: boolean | null;
} | undefined;

type NavFabState = {
  owner: string;
  config: NavFabConfig;
} | null

const NavFabContext = createContext<{
  config: NavFabConfig;
  setNavConfig: (owner: string, config: NavFabConfig) => void;
  release: (owner: string) => void;
}>({ config: undefined, setNavConfig: () => { }, release: () => { } });

export function FabProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NavFabState>(null)

  const setNavConfig = useCallback((owner:string, config: NavFabConfig) => {
    setState({owner, config})
  }, [])  

  const release = useCallback((owner: string) => {
    setState(prev => (prev?.owner === owner ? null : prev)) //only unmount IF owner is unmounting
  }, [])

  const value = useMemo(
    () => ({ config: state?.config, setNavConfig, release }) ,
    [state, setState, release]
  )
  
  return (
    <NavFabContext.Provider value={value}>
      {children}
    </NavFabContext.Provider>
  );
}

export const useNavFabContext = () => useContext(NavFabContext);