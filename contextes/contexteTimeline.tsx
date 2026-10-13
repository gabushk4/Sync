import { useState, createContext, useContext, ReactNode } from "react";
import { useSharedValue, SharedValue } from "react-native-reanimated";

// Types
type TimelineContextType = {
  L_HEURES: number;
  H_HEURES: number;
  PX_HEURES: number;
  pxHeures: number;
  pxHeuresShared: SharedValue<number>;
  modifierPxHeures: (nouvValeur: number) => void;
};

// Contexte
export const TimelineContext = createContext<TimelineContextType | null>(null);

// Provider
export const TimelineProvider = ({ children }: { children: ReactNode }) => {
  const PX_HEURES = 64;
  const L_HEURES = 44;
  const H_HEURES = 18;

  const pxHeuresShared = useSharedValue(PX_HEURES);
  const [pxHeures, setPxHeures] = useState(PX_HEURES);

  const modifierPxHeures = (nouvValeur: number) => {
    if (nouvValeur >= 0 && nouvValeur <= PX_HEURES) {
      pxHeuresShared.value = nouvValeur;
      setPxHeures(nouvValeur);
    }
  };

  return (
    <TimelineContext.Provider value={{ L_HEURES, H_HEURES, PX_HEURES, pxHeures, pxHeuresShared, modifierPxHeures }}>
      {children}
    </TimelineContext.Provider>
  );
};

// Hook
export const useTimeline = (): TimelineContextType => {
  const ctx = useContext(TimelineContext);
  if (!ctx) throw new Error("useTimeline doit être utilisé dans un TimelineProvider");
  return ctx;
};