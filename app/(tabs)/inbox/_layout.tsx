import { Stack } from "expo-router";

export default function InboxLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index" options={{headerShown:false}}
            />
            <Stack.Screen
                name="[conversationId]"
                // seulement la flèche "<", sans le nom de l'écran précédent
                options={{ headerBackButtonDisplayMode: 'minimal' }}
            />
        </Stack>
    )
}
