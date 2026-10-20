import Haptics from '@/abstractions/haptics'
import ToastAbs from '@/abstractions/toastAbs'
import { toastTypes } from '@/constants/toastConfig'
import { useFont } from '@/contextes/contexteFont'
import { useGestionScroll } from '@/contextes/contexteGestionListes'
import { usePalette } from '@/contextes/contextePalette'
import { useTimeline } from '@/contextes/contexteTimeline'
import { calculerTrous, PAS_SELECTION, Trou } from '@/functions/trousHoraire'
import { heuresVersDate, positionHeures } from '@/functions/positionTimeline'
import MenuCreation from './menuCreation'
import { router } from 'expo-router'
import { DateTime } from 'luxon'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import useTimelineLabelOffset from '@/hooks/useTimelineLabelOffset'

/** Hold time (ms) before dragging selects a range instead of scrolling the timeline. */
const DELAI_APPUI_LONG = 350
/** Width (px) of the zone along each edge of the row where a held finger scrolls the timeline. */
const ZONE_BORD = 56
/** Auto-scroll speed (px/s): slow at the zone's inner limit, faster against the edge. */
const VITESSE_MIN = 60
const VITESSE_MAX = 260

/** A selected range; `versFin`: its end is the side following the finger (else its start). */
type Plage = { debut: DateTime, fin: DateTime, versFin?: boolean }

/** Width (px) of the selection's hours label ("21:00 – 23:15"). */
const LARGEUR_TEXTE_SELECTION = 96

type Props = {
    /** Member's events (local DateTimes), holidays already left out. */
    evenements: { debut?: DateTime, fin?: DateTime }[]
    /** Window start (the row's displayedDate). */
    debutFenetre: DateTime
    /** Days the row holds. */
    jours: number
}

/**
 * Background of the member's timeline row: every free stretch (no event) is a block
 * outlined in blue ("Available"), greyed out once elapsed ("Past date"). Holding a
 * free block then dragging selects a range (snapped to 15 minutes, kept inside the
 * block it started in); releasing it offers to create an event on that range or to
 * add an unavailability. Releasing on an existing event shows an error instead.
 * Holding the finger near the row's left or right edge scrolls the timeline slowly,
 * until the finger moves away, is released or the free block's end is reached. The
 * selected block's label hides meanwhile.
 * Rendered behind the row's events (EventsList's `arrierePlan`): a touch on an event
 * still reaches the event, and a quick drag still scrolls the timeline (the
 * selection only starts after the hold).
 *
 * @author Philip — user story 20
 * @param {Props} props
 * @returns {JSX.Element}
 */
