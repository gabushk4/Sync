// User story 12: shared loading spinner, shown while the app waits on the API
// (buttons, action FAB, header indicator). Animates the existing svgs/spinner icon.
import { useEffect } from 'react'
import { StyleProp, View, ViewStyle } from 'react-native'
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'

import { usePalette } from '@/contextes/contextePalette'
import SpinnerIcone from '@/svgs/spinner'

type Props = {
    /** Width and height of the spinner, in px. Defaults to 24. */
    size?: number,
    /** Fill color. Defaults to the palette's text color. */
    color?: string,
    /** Duration of a full turn, in ms. Defaults to 900. */
    duree?: number,
    style?: StyleProp<ViewStyle>,
    /** Read by screen readers. Defaults to none. */
    accessibilityLabel?: string,
}

/**
 * Rotating spinner that signals the app is working.
 *
 * @example
 * <Spinner size={20} color={colors.muted} />
 *
 * @param {Props} props
 * @param {number} [props.size=24] - Width and height, in px.
 * @param {string} [props.color] - Fill color, the palette's text color by default.
 * @param {number} [props.duree=900] - Duration of a full turn, in ms.
 * @param {StyleProp<ViewStyle>} [props.style] - Style of the wrapping view.
 * @param {string} [props.accessibilityLabel] - Label read by screen readers.
 * @returns {JSX.Element}
 */
export default function Spinner({ size = 24, color, duree = 900, style, accessibilityLabel }: Props) {
    const { colors } = usePalette()
    const rotation = useSharedValue(0)

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, { duration: duree, easing: Easing.linear }),
            -1,
            false
        )
        return () => cancelAnimation(rotation)
    }, [duree])

    const rotationAnimee = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }]
    }))

    return (
        <View
            style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
            accessible={!!accessibilityLabel}
            accessibilityRole="progressbar"
            accessibilityLabel={accessibilityLabel}
        >
            <Animated.View style={rotationAnimee}>
                <SpinnerIcone width={size} height={size} fill={color ?? colors.text} />
            </Animated.View>
        </View>
    )
}
