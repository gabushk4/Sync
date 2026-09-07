import { useFocusEffect, useIsFocused } from "expo-router/react-navigation";
import * as Brightness from 'expo-brightness';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, DimensionValue, FlexAlignType, Image, ImageSourcePropType, ImageURISource, ImageStyle, Pressable, StyleSheet, Text, TouchableOpacity, useColorScheme, View, ViewStyle } from 'react-native';
import Animated, { createAnimatedComponent, useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming, withDelay, interpolate, runOnJS } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { interpolatePath, parse, withBouncing } from 'react-native-redash';
import Toast from 'react-native-toast-message';
import Icon from "@react-native-vector-icons/ionicons";
import Svg, { Path } from 'react-native-svg';

import { path1 as closeMenuPath1, path2 as closeMenuPath2, path3 as closeMenuPath3 } from '@/svgs/closeMenu';
import { path1 as hamburgerMenuPath1, path2 as hamburgerMenuPath2, path3 as hamburgerMenuPath3 } from '@/svgs/hamburgerMenu';

import { useAPI } from '@/contextes/contexteAPI';
import { useFont } from '@/contextes/contexteFont';
import { useMembre } from '@/contextes/contexteMembre';
import { usePalette } from '@/contextes/contextePalette';
import { useRouteAbs } from '@/contextes/contexteRoute';
import { useAccessToken } from '@/contextes/contexteToken';

import log from '@/functions/log';

import { useActionFab } from '@/hooks/useActionFAB';

import { FPType, isFpObject } from '@/types/pfp';

import { withSpringConfig, withTimingConfig } from '@/constants/ReanimatedConfs';
import MemberCode from '@/components/memberCode';
import { useAuth } from '@/contextes/contexteAuth';
import Haptics from '@/abstractions/haptics';

const MENU_OPTIONS_GAP = 8
const FLOATING_BTN_HEIGHT = 64

