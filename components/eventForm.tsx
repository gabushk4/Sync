import TextInputAbs from '@/abstractions/textInputAbs'
import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import { useMembre } from '@/contextes/contexteMembre'

import { Event, Recurrence } from '@/types/calendar'

import Haptics from '@/abstractions/haptics'

import { convertirTimestampDateCourte, convertirTimestampDateLongue, convertirTimestampHeure } from '@/functions/convertirTimestamp'
import { convertirUTCversLocale } from '@/functions/convertirUTCenLocal'
import formaterDatePourServeur from '@/functions/formaterDatePourServeur'
import log from '@/functions/log'
import TraduireRecurrence from '@/functions/traduireRecurrence'
import ceilBy5 from '@/functions/ceilBy5'

import RNDateTimePicker from '@react-native-community/datetimepicker'
import { useFocusEffect } from 'expo-router'
import React, { forwardRef, SetStateAction, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View, Switch, Keyboard } from 'react-native'
import { DateTime } from 'luxon'

import DateTimeSelecteur from './datetimeSelecteurs'
import MenuDeroulant from './menuDeroulant'
import ParticipantsListe from './participantsListe'
import Animated from 'react-native-reanimated'
import Icon from "@react-native-vector-icons/ionicons";
import SwitchAbs from '@/abstractions/switchAbs'
import { Participant } from '@/types/invites'
import { useInvites } from '@/contextes/contexteInvites'

const MAX_LONG_TITLE = 50
const MAX_LONG_DESC = 2000
const recVals = [
        {title:'jamais', value:null},
        {title:'quotidien', value:'DAILY'}, 
        {title:'hebdomadaire', value:'WEEKLY'},
        {title:'mensuel', value:'MONTHLY'},
        {title:'annuel', value:'YEARLY'},
        //{title:'personnalisé', value:'perso'}
    ]

/**
 * NOTE POUR TOI : adapte les types (Props, Event, Recurrence, etc.) à tes
 * définitions réelles — je les ai gardés identiques à ton fichier original.
 * ============================================================================
 */

export type EventFormValues = {
    titre: string
    description: string
    prive: boolean
    start: DateTime
    end: DateTime
    regleRecurrence: string | null
}

export type EventFormHandle = {
    getValues: () => EventFormValues
}

type Props = {
    event: Event
    mode: 'create' | 'edit' | 'details',
    prefills?: {
        start?: DateTime;
        end?: DateTime;
        participants?:Array<Participant>
    }
    constraints?: {
        maximumStart?: DateTime;
        minimumStart?: DateTime;
    }
    // setEvent n'est plus utilisé pour la synchronisation continue.
    // Garde-le seulement si un autre écran en dépend pour un aperçu readonly.
    setEvent?: React.Dispatch<React.SetStateAction<Event>>
}

const dtNow = DateTime.now()

