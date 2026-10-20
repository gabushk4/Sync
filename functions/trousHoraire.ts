import { DateTime } from 'luxon'

/** A free stretch of the member's schedule (no event), inside the loaded window. */
export type Trou = {
    debut: DateTime
    fin: DateTime
    /** Already elapsed (before now): shown greyed out, not selectable. */
    passe: boolean
}

/** Step (minutes) the selected range's start and end are snapped to. */
export const PAS_SELECTION = 15

/**
 * Free stretches of the member's schedule over the loaded window: everything not
 * covered by an event. Overlapping events are merged, and a stretch spanning now
 * is split in two (its elapsed part is `passe`).
 *
 * @author Philip — user story 20
 * @param {{ debut?: DateTime, fin?: DateTime }[]} evenements - Member's events (local DateTimes).
 * @param {DateTime} debutFenetre - Window start (start of its first day).
 * @param {DateTime} finFenetre - Window end (exclusive).
 * @param {DateTime} [maintenant=DateTime.now()]
 * @returns {Trou[]} Earliest first.
 */
export function calculerTrous(
    evenements: { debut?: DateTime, fin?: DateTime }[],
    debutFenetre: DateTime,
    finFenetre: DateTime,
    maintenant: DateTime = DateTime.now(),
): Trou[] {
    const debutMs = debutFenetre.toMillis()
    const finMs = finFenetre.toMillis()

    // Busy intervals clipped to the window, then merged.
    const occupes = evenements
        .filter((ev) => ev?.debut && ev?.fin)
        .map((ev) => [Math.max(ev.debut!.toMillis(), debutMs), Math.min(ev.fin!.toMillis(), finMs)])
        .filter(([d, f]) => f > d)
        .sort((a, b) => a[0] - b[0])

    const libres: [number, number][] = []
    let curseur = debutMs
    for (const [d, f] of occupes) {
        if (d > curseur) libres.push([curseur, d])
        curseur = Math.max(curseur, f)
    }
    if (curseur < finMs) libres.push([curseur, finMs])

    const maintenantMs = maintenant.toMillis()
    const trous: Trou[] = []
    for (const [d, f] of libres) {
        const zone = debutFenetre.zone
        const versDate = (ms: number) => DateTime.fromMillis(ms, { zone })
        if (f <= maintenantMs) trous.push({ debut: versDate(d), fin: versDate(f), passe: true })
        else if (d >= maintenantMs) trous.push({ debut: versDate(d), fin: versDate(f), passe: false })
        else {
            trous.push({ debut: versDate(d), fin: versDate(maintenantMs), passe: true })
            trous.push({ debut: versDate(maintenantMs), fin: versDate(f), passe: false })
        }
    }
    return trous
}
