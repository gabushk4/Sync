import { DismissButton } from "@/contextes/contexteModals"
import { PaletteContextType } from "@/contextes/contextePalette"

export const checkMark = (colors : PaletteContextType['colors']) : DismissButton => ({ icon: 'checkmark', bgColor: colors.card, style: { borderWidth: 1, borderColor: colors.border } })