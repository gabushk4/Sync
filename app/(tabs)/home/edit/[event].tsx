import catcher from '@/functions/catcher'
import formaterDatePourServeur from '@/functions/formaterDatePourServeur'

import Icon from "@react-native-vector-icons/ionicons"
import { router, useLocalSearchParams } from 'expo-router'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, View } from 'react-native'

import { useActionFab } from '@/hooks/useActionFAB'

import { Event } from '@/types/calendar'

import EventForm, { EventFormHandle } from '@/components/eventForm'

import ToastAbs from '@/abstractions/toastAbs'
import { toastTypes } from '@/constants/toastConfig'
import { useAPI } from '@/contextes/contexteAPI'
import { usePalette } from '@/contextes/contextePalette'
import { DateTime } from 'luxon'
import { EventDraftProvider } from '@/contextes/contexteEventDraft'

export default function EditEvent() {
    const { t } = useTranslation('events')
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
        let message = t('edit.defaultError')
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
            message = t('edit.titleTooShort')
        }

        if (!valid) {
            catcher({message}, t('edit.validationErrorTitle'))
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
                t('details.recurringEditTitle'),
                t('details.recurringEditMessage'),
                [
                    {
                        text: t('details.editSeries'),
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
                        text: t('details.editOccurrence'),
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
                    text1: t('edit.updatedTitle'),
                    text2: t('edit.modifiedFields', { fields: champsModifies.join(', ') }),
                })
                router.back()
            }
        } catch (error) {
            catcher(error, t('errors.updateFailed'))
        }
    }

    useActionFab({
        action: verifAvantPatch,
        icon: <Icon name="checkmark" color={colors.text} size={28} />,
    })

    return (
        <EventDraftProvider>
            <View style={{ flex: 1 }}>            
                <EventForm ref={formRef} event={event} mode={'edit'} />
            </View>
        </EventDraftProvider>
    )
}