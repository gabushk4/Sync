//FAB fix Gabriel
//8 octobre

import { Href } from 'expo-router';
/* import { createContext, RefObject, useCallback, useContext, useMemo, useRef, useState } from 'react';

// Configuration unifiée pour le FAB
export type FabConfig = {
  icon: React.ReactNode | null;
  href?: Href;           // route Expo Router à ouvrir (optionnel)
  params?: any;
  visible: boolean;
} | undefined;

type FabState = {
  owner: string;           // identifiant unique pour éviter les conflits
  config: FabConfig;
  action?: () => void;     // l'action associée
} | null;

// Type du contexte
export type FabContextType = {
  config: FabConfig;       // dernière configuration active
  setFabConfig: (owner: string, config: FabConfig, action?: () => void) => void;
  release: (owner: string) => void;     // cleanup par owner
  actionRef: RefObject<(() => void) | null>;
}

// Valeurs par défaut
const DEFAULT_VALUE: FabContextType = {
  config: undefined,
  setFabConfig: () => {},
  release: () => {},
  actionRef: { current: null },
};

// Contexte
const FabContext = createContext<FabContextType>(DEFAULT_VALUE);

export function FabProvider({ children }: { children: React.ReactNode }) {
  // État avec owner pour éviter les conflits
  const [state, setState] = useState<FabState>(null);
  const actionRef = useRef<(() => void) | null>(null)    

  // Créateur d'action avec owner (garantit un seul actif à la fois)
  const setFabConfig = useCallback((owner: string, config: FabConfig, action?: () => void) => {
    setState({ owner, config, action });
    log(`fab set by ${owner}: ${config?.href || 'action'}`);
  }, []);

  // Release par owner (cleanup précis)
  const release = useCallback((owner: string) => {
    setState(prev => {
      if (prev && prev.owner === owner) {
        log(`fab released by ${owner}`);
        return null;
      }
      return prev;
    });
  }, []);

  const value = useMemo(() => ({
    config: state?.config,
    setFabConfig,
    release,
    actionRef, // à ajuster selon ton implémentation actuelle
  }), [state, setFabConfig, release, actionRef]);

  return (
    <FabContext.Provider value={value}>
      {children}
    </FabContext.Provider>
  );
}

export const useFabContext = () => {
  const ctx = useContext(FabContext)
  if(!ctx) throw new Error("useFabContext must be under FabProvider")
  return ctx
}; */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

//FAB FIX Gabriel
//8 octobre

export type FabConfig = {
  icon: React.ReactNode | null;
  href?: Href;
  params?: any;
  visible: boolean;
  /**
   * When set, pressing the FAB shows this error instead of navigating / acting
   * (e.g. a past day).
   *
   * @author Philip — rectification for a more conventional display:
   *   a clear message instead of opening a form that can't be submitted
   */
  bloque?: string;
  /**
   * With `href` the event creation: pressing the FAB first asks what to add (create an
   * event, or add an unavailability), see MenuCreation. Both get `params`.
   *
   * @author Philip — user story 20
   */
  menuCreation?: boolean;
} | undefined;

type FabState = { owner: string; config: FabConfig } | null;

type FabActions = {
  setFabConfig: (owner: string, config: FabConfig, action?: () => void) => void;
  release: (owner: string) => void;
  actionRef: React.MutableRefObject<(() => void) | null>;
};

//Separation of contexts means less renders and better fade out animation for the FAB
const FabStateContext = createContext<FabConfig>(undefined);
const FabActionsContext = createContext<FabActions | null>(null);

/**
 * Looks if both configs (a and b) are the same
 * @param { FabConfig } a 
 * @param { FabConfig } b 
 * @returns True if both configs are the same. False otherwise
 */
function sameConfig(a: FabConfig, b: FabConfig) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.visible === b.visible &&
    (a.href ?? null) === (b.href ?? null) &&
    a.icon === b.icon &&
    (a.bloque ?? null) === (b.bloque ?? null) &&
    !!a.menuCreation === !!b.menuCreation &&
    JSON.stringify(a.params ?? null) === JSON.stringify(b.params ?? null)
  );
}

export function FabProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FabState>(null);
  const actionRef = useRef<(() => void) | null>(null);
  const ownerRef = useRef<string | null>(null); // owner courant, lisible sans re-render

  const setFabConfig = useCallback((owner: string, config: FabConfig, action?: () => void) => {
    ownerRef.current = owner;
    actionRef.current = action ?? null;
    setState(prev =>
      prev && prev.owner === owner && sameConfig(prev.config, config)
        ? prev                       // rien n'a changé → pas de re-render
        : { owner, config }
    );
  }, []);

  const release = useCallback((owner: string) => {
    if (ownerRef.current !== owner) return;  // un autre écran a déjà pris la main
    ownerRef.current = null;
    actionRef.current = null;
    setState(null);
  }, []);

  // Ne change jamais → les écrans qui utilisent les hooks ne re-rendent plus
  const actions = useMemo(() => ({ setFabConfig, release, actionRef }), [setFabConfig, release]);

  return (
    <FabActionsContext.Provider value={actions}>
      <FabStateContext.Provider value={state?.config}>
        {children}
      </FabStateContext.Provider>
    </FabActionsContext.Provider>
  );
}

export const useFabState = () => useContext(FabStateContext);
export const useFabActions = () => {
  const ctx = useContext(FabActionsContext);
  if (!ctx) throw new Error('useFabActions doit être utilisé dans un FabProvider');
  return ctx;
};