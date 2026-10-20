import { DateTime } from 'luxon'

import { convertUTCToLocal } from '@/functions/convertirUTCenLocal'

// Event invitation being answered, shared by the feed, the invitation review
// screen and the decision (event details) page.
// Philip — user story 8 (answering an invitation in conflict).

/** What the app needs to answer an invitation (from a notification's `details`). */
export type InvitationInfo = {
    /** Public id of the invitation. */
    id: string
    /** Public id of the event the member is invited to. */
    id_evenement: string
    titre_evenement: string
    /** UTC ISO dates of the event. */
    debut: string | null
    fin: string | null
    /** Public id and pseudo of the member who invited (the "leader"). */
    id_invitant: string
    pseudo_invitant: string
}

/** Answer to an invitation, as stored by the API. */
export type StatutInvitation = 'en_attente' | 'acceptee' | 'refusee'

/**
 * Reads an invitation from a notification's `details` (resolved by the API).
 *
 * @author Philip — user story 8
 * @param {Record<string, any> | null | undefined} details - `details` of an 'invitation_evenement' notification.
 * @returns {InvitationInfo | null} Null when it isn't an invitation.
 */
export function invitationDepuisDetails(details: Record<string, any> | null | undefined): InvitationInfo | null {
    if (!details?.id || !details?.id_evenement) return null
    return {
        id: details.id,
        id_evenement: details.id_evenement,
        titre_evenement: details.titre_evenement ?? '',
        debut: details.debut ?? null,
        fin: details.fin ?? null,
        id_invitant: details.id_invitant,
        pseudo_invitant: details.pseudo_invitant ?? '',
    }
}

/**
 * Local start and end of the invited event (undefined when the API sent no date).
 *
 * @author Philip — user story 8
 * @param {InvitationInfo} invitation
 * @param {string} [fuseau] - Member's timezone (device's by default).
 * @returns {{ debut: DateTime | undefined, fin: DateTime | undefined }}
 */
export function bornesLocales(invitation: InvitationInfo, fuseau?: string): { debut: DateTime | undefined, fin: DateTime | undefined } {
    return {
        debut: invitation.debut ? convertUTCToLocal(invitation.debut, fuseau) : undefined,
        fin: invitation.fin ? convertUTCToLocal(invitation.fin, fuseau) : undefined,
    }
}
