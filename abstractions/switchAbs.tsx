import { usePalette } from "@/contextes/contextePalette";
import React from "react";
import { Platform, Switch } from "react-native";

/**
 * Abstraction of the react-native Switch component.
 * Used for UI purposes.
 * @returns
 */
export default function SwitchAbs({ value, style, onValueChange, ...props }: React.ComponentProps<typeof Switch>) {
    const { colors } = usePalette()

    return (
        <Switch
            style={[{alignSelf:'center'}, style]}
            value={value}
            onValueChange={onValueChange}
            thumbColor={Platform.OS === 'android' ? colors.secondary : colors.card}
            trackColor={props.trackColor ?? {false:colors.muted, true:colors.secondary}}
        />
    )
}