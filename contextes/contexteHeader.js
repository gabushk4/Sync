import { createContext, useContext, useRef } from "react";
import { Platform } from "react-native";

export const contexteHeader = createContext()

export const HeaderProvider = ({children})=>{
    const headerHeight = Platform.OS === 'ios'?96:108
    return(
        <contexteHeader.Provider value={headerHeight}>
            {children}
        </contexteHeader.Provider>
    )
}

export const useHeaderHeight = ()=> useContext(contexteHeader)