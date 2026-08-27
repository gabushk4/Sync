import * as React from "react"
import Svg, { Path, SvgProps } from "react-native-svg"

function Spinner(props: SvgProps) {
  return (
    <Svg
      width={32}
      height={32}
      fill={props.fill}
      viewBox="0 0 256 256"
      {...props}
    >
      <Path d="M136 32v32a8 8 0 01-16 0V32a8 8 0 0116 0zm37.25 58.75a8 8 0 005.66-2.35l22.63-22.62a8 8 0 00-11.32-11.32L167.6 77.09a8 8 0 005.65 13.66zM224 120h-32a8 8 0 000 16h32a8 8 0 000-16zm-45.09 47.6a8 8 0 00-11.31 11.31l22.62 22.63a8 8 0 0011.32-11.32zM128 184a8 8 0 00-8 8v32a8 8 0 0016 0v-32a8 8 0 00-8-8zm-50.91-16.4l-22.63 22.62a8 8 0 0011.32 11.32l22.62-22.63a8 8 0 00-11.31-11.31zM72 128a8 8 0 00-8-8H32a8 8 0 000 16h32a8 8 0 008-8zm-6.22-73.54a8 8 0 00-11.32 11.32L77.09 88.4A8 8 0 0088.4 77.09z" />
    </Svg>
  )
}

export default Spinner