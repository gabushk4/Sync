import React from "react";
import {View, Text, StyleSheet, Animated, Image, useColorScheme} from 'react-native';
import { usePalette } from "@/contextes/contextePalette";
import { useFont } from "@/contextes/contexteFont";
import Haptics from "@/abstractions/haptics";

export default function ToastErreur({text1, text2, ...rest}){
    const { colors } = usePalette();
    const { fonts } = useFont();
    const colorScheme = useColorScheme()

    const icones = {
        erreur:require('../assets/icones/icon-erreur.png'),
        shake: colorScheme === 'dark'?require('../assets/icones/secouer-dark-icon.png'):require('../assets/icones/secouer-light-icon.png')
    }

    Haptics.erreur()

    return(
        <View style={{height:96, width:'90%', marginTop:16, backgroundColor:colors.card, borderColor:colors.error, borderWidth:1, borderRadius:16, overflow:'hidden'}}>
            <View style={{flexDirection:'row', height:'80%', width:'100%', }}>
                <View style={{width:'20%', height:'100%', justifyContent:'center', alignItems:'center'}}>
                    <Image
                        source={icones.erreur}
                        style={{height:'75%', width:'75%'}} 
                        resizeMode="contain"
                    />
                </View>
                <View style={{flexDirection:'column', alignItems:'flex-start', width:'80%', height:'100%', padding:4}}>
                    <Text style={{color:colors.error, fontFamily:fonts.title, fontSize:20,}}>{text1?text1:'erreur'}</Text>
                    <Text style={{color:colors.text, fontFamily: fonts.body, fontSize:16,}}>{text2?text2:'une erreur sans message est survenue'}</Text>
                </View>                
            </View>
            <View style={{height:'20%', width:'100%', backgroundColor:  colors.primary, alignItems:'center', flexDirection:'row', justifyContent:'center'}}>
                <Image
                    source={icones.shake}
                    style={{height:'90%', width:24}}
                    resizeMode="contain"
                />
                <Text style={{color:colors.muted, fontFamily:fonts.body, fontSize:14}}>pour signaler un bug!</Text>
            </View>
        </View>
    )
}