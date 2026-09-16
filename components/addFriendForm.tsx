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

export default function AddFriendForm() {
    const { t } = useTranslation('friends')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()

    const { getToken } = useAccessToken()
    const {api} = useAPI()

    const [codeAmi, setCodeAmi] = useState<string>("M");

    const postDemande = async () => {
        const token = await getToken();

        try {
            const response = await api.post(
                '/amis/demandes',
                { id_destinataire: codeAmi },
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
            }
        } catch (error: any) {
            log('la demande na pas passée', error?.message);
            catcher(error, t('errors.requestFailed'));
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
        
    })    

    return (
        <View style={{ height: '100%', width: '100%', alignItems:'center', justifyContent:'center', gap:'25%'}}>
            <View style={{ width: '100%', gap: 6 }}>
                <Text style={s.label}>{t('add.codeLabel')}</Text>
                <TextInputAbs
                    placeholder="Mxxx1234"
                    value={codeAmi}
                    onChangeText={setCodeAmi}
                    returnKeyType="send"
                    onSubmitEditing={postDemande}
                />
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