import { useCallback, useEffect, useRef } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont'
import { useConversations } from '@/contextes/contexteConversations'
import { useMembre } from '@/contextes/contexteMembre'

import MessageBubble from '@/components/messageBubble'
import MessageInput from '@/components/messageInput'
import catcher from '@/functions/catcher'

export default function Conversation(){
    const { colors } = usePalette()
    const { fonts } = useFont()
    const insets = useSafeAreaInsets()
    const {conversationId } = useLocalSearchParams<{conversationId: string}>()

    const { membre } = useMembre()
    const {messages,conversations,ouvrirConversation,fermerConversation,envoyerMessage} = useConversations()

    const conversation = conversations.find((c) => c.id === conversationId)

    const listeRef = useRef<FlatList>(null)

    // useCallback avec conversationId : si on passe d'une conversation à une autre,
    // l'effet se relance avec le bon id (useRef(...).current gardait le premier)
    useFocusEffect(
        useCallback(() => {
            if (conversationId) ouvrirConversation(conversationId)
            return () => fermerConversation()
        }, [conversationId, ouvrirConversation, fermerConversation])
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
            throw error // MessageInput remet le texte dans le champ
        }
    }
    const envoyerVocal = async (uri:string,dureeSecondes:number) =>{
        if(!conversationId) return
        try{
            await envoyerMessage(conversationId, {type: 'vocal', uri, dureeSecondes})
        } catch (error) {
            catcher(error,"erreur d'envoi du message vocal")
        }
    }

    return (
        <KeyboardAvoidingView
            style={[styles.conteneur, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Stack.Screen options={{ headerTitle: conversation?.ami.pseudo ?? '' }} />
            <FlatList
                ref={listeRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
                renderItem={({ item }) => (
                    <MessageBubble message={item} estDeMoi={item.auteurId === membre.idPublique} />
                )}
                ListEmptyComponent={
                    <View style={styles.vide}>
                        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15 }}>
                            Écris le premier message.
                        </Text>
                    </View>
                }
            />

            <View style={{ paddingBottom: insets.bottom }}>
                <MessageInput onEnvoyerTexte={envoyerTexte} onEnvoyerVocal={envoyerVocal} />
            </View>
        </KeyboardAvoidingView>

    )
}


const styles = StyleSheet.create({
    conteneur: {flex: 1},
    vide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
