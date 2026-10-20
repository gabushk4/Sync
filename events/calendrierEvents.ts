import { DateTime } from 'luxon'

/**
 * Day selected in the calendar page, pushed to the home timeline as soon as it
 * changes (tap on a day, or a range's first day). The home screen applies it right
 * away, while it's still hidden under the calendar, so going back (header arrow,
 * iOS swipe, Android back button) shows the timeline already on that day. It used
 * to be read only when the home screen regained focus, so the old day showed
 * during the transition and then switched.
 *
 * @author Philip — user story 5 (month calendar)
 */
type Ecouteur = (jour: DateTime) => void

const ecouteurs = new Set<Ecouteur>()

export const calendrierEvents = {
    /**
     * Records the day selected in the calendar (range start for a range) and
     * tells the listeners (the home screen).
     *
     * @author Philip — user story 5 (month calendar)
     * @param {DateTime} jour
     * @returns {void}
     */
    definirJour: (jour: DateTime) => {
        ecouteurs.forEach((ecouteur) => ecouteur(jour))
    },

    /**
     * Calls `ecouteur` with every day selected from now on.
     *
     * @author Philip — user story 5 (month calendar)
     * @param {(jour: DateTime) => void} ecouteur
     * @returns {() => void} Unsubscribes.
     */
    abonner: (ecouteur: Ecouteur): (() => void) => {
        ecouteurs.add(ecouteur)
        return () => { ecouteurs.delete(ecouteur) }
    },
}
