import { DateTime } from 'luxon'

/**
 * Position of `date` on a timeline row, in hours from the window's start, with the
 * wall-clock layout every block uses (day × 24 + hour): ListItem, FreeSlotItem and
 * the member's free blocks (TrousHoraire) all line up on it.
 *
 * @author Philip — user story 20: shared (ListItem and FreeSlotItem each
 *   had their own copy)
 * @param {DateTime} date
 * @param {DateTime} debutFenetre - Window start (any moment of its first day).
 * @returns {number}
 */
export function positionHeures(date: DateTime, debutFenetre: DateTime): number {
    const jour = Math.round(date.startOf('day').diff(debutFenetre.startOf('day'), 'days').days)
    return jour * 24 + date.hour + date.minute / 60 + date.second / 3600 + date.millisecond / 3600000
}

/**
 * Inverse of positionHeures: the moment shown `heures` hours after the window's
 * start, optionally snapped to a step of `pas` minutes.
 *
 * @author Philip — user story 20
 * @param {number} heures - Position on the row, in hours.
 * @param {DateTime} debutFenetre - Window start (any moment of its first day).
 * @param {'floor' | 'round' | 'aucun'} [arrondi='aucun'] - How to snap to the step.
 * @param {number} [pas=15] - Step, in minutes.
 * @returns {DateTime}
 */
export function heuresVersDate(heures: number, debutFenetre: DateTime, arrondi: 'floor' | 'round' | 'aucun' = 'aucun', pas = 15): DateTime {
    let minutes = Math.max(0, heures) * 60
    if (arrondi === 'floor') minutes = Math.floor(minutes / pas) * pas
    else if (arrondi === 'round') minutes = Math.round(minutes / pas) * pas
    const jour = Math.floor(minutes / 1440)
    const reste = minutes - jour * 1440
    return debutFenetre.startOf('day').plus({ days: jour }).set({
        hour: Math.floor(reste / 60),
        minute: Math.floor(reste % 60),
        second: Math.floor((reste * 60) % 60),
        millisecond: 0,
    })
}
