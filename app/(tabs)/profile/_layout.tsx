import { Stack } from "expo-router";
import { useTranslation } from 'react-i18next';

export default function ProfileLayout() {
    const { t } = useTranslation('profile')
    return (
        <Stack>
            <Stack.Screen
                name="index" options={{headerTitle:t('navigation.profile')}}
            />
            <Stack.Screen
                name="edit" options={{headerTitle:t('navigation.edit')}}
            />
        </Stack>
    )
}