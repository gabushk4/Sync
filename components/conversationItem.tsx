import { Image, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native'

import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont'

import { convertirTimestampQuand } from '@/functions/convertirTimestamp'
import { Conversation } from '@/types/messaging'

import Icon from "@react-native-vector-icons/ionicons"

type Props = {
    conversation: Conversation
    onPress: (conversation: Conversation) => void
}

export default function ConversationItem({ conversation, onPress }: Props) {
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()

    const { ami, dernierMessage, nonLus } = conversation

    const apercu = dernierMessage
        ? dernierMessage.type === 'vocal'
            ? 'message vocal'
            : dernierMessage.contenu
        : 'aucun message pour le moment'
    return (
       <TouchableOpacity
            onPress={() => onPress(conversation)}
            style={[styles.conteneur, { borderBottomColor: colors.border }]}
        >
            {ami.fp_url
                ? <Image source={{ uri: ami.fp_url }} style={styles.avatar} />
                : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
                        <Icon name="person" size={22} color={colors.muted} />
                    </View>
                )
            }

            <View style={styles.texteConteneur}>
                <Text style={[styles.pseudo, { color: colors.text, fontFamily: fonts.body }]}>{ami.pseudo}</Text>
                <Text 
                    numberOfLines={1}
                    style={[styles.apercu,
                        {color:nonLus > 0 ? colors.text : colors.muted, fontFamily: fonts.body},
                        nonLus > 0 && {fontWeight: '600'},

                    ]}
                    >
                        {apercu
                        }
                </Text>
            </View> 

            <View style={styles.droite}>
                {dernierMessage && (<Text style={[styles.heure,{color:colors.muted,fontFamily:fonts.body}]}>
                    {convertirTimestampQuand(dernierMessage.envoyeLe)}
                    </Text>
                )}
                {nonLus > 0 && (
                    <View style={[styles.badge,{backgroundColor: colors.secondary}]}>
                        <Text style={styles.badgeTexte}>{nonLus}</Text>
                    </View>
                )}
            </View>

        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    conteneur: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        gap: 12,
    },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    texteConteneur: { flex: 1, gap: 2 },
    pseudo: { fontSize: 16 },
    apercu: { fontSize: 14 },
    droite: { alignItems: 'flex-end', gap: 6 },
    heure: { fontSize: 12 },
    badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    badgeTexte: { color: 'white', fontSize: 11, fontWeight: '700' },
})