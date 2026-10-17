import Icon from "@react-native-vector-icons/ionicons";
import * as Brightness from 'expo-brightness';
import { router } from 'expo-router';
import { useFocusEffect, useIsFocused } from "expo-router/react-navigation";
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Dimensions, FlexAlignType, ImageSourcePropType, Pressable, StyleSheet, Text, TouchableOpacity, useColorScheme, View, ViewStyle } from 'react-native';
import Animated, { createAnimatedComponent, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { interpolatePath, parse } from 'react-native-redash';
import Svg, { Path } from 'react-native-svg';

import { path1 as closeMenuPath1, path2 as closeMenuPath2, path3 as closeMenuPath3 } from '@/svgs/closeMenu';
import { path1 as hamburgerMenuPath1, path2 as hamburgerMenuPath2, path3 as hamburgerMenuPath3 } from '@/svgs/hamburgerMenu';

import { useAPI } from '@/contextes/contexteAPI';
import { useFont } from '@/contextes/contexteFont';
import { useMembre } from '@/contextes/contexteMembre';
import { usePalette } from '@/contextes/contextePalette';
import { useRouteAbs } from '@/contextes/contexteRoute';

import log from '@/functions/log';

import { useActionFab } from '@/hooks/useActionFAB';

import { FPType, isFpObject } from '@/types/pfp';

import Haptics from '@/abstractions/haptics';
import MemberCode from '@/components/memberCode';
import { withSpringConfig, withTimingConfig } from '@/constants/ReanimatedConfs';
import { convertirTimestampDateCourte } from "@/functions/convertirTimestamp";
import ProfilPic from "@/components/pfp";

const MENU_OPTIONS_GAP = 8
const FLOATING_BTN_HEIGHT = 64

export default function ProfilEcran(){
    const { t } = useTranslation('profile')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()

    const isFocused = useIsFocused()
    const { APIBaseURL } = useAPI()
    const { ajouterEcran } = useRouteAbs()
    const { membre, getMembre } = useMembre()

    const {height: WIN_H} = Dimensions.get('window') 
    const icones = {        
        profilDef:colorScheme === 'dark' ?require('@/assets/icones/profil-dark-icon.png'):require('@/assets/icones/profil-light-icon.png'),        
    }    

    const fpRef = useRef<FPType>(membre.fp)
    
    const oldBrightness = useRef<number>(0)
    
    const [avertissementVisible, setAvertissementVisible] = useState(false)
    const [, setFpSource] = useState<ImageSourcePropType>(icones.profilDef)
    const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState<boolean>(false)

//#region ValeursAnimé
    const defBanniereH = 228

    const opaciteAvertissement = useSharedValue(0)
    const banniereH = useSharedValue(defBanniereH)

    const hamburgerMenuOpenShared = useSharedValue<number>(0) 
    const hamburgerMenuBg = useSharedValue(colors.primary)

    const paramsOptionBottom = useSharedValue(0)
    const editOptionBottom = useSharedValue(0)
    const logOutOptionBottom = useSharedValue(0)
    const importOptionBottom = useSharedValue(0) // stories #4 et #7 : importer un calendrier
    const optionOpacity = useSharedValue(0)

    const opaciteAnime = useSharedValue(1)

    const infosMembreAlignItems = useSharedValue<FlexAlignType>('flex-start')
    const opaciteInfosMembre = useSharedValue(1)  

    const banniereAnimee = useAnimatedStyle(() => {
        "worklet"
        return{
            height: banniereH.value,
            opacity: opaciteAnime.value,
        }
    })
    const infosMembreAnime = useAnimatedStyle<ViewStyle>(()=>{
        "worklet"
        return{
            alignItems: infosMembreAlignItems.value,
            opacity: opaciteInfosMembre.value
        }
    })

    //Utils for animating hamburger menu to close icon - Path 1 (top line → top-left diagonal)
    const hamburgerMenuP1 = parse(hamburgerMenuPath1)
    const closeMenuP1 = parse(closeMenuPath1)
    const pathProps1 = useAnimatedProps(() => {
        "worklet"
        return {
            d: interpolatePath(hamburgerMenuOpenShared.value, [0, 1], [hamburgerMenuP1, closeMenuP1])
        }
    })

    //Utils for animating hamburger menu to close icon - Path 2 (middle line → top-right diagonal)
    const hamburgerMenuP2 = parse(hamburgerMenuPath2)
    const closeMenuP2 = parse(closeMenuPath2)
    const pathProps2 = useAnimatedProps(() => {
        "worklet"
        return {
            d: interpolatePath(hamburgerMenuOpenShared.value, [0, 1], [hamburgerMenuP2, closeMenuP2])
        }
    })

    //Utils for animating hamburger menu to close icon - Path 3 (bottom line → bottom-right diagonal)
    const hamburgerMenuP3 = parse(hamburgerMenuPath3)
    const closeMenuP3 = parse(closeMenuPath3)
    const pathProps3 = useAnimatedProps(() => {
        "worklet"
        return {
            d: interpolatePath(hamburgerMenuOpenShared.value, [0, 1], [hamburgerMenuP3, closeMenuP3])
        }
    })

    const hamburgerMenuTriggerAnimated = useAnimatedStyle(() => {
        return {
            backgroundColor:hamburgerMenuBg.value
        }
    })
    
    //Hamburger menu options animated styles
    const paramsOptionAnimated = useAnimatedStyle(() => {
        return {
            bottom: paramsOptionBottom.value,
            opacity: optionOpacity.value
        }
    })
    const editOptionAnimated = useAnimatedStyle(() => {
        return {
            bottom: editOptionBottom.value,
            opacity: optionOpacity.value
        }
    })
    const logOutOptionAnimated = useAnimatedStyle(() => {
        return {
            bottom: logOutOptionBottom.value,
            opacity: optionOpacity.value
        }
    })
    const importOptionAnimated = useAnimatedStyle(() => {
        return {
            bottom: importOptionBottom.value,
            opacity: optionOpacity.value
        }
    })
    const backdropAnimated = useAnimatedStyle(() => {
        return {
            opacity:interpolate(optionOpacity.value, [0, 1], [0, 0.5])
        }
    })

    const avertissementAnime = useAnimatedStyle(()=>{
        return{
            opacity:opaciteAvertissement.value
        }
    })

//#endregion  
   
    const ouvrirModalQRCode = async()=>{
        const permission = await Brightness.getPermissionsAsync()
        const minBrightness = 0.1
        if(!permission.granted){
            Alert.alert(
                t('qrCode.brightnessTitle'),
                t('qrCode.brightnessMessage'),
                [
                {
                    text: t('qrCode.deny'),
                    onPress: () => log('Accès refusé'),
                    style: 'cancel',
                },
                {
                    text: t('qrCode.allow'),
                    onPress: async() => {await Brightness.requestPermissionsAsync()},
                },
                ],
                { cancelable: false }
            );            
        }
        oldBrightness.current = await Brightness.getBrightnessAsync()
        if(oldBrightness.current <= minBrightness){
            setAvertissementVisible(true)
            opaciteAvertissement.value = withTiming(1, {duration:500})
        }
            
        setTimeout(async ()=>{            
            if(oldBrightness.current <= minBrightness){
                opaciteAvertissement.value = withTiming(0, {duration:500})
                await Brightness.setBrightnessAsync(minBrightness)
            }
            router.push({ pathname: '/(modals)/ajouterAmi', params: { contexte: 'qrCode' } })
        }, oldBrightness.current <= minBrightness ? 2000: 0)       
        
    }   
    const SPRING_DURATION_ESTIMATE = 250 
    const toggleHamburgerMenu = () => {   
        const isOpen = !hamburgerMenuOpen
        setHamburgerMenuOpen(isOpen)
        hamburgerMenuOpenShared.value = withTiming(isOpen ? 1 : 0)
        hamburgerMenuBg.value = withTiming(isOpen ? 'transparent' : colors.primary, withTimingConfig)
        editOptionBottom.value = withDelay(0, withSpring(isOpen ? FLOATING_BTN_HEIGHT + MENU_OPTIONS_GAP : 0, withSpringConfig))
        paramsOptionBottom.value = withDelay(40, withSpring(isOpen ? (FLOATING_BTN_HEIGHT + MENU_OPTIONS_GAP) * 2 : 0, withSpringConfig))
        logOutOptionBottom.value = withDelay(80, withSpring(isOpen ? (FLOATING_BTN_HEIGHT + MENU_OPTIONS_GAP) * 3 : 0, withSpringConfig))
        importOptionBottom.value = withDelay(120, withSpring(isOpen ? (FLOATING_BTN_HEIGHT + MENU_OPTIONS_GAP) * 4 : 0, withSpringConfig))
        optionOpacity.value = withDelay(isOpen ? 0 : 160, withTiming(isOpen ? 1 : 0, withTimingConfig))
        
        setTimeout(() => Haptics.click(), 0 + SPRING_DURATION_ESTIMATE)
        setTimeout(() => Haptics.clickLeger(), 40 + SPRING_DURATION_ESTIMATE)
        setTimeout(() => Haptics.click(), 80 + SPRING_DURATION_ESTIMATE)
        setTimeout(() => Haptics.clickLeger(), 120 + SPRING_DURATION_ESTIMATE)
    }
    /* 
        const getWidgetsMembre = async ()=>{
            let token = await getToken()
            try {
                const reponse = await api.get('/widgets', {
                    headers:{
                        'Authorization':`Bearer ${token}`
                    }
                })

                setWidgetsMembre(reponse.data.widgets)
            } catch (error) {
                catcher(error, t('errors.widgetsLoadFailed'))
            }
        } */

    /* const getWidgetsAmis = async()=>{}
     */
    useActionFab("profil", {
        action: ouvrirModalQRCode,
        config: {
            visible:true,
            icon: <Icon name='qr-code' color={colors.text} size={24} />
        }
    })

    useEffect(()=>{
        setFpSource({ uri: `${membre.fp}` })
    }, [membre.fp])

    useFocusEffect(
        React.useCallback(() => {
            ajouterEcran('profil')
            log("temps creation", membre.tempsCreation)
            
            if(!membre.fp || !membre.pseudo || !membre.bio || !membre.idPublique)
                getMembre()
            
            //getWidgetsMembre()

            if (membre.fp) {
                setFpSource({ uri: `${APIBaseURL}/${membre.fp}` });
            } else if (isFpObject(membre.fp)) {
                const current = fpRef.current;
                if (isFpObject(current)) {
                    setFpSource({ uri: current.uri });
                }
            } else {
                setFpSource(icones.profilDef)
            }

            return () => {             
                
            };
        }, [isFocused])
    );
    const AnimatedTouchableOpacity = createAnimatedComponent(TouchableOpacity)
    const AnimatedPath = createAnimatedComponent(Path)

//#region StyleSheet
    const s = StyleSheet.create({   
        pseudo:{
            fontSize: 24,
            color: colors.text,
            fontFamily: fonts.title 
        },
        bio:{
            fontSize:16,
            height:'auto',
            width:'100%',
            flexWrap:'wrap'        
        },
        widgetEnEdit:{
            height:'95%', 
            width:132, 
            marginHorizontal:8,
            marginVertical:8,
            borderWidth:1,
            borderRadius: 12,
            alignItems:'center', 
            justifyContent:'center',
        },
        button: {
            width: '90%',
            alignItems: 'center',
            borderWidth: 1,
            borderRadius: 8,
            borderColor: colors.border,
            paddingVertical: 16,
            backgroundColor: colors.primary,
            flexDirection: 'row',
            justifyContent: 'center',
            gap:8
        },
        floatingButton: {
            aspectRatio: 1 / 1,
            height: FLOATING_BTN_HEIGHT,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex:1
        },
        floatingOption: {
            position: 'absolute',
            zIndex:0
        },
        hamburgerMenuBackdrop: {
            zIndex: 11,
            height: '100%',
            width: '100%',
            position: 'absolute',
            backgroundColor: colors.background
        }
    })  
//#endregion
    
    return (  
        <View style={{height:'100%', width:'100%', backgroundColor:colors.background}}>
            {avertissementVisible && <Animated.View style={[avertissementAnime,{position:'absolute', zIndex:20, height:'100%', width:'100%',alignItems:'center', justifyContent:'center', backgroundColor:colors.card }]}>
                <Text style={{color:colors.warning, fontFamily:fonts.body, fontSize:28}}>{t('brightness.warning')}</Text>
            </Animated.View>}
            {/* TODO: make it pressable */}
            <Animated.View style={[s.hamburgerMenuBackdrop, backdropAnimated]}>
                <Pressable
                    onPress={() => { if (hamburgerMenuOpen) toggleHamburgerMenu() }}
                    style={{ height: '100%', width: '100%' }}
                />
            </Animated.View>
            <View style={{ flex:4, height:WIN_H, flexDirection:'column', alignItems:'center'}}>                
                <Animated.View style={[{flex:1, alignItems:'center', width:'100%', overflow:'hidden'}, banniereAnimee]}>
                    {/*  */}                                                                                 
                </Animated.View>        
                {/* Profil infos */}
                <View style={{flex:3, width: '100%', zIndex: 10, }}>                    
                    <View style={[{height:'48%', flexDirection:'column', gap:16, paddingBottom:4, borderTopLeftRadius: 16, borderTopRightRadius:16, backgroundColor:colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.7, shadowRadius: 8, elevation:5, borderBottomColor:colors.border, borderBottomWidth:1}]}>                
                        {/* Pfp */}
                        <Animated.View style={[{ height: 120, width: 120, zIndex: 2, marginLeft: 16, marginTop: -56, justifyContent: 'center', overflow: 'hidden', }]}>                     
                            <ProfilPic
                                size={120}
                                pfp={membre.fp}
                            />
                        </Animated.View>
                        {/* Pseudo and Code */}
                        <Animated.View style={[{ justifyContent: 'center', paddingHorizontal: 16}, infosMembreAnime]}>
                            <View style={{flexDirection:'row', alignItems:'baseline', justifyContent:'space-between', width:'100%'}}>
                                <Text style={[s.pseudo, { }]}>@{membre.pseudo}</Text>
                                <MemberCode code={membre.idPublique??''}/>
                            </View>                            
                            <Text style={[{color:colors.muted, fontSize:14, paddingLeft:4, fontFamily:fonts.body}]}>{t('memberSince', { date: convertirTimestampDateCourte(membre.tempsCreation) })}</Text>                
                        </Animated.View>
                        {/* TODO: avoir un bouton avec le compte des amis qui affiche la liste des amis */}
                        {/* Bio */}
                        <Animated.View style={{ width:'100%', height:'auto', borderRadius:8, paddingLeft:16}}>                            
                            <View style={{width:'90%', paddingVertical:8, flexWrap:'wrap'}}>
                                <Text style={[s.bio,{color:colors.text, fontFamily:fonts.body, fontSize:16}]} numberOfLines={3} /* afficher plus */>{membre.bio}</Text>
                            </View>                        
                        </Animated.View>                        
                    </View> 
                </View>  
                {/* Futur widgets */}
                {/* Hamburger Menu */}
                <View style={{ position: 'absolute', bottom: 16, right: 16, zIndex:12 }}>                        
                        {/* Hamburger menu trigger */}
                        <AnimatedTouchableOpacity style={[s.floatingButton, hamburgerMenuTriggerAnimated]}
                            onPress={() => {
                                toggleHamburgerMenu()
                            }}
                        >
                            <Svg
                                style={{ width: '100%', height: '100%' }}
                                viewBox='0 0 256 256'
                            >
                                <AnimatedPath
                                    fill="none"
                                    stroke={colors.text}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={8}
                                    animatedProps={pathProps1}
                                />
                                <AnimatedPath
                                    fill="none"
                                    stroke={colors.text}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={8}
                                    animatedProps={pathProps2}
                                />
                                <AnimatedPath
                                    fill="none"
                                    stroke={colors.text}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={8}
                                    animatedProps={pathProps3}
                                />
                            </Svg>
                        </AnimatedTouchableOpacity>
                        {/* Hamburger menu options */}
                        <AnimatedTouchableOpacity style={[s.floatingButton, s.floatingOption, paramsOptionAnimated]}
                        onPress={() => {
                            toggleHamburgerMenu()
                            router.push('/(tabs)/profile/settings')
                        }}
                        >
                            <Icon name='cog' color={colors.text} size={28} />
                        </AnimatedTouchableOpacity>
                        <AnimatedTouchableOpacity
                            style={[s.floatingButton, s.floatingOption, editOptionAnimated]}
                        onPress={() => {
                            toggleHamburgerMenu()
                            router.push('/(tabs)/profile/edit')
                        }}
                        >
                            <Icon name='pencil' color={colors.text} size={28} />
                        </AnimatedTouchableOpacity>
                        <AnimatedTouchableOpacity
                            style={[s.floatingButton, s.floatingOption, { borderColor: colors.error }, logOutOptionAnimated]}
                            onPress={() => {
                                router.push({
                                    pathname: '/(modals)/confirm',
                                    params: { action: 'signOut' },
                                })
                            }}
                        >
                            <Icon name='log-out' color={colors.error} size={28} />
                        </AnimatedTouchableOpacity>
                </View>
        </View>         
        </View>                  
    )                           
}                               
                                
