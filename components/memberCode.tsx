import ToastAbs from '@/abstractions/toastAbs'
import { toastTypes } from '@/constants/toastConfig'
import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import Icon from "@react-native-vector-icons/ionicons"
import * as Clipboard from 'expo-clipboard'
import { useTranslation } from 'react-i18next'
import { Text, TouchableOpacity } from 'react-native'

type Props = {
    code: string;
    size?: number;
}

export default function MemberCode({ code, size = 16 } : Props) {
    const { t } = useTranslation()
    const { colors } = usePalette()
    const { fonts } = useFont()
    
    return (
        <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}
            onPress={() => {
                Clipboard.setStringAsync(code)
                ToastAbs.show({
                    type: toastTypes.success,
                    text1: t('common:copiedToClipboard'),
                    text2: code
                })
            }}
        >
            <Text style={[{ fontSize: size, color: colors.muted, fontFamily: fonts.body }]}>#{code}</Text>
            <Icon name='copy' color={colors.muted}/>
        </TouchableOpacity>
    )
}