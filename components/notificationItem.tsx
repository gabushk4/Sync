import React, { useEffect, useRef, useState } from "react"
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform, useColorScheme } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated"
import axios from "axios"
import Toast from "react-native-toast-message"
import { DateTime } from "luxon"

import { usePalette } from "@/contextes/contextePalette"
import { useNotifications, Notification, NotificationPayload } from "@/contextes/contexteNotifications"
import { useFont } from "@/contextes/contexteFont"
import { useAPI } from "@/contextes/contexteAPI"
import { useAccessToken } from "@/contextes/contexteToken"

import catcher from "@/functions/catcher"
import log from "@/functions/log"
import { convertirUTCversLocale } from "@/functions/convertirUTCenLocal"
import { convertirTimestampDateCourte, convertirTimestampHeure, convertirTimestampQuand } from "@/functions/convertirTimestamp"

import Haptics from "@/abstractions/haptics"

import { withSpringConfig, withTimingConfig } from "@/constants/ReanimatedConfs"
import Icon from "@react-native-vector-icons/ionicons";
import AppIcon from "@/svgs/appIcon"
import { Gesture } from "react-native-gesture-handler"
import ToastAbs from "@/abstractions/toastAbs"
import { toastTypes } from "@/constants/toastConfig"

type Action = {
    label: string
    method: string
    url: string
    body: any
}

type ItemProps = {
    item: Notification
    index: number
    vu: string
}

