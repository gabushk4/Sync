import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import TextInputAbs from '@/abstractions/textInputAbs'
import ToastAbs from '@/abstractions/toastAbs'
import Spinner from '@/components/spinner'
import { toastTypes } from '@/constants/toastConfig'
import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import { modalEvents } from '@/events/modalEvents'

/** Loose e-mail check, only to avoid sending an obviously wrong address. */
const COURRIEL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Content of the "forgot password" sheet (route (auth)/mdpOublie, inside
 * ModalBase): asks for the account's e-mail and calls POST /recuperation/demande,
 * which e-mails a reset link (valid 1h) opening the API's page to choose a new
 * password (user story 14). The sheet is closed like any ModalBase (tap outside,
 * swipe down) or once the e-mail is sent.
 * Errors are shown in the sheet itself: the app's toasts would render under it.
 *
 * @author Philip — rectification for a more conventional display:
 *   the login screen's "forgot password" button now works, shown in ModalBase
 * @returns {JSX.Element}
 */
export default function MotDePasseOublie() {
    const { t } = useTranslation('auth')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { api } = useAPI()

    const [courriel, setCourriel] = useState('')
    const [enCours, setEnCours] = useState(false)
    const [erreur, setErreur] = useState<string | null>(null)

    const courrielValide = COURRIEL_VALIDE.test(courriel.trim())

    /**
     * Asks the API to e-mail a reset link; on success, closes the sheet (ModalBase's
     * closing animation, then the route is dismissed) and confirms with a toast, else shows the API's reason (e.g. unknown e-mail).
     *
     * @author Philip — rectification
     * @returns {Promise<void>}
     */
    const envoyer = async () => {
        if (!courrielValide || enCours) return
        setEnCours(true)
        setErreur(null)
        try {
            const reponse = await api.post('/recuperation/demande', { courriel: courriel.trim() })
            setEnCours(false)
            modalEvents.emitClosing()
            ToastAbs.show({ type: toastTypes.success, text2: reponse.data?.message ?? t('forgot.sent') })
        } catch (error: any) {
            setErreur(error?.response?.data?.message ?? t('forgot.failed'))
            setEnCours(false)
        }
    }

    const s = StyleSheet.create({
        contenu: {
            paddingHorizontal: 4,
            paddingTop: 8,
            gap: 14,
        },
        titre: { color: colors.text, fontFamily: fonts.title, fontSize: 20 },
        texte: { color: colors.muted, fontFamily: fonts.body, fontSize: 15 },
        erreur: { color: colors.error, fontFamily: fonts.body, fontSize: 14 },
        bouton: {
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
        <View style={s.contenu}>
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
    )
}
