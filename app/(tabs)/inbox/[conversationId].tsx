import { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, Keyboard, KeyboardEvent, Platform, StyleSheet, Text, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'

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
    const {conversationId } = useLocalSearchParams<{conversationId: string}>()

    const { membre } = useMembre()
    const {messages,conversations,ouvrirConversation,fermerConversation,envoyerMessage} = useConversations()

    const conversation = conversations.find((c) => c.id === conversationId)

    const listeRef = useRef<FlatList>(null)
    const conteneurRef = useRef<View>(null)

    // Hauteur de clavier qui recouvre l'écran. On la mesure nous-mêmes au lieu d'utiliser
    // KeyboardAvoidingView, qui se trompe quand il y a un header et une barre d'onglets.
    const [decalageClavier, setDecalageClavier] = useState(0)

    useEffect(() => {
        const evtAffiche = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
        const evtCache = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

        const affiche = Keyboard.addListener(evtAffiche, (e: KeyboardEvent) => {
            conteneurRef.current?.measureInWindow((_x, y, _largeur, hauteur) => {
                // ce qui dépasse du haut du clavier doit remonter
                const recouvrement = Math.max(0, y + hauteur - e.endCoordinates.screenY)
                if (Platform.OS === 'ios') Keyboard.scheduleLayoutAnimation(e)
                setDecalageClavier(recouvrement)
                requestAnimationFrame(() => listeRef.current?.scrollToEnd({ animated: true }))
            })
        })
        const cache = Keyboard.addListener(evtCache, (e: KeyboardEvent) => {
            if (Platform.OS === 'ios') Keyboard.scheduleLayoutAnimation(e)
            setDecalageClavier(0)
        })

        return () => {
            affiche.remove()
            cache.remove()
        }
    }, [])

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
        <View
            ref={conteneurRef}
            style={[styles.conteneur, { backgroundColor: colors.background, paddingBottom: decalageClavier }]}
        >
            <Stack.Screen options={{ headerTitle: conversation?.ami.pseudo ?? '' }} />
            <FlatList
                ref={listeRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
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

            {/* pas de marge en bas : la barre d'onglets tient déjà compte du bas de l'écran */}
            <MessageInput onEnvoyerTexte={envoyerTexte} onEnvoyerVocal={envoyerVocal} />
        </View>

    )
}


const styles = StyleSheet.create({
    conteneur: {flex: 1},
    vide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
