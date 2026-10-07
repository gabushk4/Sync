import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useState } from "react";
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import EventFriendList from "@/components/eventListAmi";
import ModalBase from "@/components/modalBase";
import Spinner from "@/components/spinner";
import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { usePalette } from "@/contextes/contextePalette";
import catcher from "@/functions/catcher";
import { convertirTimestampDateLongue } from "@/functions/convertirTimestamp";
import { convertUTCToLocal } from "@/functions/convertirUTCenLocal";
import { useFriendList } from "@/hooks/useFriendList";
import { Participant } from "@/types/invites";
import FriendLine from "@/components/friendLine";

type Friend = {
    temps_amitie: string,
    id_publique: string,
    pseudo: string,
    fp_url: string
}

export type ListType = 'event' | 'select' | 'consult' | 'message'

function DefaultFriendList({ openProfiles, type}: { openProfiles: boolean, type:ListType }) {
    const { t } = useTranslation('friends')
    const { api } = useAPI()
    const { colors } = usePalette()
    const { fonts } = useFont()
    const colorScheme = useColorScheme()
    const [amis, setAmis] = useState<Participant[]>([])
    // User story 12: true until the first answer, so the empty state ("no
    // friends yet") isn't shown while the list is still loading.
    const [chargement, setChargement] = useState(true)
    const onPressConsult = useFriendList('consult')

    const icones = {
        profilDef: colorScheme === 'dark'
            ? require('@/assets/icones/profil-dark-icon.png')
            : require('@/assets/icones/profil-light-icon.png'),
        ajouterAmi: require('@/assets/icones/ajouter-ami-dark-icon.png')
    }

    /**
     * Fetches the member's friends (GET /amis) and converts their friendship date to local time.
     *
     * @returns {Promise<void>}
     */
    const getAmis = useCallback(async () => {
        try {
            const response = await api.get('/amis')
            const data = response.data.map((ami: Friend) => ({
                ...ami,
                id: ami.id_publique,
                // GET /amis sends the photo as `fp_url` (see sync_api routes/amis.js);
                // `pfp_url` doesn't exist, so every friend showed the default picture.
                fp_url: ami.fp_url,
                temps_amitie: convertUTCToLocal(ami.temps_amitie)
            }))
            setAmis(data)
        } catch (error) {
            catcher(error, t('errors.loadFailed'))
        } finally {
            setChargement(false)
        }
    }, [api, t])

    useFocusEffect(useCallback(() => {
        getAmis()
    }, [getAmis]))

    return (
        <ModalBase>
            <View style={{ height: '100%', width: '100%' }}>
                <View style={{ width: '100%', alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 20 }}>{t('list.title')}</Text>
                </View>
                <LinearGradient
                    style={{ position: 'absolute', opacity: 0.3, zIndex: 2, top: 22, left: 0, width: '100%', height: 24 }}
                    start={{ x: 0, y: 0.2 }}
                    end={{ x: 0, y: 1 }}
                    colors={[colors.primary, 'transparent']}
                />
                {chargement && amis.length < 1 &&
                    <View style={{ height: '100%', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        <Spinner size={32} accessibilityLabel={t('common:loading')} />
                    </View>
                }
                {amis.length > 0 && <FlatList
                    data={amis}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ alignItems: 'center', paddingTop: 16, paddingBottom: 16 }}
                    renderItem={({ item, index }) => {
                        const dateAmitie = convertirTimestampDateLongue(item.temps_amitie)
                        return (
                            <FriendLine friend={item} listType={type} selected={false} onPress={() => openProfiles && onPressConsult(item)} />
                            
                        )
                    }}
                />}
                {!chargement && amis.length < 1 &&
                    <View style={{ height: '100%', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: colors.text, fontFamily: fonts.title, fontSize: 18 }}>{t('list.emptyState')}</Text>
                        <TouchableOpacity onPress={() => router.push('/(modals)/ajouterAmi')}>
                            <Image source={icones.ajouterAmi} style={{ height: 64, width: 64 }} resizeMode="contain" />
                        </TouchableOpacity>
                    </View>
                }
            </View>
        </ModalBase>
    )
}

export default function ListeAmis() {
    const { type: rawType } = useLocalSearchParams<{ type?: ListType }>()
    const type = Array.isArray(rawType) ? rawType[0] : rawType

    if (type === 'event' || type === 'select') {
        return <EventFriendList />
    }

    return <DefaultFriendList openProfiles={type === 'profile' || type === 'consult'} type={type} />
}
