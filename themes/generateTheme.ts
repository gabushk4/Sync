export type ThemeColors = {
    primary: string;
    secondary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
    error: string;
    success: string;
    muted: string;
    warning: string;
};


export function generateTheme(h: number, scheme: 'light' | 'dark') : ThemeColors {
    const hsl = (h: number,s: number, l: number) => `hsl(${h}, ${s}%, ${l}%)`;

    if (scheme === 'dark') {
        return {
            primary:    hsl(h, 54, 17),
            secondary:  hsl(h, 40, 60),
            background: hsl(h, 10, 10),
            card:       hsl(h, 30, 15),
            text:       hsl(h, 20, 90),
            muted:      hsl(h, 20, 70),
            border:     hsl(h, 30, 50),
            error:      hsl(0, 60, 60),
            success:    hsl(90, 60, 60),
            warning:    hsl(50, 60, 60),
            notification: hsl(0, 80, 50), // required by React Navigation
        };
    }

    return {
        primary:    hsl(h, 50, 85),
        secondary:  hsl(h, 40, 55),
        background: hsl(h, 10, 90),
        card:       hsl(h, 15, 85),
        text:       hsl(h, 20, 5),
        muted:      hsl(h, 20, 70),
        border:     hsl(h, 20, 25),
        error:      hsl(0, 60, 40),
        success:    hsl(90, 60, 40),
        warning:    hsl(50, 60, 40),
        notification: hsl(0, 80, 50), // required by React Navigation
    };
}