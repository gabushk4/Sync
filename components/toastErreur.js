import Haptics from "@/abstractions/haptics";
import { useFont } from "@/contextes/contexteFont";
import { usePalette } from "@/contextes/contextePalette";
import { useTranslation } from 'react-i18next';
import { Image, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';

export default function ToastErreur({text1, text2, ...rest}){
    const { t } = useTranslation()
    const { colors } = usePalette();
    const { fonts } = useFont();
    const colorScheme = useColorScheme()

    const icones = {
        erreur:require('../assets/icones/icon-erreur.png'),
        shake: colorScheme === 'dark'?require('../assets/icones/secouer-dark-icon.png'):require('../assets/icones/secouer-light-icon.png')
    }

    Haptics.erreur()

    return(
        // minHeight (was a fixed height): a longer message used to overflow the card.
        // Rectification (Philip) for a more conventional display.
        <View style={{minHeight:96, width:'90%', marginTop:16, backgroundColor:colors.card, borderColor:colors.error, borderWidth:1, borderRadius:16, overflow:'hidden'}}>
            <View style={{flexDirection:'row', minHeight:76, width:'100%', }}>
                <View style={{width:'20%', justifyContent:'center', alignItems:'center'}}>
                    <Image
                        source={icones.erreur}
                        style={{height:52, width:'75%'}} 
                        resizeMode="contain"
                    />
                </View>
                <View style={{flexDirection:'column', alignItems:'flex-start', justifyContent:'center', width:'80%', paddingVertical:8, paddingHorizontal:4}}>
                    <Text style={{color:colors.error, fontFamily:fonts.title, fontSize:20,}}>{text1?text1:t('common:toast.error')}</Text>
                    <Text style={{color:colors.text, fontFamily: fonts.body, fontSize:16,}}>{text2?text2:t('common:toast.errorWithoutMessage')}</Text>
                </View>                
            </View>
            <TouchableOpacity
                accessibilityRole="button"
                onPress={() => router.push('/(modals)/reportBug')}
                style={{height:20, width:'100%', backgroundColor: colors.primary, alignItems:'center', flexDirection:'row', justifyContent:'center'}}
            >
                <Image
                    source={icones.shake}
                    style={{height:18, width:24}}
                    resizeMode="contain"
                />
                <Text style={{color:colors.muted, fontFamily:fonts.body, fontSize:14}}>{t('common:toast.reportBug')}</Text>
            </TouchableOpacity>
        </View>
    )
}
