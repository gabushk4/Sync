// components/EvenementsListe.tsx
import { DateTime } from 'luxon'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { scrollTo, useAnimatedReaction, useAnimatedRef, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'

import { Event } from '@/types/calendar'

import ListItem from './listItem'

import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { useGestionScroll } from '@/contextes/contexteGestionListes'
import { useModal } from '@/contextes/contexteModals'
import { usePalette } from '@/contextes/contextePalette'
import { useTimeline } from '@/contextes/contexteTimeline'
import { useAccessToken } from '@/contextes/contexteToken'

import { findWidth, findLeft } from '@/functions/calculerDimensionsEvenements'

import log from '@/functions/log'
import { useEffect, useState } from 'react'
import FreeSlotItem from './freeSlotItem'

export type EventsListProps = {
    events?: Event[];
    eventsColor?: string;
    offsetSnap: number;
    listSize?: number | string;
    horizontal?: boolean;
    textColor?: string;
    getEvenements: (refresh?: boolean) => void;
    displayedDate?: DateTime;
    commonFreeSlots: any[] | undefined;
    owner: any
}

export default function EventsList({
    events = [],
    eventsColor,
    offsetSnap,
    listSize,
    horizontal = false,
    textColor,
    getEvenements,
    displayedDate,
    commonFreeSlots,
    owner
}: EventsListProps) {
    const { offset } = useGestionScroll()
    const { pxHeures, L_HEURES, H_HEURES } = useTimeline()
    const { colors } = usePalette()

    const scrollViewRef = useAnimatedRef<Animated.ScrollView>()
    const listOffset = useSharedValue(0)

    useAnimatedReaction(
        () => offset.value,
        (offset) => {
            scrollTo(scrollViewRef, horizontal ? offset : 0, horizontal ? 0 : offset, false)
        }
    )

    useEffect(() => {
        
    }, [events])

    const s = StyleSheet.create({
        styleListe: {
            ...(horizontal
                ? { height: typeof listSize === 'number' ? listSize : undefined, width: '100%', paddingVertical:8 }
                : { width: '100%', paddingHorizontal:8 }
            ) 
        },
        containerStyle: {
            flex: 1, 
            ...(horizontal 
                ? {}
                : {
                    ...(
                        typeof listSize === 'number'
                            ? { width: listSize }
                            : {}
                    )
                }
            )
        },
        
        
    })    

    return (
        <Animated.ScrollView
            horizontal={horizontal}
            style={s.styleListe}
            contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={offsetSnap}
            scrollEventThrottle={16}
            ref={scrollViewRef}
            onLayout={() => {
                const now = DateTime.now()
                offset.value = now.hour * (pxHeures + L_HEURES)
            }}
        >
            <View
            style={{
                position: 'relative',
                width: horizontal ? 24 * (pxHeures + L_HEURES) : '100%',
                height: horizontal ? '100%' : 24 * (pxHeures + H_HEURES),
            }}
            >
                {events.map((item) => 
                    <ListItem
                        key={item.id}
                        event={item}
                        horizontal={horizontal}
                        displayedDate={displayedDate}
                        listOffset={offset}
                        eventsColor={eventsColor}                        
                    />
                )}
                {commonFreeSlots?.map((freeSlot, index) => 
                    <FreeSlotItem key={`${freeSlot.start}-${freeSlot.end}`} freeSlot={freeSlot} displayedDate={displayedDate} horizontal={horizontal} listOffset={offset} owner={owner}/>
                )}
            </View>
        </Animated.ScrollView>
    )
}
