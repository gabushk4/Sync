import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { scheduleOnRN } from 'react-native-worklets'
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio'

import Icon from "@react-native-vector-icons/ionicons"

import { usePalette } from '@/contextes/contextePalette'
import Haptics from '@/abstractions/haptics'
import ToastAbs from '@/abstractions/toastAbs'
import { toastTypes } from '@/constants/toastConfig'

const DUREE_MAX_SECONDES = 60

type Props = {
    onEnregistrementTermine:(uri:string,dureeSecondes:number) => void
}

/**
 * Bouton "presser et maintenir pour enregistrer" (comme WhatsApp/Messenger).
 * Relâcher envoie le message vocal; glisser vers le haut annule (pattern
 * standard des messageries — évite d'envoyer un vocal par accident).
 */

export default function VoiceRecorderButton ({onEnregistrementTermine} : Props){
    const {colors} = usePalette()
    const recorder = useAudioRecorder()

    const [enregistrement,setEnregistrement] = useState(false)
    const debutRef = useRef<number>(0)
    const annuleRef = useRef(false)

    const demarrer = async () => {
        const permission = await AudioModule.requestRecordingPermissionsAsync()
        if(!permission.granted){
            ToastAbs.show({type:toastTypes.warning,text1:'permission d\'enregistrement refusée',text2:'Veuillez activer les autorisations d\'enregistrement dans les paramètres de l\'application.'})
            return
        }

        annuleRef.current = false
        debutRef.current = Date.now()
        setEnregistrement(true)
        Haptics.modalDebut()

        await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY)
        recorder.recordAsync()
    }

    const arreter = async (annule : boolean) => {
        if(!enregistrement) return
        setEnregistrement(false)
        Haptics.modalFin()

        await recorder.stop()
        const dureeSecondes = Math.round((Date.now()- debutRef.current)/1000)

        if(annule || annuleRef.current) return
        if(dureeSecondes < 1){
            ToastAbs.show({ type: toastTypes.warning, text2: 'message vocal trop court' })
        }
        else if(dureeSecondes > DUREE_MAX_SECONDES){
            ToastAbs.show({ type: toastTypes.warning, text2: 'message vocal trop long' })
        }
        else{
            onEnregistrementTermine(recorder.getURI(), dureeSecondes)
        }

    }
      // Un "long press" démarre l'enregistrement; un glissement vers le haut
    // pendant l'appui, ou un relâchement, arrête/envoie/annule.

    const geste = Gesture.LongPress()
        .minDuration(150)
        .onStart(()=> {
            scheduleOnRN(() => demarrer())
        })
        .onEnd(()=> {
            scheduleOnRN(() => arreter(false))
        })
        .onCancel(()=> {
            scheduleOnRN(() => arreter(true))
        })

    const pan = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationY < -60) {
                // Glissement vers le haut
                annuleRef.current = true
            }
        })

    const composite = Gesture.Simultaneous(geste,pan)

    eturn (
        <GestureDetector gesture={composite}>
            <View
                style={[
                    styles.bouton,
                    { backgroundColor: enregistrement ? colors.error : colors.secondary },
                ]}
            >
                <Icon name={enregistrement ? 'mic' : 'mic-outline'} size={20} color="white" />
                {enregistrement && (
                    <View style={styles.indicateur}>
                        <Text style={styles.indicateurTexte}>appuie et maintiens · glisse pour annuler</Text>
                    </View>
                )}
            </View>
        </GestureDetector>
    )
}

const styles = StyleSheet.create({
    bouton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    indicateur: {
        position: 'absolute',
        bottom: 48,
        right: -20,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        width: 180,
    },
    indicateurTexte: { color: 'white', fontSize: 11, textAlign: 'center' },
})