import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import ToastAbs from '@/abstractions/toastAbs'
import ModalBase from '@/components/modalBase'
import { toastTypes } from '@/constants/toastConfig'
import { useAPI } from '@/contextes/contexteAPI'
import { useFont } from '@/contextes/contexteFont'
import { useMembre } from '@/contextes/contexteMembre'
import { usePalette } from '@/contextes/contextePalette'
import catcher from '@/functions/catcher'
import { convertirTimestampDateLongue, convertirTimestampHeure } from '@/functions/convertirTimestamp'
import { convertUTCToLocal } from '@/functions/convertirUTCenLocal'
import formaterDatePourServeur from '@/functions/formaterDatePourServeur'
import { EvenementEnConflit, NouvelEvenement } from '@/types/conflit'
import Ionicons from '@react-native-vector-icons/ionicons'

/**
 * Shown when creating an event overlaps one the member already has. Puts the
 * existing event and the new one side by side and asks which one to delete:
 * - Existing: deleted (only that occurrence if it's recurring), or left if
 *   the member isn't an editor of it, then the new event is created.
 * - New: simply not created; back to the home screen.
 * The member can also go back to the form to adjust the new event's times.
 * Part of user story 8 (conflict screen when creating an overlapping event).
 *
 * Route params (JSON strings): `existant` ({@link EvenementEnConflit}) and
 * `nouveau` ({@link NouvelEvenement}), set by the create screen.
 *
 * @returns {JSX.Element}
 */
