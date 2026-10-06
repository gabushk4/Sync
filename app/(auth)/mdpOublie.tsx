// User story 14 : modal "mot de passe oublié", ouvert depuis app/(auth)/login.tsx.
// Suit le pattern des autres modals de l'app (route expo-router + ModalBase), pas le
// modalManager.js/modalMdpOublie référencé ailleurs mais jamais implémenté (code mort/cassé).
import ModalBase from "@/components/modalBase"
import DemandeRecuperationMdp from "@/components/demandeRecuperationMdp"

export default function MdpOublie() {
    return (
        <ModalBase>
            <DemandeRecuperationMdp />
        </ModalBase>
    )
}
