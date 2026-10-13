
import ToastAbs from '@/abstractions/toastAbs'
import { toastTypes } from '@/constants/toastConfig'
import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { useMembre } from '@/contextes/contexteMembre'
import { usePalette } from '@/contextes/contextePalette'
import { useAccessToken } from '@/contextes/contexteToken'
import catcher from '@/functions/catcher'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
    intro: string;
}

export default function DemandeConfirmerCourriel({intro} : Props){
    const { t } = useTranslation('friends')
    const { colors } = usePalette()
    const { fonts } = useFont()
    
    const {api} = useAPI()
    const {membre} = useMembre()
    const {getToken} = useAccessToken()

    const envoyerCourriel = async ()=>{
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
                >
                    <Text style={s.text}>
                        {t('emailConfirmation.resend')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )

}