export default function ConflitEvenement() {
    const { t } = useTranslation('events')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { membre } = useMembre()
    const { api } = useAPI()
    const router = useRouter()

    const params = useLocalSearchParams()
    const existant: EvenementEnConflit | null = params.existant ? JSON.parse(params.existant as string) : null
    const nouveau: NouvelEvenement | null = params.nouveau ? JSON.parse(params.nouveau as string) : null

    const [enCours, setEnCours] = useState(false)

    const peutSupprimerExistant = existant?.privilege_membre === 'editeur'

    /**
     * Closes this modal and the create screen underneath, back to home.
     *
     * @returns {void}
     */
    const retourAccueil = () => {
        router.back()
        router.replace('/(tabs)/home')
    }

    /**
     * Removes the existing event from the member's schedule:
     * - editor + recurring: cancels only the conflicting occurrence (exception 'annule'),
     * - editor + single event: deletes it,
     * - otherwise: leaves it (the event stays for its other participants).
     *
     * @param {EvenementEnConflit} ev - The existing conflicting event.
     * @returns {Promise<void>}
     */
    const retirerExistant = async (ev: EvenementEnConflit) => {
        if (ev.privilege_membre !== 'editeur') {
            await api.post(`/evenements/${ev.id}/quitter`, {})
        } else if (ev.type === 'recurrence') {
            await api.post('/evenements/exceptions', {
                id_parent: ev.id,
                // Must match the occurrence's start exactly (UTC SQL) for the server to skip it.
                debut_occurence: formaterDatePourServeur(convertUTCToLocal(ev.debut, 'utc')),
                type: 'annule',
            })
        } else {
            await api.delete(`/evenements/${ev.id}`)
        }
    }

    /**
     * "Delete the existing one": removes the existing event, then creates the
     * new one. If the new one still overlaps another event, this screen is
     * updated to show that next conflict instead.
     *
     * @returns {Promise<void>}
     */
    const supprimerExistant = async () => {
        if (!existant || !nouveau) return
        setEnCours(true)
        try {
            await retirerExistant(existant)
        } catch (error) {
            catcher(error, t('conflict.removeFailed'))
            setEnCours(false)
            return
        }

        try {
            const response = await api.post('/evenements/', nouveau)
            if (response.status == 201) {
                ToastAbs.show({
                    type: toastTypes.success,
                    text1: t('create.createdTitle'),
                    text2: t('create.createdMessage'),
                    autoHide: true,
                })
                retourAccueil()
            }
        } catch (error: any) {
            if (error.response?.status == 409) {
                // Another event still overlaps the slot: compare against that one now.
                router.setParams({ existant: JSON.stringify(error.response.data.evenement) })
                ToastAbs.show({ type: toastTypes.warning, text2: t('conflict.anotherConflict') })
            } else {
                catcher(error, t('errors.createFailed'))
            }
        } finally {
            setEnCours(false)
        }
    }

    /**
     * "Delete the new one": the new event was never saved, so just drop it.
     *
     * @returns {void}
     */
    const supprimerNouveau = () => {
        ToastAbs.show({ type: toastTypes.success, text2: t('conflict.newDiscarded') })
        retourAccueil()
    }

    /**
     * Formats an event's time range in the member's timezone.
     *
     * @param {string | null} debut - UTC start (ISO or SQL).
     * @param {string | null} fin - UTC end (ISO or SQL).
     * @returns {string | null} e.g. "lundi 5 octobre · 14:00 - 15:00", or null if a date is missing.
     */
    const formaterPlage = (debut: string | null, fin: string | null) => {
        if (!debut || !fin) return null
        const debutLocal = convertUTCToLocal(debut, membre.timezone)
        const finLocal = convertUTCToLocal(fin, membre.timezone)
        if (!debutLocal || !finLocal) return null
        return `${convertirTimestampDateLongue(debutLocal)} · ${convertirTimestampHeure(debutLocal)} - ${convertirTimestampHeure(finLocal)}`
    }

    const s = StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            width: '100%',
            gap: 16,
        },
        title: {
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 18,
        },
        text: {
            color: colors.text,
            fontFamily: fonts.body,
            fontSize: 18,
            textAlign: 'center',
        },
        carteEvenement: {
            width: '100%',
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            gap: 4,
        },
        etiquette: {
            color: colors.muted,
            fontFamily: fonts.body,
            fontSize: 13,
            textTransform: 'uppercase',
        },
        titreEvenement: {
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 18,
        },
        heureEvenement: {
            color: colors.muted,
            fontFamily: fonts.body,
            fontSize: 15,
        },
        btnSupprimer: {
            marginTop: 8,
            height: 40,
            borderWidth: 1,
            borderRadius: 8,
            borderColor: colors.error,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
        },
        texteSupprimer: {
            color: colors.error,
            fontFamily: fonts.body,
            fontSize: 16,
        },
        btnContainer: {
            marginTop: 8,
            width: '100%',
            alignItems: 'center',
        },
        btn: {
            height: 48,
            width: '90%',
            borderWidth: 1,
            borderRadius: 8,
            borderColor: colors.secondary,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.card,
            flexDirection: 'row',
            gap: 8,
        },
    })

    /**
     * Renders one side of the comparison: label, title, time range and its delete button.
     *
     * @param {string} etiquette - "Existing event" / "New event".
     * @param {string} titre - Event title.
     * @param {string | null} plage - Formatted time range.
     * @param {string} texteBouton - Delete (or leave) button label.
     * @param {() => void} onSupprimer - Called when that button is pressed.
     * @returns {JSX.Element}
     */
    const renderCarte = (etiquette: string, titre: string, plage: string | null, texteBouton: string, onSupprimer: () => void) => (
        <View style={s.carteEvenement}>
            <Text style={s.etiquette}>{etiquette}</Text>
            <Text style={s.titreEvenement}>{titre}</Text>
            {plage && <Text style={s.heureEvenement}>{plage}</Text>}
            <TouchableOpacity style={s.btnSupprimer} onPress={onSupprimer} disabled={enCours}>
                <Ionicons name="trash-outline" color={colors.error} size={18} />
                <Text style={s.texteSupprimer}>{texteBouton}</Text>
            </TouchableOpacity>
        </View>
    )

    return (
        <ModalBase>
            <View style={s.container}>
                <Ionicons name="alert-circle" color={colors.error} size={40} />
                <Text style={s.title}>{t('conflict.title')}</Text>
                <Text style={s.text}>{t('conflict.message')}</Text>

                {existant && renderCarte(
                    t('conflict.existing'),
                    existant.titre,
                    formaterPlage(existant.debut, existant.fin),
                    peutSupprimerExistant ? t('conflict.delete') : t('conflict.leave'),
                    supprimerExistant,
                )}

                {nouveau && renderCarte(
                    t('conflict.new'),
                    nouveau.titre,
                    formaterPlage(nouveau.debut, nouveau.fin),
                    t('conflict.delete'),
                    supprimerNouveau,
                )}

                {enCours && <ActivityIndicator color={colors.text} />}

                <View style={s.btnContainer}>
                    <TouchableOpacity style={s.btn} onPress={() => router.back()} disabled={enCours}>
                        <Text style={s.text}>{t('conflict.adjust')}</Text>
                        <Ionicons name="time-outline" color={colors.text} size={20} />
                    </TouchableOpacity>
                </View>
            </View>
        </ModalBase>
    )
}
