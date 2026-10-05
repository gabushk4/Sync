import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { useMembre } from "@/contextes/contexteMembre";
import { usePalette } from "@/contextes/contextePalette";
import catcher from "@/functions/catcher";
import { convertirTimestampDateLongue, convertirTimestampHeure } from "@/functions/convertirTimestamp";
import { convertUTCToLocal } from "@/functions/convertirUTCenLocal";
import Icon from "@react-native-vector-icons/ionicons";

/** One invitation, as returned by GET /evenements/invitations (see formaterInvitation server-side). */
type InvitationRecue = {
    id: string
    statut_metier: 'en_attente' | 'acceptee' | 'refusee'
    pseudo_invitant: string
    id_evenement: string
    titre_evenement: string
    /** UTC, ISO without offset. */
    debut: string
    /** UTC, ISO without offset. */
    fin: string
}

/**
 * Page listing the event invitations the member refused, kept apart from the
 * main notifications list. Reads GET /evenements/invitations (the source of
 * truth), so a refusal still shows here even if its notification was deleted.
 * Part of user story 9 (accept/refuse an event invitation from a notification).
 * SUBJECT TO CHANGE: may be revised depending on how teammates implement their own user stories.
 *
 * @returns {JSX.Element}
 */
export default function InvitationsRefusees() {
    const { t } = useTranslation('notifications')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { membre } = useMembre()
    const { api } = useAPI()

    const [invitations, setInvitations] = useState<InvitationRecue[]>([])
    const [chargement, setChargement] = useState(true)
    const [rafraichi, setRafraichi] = useState(false)

    /**
     * Fetches the member's invitations and keeps the refused ones, soonest event first.
     *
     * @returns {Promise<void>}
     */
    const chargerRefusees = async () => {
        try {
            const reponse = await api.get('/evenements/invitations')
            const toutes: InvitationRecue[] = reponse.data?.invitations ?? []
            setInvitations(
                toutes
                    .filter((inv) => inv.statut_metier === 'refusee')
                    .sort((a, b) => a.debut.localeCompare(b.debut))
            )
        } catch (error) {
            catcher(error, t('refused.loadFailed'))
        } finally {
            setChargement(false)
            setRafraichi(false)
        }
    }

    // Refetch every time the page is shown, since a refusal can happen in the
    // notifications list right before opening it.
    useFocusEffect(useCallback(() => {
        chargerRefusees()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []))

    /**
     * Formats an event's time range in the member's timezone.
     *
     * @param {InvitationRecue} inv
     * @returns {string | null}
     */
    const formaterPlage = (inv: InvitationRecue) => {
        const debut = convertUTCToLocal(inv.debut, membre.timezone)
        const fin = convertUTCToLocal(inv.fin, membre.timezone)
        if (!debut || !fin) return null
        return `${convertirTimestampDateLongue(debut)} · ${convertirTimestampHeure(debut)} - ${convertirTimestampHeure(fin)}`
    }

    const s = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            paddingHorizontal: 16,
        },
        carte: {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 12,
            marginVertical: 4,
            gap: 4,
        },
        entete: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        titre: {
            color: colors.text,
            fontFamily: fonts.title,
            fontSize: 18,
            flexShrink: 1,
        },
        texte: {
            color: colors.muted,
            fontFamily: fonts.body,
            fontSize: 15,
        },
        vide: {
            color: colors.text,
            fontFamily: fonts.body,
            fontSize: 18,
            textAlign: 'center',
            marginTop: '40%',
        },
    })

    if (chargement) {
        return (
            <View style={[s.container, { justifyContent: 'center' }]}>
                <ActivityIndicator color={colors.text} />
            </View>
        )
    }

    return (
        <View style={s.container}>
            <FlatList
                data={invitations}
                keyExtractor={(inv) => inv.id}
                contentContainerStyle={{ paddingVertical: 16 }}
                ListEmptyComponent={<Text style={s.vide}>{t('refused.emptyState')}</Text>}
                refreshControl={
                    <RefreshControl
                        refreshing={rafraichi}
                        onRefresh={() => {
                            setRafraichi(true)
                            chargerRefusees()
                        }}
                    />
                }
                renderItem={({ item: inv }) => (
                    <View style={s.carte}>
                        <View style={s.entete}>
                            <Icon name="close-circle-outline" color={colors.error} size={20} />
                            <Text style={s.titre}>{inv.titre_evenement}</Text>
                        </View>
                        {formaterPlage(inv) && <Text style={s.texte}>{formaterPlage(inv)}</Text>}
                        <Text style={s.texte}>{t('refused.invitedBy', { pseudo: inv.pseudo_invitant })}</Text>
                    </View>
                )}
            />
        </View>
    )
}
