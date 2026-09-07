import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

import ModalBase from '@/components/modalBase'
import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont'
import Ionicons from "@react-native-vector-icons/ionicons";
import { router } from 'expo-router'
import { useAuth } from '@/contextes/contexteAuth'



export default function ConfirmSignOut({ }) {
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { signOut } = useAuth()

    const s = StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            height: '100%',
            width: '100%',
        },
        title: {
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 18
        },
        text: {
            color: colors.text,
            fontFamily: fonts.body,
            fontSize: 18,
            
        },
        btnContainer: {
            position: 'relative',
            marginTop:'50%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            gap: 8,
            width: '100%',
            alignSelf:'flex-end'
        },
        btn: {
            height: 48,
            width:'90%',
            borderWidth: 1,
            borderRadius:8,
            borderColor: colors.error,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
            backgroundColor: colors.card,
            flexDirection: 'row',
            gap:8
        }
    })
    return (
        <ModalBase>
            <View style={s.container}>
                <Text style={s.title}>déconnexion</Text>
                <Text style={[s.text, {marginTop:32}]}>voulez-vous vraiment vous déconnecter?</Text>
                <View style={s.btnContainer}>
                    <TouchableOpacity style={[s.btn, {}]}
                        onPress={() => {
                            signOut()
                        }}
                    >
                        <Text style={s.text}>oui</Text>
                        <Ionicons name='log-out' color={colors.error} size={20}/>
                    </TouchableOpacity>
                </View>
            </View>
        </ModalBase>
    )
}