import { Href } from 'expo-router';
import { createContext, useContext, useMemo, useState } from 'react';

export type NavFabConfig = {
  icon: React.ReactNode | null;
  href: Href;           // route Expo Router à ouvrir
  params?: any;
  visible?: boolean | null;
} | null;

const NavFabContext = createContext<{
  config: NavFabConfig;
  setNavConfig: (config: NavFabConfig) => void;
}>({ config: null, setNavConfig: () => { } });



export function FabProvider({ children }: { children: React.ReactNode }) {
  const [config, setNavConfig] = useState<NavFabConfig>(null);

  const value = useMemo(
    () => ({ config, setNavConfig }) ,
    [config]
  )
  
  return (
    <NavFabContext.Provider value={value}>
      {children}
    </NavFabContext.Provider>
  );
}

export const useNavFabContext = () => useContext(NavFabContext);