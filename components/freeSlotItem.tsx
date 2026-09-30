import { usePalette } from "@/contextes/contextePalette";
import { useTimeline } from "@/contextes/contexteTimeline";

import { findLeft, findWidth } from "@/functions/calculerDimensionsEvenements";

import { useFont } from "@/contextes/contexteFont";
import log from "@/functions/log";
import { router } from "expo-router";
import { DateTime } from "luxon";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import Animated, { SharedValue } from "react-native-reanimated";
import useTimelineLabelOffset from "@/hooks/useTimelineLabelOffset";

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

    const LABEL_W = 96
    const itemSize = (horizontal ? width : height) as number
    const labelSize = Math.min(LABEL_W, itemSize)   
    
    const textAnimated = useTimelineLabelOffset({
        axis: horizontal ? 'x' : 'y',
        itemOffset: horizontal ? left : top,
        itemSize,
        labelSize,
        listOffset,
        inset: pxHeures,
        centerThreshold: 2 * (pxHeures + (horizontal ? L_HEURES : H_HEURES)),
        timelineLength: 24 * (pxHeures + (horizontal ? L_HEURES : H_HEURES)),
    })
    
    const s = StyleSheet.create({
        freeSlot:{
            borderWidth: 1, 
            borderRadius:8,
            borderColor: colors.success,
            alignItems: 'center',
            justifyContent: 'center',    
            overflow:'hidden'
        },
        label: {
            position: 'absolute',
            left: 0, top: 0,                       // ancré, c'est transform qui déplace
            alignItems: 'center',
            justifyContent: 'center',
            ...(horizontal
                ? { width: labelSize, height: '100%' }
                : { height: labelSize, width: '100%' }),
        },
        title: {
            fontFamily: fonts.title,
            fontSize: 16,
            color: colors.text,
            flexWrap: 'wrap',
            textAlign: 'center',
            maxWidth: horizontal ? width as number : '100%',
            ...(horizontal
                ? {}
                : { maxHeight: height as number }),
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
            <Animated.View
                style={[textAnimated, s.label]}                
            >
                <Text
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                    style={[s.title, { color: colors.muted }]}
                >
                    Dispo commune {'\n'} +
                </Text>
            </Animated.View>
        </TouchableOpacity>
    )
}