//import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useRef, useState, createContext, useContext, useCallback } from "react";
import { useGestionScroll } from "./contexteGestionListes";
import { useListesVisibles } from "./contexteListesVisibles";
import { useListeOptions } from "./contexteListeOptions";
import { useModeEdit } from "./contexteEdit";

export const SortiEcranContexte = createContext()

export const SortiEcranProvider = ({children})=>{
    //const navigation = useNavigation()
    const {modifierListesVisibles} = useListesVisibles()
    const {viderRefs} = useGestionScroll()
    const {setAffiche, affiche, setHeader, modifierOptions} = useListeOptions()
    const {modeEdit, modifierModeEdit} = useModeEdit()

    const sortir = ()=>{
        const mE = modeEdit
        modifierListesVisibles(new Set([]), false); 
        viderRefs()
        if(mE == true)
            modifierModeEdit()
    }
    return(
        <SortiEcranContexte.Provider value={{sortir }}>
            {children}
        </SortiEcranContexte.Provider>
    )
}

export const useSortiEcran = ()=> useContext(SortiEcranContexte)