import { useConversations } from "@/contextes/contexteConversations"
import { useInvites } from "@/contextes/contexteInvites"
import { Participant } from "@/types/invites"
import { router } from "expo-router"


export type FriendListType = 'select' | 'consult' | 'message'

// le modal de la liste d'amis prend ~300 ms à se fermer (voir modalBase)
const DELAI_FERMETURE_MODAL_MS = 350
const attendre = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function useFriendList(type: FriendListType) {
    const {ajouterInvite} = useInvites()
    const {demarrerConversationAvecAmi} = useConversations()

    switch (type) {
        case 'select':
            return (friends: Participant | Array<Participant>, inviterUrl?:string) => ajouterInvite(friends, inviterUrl)
        case 'consult':
            return (friend: Participant) => router.navigate({ pathname: '/(tabs)/profile/[membreId]', params: { membreId: friend.id } })
        case 'message':
            return async (friend: Participant) => {
                // créer/retrouver la conversation pendant que le modal se ferme
                const [conversationId] = await Promise.all([
                    demarrerConversationAvecAmi(friend.id),
                    attendre(DELAI_FERMETURE_MODAL_MS),
                ])
                if (conversationId) {
                    router.navigate({ pathname: '/(tabs)/inbox/[conversationId]', params: { conversationId } })
                }
            }
    }
}
