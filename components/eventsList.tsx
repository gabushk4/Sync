// components/EvenementsListe.tsx
import { DateTime } from 'luxon'
import { StyleSheet, View } from 'react-native'
import Animated, { scrollTo, useAnimatedReaction, useAnimatedRef } from 'react-native-reanimated'

import { Event } from '@/types/calendar'

import ListItem from './listItem'

import { useGestionScroll } from '@/contextes/contexteGestionListes'
import { useTimeline } from '@/contextes/contexteTimeline'

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
    timelineDays?: number;
}

/**
 * One timeline row: a horizontal (or vertical) strip holding the loaded timeline
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
    timelineDays = 1,
}: EventsListProps) {
    const { offset } = useGestionScroll()
    const { pxHeures, L_HEURES, H_HEURES } = useTimeline()

    const scrollViewRef = useAnimatedRef<Animated.ScrollView>()

    useAnimatedReaction(
        () => offset.value,
        (offset) => {
            scrollTo(scrollViewRef, horizontal ? offset : 0, horizontal ? 0 : offset, false)
        }
    )

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
        >
            <View
            style={{
                position: 'relative',
                width: horizontal ? timelineDays * 24 * (pxHeures + L_HEURES) : '100%',
                height: horizontal ? '100%' : timelineDays * 24 * (pxHeures + H_HEURES),
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
                        timelineDays={timelineDays}
                        listOffset={offset}
                        eventsColor={eventsColor}
                        onPress={onPressEvenement}
                    />
                )}
                {commonFreeSlots?.map((freeSlot, index) => 
                    <FreeSlotItem key={`${freeSlot.start}-${freeSlot.end}`} freeSlot={freeSlot} displayedDate={displayedDate} horizontal={horizontal} listOffset={offset} owner={owner} timelineDays={timelineDays}/>
                )}
            </View>
        </Animated.ScrollView>
    )
}
