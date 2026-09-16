import { useActionFabContext} from "@/contextes/contextActionFAB";
import { useNavFabContext } from "@/contextes/contexteNavFAB";
import { usePalette } from "@/contextes/contextePalette";
import Icon from "@react-native-vector-icons/ionicons";
import { BottomTabBar, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export function CustomTabBar(props: BottomTabBarProps) {
    const { config: NavConfig } = useNavFabContext();
    const { config: ActionConfig, actionRef } = useActionFabContext()
    const {colors} = usePalette()
    
    const router = useRouter();

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
            {NavConfig && (
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
                    onPress={() => { actionRef.current?.() }}
                    style={s.fab}
                >
                    {
                        ActionConfig.icon ?? <Icon name="checkmark" color={colors.text} size={24}/>
                    }
                </TouchableOpacity>
            )}
            <BottomTabBar {...props} />
        </View>
    );
}

