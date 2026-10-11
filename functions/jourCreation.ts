import { DateTime } from 'luxon'

/**
 * Rules of the "+" button (create an event) shared by the home timeline and the
 * month calendar page, so both suggest the same start and refuse the same days.
 */

/**
 * Suggested start for an event created on `jour`: that day at the next full hour
 * of the current time, capped at 23:00 so it stays on that day (after 23:00 it
 * used to roll over to the next day's midnight, and the chosen day could no longer
 * be picked in the form). create.tsx still bumps it to at least 1h from now.
 *
 * @author Philip Kvaratshelya — user story 5 (month calendar) and rectification
 *   for a more conventional display (the home "+" uses the same rule)
 * @param {DateTime} jour - Day the event is created on.
 * @returns {DateTime}
 */
export function debutCreationPourJour(jour: DateTime): DateTime {
    return jour.startOf('day').set({ hour: Math.min(DateTime.now().hour + 1, 23) })
}

/**
 * Whether [debut, fin] covers whole days: from midnight to the end of a day
 * (23:59:59 — what the "all day" switch sets). The create form then counts it as
 * an all-day event: allowed today, and shown with the switch on.
 *
 * @author Philip Kvaratshelya — rectification for a more conventional display: "all day" works, including today
 * @param {DateTime} debut - Event start (local).
 * @param {DateTime} fin - Event end (local).
 * @returns {boolean}
 */
export function estJourneeEntiere(debut: DateTime, fin: DateTime): boolean {
    return debut.isValid && fin.isValid
        && debut.equals(debut.startOf('day'))
        && fin >= fin.endOf('day').minus({ seconds: 1 })
}

/**
 * Whether `jour` is before today: no event can be created there (the "+" button
 * then shows an error instead of opening the form).
 *
 * @author Philip Kvaratshelya — rectification for a more conventional display:
 *   past days refuse creation with a clear message instead of an API error
 * @param {DateTime} jour - Any moment of the day to check.
 * @returns {boolean}
 */
export function estJourPasse(jour: DateTime): boolean {
    return jour.startOf('day') < DateTime.now().startOf('day')
}
