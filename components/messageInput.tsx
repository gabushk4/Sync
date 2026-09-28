import { useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import Icon from "@react-native-vector-icons/ionicons"

import TextInputAbs from '@/abstractions/textInputAbs'
import { usePalette } from '@/contextes/contextePalette'
import VoiceRecorderButton from './voiceRecorderButton'

type Props = {
    onEnvoyerTexte: (texte: string) => Promise<void> | void
    onEnvoyerVocal: (uri: string, dureeSecondes: number) => Promise<void> | void
}

export default function MessageInput({ onEnvoyerTexte, onEnvoyerVocal }: Props){
    const {colors} = usePalette()
    const [texte,setTexte] = useState('')
    const [enEnvoi, setEnEnvoi] = useState(false)

    const envoyer = async () => {
        const t = texte.trim()
        if(t.length === 0 || enEnvoi) return
        setEnEnvoi(true)
        setTexte('')
        try {
            await onEnvoyerTexte(t)
        } catch {
            setTexte(t) // remettre le texte si l'envoi a échoué
        } finally {
            setEnEnvoi(false)
        }
    }
    const aDuTexte = texte.trim().length > 0

    return (
        <View style= {[styles.conteneur, {backgroundColor: colors.card, borderTopColor: colors.border}]}>
             <TextInputAbs
                value={texte}
                onChangeText={setTexte}
                placeholder="écris un message…"
                multiline
                maxLength={2000}
                style={styles.input}
            />
            {aDuTexte
                ? (
                    <TouchableOpacity
                        onPress={envoyer}
                        disabled={enEnvoi}
                        style={[styles.boutonEnvoyer,{backgroundColor: colors.secondary,opacity:enEnvoi ? 0.5 : 1}]}>
                            <Icon name="send" size={16} color="white"/>
                    </TouchableOpacity>
                )
                : <VoiceRecorderButton onEnregistrementTermine={onEnvoyerVocal} />
            }
        </View>
    )

}
const styles = StyleSheet.create({
    conteneur: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
    },
    input: { flex: 1, maxHeight: 100 },
    boutonEnvoyer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
