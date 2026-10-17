import Container from "@/abstractions/container";

import Separator, { isLast } from "@/components/listSeparator";

import { useFont } from "@/contextes/contexteFont";
import { usePalette } from "@/contextes/contextePalette";
import { useSettings } from "@/contextes/contexteSettings";

import { getAvailableTimezones } from "@/functions/timezones";

import Setting from "@/types/settings";

import Radius from "@/constants/Radius";

import ServerStatus from "@/components/serverStatus";
import SettingRow from "@/components/settingsRow";
import { DEFAULT_HUE } from "@/constants/Colors";
import log from "@/functions/log";
import * as Camera from 'expo-camera';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

const ABOUT_URL = 'https://sync.app/about';
const PRIVACY_URL = 'https://app.notion.com/p/syncapp/Politique-de-confidentialit-sync-28b05fccf55c80638d84ce250bccadd1';
const MINOR_SEC_URL = 'https://app.notion.com/p/syncapp/Normes-li-s-a-la-s-curit-des-mineurs-2ae05fccf55c80909cc7f3783d0d3953' 


type Permissions = {
    camera: { granted: boolean, canAskAgain: boolean },
    location: { granted: boolean, canAskAgain: boolean },
    notifications: { granted: boolean, canAskAgain: boolean }
}

/**
 * A settings screen meant to let the user customize his app experience. 
 * Settings available: 
 *      timezone 
 *      language (fr, en) 
 *      OS permissions ( location, camera, notifications )      
 *      Asking for datas of the account stored in the system
 *      Asking for deletion of the account from the system
 *       
 * @returns {JSX} 
 */
