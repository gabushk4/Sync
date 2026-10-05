import { useInvites } from "@/contextes/contexteInvites"
import { Participant } from "@/types/invites"
import { router } from "expo-router"


export type FriendListType = 'select' | 'consult'

/** Returns the selection handler used to add one or more friends to an event. */
export function useFriendList(type: 'select'): (friends: Participant | Array<Participant>, inviterUrl?: string) => void
/** Returns the navigation handler used to open a friend's profile. */
export function useFriendList(type: 'consult'): (friend: Participant) => void
export function useFriendList(type: FriendListType) {
    const {ajouterInvite} = useInvites()
    switch (type) {
        case 'select':
            return (friends: Participant | Array<Participant>, inviterUrl?:string) => ajouterInvite(friends, inviterUrl)
        case 'consult':
            return (friend: Participant) => router.navigate({ pathname: '/(tabs)/profile/[membreId]', params: { membreId: friend.id } })
    }
}
