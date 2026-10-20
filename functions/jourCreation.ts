import { DateTime } from 'luxon'
import ceilBy5 from './ceilBy5'

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
 * @author Philip — user story 5 (month calendar) and rectification
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
 * @author Philip — rectification for a more conventional display: "all day" works, including today
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
 * @author Philip — rectification for a more conventional display:
 *   past days refuse creation with a clear message instead of an API error
 * @param {DateTime} jour - Any moment of the day to check.
 * @returns {boolean}
 */
export function estJourPasse(jour: DateTime): boolean {
    return jour.startOf('day') < DateTime.now().startOf('day')
}

/**
 * Range pre-filled by the create forms (event and unavailability) from their
 * `start` / `end` route params (ISO), sorted (the native pickers crash when the
 * start is after the end). Nothing in the past:
 * - single slot (`start` only): at least 1h from now, no end to anchor against;
 * - explicit range: its start, or now (rounded up to 5 min) when it starts earlier;
 *   whole days are kept as is, even today, so the form opens with "all day" on;
 * - a range already over is dropped.
 *
 * @author Philip — user story 20: shared by create.tsx (where this
 *   logic lived, user story 5 / rectification) and indisponibilite.tsx
 * @param {string} [start] - ISO start.
 * @param {string} [end] - ISO end.
 * @param {DateTime} [maintenant=DateTime.now()]
 * @returns {{ debutSuggere: DateTime, finDemandee?: DateTime }}
 */
export function plagePreremplie(start?: string, end?: string, maintenant: DateTime = DateTime.now()): { debutSuggere: DateTime, finDemandee?: DateTime } {
    let debutDemande = DateTime.fromISO(start ?? '')
    let finDemandee = end ? DateTime.fromISO(end) : undefined
    if (finDemandee && debutDemande.isValid && debutDemande > finDemandee) {
        [debutDemande, finDemandee] = [finDemandee, debutDemande]
    }
    if (finDemandee && finDemandee <= maintenant) finDemandee = undefined

    let debutSuggere: DateTime
    if (!debutDemande.isValid) debutSuggere = maintenant.plus({ hours: 1 })
    else if (finDemandee && estJourneeEntiere(debutDemande, finDemandee)) debutSuggere = debutDemande
    else if (finDemandee) debutSuggere = debutDemande > maintenant ? debutDemande : ceilBy5(maintenant)
    else debutSuggere = debutDemande.diff(maintenant, 'hours').hours > 1 ? debutDemande : maintenant.plus({ hours: 1 })
    return { debutSuggere, finDemandee }
}

/**
 * Whether a range about to be created starts in the past (checked on confirming:
 * the pickers' minimum is set when the form opens, so the start can pass while it
 * is filled). An all-day range starts at midnight: today is still allowed.
 *
 * @author Philip — user story 20: shared by create.tsx (where this
 *   check lived, rectification) and indisponibilite.tsx
 * @param {DateTime} debut
 * @param {DateTime} fin
 * @returns {boolean}
 */
export function debutDejaPasse(debut: DateTime, fin: DateTime): boolean {
    return estJourneeEntiere(debut, fin)
        ? debut < DateTime.now().startOf('day')
        : debut < DateTime.now().minus({ minutes: 1 })
}
