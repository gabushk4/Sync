import { usePalette } from "@/contextes/contextePalette";
import Icon from "@react-native-vector-icons/ionicons";
import { BottomTabBar, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFabActions, useFabState, FabConfig } from "@/contextes/contexteFAB";
import log from "@/functions/log";
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";
import { withTimingConfig } from "@/constants/ReanimatedConfs";

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
    
    // Contenu actuellement affiché (reste en place pendant le fade-out)
    const [display, setDisplay] = useState<FabConfig>(undefined);

    const shown = !!config && config.visible !== false;    

    const progress = useSharedValue(0);
  
    useEffect(() => {
        // Plus de config, ou masqué : fade-out, on garde `display` pour l'animation
        if (!config || config.visible === false) {
        progress.value = withTiming(0, withTimingConfig);
        return;
        }

        const swap = () => setDisplay(config);

        
        const FADE_OUT_T = 150 //ms

        // Fade-out
        progress.value = withTiming(0.3, { duration: FADE_OUT_T })                        
        setTimeout(() => {
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

    return (
        <AnimatedTouchableOpacity
        disabled={!shown}
        onPress={onPress}
        style={[s.fab, animatedStyle, { borderColor: colors.border, backgroundColor: colors.secondary }]}
        >
        {display.icon ?? <Icon name="add" color={colors.text} size={24} />}
        </AnimatedTouchableOpacity>
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