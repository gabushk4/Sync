import React from 'react'
import { TouchableOpacity, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import Toast from 'react-native-toast-message'
import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont'

type Props = {
    code: string;
    size?: number;
}

export default function MemberCode({ code, size = 16 } : Props) {
    const { colors } = usePalette()
    const { fonts } = useFont()
    
    return (
        <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}
            onPress={() => {
                Clipboard.setStringAsync(code)
                Toast.show({
                    type: 'persoSucces',
                    text1: 'ajouté au presse-papier',
                    text2: code
                })
            }}
        >
            <Text style={[{ fontSize: size, color: colors.muted, fontFamily: fonts.body }]}>#{code}</Text>
            <Ionicons name='copy' color={colors.muted}/>
        </TouchableOpacity>
    )
}