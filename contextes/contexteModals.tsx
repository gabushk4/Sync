import Haptics from '@/abstractions/haptics'
import log from '@/functions/log'
import React, { createContext, ReactNode, useContext, useState } from 'react'
import { SharedValue, useSharedValue } from 'react-native-reanimated'

type ModalType = {
  nom: string | null
  data: any | null
}

type ModalContextType = {
  actualLevel: SharedValue<number>;
  LEVELS: Array<number>
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {  
  const LEVELS = [0, 45, 94]; // 0 = closed, 1 = 45, 2 = fullscreen
  const actualLevel = useSharedValue(1); // starts at 45% 

  return (
    <ModalContext.Provider value={{actualLevel, LEVELS }}>
      {children}
    </ModalContext.Provider>
  )
}

export const useModal = () => {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within a ModalProvider')
  return ctx
}

export default ModalContext
