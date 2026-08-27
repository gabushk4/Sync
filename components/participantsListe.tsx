import React, {useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Button, ScrollView, SafeAreaView, FlatList, Image, Pressable, TouchableWithoutFeedback, TouchableOpacity, Modal, useColorScheme} from 'react-native';
import { BlurView } from 'expo-blur';
import { DateTime } from 'luxon';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

import { usePalette } from '@/contextes/contextePalette';
import { useModal } from '@/contextes/contexteModals';
import { useAPI } from '@/contextes/contexteAPI';
import { useInvites } from '@/contextes/contexteInvites';
import { useAccessToken } from '@/contextes/contexteToken';

import ParticipantLigne from '@/components/participantLigne';
import ModalBase from '@/components/modalBase';
import ListeAmis from '@/app/(modals)/listeAmis';

import catcher from '@/functions/catcher';
import log from '@/functions/log';

import { InviterUrl, SupprimerUrl, Participant } from '@/types/invites';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { withTimingConfig } from '@/constants/ReanimatedConfs';

type Props = {
    participantsUrl: string | undefined;
}

const LINE_HEIGHT = 56

export default function ParticipantsListe({ participantsUrl } : Props){
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
                catcher(error, 'erreur au chargement des participants')
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
                {participants?.map((item, index) => 
                    <View key={item.id} style={{flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                        <ParticipantLigne participantsUrl={participantsUrl} participant={item} height={LINE_HEIGHT}/>                                
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

