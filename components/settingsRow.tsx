import { LinkAbs, linkStyle } from "@/abstractions/linkAbs"
import SwitchAbs from "@/abstractions/switchAbs"
import TextInputAbs from "@/abstractions/textInputAbs"
import { useFont } from "@/contextes/contexteFont"
import { usePalette } from "@/contextes/contextePalette"
import Setting from "@/types/settings"
import { useTranslation } from "react-i18next"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import MenuDeroulant from "./menuDeroulant"

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
        container: {
            width:'50%',
        },
        linkContainer: {
            width:'30%'
        },
        action: {
            minWidth: 88,
            alignItems: 'flex-end',
        },
        status: {
            color: c.secondary,
            fontFamily: f.body,
            fontSize: 16,
        },
        input: {
            gap: 4, 
            flexDirection: 'column',
            alignItems:'center'
        }
    })
    return (
        <View style={setting.type == 'link' ? s.linkContainer : s.container}>
            {setting.type === 'toggle' && (
                <SwitchAbs
                    style={{alignSelf:'flex-end'}}
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
                <View style={s.action}>
                    <LinkAbs
                        href={setting.href}
                        externalLink={setting.externalLink}
                        disabled={setting.disabled ?? false}
                        style={s.status}
                    >
                        {t('open')}
                    </LinkAbs>
                </View>
            )}
            {setting.type === 'input' && (
                <View style={s.input}>                    
                    <TextInputAbs
                        keyboardType={setting.keyboardType}
                        onBlur={setting.onBlur}
                        onChangeText={setting.onChangeText}
                        value={setting.value}
                        style={{width:'100%'}}
                    />
                    <TouchableOpacity
                        onPress={setting.setDefault}
                    ><Text style={linkStyle(c, f)}>{t('setDefault') }</Text></TouchableOpacity>
                </View>
            )}
        </View>
    )
}