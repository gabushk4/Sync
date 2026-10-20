// Types for the event conflict screen. Part of user story 8 (conflict screen
// when creating an overlapping event).

/**
 * Existing event that overlaps the one being created, as sent in the API's
 * 409 response (see `retourConflit` server-side).
 */
export type EvenementEnConflit = {
    id: string
    titre: string
    /** UTC, ISO without offset. For a recurring event, the conflicting occurrence's start. */
    debut: string
    /** UTC, ISO without offset. */
    fin: string
    /** 'recurrence' when this is one occurrence of a recurring event. */
    type?: string
    /** 'editeur' may delete the event; any other value can only leave it. */
    privilege_membre?: string | null
}

/** POST /evenements/ body of the event being created. */
export type NouvelEvenement = {
    titre: string
    description?: string
    prive: boolean
    /** UTC SQL datetime ('yyyy-MM-dd HH:mm:ss'). */
    debut: string | null
    /** UTC SQL datetime ('yyyy-MM-dd HH:mm:ss'). */
    fin: string | null
    regle_recurrence?: string | null
    participants: { id: string, privilege: string }[]
    [cle: string]: unknown
}

/**
 * Every conflicting event of an API 409 answer: `evenements` lists them all, an
 * older API only sends the first one as `evenement`. Used by the create screen
 * and the conflict screen (a removal that leaves conflicts).
 *
 * @author Philip — user story 8 (event conflicts)
 * @param {{ evenements?: EvenementEnConflit[], evenement?: EvenementEnConflit }} data - 409 response body.
 * @returns {EvenementEnConflit[]}
 */
export function conflitsDeLaReponse(data: { evenements?: EvenementEnConflit[], evenement?: EvenementEnConflit }): EvenementEnConflit[] {
    if (data?.evenements) return data.evenements
    return data?.evenement ? [data.evenement] : []
}
