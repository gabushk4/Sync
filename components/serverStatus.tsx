import { useFont } from '@/contextes/contexteFont';
import { usePalette } from '@/contextes/contextePalette';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import PingServeur from './pingServeur';

export default function ServerStatus() { 
    const { t } = useTranslation();
    const { colors } = usePalette();
    const { fonts } = useFont();

    const s = StyleSheet.create({
        container: {
            width: '100%',
            height: 32,
            marginTop: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        title: {
            color: colors.text,
            fontFamily: fonts.title
        },
        status: {
            height: '100%',
            width: 32,
        }
    });

    return (
        <View style={s.container}>
            <Text style={s.title}>{t('common:serverStatus')}{process.env.NODE_ENV == 'development'?` dev using remote {${process.env.EXPO_PUBLIC_USING_REMOTE}}`:''}</Text>
            <View style={s.status}>
                <PingServeur/>
            </View>
        </View>
    )
}