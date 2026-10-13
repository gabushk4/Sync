import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import { Event } from '@/types/calendar'
import { DateTime } from 'luxon'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Image, NativeScrollEvent, NativeSyntheticEvent, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import Animated, { scrollTo, useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'

/** Props of CalendarMonthView. Part of user story 5 (conventional month calendar view). */
export type CalendarMonthViewProps = {
    monthDate: DateTime;
    selectedDate?: DateTime;
    events?: Event[];
    onSelectDay: (date: DateTime) => void;
    onChangeMonth: (direction: 1 | -1) => void;
    /** Called when the user taps anywhere in the calendar that isn't a day, the header, or a swipe. */
    onDismiss: () => void;
    /** Called once a long-press-and-drag range selection ends, with the days sorted earliest-first. */
    onSelectRange?: (debut: DateTime, fin: DateTime) => void;
}

/** How far (in months) the calendar can be browsed in each direction. */
const MOIS_PAR_DIRECTION = 24
const NOMBRE_MOIS = MOIS_PAR_DIRECTION * 2 + 1
const INDEX_INITIAL = MOIS_PAR_DIRECTION

/** The fixed list of month indices the FlatList renders (0..NOMBRE_MOIS-1). */
const INDICES_MOIS = Array.from({ length: NOMBRE_MOIS }, (_, i) => i)

/**
 * Builds the weeks (each an array of 7 days) needed to display a full month
 * grid, including the leading/trailing days from the previous/next month
 * that complete the first/last week. The week's start day follows Luxon's
 * global locale (`Settings.defaultLocale`).
 *
 * @param {DateTime} mois - Any date within the month to build weeks for.
 * @returns {DateTime[][]} A list of weeks, each an array of exactly 7 days.
 */
function construireSemaines(mois: DateTime): DateTime[][] {
    const debutGrille = mois.startOf('month').startOf('week')
    const finGrille = mois.endOf('month').endOf('week')

    const jours: DateTime[] = []
    let jourCourant = debutGrille
    while (jourCourant <= finGrille) {
        jours.push(jourCourant)
        jourCourant = jourCourant.plus({ day: 1 })
    }

    const semaines: DateTime[][] = []
    for (let i = 0; i < jours.length; i += 7) {
        semaines.push(jours.slice(i, i + 7))
    }
    return semaines
}

/**
 * Full-month calendar grid, with:
 * - A dot under any day that has at least one event (`events`).
 * - The `selectedDate` day highlighted with a filled circle.
 * - Swipeable month navigation, bounded to ±2 years from wherever the
 *   calendar was first opened (header title and grid slide together).
 * - Tap outside the grid/header to dismiss (`onDismiss`).
 * - Long-press-and-drag on a day to select a range (`onSelectRange`).
 *
 * Internationalization: month/weekday names and the week's start day come
 * from Luxon's global locale, set once at app startup from the user's
 * language (see `locales/initLocale.js`). This component only uses
 * locale-agnostic format tokens ('MMMM', 'EEE').
 *
 * Part of user story 5 (conventional month calendar view).
 *
 * Implementation: months are addressed by a fixed index (0..NOMBRE_MOIS-1)
 * into a bounded `FlatList`, rather than a small window of months that gets
 * shifted and re-centred on every swipe. This avoids needing to reset the
 * scroll position after each swipe at all — the FlatList simply stays
 * wherever it naturally scrolled to — which removes the frame-timing race
 * that a shift-and-recentre approach is prone to.
 *
 * @param {CalendarMonthViewProps} props
 * @param {DateTime} props.monthDate - Any date within the month to display.
 * @param {DateTime} [props.selectedDate] - Currently selected day, highlighted in the grid.
 * @param {Event[]} [props.events] - Events for the currently displayed month, used for the day dots.
 * @param {(date: DateTime) => void} props.onSelectDay - Called with the tapped day when a cell is pressed.
 * @param {(direction: 1 | -1) => void} props.onChangeMonth - Called with -1/1 once a swipe or arrow tap has switched month.
 * @param {() => void} props.onDismiss - Called when the user taps outside the interactive parts of the calendar.
 * @param {(debut: DateTime, fin: DateTime) => void} [props.onSelectRange] - Called with the sorted range once a long-press-drag selection ends.
 * @returns {JSX.Element}
 */
export default function CalendarMonthView({
    monthDate,
    selectedDate,
    events = [],
    onSelectDay,
    onChangeMonth,
    onDismiss,
    onSelectRange,
}: CalendarMonthViewProps) {
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()

    let iconeGauche = require('@/assets/icones/fleche-g-light-icon.png')
    let iconeDroite = require('@/assets/icones/fleche-d-light-icon.png')
    if (colorScheme === 'dark') {
        iconeGauche = require('@/assets/icones/fleche-g-dark-icon.png')
        iconeDroite = require('@/assets/icones/fleche-d-dark-icon.png')
    }

    // ISO date strings with at least one event, for the day dots. Every day an
    // event spans gets a dot (it used to mark only the start day of multi-day events).
    const datesAvecEvenements = useMemo(() => {
        const dates = new Set<string>()
        for (const evenement of events) {
            if (!evenement?.debut) continue
            const dernierJour = (evenement.fin ?? evenement.debut).startOf('day')
            // Capped at 62 days so a malformed range can't loop for long.
            for (let jour = evenement.debut.startOf('day'), n = 0; jour <= dernierJour && n < 62; jour = jour.plus({ days: 1 }), n++) {
                const dateTexte = jour.toISODate()
                if (dateTexte) dates.add(dateTexte)
            }
        }
        return Array.from(dates)
    }, [events])

    // Fixed reference point: index INDEX_INITIAL always maps to whichever
    // month the calendar was first opened on, so every other index's month
    // never needs remapping.
    const ancreRef = useRef(monthDate.startOf('month'))

    /**
     * Converts a month index to the month it represents.
     *
     * @param {number} index - A value in [0, NOMBRE_MOIS - 1].
     * @returns {DateTime}
     */
    function moisPourIndex(index: number): DateTime {
        return ancreRef.current.plus({ month: index - INDEX_INITIAL })
    }

    /**
     * Converts a month to its index, clamped to the browsable range.
     *
     * @param {DateTime} mois
     * @returns {number}
     */
    function indexPourMois(mois: DateTime): number {
        const diff = Math.round(mois.startOf('month').diff(ancreRef.current, 'months').months)
        return Math.min(NOMBRE_MOIS - 1, Math.max(0, INDEX_INITIAL + diff))
    }

    // The month currently centred/active. Mirrored into a ref for the same
    // reason as plageDebut/plageFin below: values read from inside the
    // PanResponder's handlers (created once) must come from a ref, not
    // straight from render-time state.
    const [indexActuel, setIndexActuel] = useState(() => indexPourMois(monthDate))
    const indexActuelRef = useRef(indexActuel)
    indexActuelRef.current = indexActuel

    const moisActuel = moisPourIndex(indexActuel)
    const semainesActuel = useMemo(() => construireSemaines(moisActuel), [moisActuel])
    const semainesActuelRef = useRef(semainesActuel)
    semainesActuelRef.current = semainesActuel

    // Measured grid width; also the width of one grid FlatList page.
    const [largeur, setLargeur] = useState(0)
    const largeurRef = useRef(largeur)
    largeurRef.current = largeur

    // Measured header title width; also the width of one title FlatList page.
    const [largeurTitre, setLargeurTitre] = useState(0)

    const flatListRef = useAnimatedRef<Animated.FlatList<number>>()
    const titreListRef = useAnimatedRef<Animated.FlatList<number>>()

    // Same approach as the home screen's linked lists: the grid (the only
    // list the user drags) writes its offset into a shared value, and the
    // title list follows it on the UI thread via scrollTo. The title pages
    // are narrower than the grid pages, so the offset is scaled per page.
    const scrollX = useSharedValue(0);
    const largeurShared = useSharedValue(0)
    const largeurTitreShared = useSharedValue(0)

    useLayoutEffect(() => {
        largeurShared.value = largeur
        largeurTitreShared.value = largeurTitre
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [largeur, largeurTitre])

    const surScrollGrille = useAnimatedScrollHandler({
        onScroll: (e) => {
            scrollX.value = e.contentOffset.x
        },
    })

    useAnimatedReaction(
        () => scrollX.value,
        (x) => {
            if (largeurShared.value === 0 || largeurTitreShared.value === 0) return
            scrollTo(titreListRef, (x / largeurShared.value) * largeurTitreShared.value, 0, false)
        }
    )

    // Seeds scrollX to match the grid's initial position once the width is
    // known (`initialScrollIndex` moves the FlatList itself, but doesn't
    // fire an onScroll event, so scrollX wouldn't otherwise reflect it).
    useLayoutEffect(() => {
        if (largeur === 0) return
        scrollX.value = indexActuelRef.current * largeur
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [largeur])

    // Jumps to match `monthDate` when it changes for a reason other than our
    // own swipe (e.g. opening the calendar on a new date). A no-op for our
    // own swipes: indexActuelRef is already updated by then (see
    // surSwipeTermine), so it already matches.
    useLayoutEffect(() => {
        if (largeur === 0) return
        const indexVoulu = indexPourMois(monthDate)
        if (indexVoulu === indexActuelRef.current) return

        indexActuelRef.current = indexVoulu
        setIndexActuel(indexVoulu)
        flatListRef.current?.scrollToOffset({ offset: indexVoulu * largeur, animated: false })
        scrollX.value = indexVoulu * largeur
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monthDate, largeur])

    // onMomentumScrollEnd can occasionally fire twice for a single swipe
    // (e.g. a small settle correction right after the first "end" event).
    // Ignoring a second call that lands right after the first one avoids
    // advancing the month twice for what was really one gesture.
    const dernierTraitementRef = useRef(0)

    /**
     * Called once the FlatList settles on a page after a swipe: updates the
     * active index and tells the parent which month is now shown.
     *
     * @param {NativeSyntheticEvent<NativeScrollEvent>} e - The scroll event, used for its final `contentOffset.x`.
     * @returns {void}
     */
    function surSwipeTermine(e: NativeSyntheticEvent<NativeScrollEvent>) {
        if (largeur === 0) return

        const maintenant = Date.now()
        if (maintenant - dernierTraitementRef.current < 300) return

        const nouvelIndex = Math.round(e.nativeEvent.contentOffset.x / largeur)
        if (nouvelIndex === indexActuelRef.current) return

        dernierTraitementRef.current = maintenant
        const direction = nouvelIndex > indexActuelRef.current ? 1 : -1
        indexActuelRef.current = nouvelIndex
        setIndexActuel(nouvelIndex)
        onChangeMonth(direction)
    }

    /**
     * Arrow tap: slides the grid (and, through scrollX, the title) to the
     * adjacent month with an animation, then tells the parent. The index is
     * updated up front so the resulting scroll-end event and the parent's
     * new `monthDate` are both recognised as already handled.
     *
     * @param {1 | -1} direction - 1 for the next month, -1 for the previous one.
     * @returns {void}
     */
    function allerAuMois(direction: 1 | -1) {
        const nouvelIndex = indexActuelRef.current + direction
        if (nouvelIndex < 0 || nouvelIndex > NOMBRE_MOIS - 1 || largeur === 0) return

        dernierTraitementRef.current = Date.now()
        indexActuelRef.current = nouvelIndex
        setIndexActuel(nouvelIndex)
        flatListRef.current?.scrollToOffset({ offset: nouvelIndex * largeur, animated: true })
        onChangeMonth(direction)
    }

    // --- Long-press-and-drag range selection (active month only) ---
    const [plageDebut, setPlageDebut] = useState<DateTime | null>(null)
    const [plageFin, setPlageFinState] = useState<DateTime | null>(null)
    const plageDebutRef = useRef<DateTime | null>(null)
    const plageFinRef = useRef<DateTime | null>(null)
    const onSelectRangeRef = useRef(onSelectRange)
    onSelectRangeRef.current = onSelectRange

    // Absolute on-screen position of the active grid, for converting a
    // PanResponder touch position into a row/column.
    const grilleActiveRef = useRef<View>(null)
    const positionGrilleActive = useRef({ x: 0, y: 0 })

    /**
     * Finds which day of the active month's grid an absolute screen position
     * falls over (every cell is a `largeur / 7` square).
     *
     * @param {number} pageX - Absolute X position on screen.
     * @param {number} pageY - Absolute Y position on screen.
     * @returns {DateTime | null} The day under that position, or null if outside the grid.
     */
    function jourSousLeDoigt(pageX: number, pageY: number): DateTime | null {
        const largeurActuelle = largeurRef.current
        if (largeurActuelle === 0) return null

        const tailleCase = largeurActuelle / 7
        const xRelatif = pageX - positionGrilleActive.current.x
        const yRelatif = pageY - positionGrilleActive.current.y
        if (xRelatif < 0 || yRelatif < 0) return null

        const semaines = semainesActuelRef.current
        const colonne = Math.min(6, Math.floor(xRelatif / tailleCase))
        const rangee = Math.min(semaines.length - 1, Math.floor(yRelatif / tailleCase))

        return semaines[rangee]?.[colonne] ?? null
    }

    /**
     * Starts a range selection on `jour` (from a day cell's `onLongPress`).
     *
     * @param {DateTime} jour - The day that was long-pressed.
     * @returns {void}
     */
    function demarrerSelection(jour: DateTime) {
        plageDebutRef.current = jour
        plageFinRef.current = jour
        setPlageDebut(jour)
        setPlageFinState(jour)
    }

    /**
     * Updates the in-progress range's end day as the finger drags.
     *
     * @param {DateTime} jour - The day currently under the finger.
     * @returns {void}
     */
    function etendreSelection(jour: DateTime) {
        plageFinRef.current = jour
        setPlageFinState(jour)
    }

    /**
     * Ends the range selection: reports the sorted range via
     * `onSelectRange`, then clears the selection state.
     *
     * @returns {void}
     */
    function terminerSelection() {
        const debut = plageDebutRef.current
        const fin = plageFinRef.current
        if (debut && fin) {
            const [du, au] = debut <= fin ? [debut, fin] : [fin, debut]
            onSelectRangeRef.current?.(du, au)
        }
        plageDebutRef.current = null
        plageFinRef.current = null
        setPlageDebut(null)
        setPlageFinState(null)
    }

    // Capture-phase handler takes over the touch from a day cell's
    // TouchableOpacity as soon as a long-press has started a selection,
    // letting the drag continue across the whole grid.
    const panResponderSelection = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponderCapture: () => plageDebutRef.current !== null,
            onPanResponderMove: (_, gestureState) => {
                const jour = jourSousLeDoigt(gestureState.moveX, gestureState.moveY)
                if (jour) etendreSelection(jour)
            },
            onPanResponderRelease: () => terminerSelection(),
            onPanResponderTerminate: () => terminerSelection(),
        })
    ).current

    const s = useMemo(() => StyleSheet.create({
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
        entete: {
            flex: 1,
            overflow: 'hidden',
        },
        pageTitre: {
            justifyContent: 'center',
        },
        monthLabel: {
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 20,
            textAlign: 'center',
        },
        arrow: {
            height: 36,
            width: 36,
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
        dayCircleEnSelection: {
            backgroundColor: colors.border,
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
    }), [colors, fonts])

    /**
     * Renders one page of the FlatList: a full month's grid of weeks. Only
     * the active (currently centred) month gets the range-selection pan
     * handlers and position measurement attached.
     *
     * @param {{ item: number }} info - `item` is the month index to render.
     * @returns {JSX.Element}
     */
    function renderMois({ item: index }: { item: number }) {
        const mois = moisPourIndex(index)
        const semaines = index === indexActuel ? semainesActuel : construireSemaines(mois)
        const estActif = index === indexActuel

        const plageMin = plageDebut && plageFin ? (plageDebut <= plageFin ? plageDebut : plageFin) : null
        const plageMax = plageDebut && plageFin ? (plageDebut <= plageFin ? plageFin : plageDebut) : null
        // Hidden everywhere while a range is being dragged, so the old
        // confirmed selection doesn't compete visually with the new one.
        const enTrainDeSelectionner = plageDebut !== null

        return (
            <View
                style={{ width: largeur }}
                ref={estActif ? grilleActiveRef : undefined}
                onLayout={estActif ? () => {
                    grilleActiveRef.current?.measureInWindow((x, y) => {
                        positionGrilleActive.current = { x, y }
                    })
                } : undefined}
                {...(estActif ? panResponderSelection.panHandlers : {})}
            >
                {semaines.map((semaine, i) => (
                    <View key={i} style={s.week}>
                        {semaine.map(jour => {
                            const horsMois = jour.month !== mois.month
                            const estSelectionne = !enTrainDeSelectionner && !!selectedDate && jour.hasSame(selectedDate, 'day')
                            const aUnEvenement = datesAvecEvenements.includes(jour.toISODate() ?? '')
                            const enSelection = estActif && !!plageMin && !!plageMax
                                && jour >= plageMin && jour <= plageMax

                            // Confirmed selection takes priority over the lighter, in-progress range highlight.
                            let styleCercle
                            if (estSelectionne) styleCercle = s.dayCircleSelectionne
                            else if (enSelection) styleCercle = s.dayCircleEnSelection

                            return (
                                <TouchableOpacity
                                    key={jour.toISODate()}
                                    style={s.dayCell}
                                    onPress={() => {
                                        // A tap right after a long-press (no drag) still
                                        // finalizes the 1-day selection, instead of navigating.
                                        if (plageDebutRef.current) terminerSelection()
                                        else onSelectDay(jour)
                                    }}
                                    onLongPress={estActif ? () => demarrerSelection(jour) : undefined}
                                >
                                    <View style={styleCercle}>
                                        <Text style={[
                                            s.dayLabel,
                                            estSelectionne && s.dayLabelSelectionne,
                                            !estSelectionne && horsMois && s.dayLabelHorsMois,
                                        ]}>
                                            {jour.day}
                                        </Text>
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

    /**
     * Renders one page of the header's title FlatList: a month's name.
     *
     * @param {{ item: number }} info - `item` is the month index to render.
     * @returns {JSX.Element}
     */
    function renderTitre({ item: index }: { item: number }) {
        return (
            <View style={[s.pageTitre, { width: largeurTitre }]}>
                <Text style={s.monthLabel}>{moisPourIndex(index).toFormat('MMMM yyyy')}</Text>
            </View>
        )
    }

    return (
        // Pressable, not a plain View: an empty-space tap bubbles up to
        // onDismiss, while child touchables (days, arrows, the FlatList)
        // claim their own touches first.
        <Pressable style={s.container} onPress={onDismiss}>
            {/* No-op onPress: claims taps in the header's empty space so they
                don't fall through to the container's onDismiss above. */}
            <Pressable style={s.header} onPress={() => {}}>
                <TouchableOpacity
                    onPress={() => allerAuMois(-1)}
                    disabled={indexActuel <= 0}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Image source={iconeGauche} style={s.arrow} resizeMode="contain" />
                </TouchableOpacity>

                <View style={s.entete} onLayout={(e) => setLargeurTitre(e.nativeEvent.layout.width)}>
                    {largeurTitre > 0 && (
                        // Driven by the grid's scroll (see scrollX), never dragged directly.
                        <Animated.FlatList
                            ref={titreListRef}
                            data={INDICES_MOIS}
                            keyExtractor={(index) => String(index)}
                            renderItem={renderTitre}
                            horizontal
                            scrollEnabled={false}
                            showsHorizontalScrollIndicator={false}
                            initialScrollIndex={indexActuel}
                            getItemLayout={(_, index) => ({ length: largeurTitre, offset: largeurTitre * index, index })}
                        />
                    )}
                </View>

                <TouchableOpacity
                    onPress={() => allerAuMois(1)}
                    disabled={indexActuel >= NOMBRE_MOIS - 1}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Image source={iconeDroite} style={s.arrow} resizeMode="contain" />
                </TouchableOpacity>
            </Pressable>

            <View style={s.weekdaysRow}>
                {semainesActuel[0].map(jour => (
                    <View key={jour.weekday} style={s.weekdayCell}>
                        <Text style={s.weekdayLabel}>{jour.toFormat('EEE')}</Text>
                    </View>
                ))}
            </View>

            <View onLayout={(e) => setLargeur(e.nativeEvent.layout.width)}>
                {largeur > 0 && (
                    <Animated.FlatList
                        ref={flatListRef}
                        data={INDICES_MOIS}
                        keyExtractor={(index) => String(index)}
                        renderItem={renderMois}
                        extraData={[indexActuel, plageDebut, plageFin, selectedDate, datesAvecEvenements]}
                        horizontal
                        pagingEnabled
                        // Disabled during a range drag so it doesn't compete with the month swipe.
                        scrollEnabled={plageDebut === null}
                        showsHorizontalScrollIndicator={false}
                        initialScrollIndex={indexActuel}
                        getItemLayout={(_, index) => ({ length: largeur, offset: largeur * index, index })}
                        onScroll={surScrollGrille}
                        scrollEventThrottle={16}
                        onScrollEndDrag={surSwipeTermine}
                    />
                )}
            </View>
        </Pressable>
    )
}
