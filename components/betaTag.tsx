import React from "react"
import { View, Text, useColorScheme, StyleSheet } from "react-native"
import { usePalette } from '@/contextes/contextePalette'
import { useFont } from '@/contextes/contexteFont' 

export default function BetaTag({ }) {
    
    const colorScheme = useColorScheme()
    const { colors } = usePalette()
    const { fonts } = useFont()  
    
    const s = StyleSheet.create({
        container: {
            backgroundColor: colors.muted,
            padding: 4,
            borderRadius: 4,
            width: 43
        },
        text: {
            color: colors.primary,
            fontFamily: fonts.body,
            fontSize: 16
        }
    })
    
    //TODO: Make on touch pops an about page 
    return (
        <View style={s.container}>
            <Text style={s.text}>Beta</Text>
        </View>
    )
}