import { useCallback } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont'
import { useConversations } from '@/contextes/contexteConversations'
import { useRouteAbs } from '@/contextes/contexteRoute'
import { useNavFab } from '@/hooks/useNavFAB'

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
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const {ajouterEcran} = useRouteAbs()

    const {conversations, rafraichirConversations} = useConversations()

    useFocusEffect(useCallback(()=> {
        ajouterEcran('inbox')
        rafraichirConversations()
    }, []))

    // le bouton "+" au centre de la barre d'onglets ouvre la liste d'amis pour écrire à quelqu'un
    useNavFab({
        href: '/(modals)/listeAmis',
        params: { type: 'message' },
        icon: null,
    })

    const ouvrir = (conversation: Conversation) => {
        router.navigate({pathname:'/(tabs)/inbox/[conversationId]', params:{conversationId: conversation.id}})
    }

    return (
        <View style={[styles.conteneur,{backgroundColor: colors.background, paddingTop: insets.top}]}>
            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={({item}) => <ConversationItem conversation={item} onPress={ouvrir}/>}
                refreshControl={<RefreshControl refreshing={false} onRefresh={rafraichirConversations} />}
                contentContainerStyle={{ flexGrow: 1 }}
                ListEmptyComponent={
                    <View style={styles.vide}>
                        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, textAlign: 'center' }}>
                            Aucune conversation pour l'instant. Touche + pour écrire à un ami.
                        </Text>
                    </View>
                }
            />
        </View>
    )
}


const styles = StyleSheet.create({
    conteneur: {flex:1},
    vide:{ paddingTop: 96, paddingHorizontal:32},
})
