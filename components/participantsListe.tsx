import { useFocusEffect } from 'expo-router/react-navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';

import { useAPI } from '@/contextes/contexteAPI';
import { useInvites } from '@/contextes/contexteInvites';
import { usePalette } from '@/contextes/contextePalette';

import ParticipantLigne from '@/components/participantLigne';

import catcher from '@/functions/catcher';
import log from '@/functions/log';

import { withTimingConfig } from '@/constants/ReanimatedConfs';
import { Participant } from '@/types/invites';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type Props = {
    participantsUrl: string | undefined;
    peutGererParticipants: boolean;
}

const LINE_HEIGHT = 56

/** Affiche les participants et retire une ligne après confirmation de l'API. */
export default function ParticipantsListe({ participantsUrl, peutGererParticipants } : Props){
    const { t } = useTranslation('events')
    const { colors } = usePalette();
    const { api } = useAPI()
    
    const colorScheme = useColorScheme()

    const inviterIcone = colorScheme === 'dark' ?require('@/assets/icones/croix-dark-icon.png'):require('@/assets/icones/croix-light-icon.png')    
    const { invites } = useInvites()

    const [participants, setParticipants] = useState<Array<Participant>>()

    const containerHeight = useSharedValue(LINE_HEIGHT * (participants?.length ?? 1))

    const animatedContainer = useAnimatedStyle(() => {
        return {
            height: containerHeight.value
        }
    })

    const getParticipants = async ()=>{
        log('getParticipants', participantsUrl, 'invites', invites)
        if(participantsUrl){
            let participants = []
            try {
                const response = await api.get(participantsUrl)

                log('participants', response.data)
                participants = response.data.participants
                //participants = participants.filter((p)=> p.id != )
                setParticipants(participants)
            } catch (error) {
                log('getParticipants', error)
                catcher(error, t('errors.participantsLoadFailed'))
            }
            if (invites.length > 0) {
                log("getParticipants invites", invites)
                let nouvInvites = [...participants, ...invites]
                nouvInvites = [...new Map(nouvInvites.map((i) => [i.id, i])).values()]
                setParticipants(nouvInvites)
            }
        }
        else
            setParticipants(invites)
    }

    useFocusEffect(useCallback(()=>{
        //log('participantsListe focused')
        getParticipants()
    }, [participantsUrl]))

    useEffect(()=> {        
        getParticipants()
    }, [invites])
    
    useEffect(()=>{
        containerHeight.value = withTiming(Math.max(LINE_HEIGHT * (participants?.length ?? 1) + s.inviterPhoto.height, 120), withTimingConfig)
    }, [invites, participants])

    const s = StyleSheet.create({
        container: {
            width: '100%',
            overflow:'hidden',
            justifyContent:'center',
            paddingHorizontal: 8,
            backgroundColor:colors.card
        },
        separator:{
            height:2,
            marginTop:2,
            marginBottom:2
        },
        photo:{
            alignItems:'center',
            justifyContent:'center',
            borderRadius: 100,
            height:64,
            width:64,
            overflow:'hidden'
        },
        inviter:{
            alignItems:'center',
            justifyContent:'center',
            height:'100%',
            width:'100%',
            padding:4
        },
        inviterPhoto:{
            height:40,
            width:40
        }
    })

    return(
        <Animated.View style={[s.container, animatedContainer]}>
            <ScrollView
                nestedScrollEnabled={true}
                persistentScrollbar={true}
                /* ItemSeparatorComponent={() => (<View style={[s.separator, { backgroundColor:theme.colors.secondary }]} />)} */                    
            >
                {participants?.map((item) => 
                    <View key={item.id} style={{flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                        <ParticipantLigne
                            participantsUrl={participantsUrl}
                            participant={item}
                            height={LINE_HEIGHT}
                            peutGererParticipants={peutGererParticipants}
                            onParticipantSupprime={(participantId) => {
                                setParticipants((prev) => prev?.filter((participant) => participant.id !== participantId))
                            }}
                        />
                    </View>    
                )}
                <View style={{
                        flex:1,
                        width:'100%',
                        justifyContent: 'center',
                        alignItems: 'center',
                        
                    }}>
                        <TouchableOpacity style={[s.inviter]} 
                            onPress={() => { 
                                router.push({pathname: '/(modals)/listeAmis', params:{type: 'select', inviterUrl: participantsUrl}})
                            }}
                        >
                        <View>
                            <Image
                            style={s.inviterPhoto}
                                source={inviterIcone}
                            />
                        </View>
                        </TouchableOpacity>
                    </View>
            </ScrollView>
        </Animated.View>
    )
}

