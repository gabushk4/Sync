import { DateTime } from "luxon"

export type Interval = {
    start: DateTime, 
    end: DateTime
}

export type FriendIntervals = {
    friendId: string,    
    intervales: Interval[]
}