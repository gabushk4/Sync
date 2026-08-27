import { useFont } from '@/contextes/contexteFont';
import { usePalette } from '@/contextes/contextePalette';
import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import Haptics from './haptics';


export function LinkAbs({ href, children, ...props }: { href: string; children: React.ReactNode } & React.ComponentProps<typeof Link>) {
    const { colors } = usePalette()
    const { fonts } = useFont()
    const s = createLinkStyles(colors, fonts)
    return (
        <Link
            href={href}
            {...props}
            onPress={() => {
                Haptics.click()
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
        link: {
            fontFamily: fonts.body,
            color: colors.muted,
            textDecorationLine: 'underline',
            textDecorationColor: colors.secondary,
        }
    })
}