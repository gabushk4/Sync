import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet, useColorScheme } from 'react-native'
import Toast from 'react-native-toast-message';

import TextInputAbs from '@/abstractions/textInputAbs'

import { useAccessToken } from '@/contextes/contexteToken';
import { useAPI } from '@/contextes/contexteAPI';

import log from '@/functions/log';
import catcher from '@/functions/catcher';
import { usePalette } from '@/contextes/contextePalette';
import { useFont } from '@/contextes/contexteFont';
import { router } from 'expo-router';
import ToastAbs from '@/abstractions/toastAbs';
import { toastTypes } from '@/constants/toastConfig';

export default function AddFriendForm() {
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
                    text1: 'demande d\'ami envoyée',
                    text2: 'je sens que c\'est le début d\'un lien unique, presque magique!',
                    autoHide: true,
                });
            }
        } catch (error: any) {
            log('la demande na pas passée', error?.message);
            catcher(error, `la demande n'a pas passée`);
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
                <Text style={s.label}>Code d'ami</Text>
                <TextInputAbs
                    placeholder="Mxxx1234"
                    value={codeAmi}
                    onChangeText={setCodeAmi}
                    returnKeyType="send"
                    onSubmitEditing={postDemande}
                />
            </View>

            <View style={{ width: '100%', gap: 6 }}>
                <Text style={s.label}>Scanner un code qr</Text>
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