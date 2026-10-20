import { router } from 'expo-router'
import { DateTime } from 'luxon'

/** The friend invited to the new event (public id, as the API sends it). */
export type AmiInvite = { id: string, pseudo: string, fp_url?: string | null }

/**
 * Opens the event creation on a common free slot, with the friend already invited
 * (read-only participant). Shared by the home timeline's free slots (FreeSlotItem)
 * and a friend's profile widget (WidgetDisposCommunes).
 *
 * @author Philip Kvaratshelya — user story 25 (common availabilities on a friend's
 *   profile): extracted from FreeSlotItem, plus `retour`
 * @param {Object} options
 * @param {DateTime} options.debut - Slot start (a past start is moved to now by create.tsx).
 * @param {DateTime} options.fin - Slot end.
 * @param {AmiInvite} options.ami - Friend to invite.
 * @param {{ pathname: string, params?: Record<string, string> }} [options.retour] - Screen
 *   to go back to once the creation is left (create.tsx's `retour`), e.g. the friend's
 *   profile; the home timeline otherwise.
 * @returns {void}
 */
export default function ouvrirCreationAvecAmi({ debut, fin, ami, retour }: {
    debut: DateTime,
    fin: DateTime,
    ami: AmiInvite,
    retour?: { pathname: string, params?: Record<string, string> },
}): void {
    router.push({
        pathname: '/(tabs)/home/create',
        params: {
            start: debut.toISO(),
            end: fin.toISO(),
            friend: JSON.stringify({ id: ami.id, pseudo: ami.pseudo, fp_url: ami.fp_url ?? null, privilege: 'lecteur' }),
            ...(retour ? { retour: JSON.stringify(retour) } : {}),
        },
    } as any)
}
