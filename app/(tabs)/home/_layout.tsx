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
            <Stack.Screen
                name="create" options={{headerBackVisible:true, headerBackButtonDisplayMode:'minimal', headerTitle:t('navigation.create')}}
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