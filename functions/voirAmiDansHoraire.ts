import { rechercheAmiEvents } from '@/events/rechercheAmiEvents'

/**
 * "See in schedule" of a friend's profile: switches to the home tab, on its base
 * schedule (the screens stacked over it are closed, so there is no back button),
 * with the friend search open on `pseudo` — as if the member had searched them.
 * The home stack is popped like the "sync" tab does (app/(tabs)/_layout).
 *
 * @author Philip — user stories 22 (friend search) and 25 (common
 *   availabilities on a friend's profile)
 * @param {any} navigation - Navigation of a screen of the tabs (e.g. the friend's
 *   profile); its parent is the tabs navigator.
 * @param {string} pseudo - Friend's pseudo, searched on the home screen.
 * @returns {void}
 */
export default function voirAmiDansHoraire(navigation: any, pseudo: string): void {
    const onglets = navigation.getParent()
    const pileHome = onglets?.getState()?.routes?.find((route: any) => route.name === 'home')?.state
    if (pileHome?.key && (pileHome.index ?? 0) > 0) {
        onglets.dispatch({ type: 'POP_TO_TOP', target: pileHome.key })
    }
    rechercheAmiEvents.chercher(pseudo)
    onglets?.navigate('home')
}
