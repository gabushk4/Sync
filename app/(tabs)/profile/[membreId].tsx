
import { useLocalSearchParams } from "expo-router"
import { useTranslation } from 'react-i18next'
import { Text } from "react-native"

export default function MemberProfil() {
    const { t } = useTranslation('profile')

    const {membreId} = useLocalSearchParams()

    return (
        <Text >
            {t('memberIdLabel')}: {membreId}
        </Text>
    )
}