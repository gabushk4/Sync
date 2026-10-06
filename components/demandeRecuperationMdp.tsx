// User story 14 : formulaire de demande de réinitialisation de mot de passe, affiché dans
// le modal app/(auth)/mdpOublie.tsx. Calqué sur components/demandeConfirmerCourriel.tsx,
// mais avec un champ courriel saisi par l'utilisateur (déconnecté, aucun `membre` connu).
// Appelle POST /recuperation/demande ; la suite du flux (choix du nouveau mot de passe) se
// passe hors de l'app, sur la page web servie par src/views/reinitialisation_mdp.ejs côté API.
import ToastAbs from '@/abstractions/toastAbs'
import Spinner from '@/components/spinner'
import TextInputAbs from '@/abstractions/textInputAbs'
import { toastTypes } from '@/constants/toastConfig'
import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import { modalEvents } from '@/events/modalEvents'
import catcher from '@/functions/catcher'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function DemandeRecuperationMdp() {
    const { t } = useTranslation('auth')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { api } = useAPI()

    const [courriel, setCourriel] = useState('')
    const [envoye, setEnvoye] = useState(false)
    const [enChargement, setEnChargement] = useState(false)

    const envoyerDemande = async () => {
        if (!courriel.trim()) return
        setEnChargement(true)
        try {
            await api.post('/recuperation/demande', { courriel: courriel.trim() })
            setEnvoye(true)
            ToastAbs.show({
                type: toastTypes.success,
                text2: t('resetPassword.sentMessage')
            })
        } catch (error) {
            catcher(error, t('errors.resetFailed'))
        } finally {
            setEnChargement(false)
        }
    }

    const s = StyleSheet.create({
        text: {
            fontSize: 16,
            fontFamily: fonts.body,
            color: colors.text,
            textAlign: 'justify'
        },
        bouton: {
            width: '100%',
            height: 56,
            borderWidth: 1,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: colors.border,
            backgroundColor: colors.secondary,
        },
    })

    if (envoye) {
        return (
            <View style={{ height: '100%', width: '100%', alignItems: 'center', gap: 16 }}>
                <Text style={[s.text, { fontFamily: fonts.title, fontSize: 20 }]}>
                    {t('resetPassword.sentTitle')}
                </Text>
                <Text style={s.text}>
                    {t('resetPassword.sentMessage')}
                </Text>
                <View style={{ width: '100%', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                        style={[s.bouton, { opacity: enChargement ? 0.6 : 1 }]}
                        disabled={enChargement}
                        onPress={() => envoyerDemande()}
                    >
                        {/* User story 12: spinner while the request is sent. */}
                        {enChargement
                            ? <Spinner size={22} accessibilityLabel={t('common:loading')} />
                            : <Text style={s.text}>
                                {t('resetPassword.resend')}
                            </Text>
                        }
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    return (
        <View style={{ height: '100%', width: '100%', alignItems: 'center', gap: 16 }}>
            <Text style={[s.text, { fontFamily: fonts.title, fontSize: 20 }]}>
                {t('resetPassword.title')}
            </Text>
            <Text style={s.text}>
                {t('resetPassword.subtitle')}
            </Text>
            <TextInputAbs
                placeholder={t('resetPassword.emailPlaceholder')}
                value={courriel}
                onChangeText={setCourriel}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
            />
            <View style={{ width: '100%', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                    style={[s.bouton, { opacity: (enChargement || !courriel.trim()) ? 0.6 : 1 }]}
                    disabled={enChargement || !courriel.trim()}
                    onPress={() => envoyerDemande()}
                >
                    {/* User story 12: spinner while the request is sent. */}
                    {enChargement
                        ? <Spinner size={22} accessibilityLabel={t('common:loading')} />
                        : <Text style={s.text}>
                            {t('resetPassword.submit')}
                        </Text>
                    }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => modalEvents.emitClosing()}>
                    <Text style={s.text}>
                        {t('resetPassword.cancel')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}
