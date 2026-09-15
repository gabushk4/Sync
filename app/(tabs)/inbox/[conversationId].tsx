import { useEffect, useRef } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { usePalette } from '@/contextes/contextePalette'
import { useConversations } from '@/contextes/contexteConversations'
import { useMembre } from '@/contextes/contexteMembre'

import MessageBubble from '@/components/messageBubble'
import MessageInput from '@/components/messageInput'
import catcher from '@/functions/catcher'

export default function Conversation(){
    const { colors } = usePalette()
    const insets = useSafeAreaInsets()
    const {conversationId } = useLocalSearchParams<{conversationId: string}>()

    const { membre } = useMembre()
    const {messages,conversations,ouvrirConversation,fermerConversation,envoyerMessage} = useConversations()

    const conversation = conversations.find((c) => c.id === conversationId)
    
    const listeRef = useRef<FlatList>(null)
    
     useFocusEffect(
        useRef(() => {
            if (conversationId) ouvrirConversation(conversationId)
            return () => fermerConversation()
        }).current
    )

    useEffect(() => {
        if ( messages.length > 0 ){
            requestAnimationFrame(() => listeRef.current?.scrollToEnd({ animated: true }))
        }
    }, [messages.length])

    const envoyerTexte = async (texte: string) => {
        if(!conversationId) return
        try {
            await envoyerMessage(conversationId, {type: 'texte', contenu: texte})
        } catch (error) {
            catcher(error,"erreur d'envoi")
        }
    }
    const envoyerVocal = async (uri:string,dureeSecondes:number) =>{
        if(!conversationId) return
        try{
            await envoyerMessage(conversationId, {type: 'vocal', contenu: {uri, duree: dureeSecondes}})
        } catch (error) {
            catcher(error,"erreur d'envoi du message vocal")
        }
    }

    return (
        <KeyboardAvoidingView
            style={[styles.conteneur, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {conversation && <Stack.Screen options={{ headerTitle: conversation.ami.pseudo }} />}
            <FlatList
                ref={listeRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingVertical: 12 }}
                renderItem={({ item }) => (
                    <MessageBubble message={item} estDeMoi={item.auteurId === membre.idPublique} />
                )}
            />

            <View style={{ paddingBottom: insets.bottom }}>
                <MessageInput onEnvoyerTexte={envoyerTexte} onEnvoyerVocal={envoyerVocal} />
            </View>
        </KeyboardAvoidingView>

    )
}


const styles = StyleSheet.create({
    conteneur: {flex: 1}
})