import { useEffect, useRef, useState } from "react";
import { createContext, useContext } from "react";
import log from "../fonctions/log";

export const ListesVisiblesContext = createContext()

export const ListesVisiblesContextProvider = ({ children }) => {
    const listesVisibles = useRef(new Set())

    const modifierListesVisibles = (tableauDeListes, rerenderListesVisibles) =>{
        if(listesVisibles.current){
            listesVisibles.current = tableauDeListes
            if(rerenderListesVisibles) setRerender(prev => prev + 1)
        }
        else  
        log('listesVisibles undefined')
    }

    const [rerenderListesVisibles, setRerender] = useState(0);
    
    return(
        <ListesVisiblesContext.Provider value={{listesVisibles, modifierListesVisibles, rerenderListesVisibles}}>
            {children}
        </ListesVisiblesContext.Provider>
    )
}

export const useListesVisibles = () => {
    return useContext(ListesVisiblesContext);
};