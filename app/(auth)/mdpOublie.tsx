import ModalBase from '@/components/modalBase'
import MotDePasseOublie from '@/components/motDePasseOublie'

/**
 * "Forgot password" sheet of the login screen, in ModalBase. A route of (auth),
 * not of (modals): those are only reachable when signed in.
 *
 * @author Philip — rectification for a more conventional display
 * @returns {JSX.Element}
 */
export default function MdpOublieModal() {
    return (
        <ModalBase>
            <MotDePasseOublie />
        </ModalBase>
    )
}
