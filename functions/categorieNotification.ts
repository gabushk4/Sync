// Part of user story 9 (accept/refuse an event invitation from a notification).
// SUBJECT TO CHANGE: may be revised depending on how teammates implement their own user stories.

/** Filter/label categories shown in the notifications screen. */
export type CategorieNotification = 'amis' | 'evenements' | 'sync'

/**
 * Maps a notification `type` (as sent by the API's envoyerNotification) to the
 * category used for its icon, label and filter. Unknown types fall into 'sync'.
 *
 * @param {string | null | undefined} type - e.g. 'invitation_evenement', 'demande_ami', 'messages'.
 * @returns {CategorieNotification}
 */
export default function categorieNotification(type: string | null | undefined): CategorieNotification {
    switch (type) {
        case 'demande_ami':
        case 'amis':
            return 'amis'
        case 'invitation_evenement':
        case 'evenements':
            return 'evenements'
        default:
            return 'sync'
    }
}
