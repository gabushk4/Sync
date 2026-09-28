import { useCallback } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'

import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont'
import { useConversations } from '@/contextes/contexteConversations'
import { useRouteAbs } from '@/contextes/contexteRoute'

import ConversationItem from '@/components/conversationItem'
import { Conversation } from '@/types/messaging'

/**
 * Story #1 (Isma) : "En tant que membre, j'aimerais pouvoir envoyer un
 * message à un ami afin de maintenir le contact."
 *
 * Affiche la liste des conversations,
 * rafraîchie périodiquement en arrière-plan par ConversationsProvider
 * (rafraichissement partiel — voir contexteConversations.tsx / AutoRefresh).
 */

export default function Inbox(){
    const {colors} = usePalette()
    const {fonts} = useFont()
    const router = useRouter()
    const {ajouterEcran} = useRouteAbs()

    const {conversations, rafraichirConversations} = useConversations()

    useFocusEffect(useCallback(()=> {
        ajouterEcran('inbox')
        rafraichirConversations()
    }, []))

    const ouvrir = (conversation: Conversation) => {
        router.navigate({pathname:'/(tabs)/inbox/[conversationId]', params:{conversationId: conversation.id}})
    }

    const ecrireAUnAmi = () => {
        router.push({pathname: '/(modals)/listeAmis', params: {type: 'message'}})
    }

    return (
        <View style={[styles.conteneur,{backgroundColor: colors.background}]}>
            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={({item}) => <ConversationItem conversation={item} onPress={ouvrir}/>}
                refreshControl={<RefreshControl refreshing={false} onRefresh={rafraichirConversations} />}
                contentContainerStyle={{ flexGrow: 1 }}
                ListHeaderComponent={
                    <TouchableOpacity onPress={ecrireAUnAmi} style={[styles.nouveau, { borderBottomColor: colors.border }]}>
                        <Text style={{ color: colors.secondary, fontFamily: fonts.body, fontSize: 16 }}>Écrire à un ami</Text>
                    </TouchableOpacity>
                }
                ListEmptyComponent={
                    <View style={styles.vide}>
                        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, textAlign: 'center' }}>
                            Aucune conversation pour l'instant. Choisis un ami pour lui écrire.
                        </Text>
                    </View>
                }
            />
        </View>
    )
}


const styles = StyleSheet.create({
    conteneur: {flex:1},
    nouveau: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
    vide:{ paddingTop: 96, paddingHorizontal:32},
})
