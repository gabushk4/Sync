import { usePalette } from '@/contextes/contextePalette'
import { BlurView } from 'expo-blur'
import { DateTime } from 'luxon'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Event } from '@/types/calendar'


type Props = {
  event: Event
  blockColor?: string
  displayDate?: DateTime
  timezone?: string
  horizontal?: boolean
}

/**
 * Background of one event on a timeline row: a rounded block that fills its
 * parent (ListItem sizes and positions it). Solid `blockColor` for the
 * member's own row, blurred translucent block for friends' rows.
 * Style reworked with user story 9: the container used to have a square
 * `colors.card` background (visible corners behind the rounded border) and a
 * width computed separately from ListItem's, so the two didn't line up.
 * SUBJECT TO CHANGE: may be revised depending on how teammates implement their own user stories.
 *
 * @param {Props} props
 * @returns {JSX.Element}
 */
export default function EventBloc({ blockColor }: Props) {
  const { colors } = usePalette()

  const s = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      backgroundColor: blockColor ?? 'transparent',
    },
  })

  return (
    <View style={s.container}>
      {!blockColor && (
        <BlurView intensity={40} tint="default" style={StyleSheet.absoluteFill} />
      )}
    </View>
  )
}
