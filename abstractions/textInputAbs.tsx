import React, { forwardRef, useEffect, useState } from 'react';
import { TextInput, TextInputProps, Platform, StyleProp, TextStyle, StyleSheet } from 'react-native';
import { usePalette } from '@/contextes/contextePalette';
import { useFont } from '@/contextes/contexteFont';

type Props = {
    style?: StyleProp<TextStyle>
} & Pick<TextInputProps,
    'readOnly' | 'placeholder' | 'onChangeText' | 'placeholderTextColor' | 
    'value' | 'onSubmitEditing' | 'secureTextEntry' | 'keyboardType' | 
    'returnKeyType' | 'autoComplete' | 'onBlur' | 'onFocus' | 'textContentType' |
    'multiline' | 'onLayout' | 'numberOfLines' | 'autoFocus' | 'maxLength' |
    'onEndEditing' | 'pointerEvents'
>;

const TextInputAbs = forwardRef<TextInput, Props>(({
    readOnly = false,
    value,
    onLayout,
    onChangeText,
    onSubmitEditing = () => {},
    placeholder = '...',
    placeholderTextColor = undefined,
    secureTextEntry = false,
    keyboardType = 'default',
    returnKeyType = 'default',
    autoComplete = 'off',
    onBlur = () => {},
    onFocus = () => {},
    textContentType = 'none',
    style,
    multiline = false,
    numberOfLines = 1,
    autoFocus = false,
    maxLength = undefined,
    onEndEditing = () => { },
    pointerEvents = 'auto' 
}, ref) => {
    const { colors } = usePalette();
    const { fonts } = useFont();

    const [borderColor, setBorderColor] = useState(colors.border);

    const s = StyleSheet.create({
        input: {
            backgroundColor: colors.primary, 
            color: colors.text, 
            fontFamily: fonts.body, 
            opacity: readOnly ? 0.4 : 1,
            height:48,
            width:'100%',
            paddingLeft:8,
            fontSize: 20,
            borderWidth:1,
            borderRadius:8,
        },
    })

    return (
        <TextInput
            ref={ref}
            readOnly={readOnly}
            style={[s.input,
                {                    
                    borderColor: borderColor,                    
                },
                style
            ]}
            textAlignVertical='center'
            placeholder={placeholder}                                
            onChangeText={onChangeText}
            placeholderTextColor={placeholderTextColor ?? colors.muted}
            value={value}
            onSubmitEditing={onSubmitEditing}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            returnKeyType={returnKeyType}
            {...(Platform.OS != "android" ? { autoComplete } : {})}
            onBlur={(e) => {
                setBorderColor(colors.border)
                onBlur(e)
            }}
            onFocus={(e) => {
                setBorderColor(colors.secondary)
                onFocus(e)
            }}
            textContentType={textContentType}
            multiline={multiline}
            onLayout={onLayout}
            numberOfLines={numberOfLines}
            autoFocus={autoFocus}
            maxLength={maxLength}
            onEndEditing={onEndEditing}
            pointerEvents={pointerEvents}
        />
    );
});





export default TextInputAbs;