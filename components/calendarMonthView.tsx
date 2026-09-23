import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import { Event } from '@/types/calendar'
import { DateTime } from 'luxon'
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'

export type CalendarMonthViewProps = {
    monthDate: DateTime;
    selectedDate?: DateTime;
    events?: Event[];
    onSelectDay: (date: DateTime) => void;
    onChangeMonth: (direction: 1 | -1) => void;
}

// Shows a full month as a grid of days (like a regular calendar).
export default function CalendarMonthView({
    monthDate,
    selectedDate,
    events = [],
    onSelectDay,
    onChangeMonth,
}: CalendarMonthViewProps) {
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()

    // Picks the right icons for the light/dark theme
    let iconeGauche = require('@/assets/icones/fleche-g-light-icon.png')
    let iconeDroite = require('@/assets/icones/fleche-d-light-icon.png')
    if (colorScheme === 'dark') {
        iconeGauche = require('@/assets/icones/fleche-g-dark-icon.png')
        iconeDroite = require('@/assets/icones/fleche-d-dark-icon.png')
    }

    // First and last day of the displayed month
    const debutMois = monthDate.startOf('month')
    const finMois = monthDate.endOf('month')

    // We want full weeks, so we add the days from the previous/next
    // month that complete the first and last week.
    const debutGrille = debutMois.startOf('week')
    const finGrille = finMois.endOf('week')

    // Build the list of every day to show, one by one
    const jours: DateTime[] = []
    let jourCourant = debutGrille
    while (jourCourant <= finGrille) {
        jours.push(jourCourant)
        jourCourant = jourCourant.plus({ day: 1 })
    }

    // Split the list of days into weeks of 7 days
    const semaines: DateTime[][] = []
    for (let i = 0; i < jours.length; i += 7) {
        const semaine = jours.slice(i, i + 7)
        semaines.push(semaine)
    }

    // List of dates (as text) that have at least one event, to show a dot
    const datesAvecEvenements: string[] = []
    for (const evenement of events) {
        if (evenement.debut) {
            const dateTexte = evenement.debut.toISODate()
            if (dateTexte && !datesAvecEvenements.includes(dateTexte)) {
                datesAvecEvenements.push(dateTexte)
            }
        }
    }

    const s = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            padding: 8,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
        },
        monthLabel: {
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 20,
        },
        arrow: {
            height: 24,
            width: 24,
        },
        weekdaysRow: {
            flexDirection: 'row',
        },
        weekdayCell: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: 4,
        },
        weekdayLabel: {
            color: colors.muted,
            fontFamily: fonts.body,
            fontSize: 12,
        },
        week: {
            flexDirection: 'row',
        },
        dayCell: {
            flex: 1,
            aspectRatio: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
        },
        dayLabel: {
            color: colors.text,
            fontFamily: fonts.body,
            fontSize: 15,
        },
        dayLabelHorsMois: {
            color: colors.muted,
        },
        dayLabelSelectionne: {
            color: colors.background,
        },
        dayCircleSelectionne: {
            backgroundColor: colors.secondary,
            borderRadius: 100,
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
        },
        dot: {
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.secondary,
        },
    })

    return (
        <View style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => onChangeMonth(-1)}>
                    <Image source={iconeGauche} style={s.arrow} resizeMode="contain" />
                </TouchableOpacity>
                <Text style={s.monthLabel}>{monthDate.toFormat('LLLL yyyy')}</Text>
                <TouchableOpacity onPress={() => onChangeMonth(1)}>
                    <Image source={iconeDroite} style={s.arrow} resizeMode="contain" />
                </TouchableOpacity>
            </View>

            <View style={s.weekdaysRow}>
                {semaines[0].map(jour => (
                    <View key={jour.weekday} style={s.weekdayCell}>
                        <Text style={s.weekdayLabel}>{jour.toFormat('ccc')}</Text>
                    </View>
                ))}
            </View>

            {semaines.map((semaine, i) => (
                <View key={i} style={s.week}>
                    {semaine.map(jour => {
                        const horsMois = jour.month !== monthDate.month
                        const estSelectionne = selectedDate ? jour.hasSame(selectedDate, 'day') : false
                        const aUnEvenement = datesAvecEvenements.includes(jour.toISODate() ?? '')

                        // Pick the day number's text style based on its state
                        let styleTexte = s.dayLabel
                        if (estSelectionne) {
                            styleTexte = { ...s.dayLabel, ...s.dayLabelSelectionne }
                        } else if (horsMois) {
                            styleTexte = { ...s.dayLabel, ...s.dayLabelHorsMois }
                        }

                        return (
                            <TouchableOpacity
                                key={jour.toISODate()}
                                style={s.dayCell}
                                onPress={() => onSelectDay(jour)}
                            >
                                <View style={estSelectionne ? s.dayCircleSelectionne : undefined}>
                                    <Text style={styleTexte}>{jour.day}</Text>
                                </View>
                                {aUnEvenement && <View style={s.dot} />}
                            </TouchableOpacity>
                        )
                    })}
                </View>
            ))}
        </View>
    )
}
