import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import TextInputAbs from '@/abstractions/textInputAbs'
import ToastAbs from '@/abstractions/toastAbs'
import Spinner from '@/components/spinner'
import { toastTypes } from '@/constants/toastConfig'
import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'

type Props = {
    visible: boolean
    onFermer: () => void
}

/** Loose e-mail check, only to avoid sending an obviously wrong address. */
const COURRIEL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * "Forgot password" window of the login screen: asks for the account's e-mail
 * and calls POST /recuperation/demande, which e-mails a reset link (valid 1h)
 * opening the API's page to choose a new password (user story 14). The button
 * only wrote a debug log before. A React Native Modal (not a (modals) route):
 * those routes are only reachable when signed in.
 * Errors are shown in the window itself: the app's toasts would render under it.
 *
 * @author Philip Kvaratshelya — rectification for a more conventional display:
 *   the login screen's "forgot password" button now works
 * @param {Props} props
 * @param {boolean} props.visible
 * @param {() => void} props.onFermer - Closes the window.
 * @returns {JSX.Element}
 */
export default function MotDePasseOublie({ visible, onFermer }: Props) {
    const { t } = useTranslation('auth')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { api } = useAPI()

    const [courriel, setCourriel] = useState('')
    const [enCours, setEnCours] = useState(false)
    const [erreur, setErreur] = useState<string | null>(null)

    const courrielValide = COURRIEL_VALIDE.test(courriel.trim())

    /**
     * Closes the window and resets it.
     *
     * @author Philip Kvaratshelya — rectification
     * @returns {void}
     */
    const fermer = () => {
        if (enCours) return
        setCourriel('')
        setErreur(null)
        onFermer()
    }

    /**
     * Asks the API to e-mail a reset link; on success, closes the window and
     * confirms with a toast, else shows the API's reason (e.g. unknown e-mail).
     *
     * @author Philip Kvaratshelya — rectification
     * @returns {Promise<void>}
     */
    const envoyer = async () => {
        if (!courrielValide || enCours) return
        setEnCours(true)
        setErreur(null)
        try {
            const reponse = await api.post('/recuperation/demande', { courriel: courriel.trim() })
            setEnCours(false)
            fermer()
            ToastAbs.show({ type: toastTypes.success, text2: reponse.data?.message ?? t('forgot.sent') })
        } catch (error: any) {
            setErreur(error?.response?.data?.message ?? t('forgot.failed'))
            setEnCours(false)
        }
    }

    const s = StyleSheet.create({
        fond: {
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        carte: {
            backgroundColor: colors.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
            gap: 14,
        },
        titre: { color: colors.text, fontFamily: fonts.title, fontSize: 20 },
        texte: { color: colors.muted, fontFamily: fonts.body, fontSize: 15 },
        erreur: { color: colors.error, fontFamily: fonts.body, fontSize: 14 },
        boutons: { flexDirection: 'row', gap: 10 },
        bouton: {
            flex: 1,
            height: 46,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        texteBouton: { color: colors.text, fontFamily: fonts.title, fontSize: 16 },
    })

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={fermer} statusBarTranslucent>
            {/* Tapping outside the card closes it. */}
            <Pressable style={s.fond} onPress={fermer}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Pressable style={s.carte} onPress={() => {}}>
                        <Text style={s.titre}>{t('forgot.title')}</Text>
                        <Text style={s.texte}>{t('forgot.explanation')}</Text>
                        <TextInputAbs
                            placeholder={t('forgot.emailPlaceholder')}
                            value={courriel}
                            onChangeText={(texte: string) => { setCourriel(texte); setErreur(null) }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            returnKeyType="send"
                            onSubmitEditing={envoyer}
                            readOnly={enCours}
                        />
                        {!!erreur && <Text style={s.erreur}>{erreur}</Text>}
                        <View style={s.boutons}>
                            <TouchableOpacity style={s.bouton} onPress={fermer} disabled={enCours}>
                                <Text style={s.texteBouton}>{t('login.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.bouton, { backgroundColor: courrielValide ? colors.secondary : 'transparent' }]}
                                onPress={envoyer}
                                disabled={!courrielValide || enCours}
                            >
                                {enCours
                                    ? <Spinner size={20} color={colors.text} accessibilityLabel={t('common:loading')} />
                                    : <Text style={[s.texteBouton, !courrielValide && { color: colors.muted }]}>{t('forgot.send')}</Text>}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </KeyboardAvoidingView>
            </Pressable>
        </Modal>
    )
}
