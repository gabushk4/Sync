import * as React from "react"
import Svg, { Path, SvgProps } from "react-native-svg"

export const path1 = "M68 88 h120"
export const path2 = "M68 128 h120"
export const path3 = "M68 168 h120"

const path = [path1, path2,  path3].join(' ')

const HamburgerMenu = (props: SvgProps) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" {...props}>
    <Path fill="none" d="M0 0h256v256H0z" />
    <Path
      fill="none"
      stroke={props.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={8}
      d={path}
    />
  </Svg>
)
export default HamburgerMenu
