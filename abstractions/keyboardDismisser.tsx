import { ReactElement, ReactNode } from "react";
import { Keyboard, Pressable } from "react-native";

export default function KeyboardDismisser({zIndex, onPress, children}: {zIndex?:number, onPress?: Function, children: ReactElement}){
    return (
        <Pressable
            style={{ position: 'absolute', zIndex: zIndex ?? 0, flex: 1, height: '100%', width: '100%' }}
            onPress={() => {
                onPress?.()
                if (Keyboard.isVisible())
                    Keyboard.dismiss()                
            }}
        >
            {children}
        </Pressable>
    )
}