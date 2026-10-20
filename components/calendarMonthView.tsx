import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import { convertirTimestampHeure } from '@/functions/convertirTimestamp'
import { dernierInstant, estJourFerie } from '@/functions/evenementsMembre'
import ouvrirDetailsEvenement from '@/functions/ouvrirDetailsEvenement'
import { Event } from '@/types/calendar'
import Spinner from '@/components/spinner'
import Ionicons from '@react-native-vector-icons/ionicons'
import * as Haptics from 'expo-haptics'
import { DateTime } from 'luxon'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { scrollTo, useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

/**
 * Month calendar component of user story 5: grid, hold-and-drag range selection
 * and the selected days' events list.
 *
 * @author Philip — user story 5 (month calendar)
 */

/** One day of the list under the grid: the day, the events it shows and its holidays' names. */
type JourListe = { jour: DateTime; evenements: Event[]; feries: string[] }

/** A range of days selected with a long-press-and-drag, earliest day first. */
export type PlageJours = { debut: DateTime; fin: DateTime }

/** Props of CalendarMonthView (user story 5). */
export type CalendarMonthViewProps = {
    monthDate: DateTime;
    selectedDate?: DateTime;
    /** Confirmed long-press range (kept until a day is tapped), highlighted like a selected day. */
    plageSelectionnee?: PlageJours | null;
    events?: Event[];
    onSelectDay: (date: DateTime) => void;
    /** Called with the newly shown month (start of month) after a swipe or arrow tap. */
    onChangeMonth: (mois: DateTime) => void;
    /** Called once a long-press-and-drag range selection ends, with the days sorted earliest-first. */
    onSelectRange?: (debut: DateTime, fin: DateTime) => void;
    /** The displayed month's events are still loading: the list shows a spinner
     * instead of "no events" (Philip — user story 5). */
    chargement?: boolean;
}

/** Container padding (both sides) and header arrow size, for the width estimated before layout. */
const PADDING_CALENDRIER = 8
const TAILLE_FLECHE = 36

/** How far (in months) the calendar can be browsed in each direction. */
const MOIS_PAR_DIRECTION = 24
const NOMBRE_MOIS = MOIS_PAR_DIRECTION * 2 + 1
const INDEX_INITIAL = MOIS_PAR_DIRECTION

/** The fixed list of month indices the FlatList renders (0..NOMBRE_MOIS-1). */
const INDICES_MOIS = Array.from({ length: NOMBRE_MOIS }, (_, i) => i)

/** How long a day must be held before the drag selects a range (ms). */
const DELAI_HOLD = 300
/** Gap between a range box and its cells' edges. */
const RETRAIT_SEGMENT = 3
/** Spring of the range box as it grows / shrinks under the finger. */
const RESSORT_SEGMENT = { damping: 20, stiffness: 300, mass: 0.6 }

type SegmentPlageProps = {
    rangee: number;
    colonneDebut: number;
    colonneFin: number;
    tailleCase: number;
    couleur: string;
}

/**
 * The part of a range box on one week row (a range spanning several weeks gets
 * one segment per row). Pops in when it appears, then springs to follow the
 * row's first/last selected column as the finger drags.
 *
 * @author Philip — user story 5 (month calendar)
 * @param {SegmentPlageProps} props
 * @returns {JSX.Element}
 */
function SegmentPlage({ rangee, colonneDebut, colonneFin, tailleCase, couleur }: SegmentPlageProps) {
    const gauche = useSharedValue(colonneDebut * tailleCase + RETRAIT_SEGMENT)
    const largeur = useSharedValue((colonneFin - colonneDebut + 1) * tailleCase - 2 * RETRAIT_SEGMENT)
    const apparition = useSharedValue(0)

    useEffect(() => {
        apparition.value = withSpring(1, RESSORT_SEGMENT)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        gauche.value = withSpring(colonneDebut * tailleCase + RETRAIT_SEGMENT, RESSORT_SEGMENT)
        largeur.value = withSpring((colonneFin - colonneDebut + 1) * tailleCase - 2 * RETRAIT_SEGMENT, RESSORT_SEGMENT)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colonneDebut, colonneFin, tailleCase])

    const styleAnime = useAnimatedStyle(() => ({
        left: gauche.value,
        width: largeur.value,
        opacity: Math.min(1, apparition.value),
        transform: [{ scale: 0.8 + 0.2 * apparition.value }],
    }))

    return (
        <Animated.View
            pointerEvents="none"
            style={[{
                position: 'absolute',
                top: rangee * tailleCase + RETRAIT_SEGMENT,
                height: tailleCase - 2 * RETRAIT_SEGMENT,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: couleur,
                overflow: 'hidden',
            }, styleAnime]}
        >
            {/* Light fill: the palette colours are opaque, so the tint is a faded layer. */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: couleur, opacity: 0.15 }]} />
        </Animated.View>
    )
}

