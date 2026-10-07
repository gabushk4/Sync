export type FriendsAvailabilityPage = {
    append: boolean;
    hasMore: boolean;
    friendIds: string[];
}

type RequestMoreListener = () => Promise<FriendsAvailabilityPage>
type PageUpdateListener = (page: FriendsAvailabilityPage) => void

const listeners = new Set<RequestMoreListener>()
const pageUpdateListeners = new Set<PageUpdateListener>()
let latestPage: FriendsAvailabilityPage | undefined

export const friendsAvailabilityEvents = {
    onRequestMore: (listener: RequestMoreListener) => {
        listeners.add(listener)
        return () => {
            listeners.delete(listener)
        }
    },
    onPageUpdate: (listener: PageUpdateListener) => {
        pageUpdateListeners.add(listener)
        return () => {
            pageUpdateListeners.delete(listener)
        }
    },
    publishPage: (page: FriendsAvailabilityPage) => {
        latestPage = page
        pageUpdateListeners.forEach(listener => listener(page))
    },
    getLatestPage: () => latestPage,
    requestMore: async (): Promise<FriendsAvailabilityPage> => {
        const listener = [...listeners][0]
        return listener ? listener() : { append: true, hasMore: false, friendIds: [] }
    },
}