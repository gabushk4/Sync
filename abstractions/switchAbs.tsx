import { usePalette } from "@/contextes/contextePalette";
import React from "react";
import { Platform, Switch } from "react-native";

export default function SwitchAbs({ value, style, onChange, ...props }: React.ComponentProps<typeof Switch>) {
    const { colors } = usePalette()

    return (
        <Switch
            style={[style, Platform.OS === 'android' ? {} : {}]}
            value={value}
            onChange={onChange}
            thumbColor={Platform.OS === 'android' ? colors.secondary : colors.card}
            trackColor={props.trackColor ?? {false:colors.muted, true:colors.secondary}}
        />
    )
}