/**
 * Builds the weeks (each an array of 7 days) needed to display a full month
 * grid, including the leading/trailing days from the previous/next month
 * that complete the first/last week. The week's start day follows Luxon's
 * global locale (`Settings.defaultLocale`).
 *
 * @author Philip — user story 5 (month calendar)
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
 * - Tap a day to select it (`onSelectDay`); hold a day then drag to select a
 *   range (`onSelectRange`). The range is outlined by a box that grows with the
 *   finger and stays (`plageSelectionnee`) until a day is tapped. Creating the
 *   event is left to the "+" button.
 * - Below the grid, a scrollable list of the selected day's (or range's)
 *   events; tapping one opens its details.
 *
 * Internationalization: month/weekday names and the week's start day come
 * from Luxon's global locale, set once at app startup from the user's
 * language (see `locales/initLocale.js`). This component only uses
 * locale-agnostic format tokens ('MMMM', 'EEE').
 *
 * Implementation: months are addressed by a fixed index (0..NOMBRE_MOIS-1)
 * into a bounded `FlatList`, rather than a small window of months that gets
 * shifted and re-centred on every swipe. This avoids needing to reset the
 * scroll position after each swipe at all — the FlatList simply stays
 * wherever it naturally scrolled to — which removes the frame-timing race
 * that a shift-and-recentre approach is prone to.
 *
 * @author Philip — user story 5 (month calendar)
 * @param {CalendarMonthViewProps} props
 * @param {DateTime} props.monthDate - Any date within the month to display.
 * @param {DateTime} [props.selectedDate] - Currently selected day, highlighted in the grid.
 * @param {PlageJours | null} [props.plageSelectionnee] - Confirmed long-press range, highlighted in the grid.
 * @param {Event[]} [props.events] - Events for the currently displayed month, used for the day dots and the list.
 * @param {(date: DateTime) => void} props.onSelectDay - Called with the tapped day when a cell is pressed.
 * @param {(mois: DateTime) => void} props.onChangeMonth - Called with the new month once a swipe or arrow tap has switched it.
 * @param {(debut: DateTime, fin: DateTime) => void} [props.onSelectRange] - Called with the sorted range once a long-press-drag selection ends.
 * @param {boolean} [props.chargement=false] - The displayed month's events are loading (spinner in the list).
 * @returns {JSX.Element}
 */
