import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useState } from "react";
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Text, TouchableOpacity, useColorScheme, View, } from 'react-native';

import catcher from "@/functions/catcher";
import { convertirTimestampDateLongue } from "@/functions/convertirTimestamp";
import { convertUTCToLocal } from "@/functions/convertirUTCenLocal";
import log from "@/functions/log";

import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { useInvites } from "@/contextes/contexteInvites";
import { usePalette } from "@/contextes/contextePalette";

import ModalBase from "@/components/modalBase";

import { modalEvents } from "@/events/modalEvents";
import { useFriendList } from "@/hooks/useFriendList";

import { Participant } from "@/types/invites";


type Friend = {
    temps_amitie: string,
    id_publique: string,
    pseudo: string,
    fp_url: string
}

export default function ListeAmis(){
    const { t } = useTranslation('friends')
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
            
            let amisResponse: Friend[] = Array.isArray(response.data) ? response.data : []

            // L'API /amis peut renvoyer id_publique vide; /evenements/amis expose le même
            // identifiant sous `id`. On s'en sert en repli pour garder la sélection utilisable.
            if (amisResponse.some((ami: any) => !(ami.id_publique ?? ami.ami_id_publique ?? ami.id))) {
                const fallback = await api.get('/evenements/amis', {
                    params: { force_refresh: true, limiteAmi: 100 },
                })
                const amisAvecId = Array.isArray(fallback.data?.resultat) ? fallback.data.resultat : []
                const parPseudo = new Map(amisAvecId.map((ami: any) => [ami.pseudo, ami]))
                amisResponse = amisResponse.map((ami: any) => {
                    const amiAvecId = parPseudo.get(ami.pseudo) as any
                    return {
                        ...ami,
                        id_publique: ami.id_publique ?? ami.ami_id_publique ?? ami.id ?? amiAvecId?.id,
                    }
                })
            }

            const data = amisResponse.filter((ami: any) => ami.id_publique ?? ami.ami_id_publique ?? ami.id).map((ami: Friend)=>{
                const amitie = convertUTCToLocal(ami.temps_amitie )
                return{
                    ...ami,
                    id:ami.id_publique ?? (ami as any).ami_id_publique ?? (ami as any).id,
                    temps_amitie:amitie
                }
            })

            setAmis(data)
        } catch (error) {
            catcher(error, t('errors.loadFailed'))
        }
    }

    const deleteAmi = async (idPublique: string)=>{
        try {
            const response = await api.delete(`/amis/${idPublique}`)
            const amisC = [...amis]
            const nouvAmis = amisC.filter(a=>a.id != idPublique)
            setAmis([...nouvAmis])
        } catch (error) {
            catcher(error, t('errors.deleteFailed'))
        }
    }

    const onPressSelect = useFriendList('select')
    const onPressConsult = useFriendList('consult')

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
                        <Text style={{color:colors.text, fontFamily:fonts.body, fontSize:20}}>{t('list.title')}</Text>
                    </View>
                    {select &&
                        <TouchableOpacity style={{position:'absolute', right:16,}} 
                            onPress={()=>{
                                log('inviter', amisSelec)
                                onPressSelect(amisSelec, typeof inviterUrl === 'string' ? inviterUrl : undefined)
                                modalEvents.emitClosing()
                            }}>
                            <Text style={{color:colors.text, fontFamily:fonts.body, fontSize:16}}>{t('list.invite')}</Text>
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
                                        onPressConsult(item)
                                }}>
                                    <View style={{ width:'20%', height:64, alignItems:'center', justifyContent:'center', alignSelf:'center'}}>
                                        <Image
                                            source={item.fp_url?{uri:`${api.defaults.baseURL}/${item.fp_url.replace(/^\//, '')}`}:icones.profilDef}
                                            style={{width:'100%', height:'100%', borderRadius:200, overflow:'hidden',}}
                                            
                                        />
                                    </View>
                                    <View style={{width:'60%', justifyContent:'center'}}>
                                        <Text style={{fontFamily:fonts.body, color:colors.text, fontSize:16}}>{item.pseudo}</Text>
                                        <Text style={{fontFamily:fonts.body, color:colors.muted, fontSize:14}}>{t('list.friendSince', { date: dateAmitie.substring(dateAmitie.indexOf('.')+2) })}</Text>
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
                            {t('list.emptyState')}
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
