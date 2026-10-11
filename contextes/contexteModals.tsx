import { IoniconsIconName } from '@react-native-vector-icons/ionicons'
import { createContext, Dispatch, ReactNode, SetStateAction, useCallback, useContext, useState } from 'react'
import { ColorValue, TouchableOpacityProps } from 'react-native'
import { SharedValue, useSharedValue } from 'react-native-reanimated'
import { usePalette } from './contextePalette'

type ModalContextType = {
  actualLevel: SharedValue<number>;
  LEVELS: Array<number>;
  dataRendererContent: RenderContent[];
  dismissButton: DismissButton;
  setDismissButton: Dispatch<SetStateAction<DismissButton>>
  resetDismissButton: () => void
  setDataRendererContent: (key: RenderContent['key'], content: RenderContent['child']) => void;
  removeDataRenderContent: (key: RenderContent['key']) => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export type DismissButton = {
  icon: IoniconsIconName;
  bgColor: ColorValue;
  style?: TouchableOpacityProps['style']
}

export type RenderContent = {
  key: string | number,
  child: ReactNode
}

export function ModalProvider({ children }: { children: ReactNode }) {  
  const LEVELS = [0, 45, 94]; // 0 = closed, 1 = 45, 2 = fullscreen
  const actualLevel = useSharedValue(1); // starts at 45% 
  const { colors } = usePalette()
  
  const DEF_DISMISS_BTN: DismissButton = { icon: "close", bgColor: colors.error }

  const [dataRendererContent, setDataRendererContentState] = useState<RenderContent[]>([])
  const setDataRendererContent = useCallback((key: RenderContent['key'], content: RenderContent['child']) => {
    setDataRendererContentState(current => {
      const existingIndex = current.findIndex(item => item.key === key)
      if (existingIndex === -1) return [...current, { key, child: content }]

      return current.map((item, index) => index === existingIndex ? { key, child: content } : item)
    })
  }, [])
  const removeDataRenderContent = useCallback((key: RenderContent['key']) => {
    setDataRendererContentState(current => current.filter(item => item.key !== key))
  }, [])
  const [dismissButton, setDismissButton] = useState<DismissButton>(DEF_DISMISS_BTN)

  const resetDismissButton = () => {
    setDismissButton(DEF_DISMISS_BTN)
  }

  return (
    <ModalContext.Provider value={{ actualLevel, LEVELS, dataRendererContent, setDataRendererContent, dismissButton, setDismissButton, resetDismissButton, removeDataRenderContent }}>
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
