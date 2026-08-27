
import { useLocalSearchParams } from "expo-router"
import { Text, View } from "react-native"

export default function MemberProfil() {

    const {membreId} = useLocalSearchParams()

    return (
        <Text >
            membre id: {membreId}
        </Text>
    )
}