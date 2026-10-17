import { Stack } from "expo-router";
import { useTranslation } from 'react-i18next';

export default function ProfileLayout() {
    const { t } = useTranslation('profile')
    return (
        <Stack
            screenOptions={{
                headerBackButtonDisplayMode:'minimal'
            }}
        >
            <Stack.Screen
                name="index" options={{headerTitle:t('navigation.profile')}}
            />
            <Stack.Screen
                name="edit" options={{headerTitle:t('navigation.edit')}}
            />
            <Stack.Screen
                name="settings" options={{ headerTitle: t('navigation.settings')}}
            />
            <Stack.Screen
                name="importCalendar" options={{ headerTitle: t('navigation.importCalendar')}}
            />
            <Stack.Screen
                name="settings/calendars/google" options={{ headerTitle: 'Google Agenda' }}
            />
            <Stack.Screen
                name="settings/calendars/outlook" options={{ headerTitle: 'Outlook Calendar' }}
            />
            
        </Stack>
    )
}
