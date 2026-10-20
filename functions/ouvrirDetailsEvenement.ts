import { router } from 'expo-router'
import { DateTime } from 'luxon'

/**
 * Opens an event's details screen, for the occurrence starting at `debut`.
 * Shared by the timeline (ListItem) and the month calendar's events list.
 *
 * @author Philip — user story 5 (month calendar)
 * @param {{ id?: string, debut?: DateTime, fin?: DateTime }} evenement - Event (local DateTimes).
 * @returns {void} Does nothing when the event has no id or start.
 */
export default function ouvrirDetailsEvenement(evenement: { id?: string, debut?: DateTime, fin?: DateTime }) {
    if (!evenement.id || !evenement.debut) return
    router.navigate({
        pathname: '/(tabs)/home/details/[eventId]',
        params: {
            eventId: evenement.id,
            start: evenement.debut.toISO(),
            end: (evenement.fin ?? evenement.debut).toISO(),
        },
    })
}
