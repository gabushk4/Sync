import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import ToastAbs from '@/abstractions/toastAbs'
import ModalBase from '@/components/modalBase'
import { toastTypes } from '@/constants/toastConfig'
import { useAPI } from '@/contextes/contexteAPI'
import { useAuth } from '@/contextes/contexteAuth'
import { useFont } from '@/contextes/contexteFont'
import { useMembre } from '@/contextes/contexteMembre'
import { usePalette } from '@/contextes/contextePalette'
import { modalEvents } from '@/events/modalEvents'
import catcher from '@/functions/catcher'
import Ionicons, { IoniconsIconName } from "@react-native-vector-icons/ionicons"


type ConfirmActionConfig = {
    title: string,
    confirmation: string,
    confirm: string,
    icon: IoniconsIconName,
    callback?: () => void | Promise<void>
}

/**
 * Renders a dynamic confirm modal. Uses action passed from LocalSearchParams to display the right content. 
 * Action has to be of type ConfirmAction
 * @returns {JSX.Element}
 */
export default function Confirm() {
    const { action: rawAction } = useLocalSearchParams<{ action?: string }>()
    const { t } = useTranslation()
    const { t: tSettings } = useTranslation('settings')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { signOut } = useAuth()
    const {api} = useAPI()

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
            confirmation: t('common:deleteAccount.explanation', {email:membre.email}),
            confirm: t('common:deleteAccount.confirm'),
            icon: 'trash' as const,
            callback: async () => {
                try {
                    const res = await api.post("/membres/anonymise")

                    console.log(res.data)

                    if (res.status < 300) {
                        
                        ToastAbs.show({
                            type: toastTypes.success,
                            text1:'demande envoyée avec succès'
                        })
                    }    
                } catch (err) {
                    catcher(err, tSettings('deleteAccount'))
                }
            },
        },
        exportData: {
            title: tSettings('exportData'),
            confirmation: t('common:exportData.explanation', {email: membre.email}),
            confirm: t('common:exportData.confirm'),
            icon: 'download' as const,
            callback: async () => {
                try {
                    const res = await api.post("/membres/export")

                    if (res.status < 300) {
                        ToastAbs.show({
                            type: toastTypes.success,
                            text2: t('common:exportData.done')
                        })
                    }
                } catch (err) {
                    catcher(err, tSettings('exportData'))
                }
            },
        },
    } satisfies Record<string, ConfirmActionConfig>

    type ConfirmAction = keyof typeof actionConfig
    const action = (Array.isArray(rawAction) ? rawAction[0] : rawAction) as ConfirmAction | undefined

    const selectedAction = action ? actionConfig[action] : undefined

    const confirmerAction = async () => {
        /* Messing with the router at this point is unecessary because the root layout is auth based. 
         * If the user is unauthenticated, only the login or signin page are available.
            The router.dismiss() provoke an error where the stack cant be poped.
        
        if (action === 'signOut') {
            if (router.canDismiss()) {
                router.dismiss()
            }
            await selectedAction?.callback?.()
            return
        } */ 

        await selectedAction?.callback?.()
        modalEvents.emitClosing()
    }

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
                        onPress={confirmerAction}
                    >
                        <Text style={s.text}>{selectedAction?.confirm}</Text>
                        <Ionicons name={selectedAction?.icon ?? 'help-circle'} color={colors.error} size={20}/>
                    </TouchableOpacity>
                </View>
            </View>
        </ModalBase>
    )
}