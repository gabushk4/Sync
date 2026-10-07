import { Text, TouchableOpacity, TouchableOpacityProps, View } from "react-native"
import ProfilPic from "./pfp"
import { Participant } from "@/types/invites"
import { useFont } from "@/contextes/contexteFont"
import { usePalette } from "@/contextes/contextePalette"
import Ionicons from "@react-native-vector-icons/ionicons"
import { useTranslation } from "react-i18next"
import { convertirTimestampDateLongue } from "@/functions/convertirTimestamp"
import log from "@/functions/log"
import { ListType } from "@/app/(modals)/listeAmis"

type Props = {
    friend: Participant;
    onPress: TouchableOpacityProps['onPress'];
    listType: ListType;
    selected: boolean;
}

export default function FriendLine({ friend, onPress, listType, selected }: Props) {
    const { fonts } = useFont();
    const { colors } = usePalette();
    const { t } = useTranslation('friends');

    const dateAmitie = convertirTimestampDateLongue(friend.temps_amitie)

    return (
        <View style={{ width: '100%', paddingHorizontal: 4, paddingVertical: 4 }}>
            <TouchableOpacity style={{ minHeight: 72, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: selected ? colors.secondary : colors.card, paddingHorizontal: 12, paddingVertical: 8 }}
                onPress={onPress}>
                <ProfilPic size={52} pfp={friend.fp_url}/>
                <View style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: fonts.body, color: colors.text, fontSize: 17 }}>{friend.pseudo}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 13 }}>{t('list.friendSince', { date: dateAmitie.substring(dateAmitie.indexOf('.') + 2) })}</Text>
                </View>
                <View style={{ width: 40, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                    {listType === 'consult' &&
                        <TouchableOpacity style={{ width: '88%', height: '72%', justifyContent: 'center', alignItems: 'center' }}
                            onPress={() => log("supprimer ami:", friend.pseudo, friend.id)}>
                            <Ionicons name="trash" color={colors.text}/>
                        </TouchableOpacity>}
                </View>
            </TouchableOpacity>
        </View>
    )
}