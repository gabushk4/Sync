import { router } from 'expo-router'
import { DateTime } from 'luxon'

/** The friend invited to the new event (public id, as the API sends it). */
export type AmiInvite = { id: string, pseudo: string, fp_url?: string | null }

/**
 * Opens the event creation on a common free slot, with the friend already invited
 * (read-only participant). Shared by the home timeline's free slots (FreeSlotItem)
 * and a friend's profile widget (WidgetDisposCommunes).
 *
 * @author Philip — user story 25 (common availabilities on a friend's
 *   profile): extracted from FreeSlotItem
 * @author Philip — rectification (user story 20): from a friend's profile, the
 *   creation opens in the profile stack (app/(tabs)/profile/create), so going back
 *   returns straight to that profile — the home stack showed the timeline first
 * @param {Object} options
 * @param {DateTime} options.debut - Slot start (a past start is moved to now by create.tsx).
 * @param {DateTime} options.fin - Slot end.
 * @param {AmiInvite} options.ami - Friend to invite.
 * @param {boolean} [options.depuisProfil=false] - Opened from the friend's profile.
 * @returns {void}
 */
export default function ouvrirCreationAvecAmi({ debut, fin, ami, depuisProfil = false }: {
    debut: DateTime,
    fin: DateTime,
    ami: AmiInvite,
    depuisProfil?: boolean,
}): void {
    router.push({
        pathname: depuisProfil ? '/(tabs)/profile/create' : '/(tabs)/home/create',
        params: {
            start: debut.toISO(),
            end: fin.toISO(),
            friend: JSON.stringify({ id: ami.id, pseudo: ami.pseudo, fp_url: ami.fp_url ?? null, privilege: 'lecteur' }),
            ...(depuisProfil ? { depuis: 'profil' } : {}),
        },
    } as any)
}
