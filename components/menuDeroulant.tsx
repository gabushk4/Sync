import Haptics from '@/abstractions/haptics'
import { useFont } from '@/contextes/contexteFont'
import { usePalette } from '@/contextes/contextePalette'
import log from '@/functions/log'
import { Recurrence } from '@/types/calendar'
import Icon from "@react-native-vector-icons/ionicons";
import { Picker } from '@react-native-picker/picker'
import RNPickerSelect from 'react-native-picker-select'
import React, { useRef, useState } from 'react'
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, useColorScheme, View } from 'react-native'
import Animated, {createAnimatedComponent, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'


type Props = {
  values: Recurrence[]
  selected: Recurrence | { value: string | null }
  onSelection: (val: string | null) => void
  disabled: boolean
}

const CHEVRON_SIZE = 20
const ITEM_HEIGHT = 40
const ITEM_NUMBER = 4

export default function MenuDeroulant({ values, selected, onSelection, disabled }: Props) {
  const { colors } = usePalette()
  const { fonts } = useFont()
  const colorScheme = useColorScheme()

  const androidTriggerRef = useRef<View>(null)
  const androidDropDownRef = useRef<FlatList>(null)

  const [selectedValue, setSelectedValue] = useState<string | null>((selected).value)
  const [iosDropDownVisible, setIosDropDownVisible] = useState(false)
  
  const [androidDropDownLeft, setAndroidDropDownLeft] = useState<number>()
  const [androidDropDownTop, setAndroidDropDownTop] = useState<number>()
  const [androidDropDownVisible, setAndroidDropDownVisible] = useState<boolean>(false)
  const [androidTriggerHeight, setAndroidTriggerHeight] = useState<number>()
  const [androidTriggerWidth, setAndroidTriggerWidth] = useState<number>()

  const androidItemsListHeight = useSharedValue(0)
  const androidItemsListOpacity = useSharedValue(0)

  const androidItemsListAnimated = useAnimatedStyle(() => {
    return {
      height: androidItemsListHeight.value,
      opacity: androidItemsListOpacity.value
    }
  })

  const androidOverlayAnimated = useAnimatedStyle(() => {
    return {
      opacity: androidItemsListOpacity.value
    }
  })
  //log('menu deroulant values', values)

  const s = StyleSheet.create({
    trigger: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor:colors.border,
      width: 'auto',
      minWidth: 128,
      alignSelf: 'flex-end',
      gap:16
    },
    triggerDisabled: {
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    androidTriggerContainer: {      
      flex:1,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems:'center'
    },
  
    overlayBottom: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    overlayAndroid: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.2)',
    },
  
    sheetContainer: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
  
    pickerIOS: {
      marginTop: -24,
      marginBottom: 48,
    },
    pickerAndroid: {
      borderWidth: 1,
    },
    androidItemList: {
      height:'auto',
      maxHeight: ITEM_HEIGHT * ITEM_NUMBER + (ITEM_HEIGHT / 2),
      backgroundColor:colors.primary
    },
  
    item: {
      padding: 8,
      height:ITEM_HEIGHT
    },
    itemSelected: {
      color: colors.primary,
      backgroundColor:colors.secondary
    },
  
    textTrigger: {
      fontSize: disabled ? 18 : 16,
      color:colors.text
    },
  
    layoutFill: {
      flex: 1,
    },
  })


  if (Platform.OS === 'ios') {
    return (
      <View>
        <TouchableOpacity
          style={[
            s.trigger,
            disabled
              ? s.triggerDisabled
              : { backgroundColor: colors.primary, borderColor: colors.border, flexDirection:'row', justifyContent:'space-between', gap:8 },
          ]}
          onPress={() => setIosDropDownVisible(true)}
          disabled={disabled}
        >
          <Text style={[s.textTrigger, { color: colors.text, fontFamily: fonts.body }]}>
            {values.find((v) => v.value === selectedValue)?.title}
          </Text>
          {!disabled &&
            <Icon name={iosDropDownVisible ? 'chevron-down' : 'chevron-forward'} color={colors.muted} />
          }
        </TouchableOpacity>

        <Modal visible={iosDropDownVisible} transparent animationType="fade" onRequestClose={() => setIosDropDownVisible(false)}>
          <TouchableOpacity onPress={() => setIosDropDownVisible(false)} style={s.overlayBottom}>
            <TouchableWithoutFeedback>
              <View style={[s.sheetContainer, { backgroundColor: colors.primary }]}>
                <Picker
                  style={[s.pickerIOS] as any}
                  itemStyle={{} as any}
                  selectedValue={selectedValue}
                  numberOfLines={1}
                  onValueChange={(newVal) => {
                    setSelectedValue(newVal)
                    onSelection(newVal)
                    setIosDropDownVisible(false)
                  }}
                  selectionColor={colors.primary}
                >
                  {values.map((value, i) => (
                    <Picker.Item
                      key={i}
                      label={value.title}
                      value={value.value}
                      color={colors.text}
                      style={{ color: 'black', backgroundColor: 'white' } as any}
                    />
                  ))}
                </Picker>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>
      </View>
    )
  }

  const openAndroidDropDown = () => {
    
  }

  const closeAndroidDropDown = () => {
    androidItemsListHeight.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) })
    androidItemsListOpacity.value = withTiming(0, {duration:300, easing:Easing.out(Easing.ease)})
    setTimeout(() => {
      setAndroidDropDownVisible(false)  
    }, 180)
    
  }

  const AnimatedPressable = createAnimatedComponent(Pressable)

  return (
    <View
      style={[
        s.androidTriggerContainer,        
      ]}
    >
      <TouchableOpacity
        ref={androidTriggerRef}        
        style={[s.trigger, { flexDirection: 'row', justifyContent: 'space-between' }]}
        onPress={() => {
          androidTriggerRef.current?.measure((x, y, w, h, pX, pY) => {
            setAndroidDropDownLeft(pX)
            setAndroidDropDownTop(pY - (androidTriggerHeight ?? 0) - s.trigger.padding - s.trigger.borderWidth)           

            androidDropDownRef.current?.scrollToIndex({index: values.findIndex(v => v.value === selectedValue), animated:false})
            androidItemsListHeight.value = withTiming(s.androidItemList.maxHeight, { duration: 300, easing: Easing.in(Easing.ease) })
            androidItemsListOpacity.value = withTiming(1, {duration:300, easing:Easing.in(Easing.ease)})
            setAndroidDropDownVisible(true)
          })
        }}
        onLayout={(e) => {
          const { height, width } = e.nativeEvent.layout
          
          setAndroidTriggerHeight(height)
          setAndroidTriggerWidth(width)
        }}
      >
        <Text style={s.textTrigger}>{values.find((v) => v.value === selectedValue)?.title}</Text>
        <Icon name='chevron-down' color={colors.muted} size={CHEVRON_SIZE}/>
      </TouchableOpacity>

      <Modal
        visible={androidDropDownVisible}  
        onRequestClose={()=> closeAndroidDropDown()}
        animationType='none'
        transparent={true}
      >
        <AnimatedPressable
          style={[s.overlayAndroid, androidOverlayAnimated]}
          onPress={() => closeAndroidDropDown()}
        >
          <Animated.View
            style={[s.androidItemList, androidItemsListAnimated, {              
              top: androidDropDownTop,
              left: androidDropDownLeft,
              width: (androidTriggerWidth ?? 96) - (CHEVRON_SIZE + (s.trigger.gap/2)) - s.trigger.padding

            }]}
          >
            <FlatList
              ref={androidDropDownRef}
              getItemLayout={(values, index) => {
                const length = (s.item.height + (s.item.padding * 2))
                return {
                  length: length, offset:index * length, index
                }
              }}
              onScrollToIndexFailed={(info) => {
                log("scroll to index failed info:", info)
              }}
              showsVerticalScrollIndicator={false}
              data={values}
              keyExtractor={(item) => item.value ?? item.title}
              renderItem={({ item }) => {
                const selected = item.value == selectedValue
                return (
                  <TouchableOpacity
                    style={[s.item, selected ? s.itemSelected : {}]}
                    onPress={() => {
                      onSelection(item.value)
                      setSelectedValue(item.value)
                      closeAndroidDropDown()
                    }}
                  >
                    <Text style={[s.textTrigger, selected ? { color: colors.primary } : {}]} ellipsizeMode='tail' numberOfLines={1}>{item.title}</Text>
                  </TouchableOpacity>
                )
              }}
            />

            
          </Animated.View>
        </AnimatedPressable>

      </Modal>
    </View>
  )
}

