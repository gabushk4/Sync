import React, {useState, useEffect, } from 'react';
import { StyleSheet, Text, View, Button, ScrollView, Image, TouchableOpacity, useColorScheme} from 'react-native';
import { usePalette } from '@/contextes/contextePalette';
import { useAPI } from '@/contextes/contexteAPI';
import AsyncStorage from '@react-native-async-storage/async-storage';
import catcher from '@/functions/catcher';
import { useMembre } from '@/contextes/contexteMembre';
import { useInvites } from '@/contextes/contexteInvites';
import log from '@/functions/log';
import { Participant } from '@/types/invites';
import ProfilPic from './pfp';
import { useMockMode } from '@/contextes/contexteMockMode';

type Props = {
    participant: Participant;
    participantsUrl?: string;
    height: number;
}

export default function ParticipantLigne({participant, participantsUrl = undefined, height} : Props){
    const { colors } = usePalette()
    const colorScheme = useColorScheme()
    const {api, APIBaseURL} = useAPI()
    const {membre} = useMembre()
    const { supprimerInvite } = useInvites()
    const {isMockMode} = useMockMode()

    const icone = {
        admin: colorScheme === "dark" ? require('@/assets/icones/admin-dark-icon.png'):require('@/assets/icones/admin-light-icon.png'),
        fpDef: colorScheme === "dark" ? require('@/assets/icones/profil-dark-icon.png'):require('@/assets/icones/profil-light-icon.png'),
        en_attente: colorScheme === "dark" ? require('@/assets/icones/horloge-dark-icon.png'):require('@/assets/icones/horloge-light-icon.png'),
        accepte:require('@/assets/icones/icon-succes-checkmark.png'),
        refuse:require('@/assets/icones/icon-erreur.png'),
        croix:colorScheme === "dark" ? require('@/assets/icones/croix-dark-icon.png'):require('@/assets/icones/croix-light-icon.png')
    }

    const [p, setParticipant] = useState<Participant>()

    const getParticipant = async () => {
        const {fp_url, pseudo} = participant
        if(!fp_url || !pseudo){
            try {
                const response = await api.get(`membres/${participant.id}`)
                const fetchedParticipant: Participant = {
                    ...participant,
                    id: response.data.id_publique,
                    pseudo: response.data.pseudo,
                    fp_url: response.data.fp_url,
                }
                log("fetched participant:", fetchedParticipant)
                setParticipant(fetchedParticipant)
            } catch (error) {
                catcher(error, `impossible d'avoir le participant ${ participant.id}`)
                setParticipant(undefined)
            }
        }else
            setParticipant(participant)
    }

    const supprimerParticipant = async () => {
        supprimerInvite(p as Participant, participantsUrl).then(()=>{
            setParticipant(undefined)
        })
    }

    useEffect(()=>{
        getParticipant()
    }, [])

    const peutSupprimer = p ? (p.id !== membre.idPublique && p.privilege !== 'editeur') : false

    const s = StyleSheet.create({
        conteneur:{
            marginTop:-1,
            width:'90%',
            paddingVertical:4,
            borderTopWidth:1,
            alignSelf: 'center',
            borderColor: colors.border,
            height: height
        },
        photo:{
            borderRadius: 100,
            overflow: 'hidden',
        },
        pseudo:{
            fontSize: 20,
            flexShrink: 1,
        },
        status: {
            width: 40,
            alignItems: 'center',
            justifyContent: 'center',
        },
        userInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            gap: 8,
            minWidth: 0,
        },
        centralPanel: {
            flex: 3,
            flexDirection: 'row',
            alignItems: 'center',
            height: '100%',
            gap: 8,
        },
        leftIcon: {
            flex: 1,
            width:'20%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        rightAction: {
            flex: 1,
            width:'20%',
            height: '100%',
            alignItems: 'flex-end',
            justifyContent: 'center',
        },
        button: {
            height: '100%',
            width: '100%',
            flexDirection: 'row',
            padding: 8,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.primary
        }
    })

    if(!p) return null

    return(
        <View style={s.conteneur}>
            <TouchableOpacity style={s.button}>
                <View style={s.leftIcon}>
                    {participant.privilege === 'editeur' && (
                        <Image
                            style={[s.photo, {height:'100%', width:'100%'}]}
                            source={icone.admin}
                            resizeMode='contain'
                        />
                    )}
                </View>
                <View style={s.centralPanel}>
                    <View style={s.userInfo}>
                        <ProfilPic
                            pfp={`${participant.fp_url}`}
                            size={32}
                            style={s.photo}
                        />
                        <Text
                            style={[s.pseudo, { color: colors.text }]}
                            numberOfLines={1}
                            ellipsizeMode='tail'
                        >
                            {p.pseudo ?? 'pseudo'}
                        </Text>
                    </View>
                    <View style={s.status}>
                        {p.statut && (
                            <Image
                                source={p.statut === 'refusee' ? icone.refuse : p.statut === 'acceptee' ? icone.accepte : icone.en_attente}
                                style={{height:24, width:24}}
                                resizeMode='contain'
                            />
                        )}
                    </View>
                </View>

                <View style={s.rightAction}>
                    {peutSupprimer && (
                        <TouchableOpacity onPress={() => {
                            supprimerParticipant()
                        }}>
                            <Image
                                source={icone.croix}
                                style={{transform:[{rotate:'45deg'}], height:24, width:24}}
                                resizeMode='contain'
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        </View>
    )
}

