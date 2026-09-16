import { View, ViewProps } from "react-native";

export default function Container({ children, ...Props } : ViewProps) {
    
    
    return (
        <View style={[{flex:1, width:'100%', height:'100%'}, Props.style]}>
            {children}
        </View>
    )
}