export default function TrousHoraire({ evenements, debutFenetre, jours }: Props) {
    const { t } = useTranslation('home')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { pxHeures, L_HEURES } = useTimeline()
    const cellule = pxHeures + L_HEURES
    const { offset, clampOffset } = useGestionScroll()
    const { width: largeurEcran } = useWindowDimensions()

    const trous = useMemo(() => {
        const debut = debutFenetre.startOf('day')
        return calculerTrous(evenements, debut, debut.plus({ days: jours }))
    }, [evenements, debutFenetre, jours])

    // Range being dragged, then kept highlighted while the menu is open.
    const [selection, setSelection] = useState<Plage | null>(null)
    const [menuOuvert, setMenuOuvert] = useState(false)
    // While dragging: where the hold started (snapped), the free block it is kept inside
    // and the screen x of the row's visible left edge. The gesture is rebuilt on every
    // render, so its callbacks always read the latest state.
    const [glisse, setGlisse] = useState<{ ancre: DateTime, trou: Trou, bordVue: number } | null>(null)
    // Finger's screen x while dragging (drives the auto-scroll near the edges).
    const [doigt, setDoigt] = useState<number | null>(null)

    const dateA = (x: number, arrondi: 'floor' | 'round' | 'aucun') => heuresVersDate(x / cellule, debutFenetre, arrondi, PAS_SELECTION)
    // Finger's screen x → x on the row's content. Computed from the scroll offset, so it
    // stays right while the timeline auto-scrolls under a still finger (no touch event).
    const xContenu = (absoluteX: number, bordVue: number) => absoluteX - bordVue + offset.value
    const borner = (date: DateTime, trou: Trou) =>
        date < trou.debut ? trou.debut : date > trou.fin ? trou.fin : date

    // Keeps the same object when the snapped range didn't change (no re-render).
    const changerSelection = (plage: Plage | null) => setSelection((avant) =>
        avant && plage && +avant.debut === +plage.debut && +avant.fin === +plage.fin ? avant : plage)

    /**
     * Range between the anchor and `date` (kept in the anchor's free block), at
     * least one step long.
     */
    const plageVers = (date: DateTime, { ancre, trou }: { ancre: DateTime, trou: Trou }): Plage => {
        const bout = borner(date, trou)
        if (+bout === +ancre) {
            const fin = borner(ancre.plus({ minutes: PAS_SELECTION }), trou)
            return +fin > +ancre
                ? { debut: ancre, fin, versFin: true }
                : { debut: borner(ancre.minus({ minutes: PAS_SELECTION }), trou), fin: ancre, versFin: false }
        }
        return bout < ancre ? { debut: bout, fin: ancre, versFin: false } : { debut: ancre, fin: bout, versFin: true }
    }

    const commencer = (x: number, absoluteX: number) => {
        const brut = dateA(x, 'aucun')
        const trou = trous.find((tr) => brut >= tr.debut && brut < tr.fin)
        if (!trou) return
        if (trou.passe) {
            Haptics.avertissement()
            ToastAbs.show({ type: toastTypes.warning, text1: t('plageLibre.passeTitre'), text2: t('plageLibre.passe') })
            return
        }
        Haptics.click()
        const depart = { ancre: borner(dateA(x, 'floor'), trou), trou, bordVue: absoluteX - x + offset.value }
        setGlisse(depart)
        setDoigt(absoluteX)
        changerSelection(plageVers(depart.ancre, depart))
    }

    const deplacer = (absoluteX: number) => {
        if (!glisse) return
        setDoigt(absoluteX)
        changerSelection(plageVers(dateA(xContenu(absoluteX, glisse.bordVue), 'round'), glisse))
    }

    const annuler = () => {
        setGlisse(null)
        setDoigt(null)
        changerSelection(null)
    }

    // Auto-scroll: while the held finger sits near an edge of the row, the timeline
    // scrolls slowly that way and the selection follows. Restarted on every finger move.
    useEffect(() => {
        if (!glisse || doigt === null) return
        const distanceDroite = largeurEcran - doigt
        const distanceGauche = doigt - glisse.bordVue
        const versDroite = distanceDroite < ZONE_BORD
        if (!versDroite && distanceGauche >= ZONE_BORD) return
        const profondeur = Math.min(1, Math.max(0, (ZONE_BORD - (versDroite ? distanceDroite : distanceGauche)) / ZONE_BORD))
        const vitesse = (VITESSE_MIN + profondeur * (VITESSE_MAX - VITESSE_MIN)) * (versDroite ? 1 : -1)
        let precedent = Date.now()
        const minuterie = setInterval(() => {
            const maintenant = Date.now()
            const secondes = (maintenant - precedent) / 1000
            precedent = maintenant
            // Nothing more to select past the free block's end: stop there.
            const brut = dateA(xContenu(doigt, glisse.bordVue), 'aucun')
            if (versDroite ? brut >= glisse.trou.fin : brut <= glisse.trou.debut) return
            offset.value = clampOffset(offset.value + vitesse * secondes)
            changerSelection(plageVers(dateA(xContenu(doigt, glisse.bordVue), 'round'), glisse))
        }, 16)
        return () => clearInterval(minuterie)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [glisse, doigt, largeurEcran, debutFenetre, cellule])

    const terminer = (absoluteX: number, reussi: boolean) => {
        if (!glisse) return
        const brut = dateA(xContenu(absoluteX, glisse.bordVue), 'aucun')
        const surEvenement = evenements.some((ev) => ev?.debut && ev?.fin && brut >= ev.debut && brut < ev.fin)
        if (!reussi || surEvenement) {
            if (surEvenement) {
                Haptics.erreur()
                ToastAbs.show({ type: toastTypes.error, text1: t('plageLibre.occupeTitre'), text2: t('plageLibre.occupe') })
            }
            annuler()
            return
        }
        setGlisse(null)
        setDoigt(null)
        setMenuOuvert(true)
    }

    // Runs on the JS thread: the free blocks and the selection are React state.
    const geste = Gesture.Pan()
        .activateAfterLongPress(DELAI_APPUI_LONG)
        .runOnJS(true)
        .onStart((e) => commencer(e.x, e.absoluteX))
        .onUpdate((e) => deplacer(e.absoluteX))
        .onEnd((e, reussi) => terminer(e.absoluteX, reussi))

    const fermerMenu = () => {
        setMenuOuvert(false)
        annuler()
    }

    // Opens the event creation or the unavailability screen on the selected range.
    const ouvrirSurSelection = (pathname: string) => {
        const plage = selection
        fermerMenu()
        if (!plage) return
        router.push({ pathname, params: { start: plage.debut.toISO(), end: plage.fin.toISO() } } as any)
    }

    const texterPlage = (plage: Plage) => plage.debut.hasSame(plage.fin, 'day')
        ? `${plage.debut.toFormat('ccc d MMM')}, ${plage.debut.toFormat('HH:mm')} – ${plage.fin.toFormat('HH:mm')}`
        : `${plage.debut.toFormat('ccc d MMM HH:mm')} – ${plage.fin.toFormat('ccc d MMM HH:mm')}`

    const gauche = (date: DateTime) => positionHeures(date, debutFenetre) * cellule
    const largeur = (plage: { debut: DateTime, fin: DateTime }) => gauche(plage.fin) - gauche(plage.debut)

    const s = StyleSheet.create({
        selection: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: colors.secondary,
            backgroundColor: colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            overflow: 'hidden',
        },
        texteSelection: {
            color: colors.text,
            fontFamily: fonts.number,
            fontSize: 12,
            textAlign: 'center',
            paddingHorizontal: 2,
        },
    })

    return (
        <>
            <GestureDetector gesture={geste}>
                <View style={StyleSheet.absoluteFill}>
                    {trous.map((trou) => (
                        <BlocTrou
                            key={`${+trou.debut}-${+trou.fin}`}
                            passe={trou.passe}
                            left={gauche(trou.debut)}
                            width={largeur(trou)}
                            longueurTimeline={jours * 24 * cellule}
                            // The block being selected hides its label (the selection shows its hours).
                            masquerTexte={!!selection && selection.debut >= trou.debut && selection.fin <= trou.fin}
                        />
                    ))}
                    {selection && (
                        // Hours label against the end following the finger (the visible side,
                        // also while auto-scrolling), centered only when the range is narrower.
                        <View style={[s.selection, {
                            left: gauche(selection.debut),
                            width: largeur(selection),
                            justifyContent: largeur(selection) <= LARGEUR_TEXTE_SELECTION ? 'center' : selection.versFin === false ? 'flex-start' : 'flex-end',
                        }]}>
                            <Text
                                style={[s.texteSelection, { width: Math.min(LARGEUR_TEXTE_SELECTION, largeur(selection)) }]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.6}
                            >
                                {selection.debut.toFormat('HH:mm')} – {selection.fin.toFormat('HH:mm')}
                            </Text>
                        </View>
                    )}
                </View>
            </GestureDetector>

            <MenuCreation
                visible={menuOuvert}
                titre={t('plageLibre.titre')}
                sousTitre={selection ? texterPlage(selection) : undefined}
                onCreerEvenement={() => ouvrirSurSelection('/(tabs)/home/create')}
                onAjouterIndisponibilite={() => ouvrirSurSelection('/(tabs)/home/indisponibilite')}
                onFermer={fermerMenu}
            />
        </>
    )
}

