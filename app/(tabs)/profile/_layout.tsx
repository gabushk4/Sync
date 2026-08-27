import { Stack } from "expo-router";
import { View } from "react-native";

export default function ProfileLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index" options={{headerTitle:'profil'}}
            />
            <Stack.Screen
                name="edit" options={{headerTitle:'éditer le profil'}}
            />
        </Stack>
    )
}