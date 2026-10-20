import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { DateTime } from 'luxon'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import CalendarMonthView, { PlageJours } from '@/components/calendarMonthView'
import { useAPI } from '@/contextes/contexteAPI'
import { useMembre } from '@/contextes/contexteMembre'
import { calendrierEvents } from '@/events/calendrierEvents'
import AutoRefresh from '@/functions/autoRefresh'
import catcher from '@/functions/catcher'
import { formaterEvenementsMembre, paramsMois } from '@/functions/evenementsMembre'
import { debutCreationPourJour, estJourPasse } from '@/functions/jourCreation'
import { useNavFab } from '@/hooks/useNavFAB'

/**
 * Month calendar page (user story 5), opened from the home screen's date button
 * with the displayed day (`jour` param, ISO date). Tapping a day selects it and
 * lists its events; a long-press-and-drag selects a range; the "+" button creates
 * the event on the selection. Going back (header arrow, iOS swipe, Android back)
 * returns to the home timeline, already switched to the selected day (see
 * calendrierEvents).
 *
 * @author Philip — user story 5 (month calendar)
 * @returns {JSX.Element}
 */
export default function CalendrierPage() {
    const { t } = useTranslation('home')
    const { api } = useAPI()
    const { membre } = useMembre()
    const { jour: jourParam } = useLocalSearchParams<{ jour?: string }>()

    const jourInitial = (jourParam ? DateTime.fromISO(jourParam) : DateTime.now()).startOf('day')

    const [mois, setMois] = useState<DateTime>(jourInitial.startOf('month'))
    // The tapped day, or the range from a long-press-and-drag (kept until a day is tapped).
    const [jourSelectionne, setJourSelectionne] = useState<DateTime | undefined>(jourInitial)
    const [plage, setPlage] = useState<PlageJours | null>(null)
    // Events per loaded month (key: the month's ISO date), so the selected day's
    // events stay listed after swiping to another month (they used to be replaced
    // by the new month's, and the list said "no events").
    const [evenementsParMois, setEvenementsParMois] = useState<Record<string, any[]>>({})

    // Every loaded month's events, once each (months' grids overlap on their edge weeks).
    const evenements = useMemo(() => {
        const vus = new Set<string>()
        return Object.values(evenementsParMois).flat().filter((evenement) => {
            const cle = `${evenement.id}|${evenement.debut?.toMillis()}`
            if (vus.has(cle)) return false
            vus.add(cle)
            return true
        })
    }, [evenementsParMois])

    // The home timeline switches to the selected day at once (the range's first day,
    // else the tapped day), while still hidden under this page — see calendrierEvents.
    useEffect(() => {
        const jour = plage?.debut ?? jourSelectionne
        if (jour) calendrierEvents.definirJour(jour)
    }, [plage, jourSelectionne])

    // Identifies the displayed month (a plain value for the hooks' dependencies).
    const cleMois = mois.toISODate()

    // The displayed month's events: own refresh, (re)created on focus (e.g. back from
    // an event's details) and on month change.
    useFocusEffect(
        useCallback(() => {
            // destroy() doesn't cancel a request in flight: without this flag, a late
            // answer for the previous month (fast swipes) replaced the shown month's events.
            let actif = true
            const cle = mois.toISODate() ?? ''
            // The whole grid, including the neighbouring months' days shown on its
            // first and last weeks (they used to have no dots and no events).
            const refreshMois = new AutoRefresh(api, '/evenements/', {
                extraParams: paramsMois(mois),
                onData: (data) => {
                    if (!actif || !data.evenements) return
                    const formates = formaterEvenementsMembre(data.evenements, membre.timezone)
                    setEvenementsParMois((precedent) => ({ ...precedent, [cle]: formates }))
                },
                onError: (error) => {
                    // Stops the list's spinner (the error toast says why it's empty).
                    if (actif) setEvenementsParMois((precedent) => (cle in precedent ? precedent : { ...precedent, [cle]: [] }))
                    catcher(error, t('errors.loadMemberEvents'))
                },
            })
            return () => {
                actif = false
                refreshMois.destroy()
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [cleMois])
    )

    // "+" button: an event over the selected range (whole days), or on the selected
    // day at the suggested hour (see debutCreationPourJour).
    const paramsCreation = plage
        ? { start: plage.debut.startOf('day').toISO(), end: plage.fin.endOf('day').toISO() }
        : jourSelectionne ? { start: debutCreationPourJour(jourSelectionne).toISO() } : undefined

    // No events in the past: the "+" shows an error for a day / range before today.
    const debutChoisi = plage?.debut ?? jourSelectionne
    const dansLePasse = !!debutChoisi && estJourPasse(debutChoisi)

    useNavFab('calendrier', {
        href: '/home/create',
        // Asks first: create an event or add an unavailability (Philip — user story 20).
        menuCreation: true,
        params: paramsCreation,
        icon: null,
        visible: true,
        bloque: dansLePasse ? t(plage ? 'create.pastRange' : 'create.pastDate', { ns: 'events' }) : undefined,
    })

    return (
        <CalendarMonthView
            monthDate={mois}
            selectedDate={jourSelectionne}
            plageSelectionnee={plage}
            events={evenements}
            // The displayed month isn't loaded yet (spinner instead of "no events").
            chargement={!evenementsParMois[mois.toISODate() ?? '']}
            onSelectDay={(jour) => {
                setJourSelectionne(jour)
                setPlage(null)
            }}
            onChangeMonth={setMois}
            onSelectRange={(debut, fin) => {
                setPlage({ debut, fin })
                setJourSelectionne(undefined)
            }}
        />
    )
}