/**
 * One free block: blue outline on a transparent background, like the common free
 * slots (FreeSlotItem), labelled "Available" ("Past date" once elapsed, greyed out).
 * The label sticks to the visible edge while the row scrolls.
 *
 * @author Philip — user story 20
 * @param {Object} props
 * @param {boolean} props.passe - Already elapsed.
 * @param {number} props.left - Position on the row (px).
 * @param {number} props.width - Width (px).
 * @param {number} props.longueurTimeline - Whole row's width (px).
 * @param {boolean} [props.masquerTexte=false] - Hides the label (block being selected).
 * @returns {JSX.Element}
 */
function BlocTrou({ passe, left, width, longueurTimeline, masquerTexte = false }: { passe: boolean, left: number, width: number, longueurTimeline: number, masquerTexte?: boolean }) {
    const { t } = useTranslation('home')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { pxHeures, L_HEURES } = useTimeline()
    const { offset } = useGestionScroll()

    const LARGEUR_TEXTE = 96
    const tailleTexte = Math.min(LARGEUR_TEXTE, width)
    const texteAnime = useTimelineLabelOffset({
        axis: 'x',
        itemOffset: left,
        itemSize: width,
        labelSize: tailleTexte,
        listOffset: offset,
        inset: pxHeures,
        centerThreshold: 2 * (pxHeures + L_HEURES),
        timelineLength: longueurTimeline,
    })

    const s = StyleSheet.create({
        bloc: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left,
            width,
            borderWidth: 1,
            borderRadius: 8,
            borderColor: passe ? colors.muted : colors.disponible,
            backgroundColor: 'transparent',
            overflow: 'hidden',
            ...(passe ? { opacity: 0.45 } : {}),
        },
        texte: {
            position: 'absolute',
            left: 0,
            top: 0,
            width: tailleTexte,
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        libelle: {
            fontFamily: fonts.title,
            fontSize: 16,
            textAlign: 'center',
            color: colors.muted,
        },
    })

    return (
        <View style={s.bloc}>
            <Animated.View style={[s.texte, texteAnime, masquerTexte && { opacity: 0 }]}>
                <Text style={s.libelle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>
                    {passe ? t('plageLibre.datePassee') : t('plageLibre.disponible')}
                </Text>
            </Animated.View>
        </View>
    )
}
