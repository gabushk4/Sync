/**
 * Friend search asked from outside the home screen ("See in schedule" on a
 * friend's profile): the home screen opens its search with that text, as if the
 * member had typed it. Same pattern as calendrierEvents.
 *
 * @author Philip — user story 22 (friend search) and 25 (common
 *   availabilities on a friend's profile)
 */
type Ecouteur = (texte: string) => void

const ecouteurs = new Set<Ecouteur>()

export const rechercheAmiEvents = {
    /**
     * Asks the home screen to search `texte` (a friend's pseudo).
     *
     * @author Philip — user stories 22 and 25
     * @param {string} texte
     * @returns {void}
     */
    chercher: (texte: string) => {
        ecouteurs.forEach((ecouteur) => ecouteur(texte))
    },

    /**
     * Calls `ecouteur` with every search asked from now on.
     *
     * @author Philip — user stories 22 and 25
     * @param {(texte: string) => void} ecouteur
     * @returns {() => void} Unsubscribes.
     */
    abonner: (ecouteur: Ecouteur): (() => void) => {
        ecouteurs.add(ecouteur)
        return () => { ecouteurs.delete(ecouteur) }
    },
}