export default function NotificationItem({ item, index, vu }: ItemProps) {
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()
    const { getToken } = useAccessToken()
    const { APIBaseURL } = useAPI()
    const { notifRefresh } = useNotifications()

    //log("payload", item.payload, typeof item.payload)

    const payload = item.payload as NotificationPayload

    const [selectionner, setSelectionner] = useState(false)
    const [notificationsSelec, setNotificationsSelec] = useState<Array<string>>([])
    
    const [lines, setLines] = useState(1)
    const [montrerDetails, setMontrerDetails] = useState<boolean>(false)
    const [montrerExplExpiration, setMontrerExplExpiration] = useState(false)

    const icones = {
        corbeille:
            colorScheme === "dark"
                ? require("@/assets/icones/corbeille-dark-icon.png")
                : require("@/assets/icones/corbeille-light-icon.png"),
        accepter:
            colorScheme === "dark"
                ? require("@/assets/icones/checkmark-dark-icon.png")
                : require("@/assets/icones/checkmark-light-icon.png"),
        refuser:
            colorScheme === "dark"
                ? require("@/assets/icones/croix-dark-icon.png")
                : require("@/assets/icones/croix-light-icon.png"),
        expiration:
            colorScheme === "dark"
                ? require("@/assets/icones/horloge-dark-icon.png")
                : require("@/assets/icones/horloge-light-icon.png"),
    }

    const heightMaxNotif = 124
    const heightMinNotif = 64

    const backgroundDef = selectionner ? colors.primary : colors.card

    const opaciteOptionsNotif = useSharedValue(0)
    const heightOptionsNotif = useSharedValue(1)
    const bottomOptionsNotif = useSharedValue(16)
    const heightNotif = useSharedValue(heightMinNotif)
    const backgroundColor = useSharedValue(backgroundDef)
    const previewExpirationOpacity = useSharedValue(1)
    const expirationOpacity = useSharedValue(1)
    const expirationExplicationOpacity = useSharedValue(0)

    const panGesture = Gesture.Pan()
        .onChange((e) => {
            
        })

    const actionnerNotif = async (method: string, url: string, body = undefined) => {
        log("actionner notif", {method, url, body})
        try {
            const token = await getToken()
            const response = await axios({
                baseURL: APIBaseURL,
                method,
                url,
                data: body,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            log("reponse en actionnant la notif", response.data)

            if (response.status === 200) {
                notifRefresh?.forceRefresh()
                ToastAbs.show({
                    type: toastTypes.success,
                    text2: response.data.message,
                })
            }
        } catch (error) {
            log("une erreur en actionnant la notif", error)
            catcher(error, "erreur à l'action")
        }
    }

    const supprNotif = async (ids: Array<string> = []) => {
        if (ids.length === 0) {
            return
        }
        try {
            ids.forEach(async (id) =>
                axios.delete(`/notifications/${id}`, {
                    baseURL: APIBaseURL
                })
            )
            notifRefresh?.forceRefresh()
            setNotificationsSelec((prev) => prev.filter((current) => !ids.includes(current)))            
        } catch (err) {
            log("erreur en supprimant une notif", err)
            catcher(err, 'impossible de supprimer une notification')
        }

        
    }

    const notifAnime = useAnimatedStyle(() => {
        "worklet"
        return {
            height: heightNotif.value,
            backgroundColor: backgroundColor.value,
        }
    })

    const optionsNotifAnime = useAnimatedStyle(() => {
        "worklet"
        return {
            opacity: opaciteOptionsNotif.value,
            height: heightOptionsNotif.value,
            bottom: bottomOptionsNotif.value,
        }
    })

    const expirationPreviewIconAnime = useAnimatedStyle(() => {
        "worklet"
        return {
            opacity: previewExpirationOpacity.value,
        }
    })

    const explicationExpirationAnime = useAnimatedStyle(() => {
        "worklet"
        return {
            opacity: expirationExplicationOpacity.value,
        }
    })

    const expirationAnime = useAnimatedStyle(() => {
        "worklet"
        return {
            opacity: expirationOpacity.value,
        }
    })

    const typeLabel = payload?.type.replaceAll("_", " ") ?? ""

    const parsedPayload = (() => {
        if (!item.payload) return null
        if (typeof item.payload === "object") return item.payload
        try {
            return JSON.parse(item.payload)
        } catch {
            return null
        }
    })()

    const montrerDetailsNotif = () => {
        heightNotif.value = withTiming(heightMaxNotif, withTimingConfig)
        previewExpirationOpacity.value = withTiming(0, withTimingConfig)
        opaciteOptionsNotif.value = withTiming(1, withTimingConfig)
        heightOptionsNotif.value = withTiming(40, withTimingConfig)
        bottomOptionsNotif.value = withSpring(-8, withSpringConfig)
        setLines(4)
    }

    const masquerDetailsNotif = () => {
        heightNotif.value = withTiming(heightMinNotif, withTimingConfig)
        previewExpirationOpacity.value = withTiming(1, withTimingConfig)
        opaciteOptionsNotif.value = withTiming(0, { duration: 150 })
        heightOptionsNotif.value = withTiming(1, withTimingConfig)
        bottomOptionsNotif.value = withSpring(16, withSpringConfig)
        setLines(2)
    }

    const montrerExplicationsExpiration = () => {
        expirationOpacity.value = withTiming(0, withTimingConfig)
        expirationExplicationOpacity.value = withTiming(1, withTimingConfig)
    }

    const masquerExplicationExpiration = () => {
        expirationOpacity.value = withTiming(1, withTimingConfig)
        expirationExplicationOpacity.value = withTiming(0, withTimingConfig)
    }

    const selectNotif = () => {
        setNotificationsSelec((prev) => [...prev, item.id])
        backgroundColor.value = withTiming(colors.secondary, { duration: 500 })
    }

    const typeIcon = () => {
        switch (item.type) {
            case "amis":
                return <Icon name="person-outline" color={colors.muted} size={20} />
            case "sync":
                return <AppIcon fill={colors.muted} size={20} />
            case "evenements":
                return <Icon name="calendar-clear-outline" color={colors.muted} size={20} />
            default:
                return null
        }
    }

    useEffect(() => {
        if (montrerExplExpiration) {
            montrerExplicationsExpiration()
            const timer = setTimeout(() => {
                masquerExplicationExpiration()
                setMontrerExplExpiration(false)
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [montrerExplExpiration])

    useEffect(() => {
        //log("montrer details ", item.id, montrerDetails)
        if (montrerDetails === true) {
            montrerDetailsNotif()
        } else if (montrerDetails === false) {
            masquerDetailsNotif()
        }
    }, [montrerDetails])    

    let expired = false
    if (item.expiration === "expired") expired = true
    const expiration = item.expiration ? convertirUTCversLocale(item.expiration) : undefined
    let expirationLabel

    if (expired)
        expirationLabel = "expirée"
    else if(expiration) {
        const expirationNowDiff = expiration.diff(DateTime.now(), 'days').days
        expirationLabel = expirationNowDiff < 1 ? convertirTimestampHeure(expiration) : convertirTimestampDateCourte(expiration)
    }    

    const s = StyleSheet.create({
        container: {
            marginVertical: 4,
            width: "100%",
            zIndex: 2,
        },
        notif: {
            width: "100%",
            paddingBottom: 4,
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: item.statut === "non_lue" ? 2 : 1,
            borderColor: colors.border,
        },
        timestamp: {
            color: colors.muted,
            fontFamily: fonts.number,
        },
        unreadFlag: {
            backgroundColor: colors.secondary,
            height: 8,
            aspectRatio: 1 / 1,
            borderRadius: 100,
            position: "absolute",
            right: 8,
            top: "32%",
        },
        optionBouton: {
            marginHorizontal: 4,
            height: "100%",
            width: 40,
            borderRadius: 100,
            borderWidth: 1,
            alignItems: "center",
            justifyContent: "center",
            marginBottom:4
        },
    })   
    
    const options = parsedPayload?.actions?.map((action: Action) => {
        //log('notification:', item.payload)
        const repondue = item.statut_metier !== "en_attente"
        const buttonColor = action.label === "accepter" ? colors.success : colors.error

        return (
            <TouchableOpacity
                key={`${item.id}-${action.label}`}
                style={[
                    s.optionBouton,
                    {
                        zIndex: 1,
                        opacity: item.statut_metier === action.body.statut || !repondue ? 1 : 0.3,
                        borderColor: buttonColor,
                    },
                ]}
                onPress={() => {
                    actionnerNotif(action.method, action.url, action.body)
                }}
                disabled={repondue}
            >
                {action.label === "accepter"
                    ? <Icon name="checkmark" color={buttonColor} size={28} />
                    : <Icon name='close' color={buttonColor} size={28}/>
                }
                
            </TouchableOpacity>
        )
    })

    return (
        <View style={s.container}>
            <Animated.View style={[notifAnime, s.notif]}>
                <View
                    style={{
                        height: 32,
                        backgroundColor: colors.background,
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        flexDirection: "row",
                        justifyContent: "space-between",
                    }}
                >
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        {typeIcon()}
                        <Text style={{ color: colors.muted, fontSize: 18, fontFamily: fonts.title, letterSpacing: 0.7 }}>
                            {typeLabel}
                        </Text>
                    </View>
                    <Text style={s.timestamp}>
                        {convertirTimestampQuand(convertirUTCversLocale(item.date_envoie) ?? DateTime.now().toLocal())}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        if (!selectionner) {
                            setMontrerDetails(!montrerDetails)
                            setMontrerExplExpiration(true)
                        } else {
                            if (!notificationsSelec.includes(item.id)) {
                                selectNotif()
                            } else {
                                const nouvNotifSelec = notificationsSelec.filter((id) => id !== item.id)
                                if (nouvNotifSelec.length === 0) setSelectionner(false)
                                setNotificationsSelec(nouvNotifSelec)
                            }
                        }
                    }}
                    onLongPress={() => {
                        setSelectionner(true)
                        selectNotif()
                    }}
                    style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", height: "80%" }}
                >
                    <View style={{ paddingVertical: 4, paddingHorizontal: 8, height: "100%" }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontFamily: fonts.body, fontWeight: item.statut === "non_lue" ? "bold" : "100" }} numberOfLines={lines}>
                            {item.message}
                        </Text>
                    </View>
                    {item.statut === "non_lue" && <View style={s.unreadFlag} />}
                    {expired && (
                        <Animated.View style={[expirationPreviewIconAnime, { height: "100%", width: "20%", alignItems: "center", justifyContent: "center" }]}> 
                            <Image source={icones.expiration} style={{ height: "70%" }} resizeMode="contain" />
                        </Animated.View>
                    )}
                </TouchableOpacity>
            </Animated.View>
            <Animated.View
                style={[
                    optionsNotifAnime,
                    {
                        position: "relative",
                        width: "100%",
                        justifyContent: "space-between",
                        flexDirection: "row",
                        paddingHorizontal: 16,
                    },
                ]}
            >
                <View style={{ flexDirection: "row", position: "relative", width: "50%" }}>
                    {item.expiration && (
                        <TouchableOpacity
                            style={[
                                s.optionBouton,
                                {
                                    position: "relative",
                                    right: expired ? 4 : 0,
                                    gap: 8,
                                    width: expired ? "170%" : "60%",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: expired ? "center" : "space-around",
                                    borderColor: colors.warning,
                                    backgroundColor: colors.card,
                                },
                            ]}
                            onPress={() => {
                                setMontrerExplExpiration(true)
                                Haptics.clickLeger()
                            }}
                        >
                            <Animated.Image source={icones.expiration} style={[expirationAnime, { height: "70%" }]} resizeMode="contain" />
                            <Animated.Text
                                style={[
                                    explicationExpirationAnime,
                                    {
                                        position: "absolute",
                                        left: 16,
                                        top: 8,
                                        fontFamily: fonts.number,
                                        color: colors.text,
                                        fontSize: 16,
                                        zIndex: 999,
                                    },
                                ]}
                            >
                                expiration
                            </Animated.Text>
                            <Animated.Text
                                style={[
                                    expirationAnime,
                                    {
                                        fontFamily: fonts.number,
                                        color: colors.text,
                                        fontSize: 16,
                                    },
                                ]}
                            >
                                {expirationLabel}
                            </Animated.Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={{ flexDirection: "row" }}>
                    {options}
                    <TouchableOpacity onPress={() => supprNotif([item.id])} style={[{ position: "relative", right: 0, backgroundColor: colors.error, borderColor: colors.border }]}> 
                        <Image source={icones.corbeille} style={{ width: "80%", height: "80%" }} resizeMode="contain" />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    )
}
