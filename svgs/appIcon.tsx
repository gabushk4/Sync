import * as React from "react"
import Svg, { Path, SvgProps } from "react-native-svg"

interface AppIconProps extends SvgProps {
    size?: number
}

function AppIcon({ size = 24, ...svgProps }: AppIconProps) {
    return (
        <Svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 480 480"
            xmlSpace="preserve"       
            width={size}
            height={size}
            fill="none"
            strokeWidth={2}
            {...svgProps}
        >
            <Path
                d="M241.055 0C108.141 0 .007 108.134.007 241.048c0 132.922 108.134 241.064 241.048 241.064 132.915 0 241.05-108.142 241.05-241.064C482.105 108.134 373.97 0 241.055 0zm0 434.267c-106.53 0-193.202-86.68-193.202-193.218 0-106.531 86.672-193.203 193.202-193.203s193.204 86.672 193.204 193.203c0 106.538-86.674 193.218-193.204 193.218z"
            />
            <Path
                d="M241.055 181.561c-32.862 0-59.494 26.634-59.494 59.496s26.632 59.496 59.494 59.496c32.863 0 59.496-26.634 59.496-59.496s-26.633-59.496-59.496-59.496z"
            />
        </Svg>
  )
}

export default AppIcon