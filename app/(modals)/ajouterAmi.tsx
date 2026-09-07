import ModalBase from "@/components/modalBase";
import { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFont } from '@/contextes/contexteFont';
import { useMembre } from "@/contextes/contexteMembre";
import { usePalette } from "@/contextes/contextePalette";

import log from "@/functions/log";

import QRCodeAbs from "@/abstractions/QrCodeAbs";
import AddFriendForm from "@/components/addFriendForm";
import DemandeConfirmerCourriel from "@/components/demandeConfirmerCourriel";
import { useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native-gesture-handler";
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Haptics from "@/abstractions/haptics";


const PAGES_DEF = [
    {
        id: 'addFriend',
        title: 'ajouter un ami',
        page: <AddFriendForm/>
    },
    {
        id: 'qrCode',
        title: 'mon code QR',
        page: <QRCodeAbs/>
    }
]

export default function ajouterAmi() {
    const { colors } = usePalette();
    const { fonts } = useFont();    
    const { membre, getMembre } = useMembre();
    const insets = useSafeAreaInsets();
    

    const { contexte } = useLocalSearchParams()    

    const { width: WIN_W } = Dimensions.get('window')
    const PAGE_W = WIN_W - 34 //padding applied by Modal Base

    const scrollViewRef = useRef<ScrollView>(null)

    const [pages, setPages] = useState<Array<any>>(PAGES_DEF)
    
    const contentOffset = useSharedValue(0)
    const tabIndex = useSharedValue(0)

    const animatedTab = useAnimatedStyle(() => {
        return {
            left: interpolate(contentOffset.value, [0, WIN_W], [0, WIN_W/2])
        }
    })

    const s = StyleSheet.create({
        page: {
            ...StyleSheet.absoluteFill,
            justifyContent: 'space-evenly',
            width: PAGE_W,
            alignItems: 'center',
            height:'100%'
        },
        title: {
            color: colors.text,
            fontSize: 20,
            letterSpacing: 0.7,
            fontFamily: fonts.title,
            textAlign:'center'
        },
        tab: {
            position: 'absolute',
            backgroundColor: colors.secondary,
            opacity: 0.5,
            width: '50%',
            height: '112%',
            borderRadius: 16,
            left: 0
        }
    })

    useEffect(() => {
        log("contexte", contexte)
        if (contexte === 'qrCode') {
            // don't mutate the original PAGES_DEF (reverse() mutates in-place)
            setPages([...PAGES_DEF].reverse())
        } else {
            // set a fresh copy so React sees a new reference and re-renders
            setPages([...PAGES_DEF])
        }
    }, [contexte])

    useEffect(() => {
        log('email confirme', membre.emailConfirme);
        if (!membre.emailConfirme)
            getMembre()
    }, [membre.emailConfirme]);

    return membre.emailConfirme ? (
        <ModalBase>
            <View style={{ flex: 1, gap: 4, paddingBottom: insets.bottom }}>
                <View style={{ position:'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8, }}>
                    <Animated.View style={[s.tab, animatedTab]}/>
                    {pages.map((p, index) => 
                        <TouchableOpacity
                            key={"tab"+index}
                            style={{width: '50%',}}
                            onPress={() => {
                                Haptics.clickLeger()
                                scrollViewRef.current?.scrollTo({x: WIN_W * index})
                            }}
                        >
                            <Animated.Text key={index} style={s.title}>{p.title}</Animated.Text>
                        </TouchableOpacity>
                    )}
                </View>
                <ScrollView
                    ref={scrollViewRef}    
                    horizontal={true}
                    contentContainerStyle={{height:'90%', width: PAGE_W * 2, gap: 16 }}
                    snapToInterval={PAGE_W}
                    decelerationRate={'fast'}
                    showsHorizontalScrollIndicator={false}
                    onScroll={(e) => {
                        contentOffset.value = e.nativeEvent.contentOffset.x
                    }}
                    onMomentumScrollEnd={(e) => {
                        console.log("ended", e.nativeEvent.contentOffset)
                    }}
                >
                    {pages.map((p, index) =>
                        <View key={index} style={[s.page, {left:PAGE_W* index}]}>
                            {p.page}
                        </View>
                    )}                    
                </ScrollView>
            </View>
        </ModalBase>
    ) : (
        <ModalBase>
            <DemandeConfirmerCourriel intro="avant d'envoyer des demandes d'amis" />
        </ModalBase>
    );
}
