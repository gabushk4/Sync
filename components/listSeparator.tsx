import { usePalette } from "@/contextes/contextePalette"
import { View, ViewProps } from "react-native"

type Props = {
    show: boolean;
    style?: ViewProps['style'];
}

/**
 * Checks if an element of an list is last. * 
 * @param list the list that contains the element where we want to verifiy if its last 
 * @param index the index of the element we want to verify if its last
 * @returns True if the element is last. 
 */
export const isLast = (list: Array<any>, index:number) => index == list.length - 1

/**
 * A component meant to separate child elements of a list. We can pass a style prop to override the default style. 
 * We can pass a prop meant to indicate wether we show the separotr or not. 
 * Usually placed underneath the element and paired with isLast function.
 * @param {Props}   
 * @returns a line meant to separate list elements. 
 */
export default function Separator({ show, style }: Props) {
    
    if (!show) return null;
    
    const { colors: c } = usePalette()

    
    const s = {
        separator: {
            height: 1,
            backgroundColor: c.border
        }
    }
    return (
        <View style={[s.separator, style]}/>
    )
}