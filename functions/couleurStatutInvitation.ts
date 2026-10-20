/**
 * Color of an answer to an invitation: accepted green, refused red, pending (or
 * unknown) yellow. Shared by the invitation review (colored events and legend)
 * and the decision page's participants list.
 *
 * @author Philip — user story 8 (reviewing an invitation)
 * @param {string | null | undefined} statut - 'acceptee' | 'en_attente' | 'refusee'.
 * @param {{ success: string, error: string, warning: string }} colors - Palette (usePalette).
 * @returns {string}
 */
export default function couleurStatutInvitation(
    statut: string | null | undefined,
    colors: { success: string, error: string, warning: string },
): string {
    if (statut === 'acceptee') return colors.success
    if (statut === 'refusee') return colors.error
    return colors.warning
}

/**
 * A darker shade of a palette color (`hsl(h, s%, l%)`, see generateTheme): its
 * lightness lowered by `ecart` points. Other formats are returned unchanged.
 * Used for the leader's invited event in the invitation review (darker green).
 *
 * @author Philip — user story 8 (reviewing an invitation)
 * @param {string} couleur - e.g. 'hsl(90, 60%, 60%)'.
 * @param {number} [ecart=22] - Lightness points to remove.
 * @returns {string}
 */
export function assombrir(couleur: string, ecart = 22): string {
    const m = couleur.match(/^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/)
    if (!m) return couleur
    return `hsl(${m[1]}, ${m[2]}%, ${Math.max(5, Number(m[3]) - ecart)}%)`
}
