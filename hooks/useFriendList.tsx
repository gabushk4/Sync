import { useInvites } from "@/contextes/contexteInvites"
import { Participant } from "@/types/invites"
import { router } from "expo-router"


export type FriendListType = 'select' | 'consult'

export function useFriendList(type: FriendListType) {
    const {ajouterInvite} = useInvites()
    switch (type) {
        case 'select':
            return (friends: Participant | Array<Participant>, inviterUrl?:string) => ajouterInvite(friends, inviterUrl)
        case 'consult':
            return (friend: Participant) => router.navigate({ pathname: '/(tabs)/profile/[membreId]', params: { membreId: friend.id } })
    }
}