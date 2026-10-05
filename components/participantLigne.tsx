import Radius from '@/constants/Radius';
import { useAPI } from '@/contextes/contexteAPI';
import { useInvites } from '@/contextes/contexteInvites';
import { useMembre } from '@/contextes/contexteMembre';
import { useMockMode } from '@/contextes/contexteMockMode';
import { usePalette } from '@/contextes/contextePalette';
import catcher from '@/functions/catcher';
import log from '@/functions/log';
import { Participant } from '@/types/invites';
import { useEffect, useState, } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import ProfilPic from './pfp';

type Props = {
    participant: Participant;
    participantsUrl?: string;
    height: number;
    peutGererParticipants: boolean;
    onParticipantSupprime: (participantId: string) => void;
}

/** Affiche un participant et, pour un gestionnaire, permet de le retirer. */
export default function ParticipantLigne({participant, participantsUrl = undefined, height, peutGererParticipants, onParticipantSupprime} : Props){
    const { t } = useTranslation('events')
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
    const [suppressionEnCours, setSuppressionEnCours] = useState(false)

    const getParticipant = async () => {
        //log("participant", participant)
        const {fp_url, pseudo} = participant
        if (!participant.id) {
            log('participant sans identifiant public, chargement ignoré', pseudo)
            setParticipant(undefined)
            return
        }
        if(!pseudo){
            try {
                const response = await api.get(`membres/${participant.id}`)
                const fetchedParticipant: Participant = {
                    ...participant,
                    id: response.data.id_publique ?? participant.id,
                    pseudo: response.data.pseudo,
                    fp_url: response.data.fp_url ?? fp_url ?? null,
                }
                log("fetched participant:", fetchedParticipant)
                setParticipant(fetchedParticipant)
            } catch (error) {
                catcher(error, t('errors.participantLoadFailed', { id: participant.id }))
                setParticipant(undefined)
            }
        }else
            setParticipant(participant)
    }

    /** Appelle la suppression API; la liste parente retire la ligne en cas de succès. */
    const supprimerParticipant = async () => {
        if (!p || suppressionEnCours) return
        setSuppressionEnCours(true)
        const succes = await supprimerInvite(p, participantsUrl)
        setSuppressionEnCours(false)
        if (succes) onParticipantSupprime(p.id)
    }

    useEffect(()=>{
        getParticipant()
    }, [])

    const peutSupprimer = p ? (peutGererParticipants && p.id !== membre.idPublique) : false

    const s = StyleSheet.create({
        conteneur:{
            marginTop:-1,
            width:'90%',
            paddingVertical:4,
            alignSelf: 'center',
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
            flex: 0,
            width: 32,
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        rightAction: {
            flex: 0,
            width: 32,
            height: '100%',
            alignItems: 'flex-end',
            justifyContent: 'center',
        },
        button: {
            height: '100%',
            width: '100%',
            flexDirection: 'row',
            padding: 8,
            alignItems: 'center',
            justifyContent: 'space-between',     
            borderWidth:1,
            borderColor: colors.border,
            borderRadius: Radius.xl,
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
                            pfp={participant.fp_url}
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
                            Alert.alert(
                                t('participantRemoval.confirmTitle'),
                                t('participantRemoval.confirmMessage', { pseudo: p.pseudo }),
                                [
                                    { text: t('participantRemoval.cancel'), style: 'cancel' },
                                    { text: t('participantRemoval.remove'), style: 'destructive', onPress: supprimerParticipant },
                                ]
                            )
                        }} disabled={suppressionEnCours}>
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

