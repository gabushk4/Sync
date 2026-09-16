import { Stack } from "expo-router";

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