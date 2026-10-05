import log from '@/functions/log';
import * as Haptics from 'expo-haptics';
import { createContext, ReactNode, useContext, useRef, useState } from "react";
import { Dimensions, ScrollView } from "react-native";
import { Easing, SharedValue, useSharedValue, withTiming } from "react-native-reanimated";
import { useTimeline } from "./contexteTimeline";

// Types
type GestionScrollContextType = {
  // Refs
  listeRefs: React.MutableRefObject<(ScrollView | null)[]>;
  
  // Zoom
  enZoom: boolean;
  setEnZoom: (val: boolean) => void;

  // Offset
  offset: SharedValue<number>;
  afficherRetourMaintenant: SharedValue<{ afficher: boolean; left: number }>;

  // Constants
  LEFT_GO_TO_BEFORE: number;
  LEFT_GO_TO_AFTER: number;

  // Functions
  initialiserOffset: (offsetDefault: number) => void;
  onPan: (offset: number) => void;
  abonnerRef: (ref: ScrollView | null, index: number) => void;
  viderRefs: () => void;
};

const GestionScrollContext = createContext<GestionScrollContextType | null>(null);

export const GestionScrollProvider = ({ children }: { children: ReactNode }) => {
  const { pxHeures, L_HEURES, H_HEURES } = useTimeline();
  const {width: WIN_W } = Dimensions.get('window');

  const LEFT_GO_TO_BEFORE = 96
  const LEFT_GO_TO_AFTER = WIN_W - 56 

  // Refs des listes à synchroniser
  const listeRefs = useRef<(ScrollView | null)[]>([]);
  const offsetMaintenant = useRef(0);

  // Shared values
  const offset = useSharedValue(0);
  const afficherRetourMaintenant = useSharedValue<{ afficher: boolean; left: number }>({
    afficher: false,
    left: 0,
  });

  // Zoom state — utilisable pour appliquer des styles pendant le pinch
  const [enZoom, setEnZoom] = useState(false);

  // Initialise toutes les listes à un offset donné
  const initialiserOffset = (offsetDefault: number) => {
    log("offset init", offsetDefault)
    offsetMaintenant.current = offsetDefault;
    offset.value = withTiming(offsetDefault, {duration:300, easing:Easing.inOut(Easing.linear)});
  };

  const derniereHapticsOffset = useRef(0);

  const onPan = (offset: number) => {
    // Haptics fired for a snap effect
    if (Math.abs(offset - derniereHapticsOffset.current) >= pxHeures + L_HEURES) {
      derniereHapticsOffset.current = offset;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }

    const distanceRatio = pxHeures * 6;
    const afficher =
      offset > offsetMaintenant.current + distanceRatio ||
      offset < offsetMaintenant.current - distanceRatio;
    const left =
      offset < offsetMaintenant.current - distanceRatio
        ? LEFT_GO_TO_AFTER
        : LEFT_GO_TO_BEFORE;

    if (afficherRetourMaintenant.value.afficher !== afficher) {
      afficherRetourMaintenant.value = { afficher, left };
    }
  };

  // Abonne une liste au système de scroll
  const abonnerRef = (ref: ScrollView | null, index: number) => {
    if (ref) {
      listeRefs.current[index] = ref;
      ref.scrollTo({ x: offset.value, y: 0, animated: false });
    }
  };

  // Vide toutes les refs (cleanup)
  const viderRefs = () => {
    listeRefs.current = listeRefs.current.map(() => null);
  };

  return (
    <GestionScrollContext.Provider
      value={{
        listeRefs,
        enZoom,
        setEnZoom,
        offset,
        afficherRetourMaintenant,
        LEFT_GO_TO_BEFORE,
        LEFT_GO_TO_AFTER,
        initialiserOffset,
        onPan,
        abonnerRef,
        viderRefs,
      }}
    >
      {children}
    </GestionScrollContext.Provider>
  );
};

export const useGestionScroll = (): GestionScrollContextType => {
  const ctx = useContext(GestionScrollContext);
  if (!ctx) throw new Error("useGestionScroll doit être utilisé dans un GestionScrollProvider");
  return ctx;
};

