import { useFont } from '@/contextes/contexteFont';
import { usePalette } from "@/contextes/contextePalette";

import ceilBy5 from '@/functions/ceilBy5';
import { debutCreationPourJour, estJourneeEntiere } from '@/functions/jourCreation';
import { convertirTimestampDateLongue, convertirTimestampHeure } from "@/functions/convertirTimestamp";
import log from "@/functions/log";

import SwitchAbs from '@/abstractions/switchAbs';
import RNDateTimePicker from "@react-native-community/datetimepicker";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";

import { useEventDraft } from '@/contextes/contexteEventDraft';
import CommonSlotsSuggestions from './commonSlotsSuggestions';

type Props = {
    timezone: string | 'local',
    start: DateTime,
    setStart: Function,
    end: DateTime,
    setEnd: Function,
    disabled: boolean,
    minimumStart: DateTime | undefined,
    maximum?: DateTime
}

const END_DELAY_FROM_START = 60 //minutes

/**
 * Start/end date and time pickers for an event, with an "all day" toggle.
 * Keeps the event's duration constant when the start date/time moves, and
 * keeps end >= start when either bound is edited directly. Start and end come
 * from the event draft context (useEventDraft), not from the props.
 *
 * @param {Props} props
 * @param {string} props.timezone - IANA timezone name (or 'local') used for the iOS pickers' display.
 * @param {boolean} [props.disabled] - Disables the Android picker trigger buttons.
 * @param {DateTime} [props.minimumStart] - Earliest selectable start.
 * @param {DateTime} [props.maximum] - Latest selectable date/time, for both start and end pickers.
 * @author Philip — rectification for a more conventional display: the "all day" switch works (it never
 *   toggled, then reset the dates), turns itself on for whole days from the
 *   calendar, and each Android date picker opens alone
 * @returns {JSX.Element}
 */
