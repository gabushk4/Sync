import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import { useTimeline } from '@/contextes/contexteTimeline'
import { findWidth } from '@/functions/calculerDimensionsEvenements'
import { BlurView } from 'expo-blur'
import { DateTime } from 'luxon'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Event } from '@/types/calendar'
import log from '@/functions/log'


type Props = {
  event: Event
  blockColor?: string
  displayDate?: DateTime
  timezone?: string
  horizontal?: boolean
}

export default function EventBloc({ event, blockColor, displayDate, horizontal = false } : Props) {
  const { pxHeures, L_HEURES, H_HEURES } = useTimeline() as any
  const { colors } = usePalette() 
  const { fonts } = useFont()
  
  //log('event bloc displayed date', displayDate, event)

  // largeur/hauteur calculée
  const heureOffset = horizontal ? pxHeures + L_HEURES : pxHeures + H_HEURES
  const eventSize = findWidth(event.debut, event.fin, displayDate as DateTime, heureOffset)

  const backgroundColor = blockColor
  
  const s = StyleSheet.create({
      container: {
          minWidth: horizontal ? L_HEURES : H_HEURES,
          alignItems: 'center',
      justifyContent: 'center',
          backgroundColor:colors.card
      },
      innerStyle: {
          ...(horizontal
              ? { width: eventSize }
              : { height: eventSize }
          )
      }
  })

  return (
    <View style={[s.container, s.innerStyle]}>
      <BlurView
        intensity={40}
        tint="default"
        style={[
          {
            height: '100%',
            borderRadius: 12,
            borderColor: colors.border,
            backgroundColor,
            borderWidth: 1,
            overflow: 'hidden',
            padding: 4,
          },
          s.innerStyle,
        ]}
      />
    </View>
  )
}
