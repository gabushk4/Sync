import { useActionFabContext} from "@/contextes/contextActionFAB";
import { useNavFabContext } from "@/contextes/contexteNavFAB";
import { usePalette } from "@/contextes/contextePalette";
import Icon from "@react-native-vector-icons/ionicons";
import { BottomTabBar, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import Spinner from "@/components/spinner";

export function CustomTabBar(props: BottomTabBarProps) {
    const { config: NavConfig } = useNavFabContext();
    const { config: ActionConfig, actionRef } = useActionFabContext()
    const {colors} = usePalette()
    // User story 12: the state drives the spinner; the ref blocks a second press
    // made before the re-render that disables the button (fast double tap).
    const [actionEnCours, setActionEnCours] = useState(false)
    const actionEnCoursRef = useRef(false)
    
    const router = useRouter();

    /**
     * Runs the current screen's action. User story 12: when the action returns a
     * promise (e.g. saving an event), the FAB shows a spinner and ignores
     * presses until it settles, so the member sees the app working and can't
     * send the same request twice.
     *
     * @returns {Promise<void>}
     */
    const lancerAction = async () => {
        if (actionEnCoursRef.current) return
        const resultat = actionRef.current?.()
        // Synchronous action (e.g. opening a modal): nothing to wait for.
        if (!(resultat instanceof Promise)) return
        actionEnCoursRef.current = true
        setActionEnCours(true)
        try {
            await resultat
        } catch {
            // The screen's action handles and reports its own errors.
        } finally {
            actionEnCoursRef.current = false
            setActionEnCours(false)
        }
    }

    const s = StyleSheet.create({
        container: {
            position: 'relative',
        },
        fab: {
            position: 'absolute',
            top: -12,
            alignSelf: 'center',
            zIndex: 10,
            width: 64,
            aspectRatio:1/1,
            borderRadius: 100,
            borderWidth: 1,
            borderColor:colors.border,
            backgroundColor: colors.secondary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 6,
        },
    });

    return (
        <View style={s.container}>
            {/* `visible` lets the month calendar hide the FAB (user story 5). */}
            {NavConfig && NavConfig.visible !== false && (
                <TouchableOpacity
                    onPress={() => router.push(
                        NavConfig.params
                            ? ({ pathname: NavConfig.href as unknown as string, params: NavConfig.params } as any)
                            : (NavConfig.href as unknown as string)
                    )}
                style={s.fab}
                >
                    {
                        NavConfig.icon ?? <Icon name="add" color={colors.text} size={24}/>
                    }
                </TouchableOpacity>
            )}
            {ActionConfig && (
                <TouchableOpacity
                    onPress={lancerAction}
                    disabled={actionEnCours}
                    style={s.fab}
                >
                    {actionEnCours
                        ? <Spinner size={28} />
                        : ActionConfig.icon ?? <Icon name="checkmark" color={colors.text} size={24}/>
                    }
                </TouchableOpacity>
            )}
            <BottomTabBar {...props} />
        </View>
    );
}

