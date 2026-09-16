import { StyleSheet, TouchableOpacity, TouchableOpacityProps} from "react-native";
import { usePalette } from "@/contextes/contextePalette";

export default function SecondaryBtn({onPress, children} : TouchableOpacityProps) {
    const {colors} = usePalette()

    const s = StyleSheet.create({
        bouton:{
            height:44,
            alignItems:'center',
            justifyContent:'center',
            borderRadius:8, 
            paddingVertical:4,
            paddingHorizontal: 8,
            borderColor:colors.border
        }    
    })
    return (
       <TouchableOpacity 
            style={[s.bouton,{borderWidth:1}]}
            onPress={onPress}
        >
            <Text style={{color:colors.text, fontSize:18, fontFamily:fonts.body}}>annuler</Text>
        </TouchableOpacity>     
    )
}