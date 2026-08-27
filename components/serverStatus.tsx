import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePalette } from '@/contextes/contextePalette';
import PingServeur from './pingServeur';
import { useAPI } from '@/contextes/contexteAPI';
import { useMembre } from '@/contextes/contexteMembre';
import { useFont } from '@/contextes/contexteFont';

export default function ServerStatus() { 
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
            <Text style={s.title}>Statut du serveur {process.env.NODE_ENV == 'development'?`dev using remote {${process.env.EXPO_PUBLIC_USING_REMOTE}}`:''}</Text>
            <View style={s.status}>
                <PingServeur/>
            </View>
        </View>
    )
}