import { router } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';

import Haptics from '@/abstractions/haptics.js';
import { createLinkStyles, LinkAbs } from '@/abstractions/linkAbs';
import TextInputAbs from '@/abstractions/textInputAbs';
import ToastAbs from '@/abstractions/toastAbs';

import ServerStatus from '@/components/serverStatus';

import { toastTypes } from '@/constants/toastConfig';

import { useAPI } from '@/contextes/contexteAPI';
import { useAuth } from '@/contextes/contexteAuth';
import { useFont } from '@/contextes/contexteFont';
import { usePalette } from '@/contextes/contextePalette';
import { useRouteAbs } from '@/contextes/contexteRoute';

import catcher from '@/functions/catcher';
import log from '@/functions/log.js';

export default function ConnexionEcran(){
    const { t } = useTranslation('auth')
    const largeur = Dimensions.get("window").width - 32
    const refMdp = useRef<TextInput>(null)
    const refPseudo = useRef<TextInput>(null)

    const colorsScheme = useColorScheme()

    const { colors } = usePalette()
    const { fonts } = useFont()

    const { api } = useAPI()
    const {ajouterEcran} = useRouteAbs()
    const { signIn } = useAuth()

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
                text1: t('login.welcome', { pseudo }),
            });
        } catch (error: any) {
            log('Erreur connexion:', error.message);
            catcher(error, t('errors.loginFailed'));
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
                        placeholder={t('login.usernamePlaceholder')} 
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
                            placeholder={t('login.passwordPlaceholder')}
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
                            <Text style={{color:colors.text, fontSize:18, fontFamily:fonts.body}}>{t('login.cancel')}</Text>
                        </TouchableOpacity>     
                        <TouchableOpacity 
                            disabled={estDesactive}
                            style={[s.bouton,{backgroundColor:estDesactive?'transparent':colors.secondary}]}  
                            onPress={() => connecter()}
                        >
                        <Text style={{color:estDesactive?colors.muted:colors.text, fontSize:18, fontFamily:fonts.title}}>{t('login.submit')}</Text>
                        </TouchableOpacity>   
                    </View> 
                    <View style={{ width:'100%', height:24, alignItems:'center', justifyContent:'space-evenly', gap:16}}>
                        <LinkAbs href={'/(auth)/register'}>
                            {t('login.noAccount')}
                        </LinkAbs>
                        <TouchableOpacity
                            // "Forgot password" sheet, in ModalBase (Philip — rectification).
                            onPress={() => router.push('/(auth)/mdpOublie' as any)}
                        >
                            <Text style={linkStyle.link}>
                                {t('login.forgotPassword')}
                            </Text>
                        </TouchableOpacity>
                    </View>  
                    
            </KeyboardAvoidingView>    
        </Pressable>
        </View>              
    )
    
}

