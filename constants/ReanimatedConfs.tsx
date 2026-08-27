import { ReduceMotion, WithSpringConfig, WithTimingConfig } from "react-native-reanimated"

export const withSpringConfig:WithSpringConfig = { mass: 5, damping: 100, reduceMotion:ReduceMotion.Never }
export const withTimingConfig:WithTimingConfig = { duration: 300, reduceMotion:ReduceMotion.Never }