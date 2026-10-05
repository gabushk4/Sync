import { useFont } from '@/contextes/contexteFont';
import { usePalette } from "@/contextes/contextePalette";

import ceilBy5 from '@/functions/ceilBy5';
import { convertirTimestampDateLongue, convertirTimestampHeure } from "@/functions/convertirTimestamp";
import log from "@/functions/log";

import SwitchAbs from '@/abstractions/switchAbs';
import RNDateTimePicker from "@react-native-community/datetimepicker";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";

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
 * keeps end >= start when either bound is edited directly.
 *
 * @param {Props} props
 * @param {string} props.timezone - IANA timezone name (or 'local') used for the iOS pickers' display.
 * @param {DateTime} props.start - Current event start.
 * @param {Function} props.setStart - Setter for the event start.
 * @param {DateTime} props.end - Current event end.
 * @param {Function} props.setEnd - Setter for the event end.
 * @param {boolean} [props.disabled] - Disables the Android picker trigger buttons.
 * @param {DateTime} [props.minimumStart] - Earliest selectable start.
 * @param {DateTime} [props.maximum] - Latest selectable date/time, for both start and end pickers.
 * @returns {JSX.Element}
 */
export default function DateTimeSelecteur({timezone, start, setStart, end, setEnd, disabled=false, minimumStart, maximum} : Props){
    const { t } = useTranslation('calendar')

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
    const { colors } = usePalette();
    const { fonts } = useFont()
    
    //log('datetimeSelecteurs: date', dateEvenement, 'debut', debutEvenement, 'fin', finEvenement)

//    log("dateTime selector", start, end)

    const dtNow = DateTime.now().startOf('minute');   

    const startRef = useRef(start)
    const endRef = useRef(end)

    const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
    const [showDebutPicker, setShowStartPicker] = useState(Platform.OS === 'ios');
    const [showFinPicker, setShowEndPicker] = useState(Platform.OS === 'ios');
    const [isAllDay, setIsAllDay] = useState(false)
    

    /**
     * Applies a new start date (keeping the existing start time), shifting
     * the end so the event's duration stays the same.
     *
     * @param {Date} jsDate - The date picked in the native picker.
     * @returns {void}
     */
    const handleStartDateChange = (jsDate : Date) => {
        const newDate = DateTime.fromJSDate(jsDate).startOf('day');

        let diffTime = end.diff(start, 'minutes').minutes //for keeping same event length
        
        const newStart = newDate.set({ 
            hour: start.hour, 
            minute: start.minute, 
            second: 0 
        });

        setStart(newStart);
        setEnd(newStart.plus({minutes:diffTime})); //Applies event length

        if (Platform.OS === 'android') setShowDatePicker(false);
    };

    /**
     * Applies a new end date, keeping the existing end time.
     *
     * @param {Date} jsDate - The date picked in the native picker.
     * @returns {void}
     */
    const handleEndDateChange = (jsDate: Date) => {
        let newDate: DateTime | null = DateTime.fromJSDate(jsDate).set({second:0});

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
        const newDebut = DateTime.fromJSDate(jsDate).set({ second: 0 });        
        let newFin = end;

        let diffTime = newFin.diff(start, 'minutes').minutes //for keeping same event length

        // If end is before the start, end delayed from start
        if (newFin <= newDebut) {
            newFin = newDebut.plus({ minutes: END_DELAY_FROM_START }); // default event length
        }

        //If start is after end, end is delayed from start
        if(newDebut > newFin){
            newFin = newDebut.set({ hour: newDebut.hour }).plus({minutes: END_DELAY_FROM_START})
        }       

        setStart(newDebut);
        setEnd(newDebut.plus({minutes:diffTime})); //Applies event length

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
        let newFin = DateTime.fromJSDate(jsDate).set({ second: 0 });

        log('newFin', newFin, "startOf day", newFin.startOf('day').toJSDate())
        setEnd(newFin)       

        if (Platform.OS === 'android') setShowEndPicker(false);
    };

    useEffect(() => {
        if (isAllDay) {
            startRef.current = start
            endRef.current = end
            setStart(start.startOf('day'))
            setEnd(end.endOf('day'))
        } else {
            setStart(ceilBy5(startRef.current))
            setEnd(ceilBy5(endRef.current))
        }
            
    }, [isAllDay])

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
        }
    });

    return (
        <Animated.View style={s.container}>    
            <View style={[s.dateTimeContainer, { flex: 2, marginBottom:4 }]}>
                <Text style={[s.label, {flex:1}]}>{t('dateTime.allDay')}</Text>
                    <SwitchAbs
                        style={{width:'20%'}}
                        value={isAllDay}
                        onChange={() => { setIsAllDay((prev) => !prev) }}
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
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} disabled={disabled} style={s.dateTimePicker} >
                            <Text style={[s.inputTemps, {fontSize:17}]}>{convertirTimestampDateLongue(end.startOf('day'))}</Text>
                        </TouchableOpacity>
                    )}
                    {showDatePicker && (
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
        </Animated.View>
    );
}