import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import TextInputAbs from '@/abstractions/textInputAbs';

import { useAPI } from '@/contextes/contexteAPI';
import { useAccessToken } from '@/contextes/contexteToken';

import ToastAbs from '@/abstractions/toastAbs';
import { toastTypes } from '@/constants/toastConfig';
import { useFont } from '@/contextes/contexteFont';
import { usePalette } from '@/contextes/contextePalette';
import catcher from '@/functions/catcher';
import log from '@/functions/log';
import { router } from 'expo-router';

/**
 * Cleans up a typed or pasted friend code: profiles display it as "#Mxxxx"
 * (MemberCode), so a leading "#" and any whitespace are dropped.
 *
 * @param {string} code - Raw input.
 * @returns {string} The member's public id.
 */
const nettoyerCodeAmi = (code: string) => code.replace(/\s+/g, '').replace(/^#/, '')

/**
 * Add-a-friend form: send a friend request by typing/pasting a friend code,
 * or open the QR scanner.
 *
 * @returns {JSX.Element}
 */
export default function AddFriendForm() {
    const { t } = useTranslation('friends')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()

    const { getToken } = useAccessToken()
    const {api} = useAPI()

    // Starts empty: it used to be pre-filled with "M", so pasting a copied code
    // (which already starts with "M") sent "MM..." and the server answered
    // "Destinataire non trouvé".
    const [codeAmi, setCodeAmi] = useState<string>("");
    const [envoiEnCours, setEnvoiEnCours] = useState(false)

    /**
     * Sends a friend request to the member whose code was entered.
     *
     * @returns {Promise<void>}
     */
    const postDemande = async () => {
        const code = nettoyerCodeAmi(codeAmi)
        if (!code || envoiEnCours) return

        setEnvoiEnCours(true)
        const token = await getToken();

        try {
            const response = await api.post(
                '/amis/demandes',
                { id_destinataire: code },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 201) {
                ToastAbs.show({
                    type: toastTypes.success,
                    text1: t('common:friendRequestSentTitle'),
                    text2: t('common:friendRequestSentMessage'),
                    autoHide: true,
                });
                setCodeAmi('')
            }
        } catch (error: any) {
            log('la demande na pas passée', error?.message);
            catcher(error, t('errors.requestFailed'));
        } finally {
            setEnvoiEnCours(false)
        }
    };

    const s = StyleSheet.create({
        label: {
            color: colors.muted,
            fontSize: 20,
            fontFamily: fonts.body,
            width: 'auto',
        },
        
        qrButton: {
            height: 80,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.secondary,
            borderRadius: 12,
            padding: 4,
        },
        boutonEnvoyer: {
            height: 44,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.secondary,
            borderRadius: 8,
        },
        texteEnvoyer: {
            color: colors.text,
            fontFamily: fonts.body,
            fontSize: 18,
        },
    })

    return (
        <View style={{ height: '100%', width: '100%', alignItems:'center', justifyContent:'center', gap:'15%'}}>
            <View style={{ width: '100%', gap: 6 }}>
                <Text style={s.label}>{t('add.codeLabel')}</Text>
                <TextInputAbs
                    placeholder="Mxxx1234"
                    value={codeAmi}
                    onChangeText={setCodeAmi}
                    returnKeyType="send"
                    onSubmitEditing={postDemande}
                    autoCorrect={false}
                    autoCapitalize="none"
                />
                {/* Visible button: the keyboard's "send" key used to be the only way to submit. */}
                <TouchableOpacity
                    style={[s.boutonEnvoyer, { opacity: nettoyerCodeAmi(codeAmi) && !envoiEnCours ? 1 : 0.4 }]}
                    onPress={postDemande}
                    disabled={!nettoyerCodeAmi(codeAmi) || envoiEnCours}
                >
                    <Text style={s.texteEnvoyer}>{t('add.send')}</Text>
                </TouchableOpacity>
            </View>

            <View style={{ width: '100%', gap: 6 }}>
                <Text style={s.label}>{t('add.scanLabel')}</Text>
                <TouchableOpacity
                    style={s.qrButton}
                    onPress={() => {
                        router.push('/scanQR')
                        
                    }}
                >
                    <Image
                        source={
                            colorScheme === 'dark'
                                ? require('@/assets/icones/qrcode-dark-icon.png')
                                : require('@/assets/icones/qrcode-light-icon.png')
                        }
                        style={{ height: '100%' }}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            </View>
        </View>
    )
}