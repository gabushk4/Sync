import React, { useEffect, useRef } from "react"
import { Text, View } from "react-native"
import Animated, { scrollTo, useAnimatedReaction, useAnimatedRef } from "react-native-reanimated"

import { useFont } from "@/contextes/contexteFont"
import { usePalette } from '@/contextes/contextePalette'
import { useTimeline } from "@/contextes/contexteTimeline"
import { useGestionScroll } from "../contextes/contexteGestionListes"
import { DateTime } from "luxon"


const heures = [
    { id: "T0", heure: "0:00" },
    { id: "T1", heure: "1:00" },
    { id: "T2", heure: "2:00" },
    { id: "T3", heure: "3:00" },
    { id: "T4", heure: "4:00" },
    { id: "T5", heure: "5:00" },
    { id: "T6", heure: "6:00" },
    { id: "T7", heure: "7:00" },
    { id: "T8", heure: "8:00" },
    { id: "T9", heure: "9:00" },
    { id: "T10", heure: "10:00" },
    { id: "T11", heure: "11:00" },
    { id: "T12", heure: "12:00" },
    { id: "T13", heure: "13:00" },
    { id: "T14", heure: "14:00" },
    { id: "T15", heure: "15:00" },
    { id: "T16", heure: "16:00" },
    { id: "T17", heure: "17:00" },
    { id: "T18", heure: "18:00" },
    { id: "T19", heure: "19:00" },
    { id: "T20", heure: "20:00" },
    { id: "T21", heure: "21:00" },
    { id: "T22", heure: "22:00" },
    { id: "T23", heure: "23:00" }
];
type TimelineProps = {
    horizontal: boolean
    windowStart?: DateTime
    selectedDate?: DateTime
    timelineDays?: number
    /** Scroll to `selectedDate` (or now) on first layout (default). The invitation
     * review screen scrolls to the event's hour itself, within its one-day bounds.
     * Philip — user story 8 (replaces EventsList's defilerMaintenant). */
    defilerAuDemarrage?: boolean
}

export default function Timeline({ horizontal, windowStart, selectedDate, timelineDays = 1, defilerAuDemarrage = true } : TimelineProps){
    const { colors } = usePalette()
    const {fonts} = useFont()
    const {pxHeures, L_HEURES, H_HEURES} = useTimeline()
    const { offset } = useGestionScroll()

    const scrollViewRef = useAnimatedRef<Animated.ScrollView>()
    const initialisationFaite = useRef(false)

    useAnimatedReaction(
        () => offset.value,
        (offset) => 
            scrollTo(scrollViewRef, horizontal ? offset : 0, horizontal ? 0 : offset, false)
    )
    
    useEffect(()=>{},[pxHeures])

    return(
        <Animated.ScrollView
            style={{ zIndex: 2, pointerEvents: 'none', ...(horizontal ? {} : { paddingTop: 16 }) }}
            contentContainerStyle={{ backgroundColor: 'transparent', flexDirection: horizontal ? 'row' : 'column' }}
            ref={scrollViewRef}
            horizontal={horizontal}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            onLayout={() => {
                if (initialisationFaite.current) return
                initialisationFaite.current = true
                if (!defilerAuDemarrage) return
                const cible = selectedDate ?? DateTime.now()
                const heureDansLaFenetre = windowStart
                    ? cible.diff(windowStart.startOf('day'), 'hours').hours
                    : cible.hour
                offset.value = Math.max(0, heureDansLaFenetre) * (pxHeures + L_HEURES)
            }}
            >
            {Array.from({ length: timelineDays * 24 }, (_, index) => {
                const dateBase = windowStart ?? DateTime.now().startOf('day').minus({ days: 3 })
                const jour = Math.floor(index / 24)
                const heure = index % 24
                const now = dateBase.startOf('day').plus({ days: jour, hours: heure })
                const item = heures[heure]
                const minuit = heure === 0
                return (
                <View
                key={`h-${index}`}
                style={{
                    
                    
                    alignItems: 'center',
                    justifyContent:'center',
                    backgroundColor: 'transparent',
                    ...(horizontal ? { marginRight: pxHeures, width: L_HEURES, height:'100%', borderLeftWidth: minuit ? 1 : 0, borderColor: colors.muted } : { marginBottom: pxHeures, height: H_HEURES, width:'100%' })
                }}
                >
                    <Text style={{color: colors.text, fontSize:minuit ? 12 : 16, fontFamily:fonts.number}}>{minuit ? now.toFormat('ccc d') : item.heure}</Text>
                </View>
            )})}
            </Animated.ScrollView>
        
        
    )
}
