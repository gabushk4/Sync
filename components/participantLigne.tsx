import Radius from '@/constants/Radius';
import { useAPI } from '@/contextes/contexteAPI';
import { useInvites } from '@/contextes/contexteInvites';
import { useMembre } from '@/contextes/contexteMembre';
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
    peutGererParticipants?: boolean;
    onParticipantSupprime?: (participantId: string) => void;
}

/**
 * One participant in an event's participant list: editor badge, profile
 * picture, pseudo, their answer to the invitation (EN ATTENTE / ACCEPTÉ /
 * REFUSÉ — user story 9) and, when allowed, a button to remove them.
 * SUBJECT TO CHANGE: may be revised depending on how teammates implement their own user stories.
 *
 * @param {Props} props
 * @param {Participant} props.participant - Participant to show (fetched if pseudo/picture are missing).
 * @param {string} [props.participantsUrl] - Event's participants endpoint; undefined while creating the event.
 * @param {number} props.height - Row height.
 * @param {boolean} [props.peutGererParticipants=false] - Shows the remove button (Nathan: remove a participant).
 * @param {(participantId: string) => void} [props.onParticipantSupprime] - Called once the participant was removed.
 * @returns {JSX.Element | null}
 */
export default function ParticipantLigne({participant, participantsUrl = undefined, height, peutGererParticipants = false, onParticipantSupprime} : Props){
    const { t } = useTranslation('events')
    const { colors } = usePalette()
    const colorScheme = useColorScheme()
    const {api} = useAPI()
    const {membre} = useMembre()
    const { supprimerInvite } = useInvites()

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

    /**
     * Uses the participant as given, or fetches their pseudo and picture from
     * GET /membres/:id when they're missing.
     *
     * @returns {Promise<void>}
     */
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

    /**
     * Removes this participant (server-side too when the event already exists),
     * then hides the row.
     *
     * @returns {Promise<void>}
     */
    const supprimerParticipant = async () => {
        if (!p || suppressionEnCours) return
        setSuppressionEnCours(true)
        const succes = await supprimerInvite(p, participantsUrl)
        setSuppressionEnCours(false)
        if (succes) onParticipantSupprime?.(p.id)
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
            minWidth:"10%",
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
        },
        statutTexte: {
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 0.5,
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
                    {/* User story 9: each participant's answer to the invitation, as an
                        icon + label (PENDING / ACCEPTED / DECLINED). */}
                    <View style={s.status}>
                        {p.statut && (                            
                            <Image
                                source={p.statut === 'refusee' ? icone.refuse : p.statut === 'acceptee' ? icone.accepte : icone.en_attente}
                                style={{height:18, width:18}}
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

