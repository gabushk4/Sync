import NotificationItem from '@/components/notificationItem'
import { useFont } from '@/contextes/contexteFont'
import { Notification, useNotifications } from '@/contextes/contexteNotifications'
import { usePalette } from '@/contextes/contextePalette'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, Text, View } from 'react-native'

/** Montre dans Messages les demandes d'ami qui attendent une réponse. */
export default function Inbox(){
    const { t } = useTranslation('inbox')
    const { colors } = usePalette()
    const { fonts } = useFont()
    const { notifications } = useNotifications()

    const demandesEnAttente = notifications.filter((notification) =>
        (notification.payload?.type ?? notification.type) === 'demande_ami'
        && notification.statut_metier === 'en_attente'
    )

    const s = StyleSheet.create({
        container: { flex: 1, paddingHorizontal: 12, paddingTop: 20, backgroundColor: colors.background },
        title: { color: colors.text, fontFamily: fonts.title, fontSize: 24, marginBottom: 12 },
        empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 18, textAlign: 'center', marginTop: 48 },
    })

    return (
        <View style={s.container}>
            <Text style={s.title}>{t('requests.title')}</Text>
            {demandesEnAttente.length === 0 ? (
                <Text style={s.empty}>{t('requests.empty')}</Text>
            ) : (
                <FlatList
                    data={demandesEnAttente as Notification[]}
                    keyExtractor={(notification) => notification.id}
                    renderItem={({ item, index }) => (
                        <NotificationItem item={item} index={index} vu={item.statut} />
                    )}
                />
            )}
        </View>
    )
}
