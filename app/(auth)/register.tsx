import { useFocusEffect, useNavigation } from "expo-router/react-navigation";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import Toast from 'react-native-toast-message';
//import getUniqueId from 'react-native-device-info'

import { useAPI } from '@/contextes/contexteAPI';
import { useFont } from '@/contextes/contexteFont';
import { usePalette } from '@/contextes/contextePalette';
import { useRouteAbs } from '@/contextes/contexteRoute';
import log from '@/functions/log';

import Haptics from '@/abstractions/haptics.js';
import { LinkAbs } from '@/abstractions/linkAbs';
import TextInputAbs from '@/abstractions/textInputAbs';
import ServerStatus from '@/components/serverStatus';
import { useHeaderHeight } from '@/contextes/contexteHeader';
import catcher from '@/functions/catcher';
import { router } from 'expo-router';
import BetaTag from '@/components/betaTag';
import { toastTypes } from "@/constants/toastConfig";
import ToastAbs from "@/abstractions/toastAbs";
import KeyboardDismisser from "@/abstractions/keyboardDismisser";

export default function InscriptionEcran({
    
}){
    const courrRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const mdpLong = 12
    const largeur = Dimensions.get("window").width - 32
    const refMdp = useRef<TextInput>(null)
    const refMdp2 = useRef<TextInput>(null)
    const refCourriel = useRef<TextInput>(null)
    const refPseudo = useRef<TextInput>(null)
    const refScrollView = useRef<ScrollView>(null)

    const colorScheme = useColorScheme()
    
    const { colors } = usePalette()
    const { fonts } = useFont()
    const {api, APIBaseURL} = useAPI()
    
    const {ajouterEcran} = useRouteAbs()

     const icones = {
        afficher:colorScheme === 'dark'?require('@/assets/icones/afficher-dark-icon.png'):require('@/assets/icones/afficher-light-icon.png'),
        masquer:colorScheme === 'dark'?require('@/assets/icones/masquer-dark-icon.png'):require('@/assets/icones/masquer-light-icon.png')
    }

    const [pseudo, setPseudo] = useState('');
    const [pass, setPass] = useState('');
    const [pass2, setPass2] = useState('');
    const [showPassRules, setShowPassRules] = useState(false)
    const [showPass2Rule, setShowPass2Rule] = useState(false)
    const [mdpLongValide, setMdpLongValide] = useState(false)
    const [mdpCarSpeciauxValide, setMdpCarSpeciauxValide] = useState(false)
    const [mdpMinMajValide, setMdpMinMajValide] = useState(false)
    const [pass2Valid, setPass2Valid] = useState(true)
    const [hidePass, setMasquerMdp] = useState(true)
    const [mdpValide, setMdpValide] = useState(false)
    const [courriel, setCourriel] = useState('')
    const [courrielValide, setCourrielValide] = useState(true)

    const [isInactive, setEstDesactive] = useState(true)

    let inputPositions = useRef({
        pseudo: 0,
        email: 0,
        pass: 0,
        pass2: 0,
        scrollView:0
    })

    const scrollToInput = (inputName: 'pseudo' | 'email' | 'pass' | 'pass2') => {
        const inputPos = inputPositions.current[inputName];

        let scrollPos = inputPositions.current['scrollView'] + (inputPos - inputPositions.current['scrollView'])

        log(inputName, "scroll to", scrollPos)
        
        if (inputPos !== undefined && refScrollView.current) {
            refScrollView.current.scrollTo({ y: scrollPos, animated: true });
        }
    }

    const inscrire = async () =>{
        try {
            const method = "POST"
            const url = "/membres/inscription"
            const data = {
                pseudo: "",
                mot_de_passe: "",
                courriel: "",
                fuseau_horaire: ""
            }
            
            data.pseudo = pseudo.trim()
            data.mot_de_passe = pass.trim()
            data.courriel = courriel.trim()
            data.fuseau_horaire = Intl.DateTimeFormat().resolvedOptions().timeZone
            const response = await api.request({
                method:method,
                url:url,
                baseURL:APIBaseURL,
                data:data
            })
            
            if(response.status == 201){
                ToastAbs.show({
                    type: toastTypes.success,
                    text1: 'inscription réussie',
                    text2: 'bienvenue à toi, tu fais parti de quelque chose de grand!'
                })
            }
            setTimeout(()=>{
                router.push({pathname: '/(auth)/login'})
            }, 300)    
          } catch (error : any) {
            log('Erreur inscription :', error.message)
            catcher(error, 'erreur à l\'inscription')
          }
    }    

    useFocusEffect(useCallback(()=>{
        ajouterEcran('inscription')

        const keyDidHide = Keyboard.addListener('keyboardDidHide', () => {
            // resets scroll view offset after keyboard has hidden
            /* if (refScrollView.current)
               refScrollView.current?.scrollTo({ y: 0, animated: true })  */
        })
        return()=>{
            keyDidHide.remove()
        }
    },[]))

    useEffect(()=>{
        setMdpValide(mdpLongValide && mdpCarSpeciauxValide && mdpMinMajValide )
        if(courrRegex.test(courriel)){
            setCourrielValide(true)
        }
       
        setEstDesactive(!mdpValide || !pass2Valid || !courrielValide)   

    }, [mdpLongValide, mdpCarSpeciauxValide, mdpMinMajValide, pass2Valid, courriel])

    useEffect(() => {
        if (pass != pass2)
            setPass2Valid(false)
    }, [pass])

    const s = StyleSheet.create({
        container:{
            flex: 1,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexDirection: 'column',
        },
        input:{
            height:48,
            paddingLeft:20,
            fontSize: 20
        },
        titre:{
            fontSize:48,
            marginBottom:0
            },
        boutonConteneur:{
            flexDirection:'row',
            width:'80%',
            alignItems:'center',
            justifyContent:'space-between',
            marginTop:16
        },
        boutonContour:{
            borderRadius:8, 
            paddingLeft:8, 
            paddingRight: 8, 
            paddingTop:4, 
            paddingBottom:4
        },
        button:{
            height:44,
            alignItems:'center',
            justifyContent:'center',
            borderRadius:8, 
            borderWidth:1,
            paddingVertical:4,
            paddingHorizontal:8,
        },
        passRules:{
            width:'85%',
            height: 24,
            paddingLeft:8,
            paddingRight:8,
            borderRadius: 12,
            flexDirection:'row',
            alignItems:'center',
            justifyContent: 'space-between',
            marginTop: -8,
            backgroundColor: colors.card 
        },
        separateur:{
            width: 1,
            height:'80%'
        },
        invalid:{color: 'red'},
        valid: { color: 'green' },
        disclaimerContainer: {
            marginTop:8,
            flexDirection: 'row',
            flexWrap: 'wrap',
            width: '90%',
            gap: 4,
            backgroundColor: colors.card,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 12
        },
        disclaimerTitle: {
            backgroundColor: colors.text,
            padding: 4,
            borderRadius: 4,
            width: 43
        },
        disclaimerTitleText: {
            color: colors.secondary,
            fontFamily: fonts.body,
            fontSize: 16
        },
        disclaimerText: {
            color: colors.text,
            fontFamily: fonts.body,
            fontSize: 16,
            textAlign: 'justify'
        },
        formContainer: {
            marginTop: 32,
            width: '100%',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32,
            flexGrow: 1,
            paddingBottom: 96,
            height:'200%'
        }
    })

    return (
        <KeyboardDismisser
            onPress={() => {
                const ref = refScrollView.current
                if (ref != null) {
                    ref.scrollTo({y:0, animated:true})
                }
            }}
        >
            <KeyboardAvoidingView
                style={s.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <ServerStatus/>
                <View style={s.disclaimerContainer}>
                    <BetaTag/>
                    <Text style={s.disclaimerText}>
                        Utilisez un mot de passe différent de vos autres comptes pour éviter toute fuite.
                        Choisissez un pseudo sans informations personnelles eg.: nom, prénom, etc.
                    </Text>
                </View>        
                    <ScrollView
                        ref={refScrollView}
                        contentContainerStyle={s.formContainer}
                        keyboardShouldPersistTaps='handled'
                        onLayout={(e) => {
                            inputPositions.current['scrollView'] = e.nativeEvent.layout.y 
                        }}
                    >                
                    <Text style={[s.titre, {color:colors.text, fontFamily:fonts.title}]}>sync</Text>
                    <TextInputAbs
                        ref={refPseudo}
                        onLayout={(e) => {
                            inputPositions.current.pseudo = e.nativeEvent.layout.y
                        }}
                        placeholder='pseudo'
                        returnKeyType='next'
                        value={pseudo}
                        onChangeText={(text)=>setPseudo(text)}
                            onSubmitEditing={() => {
                            if(refCourriel.current)
                                refCourriel.current.focus()
                        }}
                        style={{ width: largeur }}
                        onFocus={() => {
                            scrollToInput('pseudo')
                        }}
                    />        
                    <TextInputAbs
                        ref={refCourriel}
                        style={{borderColor:courrielValide?colors.border:colors.error, width: largeur}}
                        placeholder='courriel | courr@exemple.com'
                        returnKeyType='next'
                        onChangeText={(text) =>{
                            setCourriel(text); 
                        }}
                        value={courriel}
                            onSubmitEditing={() => {
                            if(refMdp.current)
                                refMdp.current.focus()
                        }}
                        keyboardType='email-address'
                        onLayout={(e) => {
                            inputPositions.current.email = e.nativeEvent.layout.y
                        }}
                        onFocus={() => {
                            scrollToInput('email')
                        }}
                    />
                    <View style={{ justifyContent: 'center' }}
                        onLayout={(e) => {
                            inputPositions.current.pass = e.nativeEvent.layout.y
                        }}
                    >
                        <TextInputAbs
                            ref={refMdp}
                            style={{borderColor:mdpValide?colors.border:colors.error, width: largeur, justifyContent:'center'}}
                            autoComplete='new-password'
                            textContentType='newPassword'
                            returnKeyType='next'
                            placeholder='mot de passe'
                            onFocus={()=>{
                                setShowPassRules(true)
                                scrollToInput('pass')
                            }}
                            onBlur={()=>{
                                log('mdp valide', mdpValide)
                                if(mdpValide)
                                    setShowPassRules(false)}}
                            onSubmitEditing={() => {
                                setShowPassRules(false)
                                if(refMdp2.current)
                                    refMdp2.current.focus()
                            }}
                            onChangeText={(mdp)=>{
                                if(mdp.length >= mdpLong){
                                    setMdpLongValide(true)
                                }
                                else{
                                    setMdpLongValide(false)
                                }
                                const regex = /[!@#$%^&*()?":{}|<>]/

                                if(regex.test(mdp)){
                                    setMdpCarSpeciauxValide(true)
                                }
                                else{
                                    setMdpCarSpeciauxValide(false)
                                }
                                const aMajuscules = /[A-Z]/.test(mdp);
                                const aMinuscules = /[a-z]/.test(mdp);

                                if(aMajuscules && aMinuscules){
                                    setMdpMinMajValide(true)
                                }
                                else{
                                    setMdpMinMajValide(false)
                                }                       

                                setPass(mdp)
                            }}
                            placeholderTextColor={colors.muted}
                            secureTextEntry={hidePass}
                            value={pass}
                           
                            />
                        {/*Show | Hide password */}
                        <TouchableOpacity style={{position:'absolute', right:8}}
                            onPress={()=>{
                                Haptics.click()
                                setMasquerMdp((val)=>!val)
                            }}>
                                <Image
                                    source={hidePass?icones.afficher:icones.masquer}
                                    style={{height:24, width:24, opacity:pass.length > 0 ? 1 : 0.4}}
                                    resizeMode='contain'
                                />
                        </TouchableOpacity>
                    </View>                
                    {showPassRules && 
                        <View style={s.passRules}
                        >
                            <Text id='longMinText' style={[s.invalid, mdpLongValide && s.valid]}>Long. min: {mdpLong}</Text>
                            <View style={[s.separateur, {backgroundColor:colors.text}]}></View>
                            <Text id='carSpeciauxText' style={[s.invalid, mdpCarSpeciauxValide && s.valid]}>Car. Spéciaux</Text>
                            <View style={[s.separateur, {backgroundColor:colors.text}]}></View>
                            <Text id='majMinText' style={[s.invalid, mdpMinMajValide && s.valid]}>Maj. et min.</Text>        
                        </View>
                    }
                    <TextInputAbs
                        ref={refMdp2}
                        style={ {borderColor:pass2Valid?colors.border:colors.error, width:largeur}}
                        returnKeyType='done'
                        placeholder='confirmation du mot de passe'
                        onChangeText={(pass2)=>{
                            if(pass2 === pass){
                                setPass2Valid(true)
                            }
                            else
                                setPass2Valid(false)
                            setPass2(pass2)
                        }}
                        onFocus={()=>{
                            setShowPass2Rule(true) 
                            scrollToInput('pass2')
                        }}
                        onBlur={()=>{
                            log('mdp 2 valide', pass2Valid)
                            if(pass2Valid)
                                setShowPass2Rule(false)
                        }}
                        placeholderTextColor={colors.muted}
                        secureTextEntry={hidePass}
                        value={pass2}              
                        onLayout={(e) => {
                            inputPositions.current.pass2 = e.nativeEvent.layout.y
                        }}    
                    />
                    {showPass2Rule && 
                            <View style={s.passRules}>
                            <Text id='mdp2valide' style={[{textAlign:'center', width:'100%'}, s.invalid, pass2Valid && s.valid]}>Les mots de passes {!pass2Valid?"ne sont pas":"sont" } identiques</Text>      
                        </View>
                    }
                    <View style={s.boutonConteneur}>
                        <TouchableOpacity style={[s.button, { borderColor:colors.border }]} 
                            onPress={()=>{
                                setPass('')
                                setPseudo('')
                                setPass2('')
                            }}
                        >
                            <Text style={{color:colors.text, fontSize:18, fontFamily:fonts.body}}>annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.button, {backgroundColor:isInactive?'transparent':colors.secondary, }]} 
                            disabled={isInactive}
                            onPress={()=> {
                                inscrire()
                            }}>
                            <Text style={{color:isInactive?colors.muted:colors.text, fontSize:18, fontFamily:fonts.body}}>
                                s'inscrire
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ width:'100%', height:24, alignItems:'center'}}>
                        <LinkAbs href={'/(auth)/login'}>
                            Déjà inscrit?
                        </LinkAbs>
                    </View>
            </ScrollView>        
            </KeyboardAvoidingView>
        </KeyboardDismisser>
    );
    
}

