import { StyleSheet, Text, View } from 'react-native'

import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont'

import { convertirTimestampHeure } from '@/functions/convertirTimestamp'
import { Message } from '@/types/messaging'

import VoiceMessageBubble from './voiceMessageBubble'

type Props = {
    message: Message
    estDeMoi: boolean
}
export default function MessageBubble({message,estDeMoi}: Props){
    const {colors} = usePalette()
    const {fonts} = useFont()
    return(
        <View style={[styles.ligne,estDeMoi ? styles.ligneMoi : styles.ligneAmi]}>
            <View
                style={[
                    styles.bulle,
                    estDeMoi
                        ? { backgroundColor: colors.secondary, borderBottomRightRadius: 4 }
                        : { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
                ]}
            >
                {message.type === 'vocal'
                    ? <VoiceMessageBubble message={message} estDeMoi={estDeMoi} />
                    : (
                        <Text style={{ color: estDeMoi ? 'white' : colors.text, fontFamily: fonts.body, fontSize: 15 }}>
                            {message.contenu}
                        </Text>
                    )
                }
                <Text 
                style={[
                    styles.heure,
                    { color: estDeMoi ? 'rgba(255,255,255,0.7' : colors/muted,fontFamily: fonts.body},

                ]}
                >
                    {convertirTimeStanpHeure{message.envoyeLe}}
                </View>

            </View>
        </View>
    )
}


const styles = StyleSheet.create({
    ligne: { width: '100%', paddingHorizontal: 12, marginVertical: 3 },
    ligneMoi: { alignItems: 'flex-end' },
    ligneAmi: { alignItems: 'flex-start' },
    bulle: {
        maxWidth: '78%',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 9,
        gap: 4,
    },
    heure: { fontSize: 10, alignSelf: 'flex-end' },
})