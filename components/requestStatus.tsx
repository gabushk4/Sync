import { useAPI } from "@/contextes/contexteAPI";
import { useFont } from "@/contextes/contexteFont";
import { usePalette } from "@/contextes/contextePalette";
import { useEffect, useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";

import { requestListener } from "@/events/requestEvents";

export default function RequestStatus() {
    const { colors } = usePalette()
    

    function useFetchIndicator(): boolean {
        return useSyncExternalStore(
            (callback) => requestListener.subscribe(() => callback()),
            () => requestListener.isFetching
        )
    }
    
    const s = StyleSheet.create({
        status: {            
            borderRadius: 100,
            height: 16, 
            aspectRatio: 1 / 1,  
            
        }
    })

    return process.env.NODE_ENV === 'development' && useFetchIndicator() && (
        <View style={{width:24, height:24, justifyContent:'center', alignItems:'center'}}>
            <View style={[s.status, {backgroundColor: colors.success}]}>

            </View>
        </View>
    )
}