import { useFocusEffect } from 'expo-router/react-navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { useAPI } from '@/contextes/contexteAPI';
import { useInvites } from '@/contextes/contexteInvites';
import { usePalette } from '@/contextes/contextePalette';

import LegendeStatutsInvitation, { HAUTEUR_LEGENDE } from '@/components/legendeStatutsInvitation';
import ParticipantLigne from '@/components/participantLigne';

import catcher from '@/functions/catcher';
import log from '@/functions/log';

import { LinkAbs } from '@/abstractions/linkAbs';
import { ListType } from '@/app/(modals)/listeAmis';
import { checkMark } from '@/constants/dismissButtons';
import { withTimingConfig } from '@/constants/ReanimatedConfs';
import { useEventDraft } from '@/contextes/contexteEventDraft';
import { useFont } from '@/contextes/contexteFont';
import { useModal } from '@/contextes/contexteModals';
import { Participant } from '@/types/invites';
import Ionicons from '@react-native-vector-icons/ionicons';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
// Garde tes imports actuels et ajoute simplement `useMemo` à l'import de 'react'
// import { useState, useEffect, useCallback, useMemo } from 'react'

type Props = {
    participantsUrl: string | undefined;
    listType: ListType
    /** Shows each participant's remove button (event details, member is an editor). */
    peutGererParticipants?: boolean
    /** Reminder of the status icons under the list (event the member was invited to). */
    afficherLegende?: boolean
}

const LINE_HEIGHT = 56
const TITLE_HEIGHT = 32
const MAX_COUNT = 3
const DATA_RENDERER_KEY = "ParticipantsListe"

// Styles statiques : créés UNE fois, pas à chaque render
const s = StyleSheet.create({
    container: {
        width: '100%',
        overflow: 'hidden',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    separator: {
        height: 2,
        marginTop: 2,
        marginBottom: 2
    },
    photo: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 100,
        height: 64,
        width: 64,
        overflow: 'hidden'
    },
    inviter: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',          
    },
})

