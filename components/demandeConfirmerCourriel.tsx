
import ToastAbs from '@/abstractions/toastAbs'
import Spinner from '@/components/spinner'
import { toastTypes } from '@/constants/toastConfig'
import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { useMembre } from '@/contextes/contexteMembre'
import { usePalette } from '@/contextes/contextePalette'
import { useAccessToken } from '@/contextes/contexteToken'
import catcher from '@/functions/catcher'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

type Props = {
    intro: string;
}

export default function DemandeConfirmerCourriel({intro} : Props){
    const { t } = useTranslation('friends')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()
    
    const {api} = useAPI()
    const {membre} = useMembre()
    const {getToken} = useAccessToken()

    // User story 12: true while the email is being sent (spinner in the button).
    const [envoiEnCours, setEnvoiEnCours] = useState(false)

    /**
     * Asks the API to send the confirmation email again
     * (POST /confirmation/envoyer_email). Ignored while a request is already in flight.
     *
     * @returns {Promise<void>}
     */
    const envoyerCourriel = async ()=>{
        if (envoiEnCours) return
        setEnvoiEnCours(true)
        try {
            const token = await getToken()
            const reponse = await api.post("/confirmation/envoyer_email", 
                {
                    pseudo:membre.pseudo?.trim()
                }, {
                headers:{
                    'Authorization':`Bearer ${token}`
                }
            })
            if(reponse.status == 200)
                ToastAbs.show({
                    type: toastTypes.success,
                    text2: t('emailConfirmation.sent')
                })
        } catch (error) {
            catcher(error, t('errors.emailFailed'))
        } finally {
            setEnvoiEnCours(false)
        }
    }

    const s = StyleSheet.create({
        text: {
            fontSize: 16,
            fontFamily: fonts.body,
            color: colors.text,
            textAlign: 'justify'
        }
    })

    return(
        <View style={{ height: '100%', width: '100%', alignItems: 'center', gap: 16 }}>
            <Text style={[s.text, {fontFamily:fonts.title, fontSize:20, marginBottom:8}]}>{t('emailConfirmation.title')}</Text>
            <Text style={[s.text, {fontSize:18}]}>
                {intro}, {t('emailConfirmation.existenceMessage')}
            </Text>    
            <Text style={s.text}>
                {t('emailConfirmation.checkInbox')}
            </Text>
            <Text style={[s.text, { fontSize: 20, textAlign:'center' }]}>{t('emailConfirmation.emailRegistered')}{'\n'} { membre.email }</Text>
            <View style={{width:'100%', justifyContent:'center', alignItems:'center', gap:8}}>
                <Text style={[s.text,{fontFamily:fonts.body, color:colors.text}]}>{t('emailConfirmation.notReceived')}</Text>
                <TouchableOpacity
                    style={{paddingHorizontal:8, width:'100%', height:56, borderWidth:1, borderRadius:12, alignItems:'center', justifyContent:'center', borderColor:colors.border, backgroundColor:colors.secondary}}
                    onPress={()=>{envoyerCourriel()}}
                    disabled={envoiEnCours}
                >
                    {/* User story 12: spinner while the email is being sent. */}
                    {envoiEnCours
                        ? <Spinner size={22} accessibilityLabel={t('common:loading')} />
                        : <Text style={s.text}>
                            {t('emailConfirmation.resend')}
                        </Text>
                    }
                </TouchableOpacity>
            </View>
        </View>
    )

}

