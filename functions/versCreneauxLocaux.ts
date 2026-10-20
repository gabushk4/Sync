import { convertUTCToLocal } from '@/functions/convertirUTCenLocal'
import { Interval } from '@/types/availabilities'

/**
 * Converts the common free slots of POST /disponibilites/communes (UTC dates) to
 * local ones. Shared by the creation form's suggestions (contexteEventDraft) and a
 * friend's profile widget (WidgetDisposCommunes).
 *
 * @author Philip — user story 25 (common availabilities on a friend's
 *   profile): extracted from contexteEventDraft
 * @param {{ id: string, debut: string, fin: string }[]} disponibilites - The API's `disponibilites`.
 * @param {string} [fuseau] - Member's timezone (the device's by default).
 * @returns {Interval[]}
 */
export default function versCreneauxLocaux(disponibilites: any[] = [], fuseau?: string): Interval[] {
    return disponibilites.map((d) => ({
        ...d,
        debut: convertUTCToLocal(d.debut, fuseau),
        fin: convertUTCToLocal(d.fin, fuseau),
    }))
}
