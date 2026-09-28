import { useEffect } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'

import Icon from "@react-native-vector-icons/ionicons"

import { usePalette } from '@/contextes/contextePalette'
import { Message } from '@/types/messaging'

type Props = {
    message: Message
    estDeMoi: boolean
}

/**
 * Bulle de lecture d'un message vocal (story #16).
 * Utilise expo-audio (remplaçant moderne d'expo-av dans les SDK Expo récents).
 * Si `audioUrl` est absent (ex. données mock sans fichier réel), le bouton
 * reste affiché mais désactivé — utile pour prévisualiser l'UI sans backend.
 */


export default function VoiceMessageBubble({message,estDeMoi}: Props){
    const {colors} = usePalette()
    const player = useAudioPlayer(message.audioUrl ? { uri: message.audioUrl } : null)
    const status = useAudioPlayerStatus(player)

    useEffect(()=>{
     // Revenir au début une fois la lecture terminée, pour permettre de rejouer
     if(status.didJustFinish){
        player.seekTo(0)
     }
    },[status.didJustFinish])

    const dureeAffichee = Math.max(0,Math.round(message.dureeSecondes || status.duration || 0))
    const couleurIcone = estDeMoi ? 'white' : colors.text

    const basculerLecture = () => {
        if(!message.audioUrl) return
        if(status.playing) player.pause()
        else player.play()
    }
    return (
        <View style={styles.conteneur}>
            <TouchableOpacity
                onPress={basculerLecture}
                disabled={!message.audioUrl}
                style={[styles.boutonLecture, { opacity: message.audioUrl ? 1 : 0.4 }]}
            >
                <Icon name={status.playing ? 'pause' : 'play'} size={18} color={couleurIcone} />
            </TouchableOpacity>

            {/* Barre de progression simplifiée (pas de waveform réelle) */}
            <View style={[styles.piste, { backgroundColor: estDeMoi ? 'rgba(255,255,255,0.35)' : colors.border }]}>
                <View
                    style={[
                        styles.progression,
                        {
                            backgroundColor: couleurIcone,
                            width: status.duration ? `${Math.min(100, (status.currentTime / status.duration) * 100)}%` : '0%',
                        },
                    ]}
                />
            </View>

            <Text style={{ color: couleurIcone, fontSize: 12 }}>
                {`${Math.floor(dureeAffichee / 60)}:${(dureeAffichee % 60).toString().padStart(2, '0')}`}
            </Text>
        </View>
    )
}


const styles = StyleSheet.create({
    conteneur: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 160 },
    boutonLecture: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    piste: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
    progression: { height: '100%' },
})
