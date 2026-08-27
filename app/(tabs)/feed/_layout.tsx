import RequestStatus from "@/components/requestStatus";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function FeedLayout() {
    return (
        <Stack
            screenOptions={{
                headerRight: () => <RequestStatus />,                
            }}
        >
            <Stack.Screen
                name="index" options={{headerTitle:"fil d'actualités"}}
            />
        </Stack>
    )
}