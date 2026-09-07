import React, { useCallback, useState } from "react";
import {View, FlatList, TouchableOpacity, Image, Text, useColorScheme, } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "expo-router/react-navigation";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";

import catcher from "@/functions/catcher";
import log from "@/functions/log";
import { convertirTimestampDateLongue } from "@/functions/convertirTimestamp";
import { convertirUTCversLocale } from "@/functions/convertirUTCenLocal";

import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { useInvites } from "@/contextes/contexteInvites";
import { useAccessToken } from "@/contextes/contexteToken";
import { usePalette } from "@/contextes/contextePalette";

import ModalBase from "@/components/modalBase";

import { FriendListType, useFriendList } from "@/hooks/useFriendList";
import { modalEvents } from "@/events/modalEvents";

import { Participant } from "@/types/invites";


type Friend = {
    temps_amitie: string,
    id_publique: string,
    pseudo: string,
    pfp_url: string
}

export default function ListeAmis(){
    const {api} = useAPI()
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()
    
    const { invites } = useInvites()  
    
    const { type, inviterUrl } = useLocalSearchParams()
    const select = type === 'select'
    log("friend list type", type)

    const icones = {
        profilDef:colorScheme === 'dark'?require('@/assets/icones/profil-dark-icon.png'):require('@/assets/icones/profil-light-icon.png'),
        ajouterAmi:colorScheme === 'dark'?require('@/assets/icones/ajouter-ami-dark-icon.png'):require('@/assets/icones/ajouter-ami-dark-icon.png'),
        supprimerAmi:colorScheme === 'dark'?require('@/assets/icones/corbeille-dark-icon.png'):require('@/assets/icones/corbeille-light-icon.png')
    }

    const [amis, setAmis] = useState<Array<Participant>>([])
    const [amisSelec, setAmisSelec] = useState<Array<Participant>>([])

    const getAmis = async ()=>{
        try {
            const response = await api.get('/amis')
            
            const data = response.data.map((ami: Friend)=>{
                const amitie = convertirUTCversLocale(ami.temps_amitie )
                return{
                    id:ami.id_publique,
                    ...ami,
                    temps_amitie:amitie
                }
            })

            setAmis(data)
        } catch (error) {
            catcher(error, 'erreur survenue en obtenant les amis')
        }
    }

    const deleteAmi = async (idPublique: string)=>{
        try {
            const response = await api.delete(`/amis/${idPublique}`)
            const amisC = [...amis]
            const nouvAmis = amisC.filter(a=>a.id != idPublique)
            setAmis([...nouvAmis])
        } catch (error) {
            catcher(error, 'supression impossible')
        }
    }

    const onPress = useFriendList(type as FriendListType)

    useFocusEffect(useCallback(()=>{
        getAmis()
        if(select && invites.length > 0){
            setAmisSelec([...invites])
        }
    },[]))

    return (
        <ModalBase>
            <View style={{height:'100%', width:'100%'}}>
                <View style={{flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                    <View style={{width:'100%', alignItems:'center'}}>
                        <Text style={{color:colors.text, fontFamily:fonts.body, fontSize:20}}>Amis</Text>
                    </View>
                    {select &&
                        <TouchableOpacity style={{position:'absolute', right:16,}} 
                            onPress={()=>{
                                if(onPress){
                                    log('inviter', amisSelec)
                                    onPress(amisSelec, inviterUrl ?? undefined)
                                    modalEvents.emitClosing()
                                }
                            }}>
                            <Text style={{color:colors.text, fontFamily:fonts.body, fontSize:16}}>inviter</Text>
                        </TouchableOpacity>
                    }
                </View>
                <LinearGradient
                    style={{position:'absolute', opacity:0.3, zIndex:2, top:22, left:0, width:'100%', height:24}}
                    start={{x:0, y:0.2}}
                    end={{x:0, y:1}}
                    colors={[colors.primary, 'transparent']}
                />
                {amis.length > 0 && <FlatList
                    data={amis}
                    contentContainerStyle={{alignItems:'center', paddingTop:16, paddingBottom:16}}
                    renderItem={({item, index})=>{
                        const dateAmitie = convertirTimestampDateLongue(item.temps_amitie)
                        const selectionne = select && amisSelec.some((ami)=>ami.id === item.id)
                        return(
                        <View style={{width:'100%', height:80, borderTopWidth:index != 0?1:0, justifyContent:'center', borderColor:colors.border}}>
                            <TouchableOpacity style={{height:'90%', width:'100%', flexDirection:'row', justifyContent:'space-between', gap:8, borderRadius:16, backgroundColor:selectionne?colors.secondary:colors.primary, paddingHorizontal:8}}
                                onPress={()=>{
                                    if(select){
                                        if(amisSelec.some((a)=>a.id === item.id))
                                            setAmisSelec((prev)=>prev.filter((a)=>a.id != item.id))
                                        else
                                            setAmisSelec((prev)=>[...prev, item])
                                    }
                                    else if(type === 'consult')
                                        onPress?.(item)
                                }}>
                                    <View style={{ width:'20%', height:64, alignItems:'center', justifyContent:'center', alignSelf:'center'}}>
                                        <Image
                                            source={item.fp_url?{uri:item.fp_url}:icones.profilDef}
                                            style={{width:'100%', height:'100%', borderRadius:200, overflow:'hidden',}}
                                            
                                        />
                                    </View>
                                    <View style={{width:'60%', justifyContent:'center'}}>
                                        <Text style={{fontFamily:fonts.body, color:colors.text, fontSize:16}}>{item.pseudo}</Text>
                                        <Text style={{fontFamily:fonts.body, color:colors.muted, fontSize:14}}>ami depuis le {dateAmitie.substring(dateAmitie.indexOf('.')+2)}</Text>
                                    </View>
                                    <View style={{width:'15%', height:'100%', justifyContent:'center', alignItems:'center'}}>
                                    {!select && <TouchableOpacity style={{width:'88%', height:'72%', justifyContent:'center', alignItems:'center'}}
                                            onPress={()=>{
                                                log("supprimer ami:", item.pseudo, item.id)
                                            }}
                                        >
                                            <Image 
                                                style={{height:'60%', width:'60%'}}
                                                source={icones.supprimerAmi}
                                            />
                                        </TouchableOpacity>}
                                    </View>
                            </TouchableOpacity>                        
                        </View>)
                    }
                    }
                />}
                {amis.length < 1 &&
                    <View style={{height:'100%', width:'100%', justifyContent:'center', alignItems:'center', gap:8}}>
                        <Text style={{color:colors.text, fontFamily:fonts.title, fontSize:18}}>
                            ajoutes des amis grâce a l'option:
                        </Text>
                        <TouchableOpacity onPress={()=>{
                            router.push('/(modals)/ajouterAmi')
                        }}>
                            <Image
                                source={icones.ajouterAmi}
                                style={{height:64, width:64}}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>
                }
            </View>
        </ModalBase>
    )
}