export default function ProfilEcran(){
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()

    const isFocused = useIsFocused()
    const { APIBaseURL } = useAPI()
    const { ajouterEcran } = useRouteAbs()
    const { membre, patchProfil, getMembre } = useMembre()

    const {height: WIN_H} = Dimensions.get('window') 
    const icones = {        
        profilDef:colorScheme === 'dark' ?require('@/assets/icones/profil-dark-icon.png'):require('@/assets/icones/profil-light-icon.png'),        
    }    

    const fpRef = useRef<FPType>(membre.fp)
    
    const oldBrightness = useRef<number>(0)
    
    const [avertissementVisible, setAvertissementVisible] = useState(false)
    const [fpSource, setFpSource] = useState<ImageSourcePropType>(icones.profilDef)
    const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState<boolean>(false)

//#region ValeursAnimé
    const defBanniereH = 228
    const defPhotoProfilTop = 0
    const defPhotoProfilTaille = 120

    const opaciteAvertissement = useSharedValue(0)
    const modeEditShared = useSharedValue(false)
    const banniereH = useSharedValue(defBanniereH)
    const banniereImageOpacity = useSharedValue(1)
    const banniereImageWidth = useSharedValue<DimensionValue>('70%')
    const banniereImageHeight = useSharedValue(defBanniereH)

    const hamburgerMenuOpenShared = useSharedValue<number>(0) 
    const hamburgerMenuBg = useSharedValue(colors.primary)

    const paramsOptionBottom = useSharedValue(0)
    const editOptionBottom = useSharedValue(0)
    const logOutOptionBottom = useSharedValue(0)
    const optionOpacity = useSharedValue(0)

    const opaciteAnime = useSharedValue(1)

    const photoProfilTop = useSharedValue(0)
    const photoProfilTaille = useSharedValue(defPhotoProfilTaille)

    const infosMembreAlignItems = useSharedValue<FlexAlignType>('flex-start')
    const opaciteInfosMembre = useSharedValue(1)  

    const opaciteFlatListWidgets = useSharedValue(0.3)

    const flatListWidgetsAnime = useAnimatedStyle(()=>{
        "worklet"
        return{
            opacity:opaciteFlatListWidgets.value
        }
    })
    
    const banniereAnimee = useAnimatedStyle(() => {
        "worklet"
        return{
            height: banniereH.value,
            opacity: opaciteAnime.value,
        }
    })
    const banniereImageAnime = useAnimatedStyle<ImageStyle>(()=>{
        "worklet"
        return{
            opacity: banniereImageOpacity.value,
            width: banniereImageWidth.value,
            height: banniereImageHeight.value
        }
    })
    const photoProfilAnime = useAnimatedStyle(() => {
        "worklet"
        return{
            top: photoProfilTop.value,
            opacity: opaciteAnime.value,
            height: photoProfilTaille.value,
            width: photoProfilTaille.value
        }
    })
    const infosMembreAnime = useAnimatedStyle<ViewStyle>(()=>{
        "worklet"
        return{
            alignItems: infosMembreAlignItems.value,
            opacity: opaciteInfosMembre.value
        }
    })
    const cameraStyle = useAnimatedStyle(() =>{
        "worklet"
        return{
        top: photoProfilTop.value + photoProfilTaille.value / 1.16
        }
    });

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
                'sync souhaite ajuster la luminosité de votre écran',
                'cela permet a un cellulaire de scanner ton qr code plus facilement; \ntu pourras modifier ce choix à tout moment dans tes réglages',
                [
                {
                    text: 'Refuser',
                    onPress: () => log('Accès refusé'),
                    style: 'cancel',
                },
                {
                    text: 'Autoriser',
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
        optionOpacity.value = withDelay(isOpen ? 0 : 120, withTiming(isOpen ? 1 : 0, withTimingConfig))
        
        setTimeout(() => Haptics.click(), 0 + SPRING_DURATION_ESTIMATE)
        setTimeout(() => Haptics.clickLeger(), 40 + SPRING_DURATION_ESTIMATE)
        setTimeout(() => Haptics.click(), 80 + SPRING_DURATION_ESTIMATE)
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
                catcher(error, 'erreur du chargement des widgets')
            }
        } */

    /* const getWidgetsAmis = async()=>{}
     */
    useActionFab({
        action: ouvrirModalQRCode,
        icon:<Icon name='qr-code' color={colors.text} size={24}/>
    })

    useEffect(()=>{
        setFpSource({ uri: `${membre.fp}` })
    }, [membre.fp])

    useFocusEffect(
        React.useCallback(() => {
            ajouterEcran('profil')
            
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
                <Text style={{color:colors.warning, fontFamily:fonts.body, fontSize:28}}>attention les yeux!</Text>
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
                            <Image                                                                                            
                                source={fpSource}                                                   
                                style={{
                                    height:'100%',
                                    width:'100%',
                                    borderRadius:100,
                                    borderWidth:4,
                                    borderColor:colors.card,
                                    backgroundColor:colors.primary,
                                }}
                            />                 
                        </Animated.View>
                        {/* Pseudo and Code */}
                        <Animated.View style={[{ justifyContent: 'center', paddingHorizontal: 16}, infosMembreAnime]}>
                            <View style={{flexDirection:'row', alignItems:'baseline', justifyContent:'space-between', width:'100%'}}>
                                <Text style={[s.pseudo, { }]}>@{membre.pseudo}</Text>
                                <MemberCode code={membre.idPublique??''}/>
                            </View>                            
                            <Text style={[{color:colors.muted, fontSize:14, paddingLeft:4, fontFamily:fonts.body}]}>membre depuis le {membre.tempsCreation}</Text>                
                        </Animated.View>
                        <Animated.View>

                        </Animated.View>
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
                        <AnimatedTouchableOpacity style={[s.floatingButton, s.floatingOption, paramsOptionAnimated]}>
                            <Icon name='cog' color={colors.text} size={28} />
                        </AnimatedTouchableOpacity>
                        <AnimatedTouchableOpacity
                            style={[s.floatingButton, s.floatingOption, editOptionAnimated]}
                            onPress={()=> router.push('/(tabs)/profile/edit')}
                        >
                            <Icon name='pencil' color={colors.text} size={28} />
                        </AnimatedTouchableOpacity>
                        <AnimatedTouchableOpacity
                            style={[s.floatingButton, s.floatingOption, { borderColor: colors.error }, logOutOptionAnimated]}
                            onPress={() => {
                                router.push('/(modals)/confirmSignOut')    
                            }}
                        >
                            <Icon name='log-out' color={colors.error} size={28} />
                        </AnimatedTouchableOpacity>
                </View>
        </View>         
        </View>                  
    )                           
}                               
                                
