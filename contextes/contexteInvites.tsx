import ToastAbs from "@/abstractions/toastAbs";
import { useAPI } from "@/contextes/contexteAPI";
import catcher from "@/functions/catcher";
import log from "@/functions/log";
import { InviterUrl, Participant } from "@/types/invites";
import React, { createContext, useContext, useState } from 'react';

type InvitesContextValue = {
    invites: Participant[]
    ajouterInvite: (invite: Participant | Participant[], inviterUrl?: string) => Promise<void>
    supprimerInvite: (inviteSupp: Participant, supprimerUrl?: string | undefined) => Promise<boolean>
    resetInvites: () => void
}

export const InvitesContexte = createContext<InvitesContextValue | undefined>(undefined)

export const InvitesProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const { api } = useAPI()
    const [invites, setInvites] = useState<Participant[]>([])

    /** 
     * @param {array} invite 
     * @param {object} inviterUrl | {string:..., data:...}
     */
    const ajouterInvite = async (invite: Participant | Participant[], inviterUrl: InviterUrl = undefined) => {
        log('ajouter invite', invite, inviterUrl)

        const newInvitesArray: Participant[] = Array.isArray(invite) ? invite : [invite]

        if (newInvitesArray.some((item) => typeof item.id !== 'string' || item.id.trim() === '')) {
            log('invitation ignorée: identifiant public manquant')
            ToastAbs.show({
                type: 'persoErreur',
                text1: 'Invitation impossible',
                text2: 'Recharge la liste d’amis et réessaie.',
            })
            return
        }

        const invitations: Participant[] = newInvitesArray.map((inv) => ({
            id: inv.id,
            privilege: 'lecteur',
            pseudo: inv.pseudo,
            fp_url: inv.fp_url,
            statut: 'en_attente'
        }))

        let valid = true

        if (inviterUrl) {
            let text2: string[] = []
            newInvitesArray.forEach((inviteItem, i) => {
                if (i === 1) text2.push('et')
                else if (i > 1) text2.push(',')

                if (inviteItem.pseudo) text2.push(inviteItem.pseudo)
            })
            const text2Str = text2.join(' ')
            try {
                // inviterUrl peut être string ou objet
                const url = inviterUrl

                const response = await api.post(url, {participants: invitations})
                log('ajouterInvite res:', response.data)

                ToastAbs.show({
                    type: 'persoSucces',
                    text1: 'invitations envoyées',
                    text2: text2Str,
                })
            } catch (error) {
                log('erreur ajouterInvite', error)
                valid = false
                catcher(error, `impossible d'inviter ${text2Str}`)
            }
        }
        
        log('invitations', invitations, "valide", valid)

        if (valid) {
            let nouvInvites = [...invites, ...invitations]

            // dédupliquer par id
            nouvInvites = [...new Map(nouvInvites.map((i) => [i.id, i])).values()]

            //log('nouvInvites', nouvInvites)
            setInvites([...nouvInvites])
        }
    }

    /** Retire un participant côté API puis du contexte local si la suppression réussit. */
    const supprimerInvite = async (inviteSupp: Participant, supprimerUrl?: string): Promise<boolean> => {
        log('supprimer invite', inviteSupp)       

        let valid = true

        if (supprimerUrl) {
            log('invité a supprimer', inviteSupp)
            try {
                const response = await api.delete(`${supprimerUrl}/${inviteSupp.id}`)
                if(response.status == 200){
                    ToastAbs.show({
                        type: 'persoSucces',
                        text2: response.data?.message,
                    })
                }
            } catch (error) {
                valid = false
                catcher(error, 'impossible de supprimer le participants')
            }
        }

        if (valid) {
            setInvites((prev) => prev.filter((invite) => invite.id !== inviteSupp.id))
        }
        return valid
    }

    const resetInvites = ()=>{
        setInvites([])
    }

    return (    
        <InvitesContexte.Provider value={{invites, ajouterInvite, resetInvites, supprimerInvite}}>
            {children}
        </InvitesContexte.Provider>
    )   
}
/**
 * 
 * @returns {array} invites
 * @returns {function} ajouterInvite(array)
 * @returns {function} resetInvites
 * @returns {function} supprimerInvite(idPubliqueInvite)
 */
export const useInvites = (): InvitesContextValue => {
    const ctx = useContext(InvitesContexte)
    if (!ctx) throw new Error('useInvites must be used within an InvitesProvider')
    return ctx
}
