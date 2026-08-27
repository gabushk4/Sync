import TextInputAbs from "@/abstractions/textInputAbs";
import ProfilPic from "@/components/pfp";
import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { useMembre } from "@/contextes/contexteMembre";
import { usePalette } from "@/contextes/contextePalette";
import catcher from "@/functions/catcher";
import ChoisirImage from '@/functions/choisirImage';
import log from "@/functions/log";
import { useActionFab } from "@/hooks/useActionFAB";
import { FPType } from "@/types/pfp";
import { useState } from "react";
import { Image, ImageSourcePropType, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from "react-native";

export default function EditProfil() {
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()
    const { patchProfil, membre } = useMembre()
    const { APIBaseURL } = useAPI()

    const icones = {
        camera:colorScheme === 'dark' ?require('@/assets/icones/camera-dark-icon.png'):require('@/assets/icones/camera-light-icon.png'),        
        profilDef:colorScheme === 'dark' ?require('@/assets/icones/profil-dark-icon.png'):require('@/assets/icones/profil-light-icon.png'),
    }

    const [pseudo, setPseudo] = useState<string>(membre.pseudo ?? '')
    const [bio, setBio] = useState<string>(membre.bio ?? '')
    const [fpSource, setFpSource] = useState<FPType>(membre.fp ? { uri: `${membre.fp}` } : icones.profilDef)

    const verifierAvantPatch = async () =>{
        log('verif avant patch: fpSource' , fpSource)
        let pseudoNouv: string | undefined = undefined
        let bioNouv: string | undefined = undefined
        let fpNouv: FPType | undefined = undefined

        if(pseudo !== membre.pseudo) pseudoNouv = pseudo
        if(bio !== membre.bio) bioNouv = bio

        // determine if fpSource is an object with uri
        const maybeUri = (fpSource as any)?.uri
        if(maybeUri && maybeUri !== `${APIBaseURL}${membre.fp}`) fpNouv = fpSource as FPType
        else if (fpSource !== icones.profilDef && typeof fpSource === 'string') fpNouv = fpSource as FPType
        try {
            await patchProfil(pseudoNouv, bioNouv, fpNouv)    
        } catch (err) {
            catcher(err, "impossible de modifier le profil")
        }        
    }

    const pickImage = async () => {
        await ChoisirImage((img) => {
            setFpSource({ uri: img.uri, mimeType: img.type, fileName: img.fileName })
        })
    }

    useActionFab({
        action: verifierAvantPatch,
        icon: undefined
    })

    const s = StyleSheet.create({
        container: { flex: 1, padding: 16 },
        header: { fontSize: 20, fontFamily: fonts.title, color: colors.text, marginBottom: 12 },
        avatarWrap: { alignItems: 'center', marginVertical: 8 },
        avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.primary },
        cameraBtn: { position: 'absolute', right: 10, bottom: 0, backgroundColor: colors.secondary, padding: 8, borderRadius: 20 },
        label: { color: colors.muted, marginTop: 12, marginBottom: 6, fontFamily: fonts.body },
        input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.text, fontFamily: fonts.body },
        bioInput: { height: 120, textAlignVertical: 'top' },
        actions: { flexDirection: 'row', gap: 8, marginTop: 16, justifyContent: 'space-between' },
        button: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
        saveBtn: { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.border },
        cancelBtn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
        separator: {
            height: 1, 
            width: '90%',
            backgroundColor: colors.border,
            alignSelf: 'center',
            marginTop: 8,
            marginBottom:8
        }
    })

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
            <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps='handled'>
                <View style={s.avatarWrap}>
                    <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                        <ProfilPic size={s.avatar.width} pfp={fpSource} style={s.avatar}/>
                        <View style={s.cameraBtn}>
                            <Image source={icones.camera} style={{width:20,height:20}} />
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={s.separator}/>
                <Text style={s.label}>pseudo</Text>
                <TextInputAbs
                    value={pseudo}
                    onChangeText={setPseudo}
                    style={s.input}
                    placeholder="pseudo"                
                />

                <Text style={s.label}>bio</Text>
                <TextInputAbs
                    value={bio}
                    onChangeText={setBio}
                    style={[s.input, s.bioInput]}
                    multiline
                    placeholder="quelques mots sur toi"                    
                />

                
            </ScrollView>
        </KeyboardAvoidingView>
    )
}