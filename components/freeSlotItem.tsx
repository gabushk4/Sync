import { usePalette } from "@/contextes/contextePalette";
import { useTimeline } from "@/contextes/contexteTimeline";

import { findLeft, findWidth } from "@/functions/calculerDimensionsEvenements";

import { useFont } from "@/contextes/contexteFont";
import log from "@/functions/log";
import ouvrirCreationAvecAmi from "@/functions/ouvrirCreationAvecAmi";
import { DateTime } from "luxon";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useTranslation } from 'react-i18next';
import Animated, { SharedValue } from "react-native-reanimated";
import useTimelineLabelOffset from "@/hooks/useTimelineLabelOffset";
import { positionHeures } from "@/functions/positionTimeline";
import ToastAbs from "@/abstractions/toastAbs";
import { toastTypes } from "@/constants/toastConfig";

type Props = {
    freeSlot: any;
    displayedDate?: DateTime;
    horizontal: boolean;
    listOffset: SharedValue<number>
    owner: any
    timelineDays?: number
}

export default function FreeSlotItem({ freeSlot, displayedDate, horizontal, listOffset, owner, timelineDays = 1 }: Props) {
    const { t } = useTranslation('home')
    const { colors } = usePalette()
    const {fonts} = useFont()
    const { pxHeures, H_HEURES, L_HEURES } = useTimeline()
    
    const debutFenetre = displayedDate?.startOf('day')
    const finFenetre = debutFenetre?.plus({ days: timelineDays })
    const debutVisible = debutFenetre && freeSlot.start < debutFenetre ? debutFenetre : freeSlot.start
    const finVisible = finFenetre && freeSlot.end > finFenetre ? finFenetre : freeSlot.end
    // Shared with ListItem / TrousHoraire (Philip — user story 20).
    const position = (date: DateTime) => debutFenetre ? positionHeures(date, debutFenetre) : 0
    const left = horizontal
                    ? position(debutVisible) * (pxHeures + L_HEURES)
        : 0
    const top = horizontal
                    ? 0
        : findLeft(freeSlot.start, freeSlot.end, displayedDate as DateTime, pxHeures + H_HEURES)
    const hauteurCalculee = horizontal
                    ? '100%'
        : findWidth(freeSlot.start, freeSlot.end, displayedDate, pxHeures + H_HEURES)
    const width = horizontal 
                    ? (position(finVisible) - position(debutVisible)) * (pxHeures + L_HEURES)
        : '100%'
    const height = hauteurCalculee
    
    // `passe`: today's hours already elapsed (see getCommonFreeSlots), shown greyed out.
    // Rectification (Philip) for a more conventional display: past
    // slots stay visible instead of disappearing.
    const isInPast = !!freeSlot.passe
        || (freeSlot.start.toMillis() < DateTime.now().toMillis() && freeSlot.end.toMillis() < DateTime.now().toMillis())

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
        timelineLength: timelineDays * 24 * (pxHeures + (horizontal ? L_HEURES : H_HEURES)),
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
            accessibilityRole="button"
            accessibilityLabel={`${t('commonFreeSlot')} ${freeSlot.start.toFormat('ccc d t')}–${freeSlot.end.toFormat('ccc d t')}`}
            style={[s.freeSlot, {
                position: 'absolute',
                left: left,
                top: top,
                height: height,
                width: width,
                ...(isInPast ? { borderColor: colors.muted, opacity: 0.45 } : {})
            }]}
            onPress={() => {
                //TODO: go to create with owner.id and start and end values passed 
                if (isInPast) {
                    ToastAbs.show({
                        type: toastTypes.warning,
                        text1: 'dans le passé',
                        text2: 'la disponibilité commune est déjà passée... focus sur le moment présent'
                    })
                    return 
                }
                log("common free slot with", owner)
                // Shared with a friend's profile widget (Philip — user story 25).
                ouvrirCreationAvecAmi({ debut: freeSlot.start, fin: freeSlot.end, ami: owner })
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
                    {t('commonFreeSlot')} {'\n'} +
                </Text>
            </Animated.View>
        </TouchableOpacity>
    )
}
