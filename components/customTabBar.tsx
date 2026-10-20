import { usePalette } from "@/contextes/contextePalette";
import Icon from "@react-native-vector-icons/ionicons";
import { BottomTabBar, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFabActions, useFabState, FabConfig } from "@/contextes/contexteFAB";
import log from "@/functions/log";
import ToastAbs from "@/abstractions/toastAbs";
import { toastTypes } from "@/constants/toastConfig";
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from "react-native-reanimated";
import { withTimingConfig } from "@/constants/ReanimatedConfs";
import { useTranslation } from "react-i18next";
import MenuCreation from "./menuCreation";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const s = StyleSheet.create({
  container: { position: 'relative' },
  fab: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    zIndex: 10,
    width: 64,
    aspectRatio: 1,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
});

const Fab = React.memo(function Fab() {
    const config = useFabState();
    const { actionRef } = useFabActions();
    const { colors } = usePalette();
    const router = useRouter();
    const { t } = useTranslation('home');
    // "What to add?" menu (FabConfig.menuCreation), with the params it was opened with.
    const [menuCreation, setMenuCreation] = useState<{ params?: any } | null>(null);

    // Contenu actuellement affiché (reste en place pendant le fade-out)
    const [display, setDisplay] = useState<FabConfig>(undefined);

    const shown = !!config && config.visible !== false;    

    const progress = useSharedValue(0);
    // Whether the FAB is currently hidden (no config), and the pending swap timer.
    const cacheRef = useRef(true);
    const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
    useEffect(() => {
        if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
        swapTimerRef.current = null;

        // Plus de config, ou masqué : fade-out, on garde `display` pour l'animation
        if (!config || config.visible === false) {
        cacheRef.current = true;
        progress.value = withTiming(0, withTimingConfig);
        return;
        }

        // Coming back from hidden (e.g. closing the conflict screen over the create
        // form): nothing to fade out, show the new content right away. It used to
        // wait for a fade-out of the hidden button first, so it appeared late.
        // Rectification (Philip) for a more conventional display.
        if (cacheRef.current) {
        cacheRef.current = false;
        setDisplay(config);
        progress.value = withTiming(1, { duration: 150 });
        return;
        }

        const swap = () => setDisplay(config);

        
        const FADE_OUT_T = 150 //ms

        // Fade-out
        progress.value = withTiming(0.3, { duration: FADE_OUT_T })                        
        swapTimerRef.current = setTimeout(() => {
            //swap
            swap();
            //fade-in
            progress.value = withTiming(1, withTimingConfig);    
        }, FADE_OUT_T)        
            
    }, [config]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ scale: 0.8 + 0.2 * progress.value }],
    }));

    if (!display) return null;

    const onPress = () => {
        // Blocked FAB (e.g. a past day): explain why instead of navigating.
        if (display.bloque) {
        ToastAbs.show({ type: toastTypes.error, text2: display.bloque });
        return;
        }
        // Asks first whether to create an event or add an unavailability
        // (Philip — user story 20).
        if (display.href && display.menuCreation) {
        setMenuCreation({ params: display.params });
        return;
        }
        if (display.href) {
        router.push(
            display.params
            ? ({ pathname: display.href as unknown as string, params: display.params } as any)
            : (display.href as any)
        );
        } else {
        actionRef.current?.();
        }
    };

    const ouvrirDepuisMenu = (pathname: string) => {
        const params = menuCreation?.params;
        setMenuCreation(null);
        router.push(params ? ({ pathname, params } as any) : (pathname as any));
    };

    return (
        <>
        <AnimatedTouchableOpacity
        disabled={!shown}
        onPress={onPress}
        style={[s.fab, animatedStyle, { borderColor: colors.border, backgroundColor: colors.secondary }]}
        >
        {display.icon ?? <Icon name="add" color={colors.text} size={24} />}
        </AnimatedTouchableOpacity>
        <MenuCreation
            visible={!!menuCreation}
            titre={t('creation.titre')}
            onCreerEvenement={() => ouvrirDepuisMenu(display.href as unknown as string)}
            onAjouterIndisponibilite={() => ouvrirDepuisMenu('/home/indisponibilite')}
            onFermer={() => setMenuCreation(null)}
        />
        </>
    );
});

export function CustomTabBar(props: BottomTabBarProps) {
  return (
    <View style={s.container}>
      <Fab />
      <BottomTabBar {...props} />
    </View>
  );
}