import axios from "axios";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { Notification, NotificationAction, useNotifications } from "@/contextes/contexteNotifications";
import { usePalette } from "@/contextes/contextePalette";

import catcher from "@/functions/catcher";
import categorieNotification from "@/functions/categorieNotification";
import { convertirTimestampDateCourte, convertirTimestampHeure, convertToWhen } from "@/functions/convertirTimestamp";
import { convertUTCToLocal } from "@/functions/convertirUTCenLocal";
import log from "@/functions/log";

import Haptics from "@/abstractions/haptics";

import ToastAbs from "@/abstractions/toastAbs";
import { withSpringConfig, withTimingConfig } from "@/constants/ReanimatedConfs";
import { toastTypes } from "@/constants/toastConfig";
import AppIcon from "@/svgs/appIcon";
import Icon from "@react-native-vector-icons/ionicons";

import ouvrirRevueInvitation, { ouvrirDecisionInvitation } from "@/functions/ouvrirRevueInvitation";
import Spinner from "@/components/spinner";
import useDecisionInvitation from "@/hooks/useDecisionInvitation";
import { invitationDepuisDetails } from "@/types/invitation";

type ItemProps = {
    item: Notification
    index: number
    vu: string
}

/**
 * One notification card. Tapping expands it to show its expiration and, for an
 * invitation or friend request still awaiting an answer, accept/refuse buttons
 * (`item.actions`, resolved live by the API). Once answered, the buttons are
 * replaced by the answer ("accepted" / "refused").
 * Updated for user story 9 (accept/refuse an event invitation from a notification).
 * SUBJECT TO CHANGE: may be revised depending on how teammates implement their own user stories.
 *
 * @param {ItemProps} props
 * @returns {JSX.Element}
 */
