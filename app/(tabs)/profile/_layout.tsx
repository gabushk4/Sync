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
                name="importCalendrier" options = {{headerTitle:'importer un calendrier', headerBackButtonDisplayMode:'minimal'}}              
            />
            <Stack.Screen
               name="settings" options={{ headerTitle: t('navigation.settings')}}
            />
        </Stack>
    )
}
