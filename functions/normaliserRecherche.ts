/**
 * Text compared by a search: trimmed, lowercase, accents removed ("Élo" finds
 * "elodie"), like the pseudo column's collation on the API side.
 *
 * @author Philip — user story 22 (friend search on the home screen)
 * @param {string} texte - Typed text, or the text searched in (a pseudo).
 * @returns {string}
 */
export default function normaliserRecherche(texte: string): string {
    return texte.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