export default function NotificationItem({ item, index, vu }: ItemProps) {
    const { t } = useTranslation('notifications')
    const { t: tFriends } = useTranslation('friends')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()
    const { api, APIBaseURL } = useAPI()
    const { notifRefresh } = useNotifications()

    // An event invitation: accepting goes through the shared decision logic, which
    // checks the member's schedule (conflict screen, review of the schedules).
    // Philip — user story 8.
    const invitation = item.type === 'invitation_evenement' ? invitationDepuisDetails(item.details) : null
    const decision = useDecisionInvitation(invitation, {
        onRepondu: () => notifRefresh?.forceRefresh(),
        onVoirHoraire: () => invitation && ouvrirRevueInvitation(invitation),
    })

    // User story 9: the API sends type/actions/statuses at the notification's top
    // level; there's no `payload` anymore.
    const categorie = categorieNotification(item.type)
    const demandeAmiEnAttente = item.type === 'demande_ami' && item.statut_metier === 'en_attente'
    const nonLue = item.statut_notification === "non_lue"

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

    const heightMaxNotif = demandeAmiEnAttente ? 152 : 124
    const heightMinNotif = demandeAmiEnAttente ? 142 : 64

    const backgroundDef = selectionner ? colors.primary : colors.card

    const opaciteOptionsNotif = useSharedValue(0)
    const heightOptionsNotif = useSharedValue(1)
    const bottomOptionsNotif = useSharedValue(16)
    const heightNotif = useSharedValue(heightMinNotif)
    const backgroundColor = useSharedValue(backgroundDef)
    const previewExpirationOpacity = useSharedValue(1)
    const expirationOpacity = useSharedValue(1)
    const expirationExplicationOpacity = useSharedValue(0)

    /**
     * Runs one of the notification's actions (e.g. accept/refuse an event
     * invitation via PATCH /evenements/invitations/:id), then refreshes the
     * notifications so the answer replaces the buttons — and, for a refusal,
     * so the notification moves to the refused invitations page (user story 9).
     *
     * @param {string} method - HTTP method of the action.
     * @param {string} url - API path of the action.
     * @param {Object} [body] - Request body (e.g. `{ statut: 'acceptee' }`).
     * @returns {Promise<void>}
     */
    const actionnerNotif = async (method: string, url: string, body: any = undefined) => {
        log("actionner notif", {method, url, body})
        // Invitations: both answers go through the decision logic (conflict check on
        // accept, spinner, no double sending). Philip — user story 8.
        if (invitation && body?.statut === 'acceptee') return decision.accepter()
        if (invitation && body?.statut === 'refusee') return decision.refuser()
        try {
            const response = await requeteAction(method, url, body)

            log("reponse en actionnant la notif", response.data)

            if (response.status === 200) {
                notifRefresh?.forceRefresh()
                ToastAbs.show({
                    type: toastTypes.success,
                    text2: response.data.message,
                })
            }
        } catch (error: any) {
            log("une erreur en actionnant la notif", error)
            catcher(error, t('errors.actionFailed'))
        }
    }

    /**
     * Sends one of the notification's actions through the shared API instance so
     * its response interceptor can refresh an expired access token and retry.
     *
     * @param {string} method - HTTP method of the action.
     * @param {string} url - API path of the action.
     * @param {Object} [body] - Request body.
     * @returns {Promise<import('axios').AxiosResponse>}
     */
    const requeteAction = async (method: string, url: string, body: any = undefined) => {
        return api.request({
            method,
            url,
            data: body,
        })
    }

    /**
     * Deletes the given notifications (soft delete server-side), then refreshes the list.
     *
     * @param {Array<string>} ids - Public ids of the notifications to delete.
     * @returns {Promise<void>}
     */
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
            catcher(err, t('errors.deleteFailed'))
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

    const typeLabel = t(`types.${categorie}`)

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
        if (item.icon) {
            return <Icon name={item.icon as any} color={colors.muted} size={20} />
        }
        switch (categorie) {
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
    // The API sends "expired" instead of a date once the invitation has expired
    // (sync_api validateExpiration.js); convertUTCToLocal throws on it and crashed the list.
    const expiration = item.expiration && !expired ? convertUTCToLocal(item.expiration) : undefined
    let expirationLabel

    if (expired)
        expirationLabel = t('expiration.expired')
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
            borderWidth: nonLue ? 2 : 1,
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
        reponse: {
            fontFamily: fonts.body,
            fontSize: 16,
            marginHorizontal: 8,
        },
    })
    
    // User story 9: the API only sends actions while the invitation/request awaits an
    // answer and hasn't expired, so no "already answered" handling is needed here.
    const options = (item.actions ?? []).map((action: NotificationAction) => {
        const buttonColor = action.label === "accepter" ? colors.success : colors.error

        return (
            <TouchableOpacity
                key={`${item.id}-${action.label}`}
                style={[
                    s.optionBouton,
                    {
                        zIndex: 1,
                        borderColor: buttonColor,
                    },
                ]}
                onPress={() => {
                    actionnerNotif(action.method, action.url, action.body)
                }}
                disabled={!!decision.enCours}
            >
                {/* Spinner on the answer being sent. Philip — user story 8. */}
                {decision.enCours && decision.enCours === action.body?.statut
                    ? <Spinner size={22} color={buttonColor} />
                    : action.icon
                        ? <Icon name={action.icon as any} color={buttonColor} size={24} />
                        : action.label === "accepter"
                        ? <Icon name="checkmark" color={buttonColor} size={28} />
                        : <Icon name='close' color={buttonColor} size={28}/>
                }
                
            </TouchableOpacity>
        )
    })

    const actionsDemandeAmi = demandeAmiEnAttente
        ? (item.actions ?? []).filter((action) => action.label === 'accepter' || action.label === 'refuser').map((action) => {
            const accepter = action.label === 'accepter'
            const couleur = accepter ? colors.success : colors.error
            return (
                <TouchableOpacity
                    key={`${item.id}-${action.label}-inline`}
                    accessibilityRole="button"
                    accessibilityLabel={accepter ? tFriends('requests.accept') : tFriends('requests.decline')}
                    style={{
                        flex: 1,
                        minHeight: 40,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: couleur,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: colors.card,
                    }}
                    onPress={() => actionnerNotif(action.method, action.url, action.body)}
                    disabled={!!decision.enCours}
                >
                    {action.icon
                        ? <Icon name={action.icon as any} color={couleur} size={20} />
                        : accepter
                            ? <Icon name="checkmark" color={couleur} size={20} />
                            : <Icon name="close" color={couleur} size={20} />}
                    <Text style={{ color: couleur, fontFamily: fonts.body, fontSize: 15 }}>
                        {accepter ? tFriends('requests.accept') : tFriends('requests.decline')}
                    </Text>
                </TouchableOpacity>
            )
        })
        : null

    return (
        <View style={s.container}>
            {decision.conflit}
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
                        {/* convertUTCToLocal throws without a date, so the `??` fallback never
                            ran and one notification without date crashed the whole feed.
                            Rectification (Philip). */}
                        {convertToWhen(item.date_envoie ? convertUTCToLocal(item.date_envoie) : DateTime.now().toLocal()) as string}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        // A pending invitation opens its decision page (event, organizer,
                        // participants, accept / refuse / adjust my schedule).
                        // Philip — user story 8.
                        if (!selectionner && invitation && item.statut_metier === 'en_attente' && !expired) {
                            ouvrirDecisionInvitation(invitation)
                            return
                        }
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
                    style={{
                        flex: demandeAmiEnAttente ? 0 : 1,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        height: demandeAmiEnAttente ? 48 : "80%",
                    }}
                >
                    <View style={{ paddingVertical: 4, paddingHorizontal: 8, height: "100%" }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontFamily: fonts.body, fontWeight: nonLue ? "bold" : "100" }} numberOfLines={lines}>
                            {item.message}
                        </Text>
                    </View>
                    {nonLue && <View style={s.unreadFlag} />}
                    {expired && (
                        <Animated.View style={[expirationPreviewIconAnime, { height: "100%", width: "20%", alignItems: "center", justifyContent: "center" }]}> 
                            <Image source={icones.expiration} style={{ height: "70%" }} resizeMode="contain" />
                        </Animated.View>
                    )}
                </TouchableOpacity>
                {demandeAmiEnAttente && (
                    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 10, paddingBottom: 6 }}>
                        {actionsDemandeAmi}
                    </View>
                )}
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
                                {t('expiration.label')}
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
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {/* User story 9: once answered, show the answer instead of the buttons. */}
                    {(item.statut_metier === "acceptee" || item.statut_metier === "refusee") && (
                        <Text style={[s.reponse, { color: item.statut_metier === "acceptee" ? colors.success : colors.error }]}>
                            {t(`answer.${item.statut_metier}`)}
                        </Text>
                    )}
                    {!demandeAmiEnAttente && options}
                    <TouchableOpacity onPress={() => supprNotif([item.id])} style={[{ position: "relative", right: 0, backgroundColor: colors.error, borderColor: colors.border }]}> 
                        <Image source={icones.corbeille} style={{ width: "80%", height: "80%" }} resizeMode="contain" />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    )
}
