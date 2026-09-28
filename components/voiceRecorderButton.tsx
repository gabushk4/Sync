import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio'

import Icon from "@react-native-vector-icons/ionicons"

import { usePalette } from '@/contextes/contextePalette'
import Haptics from '@/abstractions/haptics'
import ToastAbs from '@/abstractions/toastAbs'
import { toastTypes } from '@/constants/toastConfig'
import log from '@/functions/log'

const DUREE_MAX_SECONDES = 60

type Props = {
    onEnregistrementTermine:(uri:string,dureeSecondes:number) => void
}

/**
 * Bouton "presser et maintenir pour enregistrer" (comme WhatsApp/Messenger).
 * Relâcher envoie le message vocal; glisser vers le haut annule (pattern
 * standard des messageries — évite d'envoyer un vocal par accident).
 * L'enregistrement s'arrête et s'envoie tout seul à 60 s.
 */

export default function VoiceRecorderButton ({onEnregistrementTermine} : Props){
    const {colors} = usePalette()
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)

    const [enregistrement,setEnregistrement] = useState(false)
    const debutRef = useRef<number>(0)
    const annuleRef = useRef(false)
    const enCoursRef = useRef(false)   // l'enregistrement a vraiment démarré
    const relacheRef = useRef(false)   // le doigt a été relevé
    const minuterieRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const demarrer = async () => {
        relacheRef.current = false
        annuleRef.current = false

        const permission = await AudioModule.requestRecordingPermissionsAsync()
        if(!permission.granted){
            ToastAbs.show({type:toastTypes.warning,text1:'permission d\'enregistrement refusée',text2:'Veuillez activer les autorisations d\'enregistrement dans les paramètres de l\'application.'})
            return
        }
        if (relacheRef.current) return // relâché pendant la demande de permission

        try {
            // obligatoire sur iOS avant d'enregistrer
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
            await recorder.prepareToRecordAsync()
            recorder.record()
        } catch (error) {
            log('erreur démarrage enregistrement', error)
            ToastAbs.show({ type: toastTypes.error, text2: 'impossible de démarrer l\'enregistrement' })
            return
        }

        enCoursRef.current = true
        debutRef.current = Date.now()
        setEnregistrement(true)
        Haptics.modalDebut()

        minuterieRef.current = setTimeout(() => arreter(false), DUREE_MAX_SECONDES * 1000)

        if (relacheRef.current) arreter(false) // relâché pendant la préparation
    }

    const arreter = async (annule : boolean) => {
        relacheRef.current = true
        if(!enCoursRef.current) return
        enCoursRef.current = false

        if (minuterieRef.current) {
            clearTimeout(minuterieRef.current)
            minuterieRef.current = null
        }
        setEnregistrement(false)
        Haptics.modalFin()

        const dureeSecondes = Math.min(Math.round((Date.now()- debutRef.current)/1000), DUREE_MAX_SECONDES)

        try {
            await recorder.stop()
        } catch (error) {
            log('erreur arrêt enregistrement', error)
        }
        // sinon, sur iOS, la lecture des vocaux sort par l'écouteur au lieu du haut-parleur
        setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {})

        const uri = recorder.uri
        if(annule || annuleRef.current) return
        if(dureeSecondes < 1){
            ToastAbs.show({ type: toastTypes.warning, text2: 'message vocal trop court' })
        }
        else if(!uri){
            ToastAbs.show({ type: toastTypes.error, text2: 'enregistrement introuvable' })
        }
        else{
            onEnregistrementTermine(uri, dureeSecondes)
        }
    }

    // Un "long press" démarre l'enregistrement; relâcher envoie,
    // glisser vers le haut pendant l'appui annule.
    // runOnJS(true) : les callbacks appellent expo-audio, qui vit sur le thread JS
    const geste = Gesture.LongPress()
        .runOnJS(true)
        .minDuration(150)
        .maxDistance(10000) // ne pas annuler le geste quand on glisse pour annuler
        .onStart(() => {
            demarrer()
        })
        .onFinalize((_event, succes) => {
            arreter(!succes)
        })

    const pan = Gesture.Pan()
        .runOnJS(true)
        .onUpdate((event) => {
            if (event.translationY < -60) {
                // Glissement vers le haut
                annuleRef.current = true
            }
        })

    const composite = Gesture.Simultaneous(geste,pan)

    return (
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
                        <Text style={styles.indicateurTexte}>relâche pour envoyer · glisse vers le haut pour annuler</Text>
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