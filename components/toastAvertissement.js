import React from "react";
import {View, Text, StyleSheet, Animated, Image, TouchableOpacity} from 'react-native';
import { usePalette } from "@/contextes/contextePalette";
import { useFont } from "@/contextes/contexteFont";
import Haptics from "@/abstractions/haptics";

export default function ToastAvertissement({text1, text2, props, ...rest}){
    const { colors } = usePalette();
    const { fonts } = useFont();
    const text3 = props.text3?props.text3:false

    Haptics.erreur()

    return(
        <TouchableOpacity onPress={()=>{
                rest.onPress()
                rest.hide()
            }} style={{minHeight:96, height:'auto', width:'90%', marginTop:16, backgroundColor:colors.card, borderColor:colors.warning, borderWidth:1, borderRadius:16 }}>
            <View style={{flexDirection:'row', height:'80%'}}>
                <View style={{width:'20%', height:'100%', justifyContent:'flex-end', alignItems:'center'}}>
                    <Image
                        source={require('../assets/icones/icon-avertissement.png')}
                        style={{height:'75%', width:'75%'}}
                        resizeMode="contain"
                    />
                </View>
                <View style={{flexDirection:'column', alignItems:'flex-start', width:'80%', height:'100%', paddingVertical:4}}>
                    <Text style={{color:colors.warning, fontFamily:fonts.title, fontSize:20, }}>{text1?text1:'avertissement'}</Text>
                    <Text style={{color:colors.text, fontFamily:fonts.body, fontSize:16}}>{text2?text2:'un avertissement sans message est survenue'}</Text>
                    
                </View>
            
            </View>
            {text3&&<Text style={{color:colors.muted, fontFamily:fonts.body, fontSize:12, alignSelf:'center', bottom:2}}>{text3}</Text>}
        </TouchableOpacity>
    )
}