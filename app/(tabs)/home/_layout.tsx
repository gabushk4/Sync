import RequestStatus from "@/components/requestStatus";
import { useFont } from "@/contextes/contexteFont";

import { Stack } from "expo-router";
import { useTranslation } from 'react-i18next';
import { View } from "react-native";

export default function HomeLayout() {
    const {fonts} = useFont()
    const { t } = useTranslation('events')
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerTitleStyle: { fontFamily: fonts.title },
                headerBackVisible: false,
                headerRight: () => <View style={{height:24, aspectRatio:1/1}}><RequestStatus/></View>
            }}
        >
            <Stack.Screen
                name="index" options={{ headerTitle: 'sync'}}
            />
            {/* Month calendar, its own page since 2026-10-10.
                Philip — user story 5 (month calendar). */}
            <Stack.Screen
                name="calendrier" options={{headerBackVisible:true, headerBackButtonDisplayMode:'minimal', headerTitle:t('navigation.calendar')}}
            />
            <Stack.Screen
                name="create" options={{headerBackVisible:true, headerBackButtonDisplayMode:'minimal', headerTitle:t('navigation.create')}}
            />
            {/* Philip — user story 20. */}
            <Stack.Screen
                name="indisponibilite" options={{headerBackVisible:true, headerBackButtonDisplayMode:'minimal', headerTitle:t('navigation.unavailability')}}
            />
            {/* Invitation review ("adjust my schedule" for an invitation in conflict).
                Philip — user story 8. */}
            <Stack.Screen
                name="revueInvitation" options={{headerBackVisible:true, headerBackButtonDisplayMode:'minimal', headerTitle:t('navigation.invitationReview')}}
            />
            <Stack.Screen
                name="details/[eventId]" options={{headerBackVisible:true, headerBackButtonDisplayMode:'minimal', headerTitle:t('navigation.details')}}
            />
            <Stack.Screen
                name="edit/[event]" options={{headerBackVisible:true, headerBackButtonDisplayMode:'minimal', headerTitle:t('navigation.edit')}}
            />
        </Stack>
    )
}