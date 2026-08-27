import { createContext, useContext, useState, useEffect, ReactNode, SetStateAction, Dispatch } from 'react';
import { useAuth } from './contexteAuth';

type MockModeContextType = {
    isMockMode: boolean;
    setMockMode: (newState: boolean) => void
}

const MockModeContexte = createContext<MockModeContextType | undefined>(undefined)

export const MOCK_MODE_AVAILABLE = __DEV__; 

export const MockModeProvider = ({ children }: { children: ReactNode }) => {     
    const [isMockMode, setMockModeState] = useState<boolean>(false)    

    const setMockMode = (newState: boolean) => {
        if (MOCK_MODE_AVAILABLE) {            
            setMockModeState(newState)
            return
        }

        console.warn("OfflineMode seulement dispo en dev")
    }   

    return (
        <MockModeContexte.Provider value={{isMockMode, setMockMode}}>
            {children}
        </MockModeContexte.Provider>
    )
}

export const useMockMode = (): MockModeContextType => {
    const ctx = useContext(MockModeContexte)

    if (!ctx) throw Error("MockModeContext doit etre utilisé dans MockModeContexteProvider")
    
    return ctx
}