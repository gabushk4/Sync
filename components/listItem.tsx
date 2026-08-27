import React, { useState, useRef } from 'react'
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import Animated, {SharedValue, useAnimatedStyle} from 'react-native-reanimated'
import { findWidth, findLeft } from '@/functions/calculerDimensionsEvenements'
import { convertirTimestampDateCourte, convertirTimestampHeure } from '@/functions/convertirTimestamp'
import { DateTime } from 'luxon'
import { useTimeline } from '@/contextes/contexteTimeline'
import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import { Event } from '@/types/calendar'
import EventBloc from './eventBloc'
import { router } from 'expo-router'

type Props = {
    event: Event;
    horizontal: boolean;
    displayedDate?: DateTime;
    listOffset: SharedValue<number>;
    eventsColor?: string;
    textColor?: string;
}

export default function ListItem({ event, horizontal, displayedDate, listOffset, eventsColor, textColor }:Props) {
    const { fonts } = useFont()
    const { colors } = usePalette()
    const { L_HEURES, H_HEURES, pxHeures } = useTimeline()  
    
    const maxTimelineLength = horizontal ? 24 * (pxHeures + L_HEURES)
        : 24 * (pxHeures * H_HEURES)
    
    const [textWidth, setTextWidth] = useState(0)
    const [textHeight, setTextHeight] = useState(0)
    const [width, setWidth] = useState(0)
    const [height, setHeight] = useState(0)

    if (!event?.debut || !event?.fin) return null

    const surPlusieursJours =
        event.fin.startOf('day').diff(event.debut.startOf('day'), 'days').toObject().days! > 0
    
    let startText = convertirTimestampHeure(event.debut)
    let endText = convertirTimestampHeure(event.fin)

    if (surPlusieursJours) {
        if (displayedDate && displayedDate.day !== event.debut.day)
            startText = `${convertirTimestampDateCourte(event.debut)} ${convertirTimestampHeure(event.debut)}`
        if (displayedDate && displayedDate.day !== event.fin.day)
            endText = `${convertirTimestampDateCourte(event.fin)} ${convertirTimestampHeure(event.fin)}`
    }

    const left = horizontal
                    ? findLeft(event.debut, event.fin, displayedDate as DateTime, pxHeures + L_HEURES)
        : 0
    const top = horizontal
                    ? 0
        : findLeft(event.debut, event.fin, displayedDate as DateTime, pxHeures + H_HEURES)
    
    const eventWidth = findWidth(event.debut, event.fin, displayedDate, pxHeures + L_HEURES)
    
    const blocHeight = horizontal ? '100%' : findWidth(event.debut, event.fin, displayedDate, pxHeures + H_HEURES)
    const blocWidth = horizontal ? eventWidth > pxHeures ? eventWidth : pxHeures : '100%'

    const textAnimated = useAnimatedStyle(() => {
        if (horizontal) {
            const maxLocal = Math.min(
                (blocWidth as number) - (textWidth + pxHeures),       // ne pas dépasser la droite du bloc
                maxTimelineLength - left - (textWidth + pxHeures)           // ne pas dépasser la fin de la timeline
            )
            return { left: Math.min(Math.max((listOffset.value - left) + pxHeures, pxHeures), maxLocal) }
        } else {
            const maxLocal = Math.min(
                (blocHeight as number) - (textHeight + pxHeures),
                maxTimelineLength - top - (textHeight + pxHeures)
            )
            return { top: Math.min(Math.max((listOffset.value - top) + pxHeures, pxHeures), maxLocal) }
        }
    })

    const s = StyleSheet.create({
        title: {
            fontFamily: fonts.title,
            fontSize: 16,
            color: colors.text,
            flexWrap: 'wrap',
            textAlign: 'center',            
        },
        hour: {           
            fontFamily: fonts.number,
            color: textColor ?? colors.text,
            fontSize: 14,
            textAlign:'center'
        }
    })

    //3console.log('DEBUG event', event.titre, { left, top, blocWidth, blocHeight, width, height, listeOffsetValue: listOffset.value })

    return (
        <TouchableOpacity
            key={event.id}
            style={{
                position: 'absolute',
                left,
                top,
                width: blocWidth,
                height: blocHeight,
                minWidth: pxHeures,
            }}
            onPress={() => {
                        if (event.debut && event.fin)
                            router.navigate({ pathname: '/(tabs)/home/details/[eventId]', params: { eventId: event.id as string, start: event.debut.toISO(), end: event.fin.toISO() } })
                    }}
            onLayout={(e) => {
                if (horizontal) setWidth(e.nativeEvent.layout.width)
                else setHeight(e.nativeEvent.layout.height)
            }}
        >
            <View style={{ position: 'relative', width: blocWidth, height: blocHeight }}>
                <EventBloc
                    event={event}
                    blockColor={eventsColor}
                    horizontal={horizontal}
                    displayDate={displayedDate as DateTime}
                />
                <Animated.View
                    style={[
                        textAnimated,
                        {
                            position: 'absolute',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            ...(horizontal
                                ? { minWidth: pxHeures, width:'100%', maxWidth: pxHeures * 3, alignItems: 'center', height: '100%' }
                                : { minHeight: pxHeures, height:'100%', maxHeight: pxHeures * 3, width: '100%', alignItems: 'center' }),
                        },
                    ]}
                    onLayout={(e) => {
                        setTextWidth(e.nativeEvent.layout.width)
                        setTextHeight(e.nativeEvent.layout.height)
                    }}
                >
                    <Text style={s.hour}>{startText}</Text>
                    <Text numberOfLines={2} ellipsizeMode='tail' style={s.title}>{event.titre}</Text>
                    <Text style={s.hour}>{endText}</Text>
                </Animated.View>
            </View>
        </TouchableOpacity>
    )
}