export default function ParticipantsListe({ participantsUrl, listType, peutGererParticipants = false, afficherLegende = false } : Props){
    const { t } = useTranslation()
    const { colors } = usePalette();
    const {fonts} = useFont()
    const { api } = useAPI()
    const { setDataRendererContent, setDismissButton, removeDataRenderContent, resetDismissButton } = useModal()

    const { invites } = useInvites()
    const { friendsSuggestions, friendsHasMore } = useEventDraft()
    const availableFriendIds = useMemo(
        () => friendsSuggestions.map(suggestion => suggestion.id),
        [friendsSuggestions]
    )




    log("friend ids:", availableFriendIds.length, availableFriendIds)

    // Ce que le SERVEUR dit. Vide en mode création (pas d'URL).
    const [participantsServeur, setParticipantsServeur] = useState<Array<Participant>>([])

    // Liste affichée = DÉRIVÉE (serveur + invites locales). Pas de state, pas d'effet.
    // On met les invites en premier et le serveur en dernier : le serveur gagne
    // (ex: statut 'acceptee' ne se fait plus écraser par 'en_attente' local).
    const {participants, participantsTruncated} = useMemo(() => {
        const map = new Map<string, Participant>()
        invites.forEach((i) => map.set(i.id, i))
        participantsServeur.forEach((p) => {            
            return map.set(p.id, p)
        })
        const tous = [...map.values()]

        // The truncated list used to be built from the local invites only, so an existing
        // event's participants (from the server) never showed up in its details.
        return { participants: tous, participantsTruncated: tous.slice(0, MAX_COUNT) }
    }, [participantsServeur, invites])

    const showMore = participants.length > MAX_COUNT

    
    const computeHeight = (count: number, includeShowMore: boolean) =>
        Math.min(
            LINE_HEIGHT * (MAX_COUNT + (includeShowMore ? 2 : 1) + TITLE_HEIGHT),
            Math.max(LINE_HEIGHT, LINE_HEIGHT * (count + 1 + Number(includeShowMore)) + TITLE_HEIGHT)
        ) + (afficherLegende ? HAUTEUR_LEGENDE : 0)

    const containerHeight = useSharedValue(computeHeight(participantsTruncated.length, showMore))

    const animatedContainer = useAnimatedStyle(() => {
        return {
            height: containerHeight.value
        }
    })

    // Ne s'occupe QUE du serveur. La fusion avec les invites se fait dans le useMemo.
    const getParticipants = useCallback(async () => {
        //log("participantsURL: ", participantsUrl)
        if (!participantsUrl) {
            setParticipantsServeur([])
            return
        }
        try {
            const response = await api.get(participantsUrl)
            //log('participants', response.data)
            
            setParticipantsServeur(response.data.participants)
        } catch (error) {
            log('getParticipants', error)
            catcher(error, t('events.errors.participantsLoadFailed'))
        }
    }, [participantsUrl])

    // Nathan (remove a participant): an editor can remove a participant; once the API
    // confirms it (ParticipantLigne -> supprimerInvite), the row leaves the list.
    const Line = useCallback(({ participant } : { participant: Participant}) => (
        <View key={participant.id} style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <ParticipantLigne
                participantsUrl={participantsUrl}
                participant={participant}
                height={LINE_HEIGHT}
                peutGererParticipants={peutGererParticipants}
                onParticipantSupprime={(participantId) => {
                    setParticipantsServeur((prev) => prev.filter((p) => p.id !== participantId))
                }}
            />
        </View>
    ), [participantsUrl, peutGererParticipants])

    const showMoreModal = useMemo(() => (
        <FlatList
            data={participants}
            keyExtractor={(item, index) => `FL-${item.id}-${index}`}
            renderItem={({ item }) => 
                <Line participant={item}/>
            }
        />
    ), [participants, Line])

    useEffect(() => {
            setDataRendererContent(DATA_RENDERER_KEY, showMoreModal)
            setDismissButton(checkMark(colors))   
        }, [showMoreModal, setDataRendererContent, setDismissButton, colors])

    useEffect(() => () => {
        removeDataRenderContent(DATA_RENDERER_KEY)
        resetDismissButton()
    }, [])

    // useFocusEffect s'exécute aussi au montage : plus besoin d'un useEffect en plus.
    useFocusEffect(useCallback(() => {
        getParticipants()
    }, [getParticipants]))

    useEffect(() => {        
        containerHeight.value = withTiming(
            computeHeight(participantsTruncated.length, showMore),
            withTimingConfig
        )
    }, [participantsTruncated, participants, afficherLegende])


    return(
        <Animated.View style={[s.container, { backgroundColor: colors.card }, animatedContainer]}>
            <Text style={{ fontFamily: fonts.body, color: colors.muted, marginBottom:8, fontSize:20 }}>{t('events:form.participants')} - {participants.length}</Text>
            {participantsTruncated.map(p => (
               <Line key={`${p.id}`} participant={p}/>
            ))}   
            {showMore &&
                <LinkAbs href={{ pathname: "/(modals)/dataRenderer", params: { key: DATA_RENDERER_KEY, title:t('events:form.participants') } }} style={{ alignSelf: 'center', marginBottom:8, marginTop:4 }}>
                    {t('common:showMore')}
                </LinkAbs>
            }
            {/* Philip — user story 9: what the status icons mean. */}
            {afficherLegende && <LegendeStatutsInvitation />}
            <TouchableOpacity style={[s.inviter]}
                onPress={() => {
                    router.push({
                        pathname: '/(modals)/listeAmis',
                        params: {
                            type: listType,
                            // Only for an existing event (invite right away). While creating
                            // one there's no URL: the friends are only added to the draft,
                            // and invited when the event is created (POST /evenements).
                            // Philip — user story 8.
                            ...(participantsUrl ? { inviterUrl: participantsUrl } : {}),
                            availableFriendIds: JSON.stringify(availableFriendIds),
                            hasMoreFriends: String(friendsHasMore),
                        },
                    })
                }}
            >
                <Ionicons name='add' color={colors.text} size={56}/>
            </TouchableOpacity>
        </Animated.View>
    )
}

