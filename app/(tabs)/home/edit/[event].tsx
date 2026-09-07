import catcher from '@/functions/catcher'
import { convertirLocalVersUTC } from '@/functions/convertirUTCenLocal'
import log from '@/functions/log'
import formaterDatePourServeur from '@/functions/formaterDatePourServeur'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import {Alert, Text, View, } from 'react-native'
import Toast from 'react-native-toast-message'
import Icon from "@react-native-vector-icons/ionicons";

import { useActionFab } from '@/hooks/useActionFAB'

import { Event } from '@/types/calendar'

import EventForm, { EventFormHandle } from '@/components/eventForm'

import { usePalette } from '@/contextes/contextePalette'
import { useAPI } from '@/contextes/contexteAPI'
import { DateTime } from 'luxon'
import { toastTypes } from '@/constants/toastConfig'
import ToastAbs from '@/abstractions/toastAbs'

export default function EditEvent() {
    const { api } = useAPI()
    const { colors } = usePalette()
    const { event: eventStringified } = useLocalSearchParams<{ event: string }>()
    const event = JSON.parse(eventStringified) as Event

    // Original values are meant to see which changed
    const original = useRef({
        titre: event.titre,
        description: event.description,
        prive: !!event.prive,
        debut: event.debut,
        fin: event.fin,
    })

    // Le formulaire vit son propre state en interne. EditEvent ne fait que
    // lui poser une question au moment du submit : "quelles sont tes valeurs ?"
    const formRef = useRef<EventFormHandle>(null)

    const verifAvantPatch = (): void => {
        const values = formRef.current?.getValues()
        let valid = true
        let message = "impossible d'éditer l'évènement"
        if (!values) return

        const data: Partial<Event> & Record<string, any> = {}
        const champsModifies: string[] = []

        if (values.titre !== original.current.titre) {
            data.titre = values.titre            
            champsModifies.push('titre')
        }
        if (values.description !== original.current.description) {
            data.description = values.description
            champsModifies.push('description')
        }
        if (values.prive !== original.current.prive) {
            data.prive = values.prive ? 1 : 0
            champsModifies.push('prive')
        }

        if (values.titre.length < 4) {
            valid = false
            message = "le titre doit avoir au moins 4 caractères"
        }

        if (!valid) {
            catcher({message}, "erreur à l'édition")
            return
        }

        const debutServeur = formaterDatePourServeur(values.start.toUTC())
        const finServeur = formaterDatePourServeur(values.end.toUTC())

        if (debutServeur !== original.current.debut) {
            data.debut = debutServeur
            champsModifies.push('debut')
        }
        if (finServeur !== original.current.fin) {
            data.fin = finServeur
            champsModifies.push('fin')
        }

        if (champsModifies.length === 0) return

        data.debut = data.debut ?? debutServeur
        data.fin = data.fin ?? finServeur

        let url = { method: 'PATCH', string: `/evenements/${event.id}` } as {
            method: string
            string: string
        }

        if (event && event.type === 'recurrence' && event.regle_recurrence) {
            Alert.alert(
                "édition d'une récurrence",
                "voulez-vous éditer la série d'évènements ou seulement celui-ci?",
                [
                    {
                        text: 'la série',
                        onPress: () => {
                            const rec = (event.regle_recurrence || '').split('\n')
                            const dtStart = values.start.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")
                            const until = values.end.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")

                            const rrule = (rec[1] || '')
                                .split(';')
                                .map((p) => (p.startsWith('UNTIL=') ? `UNTIL=${until}` : p))
                                .join(';')

                            data.regle_recurrence = `DTSTART:${dtStart}\n${rrule}`
                            patchEvenement(url, data, champsModifies)
                        },
                    },
                    {
                        text: 'celui-ci',
                        onPress: () => {
                            url = { method: 'POST', string: `/evenements/exceptions` }
                            data.id_parent = event.id
                            data.type = 'exception'
                            data.debut_occurence = formaterDatePourServeur(
                                event.debut ? event.debut : DateTime.now().toUTC()
                            )
                            patchEvenement(url, data, champsModifies)
                        },
                        isPreferred: true,
                    },
                ]
            )
        } else if (event.type === 'exception') {
            url = { method: 'PATCH', string: `/evenements/exceptions/${event.id}` }
            patchEvenement(url, data, champsModifies)
        } else {
            patchEvenement(url, data, champsModifies)
        }
    }

    const patchEvenement = async (url: { method: string; string: string }, data: any, champsModifies: string[]) => {        
        try {
            const reponse = await api.request({
                method: url.method,
                url: url.string,
                data,
            })

            if (reponse.status === 201) {
                ToastAbs.show({
                    type: toastTypes.success,
                    text1: 'Évènement modifié',
                    text2: `Champs modifiés : ${champsModifies.join(', ')}`,
                })
                router.back()
            }
        } catch (error) {
            catcher(error, "erreur en éditant l'évènement")
        }
    }

    useActionFab({
        action: verifAvantPatch,
        icon: <Icon name="checkmark" color={colors.text} size={28} />,
    })

    return (
        <View style={{ flex: 1 }}>
            <EventForm ref={formRef} event={event} mode={'edit'} />
        </View>
    )
}