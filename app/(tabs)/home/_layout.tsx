import RequestStatus from "@/components/requestStatus";
import { useFont } from "@/contextes/contexteFont";

import { Stack } from "expo-router";
import { View } from "react-native";

export default function HomeLayout() {
    const {fonts} = useFont()
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
                name="create" options={{headerBackVisible:true, headerBackButtonDisplayMode:'minimal', headerTitle:'créer un évènement'}}
            />
            <Stack.Screen
                name="details/[eventId]" options={{headerBackVisible:true, headerBackButtonDisplayMode:'minimal', headerTitle:'details'}}
            />
            <Stack.Screen
                name="edit/[event]" options={{headerBackVisible:true, headerBackButtonDisplayMode:'minimal', headerTitle:'editer'}}
            />
        </Stack>
    )
}