import { Stack } from "expo-router";
import { View } from "react-native";

export default function InboxLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index" options={{headerShown:false}}
            />
        </Stack>
    )
}