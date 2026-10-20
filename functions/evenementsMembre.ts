import { DateTime } from 'luxon'

import { convertLocalToUTC, convertUTCToLocal } from '@/functions/convertirUTCenLocal'
import formaterDatePourServeur from '@/functions/formaterDatePourServeur'

/**
 * Helpers shared by the home timeline (one day) and the month calendar page (one
 * month's grid) to fetch and read the member's events.
 */

/** Max events per request in the month calendar (the API defaults to 20, too few for a month). */
export const LIMITE_MOIS = 300

/**
 * Query params for GET /evenements and /evenements/amis covering [debut, fin].
 * The API reads `debut`/`fin` as UTC SQL datetimes; the app used to send
 * `start`/`end` (sometimes as raw DateTime objects), which the API ignored —
 * it always answered with today's events, whatever day or month was shown.
 * Part of user story 9. Shared by the home timeline and the calendar page.
 *
 * @param {DateTime} debut - Local start of the range.
 * @param {DateTime} fin - Local end of the range.
 * @param {number} [limite] - Max number of events (non-recurring) to return.
 * @returns {{ debut: string | null, fin: string | null, limite?: number }}
 */
export const paramsPlage = (debut: DateTime, fin: DateTime, limite?: number) => ({
    debut: formaterDatePourServeur(convertLocalToUTC(debut)),
    fin: formaterDatePourServeur(convertLocalToUTC(fin)),
    ...(limite ? { limite } : {}),
})

/**
 * Query params for one local day (timeline). See {@link paramsPlage}.
 *
 * @param {DateTime} jour - Any moment of the day to fetch.
 * @returns {{ debut: string | null, fin: string | null }}
 */
export const paramsJour = (jour: DateTime) => paramsPlage(jour.startOf('day'), jour.endOf('day'))

/**
 * Query params for one local month's calendar grid: the month plus the
 * neighbouring months' days shown on its first and last weeks (they used to
 * have no dots and no events), with a higher event limit. See {@link paramsPlage}.
 *
 * @author Philip — user story 5 (month calendar)
 * @param {DateTime} mois - Any moment of the month to fetch.
 * @returns {{ debut: string | null, fin: string | null, limite: number }}
 */
export const paramsMois = (mois: DateTime) =>
    paramsPlage(mois.startOf('month').startOf('week'), mois.endOf('month').endOf('week'), LIMITE_MOIS)

/**
 * Converts the member's events from GET /evenements to local DateTimes, earliest
 * first. Placeholders ('factice') are dropped. Shared by the timeline (one day) and
 * the calendar page (one month), which each keep their own list.
 *
 * @param {any[]} evenements - `evenements` of the API answer.
 * @param {string} [fuseau] - Member's timezone.
 * @returns {any[]} Events with `id` (public id) and DateTime `debut`/`fin`.
 */
export function formaterEvenementsMembre(evenements: any[], fuseau?: string) {
    return evenements
        .filter((evenement: any) => evenement && !evenement.id_publique?.includes('factice'))
        .map((evenement: any) => ({
            ...evenement,
            id: evenement.id_publique,
            // Same instant, expressed in the device's zone, which the timeline's day
            // comparisons expect.
            debut: DateTime.fromMillis(convertUTCToLocal(evenement.debut, fuseau).toMillis()),
            fin: DateTime.fromMillis(convertUTCToLocal(evenement.fin, fuseau).toMillis()),
            fuseauHoraire: fuseau,
        }))
        .sort((a: any, b: any) => (a.debut?.toMillis() ?? 0) - (b.debut?.toMillis() ?? 0))
}

/**
 * Last instant an event occupies: its end minus 1 ms, so an event ending exactly
 * at midnight doesn't count as being on the next day (or its start when it has
 * no end / an empty duration). The calendar's dots, day list and labels all use
 * it, so they agree on which days an event covers.
 *
 * @author Philip — user story 5 (month calendar)
 * @param {{ debut?: DateTime, fin?: DateTime }} evenement - Event with local DateTimes
 *   (callers have checked that it has a start).
 * @returns {DateTime}
 */
export function dernierInstant(evenement: { debut?: DateTime, fin?: DateTime }): DateTime {
    const debut = evenement.debut as DateTime
    const fin = evenement.fin
    return fin && fin > debut ? fin.minus({ milliseconds: 1 }) : debut
}

/**
 * Jour férié importé (stories #4 et #7) : il est affiché (nom sous la date, étiquette dans le
 * calendrier du mois), mais il n'occupe pas la journée : ni bloc dans l'horaire, ni "journée
 * complète", et il ne réduit pas les disponibilités.
 *
 * @param {any} evenement - Event from the API (`jour_ferie` set by the server).
 * @returns {boolean}
 */
export const estJourFerie = (evenement: any): boolean => Boolean(evenement?.jour_ferie)

/**
 * Names of the holidays falling on `jour`, without duplicates (two imported holiday
 * calendars often contain the same holiday).
 *
 * @param {any[]} evenements - Events with local DateTime `debut`/`fin`.
 * @param {DateTime} [jour] - Day to look at.
 * @returns {string[]}
 */
export function joursFeriesDuJour(evenements: any[], jour?: DateTime): string[] {
    if (!jour) return []
    const debutJour = jour.startOf('day')
    const finJour = jour.endOf('day')
    const noms = evenements
        .filter((ev) => estJourFerie(ev) && ev?.debut && ev.debut <= finJour && dernierInstant(ev) >= debutJour)
        .map((ev) => (ev.titre ?? '').trim())
        .filter(Boolean)
    return Array.from(new Set(noms))
}