const EventForm = forwardRef<EventFormHandle, Props>(
    
function EventForm({ event, prefills, constraints, mode }, ref) {
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { membre } = useMembre()
    const colorScheme = useColorScheme()
    const {ajouterInvite, invites} = useInvites()     

    const icones = {
        check:
            colorScheme === 'dark'
                ? require('@/assets/icones/checkmark-dark-icon.png')
                : require('@/assets/icones/checkmark-light-icon.png'),
        public:
            colorScheme === 'dark'
                ? require('@/assets/icones/cadenas-ouvert-dark-icon.png')
                : require('@/assets/icones/cadenas-ouvert-light-icon.png'),
        private:
            colorScheme === 'dark'
                ? require('@/assets/icones/cadenas-ferme-dark-icon.png')
                : require('@/assets/icones/cadenas-ferme-light-icon.png'),
    }
        
    const minimumStart = constraints?.minimumStart || mode === 'create' ? dtNow : undefined
    const maximumStart = constraints?.maximumStart || undefined

    const refDescription = useRef<TextInput>(null)
    const dateTimesCalculated = useRef(false)

    const [dateTimeDisabled, setDateTimeDisabled] = useState<boolean>(false)
    const [titleLen, setTitleLen] = useState<number>(0)
    const [descriptionLen, setDescriptionLen] = useState<number>(0)

    const [title, setTitle] = useState<string>(event.titre ?? '')
    const [description, setDescription] = useState<string>(event.description ?? '')
    const [eventPrivate, setPrivate] = useState<boolean>(event.prive == 1)

    const [start, setStart] = useState<DateTime>(dtNow.plus({hours:1}))
    const [end, setEnd] = useState<DateTime>(dtNow.plus({ hours: 2 }))

    const [montrerRecPicker, setMontrerRecPicker] = useState(Platform.OS === 'ios')
    const [recurrence, setRecurrence] = useState<Recurrence>({
        title: 'jamais',
        value: event.regle_recurrence ?? null,
    })
    const [finRecurrence, setFinRecurrence] = useState<DateTime | null>(dtNow)

    const [descriptionTruncated, setDescriptionTruncated] = useState<boolean>(false)
    const [showTextModal, setShowTextModal] = useState<boolean>(false)
        
    const [eventParticipantsControlUrl, setEventParicipantsControlUrl] = useState<string|undefined>(undefined)

    const daysDiff = end.diff(start, 'days').toObject().days ?? 0
    const hasSecondDate = daysDiff >= 1

    const calculateDateTimes = (): { start: DateTime, end: DateTime } => {  
        dateTimesCalculated.current = true
            
        if (mode == 'create') {  
            //log("mode create dtNow:", dtNow)
            let start = prefills?.start || ceilBy5(dtNow.plus({ hours: 1 }))
            let end = prefills?.end || ceilBy5(start.plus({ hours: 1 }))
            log("event form", start, end)
            return {start, end}
        }

        let start = convertirUTCversLocale(event.debut ?? dtNow) ?? dtNow
        let end = convertirUTCversLocale(event.fin ?? dtNow) ?? dtNow        

        return {start, end}
    }
        
    const creerRegle = (): string | null => {
        if (recurrence.value != null) {
            const dtStartStr = start?.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")
            const untilStr = finRecurrence?.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")
            return `DTSTART:${dtStartStr}\nFREQ=${recurrence.value};UNTIL=${untilStr}`
        }
        return null
    }
    
    const appliquerInvites = (invites: Array<Participant>) => {
        if (invites) {
            ajouterInvite(invites)
        }
    }
        
    const fetchDispoCommune = async () => {
        //mock for now
    }

    useFocusEffect(
        useCallback(() => {
            if (!dateTimesCalculated.current) {
                const { start, end } = calculateDateTimes()
                setStart(start)
                setEnd(end)
            }
            if (mode === 'create' && prefills?.participants)
                appliquerInvites(prefills.participants)
        }, [event])
    )    

    useEffect(() => {
        setFinRecurrence(start.startOf('day'))
    }, [start])
        
    useEffect(() => {
        setTitle(event.titre ?? '')
        setPrivate(event.prive == 1)
        if (event.id)
            setEventParicipantsControlUrl(`/evenements/${event.id}/participants`)
    }, [event])

    useImperativeHandle(ref, () => ({
        getValues: (): EventFormValues => ({
            titre: title,
            description,
            prive: eventPrivate,
            start,
            end,
            regleRecurrence: creerRegle(),
        }),
    }))

    const s = StyleSheet.create({
        container: { flex: 1, height: '100%', flexDirection: 'column', paddingTop: 16, paddingHorizontal: 8 },
        contentContainer: { gap: 16 },
        label: { color: colors.muted, fontSize: 20, fontFamily: fonts.body, width: 'auto' },
        dateText:{color: colors.text, fontSize: 28, fontFamily: fonts.body, width: 'auto'},
        champ: { width: '100%', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.card, borderRadius: 16 },
        input: {
            height: 56,
            borderWidth: 0,
            width: '100%',
            color: colors.text,
            fontSize: 20,
            fontFamily: fonts.body,
            padding: 8,
            borderRadius: 8,
            backgroundColor: 'transparent',
        },
        inputReadonly: {
            backgroundColor: 'transparent',
            borderWidth: 0,
            fontSize: 28,
            width: 'auto',
            color: colors.text,
            padding: 8,
        },
        inputTemps: { color: colors.text, fontSize: 20, fontFamily: fonts.number },
        textLength: {
            position: 'absolute',
            bottom: 4,
            right: 4,
            fontFamily: fonts.number,
            fontWeight: 'bold',
            color: titleLen != MAX_LONG_TITLE ? colors.muted : colors.error,
        },
        descriptionLength: {
            position: 'absolute',
            bottom: 4,
            right: 4,
            fontFamily: fonts.number,
            fontWeight: 'bold',
            color: descriptionLen != MAX_LONG_DESC ? colors.muted : colors.error,
        },
        separator: { height: 1, width: '95%', backgroundColor: colors.border, alignSelf: 'center' },
        champsContainer: {
            backgroundColor: colors.card,
            borderRadius: 16,
            overflow: 'hidden'
        },
        dateTimeContainer: { alignItems: 'center', width: '100%', height:96 },
        androidRecCard: {
            alignSelf: 'center',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.text,
            backgroundColor: colors.card,
        },
        expandText: { position: 'absolute', right: 4, bottom: 0 },
    })

    return (
        <ScrollView style={s.container} contentContainerStyle={s.contentContainer} keyboardDismissMode='on-drag'>            
            <View style={s.champsContainer}>                
                <View style={mode === 'details' ? { alignItems: 'center', width: '100%' } : {}}>
                    <TextInputAbs
                        style={[mode === 'details' ? s.inputReadonly : s.input ]}
                        value={title ?? event.titre}
                        onChangeText={(text: string) => {
                            if (text.length <= MAX_LONG_TITLE) {
                                setTitle(text)
                                setTitleLen(text.length)
                            }
                        }}
                        maxLength={MAX_LONG_TITLE}
                        autoFocus={mode === 'create'}
                        placeholder="titre..."
                        placeholderTextColor={colors.muted}
                        returnKeyType="next"
                        onSubmitEditing={() => refDescription.current?.focus()}
                        onFocus={() => setDateTimeDisabled(true)}
                        onBlur={() => setDateTimeDisabled(false)}
                        pointerEvents={mode === 'details' ? 'none' : 'auto'}
                    />
                    {mode !== 'details' && <Text style={s.textLength}>{titleLen}</Text>}
                </View>
                <View style={s.separator} />
                {mode === 'details' ? (
                    <View style={{ position: 'relative' }}>
                        <Text
                            style={[s.inputReadonly, { fontFamily: fonts.body, color: colors.text, fontSize: 16, width: '100%' }]}
                            numberOfLines={5}
                            onTextLayout={(e) => {
                                const lines = e.nativeEvent.lines
                                setDescriptionTruncated(!!lines[lines.length - 1]?.text.endsWith('…'))
                            }}
                        >
                            {event.description}
                        </Text>
                        {descriptionTruncated && (
                            <TouchableOpacity style={s.expandText} onPress={() => setShowTextModal(true)}>
                                <Text style={[s.label, { fontSize: 16, color: colors.secondary }]}>plus</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View>
                        <TextInputAbs
                            ref={refDescription}
                            style={[s.input, { fontSize: 18, height: 'auto' }]}
                            value={description}
                            placeholder="description..."
                            placeholderTextColor={colors.muted}
                            multiline={true}
                            numberOfLines={5}
                            maxLength={MAX_LONG_DESC}
                            onChangeText={(text) => {
                                if (text.length <= MAX_LONG_DESC) {
                                    setDescription(text)
                                    setDescriptionLen(text.length)
                                }
                            }}
                            onFocus={() => setDateTimeDisabled(true)}
                            onBlur={() => setDateTimeDisabled(false)}
                            onEndEditing={() => setDateTimeDisabled(false)}
                        />
                        <Text style={s.descriptionLength}>{descriptionLen}</Text>
                    </View>
                )}
            </View>

            {mode === 'details' ? (
                <View style={[s.dateTimeContainer, {height:'auto'}]}>
                    <Text style={s.dateText}>
                        {hasSecondDate && 'du'} {convertirTimestampDateLongue(event.debut)}{' '}
                        {hasSecondDate && <Text>{convertirTimestampHeure(event.debut)}</Text>}
                    </Text>
                    {hasSecondDate ? (
                        <Text style={s.dateText}>
                            {hasSecondDate && 'au'} {convertirTimestampDateLongue(event.fin)} {convertirTimestampHeure(event.fin)}
                        </Text>
                    ) : (
                        <Text style={[s.dateText, { fontSize:20, textAlign: 'center', width: '100%' }]}>
                            {convertirTimestampHeure(event.debut)} - {convertirTimestampHeure(event.fin)}
                        </Text>
                    )}
                </View>
            ) : (
                <View style={{height:'auto'}}>
                    <DateTimeSelecteur
                        minimumStart={minimumStart}
                        maximum={maximumStart}    
                        timezone={event.timezone}
                        start={start}
                        setStart={setStart}
                        end={end}
                        setEnd={setEnd}
                        disabled={dateTimeDisabled}
                    />
                </View>
            )}

            <View style={{ gap: 8 }}>
                <View style={[s.champ, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 }]}>
                    <Text style={s.label}>récurrence</Text>
                    <MenuDeroulant
                        disabled={mode === 'details'}
                        values={recVals}
                        selected={recurrence}
                        onSelection={(val: string | null) => {
                            const obj = recVals.find((v) => v.value === val)
                            setRecurrence({ title: obj?.title ?? 'jamais', value: obj?.value ?? null })
                            switch (val) {
                                
                                case 'DAILY':
                                    setFinRecurrence(start.plus({ day: 1 }))
                                    break
                                case 'WEEKLY':
                                    setFinRecurrence(start.plus({ week: 1 }))
                                    break
                                case 'MONTHLY':
                                    setFinRecurrence(start.plus({ month: 1 }))
                                    break
                                case 'YEARLY':
                                    setFinRecurrence(start.plus({ year: 1 }))
                                default:
                                    setFinRecurrence(null)
                                    break
                            }
                        }}
                    />
                </View>
                {recurrence?.value != null && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 16, width: '50%' }}>
                            évènement répété chaque <Text style={{ color: colors.text }}>{TraduireRecurrence(recurrence.value)}</Text> jusqu'au:
                        </Text>
                        {Platform.OS === 'android' && (
                            <TouchableOpacity
                                onPress={() => setMontrerRecPicker(true)}
                                hitSlop={{ top: 24 }}
                                disabled={dateTimeDisabled}
                                style={s.androidRecCard}
                            >
                                <Text style={s.inputTemps}>{finRecurrence ? convertirTimestampDateCourte(finRecurrence) : 0}</Text>
                            </TouchableOpacity>
                        )}
                        {montrerRecPicker && (
                            <RNDateTimePicker
                                value={finRecurrence ? finRecurrence.toJSDate() : start.toJSDate()}
                                mode="date"
                                minimumDate={start.toJSDate()}
                                display={Platform.OS === 'android' ? 'calendar' : 'default'}
                                onChange={(e, pickedDate) => {
                                    if (e.type === 'set' && pickedDate) {
                                        const dateDt = DateTime.fromJSDate(pickedDate)
                                        setFinRecurrence(dateDt.endOf('day'))
                                        if (Platform.OS === 'android') setMontrerRecPicker(false)
                                    } else if (Platform.OS === 'android') {
                                        setMontrerRecPicker(false)
                                    }
                                }}
                                {...(Platform.OS === 'ios' ? { timeZoneName: event.timezone, accentColor: colors.text } : {})}
                            />
                        )}
                    </View>
                )}
            </View>

            <View style={[s.champ, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'flex-end' }]}>
                <Animated.Text style={s.label}>{eventPrivate ? 'privé' : 'public'}</Animated.Text>
                {mode != 'details'
                    ?   <View style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>                    
                            <Icon name='lock-open' color={eventPrivate ? colors.muted : colors.text} size={24}/>
                            <SwitchAbs
                                value={eventPrivate}
                                onChange={() => { setPrivate((prev) => !prev) }}
                                trackColor={{false:colors.muted, true:colors.muted}}
                            />
                            <Icon name='lock-closed' color={eventPrivate ? colors.text : colors.muted} size={24}/>
                        </View>
                    : <Icon name={eventPrivate ? 'lock-closed' : 'lock-open' } color={colors.text} size={32} />
                    
                }
                
            </View>

            <View style={s.champ}>
                <Text style={s.label}>participants</Text>
                <View style={{width: '100%', borderRadius: 8, minHeight:32, maxHeight:192 }}>
                    <ParticipantsListe participantsUrl={eventParticipantsControlUrl} />
                </View>
            </View>

            <Modal visible={showTextModal} transparent={true} backdropColor="transparent">
                <Pressable />
            </Modal>
        </ScrollView>
    )
})

export default EventForm