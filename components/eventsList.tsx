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

/** Inset of a horizontal row's blocks (top and bottom); the home screen's profile column uses it too. */
export const RETRAIT_RANGEE = 8

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
    /** Replaces the default tap on an event (open its details). */
    onPressEvenement?: (event: Event) => void;
    /** Scroll every row to the current hour on first layout (default). The
     * invitation review screen scrolls to the event's hour itself. */
    defilerMaintenant?: boolean;
}

/**
 * One timeline row: a horizontal (or vertical) strip 24 hours long holding the
 * owner's events (ListItem) and, for a friend's row, the free slots shared
 * with the member. The strip isn't scrolled directly: it follows the shared
 * scroll offset of the home screen, so every row stays aligned on the hours.
 * Updated for user story 9 (unique keys, skips empty entries).
 * SUBJECT TO CHANGE: may be revised depending on how teammates implement their own user stories.
 *
 * @param {EventsListProps} props
 * @param {Event[]} [props.events] - Events to place on the row (local DateTimes).
 * @param {string} [props.eventsColor] - Block color (member's row); blurred blocks when omitted.
 * @param {number} props.offsetSnap - Width of one hour, for snapping.
 * @param {number | string} [props.listSize] - Row height (horizontal) or width (vertical).
 * @param {boolean} [props.horizontal=false] - Lay hours out left to right.
 * @param {string} [props.textColor] - Color of the events' labels.
 * @param {(refresh?: boolean) => void} props.getEvenements - Refetches the row's events.
 * @param {DateTime} [props.displayedDate] - Day the row shows.
 * @param {any[] | undefined} props.commonFreeSlots - Free slots shared with the member (friends' rows).
 * @param {any} props.owner - Member whose events these are.
 * @param {(event: Event) => void} [props.onPressEvenement] - Replaces the default tap on an event.
 * @param {boolean} [props.defilerMaintenant=true] - Scroll to the current hour on first layout.
 * @author Philip Kvaratshelya — user story 8: onPressEvenement / defilerMaintenant
 *   (invitation review screen)
 * @returns {JSX.Element}
 */
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
    owner,
    onPressEvenement,
    defilerMaintenant = true,
}: EventsListProps) {
    const { offset, initialiserOffset } = useGestionScroll()
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
                ? { height: typeof listSize === 'number' ? listSize : undefined, width: '100%', paddingVertical: RETRAIT_RANGEE }
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
                if (!defilerMaintenant) return
                const now = DateTime.now()
                // Also records "now" for the "back to today / now" tab (it stayed at
                // midnight). Rectification (Philip Kvaratshelya) for a more conventional display.
                initialiserOffset(now.hour * (pxHeures + L_HEURES), false)
            }}
        >
            <View
            style={{
                position: 'relative',
                width: horizontal ? 24 * (pxHeures + L_HEURES) : '100%',
                height: horizontal ? '100%' : 24 * (pxHeures + H_HEURES),
            }}
            >
                {events.filter(Boolean).map((item) =>
                    <ListItem
                        // Occurrences of a recurring event share the parent's id: the start
                        // makes each key unique (duplicate keys could drop/mix up blocks).
                        key={`${item.id}-${item.debut?.toMillis?.() ?? ''}`}
                        event={item}
                        horizontal={horizontal}
                        displayedDate={displayedDate}
                        listOffset={offset}
                        eventsColor={eventsColor}
                        onPress={onPressEvenement}
                    />
                )}
                {commonFreeSlots?.map((freeSlot, index) => 
                    <FreeSlotItem key={`${freeSlot.start}-${freeSlot.end}`} freeSlot={freeSlot} displayedDate={displayedDate} horizontal={horizontal} listOffset={offset} owner={owner}/>
                )}
            </View>
        </Animated.ScrollView>
    )
}
