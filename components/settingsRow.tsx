import SwitchAbs from "@/abstractions/switchAbs"
import { useFont } from "@/contextes/contexteFont"
import { usePalette } from "@/contextes/contextePalette"
import Setting from "@/types/settings"
import { useTranslation } from "react-i18next"
import { StyleSheet, Text, TouchableOpacity } from "react-native"
import MenuDeroulant from "./menuDeroulant"
import { LinkAbs } from "@/abstractions/linkAbs"

type SettingRowProps = {
    setting: Setting
}

/**
 * Component meant to embed the switch-like behavior of a settings row.
 * Since a setting can have multiple types, the switch logic between those types is centralized here. 
 * @param {SettingRowProps} setting
 * @returns {JSX.Element}
 */
export default function SettingRow({ setting }: SettingRowProps) {
    const { colors: c } = usePalette();
    const { fonts: f } = useFont();

    const { t } = useTranslation('settings');

    const s = StyleSheet.create({
        action: {
            minWidth: 88,
            alignItems: 'flex-end',
        },
        status: {
            color: c.secondary,
            fontFamily: f.body,
            fontSize: 16,
        },
    })
    return (
        <>
            {setting.type === 'toggle' && (
                <SwitchAbs
                    value={setting.value}
                    disabled={setting.disabled ?? false}
                    onValueChange={(value) => setting.onValueChange(value)}
                />
            )}
            {setting.type === 'dropdown' && (
                <MenuDeroulant
                    style={{ flex: 1 }}
                    selected={{ value: setting.value }}
                    values={setting.options.map(option => ({
                        value: option.value,
                        title: option.title ?? t(option.titleKey ?? option.value),
                    }))}
                    onSelection={value => {
                        if (value !== null) setting.onValueChange(value)
                    }}
                    disabled={setting.disabled ?? false}
                />
            )}
            {setting.type === 'link' && (
                <TouchableOpacity
                    style={s.action}
                    disabled={setting.disabled ?? false}
                >
                    <LinkAbs href={setting.href} style={s.status}>{t('open')}</LinkAbs>
                </TouchableOpacity>
            )}
        </>
    )
}