export default function Settings(){
    const { colors : c } = usePalette()
    const { fonts: f } = useFont()    
    const {t} = useTranslation('settings')
    const { settings: values, hydrated, setSetting } = useSettings()
    const {hue, setHue} = usePalette()

    const [permissions, setPermissions] = useState<Permissions>()
    const [, requestCameraPermission, getCameraPermission] = Camera.useCameraPermissions()
    const [localHue, setLocalHue] = useState<number>(hue)

    const timezones = getAvailableTimezones()

    const openPermissionSettings = () => {
        log("opening settings")
        Linking.openSettings()
    }

    const requestCamera = async (enabled: boolean) => {
        log("enabled", enabled)
        if (!enabled || !permissions?.camera.canAskAgain) {
            openPermissionSettings()
            return
        }
        else if (enabled) {
            openPermissionSettings()
        }
        await requestCameraPermission()
        await getPermissions()
    }

    const requestLocation = async (enabled: boolean) => {
        if (!enabled || !permissions?.location.canAskAgain) {
            openPermissionSettings()
            return
        }
        else if (enabled) {
            openPermissionSettings()
        }
        await Location.requestForegroundPermissionsAsync()
        await getPermissions()
    }

    const requestNotifications = async (enabled: boolean) => {
        if (!enabled || !permissions?.notifications.canAskAgain) {
            openPermissionSettings()
            return
        }
        else if (enabled) {
            openPermissionSettings()
        }
        await Notifications.requestPermissionsAsync()
        await getPermissions()
    }

    const settings: Setting[] = [
        
        {
            id: 'timezone',
            titleKey: 'timezone',
            type: 'dropdown',
            value: values.timezone,
            options: timezones,
            onValueChange: value => setSetting('timezone', value)
        },
        {
            id: 'language', 
            titleKey: 'language',
            type: 'dropdown',
            value: values.language,
            options: [
                { value: 'fr', titleKey: 'french' },
                { value: 'en', titleKey: 'english' },
            ],
            onValueChange: value => setSetting('language', value as 'en' | 'fr'),
        },
        //TODO: color picker instead on HSL color base
        {
            id: 'theme',
            titleKey: 'theme',
            type: 'input',
            keyboardType: 'numeric',
            value: localHue.toString(),
            setDefault: () => {
                setHue(DEFAULT_HUE)
                setLocalHue(DEFAULT_HUE)
            },
            onBlur(e) {
                const newHue = Number(localHue) % 360
                setHue(newHue)
                setLocalHue(newHue)
                setSetting('theme', newHue)
            },
            onChangeText(text) {
                setLocalHue(Number(text))                
            }
        },
        {
            id: 'imports',
            type: 'section',
            titleKey: 'imports',
            settings: [
                {
                    id:'systemCalendar',
                    type: 'link',
                    href: '/(tabs)/profile/importCalendar',
                    titleKey: 'calendarImports.system'
                },
                {
                    id: 'fileCalendar',
                    type: 'link',
                    href: '/(tabs)/profile/',
                    titleKey:'calendarImports.file'
                },
                {
                    id: 'googleCalendar',
                    type: 'link',
                    href: '/(tabs)/profile/settings/calendars/google',
                    titleKey: 'calendarImports.google'
                },
                {
                    id: 'outlookCalendar',
                    type: 'link',
                    href: '/(tabs)/profile/settings/calendars/outlook',
                    titleKey: 'calendarImports.outlook'
                }
            ]
        },
        {
            id: 'permissions',
            titleKey: 'permissions',
            type: 'section',
            settings: [
                {
                    id: 'cameraPermission',
                    titleKey: 'camera',
                    type: 'toggle',
                    value: permissions?.camera.granted ?? false,
                    disabled: permissions === undefined,
                    onValueChange: requestCamera,
                },
                {
                    id: 'locationPermission',
                    titleKey: 'location',
                    type: 'toggle',
                    value: permissions?.location.granted ?? false,
                    disabled: permissions === undefined,
                    onValueChange: requestLocation,
                },
                {
                    id: 'notificationsPermission',
                    titleKey: 'notifications',
                    type: 'toggle',
                    value: permissions?.notifications.granted ?? false,
                    disabled: permissions === undefined,
                    onValueChange: requestNotifications,
                },
            ],
        },
        {
            id: 'exportData',
            titleKey: 'exportData',
            type: 'link',
            href: {
                pathname: "/(modals)/confirm",
                params: { action: "exportData" },
            }
        },
        {
            id: 'dangerZone',
            titleKey: 'dangerZone',
            type: 'section',
            settings: [
                {
                    id: 'delete_account',
                    titleKey: 'deleteAccount',
                    type: 'link',
                    href: {
                        pathname: "/(modals)/confirm",
                        params: { action: "deleteAccount" },
                    }
                }
            ],
        },
    ]

    /**
     * Gets and sets the app's permissions from the OS itself. Those permissions are displayed in the settings screen.
     */
    const getPermissions = async () => {
        const [camera, notifications, location] = await Promise.all([
            getCameraPermission(),
            Notifications.getPermissionsAsync(),
            Location.getForegroundPermissionsAsync(),
        ]);

        setPermissions({
            camera: { granted: camera.granted, canAskAgain: camera.canAskAgain },
            location: { granted: location.granted, canAskAgain: location.canAskAgain },
            notifications: {
                granted: notifications.granted ||
                    notifications.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
                canAskAgain: notifications.canAskAgain,
            },
        })
    }

    useFocusEffect(useCallback(() => {
        getPermissions()
    }, []))

    const s = StyleSheet.create({
        screen: {
            paddingHorizontal: 16,
            paddingVertical:8
        },
        row: {
            minHeight: 56,
            paddingVertical:8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        label: {
            flex: 1,
            flexShrink: 1,
            color: c.muted,
            fontFamily: f.body,
            fontSize: 20,
        },
        sectionTitle: {
            color: c.secondary,
            fontFamily: f.body,
            fontSize: 16,
            textTransform: 'uppercase',
            marginTop: 12,
            marginBottom: 4,
        },
        sectionContainer: {
            paddingHorizontal: 8,
            borderRadius: Radius.md,
            backgroundColor: c.card,
        },
        
        dangerLabel: {
            color: c.error,
        },
        footer: {
            alignItems: 'center',
            gap: 8,
            paddingVertical: 32,
        },
        version: {
            color: c.muted,
            fontFamily: f.body,
            fontSize: 14,
        },
    })    

    return (
        <Container style={{ backgroundColor: c.background }}>
            <ScrollView contentContainerStyle={s.screen}>
                <ServerStatus/>
                {!hydrated ? (
                    <ActivityIndicator color={c.secondary} />
                ) : settings.map((setting, i) => {
                    console.log("title key", setting.titleKey)
                    return (
                        <View key={setting.id}>
                            {setting.type === 'section' && (
                                <>
                                    <Text style={[s.sectionTitle, { color: setting.id === 'dangerZone' ? c.error : c.muted}]}>{t(setting.titleKey)}</Text>
                                    <View style={[s.sectionContainer, {marginBottom:s.sectionTitle.marginTop, borderWidth: setting.id === 'dangerZone' ? 1 : 0, borderColor:c.error}]}>
                                        {setting.settings.map((childSetting, i) => (
                                            <React.Fragment key={childSetting.id}>
                                                <View style={s.row}>
                                                    <Text style={[s.label, setting.id === 'dangerZone' && s.dangerLabel]}>
                                                        {t(childSetting.titleKey)}
                                                    </Text>
                                                    <SettingRow setting={childSetting}/>
                                                </View>
                                                <Separator show={!isLast(setting.settings, i)}/>
                                            </React.Fragment>
                                        ))}
                                    </View>
                                </>
                            )}
                            {setting.type !== 'section' && (
                                <View style={s.row}>
                                    <Text style={s.label}>{t(setting.titleKey)}</Text>
                                    <SettingRow setting={setting}/>
                                </View>
                            )}
                            <Separator
                                show={
                                    !isLast(settings, i)
                                    && (settings[i + 1].type != 'section' 
                                        && setting.type != 'section'
                                    )
                                }
                            />
                        </View>
                    )
                })}
                <View style={s.footer}>
                    {[
                        { id: 'about', titleKey: 'about', href: ABOUT_URL },
                        { id: 'privacyPolicy', titleKey: 'privacyPolicy', href: PRIVACY_URL },
                        { id: 'minorSecurity', titleKey: 'minorSecurity', href: MINOR_SEC_URL },
                    ].map((setting, index, links) => (
                        <React.Fragment key={setting.id}>
                            <View style={s.row}>
                                <Text style={s.label}>{t(setting.titleKey)}</Text>
                                <SettingRow setting={{ ...setting, type: 'link', externalLink: true }} />
                            </View>
                            <Separator show={index < links.length - 1} />
                        </React.Fragment>
                    ))}
                    <Text style={s.version}>
                        {t('appVersion', { version: Constants.expoConfig?.version ?? '1.0.0' })}
                    </Text>
                </View>
            </ScrollView>
            
        </Container>
    )
}
