import Radius from "@/constants/Radius"
import { useEventDraft } from "@/contextes/contexteEventDraft"
import { useFont } from "@/contextes/contexteFont"
import { usePalette } from "@/contextes/contextePalette"

import { LinkAbs } from "@/abstractions/linkAbs"
import { withTimingConfig } from "@/constants/ReanimatedConfs"
import { useModal } from "@/contextes/contexteModals"
import { convertirTimestampDateCourte, convertirTimestampHeure } from "@/functions/convertirTimestamp"
import log from "@/functions/log"
import { Interval } from "@/types/availabilities"
import { DateTime } from "luxon"
import { useEffect, useMemo, useState, useTransition } from "react"
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated"
import { useTranslation } from "react-i18next"
import { checkMark } from "@/constants/dismissButtons"


export default function CommonSlotsSuggestions() {    
    const {t} = useTranslation()
    const { slotSuggestions, setStart, setEnd, start, end } = useEventDraft();
    const { setDataRendererContent, setDismissButton, removeDataRenderContent, resetDismissButton } = useModal();
    
    const { colors } = usePalette()
    const { fonts } = useFont()    

    const SUGG_LINE_H = 32 + 16
    const SUGG_TITLE_H = 40
    const MAX_SUGG = 4
    const suggestionsCount = slotSuggestions.length
    const DATA_RENDERER_KEY = "CommonSlotsSuggestions"

    const [suggSelected, setSuggSelected] = useState<string|undefined>()
    const orderedSuggestions = useMemo(() => {
        if (!suggSelected) return slotSuggestions
        return [...slotSuggestions].sort((a, b) => Number(b.id === suggSelected) - Number(a.id === suggSelected))
    }, [slotSuggestions, suggSelected])
    
    const s = StyleSheet.create({
        suggestionsContainer: {
            marginTop:4,
            paddingTop: 8,
            overflow: 'scroll',            
            borderColor: colors.border,
            width: '100%',
            alignItems: 'center',
        },
        suggestionLine: {
            height: SUGG_LINE_H,
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            paddingHorizontal: 8,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: Radius.xl,
            backgroundColor: colors.primary,
        },
        colDay:   { width: 64, alignItems: 'center' },
        colStart: { width: 88, alignItems: 'center' },
        colTo:    { width: 24, alignItems: 'center' },
        colEnd:   { flex: 1, alignItems: 'center' },
        text: {
            color: colors.text,
            fontSize: 16,
            textAlign: 'center',
        },
    })

    const animatedSuggestions = useAnimatedStyle(() => (
        {
            height: withTiming(Math.min((suggestionsCount * SUGG_LINE_H + (suggestionsCount > 0 ? SUGG_LINE_H + SUGG_TITLE_H : 0)), SUGG_LINE_H * MAX_SUGG + SUGG_TITLE_H), withTimingConfig)        
        }
    ))

    const Line = useMemo(() => ({ sugg, index } : {sugg: Interval, index: number}) => {
        if (sugg) {
            const sameDay = sugg.fin.startOf('day').diff(sugg.debut.startOf('day'), 'days').days < 1                        
            const sameWeekDebut = sugg.debut.startOf('day').diff(DateTime.now().startOf('day'), 'days').days < 7
            const sameWeekFin = sugg.fin.startOf('day').diff(DateTime.now().startOf('day'), 'days').days < 7
            
            return (
                <View key={sugg.id} style={{ marginTop: 8, paddingHorizontal: 8 }}>
                    <TouchableOpacity
                        style={[
                            s.suggestionLine,
                            { backgroundColor: sugg.id === suggSelected ? s.suggestionLine.borderColor : 'transparent' },
                        ]}
                        onPress={() => {
                            setSuggSelected(sugg.id)
                            
                            setStart(sugg.debut)
                            setEnd(sugg.fin)
                        }}
                    >
                        <View style={s.colDay}>
                            <Text style={s.text}>
                                {sameWeekDebut ? sugg.debut.weekdayShort : convertirTimestampDateCourte(sugg.debut)}
                            </Text>
                        </View>

                        <View style={s.colStart}>
                            <Text style={s.text}>de {convertirTimestampHeure(sugg.debut)}</Text>
                        </View>

                        <View style={s.colTo}>
                            <Text style={s.text}>à</Text>
                        </View>

                        <View style={s.colEnd}>
                            <Text style={s.text} numberOfLines={1}>
                                {sameDay
                                    ? convertirTimestampHeure(sugg.fin)
                                    : `${sameWeekFin ? sugg.fin.weekdayShort : convertirTimestampDateCourte(sugg.fin)} ${convertirTimestampHeure(sugg.fin)}`}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )
        }
    }, [suggSelected])

    const showMoreModal = useMemo(() => (
        <FlatList
            style={{flex:1}}
            data={slotSuggestions}
            keyExtractor={(item, index) => `FL-${item.id}-${index}`}
            renderItem={({item, index}) => <Line sugg={item} index={index}/>}
        />
    ), [suggSelected, Line, slotSuggestions])

    
    useEffect(() => {
        setDataRendererContent(DATA_RENDERER_KEY, showMoreModal)
        setDismissButton(checkMark(colors))   
    }, [showMoreModal])

    useEffect(() => () => {
        removeDataRenderContent(DATA_RENDERER_KEY)
        resetDismissButton()
    }, [])


    useEffect(() => {
        const currentSugg = slotSuggestions.find(s => s.id === suggSelected)
        if (currentSugg) {
            const startOutOfBound = start.toMillis() < currentSugg?.debut.toMillis()
            const endOutOfBound = end.toMillis() > currentSugg.fin.toMillis()
            //log(`outofbound start ${start}: ${startOutOfBound} end ${end}: ${endOutOfBound} currentSugg:`, {currentSugg})
            if (currentSugg && (startOutOfBound || endOutOfBound)) {
                setSuggSelected(undefined)
            }
        }
    }, [start, end, suggSelected])
        
    return (
        <Animated.View style={[s.suggestionsContainer, {borderTopWidth: suggestionsCount > 0 ? 1 : 0}, animatedSuggestions]}>
            {suggestionsCount > 0 && 
                <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 20, width: '100%', textAlign: 'left', marginBottom:4 }}>suggestions - { suggestionsCount}</Text>
            }
            <View style={{marginBottom:8, width:'100%'}}>
            {orderedSuggestions.slice(0, MAX_SUGG - 1).map((sugg, i) => (
                <Line key={i} sugg={sugg} index={i} />    
            ))}
            </View>
            {suggestionsCount > 4 &&
                <LinkAbs href={{pathname: "/(modals)/dataRenderer", params:{ key: DATA_RENDERER_KEY}}} style={{position:'absolute', bottom: 0}}>
                    {t('common:showMore')}
                </LinkAbs> 
            }
            
        </Animated.View>
    )
}