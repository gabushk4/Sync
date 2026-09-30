import { useGestionScroll } from '@/contextes/contexteGestionListes'
import { SharedValue, useAnimatedStyle } from 'react-native-reanimated'

type Axis = 'x' | 'y'

type Params = {
    axis: Axis
    itemOffset: number
    itemSize: number
    labelSize: number
    listOffset: SharedValue<number>
    inset: number
    centerThreshold?: number
    timelineLength?: number
}

export default function useTimelineLabelOffset({
    axis,
    itemOffset,
    itemSize,
    labelSize,
    listOffset,
    inset,
    centerThreshold = labelSize + 2 * inset,
    timelineLength,
}: Params) {
    const {clampOffset} = useGestionScroll()
    return useAnimatedStyle(() => {
        const centered = (itemSize - labelSize) / 2
        const maxWithinItem = itemSize - labelSize - inset
        const maxWithinTimeline = timelineLength === undefined
            ? maxWithinItem
            : timelineLength - itemOffset - labelSize - inset
        const maxPosition = Math.min(maxWithinItem, maxWithinTimeline)

        let position: number
        if (itemSize < centerThreshold || maxPosition < inset) {
            position = centered
        } else {
            const desired = clampOffset(listOffset.value) - itemOffset + inset
            position = Math.min(Math.max(desired, inset), maxPosition)
        }
        return axis === 'x'
            ? { transform: [{ translateX: position }] }
            : { transform: [{ translateY: position }] }
    })
}