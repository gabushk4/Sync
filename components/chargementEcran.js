import { useAuth } from "@/contextes/contexteAuth";
import { useFont } from "@/contextes/contexteFont";
import { usePalette } from "@/contextes/contextePalette";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, useColorScheme, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

export default function ChargementEcran({}){
    const { t } = useTranslation()
    const { colors } = usePalette() 
    const { fonts } = useFont()
    const colorScheme = useColorScheme()
    const {signOut} = useAuth()

    const icone = colorScheme === 'dark'?require('../assets/icones/sync-dark-icon.png'):require('../assets/icones/sync-light-icon.png')

    const topImage = useSharedValue(372)

    const [points, setPoints] = useState('')
    const [afficherMessage, setAfficherMessage] = useState(false)
    const [afficherRetour, setAfficherRetour] = useState(false)

    const imageAnime = useAnimatedStyle(()=>{
        return{
            top:topImage.value
        }
    })

    useEffect(()=>{
        topImage.value = withRepeat(withSequence(
            withTiming(-10, {duration:500, easing:Easing.inOut(Easing.quad)}),
            withTiming(0, {duration:500, easing:Easing.inOut(Easing.cubic)} ),
        ), -1,true)

        const interval = setInterval(()=>{
            setPoints((prev)=>prev.length<3?prev+'.':'')
        },500)
        const timeout = setTimeout(()=>{
            setAfficherMessage(true)
        }, 5000)
        const timeoutInscription = setTimeout(()=>{
            setAfficherRetour(true)
        }, 15000)
        return ()=>{
            clearInterval(interval)
            clearTimeout(timeout)
            clearTimeout(timeoutInscription)
        }
    },[])

    return(
        <View style={{flex:1, backgroundColor:colors.background, justifyContent:'center', alignItems:'center', gap:4}}>
            <Animated.Image
                source={icone}
                style={[imageAnime, {}]}
            />
            <Text style={{fontSize:16, fontFamily:fonts.body, color:colors.text}}>
                {t('common:loading')}{points}
            </Text>
            {afficherMessage &&
                <Text style={{fontSize:14, fontFamily:fonts.body, color:colors.muted, maxWidth:'60%', textAlign:'center'}}>
                    {t('common:serverWaking')}
                </Text>
            }
            {afficherRetour && 
                <View style={{position:'absolute', height:64, width:'60%', bottom:64, alignItems:"center", justifyContent:'center'}}>
                    <TouchableOpacity style={{height:"80%", width:'100%', justifyContent:'center', alignItems:'center', borderColor:colors.border,borderWidth:1, borderRadius:8, backgroundColor:colors.card, }}
                        onPress={() => {
                            signOut()
                            router.push('/(auth)/login')
                        }}
                    >
                        <Text style={{color:colors.text, fontFamily:fonts.body, fontSize:16}}>{t('common:returnToLogin')}</Text>
                    </TouchableOpacity>
                </View>
            }
        </View>
    )
}