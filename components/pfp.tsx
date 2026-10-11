import { Image, ImageSourcePropType, StyleSheet, useColorScheme, View, ViewStyle } from "react-native";
import { FPType } from "@/types/pfp";
import { usePalette } from "@/contextes/contextePalette";
import { useEffect, useState } from "react";
import { useAPI } from "@/contextes/contexteAPI";


type Props = {
    size: number,
    pfp: FPType,
    style?: ViewStyle
}

export default function ProfilPic({ size, pfp, style}: Props) {
    const { colors } = usePalette()
    const {APIBaseURL} = useAPI()
    const colorScheme = useColorScheme()
    
    const icones = {
        pfpDefault: colorScheme === 'dark' ? require('@/assets/icones/profil-dark-icon.png') : require('@/assets/icones/profil-light-icon.png')
    }

    const [source, setSource] = useState<ImageSourcePropType>()

    useEffect(() => {
    if (!pfp || pfp === 'null' || pfp === 'undefined') {
        setSource(icones.pfpDefault)
    }
    else if (typeof pfp === 'string') {
        setSource({ uri: `${APIBaseURL}${pfp}` })
    }
    else {
        setSource({ uri: pfp?.uri })
    }
}, [pfp])
    
    const s = StyleSheet.create({
        imageContainer: {
            height: size,
            width:size,
            borderRadius: 100,
            borderWidth: 1, 
            borderColor: colors.border,
            overflow:'hidden'
        },
        image: {
            height: '100%',
            width: '100%'
        }
    })

    return (
        <View style={[s.imageContainer, style]}>
            <Image
                style={s.image}
                source={source}
            />
        </View>
    )
}
