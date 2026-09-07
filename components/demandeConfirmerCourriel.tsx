
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native'
import { usePalette } from '@/contextes/contextePalette'
import { useMembre } from '@/contextes/contexteMembre'
import { useAPI } from '@/contextes/contexteAPI'
import { useAccessToken } from '@/contextes/contexteToken'
import catcher from '@/functions/catcher'
import Toast from 'react-native-toast-message'
import { useFont } from '@/contextes/contexteFont'
import log from '@/functions/log'
import ToastAbs from '@/abstractions/toastAbs'
import { toastTypes } from '@/constants/toastConfig'

type Props = {
    intro: string;
}

export default function DemandeConfirmerCourriel({intro} : Props){
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()
    
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
                    text2: 'courriel envoyé'
                })
        } catch (error) {
            catcher(error, "erreur à l'envoie")
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
            <Text style={[s.text, {fontFamily:fonts.title, fontSize:20, marginBottom:8}]}>Confirmes ton courriel</Text>
            <Text style={[s.text, {fontSize:18}]}>
                {intro}, je dois être sûr que t'existes...
            </Text>    
            <Text style={s.text}>
                regardes dans tes courriels pour une demande de confirmation (c'est vraiment juste cliquer sur un bouton)
            </Text>
            <Text style={[s.text, { fontSize: 20, textAlign:'center' }]}>Email enregistré: {'\n'} { membre.email }</Text>
            <View style={{width:'100%', justifyContent:'center', alignItems:'center', gap:8}}>
                <Text style={[s.text,{fontFamily:fonts.body, color:colors.text}]}>rien reçu? cliques ici pour te renvoyer un courriel </Text>
                <TouchableOpacity
                    style={{paddingHorizontal:8, width:'100%', height:56, borderWidth:1, borderRadius:12, alignItems:'center', justifyContent:'center', borderColor:colors.border, backgroundColor:colors.secondary}}
                    onPress={()=>{envoyerCourriel()}}
                >
                    <Text style={s.text}>
                        renvoyer un courriel
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )

}

