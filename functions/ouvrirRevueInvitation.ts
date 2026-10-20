import { router } from 'expo-router'

import { bornesLocales, InvitationInfo } from '@/types/invitation'

/**
 * Opens the invitation review screen ("adjust my schedule"): on the event's day,
 * the inviter's, the other invitees' and the member's schedules, the invited event
 * colored by each one's answer.
 *
 * @author Philip — user story 8 (reviewing an invitation in conflict)
 * @param {InvitationInfo} invitation
 * @returns {void}
 */
export default function ouvrirRevueInvitation(invitation: InvitationInfo): void {
    router.push({
        pathname: '/(tabs)/home/revueInvitation',
        params: { invitation: JSON.stringify(invitation) },
    } as any)
}

/**
 * Opens the decision page of an invitation: the invited event's details,
 * read-only, with its organizer, its participants and their answer, and accept /
 * refuse / "adjust my schedule". Opened by tapping a pending invitation in the feed,
 * or the leader's event in the invitation review (`depuisRevue`: "adjust my
 * schedule" then just goes back to it).
 *
 * @author Philip — user story 8 (answering an invitation)
 * @param {InvitationInfo} invitation
 * @param {{ depuisRevue?: boolean }} [options]
 * @returns {void}
 */
export function ouvrirDecisionInvitation(invitation: InvitationInfo, { depuisRevue = false } = {}): void {
    const { debut, fin } = bornesLocales(invitation)
    router.push({
        pathname: '/(tabs)/home/details/[eventId]',
        params: {
            eventId: invitation.id_evenement,
            ...(debut ? { start: debut.toISO() } : {}),
            ...(fin ? { end: fin.toISO() } : {}),
            invitation: JSON.stringify(invitation),
            ...(depuisRevue ? { depuisRevue: '1' } : {}),
        },
    } as any)
}
