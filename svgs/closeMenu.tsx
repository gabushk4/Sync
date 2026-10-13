import * as React from "react"
import Svg, { Path, SvgProps } from "react-native-svg"

export const path1 = "M80 80 L176 176"
export const path2 = "M176 80 L80 176"
export const path3 = "M128 128 L128 128"

const path = [path1, path2,  path3].join(' ')

const CloseMenu = (props: SvgProps) => (
  <Svg viewBox="0 0 256 256" {...props}>
    <Path
      stroke={props.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={8}
      d={path}
    />
  </Svg>
)
export default CloseMenu
