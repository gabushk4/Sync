import {toastConfig} from "@/constants/toastConfig";
import { Stack } from "expo-router";

import Toast from "react-native-toast-message";

export default function ModalLayout() {
    return (
        <>
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 50,
                contentStyle: { backgroundColor: 'transparent' },
                freezeOnBlur: false,
                presentation: 'transparentModal',
            }}
            
            />
            <Toast config={toastConfig}/>
        </>
        
    )
}