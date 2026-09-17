import { useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import ModalBase from '@/components/modalBase'
import { useAuth } from '@/contextes/contexteAuth'
import { useFont } from '@/contextes/contexteFont'
import { useMembre } from '@/contextes/contexteMembre'
import { usePalette } from '@/contextes/contextePalette'
import Ionicons from "@react-native-vector-icons/ionicons"



type ConfirmAction = 'signOut' | 'deleteAccount' | 'exportData'

export default function Confirm() {
    const { action: rawAction } = useLocalSearchParams<{ action?: string }>()
    const action = (Array.isArray(rawAction) ? rawAction[0] : rawAction) as ConfirmAction | undefined
    const { t } = useTranslation()
    const { t: tSettings } = useTranslation('settings')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { signOut } = useAuth()

    const {membre} = useMembre()

    const actionConfig = {
        signOut: {
            title: t('common:signOut.title'),
            confirmation: t('common:signOut.confirmation'),
            confirm: t('common:signOut.confirm'),
            icon: 'log-out' as const,
            callback: signOut,
        },
        deleteAccount: {
            title: tSettings('deleteAccount'),
            confirmation: t('common:deleteAccount.explanation'),
            confirm: t('common:deleteAccount.confirm'),
            icon: 'trash' as const,
            callback: async () => {
                
            },
        },
        exportData: {
            title: tSettings('exportData'),
            confirmation: t('common:exportData.explanation', {email: membre.email}),
            confirm: t('common:exportData.confirm'),
            icon: 'download' as const,
            callback: undefined,
        },
    } satisfies Record<ConfirmAction, {
        title: string
        confirmation: string
        confirm: string
        icon: 'log-out' | 'trash' | 'download'
        callback?: () => void | Promise<void>
    }>

    const selectedAction = action ? actionConfig[action] : undefined

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
            textAlign: 'justify',            
        },
        btnContainer: {
            marginTop: 'auto',
            paddingBottom: 104,
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            gap: 8,
            width: '100%',
            alignSelf: 'flex-end',
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
                <Text style={s.title}>{selectedAction?.title}</Text>
                <Text style={[s.text, {marginVertical:32}]}>{selectedAction?.confirmation}</Text>
                <View style={s.btnContainer}>
                    <TouchableOpacity style={[s.btn, {}]}
                        disabled={!selectedAction?.callback}
                        onPress={selectedAction?.callback}
                    >
                        <Text style={s.text}>{selectedAction?.confirm}</Text>
                        <Ionicons name={selectedAction?.icon ?? 'help-circle'} color={colors.error} size={20}/>
                    </TouchableOpacity>
                </View>
            </View>
        </ModalBase>
    )
}