import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import Toast from 'react-native-toast-message';


import Haptics from '@/abstractions/haptics.js';
import TextInputAbs from '@/abstractions/textInputAbs';
import ChargementEcran from '@/components/chargementEcran.js';
import PingServeur from '@/components/pingServeur.js';
import { useAPI } from '@/contextes/contexteAPI';
import { useHeaderHeight } from '@/contextes/contexteHeader.js';
import { useMembre } from '@/contextes/contexteMembre';
import { useModal } from '@/contextes/contexteModals';
import { usePalette } from '@/contextes/contextePalette';
import { useRouteAbs } from '@/contextes/contexteRoute';
import { useAccessToken } from '@/contextes/contexteToken';
import catcher from '@/functions/catcher';
import log from '@/functions/log.js';
import { useFocusEffect, useNavigation } from "expo-router/react-navigation";
import { useFont } from '@/contextes/contexteFont';
import {LinkAbs, createLinkStyles} from '@/abstractions/linkAbs';
import { useAuth } from '@/contextes/contexteAuth';
import ServerStatus from '@/components/serverStatus';
import { MOCK_MODE_AVAILABLE, useMockMode } from '@/contextes/contexteMockMode';
import { toastTypes } from '@/constants/toastConfig';
import ToastAbs from '@/abstractions/toastAbs';

export default function ConnexionEcran(){
    const largeur = Dimensions.get("window").width - 32
    const refMdp = useRef<TextInput>(null)
    const refPseudo = useRef<TextInput>(null)

    const colorsScheme = useColorScheme()

    const { colors } = usePalette()
    const { fonts } = useFont()

    const { api } = useAPI()
    const {ajouterEcran} = useRouteAbs()
    const { signIn } = useAuth()
    const {setMockMode} = useMockMode()

    const icones = {
        afficher:colorsScheme === 'dark'?require('@/assets/icones/afficher-dark-icon.png'):require('@/assets/icones/afficher-light-icon.png'),
        masquer:colorsScheme === 'dark'?require('@/assets/icones/masquer-dark-icon.png'):require('@/assets/icones/masquer-light-icon.png')
    }

    const [pseudo, setPseudo] = useState<string>('');
    const [mdp, setMdp] = useState<string>('');
    const [masquerMdp, setMasquerMdp] = useState(true)
    const [estDesactive, setEstDesactive] = useState(true)
    const [enChargement, setEnChargement] = useState(false)

    const connecter = async () => {
        setEstDesactive(true);
        setEnChargement(true);
        try {
            log('se connecter');
            const response = await api.post('/membres/connexion', {
                pseudo: pseudo.trim(),
                mot_de_passe: mdp,
            });

            log('requete', response);

            const { access_token, refresh_token } = response.data;
            await signIn(access_token, refresh_token); 

            ToastAbs.show({
                type: toastTypes.success,
                text1: `bienvenue ${pseudo}`,
            });
        } catch (error: any) {
            log('Erreur connexion:', error.message);
            catcher(error, 'connexion impossible');
            setMdp('');
        } finally {
            setEnChargement(false);
        }
    };

    useFocusEffect(useCallback(()=>{
        ajouterEcran('connexion')
    },[]))

    const s = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background
        },
        input:{
            height:48,
            paddingLeft:20,
            fontSize: 20
        },
        title:{
            fontSize:48,
            marginBottom: 32,
            color: colors.text,
            fontFamily: fonts.title
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
        bouton:{
            height:44,
            alignItems:'center',
            justifyContent:'center',
            borderRadius:8, 
            paddingVertical:4,
            paddingHorizontal: 8,
            borderColor:colors.border
        }
    })

    const linkStyle = createLinkStyles(colors, fonts)

    return (
            <View style={s.container}>       
            <Pressable
                style={{height:'100%'}}
                onPress={()=>{
                    if(Keyboard.isVisible())
                        Keyboard.dismiss()
                }}
            >                
                <ServerStatus/>
                <KeyboardAvoidingView
                    style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 16, }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <Text style={[s.title]}>sync</Text>
                    <TextInputAbs  
                        ref={refPseudo}
                        placeholder='pseudo' 
                        value={pseudo}
                        returnKeyType='next'
                        onChangeText={(text) => {
                            setPseudo(text); 
                            if (pseudo.length > 0 && mdp.length > 8)
                                setEstDesactive(false)
                        }}
                        onSubmitEditing={() => {
                            if(refMdp.current)
                                refMdp.current?.focus()
                        }}
                        style={{ width: largeur }}
                    />         
                    <View style={{width: largeur, justifyContent:'center'}}>
                        <TextInputAbs
                            ref={refMdp}
                            placeholder='mot de passe'
                            secureTextEntry={masquerMdp}
                            value={mdp}
                            onChangeText={(text) => {
                                setMdp(text)
                                if (pseudo.length > 0 && mdp.length > 8)
                                    setEstDesactive(false)
                            }}
                            autoComplete='current-password'
                        />  
                        <TouchableOpacity style={{position:'absolute', right:8}}
                            onPress={()=>{
                                Haptics.click()
                                setMasquerMdp((val)=>!val)
                            }}>
                                <Image
                                    source={masquerMdp?icones.afficher:icones.masquer}
                                    style={{height:24, width:24, opacity:mdp.length > 0 ? 1 : 0.4}}
                                    resizeMode='contain'
                                />
                        </TouchableOpacity>
                    </View> 
                    <View style={s.boutonConteneur}>
                        <TouchableOpacity 
                            style={[s.bouton,{borderWidth:1}]}
                            onPress={()=>{
                                setPseudo('')
                                setMdp('')
                            }}
                        >
                            <Text style={{color:colors.text, fontSize:18, fontFamily:fonts.body}}>annuler</Text>
                        </TouchableOpacity>     
                        <TouchableOpacity 
                            disabled={estDesactive}
                            style={[s.bouton,{backgroundColor:estDesactive?'transparent':colors.secondary}]}  
                            onPress={() => connecter()}
                        >
                        <Text style={{color:estDesactive?colors.muted:colors.text, fontSize:18, fontFamily:fonts.title}}>se connecter</Text>
                        </TouchableOpacity>   
                    </View> 
                    <View style={{ width:'100%', height:24, alignItems:'center', justifyContent:'space-evenly', gap:16}}>
                        <LinkAbs href={'/(auth)/register'}>
                            pas encore de compte?
                        </LinkAbs>
                        <TouchableOpacity
                            onPress={()=>{
                                log("push modal mdp oublie")
                            }}
                        >
                            <Text style={linkStyle.link}>
                                mot de passe oublié?
                            </Text>
                        </TouchableOpacity>
                        {MOCK_MODE_AVAILABLE &&
                            <TouchableOpacity
                                onPress={()=>setMockMode(true)}
                            >
                                <Text style={linkStyle.link}>
                                    mock mode
                                </Text>
                            </TouchableOpacity>
                        }
                    </View>  
                    
            </KeyboardAvoidingView>    
        </Pressable>        
        </View>              
    )
    
}

