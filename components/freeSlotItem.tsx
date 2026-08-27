import { usePalette } from "@/contextes/contextePalette";
import { useTimeline } from "@/contextes/contexteTimeline";

import { findLeft, findWidth } from "@/functions/calculerDimensionsEvenements";

import { useFont } from "@/contextes/contexteFont";
import log from "@/functions/log";
import { router } from "expo-router";
import { DateTime } from "luxon";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";

type Props = {
    freeSlot: any;
    displayedDate?: DateTime;
    horizontal: boolean;
    listOffset: SharedValue<number>
    owner: any
}

export default function FreeSlotItem({ freeSlot, displayedDate, horizontal, listOffset, owner }: Props) {
    const { colors } = usePalette()
    const {fonts} = useFont()
    const { pxHeures, H_HEURES, L_HEURES } = useTimeline()
    
    const left = horizontal
                    ? findLeft(freeSlot.start, freeSlot.end, displayedDate as DateTime, pxHeures + L_HEURES)
        : 0
    const top = horizontal
                    ? 0
        : findLeft(freeSlot.start, freeSlot.end, displayedDate as DateTime, pxHeures + H_HEURES)
    const height = horizontal
                    ? '100%'
        : findWidth(freeSlot.start, freeSlot.end, displayedDate, pxHeures + H_HEURES)
    const width = horizontal 
                    ? findWidth(freeSlot.start, freeSlot.end, displayedDate, pxHeures + L_HEURES)
        : '100%'
    
    const [freeSlotTextWidth, setFreeSlotTextWidth] = useState<number>(0)
    const [freeSlotTextHeight, setFreeSlotTextHeight] = useState<number>(0)

    const textAnimated = useAnimatedStyle(() => ({
            ...(horizontal
                ? { left: Math.min(Math.max((listOffset.value - left) + pxHeures, pxHeures), width as number - (freeSlotTextWidth + pxHeures)) }
                : { top: Math.min(Math.max((listOffset.value - top) + pxHeures, pxHeures), height as number - (freeSlotTextHeight + pxHeures)) })
        }))
    const s = StyleSheet.create({
        freeSlot:{
            borderWidth: 1, 
            borderRadius:8,
            borderColor: colors.success,
            alignItems: 'center',
            justifyContent: 'center',            
        },
        title: {
            fontFamily: fonts.title,
            fontSize: 16,
            color: colors.text,
            flexWrap: 'wrap',
            textAlign: 'center',
            position:'absolute'
        },
    })
    //log('free slot', freeSlot)
    return (
        <TouchableOpacity
            key={`fs${freeSlot.start}-${freeSlot.end}`}
            style={[s.freeSlot, {
                position: 'absolute',
                left: left,
                top: top,
                height: height,
                width: width,
                
            }]}
            onPress={() => {
                //TODO: go to create with owner.id and start and end values passed 
                
                log("common free slot with", owner)
                router.push({
                    pathname: '/(tabs)/home/create',
                    params: {
                        start: freeSlot.start,
                        end: freeSlot.end,
                        friend:[JSON.stringify(owner)]
                    }
                })
            }}
        >
            <Animated.Text style={[textAnimated, s.title, { color: colors.muted }]}
                onLayout={(e) => {
                    setFreeSlotTextWidth(e.nativeEvent.layout.width)
                    setFreeSlotTextHeight(e.nativeEvent.layout.height)
                }}
            >
                Dispo commune {'\n'} +
            </Animated.Text>
        </TouchableOpacity>
    )
}