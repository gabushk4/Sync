import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import { useTimeline } from '@/contextes/contexteTimeline'
import { convertirTimestampDateCourte, convertirTimestampHeure } from '@/functions/convertirTimestamp'
import { Event } from '@/types/calendar'
import Icon from '@react-native-vector-icons/ionicons'
import ouvrirDetailsEvenement from '@/functions/ouvrirDetailsEvenement'
import { DateTime } from 'luxon'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import Animated, { SharedValue } from 'react-native-reanimated'
import useTimelineLabelOffset from '@/hooks/useTimelineLabelOffset'
import { positionHeures } from '@/functions/positionTimeline'
import EventBloc from './eventBloc'

type Props = {
    event: Event;
    horizontal: boolean;
    displayedDate?: DateTime;
    listOffset: SharedValue<number>;
    eventsColor?: string;
    /** Replaces the default tap (open the event's details). */
    onPress?: (event: Event) => void;
    textColor?: string;
    timelineDays?: number;
}

/** Inner padding between the block's border and its text. */
const PAD = 6

/**
 * One event on a timeline row, positioned from its start/end on the displayed
 * day. Its label (start time, title, end time) sticks to the visible edge while
 * the row scrolls, without ever leaving the block. Tapping it opens the event's
 * details (with each participant's answer — user story 9).
 * Layout reworked with user story 9: the label's max offset was computed as
 * `blockWidth - (labelWidth + pxHeures)` with a label as wide as the block, so it
 * was always negative and the label sat half outside any event shorter than ~3h.
 * SUBJECT TO CHANGE: may be revised depending on how teammates implement their own user stories.
 *
 * @param {Props} props
 * @returns {JSX.Element | null}
 */
export default function ListItem({ event, horizontal, displayedDate, listOffset, eventsColor, textColor, onPress, timelineDays = 1 }:Props) {
    const { fonts } = useFont()
    const { colors } = usePalette()
    const { L_HEURES, H_HEURES, pxHeures } = useTimeline()

    const debut = event?.debut
    const fin = event?.fin
    const valide = !!debut && !!fin && !!displayedDate

    const heureOffset = horizontal ? pxHeures + L_HEURES : pxHeures + H_HEURES
    const windowStart = displayedDate?.startOf('day')
    const windowEnd = windowStart?.plus({ days: timelineDays })
    const visibleStart = windowStart && debut ? (debut > windowStart ? debut : windowStart) : undefined
    const visibleEnd = windowEnd && fin ? (fin < windowEnd ? fin : windowEnd) : undefined
    // Shared with FreeSlotItem / TrousHoraire (Philip — user story 20).
    const position = (date: DateTime) => positionHeures(date, windowStart!)
    const left = valide && horizontal && visibleStart
        ? position(visibleStart) * heureOffset : 0
    const top = valide && !horizontal && visibleStart
        ? position(visibleStart) * heureOffset : 0
    // Clip event blocks at the loaded window edges while preserving their actual
    // timestamps for labels and event details.
    const taille = valide && visibleStart && visibleEnd
        ? Math.max((position(visibleEnd) - position(visibleStart)) * heureOffset, pxHeures) : 0
    const longueurTimeline = timelineDays * 24 * heureOffset

    // Label size along the scroll axis: at most 3 hours wide, never wider than the block.
    const tailleTexte = Math.max(Math.min(taille - 2 * PAD, pxHeures * 3), 0)
    const depart = horizontal ? left : top

    // Hooks must run on every render, so this sits before the early return below.
    // Label position while the row scrolls: Gabriel's shared timeline logic
    // (useTimelineLabelOffset, also used by FreeSlotItem) — sticks to the visible
    // edge, stays inside the block, and centers the label on short events.
    const texteAnime = useTimelineLabelOffset({
        axis: horizontal ? 'x' : 'y',
        itemOffset: depart,
        itemSize: taille,
        labelSize: tailleTexte,
        listOffset,
        inset: pxHeures,
        timelineLength: longueurTimeline,
    })

    if (!valide) return null

    if (!visibleStart || !visibleEnd || visibleEnd <= visibleStart) return null

    const surPlusieursJours = fin.startOf('day').diff(debut.startOf('day'), 'days').toObject().days! > 0

    let startText = convertirTimestampHeure(debut)
    let endText = convertirTimestampHeure(fin)
    if (surPlusieursJours) {
        if (displayedDate.day !== debut.day)
            startText = `${convertirTimestampDateCourte(debut)} ${convertirTimestampHeure(debut)}`
        if (displayedDate.day !== fin.day)
            endText = `${convertirTimestampDateCourte(fin)} ${convertirTimestampHeure(fin)}`
    }

    const couleurTexte = textColor ?? colors.text

    const s = StyleSheet.create({
        bloc: {
            position: 'absolute',
            left,
            top,
            ...(horizontal ? { width: taille, height: '100%' } : { height: taille, width: '100%' }),
        },
        texte: {
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'space-between',
            ...(horizontal
                ? { width: tailleTexte, top: PAD, bottom: PAD }
                : { height: tailleTexte, left: PAD, right: PAD }),
        },
        heure: {
            fontFamily: fonts.number,
            color: couleurTexte,
            fontSize: 12,
            opacity: 0.8,
        },
        titre: {
            fontFamily: fonts.title,
            fontSize: 15,
            color: couleurTexte,
            textAlign: 'center',
        },
    })

    return (
        <TouchableOpacity
            style={s.bloc}
            activeOpacity={0.7}
            // Same navigation as the month calendar's events list (user story 5, Philip).
            // `onPress` / `cliquable` / `couleur`: overrides of the invitation review
            // screen (Philip — user story 8).
            disabled={event.cliquable === false}
            onPress={() => onPress ? onPress(event) : ouvrirDetailsEvenement({ id: event.id, debut, fin })}
        >
            <EventBloc event={event} blockColor={event.couleur ?? eventsColor} horizontal={horizontal} displayDate={displayedDate} />
            <Animated.View style={[s.texte, texteAnime]}>
                <Text style={s.heure} numberOfLines={1}>{startText}</Text>
                {event.titre
                    ? <Text style={s.titre} numberOfLines={2} ellipsizeMode="tail">{event.titre}</Text>
                    // Private friend event: the API hides its title.
                    : <Icon name="lock-closed" color={couleurTexte} size={14} />}
                <Text style={s.heure} numberOfLines={1}>{endText}</Text>
            </Animated.View>
        </TouchableOpacity>
    )
}
