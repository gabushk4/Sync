import { useFont } from '@/contextes/contexteFont';
import { usePalette } from '@/contextes/contextePalette';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, Text, TextStyle } from 'react-native';

import Haptics from './haptics';

export const linkStyle = (colors: any, fonts:any) : TextStyle => ({
    fontFamily: fonts.body,
    color: colors.muted,
    textDecorationLine: 'underline',
    textDecorationColor: colors.secondary,
})


type LinkAbsProps = Omit<React.ComponentProps<typeof Link>, 'href'> & {
    href: React.ComponentProps<typeof Link>['href'] | string
    children: React.ReactNode
    externalLink?: boolean
}

export function LinkAbs({ href, children, externalLink = false, onPress, ...props }: LinkAbsProps) {
    const { colors } = usePalette()
    const { fonts } = useFont()
    const s = createLinkStyles(colors, fonts)
    return (
        <Link
            href={href as React.ComponentProps<typeof Link>['href']}
            {...props}
            onPress={(event) => {
                Haptics.click()
                if (externalLink) {
                    event.preventDefault()
                    WebBrowser.openBrowserAsync(href as string)
                }
                onPress?.(event)
            }}
        >
            <Text style={s.link}>
                {children}
            </Text>
        </Link>
    )
}

export function createLinkStyles(colors: any, fonts: any) {
    return StyleSheet.create({
        link: linkStyle(colors, fonts)
    })
}