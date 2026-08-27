import { createContext, useContext, useState } from "react";
import log from "../fonctions/log";

export const ModeEditContext = createContext()

export const ModeEditProvider = ({children})=>{
    const [modeEdit, setModeEdit] = useState(false)

    const modifierModeEdit = ()=>{
        log('modifier mode edit', modeEdit)
        setModeEdit(prevModeEdit => {
            return !prevModeEdit;
        });
    }

    return (    
        <ModeEditContext.Provider value={{modeEdit, modifierModeEdit,}}>
            {children}
        </ModeEditContext.Provider>
    )   
}

/** 
 * @returns {boolean} modeEdit | state qui retourne si le mode edit est activé ou non
 * @return {function} modifierModeEdit() | set au contraire la valeur de modeEdit
 */
export const useModeEdit = () => {return useContext(ModeEditContext)}