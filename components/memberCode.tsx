import React from 'react'
import { TouchableOpacity, Text } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import Toast from 'react-native-toast-message'
import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont'
import Icon from "@react-native-vector-icons/ionicons";
import ToastAbs from '@/abstractions/toastAbs'
import { toastTypes } from '@/constants/toastConfig'

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
                ToastAbs.show({
                    type: toastTypes.success,
                    text1: 'ajouté au presse-papier',
                    text2: code
                })
            }}
        >
            <Text style={[{ fontSize: size, color: colors.muted, fontFamily: fonts.body }]}>#{code}</Text>
            <Icon name='copy' color={colors.muted}/>
        </TouchableOpacity>
    )
}