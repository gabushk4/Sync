import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, SectionList, Text, TouchableOpacity, useColorScheme, View, } from 'react-native';

import catcher from "@/functions/catcher";
import { convertirTimestampDateLongue } from "@/functions/convertirTimestamp";
import { convertUTCToLocal } from "@/functions/convertirUTCenLocal";
import log from "@/functions/log";

import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { useInvites } from "@/contextes/contexteInvites";
import { usePalette } from "@/contextes/contextePalette";

import ModalBase from "@/components/modalBase";

import { friendsAvailabilityEvents } from "@/events/friendsAvailabilityEvents";
import { modalEvents } from "@/events/modalEvents";
import { useFriendList } from "@/hooks/useFriendList";

import { Participant } from "@/types/invites";


type Friend = {
    temps_amitie: string,
    id_publique: string,
    pseudo: string,
    pfp_url: string
}

export default function ListeAmis(){
    const { t } = useTranslation('friends')
    const {api} = useAPI()
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()
    
    const { invites } = useInvites()  
    
    const { type, inviterUrl, availableFriendIds: availableFriendIdsParam, hasMoreFriends: hasMoreFriendsParam } = useLocalSearchParams()
    const select = type === 'select'
    const availableFriendIds = useMemo(() => {
        const raw = Array.isArray(availableFriendIdsParam) ? availableFriendIdsParam[0] : availableFriendIdsParam
        
        if (!raw) return []
        try {
            const parsed: unknown = JSON.parse(raw)
            return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
        } catch {
            return []
        }
    }, [availableFriendIdsParam])
    const [currentAvailableFriendIds, setCurrentAvailableFriendIds] = useState(availableFriendIds)
    const [hasMoreFriends, setHasMoreFriends] = useState(
        (Array.isArray(hasMoreFriendsParam) ? hasMoreFriendsParam[0] : hasMoreFriendsParam) === 'true'
    )
    const [loadingMoreFriends, setLoadingMoreFriends] = useState(false)
    const allAvailableFriendIds = currentAvailableFriendIds
    //log("friend list type", type, "select", select)

    const icones = {
        profilDef:colorScheme === 'dark'?require('@/assets/icones/profil-dark-icon.png'):require('@/assets/icones/profil-light-icon.png'),
        ajouterAmi:colorScheme === 'dark'?require('@/assets/icones/ajouter-ami-dark-icon.png'):require('@/assets/icones/ajouter-ami-dark-icon.png'),
        supprimerAmi:colorScheme === 'dark'?require('@/assets/icones/corbeille-dark-icon.png'):require('@/assets/icones/corbeille-light-icon.png')
    }

    const [amis, setAmis] = useState<Participant[]>([])
    const [idsSelec, setIdsSelec] = useState(new Set())

    const getAmis = async ()=>{
        try {
            const response = await api.get('/amis')
            
            const data = response.data.map((ami: Friend)=>{
                const amitie = convertUTCToLocal(ami.temps_amitie )
                return{
                    ...ami,
                    id: ami.id_publique,
                    fp_url: ami.pfp_url,
                    temps_amitie:amitie
                }
            })

            setAmis(data)
        } catch (error) {
            catcher(error, t('errors.loadFailed'))
        }
    }

    /* const deleteAmi = async (idPublique: string)=>{
        try {
            const response = await api.delete(`/amis/${idPublique}`)
            const amisC = [...amis]
            const nouvAmis = amisC.filter(a=>a.id != idPublique)
            setAmis([...nouvAmis])
        } catch (error) {
            catcher(error, t('errors.deleteFailed'))
        }
    } */

    const onPressSelect = useFriendList('select')
    const onPressConsult = useFriendList('consult')

    useEffect(() => {
        if (!select) return

        const applyPage = (page: {append: boolean; hasMore: boolean; friendIds: string[]}) => {
            setCurrentAvailableFriendIds(current => page.append
                ? [...new Set([...current, ...page.friendIds])]
                : page.friendIds
            )
            setHasMoreFriends(page.hasMore)
        }

        const unsubscribe = friendsAvailabilityEvents.onPageUpdate(applyPage)
        const latestPage = friendsAvailabilityEvents.getLatestPage()
        if (latestPage) applyPage(latestPage)

        return unsubscribe
    }, [select])

    const friendSections = useMemo(() => {
        const friendsById = new Map(amis.map(friend => [friend.id, friend]))
        const invitedIds = new Set(invites.map(invite => invite.id))
        const availableFriends = allAvailableFriendIds
            .filter(id => !invitedIds.has(id))
            .map(id => friendsById.get(id))
            .filter((friend): friend is Participant => friend !== undefined)
        const availableIds = new Set(availableFriends.map(friend => friend.id))
        const otherFriends = amis.filter(friend => !availableIds.has(friend.id))

        return [
            { title: t('list.availableForSlot'), data: availableFriends, isAvailableSection: true },
            { title: t('list.otherFriends'), data: otherFriends, isAvailableSection: false },
        ]
    }, [amis, allAvailableFriendIds, invites, t])

    useFocusEffect(useCallback(()=>{
        getAmis()
        if(select && invites.length > 0){
            setIdsSelec((prev) => {
                const next = new Set(prev)
                invites.forEach(i => next.add(i.id))
                return next
            })
        }
    },[]))

    return (
        <ModalBase>
            <View style={{height:'100%', width:'100%'}}>
                <View style={{flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                    <View style={{width:'100%', alignItems:'center',}}>
                        <Text style={{color:colors.text, fontFamily:fonts.body, fontSize:20}}>{t('list.title')}</Text>
                    </View>
                    {select &&
                        <TouchableOpacity style={{position:'absolute', right:16,}} 
                            onPress={() => {                                
                                const amisSelec = amis.filter(a => idsSelec.has(a.id))
                                onPressSelect(amisSelec, Array.isArray(inviterUrl) ? inviterUrl[0] : inviterUrl)
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
                {amis.length > 0 && <SectionList
                    sections={friendSections}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{paddingTop: 12, paddingBottom: 16}}
                    renderSectionHeader={({ section }) => (
                        <View style={{width:'100%', backgroundColor:colors.card, paddingVertical:4}}>
                            <Text style={{
                                color: colors.muted,
                                fontFamily: fonts.title,
                                fontSize: 16,
                                paddingHorizontal: 8,
                                paddingTop: 12,
                                paddingBottom: 4,
                            }}>
                                {section.title}
                            </Text>
                        </View>
                    )}
                    renderSectionFooter={({ section }) => section.isAvailableSection ? (
                        <View>
                            {section.data.length === 0 && (
                                <Text style={{color: colors.muted, fontFamily: fonts.body, paddingHorizontal: 8, paddingBottom: 8}}>
                                    {t('list.noAvailableFriends')}
                                </Text>
                            )}
                            {select && hasMoreFriends && (
                                <TouchableOpacity
                                    disabled={loadingMoreFriends}
                                    onPress={async () => {
                                        if (loadingMoreFriends) return
                                        setLoadingMoreFriends(true)
                                        try {
                                            const page = await friendsAvailabilityEvents.requestMore()
                                            setCurrentAvailableFriendIds(current => [...new Set([...current, ...page.friendIds])])
                                            setHasMoreFriends(page.hasMore)
                                        } finally {
                                            setLoadingMoreFriends(false)
                                        }
                                    }}
                                    style={{minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 8}}
                                >
                                    {loadingMoreFriends
                                        ? <ActivityIndicator color={colors.muted} />
                                        : <Text style={{color: colors.muted, fontFamily: fonts.body, textDecorationLine: 'underline'}}>{t('list.loadMore')}</Text>}
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : null}
                    renderItem={({ item }) => {
                        const dateAmitie = convertirTimestampDateLongue(item.temps_amitie)
                        const selectionne = select && idsSelec.has(item.id)                        
                        return(
                            <View style={{width:'100%', paddingHorizontal:4, paddingVertical:4}}>
                                <TouchableOpacity style={{minHeight:72, width:'100%', flexDirection:'row', alignItems:'center', gap:12, borderRadius:12, borderWidth:1, borderColor:colors.border, backgroundColor:selectionne?colors.secondary:colors.card, paddingHorizontal:12, paddingVertical:8}}
                                    onPress={()=>{
                                        if (select) {                                
                                            setIdsSelec((prev) => {
                                                const next  = new Set(prev)
                                                next.has(item.id) ? next.delete(item.id) : next.add(item.id)
                                                return next
                                            })                                            
                                        }
                                        else if(type === 'consult')
                                            onPressConsult(item)
                                    }}>
                                        <View style={{ width:52, height:52, alignItems:'center', justifyContent:'center'}}>
                                            <Image
                                                source={item.fp_url ? {uri:item.fp_url} : icones.profilDef}
                                                style={{width:'100%', height:'100%', borderRadius:26, overflow:'hidden'}}
                                                
                                            />
                                        </View>
                                        <View style={{flex:1, justifyContent:'center', minWidth:0}}>
                                            <Text numberOfLines={1} style={{fontFamily:fonts.body, color:colors.text, fontSize:17}}>{item.pseudo}</Text>
                                            <Text numberOfLines={1} style={{fontFamily:fonts.body, color:colors.muted, fontSize:13}}>{t('list.friendSince', { date: dateAmitie.substring(dateAmitie.indexOf('.')+2) })}</Text>
                                        </View>
                                        <View style={{width:40, height:'100%', justifyContent:'center', alignItems:'center'}}>
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
                            </View>
                        )
                    }}
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