import RequestStatus from "@/components/requestStatus";
import { Stack } from "expo-router";
import { useTranslation } from 'react-i18next';

export default function FeedLayout() {
    const { t } = useTranslation('feed')
    return (
        <Stack
            screenOptions={{
                headerRight: () => <RequestStatus />,                
            }}
        >
            <Stack.Screen
                name="index" options={{headerTitle:t('navigation.title')}}
            />
            {/* User story 9: refused event invitations, opened from the notifications list. */}
            <Stack.Screen
                name="refusees" options={{headerTitle:t('navigation.refused')}}
            />
        </Stack>
    )
}