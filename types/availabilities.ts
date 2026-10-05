import { DateTime } from "luxon";

export type Interval = {
    id: string;
    debut: DateTime; 
    fin: DateTime;
}

export type FriendIntervals = {
    id: string,    
    intervales: Interval[]
}

export type DateTimeSuggestions = {
    debut: DateTime;
    fin: DateTime;
}