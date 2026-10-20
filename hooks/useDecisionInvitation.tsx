import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import ToastAbs from '@/abstractions/toastAbs'
import ConflitEvenement, { SortieConflit } from '@/components/conflitEvenement'
import { toastTypes } from '@/constants/toastConfig'
import { useAPI } from '@/contextes/contexteAPI'
import catcher from '@/functions/catcher'
import { conflitsDeLaReponse, EvenementEnConflit } from '@/types/conflit'
import { InvitationInfo } from '@/types/invitation'

type Options = {
    /** The invitation got an answer ('acceptee' | 'refusee'). */
    onRepondu?: (statut: 'acceptee' | 'refusee') => void
    /** "Adjust my schedule": show the invitation review screen. */
    onVoirHoraire: () => void
}

/**
 * Answers an event invitation, shared by the feed (notification buttons) and the
 * decision page (the invited event's details):
 * - `accepter`: accepts it; when it overlaps the member's schedule (API 409), the
 *   conflict screen (`conflit`, to render) offers to remove the conflicts and
 *   accept, or to see everyone's schedule that day (`onVoirHoraire`);
 * - `refuser`: refuses it.
 *
 * @author Philip — user story 8 (answering an invitation in conflict)
 * @param {InvitationInfo | null} invitation - Invitation to answer (null: nothing to do).
 * @param {Options} options
 * @returns {{ accepter: () => Promise<void>, refuser: () => Promise<void>,
 *   conflit: JSX.Element | null, enCours: false | 'acceptee' | 'refusee' }}
 */
export default function useDecisionInvitation(invitation: InvitationInfo | null, { onRepondu, onVoirHoraire }: Options) {
    const { t } = useTranslation('events')
    const { api } = useAPI()

    const [existants, setExistants] = useState<EvenementEnConflit[] | null>(null)
    // The answer being sent (spinner on its button, every button disabled), or false.
    const [enCours, setEnCours] = useState<false | 'acceptee' | 'refusee'>(false)

    const url = invitation ? `/evenements/invitations/${invitation.id}` : ''

    /**
     * Sends the answer. Accepting may answer 409 (the event overlaps the member's
     * schedule): the conflict screen then opens instead of an error.
     *
     * @author Philip — user story 8
     * @param {'acceptee' | 'refusee'} statut
     * @returns {Promise<void>}
     */
    const repondre = async (statut: 'acceptee' | 'refusee') => {
        if (!invitation || enCours) return
        setEnCours(statut)
        try {
            const reponse = await api.patch(url, { statut })
            ToastAbs.show({ type: toastTypes.success, text2: reponse.data?.message })
            onRepondu?.(statut)
        } catch (error: any) {
            if (statut === 'acceptee' && error.response?.status === 409) {
                setExistants(conflitsDeLaReponse(error.response.data))
            } else {
                catcher(error, t(statut === 'acceptee' ? 'conflict.acceptFailed' : 'invitationDecision.refuseFailed'))
            }
        } finally {
            setEnCours(false)
        }
    }

    /**
     * The conflict screen is left (see SortieConflit).
     *
     * @author Philip — user story 8 (answering an invitation)
     * @param {SortieConflit} sortie
     * @returns {void}
     */
    const quitterConflit = (sortie: SortieConflit) => {
        setExistants(null)
        if (sortie === 'accueil') onRepondu?.('acceptee')
        else if (sortie === 'retour') onVoirHoraire()
    }

    const conflit = invitation && existants ? (
        <ConflitEvenement
            mode="invitation"
            existants={existants}
            evenement={{ titre: invitation.titre_evenement, debut: invitation.debut, fin: invitation.fin }}
            confirmer={() => api.patch(url, { statut: 'acceptee' })}
            onSortie={quitterConflit}
        />
    ) : null

    return {
        accepter: () => repondre('acceptee'),
        refuser: () => repondre('refusee'),
        conflit,
        enCours,
    }
}
