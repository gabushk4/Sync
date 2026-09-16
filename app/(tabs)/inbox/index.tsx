import { useCallback } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
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

    const {conversations} = useConversations()

    useFocusEffect(useCallback(()=> { ajouterEcran('inbox')}, []))

    const ouvrir = (conversation: Conversation) => {
        router.navigate({pathname:'/(tabs)/inbox/[conversationId]', params:{conversationId: conversation.id}})
    }
    return (
        <View style={[styles.conteneur,{backgroundColor: colors.background}]}>
            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={({item}) => <ConversationItem conversation={item} onPress={ouvrir}/>}
            />
        </View>
    )
}


const styles = StyleSheet.create({
    conteneur: {flex:1},
    vide:{ paddingTop: 96, paddingHorizontal:32},
})