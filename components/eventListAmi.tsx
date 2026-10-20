import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, SectionList, Text, TouchableOpacity, useColorScheme, View, } from 'react-native';

import catcher from "@/functions/catcher";
import { convertirTimestampDateCourte, convertirTimestampHeure } from "@/functions/convertirTimestamp";
import { convertUTCToLocal } from "@/functions/convertirUTCenLocal";

import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { useInvites } from "@/contextes/contexteInvites";
import { usePalette } from "@/contextes/contextePalette";

import ModalBase from "@/components/modalBase";

import { friendsAvailabilityEvents } from "@/events/friendsAvailabilityEvents";
import { modalEvents } from "@/events/modalEvents";
import { useFriendList } from "@/hooks/useFriendList";

import { ListType } from "@/app/(modals)/listeAmis";
import { useEventDraft } from "@/contextes/contexteEventDraft";
import log from "@/functions/log";
import { Participant } from "@/types/invites";
import { DateTime } from "luxon";
import FriendLine from "./friendLine";

export type FriendAPIRes = {
    temps_amitie: string,
    id_publique: string,
    pseudo: string,
    // GET /amis sends the photo as `fp_url` (see sync_api routes/amis.js), not `pfp_url`.
    fp_url: string | null
}

function EventListAmiContent() {
    const { t } = useTranslation('friends')
    const { api } = useAPI()
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()
    const { invites } = useInvites()
    const {start, end} = useEventDraft()

    const { type, inviterUrl, availableFriendIds: availableFriendIdsParam, hasMoreFriends: hasMoreFriendsParam } = useLocalSearchParams() as { type: ListType; inviterUrl: string;  availableFriendIds: string[], hasMoreFriends: string}
    const select = type === 'select' || type === 'event'
    const availableFriendIds = useMemo(() => {
        const raw = Array.isArray(availableFriendIdsParam) ? availableFriendIdsParam[0] : availableFriendIdsParam

        if (!raw) return []
        try {
            const parsed: unknown = JSON.parse(raw)
            return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
        } catch {
            return []
        }
    }, [availableFriendIdsParam])
    const [currentAvailableFriendIds, setCurrentAvailableFriendIds] = useState(availableFriendIds)
    const [hasMoreFriends, setHasMoreFriends] = useState(
        (Array.isArray(hasMoreFriendsParam) ? hasMoreFriendsParam[0] : hasMoreFriendsParam) === 'true'
    )
    const [loadingMoreFriends, setLoadingMoreFriends] = useState(false)
    const allAvailableFriendIds = currentAvailableFriendIds

    const icones = {
        profilDef: colorScheme === 'dark' ? require('@/assets/icones/profil-dark-icon.png') : require('@/assets/icones/profil-light-icon.png'),
        ajouterAmi: colorScheme === 'dark' ? require('@/assets/icones/ajouter-ami-dark-icon.png') : require('@/assets/icones/ajouter-ami-dark-icon.png'),
        supprimerAmi: colorScheme === 'dark' ? require('@/assets/icones/corbeille-dark-icon.png') : require('@/assets/icones/corbeille-light-icon.png')
    }

    const [amis, setAmis] = useState<Participant[]>([])
    const [idsSelec, setIdsSelec] = useState(new Set())

    const getAmis = async () => {
        try {
            const response = await api.get('/amis')
            const data = response.data.map((ami: FriendAPIRes) => {
                const amitie = convertUTCToLocal(ami.temps_amitie)
                return {
                    ...ami,
                    id: ami.id_publique,
                    fp_url: ami.fp_url,
                    temps_amitie: amitie
                }
            })
            setAmis(data)
        } catch (error) {
            catcher(error, t('errors.loadFailed'))
        }
    }

    const onPressSelect = useFriendList('select')
    const onPressConsult = useFriendList('consult')

    useEffect(() => {
        if (!select) return

        const applyPage = (page: { append: boolean; hasMore: boolean; friendIds: string[] }) => {
            setCurrentAvailableFriendIds(current => page.append
                ? [...new Set([...current, ...page.friendIds])]
                : page.friendIds
            )
            log("hasMore", page.hasMore)
            setHasMoreFriends(page.hasMore)
        }

        const unsubscribe = friendsAvailabilityEvents.onPageUpdate(applyPage)
        const latestPage = friendsAvailabilityEvents.getLatestPage()
        if (latestPage) applyPage(latestPage)

        return unsubscribe
    }, [select])

    const friendSections = useMemo(() => {
        const friendsById = new Map(amis.map(friend => [friend.id, friend]))
        const invitedIds = new Set(invites.map(invite => invite.id))
        const availableFriends = allAvailableFriendIds
            .filter(id => !invitedIds.has(id))
            .map(id => friendsById.get(id))
            .filter((friend): friend is Participant => friend !== undefined)
        const availableIds = new Set(availableFriends.map(friend => friend.id))
        const otherFriends = amis.filter(friend => !availableIds.has(friend.id))

        const now = DateTime.now()
        const startDiffFromNow = Math.abs(now.startOf('day').diff(start.startOf('day'), 'days').days)
        log({startDiffFromNow})
        const startIsToday = startDiffFromNow < 1;
        const startIsThisWeek = startDiffFromNow < 7
        const endDiffFromNow = Math.abs(now.startOf('day').diff(end.startOf('day'), 'days').days)
        log({endDiffFromNow})
        const endIsToday = endDiffFromNow < 1;
        const endIsThisWeek = endDiffFromNow < 7 

        log({endIsThisWeek})

        const formatTimestamp = (dtIsToday: boolean, dtIsThisWeek: boolean, dt: DateTime) => 
            dtIsToday
                ? convertirTimestampHeure(dt)
                : dtIsThisWeek ? `${dt.weekdayLong} ${convertirTimestampHeure(dt)}` : `${convertirTimestampDateCourte(dt)} ${convertirTimestampHeure(dt)}`

        const stringStart = formatTimestamp(startIsToday, startIsThisWeek, start)
        
        const stringEnd = formatTimestamp(endIsToday, endIsThisWeek, end)

        return [
            { title: t('list.availableForSlot', {start: stringStart, end:stringEnd}), data: availableFriends, isAvailableSection: true },
            { title: t('list.otherFriends'), data: otherFriends, isAvailableSection: false },
        ]
    }, [amis, allAvailableFriendIds, end, invites, start, t])

    useFocusEffect(useCallback(() => {
        getAmis()
        if (select && invites.length > 0) {
            setIdsSelec(prev => {
                const next = new Set(prev)
                invites.forEach(invite => next.add(invite.id))
                return next
            })
        }
    }, []))

    return (
        <ModalBase>
            <View style={{ height: '100%', width: '100%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ width: '100%', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 20 }}>{t('list.title')}</Text>
                    </View>
                    {select &&
                        <TouchableOpacity style={{ position: 'absolute', right: 16 }}
                            onPress={() => {
                                const amisSelec = amis.filter(ami => idsSelec.has(ami.id))
                                // A route param can arrive as the text "undefined": no URL then (event
                                // being created, invitations sent with it). Philip — user story 8.
                                const url = Array.isArray(inviterUrl) ? inviterUrl[0] : inviterUrl
                                onPressSelect(amisSelec, url && url !== 'undefined' ? url : undefined)
                                modalEvents.emitClosing()
                            }}>
                            <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 16 }}>{t('list.invite')}</Text>
                        </TouchableOpacity>
                    }
                </View>
                <LinearGradient
                    style={{ position: 'absolute', opacity: 0.3, zIndex: 2, top: 22, left: 0, width: '100%', height: 24 }}
                    start={{ x: 0, y: 0.2 }}
                    end={{ x: 0, y: 1 }}
                    colors={[colors.primary, 'transparent']}
                />
                {amis.length > 0 && <SectionList
                    sections={friendSections}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
                    renderSectionHeader={({ section }) => (
                        <View style={{ width: '100%', backgroundColor: colors.card, paddingVertical: 4 }}>
                            <Text style={{
                                color: colors.muted,
                                fontFamily: fonts.title,
                                fontSize: 16,
                                paddingHorizontal: 8,
                                paddingTop: 12,
                                paddingBottom: 4,
                            }}>
                                {section.title}
                            </Text>
                        </View>
                    )}
                    renderSectionFooter={({ section }) => section.isAvailableSection ? (
                        <View>
                            {section.data.length === 0 && (
                                <Text style={{ color: colors.muted, fontFamily: fonts.body, paddingHorizontal: 8, paddingBottom: 8 }}>
                                    {t('list.noAvailableFriends')}
                                </Text>
                            )}
                            {select && hasMoreFriends && (
                                <TouchableOpacity
                                    disabled={loadingMoreFriends}
                                    onPress={async () => {
                                        if (loadingMoreFriends) return
                                        setLoadingMoreFriends(true)
                                        try {
                                            const page = await friendsAvailabilityEvents.requestMore()
                                            setCurrentAvailableFriendIds(current => [...new Set([...current, ...page.friendIds])])
                                            setHasMoreFriends(page.hasMore)
                                        } finally {
                                            setLoadingMoreFriends(false)
                                        }
                                    }}
                                    style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 8 }}
                                >
                                    {loadingMoreFriends
                                        ? <ActivityIndicator color={colors.muted} />
                                        : <Text style={{ color: colors.muted, fontFamily: fonts.body, textDecorationLine: 'underline' }}>{t('list.loadMore')}</Text>}
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : null}
                    renderItem={({ item }) => {
                        
                        const selectionne = select && idsSelec.has(item.id)
                        return (
                            <FriendLine friend={item} listType={type} selected={selectionne} onPress={() => {
                                if (select) {
                                    setIdsSelec(prev => {
                                        const next = new Set(prev)
                                        next.has(item.id) ? next.delete(item.id) : next.add(item.id)
                                        return next
                                    })
                                } else if (type === 'consult') {
                                    onPressConsult(item)
                                }
                            }}/>
                        )
                    }}
                />}
                {amis.length < 1 &&
                    <View style={{ height: '100%', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: colors.text, fontFamily: fonts.title, fontSize: 18 }}>{t('list.emptyState')}</Text>
                        <TouchableOpacity onPress={() => router.push('/(modals)/ajouterAmi')}>
                            <Image source={icones.ajouterAmi} style={{ height: 64, width: 64 }} resizeMode="contain" />
                        </TouchableOpacity>
                    </View>
                }
            </View>
        </ModalBase>
    )
}

export default function EventFriendList() {
    return <EventListAmiContent />
}