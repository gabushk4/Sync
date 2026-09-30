import { FriendIntervals, Interval } from "@/types/availabilities"
import { Participant } from "@/types/invites"
import { DateTime } from "luxon"
import { createContext, useEffect, useState } from "react"
import { useAPI } from "./contexteAPI"
import { useInvites } from "./contexteInvites"

type LoadingStatus = 'loading' | 'idle' | 'error';

type ContextEventDraftProvider = {
    invites: Participant[],
    start: DateTime,
    end: DateTime,
    slotSuggestions: Array<Interval>
    friendsSuggestions: Array<FriendIntervals>,
    loadingStatus: LoadingStatus
}

const EventDraftContext = createContext<ContextEventDraftProvider | undefined>(undefined)

const EventDraftProvider: React.FC<React.PropsWithChildren> = ({ children }) => {

    const { invites } = useInvites()
    const { api } = useAPI()

    const now = DateTime.now()
    const [start, setStart] = useState<DateTime>(now.plus({hour:1}))
    const [end, setEnd] = useState<DateTime>(start.plus({ hour: 1 }))
    
    const [slotSuggestions, setSlotSuggestions] = useState<Array<Interval>>([])
    const [friendsSuggestions, setFriendsSuggestions] = useState<Array<FriendIntervals>>([])

    const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>('idle')

    useEffect(() => {
        // fetch new slot suggestions via group matching
    }, [invites])

    useEffect(() => {
        //fetch new friends suggestions via datetime
    }, [start, end])

    return (
        <EventDraftContext.Provider value={{invites, start, end, slotSuggestions, friendsSuggestions, loadingStatus}}>
            {children}
        </EventDraftContext.Provider>
    )
}