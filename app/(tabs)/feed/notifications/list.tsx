import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useIsFocused } from "expo-router/react-navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import Animated, { useAnimatedStyle, withRepeat, withSpring, withTiming } from "react-native-reanimated";

import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { Notification, useNotifications } from "@/contextes/contexteNotifications";
import { usePalette } from "@/contextes/contextePalette";
import { useAccessToken } from "@/contextes/contexteToken";


import NotificationItem from "@/components/notificationItem";
import { withTimingConfig } from "@/constants/ReanimatedConfs";
import Spinner from "@/svgs/spinner";

export default function NotificationsList({}){
    const { t } = useTranslation('notifications')
    const { colors } = usePalette()
    const { fonts } = useFont() 
    const colorScheme = useColorScheme()
    
    const isFocused = useIsFocused()
    const {notifications, nonLues, notifRefresh} = useNotifications()
    const {APIBaseURL, api} = useAPI()
    const {getToken} = useAccessToken()

    const rienTexte = t('list.emptyState')

    const icones = {
        corbeille: colorScheme === 'dark' ?require('@/assets/icones/corbeille-dark-icon.png'):require('@/assets/icones/corbeille-light-icon.png'),
        accepter: colorScheme === 'dark' ?require('@/assets/icones/checkmark-dark-icon.png'):require('@/assets/icones/checkmark-light-icon.png'),
        refuser: colorScheme === 'dark' ?require('@/assets/icones/croix-dark-icon.png'):require('@/assets/icones/croix-light-icon.png'),
        rafraichir: colorScheme === 'dark' ?require('@/assets/icones/rafraichir-dark-icon.png'):require('@/assets/icones/rafraichir-light-icon.png'),
        optionsPleine: colorScheme === 'dark' ?require('@/assets/icones/3p-pleines-dark-icon.png'):require('@/assets/icones/3p-pleines-light-icon.png'),
        optionsVide: colorScheme === 'dark' ?require('@/assets/icones/3p-vides-dark-icon.png'):require('@/assets/icones/3p-vides-light-icon.png'),
        expiration: colorScheme === 'dark' ?require('@/assets/icones/horloge-dark-icon.png'):require('@/assets/icones/horloge-light-icon.png')
    }

    const notificationsOriginales = useRef<Array<Notification>>([])

    const [filtreSelec, setFiltreSelec] = useState('toutes')
    const [selectionner, setSelectionner] = useState(false)
    const [notificationsCopie, setNotificationsCopie] = useState(notifications)
    const [notificationsDelete, setNotificationsDelete] = useState<Array<string>>([])   
    const [notificationsSelec, setNotificationsSelec] = useState<Array<string>>([])
    const [rafraichi, setRafraichi] = useState(false)    

    const flatListRef = useRef<FlatList>(null)
    
    const trier = (filtre: string) => {
        const notifsCopie = [...notificationsOriginales.current]
        if (filtre === '') {
            setNotificationsCopie(notifsCopie)
        } else if (filtre !== 'non_lue') {
            setNotificationsCopie(notifsCopie.filter((notif) => {
                const type = notif.payload?.type ?? notif.type
                return type?.includes(filtre) || (filtre === 'amis' && type === 'demande_ami')
            }))
        } else {
            setNotificationsCopie(notifsCopie.filter(notif => notif.statut === 'non_lue'))
        }
    }

    const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity)

    const rafraichissementAnime = useAnimatedStyle(()=>{
        "worklet"
        return{
            opacity: withTiming(rafraichi ? 1 : 0, { duration: 500 }),
            transform:[{"rotate": withRepeat(withTiming('360deg', withTimingConfig))}]
        }
    })

    const supprimerNotifAnime = useAnimatedStyle(()=>{
        "worklet"
        return{
            opacity:withTiming(notificationsSelec.length > 0?1:0, {duration:500}),
            bottom: withSpring(notificationsSelec.length > 0? 72 : 0, {mass:2, damping:16})
        }
    })

    const supprNotif = async (ids=[] as Array<string>)=>{      
        if(ids){
            const token = await getToken()
            setNotificationsDelete(prev => [...prev, ...ids])
            ids.forEach(async id => 
                await api.delete(`/notifications/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            )

            notifRefresh?.forceRefresh()
            const nouvNotifs = notifications.filter((n) => !ids.includes(n.id))
            setNotificationsCopie(nouvNotifs)
        }
    }
    
    useEffect(() => {
        setNotificationsCopie(notifications)
        notificationsOriginales.current = [...notifications]        
    }, [notifications, nonLues])
    
    useFocusEffect(useCallback(() => {
        notifRefresh?.forceRefresh()        
        
        notificationsOriginales.current = [...notifications] 
        return()=>{
            notifRefresh?.setPostRequest(undefined)
        }
    }, [isFocused]))
    
    const s = StyleSheet.create({
        titreCategorie:{
            fontSize:16,
            letterSpacing:0.7
        },
        conteneurCategorie:{
            height:28,
            alignItems:'center', 
            justifyContent:'center', 
            paddingBottom:4,
            borderRadius:12, 
            borderWidth:1,
            paddingHorizontal:8,
            paddingVertical:2,
            marginHorizontal:4
        },
        optionBouton:{
            marginHorizontal:4,
            height:'100%',
            width:40,
            borderRadius:100, 
            borderWidth:1, 
            alignItems:'center', 
            justifyContent:'center'
        }
    })

    return(
        <View style={{position:'relative', flex:1, height:'100%', width:'100%'}}> 
            <TouchableOpacity style={{position:'absolute',  top:5, right:4, zIndex:3}}
                onPress={()=>{
                    setNotificationsSelec([])                    
                    setSelectionner(!selectionner)
                }}
            >
                {selectionner &&<Text style={{color:colors.muted, fontSize:14, }}>
                    {t('list.deselect')}
                </Text>}
            </TouchableOpacity>
            <LinearGradient
                style={{position:'absolute', zIndex:2, top:0, height:24, width:'100%',}}
                start={{x:0, y:0.1}}
                end={{x:0, y:1}}
                colors={[colors.background, 'transparent']}                
            />
            {notificationsCopie.length == 0 &&
                <View style={{top:'40%', left:0, alignItems:'center', justifyContent:'center', position:'absolute', zIndex:2, width:'100%'}}>
                    <Text style={{color:colors.text, textAlign:'center', fontFamily:fonts.body, fontSize:20}}>{rienTexte}</Text>
                </View>
            }
            <FlatList
                ref={flatListRef}
                data={notificationsCopie}
                style={{flex:1, height:'100%', width:'100%', marginTop:16, marginBottom:32}}
                contentContainerStyle={{paddingBottom:48}}
                keyExtractor={(item)=>item.id}  
                nestedScrollEnabled={true}  
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        onRefresh={() => {
                            setRafraichi(rafraichi)
                            notifRefresh?.setPostRequest(() => {
                                setRafraichi(false)
                                notifRefresh.setPostRequest(undefined)
                            })
                            notifRefresh?.forceRefresh()
                        }}
                        refreshing={rafraichi}
                    />}
                renderItem={({item, index}) => {
                    return(
                        <NotificationItem item={item} index={index} vu={item.statut}/>
                    )
                }}
            />
            <View style={{flexDirection:'row', position:'absolute', zIndex:5, bottom:16, width:'100%', height:32, alignItems:'center', justifyContent:'space-evenly'}}>
                <TouchableOpacity style={[s.conteneurCategorie, { borderColor:colors.border, backgroundColor:filtreSelec === 'sync'?colors.secondary:colors.primary}]}
                    onPress={()=>{
                        if(filtreSelec !== 'sync'){
                            setFiltreSelec('sync')
                            trier('sync')
                        }
                        else{
                            setFiltreSelec('')
                            trier('')
                        }
                    }}
                >
                    <Text style={[s.titreCategorie, {color:colors.text, fontFamily:fonts.title, }]}>
                        {t('types.sync')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.conteneurCategorie, { borderColor:colors.border, backgroundColor:filtreSelec === 'amis'?colors.secondary:colors.primary}]}
                    onPress={()=>{
                        if(filtreSelec !== 'amis'){
                            setFiltreSelec('amis')
                            trier('amis')
                        }
                        else{
                            setFiltreSelec('')
                            trier('')
                        }
                    }}
                >
                    <Text style={[s.titreCategorie, {color:colors.text, fontFamily:fonts.title, }]}>
                        {t('types.amis')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.conteneurCategorie, { borderColor:colors.border, backgroundColor:filtreSelec === 'evenements'?colors.secondary:colors.primary}]}
                    onPress={()=>{
                        if(filtreSelec !== 'evenements'){
                            setFiltreSelec('evenements')
                            trier('evenements')
                        }
                        else{
                            setFiltreSelec('')
                            trier('')
                        }
                    }}
                >
                    <Text style={[s.titreCategorie, {color:colors.text, fontFamily:fonts.title, }]}>
                        {t('types.evenements')}
                    </Text>
                </TouchableOpacity>                
                <TouchableOpacity style={[s.conteneurCategorie, { borderColor:colors.border, backgroundColor:filtreSelec==='non_lues'?colors.secondary:colors.primary}]}
                    onPress={()=>{
                        if(filtreSelec != 'non_lues'){
                            setFiltreSelec('non_lues')
                            trier('non_lue')
                        }
                        else{
                            setFiltreSelec('')
                            trier('')
                        }
                    }}
                >
                    <Text style={[s.titreCategorie, {color:colors.text, fontFamily:fonts.title, }]}>
                        {t('list.unread')}
                    </Text>
                </TouchableOpacity>
                    <View style={{position:'absolute', right:2, top:0, height:20, width:20, backgroundColor:colors.error, borderRadius:100, justifyContent:'center', alignItems:'center'}}>
                        <Text style={{color:colors.text, fontFamily:fonts.number}}>
                            {nonLues}
                        </Text>
                    </View>
            </View>
            <LinearGradient
                style={{position:'absolute', zIndex:2, bottom:32, height:64, width:'100%', }}
                start={{x:0, y:0.7}}
                end={{x:0, y:0}}
                colors={[colors.background, 'transparent']}
                
            />            
            <AnimatedTouchableOpacity style={[s.optionBouton,supprimerNotifAnime ,{ position:'absolute', height:40, right:4, backgroundColor:colors.error, borderColor:colors.border,}]}
                hitSlop={8}
                onPress={()=>{
                    supprNotif(notificationsSelec)
                }}
            >
                <Image
                    source={icones.corbeille}
                    style={{width:'80%', height:'80%'}}
                    resizeMode='contain'
                />
            </AnimatedTouchableOpacity>
            {rafraichi &&
                <Animated.View style={[rafraichissementAnime, { height: '100%', width: '100%', backgroundColor: colors.primary, position: 'absolute', zIndex: 0, alignItems: "center", justifyContent: 'center' }]}>                
                    <Spinner fill={colors.muted}/>
                </Animated.View>
            }        
        </View>
    )
}