export default function CalendarMonthView({
    monthDate,
    selectedDate,
    plageSelectionnee,
    events = [],
    onSelectDay,
    onChangeMonth,
    onSelectRange,
    chargement = false,
}: CalendarMonthViewProps) {
    const { t } = useTranslation('calendar')
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
    // A Set: every day cell looks itself up (it was an array scanned per cell).
    const datesAvecEvenements = useMemo(() => {
        const dates = new Set<string>()
        for (const evenement of events) {
            if (!evenement?.debut) continue
            // Same rule as the list (dernierInstant): an event ending exactly at
            // midnight doesn't get a dot on the next day.
            const dernierJour = dernierInstant(evenement).startOf('day')
            // Capped at 62 days so a malformed range can't loop for long.
            for (let jour = evenement.debut.startOf('day'), n = 0; jour <= dernierJour && n < 62; jour = jour.plus({ days: 1 }), n++) {
                const dateTexte = jour.toISODate()
                if (dateTexte) dates.add(dateTexte)
            }
        }
        return dates
    }, [events])

    // Days covered by the current selection: the confirmed range, else the tapped day.
    const debutSelection = plageSelectionnee?.debut.startOf('day') ?? selectedDate?.startOf('day')
    const finSelection = plageSelectionnee?.fin.endOf('day') ?? selectedDate?.endOf('day')

    // The list under the grid, one section per day: the day's date, then its events
    // (earliest first). A multi-day event shows under each day it covers. For a range,
    // days without events are skipped; a single tapped day is always shown.
    const joursListe = useMemo((): JourListe[] => {
        if (!debutSelection || !finSelection) return []
        const jours: JourListe[] = []
        // Capped at 62 days, like the dots.
        for (let jour = debutSelection, n = 0; jour <= finSelection && n < 62; jour = jour.plus({ days: 1 }), n++) {
            const debutJour = jour.startOf('day')
            const finJour = jour.endOf('day')
            const duJour = events
                .filter((evenement) => evenement?.debut && evenement.debut <= finJour
                    && dernierInstant(evenement) >= debutJour)
                .sort((a, b) => (a.debut?.toMillis() ?? 0) - (b.debut?.toMillis() ?? 0))
            // Holidays are a label next to the day's title, not event cards (they don't occupy the day).
            const evenementsJour = duJour.filter((evenement) => !estJourFerie(evenement))
            const feries = Array.from(new Set(duJour
                .filter(estJourFerie)
                .map((evenement) => evenement.titre?.trim())
                .filter((titre): titre is string => !!titre)))
            if (evenementsJour.length > 0 || feries.length > 0 || !plageSelectionnee) {
                jours.push({ jour: debutJour, evenements: evenementsJour, feries })
            }
        }
        return jours
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, debutSelection?.toMillis(), finSelection?.toMillis(), !!plageSelectionnee])

    /**
     * Start/end labels of an event's time column on a given day. A multi-day event
     * shows an arrow on the side that continues on another day, or "all day" when
     * it covers the whole day.
     *
     * @author Philip — user story 5 (month calendar)
     * @param {Event} evenement
     * @param {DateTime} jour - The day the event is listed under.
     * @returns {{ haut: string, bas: string }}
     */
    function heuresPourJour(evenement: Event, jour: DateTime): { haut: string; bas: string } {
        const debut = evenement.debut as DateTime
        const fin = (evenement.fin ?? evenement.debut) as DateTime
        const commenceCeJour = debut.hasSame(jour, 'day')
        const finitCeJour = dernierInstant({ debut, fin }).hasSame(jour, 'day')
        if (commenceCeJour && finitCeJour) return { haut: convertirTimestampHeure(debut), bas: convertirTimestampHeure(fin) }
        if (commenceCeJour) return { haut: convertirTimestampHeure(debut), bas: '→' }
        if (finitCeJour) return { haut: '→', bas: convertirTimestampHeure(fin) }
        return { haut: t('month.allDay'), bas: '' }
    }

    /**
     * "Day 2 of 3" for an event spanning several days, else null.
     *
     * @author Philip — user story 5 (month calendar)
     * @param {Event} evenement
     * @param {DateTime} jour - The day the event is listed under.
     * @returns {string | null}
     */
    function etiquetteMultiJours(evenement: Event, jour: DateTime): string | null {
        const debut = (evenement.debut as DateTime).startOf('day')
        const dernier = dernierInstant(evenement).startOf('day')
        const total = Math.round(dernier.diff(debut, 'days').days) + 1
        if (total <= 1) return null
        const numero = Math.round(jour.startOf('day').diff(debut, 'days').days) + 1
        return t('month.dayOf', { n: numero, total })
    }

    /**
     * Header of a day section, e.g. "Today · Saturday, October 4".
     *
     * @author Philip — user story 5 (month calendar)
     * @param {DateTime} jour
     * @returns {string}
     */
    function titreJour(jour: DateTime): string {
        const date = jour.toFormat('cccc d MMMM')
        if (jour.hasSame(DateTime.now(), 'day')) return `${t('month.today')} · ${date}`
        return date.charAt(0).toUpperCase() + date.slice(1)
    }

    // Fixed reference point: index INDEX_INITIAL always maps to whichever
    // month the calendar was first opened on, so every other index's month
    // never needs remapping.
    const ancreRef = useRef(monthDate.startOf('month'))

    /**
     * Converts a month index to the month it represents.
     *
     * @author Philip — user story 5 (month calendar)
     * @param {number} index - A value in [0, NOMBRE_MOIS - 1].
     * @returns {DateTime}
     */
    function moisPourIndex(index: number): DateTime {
        return ancreRef.current.plus({ month: index - INDEX_INITIAL })
    }

    /**
     * Converts a month to its index, clamped to the browsable range.
     *
     * @author Philip — user story 5 (month calendar)
     * @param {DateTime} mois
     * @returns {number}
     */
    function indexPourMois(mois: DateTime): number {
        const diff = Math.round(mois.startOf('month').diff(ancreRef.current, 'months').months)
        return Math.min(NOMBRE_MOIS - 1, Math.max(0, INDEX_INITIAL + diff))
    }

    // The month currently centred/active. Mirrored into a ref for the same
    // reason as plageDebut/plageFin below: values read from inside the
    // selection gesture's handlers (created once) must come from a ref, not
    // straight from render-time state.
    const [indexActuel, setIndexActuel] = useState(() => indexPourMois(monthDate))
    const indexActuelRef = useRef(indexActuel)
    indexActuelRef.current = indexActuel

    const moisActuel = moisPourIndex(indexActuel)
    // Keyed on the index: moisActuel is a new DateTime on every render, so the
    // memo never hit and the weeks were rebuilt each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const semainesActuel = useMemo(() => construireSemaines(moisActuel), [indexActuel])
    const semainesActuelRef = useRef(semainesActuel)
    semainesActuelRef.current = semainesActuel

    // Grid width; also the width of one grid FlatList page. Estimated from the window
    // so the grid shows on the first frame (it used to wait for onLayout, leaving the
    // calendar empty for a moment), then corrected by the measured layout.
    const { width: largeurFenetre } = useWindowDimensions()
    const [largeur, setLargeur] = useState(() => largeurFenetre - 2 * PADDING_CALENDRIER)
    const largeurRef = useRef(largeur)
    largeurRef.current = largeur

    // Header title width (between the two arrows); also the width of one title page.
    const [largeurTitre, setLargeurTitre] = useState(() => largeurFenetre - 2 * PADDING_CALENDRIER - 2 * TAILLE_FLECHE)

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
    // Also re-aligns the grid on the active month when the measured width differs
    // from the first-frame estimate (pages are `largeur` wide, so the old offset would
    // land between two months).
    useLayoutEffect(() => {
        if (largeur === 0) return
        scrollX.value = indexActuelRef.current * largeur
        flatListRef.current?.scrollToOffset({ offset: indexActuelRef.current * largeur, animated: false })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [largeur])

    // Jumps to match `monthDate` when it changes for a reason other than our
    // own swipe (e.g. opening the calendar on a new date). A no-op for our
    // own swipes: indexActuelRef is already updated by then (see
    // synchroniserMois), so it already matches.
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

    /**
     * Called once the grid settles on a page: makes that page the active month and
     * tells the parent. Idempotent, so it can be called from several scroll events.
     * It used to run on onScrollEndDrag, whose offset is where the finger lifts, not
     * the page the list then snaps to: a short fling changed the shown month without
     * telling the parent, so the dots and the selected day's events came from the
     * other month (e.g. Oct 4's event vanished after going to November and back).
     *
     * @author Philip — user story 5 (month calendar)
     * @param {number} offsetX - The grid's final horizontal offset.
     * @returns {void}
     */
    function synchroniserMois(offsetX: number) {
        if (largeur === 0) return
        const nouvelIndex = Math.min(NOMBRE_MOIS - 1, Math.max(0, Math.round(offsetX / largeur)))
        if (nouvelIndex === indexActuelRef.current) return

        indexActuelRef.current = nouvelIndex
        setIndexActuel(nouvelIndex)
        onChangeMonth(moisPourIndex(nouvelIndex))
    }

    /**
     * End of a drag: only handled when the list is already resting on a page (no
     * momentum follows, so onMomentumScrollEnd won't fire).
     *
     * @author Philip — user story 5 (month calendar)
     * @param {NativeSyntheticEvent<NativeScrollEvent>} e
     * @returns {void}
     */
    function surFinGlissement(e: NativeSyntheticEvent<NativeScrollEvent>) {
        const x = e.nativeEvent.contentOffset.x
        if (largeur > 0 && Math.abs(x - Math.round(x / largeur) * largeur) < 1) synchroniserMois(x)
    }

    /**
     * Arrow tap: slides the grid (and, through scrollX, the title) to the
     * adjacent month with an animation, then tells the parent. The index is
     * updated up front so the resulting scroll-end event and the parent's
     * new `monthDate` are both recognised as already handled.
     *
     * @author Philip — user story 5 (month calendar)
     * @param {1 | -1} direction - 1 for the next month, -1 for the previous one.
     * @returns {void}
     */
    function allerAuMois(direction: 1 | -1) {
        const nouvelIndex = indexActuelRef.current + direction
        if (nouvelIndex < 0 || nouvelIndex > NOMBRE_MOIS - 1 || largeur === 0) return

        indexActuelRef.current = nouvelIndex
        setIndexActuel(nouvelIndex)
        flatListRef.current?.scrollToOffset({ offset: nouvelIndex * largeur, animated: true })
        onChangeMonth(moisPourIndex(nouvelIndex))
    }

    // --- Hold-and-drag range selection (active month only) ---
    const [plageDebut, setPlageDebut] = useState<DateTime | null>(null)
    const [plageFin, setPlageFinState] = useState<DateTime | null>(null)
    const plageDebutRef = useRef<DateTime | null>(null)
    const plageFinRef = useRef<DateTime | null>(null)
    const onSelectRangeRef = useRef(onSelectRange)
    onSelectRangeRef.current = onSelectRange

    /**
     * Finds the day of the active month's grid under a point of the grid (every cell
     * is a `largeur / 7` square). Clamped to the grid, so dragging slightly past an
     * edge keeps the edge day. Uses coordinates relative to the grid: the old
     * absolute-position version measured the grid while the page was still sliding
     * in, so the touch landed on the wrong day (or none) and the hold did nothing.
     *
     * @author Philip — user story 5 (month calendar)
     * @param {number} x - X position relative to the grid.
     * @param {number} y - Y position relative to the grid.
     * @returns {DateTime | null} The day under that point, or null before layout.
     */
    function jourAuPoint(x: number, y: number): DateTime | null {
        const largeurActuelle = largeurRef.current
        if (largeurActuelle === 0) return null

        const tailleCase = largeurActuelle / 7
        const semaines = semainesActuelRef.current
        const colonne = Math.min(6, Math.max(0, Math.floor(x / tailleCase)))
        const rangee = Math.min(semaines.length - 1, Math.max(0, Math.floor(y / tailleCase)))

        return semaines[rangee]?.[colonne] ?? null
    }

    /**
     * Starts a range selection on `jour` (the held day).
     *
     * @author Philip — user story 5 (month calendar)
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
     * @author Philip — user story 5 (month calendar)
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
     * @author Philip — user story 5 (month calendar)
     * @returns {void}
     */
    function terminerSelection() {
        if (!plageDebutRef.current) return
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

    // Hold a day, then drag: a pan that only activates after the hold, and cancels
    // the day's tap when it does. Replaces a PanResponder that the month list's own
    // scrolling could steal, ending the selection as soon as it started.
    const gesteSelection = useMemo(() => Gesture.Pan()
        .runOnJS(true)
        .activateAfterLongPress(DELAI_HOLD)
        .shouldCancelWhenOutside(false)
        .onStart((e) => {
            const jour = jourAuPoint(e.x, e.y)
            if (!jour) return
            demarrerSelection(jour)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        })
        .onUpdate((e) => {
            const jour = jourAuPoint(e.x, e.y)
            if (!jour || !plageDebutRef.current || plageFinRef.current?.hasSame(jour, 'day')) return
            etendreSelection(jour)
            Haptics.selectionAsync()
        })
        .onFinalize(() => terminerSelection()),
    // Created once: the handlers only read refs and state setters.
    [])

    const s = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            padding: PADDING_CALENDRIER,
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
            height: TAILLE_FLECHE,
            width: TAILLE_FLECHE,
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
        dayLabelDansPlage: {
            fontFamily: fonts.title,
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
        // Selected day's (or range's) events, in the space under the grid.
        liste: {
            flex: 1,
            marginTop: 12,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
        },
        listeContenu: {
            paddingTop: 16,
            // Room for the "+" button that overlaps the bottom of the screen.
            paddingBottom: 80,
            gap: 20,
        },
        sectionJour: {
            gap: 8,
        },
        enteteJour: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        titreJour: {
            flex: 1,
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 16,
        },
        // Holiday(s) of the day, under its title.
        ligneFerie: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        texteFerie: {
            flex: 1,
            color: colors.secondary,
            fontFamily: fonts.body,
            fontSize: 13,
        },
        compteJour: {
            minWidth: 22,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 11,
            backgroundColor: colors.secondary,
            color: colors.background,
            fontFamily: fonts.title,
            fontSize: 12,
            textAlign: 'center',
            overflow: 'hidden',
        },
        texteVide: {
            color: colors.muted,
            fontFamily: fonts.body,
            fontSize: 14,
        },
        carteEvenement: {
            flexDirection: 'row',
            alignItems: 'stretch',
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 14,
            backgroundColor: colors.card,
        },
        colonneHeures: {
            width: 52,
            justifyContent: 'center',
            gap: 2,
        },
        heureHaut: {
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 14,
        },
        heureBas: {
            color: colors.muted,
            fontFamily: fonts.body,
            fontSize: 13,
        },
        pastilleEvenement: {
            width: 4,
            borderRadius: 2,
            backgroundColor: colors.secondary,
        },
        corpsEvenement: {
            flex: 1,
            justifyContent: 'center',
            gap: 3,
        },
        titreEvenement: {
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 15,
        },
        descriptionEvenement: {
            color: colors.muted,
            fontFamily: fonts.body,
            fontSize: 13,
        },
        etiquettes: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        etiquette: {
            color: colors.secondary,
            fontFamily: fonts.body,
            fontSize: 12,
        },
    }), [colors, fonts])

    /**
     * Renders one page of the FlatList: a full month's grid of weeks, with the
     * range box (one animated segment per week row) behind the day numbers. Only
     * the active (currently centred) month gets the hold-and-drag gesture and
     * shows the range being dragged.
     *
     * @author Philip — user story 5 (month calendar)
     * @param {{ item: number }} info - `item` is the month index to render.
     * @returns {JSX.Element}
     */
    function renderMois({ item: index }: { item: number }) {
        const mois = moisPourIndex(index)
        const semaines = index === indexActuel ? semainesActuel : construireSemaines(mois)
        const estActif = index === indexActuel
        const tailleCase = largeur / 7

        // The range being dragged replaces the confirmed one while the finger is down.
        const enTrainDeSelectionner = !!plageDebut && !!plageFin
        let plageAffichee: PlageJours | null = null
        if (plageDebut && plageFin) {
            if (estActif) plageAffichee = plageDebut <= plageFin ? { debut: plageDebut, fin: plageFin } : { debut: plageFin, fin: plageDebut }
        } else if (plageSelectionnee) {
            plageAffichee = plageSelectionnee
        }
        const plageMin = plageAffichee?.debut.startOf('day')
        const plageMax = plageAffichee?.fin.endOf('day')
        const dansPlage = (jour: DateTime) => !!plageMin && !!plageMax && jour >= plageMin && jour <= plageMax

        // First/last column of the range on each week row (its days are contiguous).
        const segments: { rangee: number; debut: number; fin: number }[] = []
        semaines.forEach((semaine, rangee) => {
            let debut = -1
            let fin = -1
            semaine.forEach((jour, colonne) => {
                if (!dansPlage(jour)) return
                if (debut < 0) debut = colonne
                fin = colonne
            })
            if (debut >= 0) segments.push({ rangee, debut, fin })
        })

        const grille = (
            <View style={{ width: largeur }}>
                {segments.map((segment) => (
                    <SegmentPlage
                        key={segment.rangee}
                        rangee={segment.rangee}
                        colonneDebut={segment.debut}
                        colonneFin={segment.fin}
                        tailleCase={tailleCase}
                        couleur={colors.secondary}
                    />
                ))}
                {semaines.map((semaine, i) => (
                    <View key={i} style={s.week}>
                        {semaine.map(jour => {
                            const horsMois = jour.month !== mois.month
                            const estDansPlage = dansPlage(jour)
                            // A tapped day is circled; a range is boxed instead.
                            const estSelectionne = !plageAffichee && !enTrainDeSelectionner
                                && !!selectedDate && jour.hasSame(selectedDate, 'day')
                            const aUnEvenement = datesAvecEvenements.has(jour.toISODate() ?? '')

                            return (
                                <TouchableOpacity
                                    key={jour.toISODate()}
                                    style={s.dayCell}
                                    // Selects this day (the parent then clears any confirmed range).
                                    onPress={() => onSelectDay(jour)}
                                >
                                    <View style={estSelectionne ? s.dayCircleSelectionne : undefined}>
                                        <Text style={[
                                            s.dayLabel,
                                            estSelectionne && s.dayLabelSelectionne,
                                            estDansPlage && s.dayLabelDansPlage,
                                            !estSelectionne && !estDansPlage && horsMois && s.dayLabelHorsMois,
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

        return estActif ? <GestureDetector gesture={gesteSelection}>{grille}</GestureDetector> : grille
    }

    /**
     * Renders one page of the header's title FlatList: a month's name.
     *
     * @author Philip — user story 5 (month calendar)
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
        // A plain View: it's a page now (closed with the header's back arrow); tapping
        // empty space used to dismiss it, which would also clash with the events list.
        <View style={s.container}>

            <View style={s.header}>
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
                            // Only the visible month and its neighbours (the default renders 21 pages).
                            windowSize={3}
                            initialNumToRender={1}
                            maxToRenderPerBatch={1}
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
            </View>

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
                        extraData={[indexActuel, plageDebut, plageFin, selectedDate, plageSelectionnee, datesAvecEvenements]}
                        horizontal
                        pagingEnabled
                        // Disabled during a range drag so it doesn't compete with the month swipe.
                        scrollEnabled={plageDebut === null}
                        showsHorizontalScrollIndicator={false}
                        initialScrollIndex={indexActuel}
                        // Only the visible month and its neighbours: the default (21 pages of 42
                        // day cells) made opening the calendar noticeably slow.
                        windowSize={3}
                        initialNumToRender={1}
                        maxToRenderPerBatch={1}
                        getItemLayout={(_, index) => ({ length: largeur, offset: largeur * index, index })}
                        onScroll={surScrollGrille}
                        scrollEventThrottle={16}
                        onScrollEndDrag={surFinGlissement}
                        onMomentumScrollEnd={(e) => synchroniserMois(e.nativeEvent.contentOffset.x)}
                    />
                )}
            </View>

            {/* Selected day's (or range's) events, one section per day, scrollable when there are many. */}
            <ScrollView style={s.liste} contentContainerStyle={s.listeContenu} showsVerticalScrollIndicator={false}>
                {!debutSelection && <Text style={s.texteVide}>{t('month.pickDay')}</Text>}
                {debutSelection && chargement && <Spinner size={24} color={colors.muted} style={{ alignSelf: 'center' }} />}
                {debutSelection && !chargement && joursListe.length === 0 && <Text style={s.texteVide}>{t('month.noEventsRange')}</Text>}
                {joursListe.map(({ jour, evenements: evenementsJour, feries }) => (
                    <View key={jour.toISODate()} style={s.sectionJour}>
                        <View style={s.enteteJour}>
                            <Text style={s.titreJour}>{titreJour(jour)}</Text>
                            {evenementsJour.length > 0 && <Text style={s.compteJour}>{evenementsJour.length}</Text>}
                        </View>
                        {feries.length > 0 && (
                            <View style={s.ligneFerie}>
                                <Ionicons name="flag-outline" size={13} color={colors.secondary} />
                                <Text style={s.texteFerie} numberOfLines={2}>{feries.join(', ')}</Text>
                            </View>
                        )}
                        {!chargement && evenementsJour.length === 0 && <Text style={s.texteVide}>{t('month.noEvents')}</Text>}
                        {evenementsJour.map((evenement) => {
                            const heures = heuresPourJour(evenement, jour)
                            const multiJours = etiquetteMultiJours(evenement, jour)
                            const description = evenement.description?.trim()
                            return (
                                <TouchableOpacity
                                    // Occurrences of a recurring event share the parent's id: the start makes the key unique.
                                    key={`${evenement.id}-${evenement.debut?.toMillis()}`}
                                    style={s.carteEvenement}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    // Same navigation as tapping the event on the timeline (ListItem).
                                    onPress={() => ouvrirDetailsEvenement(evenement)}
                                >
                                    <View style={s.colonneHeures}>
                                        <Text style={s.heureHaut} numberOfLines={1}>{heures.haut}</Text>
                                        {!!heures.bas && <Text style={s.heureBas}>{heures.bas}</Text>}
                                    </View>
                                    <View style={s.pastilleEvenement} />
                                    <View style={s.corpsEvenement}>
                                        <Text style={s.titreEvenement} numberOfLines={1}>
                                            {evenement.titre?.trim() || t('month.untitled')}
                                        </Text>
                                        {!!description && <Text style={s.descriptionEvenement} numberOfLines={1}>{description}</Text>}
                                        {(multiJours || evenement.regle_recurrence || evenement.type === 'recurrence' || !!evenement.prive) && (
                                            <View style={s.etiquettes}>
                                                {multiJours && <Text style={s.etiquette}>{multiJours}</Text>}
                                                {(evenement.regle_recurrence || evenement.type === 'recurrence') && <Ionicons name="repeat" size={13} color={colors.muted} />}
                                                {!!evenement.prive && <Ionicons name="lock-closed" size={12} color={colors.muted} />}
                                            </View>
                                        )}
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={colors.muted} style={{ alignSelf: 'center' }} />
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                ))}
            </ScrollView>
        </View>
    )
}