export default function DateTimeSelecteur({timezone, disabled=false, minimumStart, maximum} : Props){
    const { t } = useTranslation('calendar')

    const { colors } = usePalette();
    const { fonts } = useFont()
    const { setStart, setEnd, start, end } = useEventDraft();
    // Defensive floor: whatever `maximum` arrives as, it must never end up
    // before this form's own minimum references (minimumStart, or a few
    // minutes after `start` for the end-time picker below) — otherwise the
    // native picker's "minimumDate < maximumDate" invariant crashes,
    // regardless of what upstream miscalculated. Found via the month
    // calendar's range selection (user story 5).
    let maximumSur = maximum
    if (maximumSur) {
        if (minimumStart && maximumSur < minimumStart) maximumSur = minimumStart
        const plancherFin = start.plus({ minutes: 5 })
        if (maximumSur < plancherFin) maximumSur = plancherFin
    }
    
    //log('datetimeSelecteurs: date', dateEvenement, 'debut', debutEvenement, 'fin', finEvenement)

//    log("dateTime selector", start, end)

    const dtNow = DateTime.now().startOf('minute');   

    // Times before "all day" was switched on, restored when it's switched off
    // (null: none, e.g. a whole-day range from the calendar).
    const startRef = useRef<DateTime | null>(null)
    const endRef = useRef<DateTime | null>(null)

    // Android shows each picker as a dialog: one flag per picker. The start and end
    // date pickers shared one, so tapping either date opened both dialogs.
    const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
    const [showFinDatePicker, setShowFinDatePicker] = useState(Platform.OS === 'ios');
    const [showDebutPicker, setShowStartPicker] = useState(Platform.OS === 'ios');
    const [showFinPicker, setShowEndPicker] = useState(Platform.OS === 'ios');
    const [isAllDay, setIsAllDay] = useState(false)
    // The switch is turned on by itself once, when the pre-filled dates are whole
    // days (a range selected in the month calendar).
    const allDayDetecte = useRef(false)
    

    /**
     * Applies a new start date (keeping the existing start time). The end is kept,
     * or moved after the new start when it would come before it. All day: the
     * start stays at midnight and the end at least at the end of that day.
     *
     * @author Philip — rectification for a more conventional display (all-day mode, end kept)
     * @param {Date} jsDate - The date picked in the native picker.
     * @returns {void}
     */
    const handleStartDateChange = (jsDate : Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (isAllDay) {
            const debutJour = DateTime.fromJSDate(jsDate).startOf('day')
            setStart(debutJour)
            if (end < debutJour.endOf('day')) setEnd(debutJour.endOf('day'))
            return
        }
        const newDate = ceilBy5(DateTime.fromJSDate(jsDate).startOf('day'));
        // The end used to be reset to its day's midnight here, losing its time.
        let newFin = end

        let diffTime = end.diff(start, 'minutes').minutes //for keeping same event length
        
        const newStart = newDate.set({ 
            hour: start.hour, 
            minute: start.minute, 
            second: 0 
        });

        if (newFin <= newStart) {
            newFin = newStart.plus({ minutes: END_DELAY_FROM_START }); // default event length
        }  

        setStart(newStart);
        //TODO: keep same length as a setting
        //setEnd(newStart.plus({minutes:diffTime})); //Applies event length
        setEnd(newFin)
    };

    /**
     * Applies a new end date, keeping the existing end time.
     *
     * @author Philip — rectification for a more conventional display (closes its own Android dialog)
     * @param {Date} jsDate - The date picked in the native picker.
     * @returns {void}
     */
    const handleEndDateChange = (jsDate: Date) => {
        // It never closed its Android dialog.
        if (Platform.OS === 'android') setShowFinDatePicker(false);
        let newDate: DateTime | null = ceilBy5(DateTime.fromJSDate(jsDate).set({second:0}));

        // Change only the date not the time
        let newEnd = end.set({
            year: newDate.year,
            month: newDate.month,
            day: newDate.day,
        });

        setEnd(newEnd);        
    };

    /**
     * Applies a new start time, keeping the event's duration the same,
     * and pushes the end forward if it would otherwise land before the
     * new start.
     *
     * @param {Date} jsDate - The time picked in the native picker.
     * @returns {void}
     */
    const handleStartTimeChange = (jsDate: Date) => {
        const newDebut = ceilBy5(DateTime.fromJSDate(jsDate).set({ second: 0 }));        
        let newFin = end;

        // If end is before the start, end delayed from start
        if (newFin <= newDebut) {
            newFin = newDebut.plus({ minutes: END_DELAY_FROM_START }); // default event length
        }   

        setStart(newDebut);
        //TODO: keep same length as a setting
        //setEnd(newDebut.plus({minutes:diffTime})); //Applies event length
        setEnd(newFin)

        log("newDebut", newDebut)

        if (Platform.OS === 'android') setShowStartPicker(false);
    };

    /**
     * Applies a new end time directly.
     *
     * @param {Date} jsDate - The time picked in the native picker.
     * @returns {void}
     */
    const handleEndTimeChange = (jsDate: Date) => {
        log('handleEndChange', jsDate)
        let newFin = ceilBy5(DateTime.fromJSDate(jsDate).set({ second: 0 }));

        log('newFin', newFin, "startOf day", newFin.startOf('day').toJSDate())
        setEnd(newFin)       

        if (Platform.OS === 'android') setShowEndPicker(false);
    };

    

    // Pre-filled whole days (a range from the month calendar): "all day" on.
    useEffect(() => {
        if (allDayDetecte.current || isAllDay || !estJourneeEntiere(start, end)) return
        allDayDetecte.current = true
        setIsAllDay(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [start, end])

    /**
     * "All day" switch. On: keeps the current times, then covers the start day's
     * midnight to the end day's 23:59:59. Off: brings the kept times back; with none
     * kept (a range pre-filled from the calendar, "all day" turned on by itself) or
     * past ones, keeps the event's DAYS and only suggests times: the start day at the
     * next hour (not before now), the end day an hour after that time. Switching off
     * a calendar range used to drop its dates (back to now + 1h → start + 1h).
     *
     * @author Philip — rectification for a more conventional display
     *   (user story 5: ranges selected in the month calendar)
     * @param {boolean} active - New value of the switch.
     * @returns {void}
     */
    const basculerJourEntier = (active: boolean) => {
        setIsAllDay(active)
        if (active) {
            startRef.current = start
            endRef.current = end
            setStart(start.startOf('day'))
            setEnd(end.endOf('day'))
            return
        }
        const maintenant = ceilBy5(DateTime.now())
        const heuresGardees = !!startRef.current && startRef.current >= maintenant
        const debut = heuresGardees
            ? startRef.current as DateTime
            : DateTime.max(maintenant, debutCreationPourJour(start))
        let fin = heuresGardees && endRef.current && endRef.current > debut
            ? endRef.current
            // Same end DAY as the all-day event, an hour after the start's time.
            : end.startOf('day').set({ hour: debut.hour, minute: debut.minute }).plus({ minutes: END_DELAY_FROM_START })
        // Never past the event's last day (e.g. a start at 23:00 on a one-day range).
        if (!heuresGardees && fin > end.endOf('day')) fin = end.endOf('day')
        if (fin <= debut) fin = debut.plus({ minutes: END_DELAY_FROM_START })
        startRef.current = null
        endRef.current = null
        setStart(debut)
        setEnd(fin)
    }

    const s = StyleSheet.create({
        label: {
            color: colors.muted,
            fontSize: 20,
            fontFamily: fonts.body,
        },
        inputTemps: {
            color: colors.text,
            fontSize: 20,
            fontFamily: fonts.body
        },
        container: {
            flexDirection: 'column',
            flex:3,
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            backgroundColor: colors.card,
            borderRadius: 8,
            borderColor: colors.border,
            overflow: 'hidden',
            paddingHorizontal: 8,
            paddingVertical:4,
            marginBottom: 8,
            gap:8
        },
        dateTimeContainer: {
            flex:3,
            width: '100%',
            paddingTop: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems:'center',
            gap:Platform.OS === 'android' ? 0 : 4 
        },
        pickerContainer: {
            flex: 1,
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            //backgroundColor:colors.secondary
        },
        dateTimePicker: {
            width: 'auto',
            alignItems: 'center',
            borderWidth: 1,
            borderRadius: 8,
            borderColor: colors.border,
            backgroundColor:colors.primary,
            paddingVertical: 4,
            paddingHorizontal: 8,
            marginBottom:4
        },
        androidTimeLabel: {
            flex: 0,
            width: '20%',
            marginRight: 18
        },
        
    });

    return (
        <Animated.View style={s.container}>    
            <View style={[s.dateTimeContainer, { flex: 2, marginBottom:4 }]}>
                <Text style={[s.label, {flex:1}]}>{t('dateTime.allDay')}</Text>
                    <SwitchAbs
                        style={{width:'20%'}}
                        value={isAllDay}
                        // onValueChange: SwitchAbs only forwards that one; the
                        // onChange used here was dropped, so the switch never toggled.
                        onValueChange={(active) => basculerJourEntier(active)}
                    />
            </View>    
            {/* --- Start --- */}
            <View style={s.dateTimeContainer}>
                <Text style={[s.label, s.pickerContainer, Platform.OS === 'android' ? s.androidTimeLabel : {}]}>{t('dateTime.starts')}</Text>
                {/* Date */}
                <View style={s.pickerContainer}>
                    {Platform.OS === 'android' && (
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} disabled={disabled} style={s.dateTimePicker} >
                            <Text style={[s.inputTemps, {fontSize:17}]}>{convertirTimestampDateLongue(start.startOf('day'))}</Text>
                        </TouchableOpacity>
                    )}
                    {showDatePicker && (
                        <RNDateTimePicker
                            value={start?.startOf('day').toJSDate() || dtNow.toJSDate()}
                            mode="date"
                            minimumDate={minimumStart?.startOf('day').toJSDate() ?? undefined}
                            maximumDate={maximumSur?.toJSDate()}
                            display={Platform.OS === 'android' ? 'calendar' : 'default'}
                            onChange={(e, date) => date && handleStartDateChange(date)}
                            {...(Platform.OS === 'ios' ? { timeZoneName: timezone, accentColor: colors.text } : {})}
                        />
                    )}
                </View>
                {/* Time */}
                {!isAllDay &&
                    <View style={s.pickerContainer}>
                        {Platform.OS === 'android' && (
                            <TouchableOpacity style={s.dateTimePicker} onPress={() => setShowStartPicker(true)} disabled={disabled}>
                                <Text style={s.inputTemps}>{convertirTimestampHeure(start)}</Text>
                            </TouchableOpacity>
                        )}
                        {showDebutPicker && (
                            <RNDateTimePicker                        
                                value={start.toJSDate()}
                                minimumDate={minimumStart?.toJSDate() ?? undefined}
                                maximumDate={maximumSur?.toJSDate()}
                                mode="time"
                                is24Hour={true}
                                minuteInterval={5}
                                display={Platform.OS === 'android' ? 'spinner' : 'default'}
                                onChange={(e, date) => date && handleStartTimeChange(date)}
                                {...(Platform.OS === 'ios' ? { timeZoneName: timezone, accentColor: colors.text } : {})}
                            />
                        )}
                    </View>
                }
            </View>

            {/* --- End --- */}
            <View style={s.dateTimeContainer}>            
                <Text style={[s.label, s.pickerContainer, Platform.OS === 'android' ? s.androidTimeLabel : {}]}>{t('dateTime.ends')}</Text>
                {/* Date */}
                <View style={s.pickerContainer}>                
                    {Platform.OS === 'android' && (
                        <TouchableOpacity onPress={() => setShowFinDatePicker(true)} disabled={disabled} style={s.dateTimePicker} >
                            <Text style={[s.inputTemps, {fontSize:17}]}>{convertirTimestampDateLongue(end.startOf('day'))}</Text>
                        </TouchableOpacity>
                    )}
                    {showFinDatePicker && (
                        <RNDateTimePicker
                            value={end.startOf('day').toJSDate()}
                            mode="date"
                            minimumDate={start.startOf('day').toJSDate()}
                            maximumDate={maximumSur?.toJSDate()}
                            display={Platform.OS === 'android' ? 'calendar' : 'default'}
                            onChange={(e, date) => date && handleEndDateChange(date)}
                            {...(Platform.OS === 'ios' ? { timeZoneName: timezone, accentColor: colors.text } : {})}
                        />
                    )}
                </View>
                {/* Time */}
                {!isAllDay &&
                    <View style={s.pickerContainer}>
                        {Platform.OS === 'android' && (
                            <TouchableOpacity style={s.dateTimePicker} onPress={() => setShowEndPicker(true)} disabled={disabled}>
                                <Text style={s.inputTemps}>{convertirTimestampHeure(end)}</Text>
                            </TouchableOpacity>
                        )}
                        {showFinPicker && (
                            <RNDateTimePicker
                                value={end.toJSDate()}
                                minimumDate={start.plus({ minutes: 5 }).toJSDate()}
                                maximumDate={maximumSur?.toJSDate()}
                                mode="time"
                                is24Hour={true}
                                minuteInterval={5}
                                display={Platform.OS === 'android' ? 'spinner' : 'default'}
                                onChange={(e, date) => date && handleEndTimeChange(date)}
                                {...(Platform.OS === 'ios' ? { timeZoneName: timezone, accentColor: colors.text } : {})}
                            />
                        )}
                    </View>
                }
            </View> 

            {/* --- Suggestions --- */}
            <CommonSlotsSuggestions/>
        </Animated.View>
    );
}