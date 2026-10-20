import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import Ionicons from '@react-native-vector-icons/ionicons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
    visible: boolean
    titre: string
    /** Second line, e.g. the selected range. */
    sousTitre?: string
    onCreerEvenement: () => void
    onAjouterIndisponibilite: () => void
    onFermer: () => void
}

/**
 * Choice shown before adding something to the schedule (the "+" button, or a range
 * picked on a free stretch of the timeline): create an event — the prominent, filled
 * button on top — or add an unavailability, a discreet link below, so creating an
 * event stays the obvious choice. Closed by the ✕, a tap outside or the back button.
 *
 * @author Philip — user story 20
 * @param {Props} props
 * @returns {JSX.Element}
 */
export default function MenuCreation({ visible, titre, sousTitre, onCreerEvenement, onAjouterIndisponibilite, onFermer }: Props) {
    const { t } = useTranslation('home')
    const { colors } = usePalette()
    const { fonts } = useFont()

    const s = StyleSheet.create({
        fond: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: 24,
        },
        carte: {
            width: '100%',
            maxWidth: 360,
            borderRadius: 16,
            padding: 16,
            gap: 12,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
        },
        entete: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
        },
        titre: {
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 18,
        },
        sousTitre: {
            color: colors.muted,
            fontFamily: fonts.body,
            fontSize: 14,
            marginTop: 2,
        },
        creer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: colors.secondary,
        },
        texteCreer: {
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 17,
        },
        indisponibilite: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 6,
        },
        texteIndisponibilite: {
            color: colors.muted,
            fontFamily: fonts.body,
            fontSize: 14,
        },
    })

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onFermer}>
            <Pressable style={s.fond} onPress={onFermer}>
                {/* Inner Pressable: a tap on the card doesn't close the menu. */}
                <Pressable style={s.carte} onPress={() => {}}>
                    <View style={s.entete}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.titre}>{titre}</Text>
                            {!!sousTitre && <Text style={s.sousTitre}>{sousTitre}</Text>}
                        </View>
                        <TouchableOpacity onPress={onFermer} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('plageLibre.annuler')}>
                            <Ionicons name="close" size={22} color={colors.muted} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={s.creer} onPress={onCreerEvenement} accessibilityRole="button">
                        <Ionicons name="add-circle-outline" size={22} color={colors.text} />
                        <Text style={s.texteCreer}>{t('plageLibre.creerEvenement')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.indisponibilite} onPress={onAjouterIndisponibilite} accessibilityRole="button">
                        <Ionicons name="ban-outline" size={16} color={colors.muted} />
                        <Text style={s.texteIndisponibilite}>{t('plageLibre.ajouterIndisponibilite')}</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    )
}
