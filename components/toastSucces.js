import { useTranslation } from 'react-i18next';
import { Image, Text, View } from 'react-native';
import Haptics from "../abstractions/haptics";

import { useFont } from "@/contextes/contexteFont";
import { usePalette } from "@/contextes/contextePalette";

export default function ToastSucces({text1, text2, ...rest}){
    const { t } = useTranslation()
    const { colors } = usePalette()
    const { fonts } = useFont()
    Haptics.succes()

    return(
        <View style={{flexDirection:'row', height:80, width:'90%', marginTop:16, backgroundColor:colors.card, borderColor:colors.success, borderWidth:1, borderRadius:16 }}>
            <View style={{width:'20%', height:'100%', justifyContent:'center', alignItems:'center'}}>
                <Image
                    source={require('../assets/icones/icon-succes-checkmark.png')}
                    style={{height:'80%', width:'80%'}}
                    resizeMethod="contain"
                />
            </View>
            <View style={{alignItems:'flex-start', width:'80%', height:'100%', paddingVertical:8}}>
                <Text style={{color:colors.success, fontFamily:fonts.title, fontSize:20,}}>{text1?text1:t('common:toast.success')}</Text>
                <Text style={{color:colors.text, fontFamily: fonts.body, fontSize:16,}}>{text2}</Text>
            </View>
        </View>
    )
}